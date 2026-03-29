// path: src/store/QuotationExtraServices/saga.js
import { all, call, put, takeEvery, takeLatest } from "redux-saga/effects";
import { del, get, patch, post } from "../../helpers/api_helper";
import { notifyError, notifyInfo, notifySuccess } from "../../helpers/notify";
import * as T from "./actionTypes";
import {
  createQuotationExtraServiceFail,
  createQuotationExtraServiceSuccess,
  deleteQuotationExtraServiceFail,
  deleteQuotationExtraServiceSuccess,
  fetchExtraServicesFail,
  fetchExtraServicesSuccess,
  fetchQuotationExtraServices,
  fetchQuotationExtraServicesFail,
  fetchQuotationExtraServicesSuccess,
  saveQuotationExtraServicesFail,
  saveQuotationExtraServicesSuccess,
  updateQuotationExtraServiceFail,
  updateQuotationExtraServiceSuccess,
} from "./actions";

const EXTRA_SERVICES_ENDPOINT = "/extra_services";
const QUOTATION_EXTRA_SERVICES_ENDPOINT = "/quotation_extra_services";

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

const normalizeName = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

function buildServicePayload(quotationId, service) {
  return {
    QUOTATION_ID: quotationId,
    SERVICE_NAME: service?.SERVICE_NAME || "",
    SERVICE_DESCRIPTION: service?.SERVICE_DESCRIPTION || "",
    SERVICE_COST_PP: Number(service?.SERVICE_COST_PP || 0),
  };
}

function* onFetchExtraServices() {
  try {
    const response = yield call(get, EXTRA_SERVICES_ENDPOINT);
    yield put(
      fetchExtraServicesSuccess(Array.isArray(response) ? response : []),
    );
    notifyInfo("Extra services loaded successfully.");
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Error while fetching extra services.",
    );
    yield put(fetchExtraServicesFail(message));
    notifyError(message);
  }
}

function* onFetchQuotationExtraServices({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const response = yield call(
      get,
      `${QUOTATION_EXTRA_SERVICES_ENDPOINT}?QUOTATION_ID=${encodeURIComponent(quotationId || "")}`,
    );
    yield put(
      fetchQuotationExtraServicesSuccess(
        Array.isArray(response) ? response : [],
      ),
    );
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Error while fetching quotation extra services.",
    );
    yield put(fetchQuotationExtraServicesFail(message));
    notifyError(message);
  }
}

function* onCreateQuotationExtraService({ payload }) {
  try {
    const response = yield call(
      post,
      QUOTATION_EXTRA_SERVICES_ENDPOINT,
      payload?.data,
    );
    const created = Array.isArray(response)
      ? response
      : [response].filter(Boolean);
    yield put(createQuotationExtraServiceSuccess(created));
    notifySuccess("Extra service created successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(created);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Error while creating extra service.",
    );
    yield put(createQuotationExtraServiceFail(message));
    notifyError(message);
  }
}

function* onUpdateQuotationExtraService({ payload }) {
  try {
    const response = yield call(
      patch,
      `${QUOTATION_EXTRA_SERVICES_ENDPOINT}/${payload?.id}`,
      payload?.data,
    );
    yield put(updateQuotationExtraServiceSuccess(response));
    notifySuccess("Extra service updated successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone(response);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Error while updating extra service.",
    );
    yield put(updateQuotationExtraServiceFail(message));
    notifyError(message);
  }
}

function* onDeleteQuotationExtraService({ payload }) {
  try {
    yield call(del, `${QUOTATION_EXTRA_SERVICES_ENDPOINT}/${payload?.id}`);
    yield put(deleteQuotationExtraServiceSuccess(payload?.id));
    notifySuccess("Extra service removed successfully.");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Error while deleting extra service.",
    );
    yield put(deleteQuotationExtraServiceFail(message));
    notifyError(message);
  }
}

