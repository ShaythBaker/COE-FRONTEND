// path: src/store/listItems/saga.js
import { call, put, takeLatest } from "redux-saga/effects";

import {
  FETCH_LIST_ITEMS,
  CREATE_LIST_ITEM,
  UPDATE_LIST_ITEM,
  DELETE_LIST_ITEM,
} from "./actionTypes";

import {
  fetchListItemsSuccess,
  fetchListItemsFail,
  createListItemSuccess,
  createListItemFail,
  updateListItemSuccess,
  updateListItemFail,
  deleteListItemSuccess,
  deleteListItemFail,
} from "./actions";

import { getListItems, createListItem, updateListItem, deleteListItem } from "../../helpers/coe_backend_helper";
import { notifySuccess, notifyError } from "../../helpers/notify";

function extractErrorMessage(error, fallback = "Request failed") {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.response?.data?.msg ||
    (typeof error?.response?.data === "string" ? error.response.data : null) ||
    error?.message ||
    fallback
  );
}

function* onFetchListItems({ payload }) {
  try {
    const listKey = payload?.listKey;
    const res = yield call(getListItems, listKey);

    // Backend may return {data:[...]} or [...]. Normalize to array.
    const items = Array.isArray(res) ? res : Array.isArray(res?.data) ? res.data : [];
    yield put(fetchListItemsSuccess(items));
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to load list items");
    notifyError(`Error: ${msg}`);
    yield put(fetchListItemsFail(msg));
  }
}

function* onCreateListItem({ payload }) {
  try {
    yield call(createListItem, payload);
    notifySuccess("Item created");
    yield put(createListItemSuccess());
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to create item");
    notifyError(`Error: ${msg}`);
    yield put(createListItemFail(msg));
  }
}

function* onUpdateListItem({ payload }) {
  try {
    const id = payload?.id;
    const body = payload?.payload;
    yield call(updateListItem, id, body);
    notifySuccess("Item updated");
    yield put(updateListItemSuccess());
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to update item");
    notifyError(`Error: ${msg}`);
    yield put(updateListItemFail(msg));
  }
}

function* onDeleteListItem({ payload }) {
  try {
    const id = payload?.id;
    yield call(deleteListItem, id);
    notifySuccess("Item deleted");
    yield put(deleteListItemSuccess());
  } catch (error) {
    const msg = extractErrorMessage(error, "Failed to delete item");
    notifyError(`Error: ${msg}`);
    yield put(deleteListItemFail(msg));
  }
}

export default function* listItemsSaga() {
  yield takeLatest(FETCH_LIST_ITEMS, onFetchListItems);
  yield takeLatest(CREATE_LIST_ITEM, onCreateListItem);
  yield takeLatest(UPDATE_LIST_ITEM, onUpdateListItem);
  yield takeLatest(DELETE_LIST_ITEM, onDeleteListItem);
}