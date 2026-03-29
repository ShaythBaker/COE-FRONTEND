// path: src/store/QuotationAccumidation/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  loaded: false,
  saving: false,
  error: "",
  selected: null,
};

const QuotationAccumidation = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_QUOTATION_ACCUMIDATION:
      return {
        ...state,
        loading: true,
        loaded: false,
        error: "",
      };

    case T.CREATE_QUOTATION_ACCUMIDATION:
    case T.UPDATE_QUOTATION_ACCUMIDATION:
      return {
        ...state,
        saving: true,
        error: "",
      };

    case T.FETCH_QUOTATION_ACCUMIDATION_SUCCESS:
      return {
        ...state,
        loading: false,
        loaded: true,
        error: "",
        selected: action.payload || null,
      };

    case T.CREATE_QUOTATION_ACCUMIDATION_SUCCESS:
    case T.UPDATE_QUOTATION_ACCUMIDATION_SUCCESS:
      return {
        ...state,
        saving: false,
        error: "",
        selected: action.payload || null,
      };

    case T.FETCH_QUOTATION_ACCUMIDATION_FAIL:
      return {
        ...state,
        loading: false,
        loaded: true,
        error: action.payload || "Failed to load accumidation.",
      };

    case T.CREATE_QUOTATION_ACCUMIDATION_FAIL:
    case T.UPDATE_QUOTATION_ACCUMIDATION_FAIL:
      return {
        ...state,
        saving: false,
        error: action.payload || "Failed to save accumidation.",
      };

    case T.RESET_QUOTATION_ACCUMIDATION:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

export default QuotationAccumidation;