import { apiRequest } from "./api.js";

/**
 * Upload a document or evidence file (PDF, PNG, JPG/JPEG max 10MB).
 * @param {File} file 
 */
export const uploadFile = async (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest("/upload", {
    method: "POST",
    body: formData,
  });
};

export default {
  uploadFile,
};
