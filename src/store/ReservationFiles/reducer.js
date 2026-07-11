import * as T from "./actionTypes";

const initialState = {
  loading: false,
  saving: false,
  error: "",
  items: [],
  selected: null,
};

const upsertItem = (items, item) => {
  if (!item?._id) return items;
  const exists = items.some(row => row?._id === item._id);
  if (exists) {
    return items.map(row => (row?._id === item._id ? item : row));
  }
  return [item, ...items];
};

const ReservationFiles = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_RESERVATION_FILES:
    case T.FETCH_RESERVATION_FILE:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.CONVERT_QUOTATION_TO_RESERVATION_FILE:
      return {
        ...state,
        saving: true,
        error: "",
      };

    case T.FETCH_RESERVATION_FILES_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: Array.isArray(action.payload) ? action.payload : [],
      };

    case T.FETCH_RESERVATION_FILE_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        selected: action.payload || null,
      };

    case T.CONVERT_QUOTATION_TO_RESERVATION_FILE_SUCCESS:
      return {
        ...state,
        saving: false,
        error: "",
        selected: action.payload || state.selected,
        items: upsertItem(state.items, action.payload),
      };

    case T.FETCH_RESERVATION_FILES_FAIL:
    case T.FETCH_RESERVATION_FILE_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    case T.CONVERT_QUOTATION_TO_RESERVATION_FILE_FAIL:
      return {
        ...state,
        saving: false,
        error: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default ReservationFiles;
