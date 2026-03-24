// path: src/helpers/coe_backend_helper.js
import { get, post, del, patch } from "./api_helper";
import * as url from "./url_helper";
import { LIST_ITEMS, ATTACHMENTS, ATTACHMENT_BY_ID } from "./url_helper";

// ===========================
// COE Auth Endpoints
// ===========================

export const login = (data) => post(url.LOGIN, data); // {email,password}
export const refreshToken = (data) => post(url.REFRESH, data); // {refreshToken}
export const logout = (data) => post(url.LOGOUT, data); // {refreshToken}

// =====================
// COE Modules List Items
// =====================

export const getListItems = (listKey) =>
  get(`${LIST_ITEMS}?LIST_KEY=${encodeURIComponent(listKey)}`);

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