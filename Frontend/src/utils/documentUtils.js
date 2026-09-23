/**
 * Unified Secure Document Viewer and Downloader for SetuGov.
 * Handles authenticated document retrieval via Authorization header,
 * Blob URL generation, inline browser preview, and automatic download fallbacks.
 * NOTE: JWTs are never appended to URLs — all authentication uses Authorization: Bearer.
 */

export const getSecureDocumentUrl = (rawUrl) => {
  if (!rawUrl) return "";

  if (rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return rawUrl;
  }

  let fullUrl = rawUrl;
  if (!fullUrl.startsWith("http://") && !fullUrl.startsWith("https://")) {
    const origin =
      (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL)
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, "")
        : (window.location.origin.includes("5173") ? "http://localhost:5000" : window.location.origin);

    fullUrl = `${origin}${fullUrl.startsWith("/") ? "" : "/"}${fullUrl}`;
  }

  // NOTE: Do NOT append token to URL. All authenticated requests use Authorization header.
  return fullUrl;
};

export const openDocumentSecurely = async (fileUrl, fileName = "document") => {
  if (!fileUrl) {
    alert("Document URL is unavailable for this record.");
    return false;
  }

  // data: and blob: URLs are already safe to open directly (no auth needed)
  if (fileUrl.startsWith("data:") || fileUrl.startsWith("blob:")) {
    window.open(fileUrl, "_blank", "noopener,noreferrer");
    return true;
  }

  const token = localStorage.getItem("token");
  let targetUrl = fileUrl;

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    const origin =
      (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL)
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, "")
        : (window.location.origin.includes("5173") ? "http://localhost:5000" : window.location.origin);

    targetUrl = `${origin}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
  }

  // Always fetch with Authorization header — never open a protected URL directly.
  // A plain window.open() / browser navigation cannot attach Authorization headers.
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(targetUrl, { headers });

    if (res.ok) {
      const blob = await res.blob();
      const mimeType = blob.type || (fileName.endsWith(".pdf") ? "application/pdf" : "application/octet-stream");
      const cleanBlob = new Blob([blob], { type: mimeType });
      const blobUrl = URL.createObjectURL(cleanBlob);

      const newTab = window.open(blobUrl, "_blank", "noopener,noreferrer");
      if (!newTab) {
        // Popup blocked — trigger download instead
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName || "document";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      // Revoke after a short delay to allow the tab/download to start
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
      return true;
    }

    // Fetch succeeded but server returned an error (e.g. 401, 403, 404)
    console.error(`Document fetch failed: HTTP ${res.status}`);
    alert(`Unable to open document (server returned ${res.status}). Please try again or contact support.`);
    return false;
  } catch (err) {
    console.error("Document fetch error:", err);
    alert("Unable to open document due to a network error. Please check your connection and try again.");
    return false;
  }
};

export const downloadDocumentSecurely = async (fileUrl, fileName = "document") => {
  if (!fileUrl) {
    alert("Document URL is unavailable for this record.");
    return;
  }

  const token = localStorage.getItem("token");
  let targetUrl = fileUrl;

  if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
    const origin =
      (typeof import.meta !== "undefined" && import.meta?.env?.VITE_API_BASE_URL)
        ? import.meta.env.VITE_API_BASE_URL.replace(/\/api\/v1\/?$/, "")
        : (window.location.origin.includes("5173") ? "http://localhost:5000" : window.location.origin);

    targetUrl = `${origin}${targetUrl.startsWith("/") ? "" : "/"}${targetUrl}`;
  }

  // Always fetch with Authorization header — never navigate directly to a protected URL.
  try {
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    const res = await fetch(targetUrl, { headers });

    if (res.ok) {
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
      return;
    }

    console.error(`Document download failed: HTTP ${res.status}`);
    alert(`Unable to download document (server returned ${res.status}). Please try again or contact support.`);
  } catch (err) {
    console.error("Document download error:", err);
    alert("Unable to download document due to a network error. Please check your connection and try again.");
  }
};

export default {
  getSecureDocumentUrl,
  openDocumentSecurely,
  downloadDocumentSecurely,
};
