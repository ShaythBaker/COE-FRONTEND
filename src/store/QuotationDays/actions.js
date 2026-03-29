// path: src/store/QuotationDays/actions.js
import * as T from "./actionTypes";

export const fetchQuotationDays = quotationId => ({
  type: T.FETCH_QUOTATION_DAYS,
  payload: { quotationId },
});
export const fetchQuotationDaysSuccess = items => ({
  type: T.FETCH_QUOTATION_DAYS_SUCCESS,
  payload: items,
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