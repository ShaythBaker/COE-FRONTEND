// path: src/store/QuotationDays/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
  loaded: false,
  loadedQuotationId: "",

  lookupsLoading: false,
  lookupsError: "",
  lookups: {
    transportationTypes: [],
    transportationCompanies: [],
    guideTypes: [],
    restaurants: [],
    cities: [],
  },

  restaurantMealsByRestaurantId: {},
  mealsLoadingByRestaurantId: {},

  restaurantsByCityId: {},
  restaurantsLoadingByCityId: {},
  restaurantsErrorByCityId: {},

  routeEntranceFeePlacesByKey: {},
  routeEntranceFeePlacesLoadingByKey: {},
  routeEntranceFeePlacesErrorByKey: {},

  transportationBestRateByKey: {},
  transportationBestRateLoadingByKey: {},
  transportationBestRateErrorByKey: {},
};

const routeKey = (cityId, nationalityId) => `${cityId || ""}__${nationalityId || ""}`;
const bestRateKey = (typeId, pax, transportationCompanyId) =>
  `${typeId || ""}__${pax || 0}__${transportationCompanyId || ""}`;

const QuotationDays = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_QUOTATION_DAYS:
    case T.CREATE_QUOTATION_DAY:
    case T.UPDATE_QUOTATION_DAY:
      return {
        ...state,
        loading: true,
        error: "",
        ...(action.type === T.FETCH_QUOTATION_DAYS &&
        action.payload?.quotationId !== state.loadedQuotationId
          ? { items: [], loaded: false, loadedQuotationId: action.payload?.quotationId || "" }
          : {}),
      };

    case T.FETCH_QUOTATION_DAYS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        loaded: true,
        loadedQuotationId: action.payload?.quotationId || "",
        items: Array.isArray(action.payload?.items) ? action.payload.items : [],
      };

    case T.CREATE_QUOTATION_DAY_SUCCESS:
    case T.UPDATE_QUOTATION_DAY_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
      };

    case T.FETCH_QUOTATION_DAYS_FAIL:
    case T.CREATE_QUOTATION_DAY_FAIL:
    case T.UPDATE_QUOTATION_DAY_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Request failed",
      };

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

    case T.FETCH_RESTAURANTS_BY_CITY:
      return {
        ...state,
        restaurantsLoadingByCityId: {
          ...state.restaurantsLoadingByCityId,
          [action.payload?.cityId]: true,
        },
        restaurantsErrorByCityId: {
          ...state.restaurantsErrorByCityId,
          [action.payload?.cityId]: "",
        },
      };

    case T.FETCH_RESTAURANTS_BY_CITY_SUCCESS:
      return {
        ...state,
        restaurantsByCityId: {
          ...state.restaurantsByCityId,
          [action.payload.cityId]: Array.isArray(action.payload.items) ? action.payload.items : [],
        },
        restaurantsLoadingByCityId: {
          ...state.restaurantsLoadingByCityId,
          [action.payload.cityId]: false,
        },
        restaurantsErrorByCityId: {
          ...state.restaurantsErrorByCityId,
          [action.payload.cityId]: "",
        },
      };

    case T.FETCH_RESTAURANTS_BY_CITY_FAIL:
      return {
        ...state,
        restaurantsLoadingByCityId: {
          ...state.restaurantsLoadingByCityId,
          [action.payload.cityId]: false,
        },
        restaurantsErrorByCityId: {
          ...state.restaurantsErrorByCityId,
          [action.payload.cityId]: action.payload.error || "Request failed",
        },
      };

    case T.FETCH_ROUTE_ENTRANCE_FEE_PLACES: {
      const key = routeKey(action.payload?.cityId, action.payload?.nationalityId);
      return {
        ...state,
        routeEntranceFeePlacesLoadingByKey: {
          ...state.routeEntranceFeePlacesLoadingByKey,
          [key]: true,
        },
        routeEntranceFeePlacesErrorByKey: {
          ...state.routeEntranceFeePlacesErrorByKey,
          [key]: "",
        },
      };
    }

    case T.FETCH_ROUTE_ENTRANCE_FEE_PLACES_SUCCESS: {
      const key = routeKey(action.payload?.cityId, action.payload?.nationalityId);
      return {
        ...state,
        routeEntranceFeePlacesByKey: {
          ...state.routeEntranceFeePlacesByKey,
          [key]: Array.isArray(action.payload.items) ? action.payload.items : [],
        },
        routeEntranceFeePlacesLoadingByKey: {
          ...state.routeEntranceFeePlacesLoadingByKey,
          [key]: false,
        },
        routeEntranceFeePlacesErrorByKey: {
          ...state.routeEntranceFeePlacesErrorByKey,
          [key]: "",
        },
      };
    }

    case T.FETCH_ROUTE_ENTRANCE_FEE_PLACES_FAIL: {
      const key = routeKey(action.payload?.cityId, action.payload?.nationalityId);
      return {
        ...state,
        routeEntranceFeePlacesLoadingByKey: {
          ...state.routeEntranceFeePlacesLoadingByKey,
          [key]: false,
        },
        routeEntranceFeePlacesErrorByKey: {
          ...state.routeEntranceFeePlacesErrorByKey,
          [key]: action.payload?.error || "Request failed",
        },
      };
    }

    case T.FETCH_TRANSPORTATION_BEST_RATE: {
      const key = bestRateKey(
        action.payload?.typeId,
        action.payload?.pax,
        action.payload?.transportationCompanyId
      );
      return {
        ...state,
        transportationBestRateLoadingByKey: {
          ...state.transportationBestRateLoadingByKey,
          [key]: true,
        },
        transportationBestRateErrorByKey: {
          ...state.transportationBestRateErrorByKey,
          [key]: "",
        },
      };
    }

    case T.FETCH_TRANSPORTATION_BEST_RATE_SUCCESS: {
      const key = bestRateKey(
        action.payload?.typeId,
        action.payload?.pax,
        action.payload?.transportationCompanyId
      );
      return {
        ...state,
        transportationBestRateByKey: {
          ...state.transportationBestRateByKey,
          [key]: action.payload?.data || null,
        },
        transportationBestRateLoadingByKey: {
          ...state.transportationBestRateLoadingByKey,
          [key]: false,
        },
        transportationBestRateErrorByKey: {
          ...state.transportationBestRateErrorByKey,
          [key]: "",
        },
      };
    }

    case T.FETCH_TRANSPORTATION_BEST_RATE_FAIL: {
      const key = bestRateKey(
        action.payload?.typeId,
        action.payload?.pax,
        action.payload?.transportationCompanyId
      );
      return {
        ...state,
        transportationBestRateByKey: {
          ...state.transportationBestRateByKey,
          [key]: null,
        },
        transportationBestRateLoadingByKey: {
          ...state.transportationBestRateLoadingByKey,
          [key]: false,
        },
        transportationBestRateErrorByKey: {
          ...state.transportationBestRateErrorByKey,
          [key]: action.payload?.error || "Request failed",
        },
      };
    }

    case T.RESET_QUOTATION_DAY_STATE:
      return { ...initialState };

    default:
      return state;
  }
};

export default QuotationDays;
