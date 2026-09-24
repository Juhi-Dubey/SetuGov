import aiService from '../services/aiService.js';
import { successResponse } from '../utils/response.js';

export const generateChallenge = async (req, res, next) => {
  try {
    const result = await aiService.generateChallenge(req.body, req.user);
    return successResponse(res, result, 'AI challenge copilot analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const explainMatch = async (req, res, next) => {
  try {
    const result = await aiService.explainMatch(req.body);
    return successResponse(res, result, 'AI match explanation completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzePilot = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const result = pilotId
      ? await aiService.analyzePilotById(pilotId, req.user)
      : await aiService.analyzePilot(req.body);
    return successResponse(res, result, 'AI pilot intelligence analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const getScaleRecommendation = async (req, res, next) => {
  try {
    const pilotId = req.params.pilot_id || req.params.id;
    const input = pilotId || (req.body && Object.keys(req.body).length > 0 ? req.body : 'mock-pilot');
    const result = await aiService.getScaleRecommendation(input, req.user);
    return successResponse(res, result, 'AI scale recommendation completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzeRisks = async (req, res, next) => {
  try {
    const result = await aiService.analyzeRisks(req.body);
    return successResponse(res, result, 'AI risk analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const analyzeApplicationProposal = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id || req.params.id || req.body?.application_id;
    const result = applicationId
      ? await aiService.analyzeApplicationProposal(applicationId, req.user, req.ip)
      : await aiService.analyzeProposal(req.body);
    return successResponse(res, result, 'AI proposal analysis completed', 200);
  } catch (error) {
    next(error);
  }
};

export const getApplicationProposalAnalysis = async (req, res, next) => {
  try {
    const applicationId = req.params.application_id;
    const result = await aiService.getApplicationProposalAnalysis(applicationId, req.user, req.ip);
    return successResponse(res, result, 'Persisted AI proposal analysis retrieved successfully', 200);
  } catch (error) {
    next(error);
  }
};

export const generateDocumentDraft = async (req, res, next) => {
  try {
    const result = await aiService.generateDocumentDraft(req.body);
    return successResponse(res, result, 'AI document draft generated successfully', 200);
  } catch (error) {
    next(error);
  }
};

/**
 * B1: Stream AI Proposal Analysis in real-time via SSE
 * Proxies the Python AI service streaming endpoint or falls back to mock streaming
 */
export const streamAnalyzeApplicationProposal = async (req, res, next) => {
  let isClientConnected = true;

  req.on('close', () => {
    isClientConnected = false;
  });

  const safeWrite = (data) => {
    if (isClientConnected && !res.writableEnded && !res.destroyed) {
      try {
        res.write(data);
      } catch (err) {
        isClientConnected = false;
      }
    }
  };

  const safeEnd = () => {
    if (!res.writableEnded && !res.destroyed) {
      try {
        res.end();
      } catch (err) {
        // ignore stream close errors
      }
    }
  };

  try {
    const applicationId = req.params.application_id;
    if (!applicationId) {
      return res.status(400).json({ success: false, message: 'application_id is required' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    await aiService.streamAnalyzeApplicationProposal(applicationId, req.user, req.ip, {
      onChunk: (text) => {
        safeWrite(`data: ${JSON.stringify({ event: 'chunk', text })}\n\n`);
      },
      onComplete: (data) => {
        safeWrite(`data: ${JSON.stringify({ event: 'complete', data })}\n\n`);
        safeEnd();
      },
      onError: (message) => {
        safeWrite(`data: ${JSON.stringify({ event: 'error', message })}\n\n`);
        safeEnd();
      }
    });
  } catch (error) {
    if (!res.headersSent) {
      next(error);
    } else {
      safeWrite(`data: ${JSON.stringify({ event: 'error', message: error.message })}\n\n`);
      safeEnd();
    }
  }
};

export default {
  generateChallenge,
  explainMatch,
  analyzeApplicationProposal,
  getApplicationProposalAnalysis,
  streamAnalyzeApplicationProposal,
  analyzePilot,
  getScaleRecommendation,
  analyzeRisks,
  generateDocumentDraft
};

