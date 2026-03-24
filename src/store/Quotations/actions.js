// path: src/store/Quotations/actions.js
import * as T from "./actionTypes";

export const fetchQuotations = (params = {}) => ({
  type: T.FETCH_QUOTATIONS,
  payload: { params },
});
export const fetchQuotationsSuccess = (items) => ({
  type: T.FETCH_QUOTATIONS_SUCCESS,
  payload: items,
});
export const fetchQuotationsFail = (error) => ({
  type: T.FETCH_QUOTATIONS_FAIL,
  payload: error,
});

export const fetchQuotation = (id) => ({
  type: T.FETCH_QUOTATION,
  payload: { id },
});
export const fetchQuotationSuccess = (item) => ({
  type: T.FETCH_QUOTATION_SUCCESS,
  payload: item,
});
export const fetchQuotationFail = (error) => ({
  type: T.FETCH_QUOTATION_FAIL,
  payload: error,
});

export const createQuotation = (data, onDone) => ({
  type: T.CREATE_QUOTATION,
  payload: { data, onDone },
});
export const createQuotationSuccess = (item) => ({
  type: T.CREATE_QUOTATION_SUCCESS,
  payload: item,
});
export const createQuotationFail = (error) => ({
  type: T.CREATE_QUOTATION_FAIL,
  payload: error,
});

export const updateQuotation = (id, data, onDone) => ({
  type: T.UPDATE_QUOTATION,
  payload: { id, data, onDone },
});
export const updateQuotationSuccess = (item) => ({
  type: T.UPDATE_QUOTATION_SUCCESS,
  payload: item,
});
export const updateQuotationFail = (error) => ({
  type: T.UPDATE_QUOTATION_FAIL,
  payload: error,
});

export const deleteQuotation = (id, onDone) => ({
  type: T.DELETE_QUOTATION,
  payload: { id, onDone },
});
export const deleteQuotationSuccess = (id) => ({
  type: T.DELETE_QUOTATION_SUCCESS,
  payload: { id },
});
export const deleteQuotationFail = (error) => ({
  type: T.DELETE_QUOTATION_FAIL,
  payload: error,
});

export const fetchQuotationsLookups = () => ({
  type: T.FETCH_QUOTATIONS_LOOKUPS,
});
export const fetchQuotationsLookupsSuccess = (lookups) => ({
  type: T.FETCH_QUOTATIONS_LOOKUPS_SUCCESS,
  payload: lookups,
});
export const fetchQuotationsLookupsFail = (error) => ({
  type: T.FETCH_QUOTATIONS_LOOKUPS_FAIL,
  payload: error,
});