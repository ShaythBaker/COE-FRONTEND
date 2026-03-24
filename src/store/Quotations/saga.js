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
import {
  QUOTATIONS,
  QUOTATION_BY_ID,
  TRAVEL_AGENTS,
  TRANSPORTATION_COMPANIES,
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

const unwrapId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
  }
  return "";
};

const normalizeQuotation = item => {
  if (!item || typeof item !== "object") return item;

  return {
    ...item,
    _id: unwrapId(item?._id),
    TRAVEL_AGENT_ID: unwrapId(item?.TRAVEL_AGENT_ID),
    TRANSPORTATION_COMPANY_ID: unwrapId(item?.TRANSPORTATION_COMPANY_ID),
  };
};

function* onFetchQuotations({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, QUOTATIONS, { params });
    const rows = Array.isArray(res) ? res.map(normalizeQuotation) : [];
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
    const [travelAgents, transportationCompanies] = yield all([
      call(get, TRAVEL_AGENTS),
      call(get, TRANSPORTATION_COMPANIES),
    ]);

    yield put(
      fetchQuotationsLookupsSuccess({
        travelAgents: Array.isArray(travelAgents) ? travelAgents : [],
        transportationCompanies: Array.isArray(transportationCompanies)
          ? transportationCompanies
          : [],
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