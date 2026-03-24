// path: src/store/Places/reducer.js
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
    NATIONALITIES: [],
  },
};

const Places = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_PLACES:
    case T.FETCH_PLACE:
    case T.CREATE_PLACE:
    case T.UPDATE_PLACE:
    case T.DELETE_PLACE:
      return { ...state, loading: true, error: "" };

    case T.FETCH_PLACES_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.FETCH_PLACE_SUCCESS:
      return {
        ...state,
        loading: false,
        selected: action.payload || null,
        error: "",
      };

    case T.CREATE_PLACE_SUCCESS:
      return {
        ...state,
        loading: false,
        items: [action.payload, ...state.items],
        error: "",
      };

    case T.UPDATE_PLACE_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map((x) => (x?._id === updated?._id ? updated : x)),
        selected: state.selected?._id === updated?._id ? updated : state.selected,
        error: "",
      };
    }

    case T.DELETE_PLACE_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter((x) => x?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
        error: "",
      };
    }

    case T.FETCH_PLACES_FAIL:
    case T.FETCH_PLACE_FAIL:
    case T.CREATE_PLACE_FAIL:
    case T.UPDATE_PLACE_FAIL:
    case T.DELETE_PLACE_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    case T.FETCH_PLACES_LOOKUPS:
      return {
        ...state,
        lookupsLoading: true,
        lookupsError: "",
      };

    case T.FETCH_PLACES_LOOKUPS_SUCCESS:
      return {
        ...state,
        lookupsLoading: false,
        lookups: {
          ...state.lookups,
          ...(action.payload || {}),
        },
      };

    case T.FETCH_PLACES_LOOKUPS_FAIL:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default Places;