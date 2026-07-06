// path: src/helpers/url_helper.jsx

// REGISTER
export const POST_FAKE_REGISTER = "/post-fake-register";

// LOGIN
export const POST_FAKE_LOGIN = "/post-fake-login";
export const POST_FAKE_JWT_LOGIN = "/post-jwt-login";
export const POST_FAKE_PASSWORD_FORGET = "/fake-forget-pwd";
export const POST_FAKE_JWT_PASSWORD_FORGET = "/jwt-forget-pwd";
export const SOCIAL_LOGIN = "/social-login";

// REAL BACKEND LOGIN
export const POST_JWT_LOGIN = "/auth/login";

// REQUIRED COE AUTH ENDPOINT CONSTANTS
export const LOGIN = "/auth/login";
export const REFRESH = "/auth/refresh";
export const LOGOUT = "/auth/logout";

// PROFILE
export const POST_EDIT_JWT_PROFILE = "/post-jwt-profile";
export const POST_EDIT_PROFILE = "/post-fake-profile";

// ===========================
// Company Users (REAL API)
// ===========================
export const USERS = "/users";
export const USER_BY_ID = id => `/users/${id}`;

// =====================
// COE Modules List Items
// =====================
export const LIST_ITEMS = "/list-items";

// =====================
// Transportation Sizes
// =====================
export const TRANSPORTATION_SIZES = "/transportation-sizes";
export const TRANSPORTATION_SIZE_BY_ID = id => `/transportation-sizes/${id}`;

// =====================
// Transportation Types
// =====================
export const TRANSPORTATION_TYPES = "/transportation-types";
export const TRANSPORTATION_TYPE_BY_ID = id => `/transportation-types/${id}`;
export const TRANSPORTATION_COMPANIES_BEST_RATE = (
  pax,
  typeId,
  transportationCompanyId
) =>
  `/transportation-companies/best-rate?PAX=${encodeURIComponent(
    pax
  )}&TYPE=${encodeURIComponent(typeId)}${
    transportationCompanyId
      ? `&TRANSPORTATION_COMPANY_ID=${encodeURIComponent(
          transportationCompanyId
        )}`
      : ""
  }`;

// =====================
// Transportation Companies
// =====================
export const TRANSPORTATION_COMPANIES = "/transportation-companies";
export const TRANSPORTATION_COMPANY_BY_ID = id =>
  `/transportation-companies/${id}`;
export const TRANSPORTATION_COMPANY_RATES = id =>
  `/transportation-companies/${id}/rates`;
export const TRANSPORTATION_COMPANY_RATE_BY_ID = (companyId, rateId) =>
  `/transportation-companies/${companyId}/rates/${rateId}`;

// =====================
// COE Attachments
// =====================
export const ATTACHMENTS = "/attachments";
export const ATTACHMENT_BY_ID = id => `/attachments/${id}`;

// =====================
// Guides
// =====================
export const GUIDES = "/guides";
export const GUIDE_BY_ID = id => `/guides/${id}`;
export const GUIDE_LANGUAGES = "/guides/languages";

// =====================
// Tasks
// =====================
export const TASKS = "/tasks";
export const MY_TASKS = "/tasks/my";
export const TASK_ASSIGNABLE_USERS = "/tasks/assignable-users";
export const TASK_RELATED_ITEMS = relatedType =>
  `/tasks/related-items?RELATED_TYPE=${encodeURIComponent(relatedType)}`;
export const TASK_BY_ID = id => `/tasks/${id}`;
export const TASK_NOTES = id => `/tasks/${id}/notes`;
export const TASK_ATTACHMENTS = id => `/tasks/${id}/attachments`;
export const TASK_CLAIM = id => `/tasks/${id}/claim`;
export const TASK_RECLAIM = id => `/tasks/${id}/reclaim`;
export const TASK_LOGS = id => `/tasks/${id}/logs`;
export const TASK_CLOSE = id => `/tasks/${id}/close`;
export const TASK_NOTIFICATIONS = "/task-notifications";
export const TASK_NOTIFICATION_READ = id => `/task-notifications/${id}/read`;
export const TASK_NOTIFICATIONS_READ_ALL = "/task-notifications/read-all";
export const EVALUATION_SOURCE_REVIEWS = sourceType =>
  `/evaluations/published-source-reviews?sourceType=${encodeURIComponent(sourceType)}`;

