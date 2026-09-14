import { successResponse } from '../utils/response.js';
import applicationDocumentService from '../services/applicationDocumentService.js';

export const uploadDocument = async (req, res, next) => {
  try {
    const document = await applicationDocumentService.uploadSolutionDocument(
      req.params.application_id,
      req.file,
      req.body,
      req.user,
      req,
      req.ip
    );
    return successResponse(res, document, 'Solution document uploaded successfully', 201);
  } catch (error) {
    next(error);
  }
};

export const getDocuments = async (req, res, next) => {
  try {
    const documents = await applicationDocumentService.getApplicationDocuments(
      req.params.application_id,
      req.user
    );
    return successResponse(res, documents, 'Documents retrieved successfully');
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (req, res, next) => {
  try {
    const result = await applicationDocumentService.deleteSolutionDocument(
      req.params.application_id,
      req.params.document_id,
      req.user,
      req.ip
    );
    return successResponse(res, result, 'Document deleted successfully');
  } catch (error) {
    next(error);
  }
};

export const finalizeSubmission = async (req, res, next) => {
  try {
    const application = await applicationDocumentService.finalizeSolutionSubmission(
      req.params.application_id,
      req.user,
      req.ip
    );
    return successResponse(res, application, 'Finalist solution package submitted and finalized successfully');
  } catch (error) {
    next(error);
  }
};

export default {
  uploadDocument,
  getDocuments,
  deleteDocument,
  finalizeSubmission
};
