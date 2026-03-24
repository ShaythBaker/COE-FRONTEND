// path: src/store/Hotels/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchHotelsSuccess,
  fetchHotelsFail,
  fetchHotelSuccess,
  fetchHotelFail,
  createHotelSuccess,
  createHotelFail,
  updateHotelSuccess,
  updateHotelFail,
  deleteHotelSuccess,
  deleteHotelFail,
  fetchHotelsLookupsSuccess,
  fetchHotelsLookupsFail,
  fetchSeasonRatesSuccess,
  fetchSeasonRatesFail,
  createSeasonRateSuccess,
  createSeasonRateFail,
  updateSeasonRateSuccess,
  updateSeasonRateFail,
  deleteSeasonRateSuccess,
  deleteSeasonRateFail,
} from "./actions";

import { get, post, del, patch } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper"; // ✅ use your helper :contentReference[oaicite:4]{index=4}
import {
  HOTELS,
  HOTEL_BY_ID,
  HOTEL_SEASON_RATES,
  HOTEL_SEASON_RATE_BY_ID,
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

// Hotels
function* onFetchHotels({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, HOTELS, { params });
    yield put(fetchHotelsSuccess(res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(fetchHotelsFail(extractErrorMessage(e, "Error While fetching data")));
    notifyError("Error While fetching data");
  }
}

function* onFetchHotel({ payload }) {
  try {
    const res = yield call(get, HOTEL_BY_ID(payload.id));
    yield put(fetchHotelSuccess(res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(fetchHotelFail(extractErrorMessage(e, "Error While fetching data")));
    notifyError("Error While fetching data");
  }
}

function* onCreateHotel({ payload }) {
  try {
    const created = yield call(post, HOTELS, payload.data);
    yield put(createHotelSuccess(created));
    notifySuccess("Created Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(created);
  } catch (e) {
    yield put(createHotelFail(extractErrorMessage(e, "Something went wrong while Processing your request")));
    notifyError("Something went wrong while Processing your request");
  }
}

function* onUpdateHotel({ payload }) {
  try {
    const updated = yield call(patch, HOTEL_BY_ID(payload.id), payload.data);
    yield put(updateHotelSuccess(updated));
    notifySuccess("Updated Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(updated);
  } catch (e) {
    yield put(updateHotelFail(extractErrorMessage(e, "Something went wrong while Processing your request")));
    notifyError("Something went wrong while Processing your request");
  }
}

function* onDeleteHotel({ payload }) {
  try {
    yield call(del, HOTEL_BY_ID(payload.id));
    yield put(deleteHotelSuccess(payload.id));
    notifySuccess("Deleted Successfully");
    if (typeof payload?.onDone === "function") payload.onDone();
  } catch (e) {
    yield put(deleteHotelFail(extractErrorMessage(e, "Something went wrong while Processing your request")));
    notifyError("Something went wrong while Processing your request");
  }
}

// Lookups (CITIES, HOTELSTARS, HOTELCHAINS, HOTELSEASONS)
function* onFetchLookups() {
  try {
    const [cities, stars, chains, seasons] = yield all([
      call(getListItems, "CITIES"),
      call(getListItems, "HOTELSTARS"),
      call(getListItems, "HOTELCHAINS"),
      call(getListItems, "HOTELSEASONS"),
    ]);

    yield put(
      fetchHotelsLookupsSuccess({
        CITIES: Array.isArray(cities) ? cities : [],
        HOTELSTARS: Array.isArray(stars) ? stars : [],
        HOTELCHAINS: Array.isArray(chains) ? chains : [],
        HOTELSEASONS: Array.isArray(seasons) ? seasons : [],
      })
    );
  } catch (e) {
    yield put(fetchHotelsLookupsFail(extractErrorMessage(e, "Error While fetching data")));
    notifyError("Error While fetching data");
  }
}

// Season Rates
function* onFetchSeasonRates({ payload }) {
  try {
    const res = yield call(get, HOTEL_SEASON_RATES(payload.hotelId));
    yield put(fetchSeasonRatesSuccess(payload.hotelId, res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(fetchSeasonRatesFail(extractErrorMessage(e, "Error While fetching data")));
    notifyError("Error While fetching data");
  }
}

function* onCreateSeasonRate({ payload }) {
  try {
    const created = yield call(post, HOTEL_SEASON_RATES(payload.hotelId), payload.data);
    yield put(createSeasonRateSuccess(payload.hotelId, created));
    notifySuccess("Created Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(created);
  } catch (e) {
    yield put(createSeasonRateFail(extractErrorMessage(e, "Something went wrong while Processing your request")));
    notifyError("Something went wrong while Processing your request");
  }
}

function* onUpdateSeasonRate({ payload }) {
  try {
    const updated = yield call(
      patch,
      HOTEL_SEASON_RATE_BY_ID(payload.hotelId, payload.rateId),
      payload.data
    );
    yield put(updateSeasonRateSuccess(payload.hotelId, updated));
    notifySuccess("Updated Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(updated);
  } catch (e) {
    yield put(updateSeasonRateFail(extractErrorMessage(e, "Something went wrong while Processing your request")));
    notifyError("Something went wrong while Processing your request");
  }
}

function* onDeleteSeasonRate({ payload }) {
  try {
    yield call(del, HOTEL_SEASON_RATE_BY_ID(payload.hotelId, payload.rateId));
    yield put(deleteSeasonRateSuccess(payload.hotelId, payload.rateId));
    notifySuccess("Deleted Successfully");
    if (typeof payload?.onDone === "function") payload.onDone();
  } catch (e) {
    yield put(deleteSeasonRateFail(extractErrorMessage(e, "Something went wrong while Processing your request")));
    notifyError("Something went wrong while Processing your request");
  }
}

export default function* HotelsSaga() {
  yield takeLatest(T.FETCH_HOTELS, onFetchHotels);
  yield takeLatest(T.FETCH_HOTEL, onFetchHotel);
  yield takeLatest(T.CREATE_HOTEL, onCreateHotel);
  yield takeLatest(T.UPDATE_HOTEL, onUpdateHotel);
  yield takeLatest(T.DELETE_HOTEL, onDeleteHotel);

  yield takeLatest(T.FETCH_HOTELS_LOOKUPS, onFetchLookups);

  yield takeLatest(T.FETCH_SEASON_RATES, onFetchSeasonRates);
  yield takeLatest(T.CREATE_SEASON_RATE, onCreateSeasonRate);
  yield takeLatest(T.UPDATE_SEASON_RATE, onUpdateSeasonRate);
  yield takeLatest(T.DELETE_SEASON_RATE, onDeleteSeasonRate);
}