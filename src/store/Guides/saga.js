// path: src/store/Guides/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchGuidesSuccess,
  fetchGuidesFail,
  fetchGuideSuccess,
  fetchGuideFail,
  createGuideSuccess,
  createGuideFail,
  updateGuideSuccess,
  updateGuideFail,
  deleteGuideSuccess,
  deleteGuideFail,
  fetchGuideLanguagesSuccess,
  fetchGuideLanguagesFail,
} from "./actions";

import { get, post, put as putRequest, del } from "../../helpers/api_helper";
import {
  GUIDES,
  GUIDE_BY_ID,
  GUIDE_LANGUAGES,
} from "../../helpers/url_helper";
import { notifySuccess, notifyError } from "../../helpers/notify";

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

function normalizeGuidesListResponse(res, fallbackParams = {}) {
  if (Array.isArray(res)) {
    return {
      items: res,
      page: Number(fallbackParams?.page || 1),
      limit: Number(fallbackParams?.limit || res.length || 10),
      total: res.length,
      pages: 1,
    };
  }

  const items = res?.items || res?.data || res?.results || res?.docs || [];
  const normalizedItems = Array.isArray(items) ? items : [];

  return {
    items: normalizedItems,
    page: Number(res?.page || res?.currentPage || fallbackParams?.page || 1),
    limit: Number(res?.limit || res?.pageSize || fallbackParams?.limit || 10),
    total: Number(
      res?.total || res?.totalCount || res?.count || normalizedItems.length
    ),
    pages: Number(res?.pages || res?.totalPages || 1),
  };
}

function normalizeGuideLanguagesResponse(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.items)) return res.items;
  if (Array.isArray(res?.results)) return res.results;
  if (Array.isArray(res?.languages)) return res.languages;
  if (Array.isArray(res?.payload)) return res.payload;
  return [];
}

function* onFetchGuides({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, GUIDES, { params });
    const normalized = normalizeGuidesListResponse(res, params);
    yield put(fetchGuidesSuccess(normalized));
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load guides");
    yield put(fetchGuidesFail(message));
    notifyError(message);
  }
}

function* onFetchGuide({ payload }) {
  try {
    const id = payload?.id;
    const res = yield call(get, GUIDE_BY_ID(id));
    const guide = res?.data || res?.item || res;
    yield put(fetchGuideSuccess(guide));
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load guide details");
    yield put(fetchGuideFail(message));
    notifyError(message);
  }
}

function* onCreateGuide({ payload }) {
  try {
    const res = yield call(post, GUIDES, payload?.data || {});
    const created = res?.data || res?.item || res;
    yield put(createGuideSuccess(created));
    notifySuccess("Guide created successfully");
    if (typeof payload?.onDone === "function") {
      payload.onDone(created);
    }
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to create guide");
    yield put(createGuideFail(message));
    notifyError(message);
  }
}

function* onUpdateGuide({ payload }) {
  try {
    const res = yield call(
      putRequest,
      GUIDE_BY_ID(payload?.id),
      payload?.data || {}
    );
    const updated = res?.data || res?.item || res;
    yield put(updateGuideSuccess(updated));
    notifySuccess("Guide updated successfully");
    if (typeof payload?.onDone === "function") {
      payload.onDone(updated);
    }
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to update guide");
    yield put(updateGuideFail(message));
    notifyError(message);
  }
}

function* onDeleteGuide({ payload }) {
  try {
    yield call(del, GUIDE_BY_ID(payload?.id));
    yield put(deleteGuideSuccess(payload?.id));
    notifySuccess("Guide deleted successfully");
    if (typeof payload?.onDone === "function") {
      payload.onDone();
    }
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to delete guide");
    yield put(deleteGuideFail(message));
    notifyError(message);
  }
}

function* onFetchGuideLanguages() {
  try {
    const res = yield call(get, GUIDE_LANGUAGES);
    const items = normalizeGuideLanguagesResponse(res);
    yield put(fetchGuideLanguagesSuccess(items));
  } catch (error) {
    const message = extractErrorMessage(error, "Failed to load guide languages");
    yield put(fetchGuideLanguagesFail(message));
    notifyError(message);
  }
}

export default function* GuidesSaga() {
  yield all([
    takeLatest(T.FETCH_GUIDES, onFetchGuides),
    takeLatest(T.FETCH_GUIDE, onFetchGuide),
    takeLatest(T.CREATE_GUIDE, onCreateGuide),
    takeLatest(T.UPDATE_GUIDE, onUpdateGuide),
    takeLatest(T.DELETE_GUIDE, onDeleteGuide),
    takeLatest(T.FETCH_GUIDE_LANGUAGES, onFetchGuideLanguages),
  ]);
}