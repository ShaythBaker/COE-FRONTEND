// path: src/store/listItems/actions.js
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

export const fetchListItems = (listKey) => ({
  type: FETCH_LIST_ITEMS,
  payload: { listKey },
});

export const fetchListItemsSuccess = (items) => ({
  type: FETCH_LIST_ITEMS_SUCCESS,
  payload: items,
});

export const fetchListItemsFail = (error) => ({
  type: FETCH_LIST_ITEMS_FAIL,
  payload: error,
});

export const createListItem = (payload) => ({
  type: CREATE_LIST_ITEM,
  payload,
});

export const createListItemSuccess = () => ({
  type: CREATE_LIST_ITEM_SUCCESS,
});

export const createListItemFail = (error) => ({
  type: CREATE_LIST_ITEM_FAIL,
  payload: error,
});

export const updateListItem = (id, payload) => ({
  type: UPDATE_LIST_ITEM,
  payload: { id, payload },
});

export const updateListItemSuccess = () => ({
  type: UPDATE_LIST_ITEM_SUCCESS,
});

export const updateListItemFail = (error) => ({
  type: UPDATE_LIST_ITEM_FAIL,
  payload: error,
});

export const deleteListItem = (id) => ({
  type: DELETE_LIST_ITEM,
  payload: { id },
});

export const deleteListItemSuccess = () => ({
  type: DELETE_LIST_ITEM_SUCCESS,
});

export const deleteListItemFail = (error) => ({
  type: DELETE_LIST_ITEM_FAIL,
  payload: error,
});

export const resetListItemsFlags = () => ({
  type: RESET_LIST_ITEMS_FLAGS,
});