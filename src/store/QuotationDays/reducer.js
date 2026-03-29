// path: src/store/QuotationDays/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],

  lookupsLoading: false,
  lookupsError: "",
  lookups: {
    transportationTypes: [],
    guideTypes: [],
    restaurants: [],
    places: [],
  },

  restaurantMealsByRestaurantId: {},
  mealsLoadingByRestaurantId: {},
};

const upsertDay = (items, updated) => {
  const idx = items.findIndex(x => x?._id === updated?._id);
  if (idx === -1) {
    return [...items, updated].sort((a, b) => (a?.DAY_ORDER || 0) - (b?.DAY_ORDER || 0));
  }
  return items.map(x => (x?._id === updated?._id ? updated : x));
};

const QuotationDays = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_QUOTATION_DAYS:
    case T.CREATE_QUOTATION_DAY:
    case T.UPDATE_QUOTATION_DAY:
      return { ...state, loading: true, error: "" };

    case T.FETCH_QUOTATION_DAYS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: Array.isArray(action.payload) ? action.payload : [],
      };

    case T.CREATE_QUOTATION_DAY_SUCCESS:
    case T.UPDATE_QUOTATION_DAY_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: upsertDay(state.items, action.payload),
      };

    case T.FETCH_QUOTATION_DAYS_FAIL:
    case T.CREATE_QUOTATION_DAY_FAIL:
    case T.UPDATE_QUOTATION_DAY_FAIL:
      return { ...state, loading: false, error: action.payload || "Request failed" };

    case T.FETCH_QUOTATION_DAY_LOOKUPS:
      return { ...state, lookupsLoading: true, lookupsError: "" };

    case T.FETCH_QUOTATION_DAY_LOOKUPS_SUCCESS:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: "",
        lookups: action.payload || initialState.lookups,
      };

    case T.FETCH_QUOTATION_DAY_LOOKUPS_FAIL:
      return { ...state, lookupsLoading: false, lookupsError: action.payload || "Request failed" };

    case T.FETCH_RESTAURANT_MEALS:
      return {
        ...state,
        mealsLoadingByRestaurantId: {
          ...state.mealsLoadingByRestaurantId,
          [action.payload?.restaurantId]: true,
        },
      };

    case T.FETCH_RESTAURANT_MEALS_SUCCESS:
      return {
        ...state,
        restaurantMealsByRestaurantId: {
          ...state.restaurantMealsByRestaurantId,
          [action.payload.restaurantId]: Array.isArray(action.payload.items)
            ? action.payload.items
            : [],
        },
        mealsLoadingByRestaurantId: {
          ...state.mealsLoadingByRestaurantId,
          [action.payload.restaurantId]: false,
        },
      };

    case T.FETCH_RESTAURANT_MEALS_FAIL:
      return {
        ...state,
      };

    case T.RESET_QUOTATION_DAY_STATE:
      return { ...initialState };

    default:
      return state;
  }
};

export default QuotationDays;