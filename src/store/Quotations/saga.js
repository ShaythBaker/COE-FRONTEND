// path: src/store/Quotations/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchQuotationsSuccess,
  fetchQuotationsFail,
  fetchQuotationSuccess,
  fetchQuotationFail,
  createQuotationSuccess,
  createQuotationFail,
  updateQuotationSuccess,
  updateQuotationFail,
  deleteQuotationSuccess,
  deleteQuotationFail,
  fetchQuotationsLookupsSuccess,
  fetchQuotationsLookupsFail,
} from "./actions";

import { get, post, patch, del } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper";
import { QUOTATIONS, QUOTATION_BY_ID, TRAVEL_AGENTS } from "../../helpers/url_helper";
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

const unwrapId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
  }
  return "";
};

const normalizeStatus = value => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  return String(value).trim();
};

const normalizeQuotation = item => {
  if (!item || typeof item !== "object") return item;

  const normalizedStatus = normalizeStatus(
    item?.STATUS ??
      item?.status ??
      item?.quotationStatus ??
      item?.QUOTATION_STATUS
  );

  return {
    ...item,
    _id: unwrapId(item?._id),
    TRAVEL_AGENT_ID: unwrapId(item?.TRAVEL_AGENT_ID),
    NATIONALITY: unwrapId(item?.NATIONALITY),
    QUOTATION_TYPE: unwrapId(item?.QUOTATION_TYPE),

    // توحيد الحالة لدعم أي شاشة تقرأ STATUS أو status
    STATUS: normalizedStatus,
    status: normalizedStatus,
    statusLabel: normalizedStatus,
  };
};

const extractQuotationRows = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

function* onFetchQuotations({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, QUOTATIONS, { params });
    const rows = extractQuotationRows(res).map(normalizeQuotation);

    yield put(fetchQuotationsSuccess(rows));
    notifyInfo("Quotations loaded successfully.");
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to fetch quotations.");
    yield put(fetchQuotationsFail(msg));
    notifyError(msg);
  }
}

function* onFetchQuotation({ payload }) {
  try {
    const res = yield call(get, QUOTATION_BY_ID(payload.id));
    yield put(fetchQuotationSuccess(normalizeQuotation(res)));
    notifyInfo("Quotation details loaded successfully.");
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to fetch quotation details.");
    yield put(fetchQuotationFail(msg));
    notifyError(msg);
  }
}

function* onCreateQuotation({ payload }) {
  try {
    const created = yield call(post, QUOTATIONS, payload.data);
    const normalized = normalizeQuotation(created);

    yield put(createQuotationSuccess(normalized));
    notifySuccess("Quotation created successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to create quotation.");
    yield put(createQuotationFail(msg));
    notifyError(msg);
  }
}

function* onUpdateQuotation({ payload }) {
  try {
    const updated = yield call(patch, QUOTATION_BY_ID(payload.id), payload.data);
    const normalized = normalizeQuotation(updated);

    yield put(updateQuotationSuccess(normalized));
    notifySuccess("Quotation updated successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to update quotation.");
    yield put(updateQuotationFail(msg));
    notifyError(msg);
  }
}

function* onDeleteQuotation({ payload }) {
  try {
    yield call(del, QUOTATION_BY_ID(payload.id));
    yield put(deleteQuotationSuccess(payload.id));
    notifySuccess("Quotation deleted successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to delete quotation.");
    yield put(deleteQuotationFail(msg));
    notifyError(msg);
  }
}

function* onFetchQuotationsLookups() {
  try {
    const [travelAgents, countries, quotationTypes] = yield all([
      call(get, TRAVEL_AGENTS),
      call(getListItems, "COUNTRIES"),
      call(getListItems, "QUOTATION_TYPE"),
    ]);

    yield put(
      fetchQuotationsLookupsSuccess({
        travelAgents: Array.isArray(travelAgents) ? travelAgents : [],
        COUNTRIES: Array.isArray(countries) ? countries : [],
        QUOTATION_TYPE: Array.isArray(quotationTypes) ? quotationTypes : [],
      })
    );
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load quotation lookups.");
    yield put(fetchQuotationsLookupsFail(msg));
    notifyError(msg);
  }
}

export default function* quotationsSaga() {
  yield all([
    takeLatest(T.FETCH_QUOTATIONS, onFetchQuotations),
    takeLatest(T.FETCH_QUOTATION, onFetchQuotation),
    takeLatest(T.CREATE_QUOTATION, onCreateQuotation),
    takeLatest(T.UPDATE_QUOTATION, onUpdateQuotation),
    takeLatest(T.DELETE_QUOTATION, onDeleteQuotation),
    takeLatest(T.FETCH_QUOTATIONS_LOOKUPS, onFetchQuotationsLookups),
  ]);
}