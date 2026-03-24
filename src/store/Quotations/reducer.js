// path: src/store/Quotations/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
  selected: null,

  lookupsLoading: false,
  lookupsError: "",
  lookups: {
    travelAgents: [],
    transportationCompanies: [],
  },
};

const Quotations = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_QUOTATIONS:
    case T.FETCH_QUOTATION:
    case T.CREATE_QUOTATION:
    case T.UPDATE_QUOTATION:
    case T.DELETE_QUOTATION:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.FETCH_QUOTATIONS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: Array.isArray(action.payload) ? action.payload : [],
      };

    case T.FETCH_QUOTATION_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        selected: action.payload || null,
      };

    case T.CREATE_QUOTATION_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: [action.payload, ...state.items],
      };

    case T.UPDATE_QUOTATION_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        error: "",
        items: state.items.map((x) => (x?._id === updated?._id ? updated : x)),
        selected: state.selected?._id === updated?._id ? updated : state.selected,
      };
    }

    case T.DELETE_QUOTATION_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        error: "",
        items: state.items.filter((x) => x?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
      };
    }

    case T.FETCH_QUOTATIONS_FAIL:
    case T.FETCH_QUOTATION_FAIL:
    case T.CREATE_QUOTATION_FAIL:
    case T.UPDATE_QUOTATION_FAIL:
    case T.DELETE_QUOTATION_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    case T.FETCH_QUOTATIONS_LOOKUPS:
      return {
        ...state,
        lookupsLoading: true,
        lookupsError: "",
      };

    case T.FETCH_QUOTATIONS_LOOKUPS_SUCCESS:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: "",
        lookups: {
          ...state.lookups,
          ...(action.payload || {}),
        },
      };

    case T.FETCH_QUOTATIONS_LOOKUPS_FAIL:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default Quotations;