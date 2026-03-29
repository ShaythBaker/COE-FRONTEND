// path: src/store/QuotationExtraServices/actions.js
import * as T from "./actionTypes";

export const fetchExtraServices = () => ({
  type: T.FETCH_EXTRA_SERVICES,
});

export const fetchExtraServicesSuccess = (items) => ({
  type: T.FETCH_EXTRA_SERVICES_SUCCESS,
  payload: items,
});

export const fetchExtraServicesFail = (error) => ({
  type: T.FETCH_EXTRA_SERVICES_FAIL,
  payload: error,
});

export const fetchQuotationExtraServices = (quotationId) => ({
  type: T.FETCH_QUOTATION_EXTRA_SERVICES,
  payload: { quotationId },
});

export const fetchQuotationExtraServicesSuccess = (items) => ({
  type: T.FETCH_QUOTATION_EXTRA_SERVICES_SUCCESS,
  payload: items,
});

export const fetchQuotationExtraServicesFail = (error) => ({
  type: T.FETCH_QUOTATION_EXTRA_SERVICES_FAIL,
  payload: error,
});

export const saveQuotationExtraServices = (quotationId, services, onDone) => ({
  type: T.SAVE_QUOTATION_EXTRA_SERVICES,
  payload: { quotationId, services, onDone },
});

export const saveQuotationExtraServicesSuccess = (items) => ({
  type: T.SAVE_QUOTATION_EXTRA_SERVICES_SUCCESS,
  payload: items,
});

export const saveQuotationExtraServicesFail = (error) => ({
  type: T.SAVE_QUOTATION_EXTRA_SERVICES_FAIL,
  payload: error,
});

export const createQuotationExtraService = (data, onDone) => ({
  type: T.CREATE_QUOTATION_EXTRA_SERVICE,
  payload: { data, onDone },
});

export const createQuotationExtraServiceSuccess = (items) => ({
  type: T.CREATE_QUOTATION_EXTRA_SERVICE_SUCCESS,
  payload: items,
});

export const createQuotationExtraServiceFail = (error) => ({
  type: T.CREATE_QUOTATION_EXTRA_SERVICE_FAIL,
  payload: error,
});

export const updateQuotationExtraService = (id, data, onDone) => ({
  type: T.UPDATE_QUOTATION_EXTRA_SERVICE,
  payload: { id, data, onDone },
});

export const updateQuotationExtraServiceSuccess = (item) => ({
  type: T.UPDATE_QUOTATION_EXTRA_SERVICE_SUCCESS,
  payload: item,
});

export const updateQuotationExtraServiceFail = (error) => ({
  type: T.UPDATE_QUOTATION_EXTRA_SERVICE_FAIL,
  payload: error,
});

export const deleteQuotationExtraService = (id, onDone) => ({
  type: T.DELETE_QUOTATION_EXTRA_SERVICE,
  payload: { id, onDone },
});

export const deleteQuotationExtraServiceSuccess = (id) => ({
  type: T.DELETE_QUOTATION_EXTRA_SERVICE_SUCCESS,
  payload: { id },
});

export const deleteQuotationExtraServiceFail = (error) => ({
  type: T.DELETE_QUOTATION_EXTRA_SERVICE_FAIL,
  payload: error,
});

export const resetQuotationExtraServicesState = () => ({
  type: T.RESET_QUOTATION_EXTRA_SERVICES_STATE,
});