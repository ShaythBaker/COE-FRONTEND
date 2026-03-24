// path: src/store/TransportationCompanies/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchTransportationCompaniesSuccess,
  fetchTransportationCompaniesFail,
  fetchTransportationCompanySuccess,
  fetchTransportationCompanyFail,
  createTransportationCompanySuccess,
  createTransportationCompanyFail,
  updateTransportationCompanySuccess,
  updateTransportationCompanyFail,
  deleteTransportationCompanySuccess,
  deleteTransportationCompanyFail,
  fetchTransportationLookupsSuccess,
  fetchTransportationLookupsFail,
  upsertTransportationRatesSuccess,
  upsertTransportationRatesFail,
  deleteTransportationRateSuccess,
  deleteTransportationRateFail,
} from "./actions";

import { get, post, patch, del } from "../../helpers/api_helper";
import {
  TRANSPORTATION_COMPANIES,
  TRANSPORTATION_COMPANY_BY_ID,
  TRANSPORTATION_COMPANY_RATES,
  TRANSPORTATION_COMPANY_RATE_BY_ID,
  TRANSPORTATION_TYPES,
  TRANSPORTATION_SIZES,
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

const normalizeCompany = (item) => {
  if (!item || typeof item !== "object") return item;

  const rates = Array.isArray(item?.RATES)
    ? item.RATES
    : Array.isArray(item?.rates)
    ? item.rates
    : [];

  return {
    ...item,
    COMPANY_NAME: item.COMPANY_NAME || item.companyName || "",
    COMPANY_PHONE: item.COMPANY_PHONE || item.companyPhone || "",
    COMPANY_EMAIL: item.COMPANY_EMAIL || item.companyEmail || "",
    RATES: rates,
    rates,
  };
};

function* onFetchTransportationCompanies({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, TRANSPORTATION_COMPANIES, { params });
    const rows = Array.isArray(res) ? res.map(normalizeCompany) : [];
    yield put(fetchTransportationCompaniesSuccess(rows));
    notifyInfo("Transportation companies loaded successfully.");
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to fetch transportation companies.");
    yield put(fetchTransportationCompaniesFail(msg));
    notifyError(msg);
  }
}

function* onFetchTransportationCompany({ payload }) {
  try {
    const res = yield call(get, TRANSPORTATION_COMPANY_BY_ID(payload.id));
    yield put(fetchTransportationCompanySuccess(normalizeCompany(res)));
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to fetch transportation company details.");
    yield put(fetchTransportationCompanyFail(msg));
    notifyError(msg);
  }
}

function* onCreateTransportationCompany({ payload }) {
  try {
    const res = yield call(post, TRANSPORTATION_COMPANIES, payload.data);
    const created = normalizeCompany(res);
    yield put(createTransportationCompanySuccess(created));
    notifySuccess("Transportation company created successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(created);
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to create transportation company.");
    yield put(createTransportationCompanyFail(msg));
    notifyError(msg);
  }
}

function* onUpdateTransportationCompany({ payload }) {
  try {
    const res = yield call(patch, TRANSPORTATION_COMPANY_BY_ID(payload.id), payload.data);
    const updated = normalizeCompany(res);
    yield put(updateTransportationCompanySuccess(updated));
    notifySuccess("Transportation company updated successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(updated);
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to update transportation company.");
    yield put(updateTransportationCompanyFail(msg));
    notifyError(msg);
  }
}

function* onDeleteTransportationCompany({ payload }) {
  try {
    yield call(del, TRANSPORTATION_COMPANY_BY_ID(payload.id));
    yield put(deleteTransportationCompanySuccess(payload.id));
    notifySuccess("Transportation company deleted successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to delete transportation company.");
    yield put(deleteTransportationCompanyFail(msg));
    notifyError(msg);
  }
}

function* onFetchTransportationLookups() {
  try {
    const [typesRes, sizesRes] = yield all([
      call(get, TRANSPORTATION_TYPES),
      call(get, TRANSPORTATION_SIZES),
    ]);

    yield put(
      fetchTransportationLookupsSuccess({
        transportationTypes: Array.isArray(typesRes) ? typesRes : [],
        transportationSizes: Array.isArray(sizesRes) ? sizesRes : [],
      })
    );
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load transportation lookups.");
    yield put(fetchTransportationLookupsFail(msg));
    notifyError(msg);
  }
}

function* onUpsertTransportationRates({ payload }) {
  try {
    yield call(post, TRANSPORTATION_COMPANY_RATES(payload.companyId), payload.data);
    const refreshed = yield call(get, TRANSPORTATION_COMPANY_BY_ID(payload.companyId));
    const normalized = normalizeCompany(refreshed);
    yield put(upsertTransportationRatesSuccess(normalized));
    notifySuccess("Transportation rates saved successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to save transportation rates.");
    yield put(upsertTransportationRatesFail(msg));
    notifyError(msg);
  }
}

function* onDeleteTransportationRate({ payload }) {
  try {
    yield call(del, TRANSPORTATION_COMPANY_RATE_BY_ID(payload.companyId, payload.rateId));
    yield put(deleteTransportationRateSuccess(payload.companyId, payload.rateId));
    notifySuccess("Transportation rate deleted successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to delete transportation rate.");
    yield put(deleteTransportationRateFail(msg));
    notifyError(msg);
  }
}

export default function* transportationCompaniesSaga() {
  yield all([
    takeLatest(T.FETCH_TRANSPORTATION_COMPANIES, onFetchTransportationCompanies),
    takeLatest(T.FETCH_TRANSPORTATION_COMPANY, onFetchTransportationCompany),
    takeLatest(T.CREATE_TRANSPORTATION_COMPANY, onCreateTransportationCompany),
    takeLatest(T.UPDATE_TRANSPORTATION_COMPANY, onUpdateTransportationCompany),
    takeLatest(T.DELETE_TRANSPORTATION_COMPANY, onDeleteTransportationCompany),
    takeLatest(T.FETCH_TRANSPORTATION_LOOKUPS, onFetchTransportationLookups),
    takeLatest(T.UPSERT_TRANSPORTATION_RATES, onUpsertTransportationRates),
    takeLatest(T.DELETE_TRANSPORTATION_RATE, onDeleteTransportationRate),
  ]);
}