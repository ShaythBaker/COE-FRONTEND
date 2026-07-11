// path: src/store/QuotationDays/saga.js
import { all, call, put, takeEvery, takeLatest } from "redux-saga/effects";
import { get, post, patch } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import * as T from "./actionTypes";
import {
  fetchQuotationDaysSuccess,
  fetchQuotationDaysFail,
  fetchQuotationDayLookupsSuccess,
  fetchQuotationDayLookupsFail,
  fetchRestaurantMealsSuccess,
  fetchRestaurantMealsFail,
  fetchRestaurantsByCitySuccess,
  fetchRestaurantsByCityFail,
  fetchRouteEntranceFeePlacesSuccess,
  fetchRouteEntranceFeePlacesFail,
  fetchTransportationBestRateSuccess,
  fetchTransportationBestRateFail,
  createQuotationDaySuccess,
  createQuotationDayFail,
  updateQuotationDaySuccess,
  updateQuotationDayFail,
} from "./actions";
import {
  TRANSPORTATION_TYPES,
  TRANSPORTATION_SIZES,
  TRANSPORTATION_COMPANIES,
  RESTAURANTS,
  RESTAURANT_MEALS,
  PLACES,
  TRANSPORTATION_COMPANIES_BEST_RATE,
} from "../../helpers/url_helper";
import {
  normalizeQuotationDay,
  normalizeQuotationDays,
} from "./normalizers";

const QUOTATION_DAYS = "/quotation-days";
const QUOTATION_DAYS_BY_QUOTATION = quotationId =>
  `/quotation-days/quotation/${quotationId}`;
const QUOTATION_DAY_BY_ID = id => `/quotation-days/${id}`;
const RESTAURANTS_BY_CITY = cityId => `/restaurants/by-city/${cityId}`;

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

function* onFetchQuotationDays({ payload }) {
  try {
    const res = yield call(get, QUOTATION_DAYS_BY_QUOTATION(payload.quotationId));
    yield put(
      fetchQuotationDaysSuccess(
        payload.quotationId,
        normalizeQuotationDays(res)
      )
    );
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load quotation days.");
    yield put(fetchQuotationDaysFail(msg));
    notifyError(msg);
  }
}

function* onFetchQuotationDayLookups() {
  try {
    const [
      transportationTypes,
      transportationCompanies,
      transportationSizes,
      guideTypes,
      restaurants,
      cities,
    ] = yield all([
      call(get, TRANSPORTATION_TYPES),
      call(get, TRANSPORTATION_COMPANIES),
      call(get, TRANSPORTATION_SIZES),
      call(getListItems, "GUIDE_TYPE"),
      call(get, RESTAURANTS),
      call(getListItems, "CITIES"),
    ]);

    yield put(
      fetchQuotationDayLookupsSuccess({
        transportationTypes: Array.isArray(transportationTypes) ? transportationTypes : [],
        transportationCompanies: Array.isArray(transportationCompanies) ? transportationCompanies : [],
        transportationSizes: Array.isArray(transportationSizes) ? transportationSizes : [],
        guideTypes: Array.isArray(guideTypes) ? guideTypes : [],
        restaurants: Array.isArray(restaurants) ? restaurants : [],
        cities: Array.isArray(cities) ? cities : [],
      })
    );
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load planning lookups.");
    yield put(fetchQuotationDayLookupsFail(msg));
    notifyError(msg);
  }
}

function* onFetchRestaurantMeals({ payload }) {
  try {
    const res = yield call(get, RESTAURANT_MEALS(payload.restaurantId));
    yield put(fetchRestaurantMealsSuccess(payload.restaurantId, res));
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load restaurant meals.");
    yield put(fetchRestaurantMealsFail(msg));
    notifyError(msg);
  }
}

