// path: src/helpers/url_helper.jsx

//REGISTER
export const POST_FAKE_REGISTER = "/post-fake-register";

//LOGIN
export const POST_FAKE_LOGIN = "/post-fake-login";
export const POST_FAKE_JWT_LOGIN = "/post-jwt-login";
export const POST_FAKE_PASSWORD_FORGET = "/fake-forget-pwd";
export const POST_FAKE_JWT_PASSWORD_FORGET = "/jwt-forget-pwd";
export const SOCIAL_LOGIN = "/social-login";

// REAL BACKEND LOGIN (kept for compatibility with your saga)
export const POST_JWT_LOGIN = "/auth/login";

// REQUIRED COE AUTH ENDPOINT CONSTANTS
export const LOGIN = "/auth/login";
export const REFRESH = "/auth/refresh";
export const LOGOUT = "/auth/logout";

//PROFILE
export const POST_EDIT_JWT_PROFILE = "/post-jwt-profile";
export const POST_EDIT_PROFILE = "/post-fake-profile";

// ===========================
// Company Users (REAL API)
// ===========================
export const USERS = "/users";
export const USER_BY_ID = (id) => `/users/${id}`;

// =====================
// COE Modules List Items
// =====================
export const LIST_ITEMS = "/list-items";

// =====================
// Transportation Sizes
// =====================
export const TRANSPORTATION_SIZES = "/transportation-sizes";
export const TRANSPORTATION_SIZE_BY_ID = (id) => `/transportation-sizes/${id}`;

// =====================
// Transportation Types
// =====================
export const TRANSPORTATION_TYPES = "/transportation-types";
export const TRANSPORTATION_TYPE_BY_ID = (id) => `/transportation-types/${id}`;

// =====================
// Transportation Companies
// =====================
export const TRANSPORTATION_COMPANIES = "/transportation-companies";
export const TRANSPORTATION_COMPANY_BY_ID = (id) => `/transportation-companies/${id}`;
export const TRANSPORTATION_COMPANY_RATES = (id) => `/transportation-companies/${id}/rates`;
export const TRANSPORTATION_COMPANY_RATE_BY_ID = (companyId, rateId) =>
  `/transportation-companies/${companyId}/rates/${rateId}`;

// =====================
// COE Attachments
// =====================
export const ATTACHMENTS = "/attachments";
export const ATTACHMENT_BY_ID = (id) => `/attachments/${id}`;

// ✅ HOTELS
export const HOTELS = "/hotels";
export const HOTEL_BY_ID = (id) => `/hotels/${id}`;

// ✅ HOTEL SEASON RATES
export const HOTEL_SEASON_RATES = (hotelId) => `/hotels/${hotelId}/season-rates`;
export const HOTEL_SEASON_RATE_BY_ID = (hotelId, rateId) =>
  `/hotels/${hotelId}/season-rates/${rateId}`;

// RESTAURANTS
export const RESTAURANTS = "/restaurants";
export const RESTAURANT_BY_ID = (id) => `/restaurants/${id}`;
export const RESTAURANT_MEALS = (restaurantId) => `/restaurants/${restaurantId}/meals`;
export const RESTAURANT_MEAL_BY_ID = (restaurantId, mealId) =>
  `/restaurants/${restaurantId}/meals/${mealId}`;

// TRAVEL AGENTS
export const TRAVEL_AGENTS = "/agent";
export const TRAVEL_AGENT_BY_ID = (id) => `/agent/${id}`;

// ✅ PLACES
export const PLACES = "/place";
export const PLACE_BY_ID = (id) => `/place/${id}`;

// QUOTATIONS
export const QUOTATIONS = "/quotations";
export const QUOTATION_BY_ID = id => `/quotations/${id}`;
