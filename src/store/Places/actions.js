// path: src/store/Places/actions.js
import * as T from "./actionTypes";

export const fetchPlaces = (params = {}) => ({
  type: T.FETCH_PLACES,
  payload: { params },
});
export const fetchPlacesSuccess = (items) => ({
  type: T.FETCH_PLACES_SUCCESS,
  payload: items,
});
export const fetchPlacesFail = (error) => ({
  type: T.FETCH_PLACES_FAIL,
  payload: error,
});

export const fetchPlace = (id) => ({
  type: T.FETCH_PLACE,
  payload: { id },
});
export const fetchPlaceSuccess = (item) => ({
  type: T.FETCH_PLACE_SUCCESS,
  payload: item,
});
export const fetchPlaceFail = (error) => ({
  type: T.FETCH_PLACE_FAIL,
  payload: error,
});

export const createPlace = (data, onDone) => ({
  type: T.CREATE_PLACE,
  payload: { data, onDone },
});
export const createPlaceSuccess = (item) => ({
  type: T.CREATE_PLACE_SUCCESS,
  payload: item,
});
export const createPlaceFail = (error) => ({
  type: T.CREATE_PLACE_FAIL,
  payload: error,
});

export const updatePlace = (id, data, onDone) => ({
  type: T.UPDATE_PLACE,
  payload: { id, data, onDone },
});
export const updatePlaceSuccess = (item) => ({
  type: T.UPDATE_PLACE_SUCCESS,
  payload: item,
});
export const updatePlaceFail = (error) => ({
  type: T.UPDATE_PLACE_FAIL,
  payload: error,
});

export const deletePlace = (id, onDone) => ({
  type: T.DELETE_PLACE,
  payload: { id, onDone },
});
export const deletePlaceSuccess = (id) => ({
  type: T.DELETE_PLACE_SUCCESS,
  payload: { id },
});
export const deletePlaceFail = (error) => ({
  type: T.DELETE_PLACE_FAIL,
  payload: error,
});

export const fetchPlacesLookups = () => ({
  type: T.FETCH_PLACES_LOOKUPS,
});
export const fetchPlacesLookupsSuccess = (lookups) => ({
  type: T.FETCH_PLACES_LOOKUPS_SUCCESS,
  payload: lookups,
});
export const fetchPlacesLookupsFail = (error) => ({
  type: T.FETCH_PLACES_LOOKUPS_FAIL,
  payload: error,
});