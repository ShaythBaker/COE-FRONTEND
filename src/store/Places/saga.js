// path: src/store/Places/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchPlacesSuccess,
  fetchPlacesFail,
  fetchPlaceSuccess,
  fetchPlaceFail,
  createPlaceSuccess,
  createPlaceFail,
  updatePlaceSuccess,
  updatePlaceFail,
  deletePlaceSuccess,
  deletePlaceFail,
  fetchPlacesLookupsSuccess,
  fetchPlacesLookupsFail,
} from "./actions";

import { get, post, del, patch } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper";
import { PLACES, PLACE_BY_ID } from "../../helpers/url_helper";
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

const normalizeArray = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
};

function* getFirstWorkingList(listKeys = []) {
  for (let i = 0; i < listKeys.length; i += 1) {
    try {
      const res = yield call(getListItems, listKeys[i]);
      const arr = normalizeArray(res);
      if (Array.isArray(arr)) {
        return arr;
      }
    } catch (e) {
      // try next
    }
  }
  return [];
}

function* onFetchPlaces({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, PLACES, { params });
    yield put(fetchPlacesSuccess(normalizeArray(res)));
    notifyInfo("Places loaded successfully");
  } catch (e) {
    const message = extractErrorMessage(e, "Error while fetching places");
    yield put(fetchPlacesFail(message));
    notifyError(message);
  }
}

function* onFetchPlace({ payload }) {
  try {
    const res = yield call(get, PLACE_BY_ID(payload.id));
    yield put(fetchPlaceSuccess(res || null));
    notifyInfo("Place details loaded successfully");
  } catch (e) {
    const message = extractErrorMessage(e, "Error while fetching place");
    yield put(fetchPlaceFail(message));
    notifyError(message);
  }
}

function* onCreatePlace({ payload }) {
  try {
    const created = yield call(post, PLACES, payload.data);
    yield put(createPlaceSuccess(created));
    notifySuccess("Place created successfully");
    if (typeof payload?.onDone === "function") payload.onDone(created);
  } catch (e) {
    const message = extractErrorMessage(e, "Something went wrong while creating place");
    yield put(createPlaceFail(message));
    notifyError(message);
  }
}

function* onUpdatePlace({ payload }) {
  try {
    const updated = yield call(patch, PLACE_BY_ID(payload.id), payload.data);
    yield put(updatePlaceSuccess(updated));
    notifySuccess("Place updated successfully");
    if (typeof payload?.onDone === "function") payload.onDone(updated);
  } catch (e) {
    const message = extractErrorMessage(e, "Something went wrong while updating place");
    yield put(updatePlaceFail(message));
    notifyError(message);
  }
}

function* onDeletePlace({ payload }) {
  try {
    yield call(del, PLACE_BY_ID(payload.id));
    yield put(deletePlaceSuccess(payload.id));
    notifySuccess("Place deleted successfully");
    if (typeof payload?.onDone === "function") payload.onDone();
  } catch (e) {
    const message = extractErrorMessage(e, "Something went wrong while deleting place");
    yield put(deletePlaceFail(message));
    notifyError(message);
  }
}

function* onFetchPlacesLookups() {
  try {
    const [cities, nationalities] = yield all([
      call(getFirstWorkingList, ["CITIES"]),
      call(getFirstWorkingList, ["NATIONALITIES", "NATIONALATIES", "COUNTRIES"]),
    ]);

    yield put(
      fetchPlacesLookupsSuccess({
        CITIES: cities,
        NATIONALITIES: nationalities,
      }),
    );
  } catch (e) {
    const message = extractErrorMessage(e, "Error while loading lookup data");
    yield put(fetchPlacesLookupsFail(message));
    notifyError(message);
  }
}

export default function* PlacesSaga() {
  yield takeLatest(T.FETCH_PLACES, onFetchPlaces);
  yield takeLatest(T.FETCH_PLACE, onFetchPlace);
  yield takeLatest(T.CREATE_PLACE, onCreatePlace);
  yield takeLatest(T.UPDATE_PLACE, onUpdatePlace);
  yield takeLatest(T.DELETE_PLACE, onDeletePlace);
  yield takeLatest(T.FETCH_PLACES_LOOKUPS, onFetchPlacesLookups);
}