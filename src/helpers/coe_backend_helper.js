// path: src/helpers/coe_backend_helper.js
import { get, post, del, patch } from "./api_helper";
import * as url from "./url_helper";
import {
  LIST_ITEMS,
  ATTACHMENTS,
  ATTACHMENT_BY_ID,
  ANALYTICS,
  QUOTATION_SEND_FOR_PRICING,
  QUOTATION_FINAL_PRICING,
} from "./url_helper";

// ===========================
// COE Auth Endpoints
// ===========================

export const login = (data) => post(url.LOGIN, data); // {email,password}
export const refreshToken = (data) => post(url.REFRESH, data); // {refreshToken}
export const logout = (data) => post(url.LOGOUT, data); // {refreshToken}
export const getMyProfile = () => get(url.MY_PROFILE);
export const updateMyProfile = (data) => patch(url.MY_PROFILE, data);
export const changePassword = (data) => post(url.CHANGE_PASSWORD, data);

// ===========================
// Current Company / System Information
// ===========================

export const getCurrentCompany = () => get(url.CURRENT_COMPANY);
export const updateCurrentCompany = (data) => patch(url.CURRENT_COMPANY, data);

// =====================
// Quotation Pricing
// =====================

export const postSendQuotationForPricing = (quotationId, payload = {}) =>
  post(QUOTATION_SEND_FOR_PRICING(quotationId), payload);

export const getQuotationFinalPricing = (quotationId) =>
  get(QUOTATION_FINAL_PRICING(quotationId));

// =====================
// Analytics
// =====================

export const getAnalyticsOverview = (filters = {}) => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) {
      params.set(key, String(value).trim());
    }
  });
  const query = params.toString();
  return get(query ? `${ANALYTICS}?${query}` : ANALYTICS);
};

// =====================
// COE Modules List Items
// =====================

export const getListItems = (listKey, options = {}) => {
  const params = new URLSearchParams({ LIST_KEY: listKey });
  if (options.includeInactive) params.set("includeInactive", "true");
  return get(`${LIST_ITEMS}?${params.toString()}`);
};

export const createListItem = (payload) => post(LIST_ITEMS, payload);

export const updateListItem = (id, payload) =>
  patch(`${LIST_ITEMS}/${id}`, payload);

export const deleteListItem = (id) => del(`${LIST_ITEMS}/${id}`);

// =====================
// COE Attachments
// =====================

export const uploadAttachmentApi = (formData) =>
  post(ATTACHMENTS, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

export const listAttachmentsApi = (params = {}) =>
  get(ATTACHMENTS, { params });

export const getAttachmentByIdApi = (id) =>
  get(ATTACHMENT_BY_ID(id));

export const updateAttachmentApi = (id, payload) =>
  patch(ATTACHMENT_BY_ID(id), payload);

export const deleteAttachmentApi = (id) =>
  del(ATTACHMENT_BY_ID(id));
