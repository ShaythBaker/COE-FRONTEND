// path: src/store/TransportationSizes/saga.js
import { call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchTransportationSizesSuccess,
  fetchTransportationSizesFail,
  createTransportationSizeSuccess,
  createTransportationSizeFail,
  updateTransportationSizeSuccess,
  updateTransportationSizeFail,
  deleteTransportationSizeSuccess,
  deleteTransportationSizeFail,
} from "./actions";

import { get, post, patch, del } from "../../helpers/api_helper";
import {
  TRANSPORTATION_SIZES,
  TRANSPORTATION_SIZE_BY_ID,
} from "../../helpers/url_helper";
import { notifySuccess, notifyError, notifyInfo } from "../../helpers/notify";

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

function* onFetchTransportationSizes({ payload }) {
  try {
    const params = payload?.params || {};
    const response = yield call(get, TRANSPORTATION_SIZES, { params });
    yield put(fetchTransportationSizesSuccess(response));
    notifyInfo("Transportation sizes loaded successfully.");
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to load transportation sizes.",
    );
    yield put(fetchTransportationSizesFail(message));
    notifyError(message);
  }
}

function* onCreateTransportationSize({ payload }) {
  try {
    const created = yield call(post, TRANSPORTATION_SIZES, payload.data);
    yield put(createTransportationSizeSuccess(created));
    notifySuccess("Transportation size created successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(created);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to create transportation size.",
    );
    yield put(createTransportationSizeFail(message));
    notifyError(message);
  }
}

function* onUpdateTransportationSize({ payload }) {
  try {
    const updated = yield call(
      patch,
      TRANSPORTATION_SIZE_BY_ID(payload.id),
      payload.data,
    );
    yield put(updateTransportationSizeSuccess(updated));
    notifySuccess("Transportation size updated successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(updated);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to update transportation size.",
    );
    yield put(updateTransportationSizeFail(message));
    notifyError(message);
  }
}

function* onDeleteTransportationSize({ payload }) {
  try {
    yield call(del, TRANSPORTATION_SIZE_BY_ID(payload.id));
    yield put(deleteTransportationSizeSuccess(payload.id));
    notifySuccess("Transportation size deleted successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Failed to delete transportation size.",
    );
    yield put(deleteTransportationSizeFail(message));
    notifyError(message);
  }
}

export default function* TransportationSizesSaga() {
  yield takeLatest(T.FETCH_TRANSPORTATION_SIZES, onFetchTransportationSizes);
  yield takeLatest(T.CREATE_TRANSPORTATION_SIZE, onCreateTransportationSize);
  yield takeLatest(T.UPDATE_TRANSPORTATION_SIZE, onUpdateTransportationSize);
  yield takeLatest(T.DELETE_TRANSPORTATION_SIZE, onDeleteTransportationSize);
}