function* onSaveQuotationExtraServices({ payload }) {
  try {
    const quotationId = payload?.quotationId;
    const selectedServices = Array.isArray(payload?.services)
      ? payload.services
      : [];

    if (!quotationId) {
      throw new Error("Quotation id is required.");
    }

    const currentResponse = yield call(
      get,
      `${QUOTATION_EXTRA_SERVICES_ENDPOINT}?QUOTATION_ID=${encodeURIComponent(quotationId)}`,
    );
    const currentItems = Array.isArray(currentResponse) ? currentResponse : [];

    const currentByName = new Map(
      currentItems.map((item) => [normalizeName(item?.SERVICE_NAME), item]),
    );

    const selectedByName = new Map(
      selectedServices.map((item) => [normalizeName(item?.SERVICE_NAME), item]),
    );

    const toCreate = [];
    const toUpdate = [];
    const toDelete = [];

    selectedServices.forEach((service) => {
      const key = normalizeName(service?.SERVICE_NAME);
      const existing = currentByName.get(key);

      if (!existing) {
        toCreate.push(buildServicePayload(quotationId, service));
        return;
      }

      const nextDescription = service?.SERVICE_DESCRIPTION || "";
      const nextCost = Number(service?.SERVICE_COST_PP || 0);
      const currentDescription = existing?.SERVICE_DESCRIPTION || "";
      const currentCost = Number(existing?.SERVICE_COST_PP || 0);
      const isInactive = existing?.ACTIVE_STATUS === false;

      if (
        isInactive ||
        currentDescription !== nextDescription ||
        currentCost !== nextCost
      ) {
        toUpdate.push({
          id: existing?._id,
          data: {
            QUOTATION_ID: quotationId,
            SERVICE_NAME: service?.SERVICE_NAME || "",
            SERVICE_DESCRIPTION: nextDescription,
            SERVICE_COST_PP: nextCost,
            ACTIVE_STATUS: true,
          },
        });
      }
    });

    currentItems.forEach((item) => {
      const key = normalizeName(item?.SERVICE_NAME);
      if (!selectedByName.has(key)) {
        toDelete.push(item?._id);
      }
    });

    if (toCreate.length > 0) {
      const createdResponse = yield call(
        post,
        QUOTATION_EXTRA_SERVICES_ENDPOINT,
        toCreate,
      );
      yield put(
        createQuotationExtraServiceSuccess(
          Array.isArray(createdResponse)
            ? createdResponse
            : [createdResponse].filter(Boolean),
        ),
      );
    }

    if (toUpdate.length > 0) {
      for (const item of toUpdate) {
        const updated = yield call(
          patch,
          `${QUOTATION_EXTRA_SERVICES_ENDPOINT}/${item.id}`,
          item.data,
        );
        yield put(updateQuotationExtraServiceSuccess(updated));
      }
    }

    if (toDelete.length > 0) {
      for (const id of toDelete) {
        yield call(del, `${QUOTATION_EXTRA_SERVICES_ENDPOINT}/${id}`);
        yield put(deleteQuotationExtraServiceSuccess(id));
      }
    }

    const finalResponse = yield call(
      get,
      `${QUOTATION_EXTRA_SERVICES_ENDPOINT}?QUOTATION_ID=${encodeURIComponent(quotationId)}`,
    );
    const finalItems = Array.isArray(finalResponse) ? finalResponse : [];

    yield put(saveQuotationExtraServicesSuccess(finalItems));
    notifySuccess("Extra services saved successfully.");

    yield put(fetchQuotationExtraServices(quotationId));

    if (typeof payload?.onDone === "function") {
      payload.onDone(finalItems);
    }
  } catch (error) {
    const message = extractErrorMessage(
      error,
      "Error while saving quotation extra services.",
    );
    yield put(saveQuotationExtraServicesFail(message));
    notifyError(message);
  }
}

export default function* quotationExtraServicesSaga() {
  yield all([
    takeLatest(T.FETCH_EXTRA_SERVICES, onFetchExtraServices),
    takeLatest(T.FETCH_QUOTATION_EXTRA_SERVICES, onFetchQuotationExtraServices),
    takeEvery(T.CREATE_QUOTATION_EXTRA_SERVICE, onCreateQuotationExtraService),
    takeEvery(T.UPDATE_QUOTATION_EXTRA_SERVICE, onUpdateQuotationExtraService),
    takeEvery(T.DELETE_QUOTATION_EXTRA_SERVICE, onDeleteQuotationExtraService),
    takeLatest(T.SAVE_QUOTATION_EXTRA_SERVICES, onSaveQuotationExtraServices),
  ]);
}
