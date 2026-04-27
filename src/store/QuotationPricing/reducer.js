// path: src/store/QuotationPricing/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  queueLoading: false,
  saving: false,
  error: "",
  items: [],
  selected: null,
  filterStatus: "SEND_FOR_PRICING",
};

const QuotationPricing = (state = initialState, action) => {
  switch (action.type) {
    case T.SET_QUOTATION_PRICING_FILTER:
      return {
        ...state,
        filterStatus: action.payload || "SEND_FOR_PRICING",
      };

    case T.FETCH_QUOTATION_PRICING_QUEUE:
      return {
        ...state,
        queueLoading: true,
        error: "",
      };

    case T.FETCH_QUOTATION_PRICING_QUEUE_SUCCESS:
      return {
        ...state,
        queueLoading: false,
        error: "",
        items: Array.isArray(action.payload) ? action.payload : [],
      };

    case T.FETCH_QUOTATION_PRICING_QUEUE_FAIL:
      return {
        ...state,
        queueLoading: false,
        error: action.payload || "Error",
      };

    case T.FETCH_QUOTATION_PRICING:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.FETCH_QUOTATION_PRICING_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        selected: action.payload || null,
      };

    case T.FETCH_QUOTATION_PRICING_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    case T.SEND_QUOTATION_FOR_PRICING:
    case T.CANCEL_QUOTATION_PRICING:
    case T.UPDATE_QUOTATION_PRICING_PROFIT:
    case T.APPROVE_QUOTATION_PRICING:
    case T.REJECT_QUOTATION_PRICING:
      return {
        ...state,
        saving: true,
        error: "",
      };

    case T.SEND_QUOTATION_FOR_PRICING_SUCCESS:
    case T.CANCEL_QUOTATION_PRICING_SUCCESS:
    case T.UPDATE_QUOTATION_PRICING_PROFIT_SUCCESS:
    case T.APPROVE_QUOTATION_PRICING_SUCCESS:
    case T.REJECT_QUOTATION_PRICING_SUCCESS: {
      const updated = action.payload || null;
      return {
        ...state,
        saving: false,
        error: "",
        selected: updated,
        items: state.items.map(item =>
          item?.QUOTATION_ID === updated?.QUOTATION_ID ||
          item?._id === updated?._id
            ? updated
            : item
        ),
      };
    }

    case T.SEND_QUOTATION_FOR_PRICING_FAIL:
    case T.CANCEL_QUOTATION_PRICING_FAIL:
    case T.UPDATE_QUOTATION_PRICING_PROFIT_FAIL:
    case T.APPROVE_QUOTATION_PRICING_FAIL:
    case T.REJECT_QUOTATION_PRICING_FAIL:
      return {
        ...state,
        saving: false,
        error: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default QuotationPricing;