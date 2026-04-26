// path: src/store/QuotationPricing/actions.js
import * as T from "./actionTypes";

export const fetchQuotationPricingQueue = (status = "SEND_FOR_PRICING") => ({
  type: T.FETCH_QUOTATION_PRICING_QUEUE,
  payload: { status },
});

export const fetchQuotationPricingQueueSuccess = items => ({
  type: T.FETCH_QUOTATION_PRICING_QUEUE_SUCCESS,
  payload: items,
});

export const fetchQuotationPricingQueueFail = error => ({
  type: T.FETCH_QUOTATION_PRICING_QUEUE_FAIL,
  payload: error,
});

export const fetchQuotationPricing = quotationId => ({
  type: T.FETCH_QUOTATION_PRICING,
  payload: { quotationId },
});

export const fetchQuotationPricingSuccess = item => ({
  type: T.FETCH_QUOTATION_PRICING_SUCCESS,
  payload: item,
});

export const fetchQuotationPricingFail = error => ({
  type: T.FETCH_QUOTATION_PRICING_FAIL,
  payload: error,
});

export const setQuotationPricingFilter = status => ({
  type: T.SET_QUOTATION_PRICING_FILTER,
  payload: status,
});

export const sendQuotationForPricing = (
  quotationId,
  data,
  onDone = null
) => ({
  type: T.SEND_QUOTATION_FOR_PRICING,
  payload: { quotationId, data, onDone },
});

export const sendQuotationForPricingSuccess = item => ({
  type: T.SEND_QUOTATION_FOR_PRICING_SUCCESS,
  payload: item,
});

export const sendQuotationForPricingFail = error => ({
  type: T.SEND_QUOTATION_FOR_PRICING_FAIL,
  payload: error,
});

export const cancelQuotationPricing = (
  quotationId,
  data = {},
  onDone = null
) => ({
  type: T.CANCEL_QUOTATION_PRICING,
  payload: { quotationId, data, onDone },
});

export const cancelQuotationPricingSuccess = item => ({
  type: T.CANCEL_QUOTATION_PRICING_SUCCESS,
  payload: item,
});

export const cancelQuotationPricingFail = error => ({
  type: T.CANCEL_QUOTATION_PRICING_FAIL,
  payload: error,
});

export const updateQuotationPricingProfit = (
  quotationId,
  data,
  onDone = null
) => ({
  type: T.UPDATE_QUOTATION_PRICING_PROFIT,
  payload: { quotationId, data, onDone },
});

export const updateQuotationPricingProfitSuccess = item => ({
  type: T.UPDATE_QUOTATION_PRICING_PROFIT_SUCCESS,
  payload: item,
});

export const updateQuotationPricingProfitFail = error => ({
  type: T.UPDATE_QUOTATION_PRICING_PROFIT_FAIL,
  payload: error,
});

export const approveQuotationPricing = (quotationId, onDone = null) => ({
  type: T.APPROVE_QUOTATION_PRICING,
  payload: { quotationId, onDone },
});

export const approveQuotationPricingSuccess = item => ({
  type: T.APPROVE_QUOTATION_PRICING_SUCCESS,
  payload: item,
});

export const approveQuotationPricingFail = error => ({
  type: T.APPROVE_QUOTATION_PRICING_FAIL,
  payload: error,
});

export const rejectQuotationPricing = (
  quotationId,
  data,
  onDone = null
) => ({
  type: T.REJECT_QUOTATION_PRICING,
  payload: { quotationId, data, onDone },
});

export const rejectQuotationPricingSuccess = item => ({
  type: T.REJECT_QUOTATION_PRICING_SUCCESS,
  payload: item,
});

export const rejectQuotationPricingFail = error => ({
  type: T.REJECT_QUOTATION_PRICING_FAIL,
  payload: error,
});