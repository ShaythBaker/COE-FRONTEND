// path: src/store/ExtraServices/actions.js
import * as T from "./actionTypes";

export const fetchExtraServices = (params = {}) => ({
  type: T.FETCH_EXTRA_SERVICES,
  payload: { params },
});
export const fetchExtraServicesSuccess = (items) => ({
  type: T.FETCH_EXTRA_SERVICES_SUCCESS,
  payload: items,
});
export const fetchExtraServicesFail = (error) => ({
  type: T.FETCH_EXTRA_SERVICES_FAIL,
  payload: error,
});

export const fetchExtraService = (id) => ({
  type: T.FETCH_EXTRA_SERVICE,
  payload: { id },
});
export const fetchExtraServiceSuccess = (item) => ({
  type: T.FETCH_EXTRA_SERVICE_SUCCESS,
  payload: item,
});
export const fetchExtraServiceFail = (error) => ({
  type: T.FETCH_EXTRA_SERVICE_FAIL,
  payload: error,
});

export const createExtraService = (data, onDone) => ({
  type: T.CREATE_EXTRA_SERVICE,
  payload: { data, onDone },
});
export const createExtraServiceSuccess = (item) => ({
  type: T.CREATE_EXTRA_SERVICE_SUCCESS,
  payload: item,
});
export const createExtraServiceFail = (error) => ({
  type: T.CREATE_EXTRA_SERVICE_FAIL,
  payload: error,
});

export const updateExtraService = (id, data, onDone) => ({
  type: T.UPDATE_EXTRA_SERVICE,
  payload: { id, data, onDone },
});
export const updateExtraServiceSuccess = (item) => ({
  type: T.UPDATE_EXTRA_SERVICE_SUCCESS,
  payload: item,
});
export const updateExtraServiceFail = (error) => ({
  type: T.UPDATE_EXTRA_SERVICE_FAIL,
  payload: error,
});

export const deleteExtraService = (id, onDone) => ({
  type: T.DELETE_EXTRA_SERVICE,
  payload: { id, onDone },
});
export const deleteExtraServiceSuccess = (id) => ({
  type: T.DELETE_EXTRA_SERVICE_SUCCESS,
  payload: { id },
});
export const deleteExtraServiceFail = (error) => ({
  type: T.DELETE_EXTRA_SERVICE_FAIL,
  payload: error,
});