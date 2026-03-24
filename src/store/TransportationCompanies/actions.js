// path: src/store/TransportationCompanies/actions.js
import * as T from "./actionTypes";

export const fetchTransportationCompanies = (params = {}) => ({
  type: T.FETCH_TRANSPORTATION_COMPANIES,
  payload: { params },
});
export const fetchTransportationCompaniesSuccess = (items) => ({
  type: T.FETCH_TRANSPORTATION_COMPANIES_SUCCESS,
  payload: items,
});
export const fetchTransportationCompaniesFail = (error) => ({
  type: T.FETCH_TRANSPORTATION_COMPANIES_FAIL,
  payload: error,
});

export const fetchTransportationCompany = (id) => ({
  type: T.FETCH_TRANSPORTATION_COMPANY,
  payload: { id },
});
export const fetchTransportationCompanySuccess = (item) => ({
  type: T.FETCH_TRANSPORTATION_COMPANY_SUCCESS,
  payload: item,
});
export const fetchTransportationCompanyFail = (error) => ({
  type: T.FETCH_TRANSPORTATION_COMPANY_FAIL,
  payload: error,
});

export const createTransportationCompany = (data, onDone) => ({
  type: T.CREATE_TRANSPORTATION_COMPANY,
  payload: { data, onDone },
});
export const createTransportationCompanySuccess = (item) => ({
  type: T.CREATE_TRANSPORTATION_COMPANY_SUCCESS,
  payload: item,
});
export const createTransportationCompanyFail = (error) => ({
  type: T.CREATE_TRANSPORTATION_COMPANY_FAIL,
  payload: error,
});

export const updateTransportationCompany = (id, data, onDone) => ({
  type: T.UPDATE_TRANSPORTATION_COMPANY,
  payload: { id, data, onDone },
});
export const updateTransportationCompanySuccess = (item) => ({
  type: T.UPDATE_TRANSPORTATION_COMPANY_SUCCESS,
  payload: item,
});
export const updateTransportationCompanyFail = (error) => ({
  type: T.UPDATE_TRANSPORTATION_COMPANY_FAIL,
  payload: error,
});

export const deleteTransportationCompany = (id, onDone) => ({
  type: T.DELETE_TRANSPORTATION_COMPANY,
  payload: { id, onDone },
});
export const deleteTransportationCompanySuccess = (id) => ({
  type: T.DELETE_TRANSPORTATION_COMPANY_SUCCESS,
  payload: { id },
});
export const deleteTransportationCompanyFail = (error) => ({
  type: T.DELETE_TRANSPORTATION_COMPANY_FAIL,
  payload: error,
});

export const fetchTransportationLookups = () => ({
  type: T.FETCH_TRANSPORTATION_LOOKUPS,
});
export const fetchTransportationLookupsSuccess = (lookups) => ({
  type: T.FETCH_TRANSPORTATION_LOOKUPS_SUCCESS,
  payload: lookups,
});
export const fetchTransportationLookupsFail = (error) => ({
  type: T.FETCH_TRANSPORTATION_LOOKUPS_FAIL,
  payload: error,
});

export const upsertTransportationRates = (companyId, data, onDone) => ({
  type: T.UPSERT_TRANSPORTATION_RATES,
  payload: { companyId, data, onDone },
});
export const upsertTransportationRatesSuccess = (item) => ({
  type: T.UPSERT_TRANSPORTATION_RATES_SUCCESS,
  payload: item,
});
export const upsertTransportationRatesFail = (error) => ({
  type: T.UPSERT_TRANSPORTATION_RATES_FAIL,
  payload: error,
});

export const deleteTransportationRate = (companyId, rateId, onDone) => ({
  type: T.DELETE_TRANSPORTATION_RATE,
  payload: { companyId, rateId, onDone },
});
export const deleteTransportationRateSuccess = (companyId, rateId) => ({
  type: T.DELETE_TRANSPORTATION_RATE_SUCCESS,
  payload: { companyId, rateId },
});
export const deleteTransportationRateFail = (error) => ({
  type: T.DELETE_TRANSPORTATION_RATE_FAIL,
  payload: error,
});
