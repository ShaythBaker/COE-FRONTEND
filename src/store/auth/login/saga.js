// path: src/store/auth/login/saga.js
import { call, put, takeEvery, takeLatest } from "redux-saga/effects";

// Login Redux States
import { LOGIN_USER, LOGOUT_USER, SOCIAL_LOGIN } from "./actionTypes";
import { apiError, loginSuccess, logoutUserSuccess } from "./actions";

import { post } from "../../../helpers/api_helper";
import { LOGIN as LOGIN_URL, LOGOUT as LOGOUT_URL } from "../../../helpers/url_helper";

import { getFirebaseBackend } from "../../../helpers/firebase_helper";

import { setTokens, clearTokens, getRefreshToken } from "../../../helpers/coe_token_storage";
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

function* loginUser({ payload: { user, history } }) {
  try {
    if (import.meta.env.VITE_APP_DEFAULTAUTH === "firebase") {
      const response = yield call(fireBaseBackend.loginUser, user.email, user.password);
      yield put(loginSuccess({ decoded: null, tokens: null, raw: response }));
      history("/dashboard");
      return;
    }

    if (import.meta.env.VITE_APP_DEFAULTAUTH === "jwt") {
      // Backend contract: {email,password} -> {accessToken,refreshToken}
      const tokens = yield call(post, LOGIN_URL, {
        email: user.email,
        password: user.password,
      });

      // Store tokens under required keys (rotation-safe)
      setTokens(tokens);

      const decoded = decodeJwt(tokens.accessToken);

      yield put(loginSuccess({ decoded, tokens }));
      notifySuccess("Logged in successfully.");
      history("/dashboard");
      return;
    }

    // If still using fake somewhere, keep error explicit
    throw new Error("Unsupported auth mode. Set VITE_APP_DEFAULTAUTH=jwt");
  } catch (error) {
    const msg = extractErrorMessage(error, "Login failed");
    yield put(apiError(msg));
  }
}

function* logoutUser({ payload: { history } }) {
  try {
    // Best effort logout call with refreshToken
    const rt = getRefreshToken();
    if (rt) {
      try {
        yield call(post, LOGOUT_URL, { refreshToken: rt });
      } catch {
        // ignore errors, still clear locally
      }
    }

    clearTokens();
    yield put(logoutUserSuccess());
    notifyError("Logged out.");
    history("/login");
  } catch (error) {
    clearTokens();
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
        yield put(loginSuccess({ decoded: null, tokens: null, raw: response }));
        history("/dashboard");
      } else {
        history("/login");
      }
    }
  } catch (error) {
    const msg = extractErrorMessage(error, "Social login failed");
    yield put(apiError(msg));
  }
}

function* authSaga() {
  yield takeEvery(LOGIN_USER, loginUser);
  yield takeLatest(SOCIAL_LOGIN, socialLogin);
  yield takeEvery(LOGOUT_USER, logoutUser);
}

export default authSaga;