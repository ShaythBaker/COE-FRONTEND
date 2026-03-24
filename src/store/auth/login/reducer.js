// path: src/store/auth/login/reducer.js
import {
  LOGIN_USER,
  LOGIN_SUCCESS,
  LOGOUT_USER,
  LOGOUT_USER_SUCCESS,
  API_ERROR,
} from "./actionTypes";

import { getAccessToken } from "../../../helpers/coe_token_storage";
import { decodeJwt } from "../../../helpers/coe_jwt";

const initFromStorage = () => {
  const token = getAccessToken();
  if (!token) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      companyId: null,
      roles: [],
    };
  }

  const decoded = decodeJwt(token);
  if (!decoded) {
    return {
      isAuthenticated: false,
      userId: null,
      email: null,
      companyId: null,
      roles: [],
    };
  }

  return {
    isAuthenticated: true,
    userId: decoded.sub || null,
    email: decoded.EMAIL || null,
    companyId: decoded.COMPANY_ID || null,
    roles: Array.isArray(decoded.ROLES) ? decoded.ROLES : [],
  };
};

const initialAuth = initFromStorage();

const initialState = {
  error: "",
  loading: false,
  ...initialAuth,
};

const login = (state = initialState, action) => {
  switch (action.type) {
    case LOGIN_USER:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case LOGIN_SUCCESS:
      // payload is { decoded } (we will dispatch that from saga)
      return {
        ...state,
        loading: false,
        error: "",
        isAuthenticated: true,
        userId: action.payload?.decoded?.sub || null,
        email: action.payload?.decoded?.EMAIL || null,
        companyId: action.payload?.decoded?.COMPANY_ID || null,
        roles: Array.isArray(action.payload?.decoded?.ROLES) ? action.payload.decoded.ROLES : [],
      };

    case LOGOUT_USER:
      return { ...state };

    case LOGOUT_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        isAuthenticated: false,
        userId: null,
        email: null,
        companyId: null,
        roles: [],
      };

    case API_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };

    default:
      return state;
  }
};

export default login;