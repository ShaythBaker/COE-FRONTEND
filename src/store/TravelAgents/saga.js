// path: src/store/TravelAgents/saga.js
import { all, call, put, takeLatest } from "redux-saga/effects";
import * as T from "./actionTypes";
import {
  fetchTravelAgentsSuccess,
  fetchTravelAgentsFail,
  fetchTravelAgentSuccess,
  fetchTravelAgentFail,
  createTravelAgentSuccess,
  createTravelAgentFail,
  updateTravelAgentSuccess,
  updateTravelAgentFail,
  deleteTravelAgentSuccess,
  deleteTravelAgentFail,
  fetchTravelAgentsLookupsSuccess,
  fetchTravelAgentsLookupsFail,
} from "./actions";

import { get, post, patch, del } from "../../helpers/api_helper";
import { getListItems } from "../../helpers/coe_backend_helper";
import { TRAVEL_AGENTS, TRAVEL_AGENT_BY_ID } from "../../helpers/url_helper";
import { notifySuccess, notifyError, notifyInfo } from "../../helpers/notify";

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

function* onFetchTravelAgents({ payload }) {
  try {
    const params = payload?.params || {};
    const res = yield call(get, TRAVEL_AGENTS, { params });
    yield put(fetchTravelAgentsSuccess(res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(fetchTravelAgentsFail(extractErrorMessage(e, "Error While fetching data")));
    notifyError("Error While fetching data");
  }
}

function* onFetchTravelAgent({ payload }) {
  try {
    const res = yield call(get, TRAVEL_AGENT_BY_ID(payload.id));
    yield put(fetchTravelAgentSuccess(res));
    notifyInfo("Data Fetched");
  } catch (e) {
    yield put(fetchTravelAgentFail(extractErrorMessage(e, "Error While fetching data")));
    notifyError("Error While fetching data");
  }
}

function* onCreateTravelAgent({ payload }) {
  try {
    const created = yield call(post, TRAVEL_AGENTS, payload.data);
    yield put(createTravelAgentSuccess(created));
    notifySuccess("Created Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(created);
  } catch (e) {
    yield put(
      createTravelAgentFail(
        extractErrorMessage(e, "Something went wrong while Processing your request")
      )
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onUpdateTravelAgent({ payload }) {
  try {
    const updated = yield call(patch, TRAVEL_AGENT_BY_ID(payload.id), payload.data);
    yield put(updateTravelAgentSuccess(updated));
    notifySuccess("Updated Successfully");
    if (typeof payload?.onDone === "function") payload.onDone(updated);
  } catch (e) {
    yield put(
      updateTravelAgentFail(
        extractErrorMessage(e, "Something went wrong while Processing your request")
      )
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onDeleteTravelAgent({ payload }) {
  try {
    yield call(del, TRAVEL_AGENT_BY_ID(payload.id));
    yield put(deleteTravelAgentSuccess(payload.id));
    notifySuccess("Deleted Successfully");
    if (typeof payload?.onDone === "function") payload.onDone();
  } catch (e) {
    yield put(
      deleteTravelAgentFail(
        extractErrorMessage(e, "Something went wrong while Processing your request")
      )
    );
    notifyError("Something went wrong while Processing your request");
  }
}

function* onFetchLookups() {
  try {
    const [countries] = yield all([call(getListItems, "COUNTRIES")]);
    yield put(
      fetchTravelAgentsLookupsSuccess({
        COUNTRIES: Array.isArray(countries) ? countries : [],
      })
    );
  } catch (e) {
    yield put(
      fetchTravelAgentsLookupsFail(extractErrorMessage(e, "Error While fetching data"))
    );
    notifyError("Error While fetching data");
  }
}

export default function* TravelAgentsSaga() {
  yield takeLatest(T.FETCH_TRAVEL_AGENTS, onFetchTravelAgents);
  yield takeLatest(T.FETCH_TRAVEL_AGENT, onFetchTravelAgent);
  yield takeLatest(T.CREATE_TRAVEL_AGENT, onCreateTravelAgent);
  yield takeLatest(T.UPDATE_TRAVEL_AGENT, onUpdateTravelAgent);
  yield takeLatest(T.DELETE_TRAVEL_AGENT, onDeleteTravelAgent);
  yield takeLatest(T.FETCH_TRAVEL_AGENTS_LOOKUPS, onFetchLookups);
}