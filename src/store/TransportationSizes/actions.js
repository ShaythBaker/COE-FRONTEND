// path: src/store/TransportationSizes/actions.js
import * as T from "./actionTypes";

export const fetchTransportationSizes = (params = {}) => ({
  type: T.FETCH_TRANSPORTATION_SIZES,
  payload: { params },
});

export const fetchTransportationSizesSuccess = (items) => ({
  type: T.FETCH_TRANSPORTATION_SIZES_SUCCESS,
  payload: items,
});

export const fetchTransportationSizesFail = (error) => ({
  type: T.FETCH_TRANSPORTATION_SIZES_FAIL,
  payload: error,
});

export const createTransportationSize = (data, onDone) => ({
  type: T.CREATE_TRANSPORTATION_SIZE,
  payload: { data, onDone },
});

export const createTransportationSizeSuccess = (item) => ({
  type: T.CREATE_TRANSPORTATION_SIZE_SUCCESS,
  payload: item,
});

export const createTransportationSizeFail = (error) => ({
  type: T.CREATE_TRANSPORTATION_SIZE_FAIL,
  payload: error,
});

export const updateTransportationSize = (id, data, onDone) => ({
  type: T.UPDATE_TRANSPORTATION_SIZE,
  payload: { id, data, onDone },
});

export const updateTransportationSizeSuccess = (item) => ({
  type: T.UPDATE_TRANSPORTATION_SIZE_SUCCESS,
  payload: item,
});

export const updateTransportationSizeFail = (error) => ({
  type: T.UPDATE_TRANSPORTATION_SIZE_FAIL,
  payload: error,
});

export const deleteTransportationSize = (id, onDone) => ({
  type: T.DELETE_TRANSPORTATION_SIZE,
  payload: { id, onDone },
});

export const deleteTransportationSizeSuccess = (id) => ({
  type: T.DELETE_TRANSPORTATION_SIZE_SUCCESS,
  payload: { id },
});

export const deleteTransportationSizeFail = (error) => ({
  type: T.DELETE_TRANSPORTATION_SIZE_FAIL,
  payload: error,
});
