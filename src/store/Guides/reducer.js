// path: src/store/Guides/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
  selected: null,

  page: 1,
  limit: 10,
  total: 0,
  pages: 1,

  languages: [],
  guideLanguages: [],
  languagesLoading: false,
  languagesError: "",
};

const normalizeListPayload = payload => {
  if (Array.isArray(payload)) {
    return {
      items: payload,
      page: 1,
      limit: payload.length || 10,
      total: payload.length || 0,
      pages: 1,
    };
  }

  const items =
    payload?.items ||
    payload?.data ||
    payload?.results ||
    payload?.docs ||
    [];

  return {
    items: Array.isArray(items) ? items : [],
    page: Number(payload?.page || payload?.currentPage || 1),
    limit: Number(payload?.limit || payload?.pageSize || 10),
    total: Number(
      payload?.total ||
        payload?.totalCount ||
        payload?.count ||
        (Array.isArray(items) ? items.length : 0)
    ),
    pages: Number(payload?.pages || payload?.totalPages || 1),
  };
};

const Guides = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_GUIDES:
    case T.FETCH_GUIDE:
    case T.CREATE_GUIDE:
    case T.UPDATE_GUIDE:
    case T.DELETE_GUIDE:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.FETCH_GUIDE_LANGUAGES:
      return {
        ...state,
        languagesLoading: true,
        languagesError: "",
      };

    case T.FETCH_GUIDES_SUCCESS: {
      const normalized = normalizeListPayload(action.payload);
      return {
        ...state,
        loading: false,
        error: "",
        items: normalized.items,
        page: normalized.page,
        limit: normalized.limit,
        total: normalized.total,
        pages: normalized.pages,
      };
    }

    case T.FETCH_GUIDE_SUCCESS:
      return {
        ...state,
        loading: false,
        selected: action.payload || null,
        error: "",
      };

    case T.CREATE_GUIDE_SUCCESS:
      return {
        ...state,
        loading: false,
        items: action.payload ? [action.payload, ...state.items] : state.items,
        selected: action.payload || state.selected,
        error: "",
      };

    case T.UPDATE_GUIDE_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map(item =>
          item?._id === updated?._id ? updated : item
        ),
        selected:
          state.selected?._id === updated?._id ? updated : state.selected,
        error: "",
      };
    }

    case T.DELETE_GUIDE_SUCCESS:
      return {
        ...state,
        loading: false,
        items: state.items.filter(item => item?._id !== action.payload?.id),
        selected:
          state.selected?._id === action.payload?.id ? null : state.selected,
        error: "",
      };

    case T.FETCH_GUIDE_LANGUAGES_SUCCESS: {
      const raw = Array.isArray(action.payload)
        ? action.payload
        : action.payload?.items || action.payload?.data || action.payload?.results || [];

      const list = Array.isArray(raw) ? raw : [];

      return {
        ...state,
        languagesLoading: false,
        languagesError: "",
        languages: list,
        guideLanguages: list,
      };
    }

    case T.FETCH_GUIDES_FAIL:
    case T.FETCH_GUIDE_FAIL:
    case T.CREATE_GUIDE_FAIL:
    case T.UPDATE_GUIDE_FAIL:
    case T.DELETE_GUIDE_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    case T.FETCH_GUIDE_LANGUAGES_FAIL:
      return {
        ...state,
        languagesLoading: false,
        languagesError: action.payload || "Failed to load guide languages",
      };

    default:
      return state;
  }
};

export default Guides;