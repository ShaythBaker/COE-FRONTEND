import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  convertQuotationToReservationFileFail,
  convertQuotationToReservationFileSuccess,
  fetchReservationFileFail,
  fetchReservationFilesFail,
  fetchReservationFilesSuccess,
  fetchReservationFileSuccess,
} from "./actions";
import { get, post } from "../../helpers/api_helper";
import {
  RESERVATION_FILE_BY_ID,
  RESERVATION_FILES,
  RESERVATION_FILE_FROM_QUOTATION,
} from "../../helpers/url_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";

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

const unwrapId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
  }
  return "";
};

const normalizeReservationFile = item => {
  if (!item || typeof item !== "object") return item;

  return {
    ...item,
    _id: unwrapId(item?._id),
    COMPANY_ID: unwrapId(item?.COMPANY_ID),
    QUOTATION_ID: unwrapId(item?.QUOTATION_ID),
    QUOTATION: item?.QUOTATION
      ? {
          ...item.QUOTATION,
          _id: unwrapId(item.QUOTATION?._id),
          TRAVEL_AGENT_ID: unwrapId(item.QUOTATION?.TRAVEL_AGENT_ID),
          NATIONALITY: unwrapId(item.QUOTATION?.NATIONALITY),
          QUOTATION_TYPE: unwrapId(item.QUOTATION?.QUOTATION_TYPE),
        }
      : null,
  };
};

const extractRows = response => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.items)) return response.items;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.results)) return response.results;
  return [];
};

function* onFetchReservationFiles({ payload }) {
  try {
    const res = yield call(get, RESERVATION_FILES, {
      params: payload?.params || {},
    });
    yield put(
      fetchReservationFilesSuccess(
        extractRows(res).map(normalizeReservationFile)
      )
    );
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to fetch reservation files.");
    yield put(fetchReservationFilesFail(msg));
    notifyError(msg);
  }
}

function* onFetchReservationFile({ payload }) {
  try {
    const res = yield call(get, RESERVATION_FILE_BY_ID(payload.id));
    yield put(fetchReservationFileSuccess(normalizeReservationFile(res)));
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to fetch reservation file.");
    yield put(fetchReservationFileFail(msg));
    notifyError(msg);
  }
}

function* onConvertQuotationToReservationFile({ payload }) {
  try {
    const res = yield call(
      post,
      RESERVATION_FILE_FROM_QUOTATION(payload.quotationId),
      {}
    );
    const normalized = normalizeReservationFile(res);

    yield put(convertQuotationToReservationFileSuccess(normalized));
    notifySuccess("Quotation converted to reservation file.");

    if (typeof payload?.onDone === "function") {
      payload.onDone(normalized);
    }
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Failed to convert quotation to reservation file."
    );
    yield put(convertQuotationToReservationFileFail(msg));
    notifyError(msg);
  }
}

export default function* reservationFilesSaga() {
  yield all([
    takeLatest(T.FETCH_RESERVATION_FILES, onFetchReservationFiles),
    takeLatest(T.FETCH_RESERVATION_FILE, onFetchReservationFile),
    takeLatest(
      T.CONVERT_QUOTATION_TO_RESERVATION_FILE,
      onConvertQuotationToReservationFile
    ),
  ]);
}
