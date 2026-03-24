// path: src/store/TransportationTypes/actions.js
import * as T from "./actionTypes";

export const fetchTransportationTypes = (params = {}) => ({
  type: T.FETCH_TRANSPORTATION_TYPES,
  payload: { params },
});

export const fetchTransportationTypesSuccess = (items) => ({
  type: T.FETCH_TRANSPORTATION_TYPES_SUCCESS,
  payload: items,
});

export const fetchTransportationTypesFail = (error) => ({
  type: T.FETCH_TRANSPORTATION_TYPES_FAIL,
  payload: error,
});

export const createTransportationType = (data, onDone) => ({
  type: T.CREATE_TRANSPORTATION_TYPE,
  payload: { data, onDone },
});

export const createTransportationTypeSuccess = (item) => ({
  type: T.CREATE_TRANSPORTATION_TYPE_SUCCESS,
  payload: item,
});

export const createTransportationTypeFail = (error) => ({
  type: T.CREATE_TRANSPORTATION_TYPE_FAIL,
  payload: error,
});

export const updateTransportationType = (id, data, onDone) => ({
  type: T.UPDATE_TRANSPORTATION_TYPE,
  payload: { id, data, onDone },
});

export const updateTransportationTypeSuccess = (item) => ({
  type: T.UPDATE_TRANSPORTATION_TYPE_SUCCESS,
  payload: item,
});

export const updateTransportationTypeFail = (error) => ({
  type: T.UPDATE_TRANSPORTATION_TYPE_FAIL,
  payload: error,
});

export const deleteTransportationType = (id, onDone) => ({
  type: T.DELETE_TRANSPORTATION_TYPE,
  payload: { id, onDone },
});

export const deleteTransportationTypeSuccess = (id) => ({
  type: T.DELETE_TRANSPORTATION_TYPE_SUCCESS,
  payload: { id },
});

export const deleteTransportationTypeFail = (error) => ({
  type: T.DELETE_TRANSPORTATION_TYPE_FAIL,
  payload: error,
});