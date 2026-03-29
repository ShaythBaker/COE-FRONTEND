// path: src/store/QuotationAccumidation/actions.js
import * as T from "./actionTypes";

export const fetchQuotationAccumidation = quotationId => ({
  type: T.FETCH_QUOTATION_ACCUMIDATION,
  payload: { quotationId },
});

export const fetchQuotationAccumidationSuccess = item => ({
  type: T.FETCH_QUOTATION_ACCUMIDATION_SUCCESS,
  payload: item,
});

export const fetchQuotationAccumidationFail = error => ({
  type: T.FETCH_QUOTATION_ACCUMIDATION_FAIL,
  payload: error,
});

export const createQuotationAccumidation = (data, onDone) => ({
  type: T.CREATE_QUOTATION_ACCUMIDATION,
  payload: { data, onDone },
});

export const createQuotationAccumidationSuccess = item => ({
  type: T.CREATE_QUOTATION_ACCUMIDATION_SUCCESS,
  payload: item,
});

export const createQuotationAccumidationFail = error => ({
  type: T.CREATE_QUOTATION_ACCUMIDATION_FAIL,
  payload: error,
});

export const updateQuotationAccumidation = (id, data, onDone) => ({
  type: T.UPDATE_QUOTATION_ACCUMIDATION,
  payload: { id, data, onDone },
});

export const updateQuotationAccumidationSuccess = item => ({
  type: T.UPDATE_QUOTATION_ACCUMIDATION_SUCCESS,
  payload: item,
});

export const updateQuotationAccumidationFail = error => ({
  type: T.UPDATE_QUOTATION_ACCUMIDATION_FAIL,
  payload: error,
});

export const resetQuotationAccumidation = () => ({
  type: T.RESET_QUOTATION_ACCUMIDATION,
});