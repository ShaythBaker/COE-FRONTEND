// path: src/store/ExtraServices/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
  selected: null,
};

const ExtraServices = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_EXTRA_SERVICES:
    case T.FETCH_EXTRA_SERVICE:
    case T.CREATE_EXTRA_SERVICE:
    case T.UPDATE_EXTRA_SERVICE:
    case T.DELETE_EXTRA_SERVICE:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.FETCH_EXTRA_SERVICES_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.FETCH_EXTRA_SERVICE_SUCCESS:
      return {
        ...state,
        loading: false,
        selected: action.payload || null,
        error: "",
      };

    case T.CREATE_EXTRA_SERVICE_SUCCESS:
      return {
        ...state,
        loading: false,
        items: [action.payload, ...state.items],
        error: "",
      };

    case T.UPDATE_EXTRA_SERVICE_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map((item) =>
          item?._id === updated?._id ? updated : item
        ),
        selected:
          state.selected?._id === updated?._id ? updated : state.selected,
        error: "",
      };
    }

    case T.DELETE_EXTRA_SERVICE_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter((item) => item?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
        error: "",
      };
    }

    case T.FETCH_EXTRA_SERVICES_FAIL:
    case T.FETCH_EXTRA_SERVICE_FAIL:
    case T.CREATE_EXTRA_SERVICE_FAIL:
    case T.UPDATE_EXTRA_SERVICE_FAIL:
    case T.DELETE_EXTRA_SERVICE_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default ExtraServices;