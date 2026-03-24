// path: src/helpers/attachments_helper.js
import {
  uploadAttachmentApi,
  listAttachmentsApi,
  getAttachmentByIdApi,
  updateAttachmentApi,
  deleteAttachmentApi,
} from "./coe_backend_helper";

export const ATTACHMENT_TYPES = {
  PROFILE_IMG: "PROFILE_IMG",
  COMPANY_LOGO: "COMPANY_LOGO",
  DOCUMENT: "DOCUMENT",
  INVOICE: "INVOICE",
  HOTEL_IMAGE: "HOTEL_IMAGE",
  PLACE_IMAGE: "PLACE_IMAGE",
};

export const extractAttachmentErrorMessage = (error, fallback = "Attachment request failed") => {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.msg ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallback
  );
};

export const buildAttachmentFormData = ({
  file,
  ATTACHMENT_TYPE,
  OWNER_USER_ID,
  META,
}) => {
  if (!file) {
    throw new Error("File is required.");
  }

  if (!ATTACHMENT_TYPE) {
    throw new Error("ATTACHMENT_TYPE is required.");
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("ATTACHMENT_TYPE", ATTACHMENT_TYPE);

  if (OWNER_USER_ID) {
    formData.append("OWNER_USER_ID", OWNER_USER_ID);
  }

  if (META !== undefined && META !== null) {
    const metaValue =
      typeof META === "string" ? META : JSON.stringify(META);
    formData.append("META", metaValue);
  }

  return formData;
};

/**
 * Upload one attachment using the COE Attachments API.
 * Returns the created attachment document including _id.
 */
export const uploadAttachment = async ({
  file,
  ATTACHMENT_TYPE,
  OWNER_USER_ID,
  META,
}) => {
  const formData = buildAttachmentFormData({
    file,
    ATTACHMENT_TYPE,
    OWNER_USER_ID,
    META,
  });

  return uploadAttachmentApi(formData);
};

/**
 * List company-scoped attachments.
 * Supported filters:
 * - ATTACHMENT_TYPE
 * - OWNER_USER_ID
 */
export const listAttachments = async (filters = {}) => {
  const params = {};

  if (filters.ATTACHMENT_TYPE) {
    params.ATTACHMENT_TYPE = filters.ATTACHMENT_TYPE;
  }

  if (filters.OWNER_USER_ID) {
    params.OWNER_USER_ID = filters.OWNER_USER_ID;
  }

  return listAttachmentsApi(params);
};

/**
 * Get metadata + signed DOWNLOAD_URL for an attachment id.
 */
export const getAttachmentById = async (id) => {
  if (!id) {
    throw new Error("Attachment id is required.");
  }

  return getAttachmentByIdApi(id);
};

/**
 * Returns the signed DOWNLOAD_URL only.
 */
export const getAttachmentDownloadUrl = async (id) => {
  const response = await getAttachmentById(id);
  return response?.DOWNLOAD_URL || "";
};

/**
 * Open signed URL in new tab for preview/download.
 */
export const openAttachment = async (id, target = "_blank") => {
  const downloadUrl = await getAttachmentDownloadUrl(id);

  if (!downloadUrl) {
    throw new Error("Download URL is not available for this attachment.");
  }

  window.open(downloadUrl, target, "noopener,noreferrer");
  return downloadUrl;
};

/**
 * Update attachment metadata only.
 * Allowed fields:
 * - ATTACHMENT_TYPE
 * - OWNER_USER_ID
 * - META
 * - ACTIVE_STATUS
 */
export const updateAttachment = async (id, payload = {}) => {
  if (!id) {
    throw new Error("Attachment id is required.");
  }

  const body = {};

  if (payload.ATTACHMENT_TYPE !== undefined) {
    body.ATTACHMENT_TYPE = payload.ATTACHMENT_TYPE;
  }

  if (payload.OWNER_USER_ID !== undefined) {
    body.OWNER_USER_ID = payload.OWNER_USER_ID;
  }

  if (payload.META !== undefined) {
    body.META = payload.META;
  }

  if (payload.ACTIVE_STATUS !== undefined) {
    body.ACTIVE_STATUS = payload.ACTIVE_STATUS;
  }

  return updateAttachmentApi(id, body);
};

/**
 * Soft delete attachment record and best-effort S3 delete via backend.
 */
export const deleteAttachment = async (id) => {
  if (!id) {
    throw new Error("Attachment id is required.");
  }

  return deleteAttachmentApi(id);
};

/**
 * Upload file first, then return the attachment _id
 * for use in business payloads such as:
 * PROFILE_IMG_ATTACHMENT_ID / LOGO_ATTACHMENT_ID / etc.
 */
export const uploadAttachmentAndGetId = async (params) => {
  const attachment = await uploadAttachment(params);
  return attachment?._id || "";
};

/**
 * Convenience helper to map uploaded attachment id
 * into another entity payload.
 */
export const withAttachmentId = async ({
  entityPayload = {},
  attachmentFieldName,
  file,
  ATTACHMENT_TYPE,
  OWNER_USER_ID,
  META,
}) => {
  if (!attachmentFieldName) {
    throw new Error("attachmentFieldName is required.");
  }

  const attachmentId = await uploadAttachmentAndGetId({
    file,
    ATTACHMENT_TYPE,
    OWNER_USER_ID,
    META,
  });

  return {
    ...entityPayload,
    [attachmentFieldName]: attachmentId,
  };
};