// path: src/store/companyUsers/reducer.js

import {
  FETCH_USERS,
  FETCH_USERS_SUCCESS,
  FETCH_USERS_FAIL,
  FETCH_USER,
  FETCH_USER_SUCCESS,
  FETCH_USER_FAIL,
  CREATE_USER,
  CREATE_USER_SUCCESS,
  CREATE_USER_FAIL,
  UPDATE_USER,
  UPDATE_USER_SUCCESS,
  UPDATE_USER_FAIL,
  DELETE_USER,
  DELETE_USER_SUCCESS,
  DELETE_USER_FAIL,
} from "./actionTypes";

const INIT_STATE = {
  items: [],
  selected: null,
  loading: false,
  error: "",
};

const companyUsers = (state = INIT_STATE, action) => {
  switch (action.type) {
    case FETCH_USERS:
    case FETCH_USER:
    case CREATE_USER:
    case UPDATE_USER:
    case DELETE_USER:
      return { ...state, loading: true, error: "" };

    case FETCH_USERS_SUCCESS:
      return { ...state, loading: false, items: Array.isArray(action.payload) ? action.payload : [] };

    case FETCH_USER_SUCCESS:
      return { ...state, loading: false, selected: action.payload || null };

    case CREATE_USER_SUCCESS:
      return {
        ...state,
        loading: false,
        items: [action.payload, ...state.items].filter(Boolean),
      };

    case UPDATE_USER_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map((u) => (u?._id === updated?._id ? updated : u)),
        selected: state.selected?._id === updated?._id ? updated : state.selected,
      };
    }

    case DELETE_USER_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter((u) => u?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
      };
    }

    case FETCH_USERS_FAIL:
    case FETCH_USER_FAIL:
    case CREATE_USER_FAIL:
    case UPDATE_USER_FAIL:
    case DELETE_USER_FAIL:
      return { ...state, loading: false, error: action.payload || "Request failed" };

    default:
      return state;
  }
};

export default companyUsers;