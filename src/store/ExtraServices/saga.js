// path: src/store/ExtraServices/saga.js
import { call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchExtraServicesSuccess,
  fetchExtraServicesFail,
  fetchExtraServiceSuccess,
  fetchExtraServiceFail,
  createExtraServiceSuccess,
  createExtraServiceFail,
  updateExtraServiceSuccess,
  updateExtraServiceFail,
  deleteExtraServiceSuccess,
  deleteExtraServiceFail,
} from "./actions";

import { get, post, del, patch } from "../../helpers/api_helper";
import { EXTRA_SERVICES, EXTRA_SERVICE_BY_ID } from "../../helpers/url_helper";
import {
  notifySuccess,
  notifyError,
  notifyInfo,
} from "../../helpers/notify";

function extractErrorMessage(error, fallback) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.msg ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallback
  );
}

function* onFetchExtraServices({ payload }) {
  try {
    const params = payload?.params || {};
    const normalizedParams = {};

    if (params?.q) {
      normalizedParams.q = params.q;
    }

    const response = yield call(
      get,
      EXTRA_SERVICES,
      Object.keys(normalizedParams).length ? { params: normalizedParams } : {}
    );

    yield put(fetchExtraServicesSuccess(response));
    notifyInfo("Extra Services loaded successfully.");
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to load Extra Services."
    );
    yield put(fetchExtraServicesFail(message));
    notifyError(message);
  }
}

function* onFetchExtraService({ payload }) {
  try {
    const response = yield call(get, EXTRA_SERVICE_BY_ID(payload.id));
    yield put(fetchExtraServiceSuccess(response));
    notifyInfo("Extra Service loaded successfully.");
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to load Extra Service."
    );
    yield put(fetchExtraServiceFail(message));
    notifyError(message);
  }
}

function* onCreateExtraService({ payload }) {
  try {
    const created = yield call(post, EXTRA_SERVICES, payload.data);
    yield put(createExtraServiceSuccess(created));
    notifySuccess("Extra Service created successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(created);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to create Extra Service."
    );
    yield put(createExtraServiceFail(message));
    notifyError(message);
  }
}

function* onUpdateExtraService({ payload }) {
  try {
    const updated = yield call(
      patch,
      EXTRA_SERVICE_BY_ID(payload.id),
      payload.data
    );
    yield put(updateExtraServiceSuccess(updated));
    notifySuccess("Extra Service updated successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(updated);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to update Extra Service."
    );
    yield put(updateExtraServiceFail(message));
    notifyError(message);
  }
}

function* onDeleteExtraService({ payload }) {
  try {
    yield call(del, EXTRA_SERVICE_BY_ID(payload.id));
    yield put(deleteExtraServiceSuccess(payload.id));
    notifySuccess("Extra Service deleted successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to delete Extra Service."
    );
    yield put(deleteExtraServiceFail(message));
    notifyError(message);
  }
}

export default function* ExtraServicesSaga() {
  yield takeLatest(T.FETCH_EXTRA_SERVICES, onFetchExtraServices);
  yield takeLatest(T.FETCH_EXTRA_SERVICE, onFetchExtraService);
  yield takeLatest(T.CREATE_EXTRA_SERVICE, onCreateExtraService);
  yield takeLatest(T.UPDATE_EXTRA_SERVICE, onUpdateExtraService);
  yield takeLatest(T.DELETE_EXTRA_SERVICE, onDeleteExtraService);
}