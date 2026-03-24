// path: src/store/TransportationSizes/reducer.js
import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
};

const TransportationSizes = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_TRANSPORTATION_SIZES:
    case T.CREATE_TRANSPORTATION_SIZE:
    case T.UPDATE_TRANSPORTATION_SIZE:
    case T.DELETE_TRANSPORTATION_SIZE:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.FETCH_TRANSPORTATION_SIZES_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.CREATE_TRANSPORTATION_SIZE_SUCCESS:
      return {
        ...state,
        loading: false,
        items: [action.payload, ...state.items],
        error: "",
      };

    case T.UPDATE_TRANSPORTATION_SIZE_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map((item) =>
          item?._id === updated?._id ? updated : item
        ),
        error: "",
      };
    }

    case T.DELETE_TRANSPORTATION_SIZE_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter((item) => item?._id !== id),
        error: "",
      };
    }

    case T.FETCH_TRANSPORTATION_SIZES_FAIL:
    case T.CREATE_TRANSPORTATION_SIZE_FAIL:
    case T.UPDATE_TRANSPORTATION_SIZE_FAIL:
    case T.DELETE_TRANSPORTATION_SIZE_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default TransportationSizes;