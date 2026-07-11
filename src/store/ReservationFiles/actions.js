import * as T from "./actionTypes";

export const fetchReservationFiles = (params = {}) => ({
  type: T.FETCH_RESERVATION_FILES,
  payload: { params },
});

export const fetchReservationFilesSuccess = items => ({
  type: T.FETCH_RESERVATION_FILES_SUCCESS,
  payload: items,
});

export const fetchReservationFilesFail = error => ({
  type: T.FETCH_RESERVATION_FILES_FAIL,
  payload: error,
});

export const fetchReservationFile = id => ({
  type: T.FETCH_RESERVATION_FILE,
  payload: { id },
});

export const fetchReservationFileSuccess = item => ({
  type: T.FETCH_RESERVATION_FILE_SUCCESS,
  payload: item,
});

export const fetchReservationFileFail = error => ({
  type: T.FETCH_RESERVATION_FILE_FAIL,
  payload: error,
});

export const convertQuotationToReservationFile = (
  quotationId,
  optionsOrOnDone,
  onDone
) => ({
  type: T.CONVERT_QUOTATION_TO_RESERVATION_FILE,
  payload: {
    quotationId,
    options:
      typeof optionsOrOnDone === "function" ? {} : optionsOrOnDone || {},
    onDone: typeof optionsOrOnDone === "function" ? optionsOrOnDone : onDone,
  },
});

export const convertQuotationToReservationFileSuccess = item => ({
  type: T.CONVERT_QUOTATION_TO_RESERVATION_FILE_SUCCESS,
  payload: item,
});

export const convertQuotationToReservationFileFail = error => ({
  type: T.CONVERT_QUOTATION_TO_RESERVATION_FILE_FAIL,
  payload: error,
});
