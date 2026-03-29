// path: src/store/auth/login/saga.js
import { call, put, takeEvery, takeLatest } from "redux-saga/effects";

// Login Redux States
import { LOGIN_USER, LOGOUT_USER, SOCIAL_LOGIN } from "./actionTypes";
import { apiError, loginSuccess, logoutUserSuccess } from "./actions";

import { post } from "../../../helpers/api_helper";
import { LOGIN as LOGIN_URL, LOGOUT as LOGOUT_URL } from "../../../helpers/url_helper";

import { getFirebaseBackend } from "../../../helpers/firebase_helper";

import {
  setTokens,
  clearTokens,
  getRefreshToken,
} from "../../../helpers/coe_token_storage";
import { decodeJwt } from "../../../helpers/coe_jwt";
import { notifySuccess, notifyError } from "../../../helpers/notify";

const fireBaseBackend = getFirebaseBackend();

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

function setLegacyAuthUser(decoded, tokens) {
  const legacyUser = {
    id: decoded?.sub || null,
    email: decoded?.EMAIL || null,
    COMPANY_ID: decoded?.COMPANY_ID || null,
    ROLES: Array.isArray(decoded?.ROLES) ? decoded.ROLES : [],
    accessToken: tokens?.accessToken || null,
    refreshToken: tokens?.refreshToken || null,
  };

  localStorage.setItem("user", JSON.stringify(legacyUser));
  localStorage.setItem("authUser", JSON.stringify(legacyUser));
}

function clearLegacyAuthUser() {
  localStorage.removeItem("user");
  localStorage.removeItem("authUser");
}

function* loginUser({ payload: { user, history } }) {
  try {
    if (import.meta.env.VITE_APP_DEFAULTAUTH === "firebase") {
      const response = yield call(
        fireBaseBackend.loginUser,
        user.email,
        user.password
      );

      localStorage.setItem("authUser", JSON.stringify(response));
      localStorage.setItem("user", JSON.stringify(response));

      yield put(loginSuccess({ decoded: null, tokens: null, raw: response }));
      notifySuccess("Logged in successfully.");
      history("/dashboard");
      return;
    }

    if (import.meta.env.VITE_APP_DEFAULTAUTH === "jwt") {
      const tokens = yield call(post, LOGIN_URL, {
        email: user.email,
        password: user.password,
      });

      setTokens(tokens);

      const decoded = decodeJwt(tokens?.accessToken);

      if (!decoded) {
        clearTokens();
        clearLegacyAuthUser();
        throw new Error("Invalid access token received from server.");
      }

      setLegacyAuthUser(decoded, tokens);

      yield put(loginSuccess({ decoded, tokens }));
      notifySuccess("Logged in successfully.");
      history("/dashboard");
      return;
    }

    throw new Error("Unsupported auth mode. Set VITE_APP_DEFAULTAUTH=jwt");
  } catch (error) {
    const msg = extractErrorMessage(error, "Login failed");
    clearTokens();
    clearLegacyAuthUser();
    yield put(apiError(msg));
    notifyError(msg);
  }
}

function* logoutUser({ payload: { history } }) {
  try {
    const rt = getRefreshToken();

    if (rt) {
      try {
        yield call(post, LOGOUT_URL, { refreshToken: rt });
      } catch {
        // ignore logout API failure
      }
    }

    clearTokens();
    clearLegacyAuthUser();
    yield put(logoutUserSuccess());
    notifyInfo("Logged out successfully.");
    history("/login");
  } catch (error) {
    clearTokens();
    clearLegacyAuthUser();
    yield put(logoutUserSuccess());
    history("/login");
  }
}

function* socialLogin({ payload: { type, history } }) {
  try {
    if (import.meta.env.VITE_APP_DEFAULTAUTH === "firebase") {
      const response = yield call(fireBaseBackend.socialLoginUser, type);

      if (response) {
        localStorage.setItem("authUser", JSON.stringify(response));
        localStorage.setItem("user", JSON.stringify(response));
        yield put(loginSuccess({ decoded: null, tokens: null, raw: response }));
        history("/dashboard");
      } else {
        history("/login");
      }
    }
  } catch (error) {
    const msg = extractErrorMessage(error, "Social login failed");
    yield put(apiError(msg));
    notifyError(msg);
  }
}

function* authSaga() {
  yield takeEvery(LOGIN_USER, loginUser);
  yield takeLatest(SOCIAL_LOGIN, socialLogin);
  yield takeEvery(LOGOUT_USER, logoutUser);
}

export default authSaga;