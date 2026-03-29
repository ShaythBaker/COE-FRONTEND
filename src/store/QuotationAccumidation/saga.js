// path: src/store/QuotationAccumidation/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import { get, post, patch } from "../../helpers/api_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import * as T from "./actionTypes";
import {
  fetchQuotationAccumidationSuccess,
  fetchQuotationAccumidationFail,
  createQuotationAccumidationSuccess,
  createQuotationAccumidationFail,
  updateQuotationAccumidationSuccess,
  updateQuotationAccumidationFail,
} from "./actions";
import {
  QUOTATION_ACCUMIDATION,
  QUOTATION_ACCUMIDATION_BY_ID,
} from "../../helpers/url_helper";

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

// path: src/store/QuotationAccumidation/saga.js
function* onFetchQuotationAccumidation({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const res = yield call(
      get,
      `${QUOTATION_ACCUMIDATION}?QUOTATION_ID=${encodeURIComponent(quotationId || "")}`
    );

    const item = Array.isArray(res) ? res[0] || null : res || null;

    yield put(fetchQuotationAccumidationSuccess(item));
  } catch (error) {
    const status = error?.response?.status;

    if (status === 404) {
      yield put(fetchQuotationAccumidationSuccess(null));
      return;
    }

    const msg = extractErrorMessage(error, "Failed to load quotation accumidation.");
    yield put(fetchQuotationAccumidationFail(msg));
    notifyError(msg);
  }
}

function* onCreateQuotationAccumidation({ payload }) {
  try {
    const res = yield call(post, QUOTATION_ACCUMIDATION, payload?.data || {});
    yield put(createQuotationAccumidationSuccess(res));
    notifySuccess("Accumidation saved successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(res);
    }
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to save accumidation.");
    yield put(createQuotationAccumidationFail(msg));
    notifyError(msg);
  }
}

function* onUpdateQuotationAccumidation({ payload }) {
  try {
    const res = yield call(
      patch,
      QUOTATION_ACCUMIDATION_BY_ID(payload?.id),
      payload?.data || {}
    );
    yield put(updateQuotationAccumidationSuccess(res));
    notifySuccess("Accumidation updated successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(res);
    }
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to update accumidation.");
    yield put(updateQuotationAccumidationFail(msg));
    notifyError(msg);
  }
}

export default function* quotationAccumidationSaga() {
  yield all([
    takeLatest(T.FETCH_QUOTATION_ACCUMIDATION, onFetchQuotationAccumidation),
    takeLatest(T.CREATE_QUOTATION_ACCUMIDATION, onCreateQuotationAccumidation),
    takeLatest(T.UPDATE_QUOTATION_ACCUMIDATION, onUpdateQuotationAccumidation),
  ]);
}