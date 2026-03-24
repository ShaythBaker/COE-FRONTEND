// path: src/store/companyUsers/saga.js

import { call, put, takeEvery, takeLatest } from "redux-saga/effects";
import { get, post, del, patch } from "../../helpers/api_helper"; // PATCH added
import { notifySuccess, notifyError } from "../../helpers/notify";
import { USERS, USER_BY_ID } from "../../helpers/url_helper";

import {
  FETCH_USERS,
  FETCH_USER,
  CREATE_USER,
  UPDATE_USER,
  DELETE_USER,
} from "./actionTypes";

import {
  fetchUsersSuccess,
  fetchUsersFail,
  fetchUserSuccess,
  fetchUserFail,
  createUserSuccess,
  createUserFail,
  updateUserSuccess,
  updateUserFail,
  deleteUserSuccess,
  deleteUserFail,
} from "./actions";

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

function* onFetchUsers() {
  try {
    const res = yield call(get, USERS);
    yield put(fetchUsersSuccess(res));
    notifySuccess("Data Fetched");
  } catch (error) {
    const msg = extractErrorMessage(error, "Error While fetching data");
    yield put(fetchUsersFail(msg));
    notifyError("Error While fetching data");
  }
}

function* onFetchUser({ payload: { id } }) {
  try {
    const res = yield call(get, USER_BY_ID(id));
    yield put(fetchUserSuccess(res));
  } catch (error) {
    const msg = extractErrorMessage(error, "Error While fetching data");
    yield put(fetchUserFail(msg));
    notifyError("Error While fetching data");
  }
}

function* onCreateUser({ payload: { data } }) {
  try {
    const res = yield call(post, USERS, data);
    yield put(createUserSuccess(res));
    notifySuccess("Created Successfully");
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Something went wrong while Processing your request",
    );
    yield put(createUserFail(msg));
    notifyError("Something went wrong while Processing your request");
  }
}

function* onUpdateUser({ payload: { id, data } }) {
  try {
    // REQUIRED: PATCH /api/users/:id
    const res = yield call(patch, USER_BY_ID(id), data);
    yield put(updateUserSuccess(res));
    notifySuccess("Updated Successfully");
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Something went wrong while Processing your request",
    );
    yield put(updateUserFail(msg));
    notifyError("Something went wrong while Processing your request");
  }
}

function* onDeleteUser({ payload: { id } }) {
  try {
    yield call(del, USER_BY_ID(id));
    yield put(deleteUserSuccess(id));
    notifySuccess("Deleted Successfully");
  } catch (error) {
    const msg = extractErrorMessage(
      error,
      "Something went wrong while Processing your request",
    );
    yield put(deleteUserFail(msg));
    notifyError("Something went wrong while Processing your request");
  }
}

export default function* companyUsersSaga() {
  yield takeEvery(FETCH_USERS, onFetchUsers);
  yield takeLatest(FETCH_USER, onFetchUser);
  yield takeLatest(CREATE_USER, onCreateUser);
  yield takeLatest(UPDATE_USER, onUpdateUser);
  yield takeLatest(DELETE_USER, onDeleteUser);
}
