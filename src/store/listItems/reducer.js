// path: src/store/listItems/reducer.js
import {
  FETCH_LIST_ITEMS,
  FETCH_LIST_ITEMS_SUCCESS,
  FETCH_LIST_ITEMS_FAIL,
  CREATE_LIST_ITEM,
  CREATE_LIST_ITEM_SUCCESS,
  CREATE_LIST_ITEM_FAIL,
  UPDATE_LIST_ITEM,
  UPDATE_LIST_ITEM_SUCCESS,
  UPDATE_LIST_ITEM_FAIL,
  DELETE_LIST_ITEM,
  DELETE_LIST_ITEM_SUCCESS,
  DELETE_LIST_ITEM_FAIL,
  RESET_LIST_ITEMS_FLAGS,
} from "./actionTypes";

const INIT_STATE = {
  items: [],
  loading: false,
  error: "",
  lastOp: {
    type: "", // "create" | "update" | "delete"
    success: false,
  },
};

const ListItems = (state = INIT_STATE, action) => {
  switch (action.type) {
    case FETCH_LIST_ITEMS:
    case CREATE_LIST_ITEM:
    case UPDATE_LIST_ITEM:
    case DELETE_LIST_ITEM:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case FETCH_LIST_ITEMS_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        items: Array.isArray(action.payload) ? action.payload : [],
      };

    case FETCH_LIST_ITEMS_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to load list items",
      };

    case CREATE_LIST_ITEM_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        lastOp: { type: "create", success: true },
      };

    case CREATE_LIST_ITEM_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to create item",
      };

    case UPDATE_LIST_ITEM_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        lastOp: { type: "update", success: true },
      };

    case UPDATE_LIST_ITEM_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to update item",
      };

    case DELETE_LIST_ITEM_SUCCESS:
      return {
        ...state,
        loading: false,
        error: "",
        lastOp: { type: "delete", success: true },
      };

    case DELETE_LIST_ITEM_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Failed to delete item",
      };

    case RESET_LIST_ITEMS_FLAGS:
      return {
        ...state,
        lastOp: { type: "", success: false },
      };

    default:
      return state;
  }
};

export default ListItems;