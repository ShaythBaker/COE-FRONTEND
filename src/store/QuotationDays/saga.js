// path: src/store/QuotationDays/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import { get, post, patch } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper";
import { notifyError, notifyInfo, notifySuccess } from "../../helpers/notify";
import * as T from "./actionTypes";
import {
  fetchQuotationDaysSuccess,
  fetchQuotationDaysFail,
  fetchQuotationDayLookupsSuccess,
  fetchQuotationDayLookupsFail,
  fetchRestaurantMealsSuccess,
  fetchRestaurantMealsFail,
  createQuotationDaySuccess,
  createQuotationDayFail,
  updateQuotationDaySuccess,
  updateQuotationDayFail,
} from "./actions";

const QUOTATION_DAYS = "/quotation-days";
const QUOTATION_DAYS_BY_QUOTATION = quotationId => `/quotation-days/quotation/${quotationId}`;
const QUOTATION_DAY_BY_ID = id => `/quotation-days/${id}`;
const TRANSPORTATION_TYPES = "/transportation-types";
const RESTAURANTS = "/restaurants";
const RESTAURANT_MEALS = restaurantId => `/restaurants/${restaurantId}/meals`;
const PLACES = "/place";

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
    yield put(fetchQuotationDaysSuccess(res));
  } catch (e) {
    const msg = extractErrorMessage(e, "Failed to load quotation days.");
    yield put(fetchQuotationDaysFail(msg));
    notifyError(msg);
  }
}

function* onFetchQuotationDayLookups() {
  try {
    const [transportationTypes, guideTypes, restaurants, places] = yield all([
      call(get, TRANSPORTATION_TYPES),
      call(getListItems, "GUIDE_TYPE"),
      call(get, RESTAURANTS),
      call(get, PLACES),
    ]);

    yield put(
      fetchQuotationDayLookupsSuccess({
        transportationTypes: Array.isArray(transportationTypes) ? transportationTypes : [],
        guideTypes: Array.isArray(guideTypes) ? guideTypes : [],
        restaurants: Array.isArray(restaurants) ? restaurants : [],
        places: Array.isArray(places) ? places : [],
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

function* onCreateQuotationDay({ payload }) {
  try {
    const res = yield call(post, QUOTATION_DAYS, payload.data);
    yield put(createQuotationDaySuccess(res));
    notifySuccess(`Day ${res?.DAY_ORDER || ""} saved successfully.`);
    if (typeof payload.onDone === "function") {
      payload.onDone(res);
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
    yield put(updateQuotationDaySuccess(res));
    notifySuccess(`Day ${res?.DAY_ORDER || ""} updated successfully.`);
    if (typeof payload.onDone === "function") {
      payload.onDone(res);
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
    takeLatest(T.CREATE_QUOTATION_DAY, onCreateQuotationDay),
    takeLatest(T.UPDATE_QUOTATION_DAY, onUpdateQuotationDay),
  ]);
}