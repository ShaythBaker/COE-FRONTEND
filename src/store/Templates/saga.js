import { call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchTemplatesSuccess,
  fetchTemplatesFail,
  createTemplateSuccess,
  createTemplateFail,
  updateTemplateSuccess,
  updateTemplateFail,
  deleteTemplateSuccess,
  deleteTemplateFail,
} from "./actions";

import { get, post, patch, del } from "../../helpers/api_helper";
import { TEMPLATES, TEMPLATE_BY_ID } from "../../helpers/url_helper";
import { notifySuccess, notifyError } from "../../helpers/notify";

function extractErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.msg ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    fallback
  );
}

function* onFetchTemplates({ payload }) {
  try {
    const params = payload?.params || {};
    const response = yield call(get, TEMPLATES, { params });
    yield put(fetchTemplatesSuccess(response));
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load templates.");
    yield put(fetchTemplatesFail(message));
    notifyError(message);
  }
}

function* onCreateTemplate({ payload }) {
  try {
    const created = yield call(post, TEMPLATES, payload.data);
    yield put(createTemplateSuccess(created));
    notifySuccess("Template created successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(created);
    }
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to create template.");
    yield put(createTemplateFail(message));
    notifyError(message);
  }
}

function* onUpdateTemplate({ payload }) {
  try {
    const updated = yield call(patch, TEMPLATE_BY_ID(payload.id), payload.data);
    yield put(updateTemplateSuccess(updated));
    notifySuccess("Template updated successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(updated);
    }
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to update template.");
    yield put(updateTemplateFail(message));
    notifyError(message);
  }
}

function* onDeleteTemplate({ payload }) {
  try {
    yield call(del, TEMPLATE_BY_ID(payload.id));
    yield put(deleteTemplateSuccess(payload.id));
    notifySuccess("Template deleted successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to delete template.");
    yield put(deleteTemplateFail(message));
    notifyError(message);
  }
}

export default function* TemplatesSaga() {
  yield takeLatest(T.FETCH_TEMPLATES, onFetchTemplates);
  yield takeLatest(T.CREATE_TEMPLATE, onCreateTemplate);
  yield takeLatest(T.UPDATE_TEMPLATE, onUpdateTemplate);
  yield takeLatest(T.DELETE_TEMPLATE, onDeleteTemplate);
}
