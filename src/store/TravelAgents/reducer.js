// path: src/store/TravelAgents/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
  selected: null,

  lookupsLoading: false,
  lookupsError: "",
  lookups: {
    COUNTRIES: [],
  },
};

const TravelAgents = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_TRAVEL_AGENTS:
    case T.FETCH_TRAVEL_AGENT:
    case T.CREATE_TRAVEL_AGENT:
    case T.UPDATE_TRAVEL_AGENT:
    case T.DELETE_TRAVEL_AGENT:
      return { ...state, loading: true, error: "" };

    case T.FETCH_TRAVEL_AGENTS_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.FETCH_TRAVEL_AGENT_SUCCESS:
      return {
        ...state,
        loading: false,
        selected: action.payload || null,
        error: "",
      };

    case T.CREATE_TRAVEL_AGENT_SUCCESS:
      return {
        ...state,
        loading: false,
        items: [action.payload, ...state.items],
        error: "",
      };

    case T.UPDATE_TRAVEL_AGENT_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map((x) => (x?._id === updated?._id ? updated : x)),
        selected: state.selected?._id === updated?._id ? updated : state.selected,
        error: "",
      };
    }

    case T.DELETE_TRAVEL_AGENT_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter((x) => x?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
        error: "",
      };
    }

    case T.FETCH_TRAVEL_AGENTS_FAIL:
    case T.FETCH_TRAVEL_AGENT_FAIL:
    case T.CREATE_TRAVEL_AGENT_FAIL:
    case T.UPDATE_TRAVEL_AGENT_FAIL:
    case T.DELETE_TRAVEL_AGENT_FAIL:
      return { ...state, loading: false, error: action.payload || "Error" };

    case T.FETCH_TRAVEL_AGENTS_LOOKUPS:
      return { ...state, lookupsLoading: true, lookupsError: "" };

    case T.FETCH_TRAVEL_AGENTS_LOOKUPS_SUCCESS:
      return {
        ...state,
        lookupsLoading: false,
        lookups: { ...state.lookups, ...(action.payload || {}) },
      };

    case T.FETCH_TRAVEL_AGENTS_LOOKUPS_FAIL:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default TravelAgents;