/**
 * Unified Secure Document Viewer and Downloader for SetuGov.
 * Handles authenticated document retrieval (JWT header + query token fallback),
 * Blob URL generation, inline browser preview, and automatic download fallbacks.
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

  const token = localStorage.getItem("token");
  if (token && (fullUrl.includes("localhost:5000") || fullUrl.includes("/api/v1/") || fullUrl.includes("/documents") || fullUrl.includes("/uploads"))) {
    const separator = fullUrl.includes("?") ? "&" : "?";
    if (!fullUrl.includes("token=")) {
      fullUrl = `${fullUrl}${separator}token=${encodeURIComponent(token)}`;
    }
  }

  return fullUrl;
};

export const openDocumentSecurely = async (fileUrl, fileName = "document") => {
  if (!fileUrl) {
    alert("Document URL is unavailable for this record.");
    return false;
  }

  // Direct opening for data or blob URLs
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

  const isLocalBackend =
    targetUrl.includes("localhost:5000") ||
    targetUrl.includes("/api/v1/") ||
    targetUrl.includes("/documents") ||
    targetUrl.includes("/uploads");

  // If local backend, try authenticated fetch to get clean Blob URL for reliable in-browser rendering
  if (isLocalBackend) {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(targetUrl, { headers });

      if (res.ok) {
        const blob = await res.blob();
        const mimeType = blob.type || (fileName.endsWith(".pdf") ? "application/pdf" : "image/png");
        const cleanBlob = new Blob([blob], { type: mimeType });
        const blobUrl = URL.createObjectURL(cleanBlob);

        const newTab = window.open(blobUrl, "_blank", "noopener,noreferrer");
        if (!newTab) {
          // Fallback if popup is blocked: trigger immediate download
          const link = document.createElement("a");
          link.href = blobUrl;
          link.download = fileName || "document";
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
        return true;
      }
    } catch (err) {
      console.warn("Direct blob fetch failed, trying query token fallback:", err);
    }
  }

  // Fallback: direct window.open with query token
  const authenticatedUrl = getSecureDocumentUrl(targetUrl);
  const win = window.open(authenticatedUrl, "_blank", "noopener,noreferrer");
  if (!win) {
    // Popup was blocked, trigger link click
    const a = document.createElement("a");
    a.href = authenticatedUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
  return true;
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
  } catch (err) {
    console.warn("Direct blob download failed, falling back to direct URL:", err);
  }

  const authenticatedUrl = getSecureDocumentUrl(targetUrl);
  const link = document.createElement("a");
  link.href = authenticatedUrl;
  link.download = fileName || "download";
  link.target = "_blank";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

export default {
  getSecureDocumentUrl,
  openDocumentSecurely,
  downloadDocumentSecurely,
};
