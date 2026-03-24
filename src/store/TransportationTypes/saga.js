// path: src/store/TransportationTypes/saga.js
import { call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchTransportationTypesSuccess,
  fetchTransportationTypesFail,
  createTransportationTypeSuccess,
  createTransportationTypeFail,
  updateTransportationTypeSuccess,
  updateTransportationTypeFail,
  deleteTransportationTypeSuccess,
  deleteTransportationTypeFail,
} from "./actions";

import { get, post, patch, del } from "../../helpers/api_helper";
import {
  TRANSPORTATION_TYPES,
  TRANSPORTATION_TYPE_BY_ID,
} from "../../helpers/url_helper";
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
    fallback
  );
}

function* onFetchTransportationTypes({ payload }) {
  try {
    const params = payload?.params || {};
    const response = yield call(get, TRANSPORTATION_TYPES, { params });
    yield put(fetchTransportationTypesSuccess(response));
    notifyInfo("Transportation types loaded successfully.");
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to load transportation types."
    );
    yield put(fetchTransportationTypesFail(message));
    notifyError(message);
  }
}

function* onCreateTransportationType({ payload }) {
  try {
    const created = yield call(post, TRANSPORTATION_TYPES, payload.data);
    yield put(createTransportationTypeSuccess(created));
    notifySuccess("Transportation type created successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(created);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to create transportation type."
    );
    yield put(createTransportationTypeFail(message));
    notifyError(message);
  }
}

function* onUpdateTransportationType({ payload }) {
  try {
    const updated = yield call(
      patch,
      TRANSPORTATION_TYPE_BY_ID(payload.id),
      payload.data
    );
    yield put(updateTransportationTypeSuccess(updated));
    notifySuccess("Transportation type updated successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(updated);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to update transportation type."
    );
    yield put(updateTransportationTypeFail(message));
    notifyError(message);
  }
}

function* onDeleteTransportationType({ payload }) {
  try {
    yield call(del, TRANSPORTATION_TYPE_BY_ID(payload.id));
    yield put(deleteTransportationTypeSuccess(payload.id));
    notifySuccess("Transportation type deleted successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to delete transportation type."
    );
    yield put(deleteTransportationTypeFail(message));
    notifyError(message);
  }
}

export default function* TransportationTypesSaga() {
  yield takeLatest(T.FETCH_TRANSPORTATION_TYPES, onFetchTransportationTypes);
  yield takeLatest(T.CREATE_TRANSPORTATION_TYPE, onCreateTransportationType);
  yield takeLatest(T.UPDATE_TRANSPORTATION_TYPE, onUpdateTransportationType);
  yield takeLatest(T.DELETE_TRANSPORTATION_TYPE, onDeleteTransportationType);
}