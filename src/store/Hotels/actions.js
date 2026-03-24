// path: src/store/Hotels/actions.js
import * as T from "./actionTypes";

export const fetchHotels = (params = {}) => ({ type: T.FETCH_HOTELS, payload: { params } });
export const fetchHotelsSuccess = (items) => ({ type: T.FETCH_HOTELS_SUCCESS, payload: items });
export const fetchHotelsFail = (error) => ({ type: T.FETCH_HOTELS_FAIL, payload: error });

export const fetchHotel = (id) => ({ type: T.FETCH_HOTEL, payload: { id } });
export const fetchHotelSuccess = (item) => ({ type: T.FETCH_HOTEL_SUCCESS, payload: item });
export const fetchHotelFail = (error) => ({ type: T.FETCH_HOTEL_FAIL, payload: error });

export const createHotel = (data, onDone) => ({ type: T.CREATE_HOTEL, payload: { data, onDone } });
export const createHotelSuccess = (item) => ({ type: T.CREATE_HOTEL_SUCCESS, payload: item });
export const createHotelFail = (error) => ({ type: T.CREATE_HOTEL_FAIL, payload: error });

export const updateHotel = (id, data, onDone) => ({
  type: T.UPDATE_HOTEL,
  payload: { id, data, onDone },
});
export const updateHotelSuccess = (item) => ({ type: T.UPDATE_HOTEL_SUCCESS, payload: item });
export const updateHotelFail = (error) => ({ type: T.UPDATE_HOTEL_FAIL, payload: error });

export const deleteHotel = (id, onDone) => ({ type: T.DELETE_HOTEL, payload: { id, onDone } });
export const deleteHotelSuccess = (id) => ({ type: T.DELETE_HOTEL_SUCCESS, payload: { id } });
export const deleteHotelFail = (error) => ({ type: T.DELETE_HOTEL_FAIL, payload: error });

// Lookups
export const fetchHotelsLookups = () => ({ type: T.FETCH_HOTELS_LOOKUPS });
export const fetchHotelsLookupsSuccess = (lookups) => ({
  type: T.FETCH_HOTELS_LOOKUPS_SUCCESS,
  payload: lookups,
});
export const fetchHotelsLookupsFail = (error) => ({ type: T.FETCH_HOTELS_LOOKUPS_FAIL, payload: error });

// Season Rates
export const fetchSeasonRates = (hotelId) => ({ type: T.FETCH_SEASON_RATES, payload: { hotelId } });
export const fetchSeasonRatesSuccess = (hotelId, items) => ({
  type: T.FETCH_SEASON_RATES_SUCCESS,
  payload: { hotelId, items },
});
export const fetchSeasonRatesFail = (error) => ({ type: T.FETCH_SEASON_RATES_FAIL, payload: error });

export const createSeasonRate = (hotelId, data, onDone) => ({
  type: T.CREATE_SEASON_RATE,
  payload: { hotelId, data, onDone },
});
export const createSeasonRateSuccess = (hotelId, item) => ({
  type: T.CREATE_SEASON_RATE_SUCCESS,
  payload: { hotelId, item },
});
export const createSeasonRateFail = (error) => ({ type: T.CREATE_SEASON_RATE_FAIL, payload: error });

export const updateSeasonRate = (hotelId, rateId, data, onDone) => ({
  type: T.UPDATE_SEASON_RATE,
  payload: { hotelId, rateId, data, onDone },
});
export const updateSeasonRateSuccess = (hotelId, item) => ({
  type: T.UPDATE_SEASON_RATE_SUCCESS,
  payload: { hotelId, item },
});
export const updateSeasonRateFail = (error) => ({ type: T.UPDATE_SEASON_RATE_FAIL, payload: error });

export const deleteSeasonRate = (hotelId, rateId, onDone) => ({
  type: T.DELETE_SEASON_RATE,
  payload: { hotelId, rateId, onDone },
});
export const deleteSeasonRateSuccess = (hotelId, rateId) => ({
  type: T.DELETE_SEASON_RATE_SUCCESS,
  payload: { hotelId, rateId },
});
export const deleteSeasonRateFail = (error) => ({ type: T.DELETE_SEASON_RATE_FAIL, payload: error });