function* onFetchRestaurantsByCity({ payload }) {
  try {
    const res = yield call(get, RESTAURANTS_BY_CITY(payload.cityId));
    yield put(
      fetchRestaurantsByCitySuccess(
        payload.cityId,
        Array.isArray(res) ? res : []
      )
    );
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load restaurants for selected city.");
    yield put(fetchRestaurantsByCityFail(payload.cityId, msg));
    notifyError(msg);
  }
}

function* onFetchRouteEntranceFeePlaces({ payload }) {
  try {
    const cityId = payload?.cityId;
    const nationalityId = payload?.nationalityId;

    const query = `${PLACES}?PLACE_CITY=${encodeURIComponent(cityId)}`;

    const res = yield call(get, query);

    yield put(
      fetchRouteEntranceFeePlacesSuccess(
        cityId,
        nationalityId,
        Array.isArray(res) ? res : []
      )
    );
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load entrance fee places.");
    yield put(
      fetchRouteEntranceFeePlacesFail(
        payload?.cityId,
        payload?.nationalityId,
        msg
      )
    );
    notifyError(msg);
  }
}

function* onFetchTransportationBestRate({ payload }) {
  try {
    const typeId = payload?.typeId;
    const pax = payload?.pax;
    const transportationCompanyId = payload?.transportationCompanyId;

    const res = yield call(
      get,
      TRANSPORTATION_COMPANIES_BEST_RATE(pax, typeId, transportationCompanyId)
    );

    yield put(fetchTransportationBestRateSuccess(typeId, pax, transportationCompanyId, res));
  } catch (e) {
    const rawMessage = extractErrorMessage(
      e,
      "Failed to load transportation best rate."
    );
    const msg = `${rawMessage}. Please contact your system administrator.`;

    yield put(
      fetchTransportationBestRateFail(
        payload?.typeId,
        payload?.pax,
        payload?.transportationCompanyId,
        msg
      )
    );
    notifyError(msg);
  }
}

function* onCreateQuotationDay({ payload }) {
  try {
    const res = yield call(post, QUOTATION_DAYS, payload.data);
    const savedDay = normalizeQuotationDay(res);
    yield put(createQuotationDaySuccess(savedDay));
    notifySuccess(`Day ${savedDay?.DAY_ORDER || ""} saved successfully.`);
    if (typeof payload.onDone === "function") {
      payload.onDone(savedDay);
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to create quotation day.");
    yield put(createQuotationDayFail(msg));
    notifyError(msg);
  }
}

function* onUpdateQuotationDay({ payload }) {
  try {
    const res = yield call(patch, QUOTATION_DAY_BY_ID(payload.id), payload.data);
    const savedDay = normalizeQuotationDay(res);
    yield put(updateQuotationDaySuccess(savedDay));
    notifySuccess(`Day ${savedDay?.DAY_ORDER || ""} updated successfully.`);
    if (typeof payload.onDone === "function") {
      payload.onDone(savedDay);
    }
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to update quotation day.");
    yield put(updateQuotationDayFail(msg));
    notifyError(msg);
  }
}

export default function* quotationDaysSaga() {
  yield all([
    takeLatest(T.FETCH_QUOTATION_DAYS, onFetchQuotationDays),
    takeLatest(T.FETCH_QUOTATION_DAY_LOOKUPS, onFetchQuotationDayLookups),
    takeLatest(T.FETCH_RESTAURANT_MEALS, onFetchRestaurantMeals),
    takeLatest(T.FETCH_RESTAURANTS_BY_CITY, onFetchRestaurantsByCity),
    takeEvery(T.FETCH_ROUTE_ENTRANCE_FEE_PLACES, onFetchRouteEntranceFeePlaces),
    takeLatest(T.FETCH_TRANSPORTATION_BEST_RATE, onFetchTransportationBestRate),
    takeLatest(T.CREATE_QUOTATION_DAY, onCreateQuotationDay),
    takeLatest(T.UPDATE_QUOTATION_DAY, onUpdateQuotationDay),
  ]);
}
