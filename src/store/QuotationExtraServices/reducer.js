// path: src/store/QuotationExtraServices/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  saving: false,
  error: "",
  availableItems: [],
  quotationItems: [],
};

const QuotationExtraServices = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_EXTRA_SERVICES:
    case T.FETCH_QUOTATION_EXTRA_SERVICES:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.SAVE_QUOTATION_EXTRA_SERVICES:
    case T.CREATE_QUOTATION_EXTRA_SERVICE:
    case T.UPDATE_QUOTATION_EXTRA_SERVICE:
    case T.DELETE_QUOTATION_EXTRA_SERVICE:
      return {
        ...state,
        saving: true,
        error: "",
      };

    case T.FETCH_EXTRA_SERVICES_SUCCESS:
      return {
        ...state,
        loading: false,
        availableItems: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.FETCH_QUOTATION_EXTRA_SERVICES_SUCCESS:
      return {
        ...state,
        loading: false,
        quotationItems: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.SAVE_QUOTATION_EXTRA_SERVICES_SUCCESS:
      return {
        ...state,
        saving: false,
        quotationItems: Array.isArray(action.payload) ? action.payload : state.quotationItems,
        error: "",
      };

    case T.CREATE_QUOTATION_EXTRA_SERVICE_SUCCESS: {
      const created = Array.isArray(action.payload) ? action.payload : [];
      return {
        ...state,
        saving: false,
        quotationItems: [...created, ...state.quotationItems],
        error: "",
      };
    }

    case T.UPDATE_QUOTATION_EXTRA_SERVICE_SUCCESS: {
      const updated = action.payload || null;
      return {
        ...state,
        saving: false,
        quotationItems: state.quotationItems.map((item) =>
          item?._id === updated?._id ? updated : item
        ),
        error: "",
      };
    }

    case T.DELETE_QUOTATION_EXTRA_SERVICE_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        saving: false,
        quotationItems: state.quotationItems.filter((item) => item?._id !== id),
        error: "",
      };
    }

    case T.FETCH_EXTRA_SERVICES_FAIL:
    case T.FETCH_QUOTATION_EXTRA_SERVICES_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error while fetching data.",
      };

    case T.SAVE_QUOTATION_EXTRA_SERVICES_FAIL:
    case T.CREATE_QUOTATION_EXTRA_SERVICE_FAIL:
    case T.UPDATE_QUOTATION_EXTRA_SERVICE_FAIL:
    case T.DELETE_QUOTATION_EXTRA_SERVICE_FAIL:
      return {
        ...state,
        saving: false,
        error: action.payload || "Error while saving data.",
      };

    case T.RESET_QUOTATION_EXTRA_SERVICES_STATE:
      return {
        ...initialState,
      };

    default:
      return state;
  }
};

export default QuotationExtraServices;