// =====================
// Analytics
// =====================
export const ANALYTICS = "/analytics";

// =====================
// Hotels
// =====================
export const HOTELS = "/hotels";
export const HOTEL_BY_ID = id => `/hotels/${id}`;

// =====================
// Hotel Season Rates
// =====================
export const HOTEL_SEASON_RATES = hotelId =>
  `/hotels/${hotelId}/season-rates`;
export const HOTEL_SEASON_RATE_BY_ID = (hotelId, rateId) =>
  `/hotels/${hotelId}/season-rates/${rateId}`;

// =====================
// Restaurants
// =====================
export const RESTAURANTS = "/restaurants";
export const RESTAURANT_BY_ID = id => `/restaurants/${id}`;
export const RESTAURANT_MEALS = restaurantId =>
  `/restaurants/${restaurantId}/meals`;
export const RESTAURANT_MEAL_BY_ID = (restaurantId, mealId) =>
  `/restaurants/${restaurantId}/meals/${mealId}`;

// =====================
// Travel Agents
// =====================
export const TRAVEL_AGENTS = "/agent";
export const TRAVEL_AGENT_BY_ID = id => `/agent/${id}`;
export const TRAVEL_AGENT_QUOTATIONS = id => `/agent/${id}/quotations`;

// =====================
// Places
// =====================
export const PLACES = "/place";
export const PLACE_BY_ID = id => `/place/${id}`;

// =====================
// Extra Services
// =====================
export const EXTRA_SERVICES = "/extra_services";
export const EXTRA_SERVICE_BY_ID = id => `/extra_services/${id}`;

// =====================
// Quotations
// =====================
export const QUOTATIONS = "/quotations";
export const QUOTATION_BY_ID = id => `/quotations/${id}`;
export const QUOTATION_ACCUMIDATION = "/quotation-accumidation";
export const QUOTATION_ACCUMIDATION_BY_ID = id =>
  `/quotation-accumidation/${id}`;

// =====================
// Quotation Pricing
// =====================
export const QUOTATION_PRICING = "/quotation-pricing";
export const QUOTATION_PRICING_BY_QUOTATION_ID = quotationId =>
  `/quotation-pricing/quotation/${quotationId}`;
export const QUOTATION_SEND_FOR_PRICING = quotationId =>
  `/quotation-pricing/quotation/${quotationId}/send`;
export const QUOTATION_PRICING_PROFIT = quotationId =>
  `/quotation-pricing/quotation/${quotationId}/profit`;
export const QUOTATION_PRICING_DECISION = quotationId =>
  `/quotation-pricing/quotation/${quotationId}/decision`;
export const QUOTATION_PRICING_CANCEL = quotationId =>
  `/quotation-pricing/quotation/${quotationId}/cancel`;
export const QUOTATION_FINAL_PRICING = quotationId =>
  `/quotation-pricing/quotation/${quotationId}/final`;

// RESERVATION FILES
export const RESERVATION_FILES = "/reservation-files";
export const RESERVATION_FILE_BY_ID = id => `/reservation-files/${id}`;
export const RESERVATION_FILE_STATUS = id => `/reservation-files/${id}/status`;
export const RESERVATION_FILE_FROM_QUOTATION = quotationId =>
  `/reservation-files/from-quotation/${quotationId}`;

// EVALUATIONS
export const EVALUATION_FILES = "/evaluations/files";
export const EVALUATION_DRAFT = reservationFileId =>
  `/evaluations/draft/${reservationFileId}`;
export const EVALUATIONS = "/evaluations";
export const EVALUATION_REVIEWS = evaluationId =>
  `/evaluations/${evaluationId}/reviews`;
export const PUBLIC_EVALUATION = token => `/evaluations/public/${token}`;
export const PUBLIC_EVALUATION_LOGIN = token =>
  `/evaluations/public/${token}/login`;
export const PUBLIC_EVALUATION_SUBMIT = token =>
  `/evaluations/public/${token}/submit`;
