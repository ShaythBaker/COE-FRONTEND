// path: src/store/Hotels/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
  selected: null,

  lookupsLoading: false,
  lookupsError: "",
  lookups: {
    CITIES: [],
    HOTELSTARS: [],
    HOTELCHAINS: [],
    HOTELSEASONS: [],
  },

  seasonRatesLoading: false,
  seasonRatesError: "",
  seasonRatesByHotel: {}, // { [hotelId]: [] }
};

const Hotels = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_HOTELS:
    case T.FETCH_HOTEL:
    case T.CREATE_HOTEL:
    case T.UPDATE_HOTEL:
    case T.DELETE_HOTEL:
      return { ...state, loading: true, error: "" };

    case T.FETCH_HOTELS_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.FETCH_HOTEL_SUCCESS:
      return { ...state, loading: false, selected: action.payload || null, error: "" };

    case T.CREATE_HOTEL_SUCCESS:
      return { ...state, loading: false, items: [action.payload, ...state.items], error: "" };

    case T.UPDATE_HOTEL_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map((x) => (x?._id === updated?._id ? updated : x)),
        selected: state.selected?._id === updated?._id ? updated : state.selected,
        error: "",
      };
    }

    case T.DELETE_HOTEL_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter((x) => x?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
        error: "",
      };
    }

    case T.FETCH_HOTELS_FAIL:
    case T.FETCH_HOTEL_FAIL:
    case T.CREATE_HOTEL_FAIL:
    case T.UPDATE_HOTEL_FAIL:
    case T.DELETE_HOTEL_FAIL:
      return { ...state, loading: false, error: action.payload || "Error" };

    // Lookups
    case T.FETCH_HOTELS_LOOKUPS:
      return { ...state, lookupsLoading: true, lookupsError: "" };
    case T.FETCH_HOTELS_LOOKUPS_SUCCESS:
      return { ...state, lookupsLoading: false, lookups: { ...state.lookups, ...(action.payload || {}) } };
    case T.FETCH_HOTELS_LOOKUPS_FAIL:
      return { ...state, lookupsLoading: false, lookupsError: action.payload || "Error" };

    // Season rates
    case T.FETCH_SEASON_RATES:
    case T.CREATE_SEASON_RATE:
    case T.UPDATE_SEASON_RATE:
    case T.DELETE_SEASON_RATE:
      return { ...state, seasonRatesLoading: true, seasonRatesError: "" };

    case T.FETCH_SEASON_RATES_SUCCESS: {
      const { hotelId, items } = action.payload || {};
      return {
        ...state,
        seasonRatesLoading: false,
        seasonRatesByHotel: { ...state.seasonRatesByHotel, [hotelId]: Array.isArray(items) ? items : [] },
      };
    }

    case T.CREATE_SEASON_RATE_SUCCESS: {
      const { hotelId, item } = action.payload || {};
      const curr = state.seasonRatesByHotel[hotelId] || [];
      return {
        ...state,
        seasonRatesLoading: false,
        seasonRatesByHotel: { ...state.seasonRatesByHotel, [hotelId]: [item, ...curr] },
      };
    }

    case T.UPDATE_SEASON_RATE_SUCCESS: {
      const { hotelId, item } = action.payload || {};
      const curr = state.seasonRatesByHotel[hotelId] || [];
      return {
        ...state,
        seasonRatesLoading: false,
        seasonRatesByHotel: {
          ...state.seasonRatesByHotel,
          [hotelId]: curr.map((x) => (x?._id === item?._id ? item : x)),
        },
      };
    }

    case T.DELETE_SEASON_RATE_SUCCESS: {
      const { hotelId, rateId } = action.payload || {};
      const curr = state.seasonRatesByHotel[hotelId] || [];
      return {
        ...state,
        seasonRatesLoading: false,
        seasonRatesByHotel: {
          ...state.seasonRatesByHotel,
          [hotelId]: curr.filter((x) => x?._id !== rateId),
        },
      };
    }

    case T.FETCH_SEASON_RATES_FAIL:
    case T.CREATE_SEASON_RATE_FAIL:
    case T.UPDATE_SEASON_RATE_FAIL:
    case T.DELETE_SEASON_RATE_FAIL:
      return { ...state, seasonRatesLoading: false, seasonRatesError: action.payload || "Error" };

    default:
      return state;
  }
};

export default Hotels;