// NOTE: import the internal lib directly, not the package root. pdf-parse's
// index.js checks `!module.parent` to decide whether to run a debug self-test
// against a bundled sample PDF — under ESM `import`, module.parent is always
// undefined, so importing the root would crash every real call in this app.
import pdfParse from 'pdf-parse/lib/pdf-parse.js';
import mammoth from 'mammoth';
import { logger } from './logger.js';

// Per-document character cap so a handful of documents stay within a
// reasonable LLM prompt/token budget when concatenated by aiService.js.
const MAX_EXTRACTED_CHARS = 10000;

/**
 * Extract plain text from a document buffer so its actual content — not just
 * its filename — can be included in AI proposal/pilot analysis payloads.
 *
 * Never throws: extraction failures are reported via `status` so the calling
 * upload flow can persist the outcome without failing the upload itself.
 *
 * @param {Buffer} buffer - Raw file bytes
 * @param {string} mimeType - Declared MIME type of the file
 * @param {string} [originalFilename] - Original filename, used as a fallback
 *   signal when mimeType is generic (e.g. application/octet-stream)
 * @returns {Promise<{ text: string|null, status: 'OK'|'NO_TEXT_LAYER'|'UNSUPPORTED_TYPE'|'FAILED' }>}
 */
export const extractTextFromBuffer = async (buffer, mimeType, originalFilename = '') => {
  const type = (mimeType || '').toLowerCase();
  const name = (originalFilename || '').toLowerCase();

  try {
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      const result = await pdfParse(buffer);
      const text = (result.text || '').trim();
      if (!text) {
        // Scanned/image-only PDF — pdf-parse found no embedded text layer.
        return { text: null, status: 'NO_TEXT_LAYER' };
      }
      return { text: text.slice(0, MAX_EXTRACTED_CHARS), status: 'OK' };
    }

    if (type.includes('wordprocessingml') || name.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ buffer });
      const text = (result.value || '').trim();
      if (!text) {
        return { text: null, status: 'NO_TEXT_LAYER' };
      }
      return { text: text.slice(0, MAX_EXTRACTED_CHARS), status: 'OK' };
    }

    if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.md')) {
      const text = buffer.toString('utf-8').trim();
      if (!text) {
        return { text: null, status: 'NO_TEXT_LAYER' };
      }
      return { text: text.slice(0, MAX_EXTRACTED_CHARS), status: 'OK' };
    }

    // Legacy .doc, images, spreadsheets, video, zip — no extractor wired up
    // yet. Flagged explicitly rather than silently sent as empty content.
    return { text: null, status: 'UNSUPPORTED_TYPE' };
  } catch (err) {
    logger.warn(`Text extraction failed for "${originalFilename || 'document'}": ${err.message}`);
    return { text: null, status: 'FAILED' };
  }
};

export default { extractTextFromBuffer };
