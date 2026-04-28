// path: src/store/QuotationPricing/saga.js
import { all, call, put, select, takeLatest } from "redux-saga/effects";
import { get, post } from "../../helpers/api_helper";
import {
  QUOTATION_PRICING,
  QUOTATION_PRICING_BY_QUOTATION_ID,
  QUOTATION_SEND_FOR_PRICING,
  QUOTATION_PRICING_PROFIT,
  QUOTATION_PRICING_DECISION,
} from "../../helpers/url_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import {
  fetchQuotationPricingQueueSuccess,
  fetchQuotationPricingQueueFail,
  fetchQuotationPricingSuccess,
  fetchQuotationPricingFail,
  sendQuotationForPricingSuccess,
  sendQuotationForPricingFail,
  cancelQuotationPricingSuccess,
  cancelQuotationPricingFail,
  updateQuotationPricingProfitSuccess,
  updateQuotationPricingProfitFail,
  approveQuotationPricingSuccess,
  approveQuotationPricingFail,
  rejectQuotationPricingSuccess,
  rejectQuotationPricingFail,
} from "./actions";
import { fetchQuotation, fetchQuotations } from "../Quotations/actions";
import * as T from "./actionTypes";

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

const QUOTATION_PRICING_CANCEL = quotationId =>
  `/quotation-pricing/quotation/${quotationId}/cancel`;

function normalizePricing(item) {
  if (!item || typeof item !== "object") return item;

  return {
    ...item,
    _id: item?._id || "",
    QUOTATION_ID: item?.QUOTATION_ID || item?.SNAPSHOT?.QUOTATION?._id || "",
    REFERANCE_NUMBER:
      item?.SNAPSHOT?.QUOTATION?.REFERANCE_NUMBER ||
      item?.REFERANCE_NUMBER ||
      "-",
    NUMBER_OF_PAX:
      item?.SNAPSHOT?.QUOTATION?.NUMBER_OF_PAX ||
      item?.NUMBER_OF_PAX ||
      0,
  };
}

const selectPricingSelected = state => state?.QuotationPricing?.selected || null;

function* onFetchQueue({ payload }) {
  try {
    const status = payload?.status || "SEND_FOR_PRICING";
    const rows = yield call(get, QUOTATION_PRICING, {
      params: { status },
    });
    const normalized = Array.isArray(rows) ? rows.map(normalizePricing) : [];
    yield put(fetchQuotationPricingQueueSuccess(normalized));
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Failed to load quotation pricing queue."
    );
    yield put(fetchQuotationPricingQueueFail(msg));
    notifyError(msg);
  }
}

function* onFetchPricing({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const item = yield call(get, QUOTATION_PRICING_BY_QUOTATION_ID(quotationId));
    yield put(fetchQuotationPricingSuccess(normalizePricing(item)));
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Failed to load quotation pricing details."
    );
    yield put(fetchQuotationPricingFail(msg));
    notifyError(msg);
  }
}

function* onSendForPricing({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const data = payload?.data || {};
    const item = yield call(
      post,
      QUOTATION_SEND_FOR_PRICING(quotationId),
      data
    );

    const normalized = normalizePricing(item);
    yield put(sendQuotationForPricingSuccess(normalized));
    yield put(fetchQuotation(quotationId));
    yield put(fetchQuotations());
    notifySuccess("Quotation sent for pricing successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Failed to send quotation for pricing."
    );
    yield put(sendQuotationForPricingFail(msg));
    notifyError(msg);
  }
}

function* onCancelPricing({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const data = payload?.data || {};
    const item = yield call(
      post,
      QUOTATION_PRICING_CANCEL(quotationId),
      data
    );

    const normalized = normalizePricing(item);
    yield put(cancelQuotationPricingSuccess(normalized));
    yield put(fetchQuotation(quotationId));
    yield put(fetchQuotations());
    notifySuccess("Quotation cancelled successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to cancel quotation.");
    yield put(cancelQuotationPricingFail(msg));
    notifyError(msg);
  }
}

function* onUpdateProfit({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const data = payload?.data || {};
    const item = yield call(post, QUOTATION_PRICING_PROFIT(quotationId), data);

    const normalized = normalizePricing(item);
    yield put(updateQuotationPricingProfitSuccess(normalized));
    yield put(fetchQuotation(quotationId));
    yield put(fetchQuotations());
    notifySuccess("Quotation pricing profit updated successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Failed to update quotation pricing profit."
    );
    yield put(updateQuotationPricingProfitFail(msg));
    notifyError(msg);
  }
}

function* onApprove({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const current = yield select(selectPricingSelected);

    const profitType = String(current?.PROFIT_TYPE || "").toUpperCase().trim();
    const profitValue = Number(current?.PROFIT_VALUE ?? 0);

    if (!["PERCENT", "FIXED"].includes(profitType) || profitValue <= 0) {
      const msg = "Set a valid profit before approving this quotation.";
      yield put(approveQuotationPricingFail(msg));
      notifyError(msg);
      return;
    }

    const item = yield call(post, QUOTATION_PRICING_DECISION(quotationId), {
      DECISION: "APPROVE",
    });

    const normalized = normalizePricing(item);
    yield put(approveQuotationPricingSuccess(normalized));
    yield put(fetchQuotation(quotationId));
    yield put(fetchQuotations());
    notifySuccess("Quotation approved successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Failed to approve quotation pricing."
    );
    yield put(approveQuotationPricingFail(msg));
    notifyError(msg);
  }
}

function* onReject({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const data = payload?.data || {};
    const item = yield call(post, QUOTATION_PRICING_DECISION(quotationId), {
      DECISION: "REJECT",
      REJECT_REASON: data?.REJECT_REASON || "",
    });

    const normalized = normalizePricing(item);
    yield put(rejectQuotationPricingSuccess(normalized));
    yield put(fetchQuotation(quotationId));
    yield put(fetchQuotations());
    notifySuccess("Quotation rejected successfully.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Failed to reject quotation pricing."
    );
    yield put(rejectQuotationPricingFail(msg));
    notifyError(msg);
  }
}

export default function* quotationPricingSaga() {
  yield all([
    takeLatest(T.FETCH_QUOTATION_PRICING_QUEUE, onFetchQueue),
    takeLatest(T.FETCH_QUOTATION_PRICING, onFetchPricing),
    takeLatest(T.SEND_QUOTATION_FOR_PRICING, onSendForPricing),
    takeLatest(T.CANCEL_QUOTATION_PRICING, onCancelPricing),
    takeLatest(T.UPDATE_QUOTATION_PRICING_PROFIT, onUpdateProfit),
    takeLatest(T.APPROVE_QUOTATION_PRICING, onApprove),
    takeLatest(T.REJECT_QUOTATION_PRICING, onReject),
  ]);
}
