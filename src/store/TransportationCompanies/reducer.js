// path: src/store/TransportationCompanies/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
  selected: null,

  lookupsLoading: false,
  lookupsError: "",
  lookups: {
    transportationTypes: [],
    transportationSizes: [],
  },

  ratesLoading: false,
  ratesError: "",
};

const TransportationCompanies = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_TRANSPORTATION_COMPANIES:
    case T.FETCH_TRANSPORTATION_COMPANY:
    case T.CREATE_TRANSPORTATION_COMPANY:
    case T.UPDATE_TRANSPORTATION_COMPANY:
    case T.DELETE_TRANSPORTATION_COMPANY:
      return { ...state, loading: true, error: "" };

    case T.FETCH_TRANSPORTATION_COMPANIES_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: Array.isArray(action.payload) ? action.payload : [],
      };

    case T.FETCH_TRANSPORTATION_COMPANY_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        selected: action.payload || null,
      };

    case T.CREATE_TRANSPORTATION_COMPANY_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: [action.payload, ...state.items],
      };

    case T.UPDATE_TRANSPORTATION_COMPANY_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        error: "",
        items: state.items.map((x) => (x?._id === updated?._id ? updated : x)),
        selected: state.selected?._id === updated?._id ? updated : state.selected,
      };
    }

    case T.DELETE_TRANSPORTATION_COMPANY_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        error: "",
        items: state.items.filter((x) => x?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
      };
    }

    case T.FETCH_TRANSPORTATION_COMPANIES_FAIL:
    case T.FETCH_TRANSPORTATION_COMPANY_FAIL:
    case T.CREATE_TRANSPORTATION_COMPANY_FAIL:
    case T.UPDATE_TRANSPORTATION_COMPANY_FAIL:
    case T.DELETE_TRANSPORTATION_COMPANY_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    case T.FETCH_TRANSPORTATION_LOOKUPS:
      return { ...state, lookupsLoading: true, lookupsError: "" };

    case T.FETCH_TRANSPORTATION_LOOKUPS_SUCCESS:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: "",
        lookups: {
          ...state.lookups,
          ...(action.payload || {}),
        },
      };

    case T.FETCH_TRANSPORTATION_LOOKUPS_FAIL:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: action.payload || "Error",
      };

    case T.UPSERT_TRANSPORTATION_RATES:
    case T.DELETE_TRANSPORTATION_RATE:
      return {
        ...state,
        ratesLoading: true,
        ratesError: "",
      };

    case T.UPSERT_TRANSPORTATION_RATES_SUCCESS:
      return {
        ...state,
        ratesLoading: false,
        ratesError: "",
        selected: action.payload || state.selected,
        items: state.items.map((x) => (x?._id === action.payload?._id ? action.payload : x)),
      };

    case T.DELETE_TRANSPORTATION_RATE_SUCCESS: {
      const { companyId, rateId } = action.payload || {};
      if (!state.selected || state.selected?._id !== companyId) {
        return { ...state, ratesLoading: false, ratesError: "" };
      }

      const currentRates = Array.isArray(state.selected?.RATES)
        ? state.selected.RATES
        : Array.isArray(state.selected?.rates)
        ? state.selected.rates
        : [];

      const nextSelected = {
        ...state.selected,
        RATES: currentRates.filter((x) => x?._id !== rateId),
        rates: currentRates.filter((x) => x?._id !== rateId),
      };

      return {
        ...state,
        ratesLoading: false,
        ratesError: "",
        selected: nextSelected,
        items: state.items.map((x) => (x?._id === companyId ? nextSelected : x)),
      };
    }

    case T.UPSERT_TRANSPORTATION_RATES_FAIL:
    case T.DELETE_TRANSPORTATION_RATE_FAIL:
      return {
        ...state,
        ratesLoading: false,
        ratesError: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default TransportationCompanies;