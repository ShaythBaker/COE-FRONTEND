// path: src/store/QuotationDays/actions.js
import * as T from "./actionTypes";

export const fetchQuotationDays = quotationId => ({
  type: T.FETCH_QUOTATION_DAYS,
  payload: { quotationId },
});
export const fetchQuotationDaysSuccess = (quotationId, items) => ({
  type: T.FETCH_QUOTATION_DAYS_SUCCESS,
  payload: { quotationId, items },
});
export const fetchQuotationDaysFail = error => ({
  type: T.FETCH_QUOTATION_DAYS_FAIL,
  payload: error,
});

export const fetchQuotationDayLookups = () => ({
  type: T.FETCH_QUOTATION_DAY_LOOKUPS,
});
export const fetchQuotationDayLookupsSuccess = lookups => ({
  type: T.FETCH_QUOTATION_DAY_LOOKUPS_SUCCESS,
  payload: lookups,
});
export const fetchQuotationDayLookupsFail = error => ({
  type: T.FETCH_QUOTATION_DAY_LOOKUPS_FAIL,
  payload: error,
});

export const fetchRestaurantMeals = restaurantId => ({
  type: T.FETCH_RESTAURANT_MEALS,
  payload: { restaurantId },
});
export const fetchRestaurantMealsSuccess = (restaurantId, items) => ({
  type: T.FETCH_RESTAURANT_MEALS_SUCCESS,
  payload: { restaurantId, items },
});
export const fetchRestaurantMealsFail = error => ({
  type: T.FETCH_RESTAURANT_MEALS_FAIL,
  payload: error,
});

export const fetchRestaurantsByCity = cityId => ({
  type: T.FETCH_RESTAURANTS_BY_CITY,
  payload: { cityId },
});
export const fetchRestaurantsByCitySuccess = (cityId, items) => ({
  type: T.FETCH_RESTAURANTS_BY_CITY_SUCCESS,
  payload: { cityId, items },
});
export const fetchRestaurantsByCityFail = (cityId, error) => ({
  type: T.FETCH_RESTAURANTS_BY_CITY_FAIL,
  payload: { cityId, error },
});

export const fetchRouteEntranceFeePlaces = (cityId, nationalityId) => ({
  type: T.FETCH_ROUTE_ENTRANCE_FEE_PLACES,
  payload: { cityId, nationalityId },
});
export const fetchRouteEntranceFeePlacesSuccess = (cityId, nationalityId, items) => ({
  type: T.FETCH_ROUTE_ENTRANCE_FEE_PLACES_SUCCESS,
  payload: { cityId, nationalityId, items },
});
export const fetchRouteEntranceFeePlacesFail = (cityId, nationalityId, error) => ({
  type: T.FETCH_ROUTE_ENTRANCE_FEE_PLACES_FAIL,
  payload: { cityId, nationalityId, error },
});

export const fetchTransportationBestRate = (typeId, pax, transportationCompanyId) => ({
  type: T.FETCH_TRANSPORTATION_BEST_RATE,
  payload: { typeId, pax, transportationCompanyId },
});
export const fetchTransportationBestRateSuccess = (typeId, pax, transportationCompanyId, data) => ({
  type: T.FETCH_TRANSPORTATION_BEST_RATE_SUCCESS,
  payload: { typeId, pax, transportationCompanyId, data },
});
export const fetchTransportationBestRateFail = (typeId, pax, transportationCompanyId, error) => ({
  type: T.FETCH_TRANSPORTATION_BEST_RATE_FAIL,
  payload: { typeId, pax, transportationCompanyId, error },
});

export const createQuotationDay = (data, onDone) => ({
  type: T.CREATE_QUOTATION_DAY,
  payload: { data, onDone },
});
export const createQuotationDaySuccess = item => ({
  type: T.CREATE_QUOTATION_DAY_SUCCESS,
  payload: item,
});
export const createQuotationDayFail = error => ({
  type: T.CREATE_QUOTATION_DAY_FAIL,
  payload: error,
});

export const updateQuotationDay = (id, data, onDone) => ({
  type: T.UPDATE_QUOTATION_DAY,
  payload: { id, data, onDone },
});
export const updateQuotationDaySuccess = item => ({
  type: T.UPDATE_QUOTATION_DAY_SUCCESS,
  payload: item,
});
export const updateQuotationDayFail = error => ({
  type: T.UPDATE_QUOTATION_DAY_FAIL,
  payload: error,
});

export const resetQuotationDayState = () => ({
  type: T.RESET_QUOTATION_DAY_STATE,
});
