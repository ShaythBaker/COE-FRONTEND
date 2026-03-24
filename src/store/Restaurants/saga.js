// path: src/store/Restaurants/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchRestaurantsSuccess,
  fetchRestaurantsFail,
  fetchRestaurantSuccess,
  fetchRestaurantFail,
  createRestaurantSuccess,
  createRestaurantFail,
  updateRestaurantSuccess,
  updateRestaurantFail,
  deleteRestaurantSuccess,
  deleteRestaurantFail,
  fetchRestaurantsLookupsSuccess,
  fetchRestaurantsLookupsFail,
  fetchMealsSuccess,
  fetchMealsFail,
  createMealSuccess,
  createMealFail,
  updateMealSuccess,
  updateMealFail,
  deleteMealSuccess,
  deleteMealFail,
} from "./actions";

import { get, post, patch, del } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper";
import {
  RESTAURANTS,
  RESTAURANT_BY_ID,
  RESTAURANT_MEALS,
  RESTAURANT_MEAL_BY_ID,
} from "../../helpers/url_helper";
import { notifySuccess, notifyError, notifyInfo } from "../../helpers/notify";

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

function* onFetchRestaurants({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, RESTAURANTS, { params });
    yield put(fetchRestaurantsSuccess(res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(
      fetchRestaurantsFail(extractErrorMessage(e, "Error While fetching data")),
    );
    notifyError("Error While fetching data");
  }
}

function* onFetchRestaurant({ payload }) {
  try {
    const res = yield call(get, RESTAURANT_BY_ID(payload.id));
    yield put(fetchRestaurantSuccess(res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(
      fetchRestaurantFail(extractErrorMessage(e, "Error While fetching data")),
    );
    notifyError("Error While fetching data");
  }
}

function* onCreateRestaurant({ payload }) {
  try {
    const created = yield call(post, RESTAURANTS, payload.data);
    yield put(createRestaurantSuccess(created));
    notifySuccess("Created Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(created);
  } catch (e) {
    yield put(
      createRestaurantFail(
        extractErrorMessage(
          e,
          "Something went wrong while Processing your request",
        ),
      ),
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onUpdateRestaurant({ payload }) {
  try {
    const updated = yield call(
      patch,
      RESTAURANT_BY_ID(payload.id),
      payload.data,
    );
    yield put(updateRestaurantSuccess(updated));
    notifySuccess("Updated Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(updated);
  } catch (e) {
    yield put(
      updateRestaurantFail(
        extractErrorMessage(
          e,
          "Something went wrong while Processing your request",
        ),
      ),
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onDeleteRestaurant({ payload }) {
  try {
    yield call(del, RESTAURANT_BY_ID(payload.id));
    yield put(deleteRestaurantSuccess(payload.id));
    notifySuccess("Deleted Successfully");
    if (typeof payload?.onDone === "function") payload.onDone();
  } catch (e) {
    yield put(
      deleteRestaurantFail(
        extractErrorMessage(
          e,
          "Something went wrong while Processing your request",
        ),
      ),
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onFetchLookups() {
  try {
    const [cities, meals] = yield all([
      call(getListItems, "CITIES"),
      call(getListItems, "RESTAURANTS_MEALS"),
    ]);

    yield put(
      fetchRestaurantsLookupsSuccess({
        CITIES: Array.isArray(cities) ? cities : [],
        RESTAURANTS_MEALS: Array.isArray(meals) ? meals : [],
      }),
    );
  } catch (e) {
    yield put(
      fetchRestaurantsLookupsFail(
        extractErrorMessage(e, "Error While fetching data"),
      ),
    );
    notifyError("Error While fetching data");
  }
}

function* onFetchMeals({ payload }) {
  try {
    const res = yield call(get, RESTAURANT_MEALS(payload.restaurantId));
    yield put(fetchMealsSuccess(payload.restaurantId, res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(
      fetchMealsFail(extractErrorMessage(e, "Error While fetching data")),
    );
    notifyError("Error While fetching data");
  }
}

function* onCreateMeal({ payload }) {
  try {
    const created = yield call(
      post,
      RESTAURANT_MEALS(payload.restaurantId),
      payload.data,
    );
    yield put(createMealSuccess(payload.restaurantId, created));
    notifySuccess("Created Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(created);
  } catch (e) {
    yield put(
      createMealFail(
        extractErrorMessage(
          e,
          "Something went wrong while Processing your request",
        ),
      ),
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onUpdateMeal({ payload }) {
  try {
    const updated = yield call(
      patch,
      RESTAURANT_MEAL_BY_ID(payload.restaurantId, payload.mealId),
      payload.data,
    );
    yield put(updateMealSuccess(payload.restaurantId, updated));
    notifySuccess("Updated Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(updated);
  } catch (e) {
    yield put(
      updateMealFail(
        extractErrorMessage(
          e,
          "Something went wrong while Processing your request",
        ),
      ),
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onDeleteMeal({ payload }) {
  try {
    yield call(
      del,
      RESTAURANT_MEAL_BY_ID(payload.restaurantId, payload.mealId),
    );
    yield put(deleteMealSuccess(payload.restaurantId, payload.mealId));
    notifySuccess("Deleted Successfully");
    if (typeof payload?.onDone === "function") payload.onDone();
  } catch (e) {
    yield put(
      deleteMealFail(
        extractErrorMessage(
          e,
          "Something went wrong while Processing your request",
        ),
      ),
    );
    notifyError("Something went wrong while Processing your request");
  }
}

export default function* RestaurantsSaga() {
  yield takeLatest(T.FETCH_RESTAURANTS, onFetchRestaurants);
  yield takeLatest(T.FETCH_RESTAURANT, onFetchRestaurant);
  yield takeLatest(T.CREATE_RESTAURANT, onCreateRestaurant);
  yield takeLatest(T.UPDATE_RESTAURANT, onUpdateRestaurant);
  yield takeLatest(T.DELETE_RESTAURANT, onDeleteRestaurant);

  yield takeLatest(T.FETCH_RESTAURANTS_LOOKUPS, onFetchLookups);

  yield takeLatest(T.FETCH_MEALS, onFetchMeals);
  yield takeLatest(T.CREATE_MEAL, onCreateMeal);
  yield takeLatest(T.UPDATE_MEAL, onUpdateMeal);
  yield takeLatest(T.DELETE_MEAL, onDeleteMeal);
}
