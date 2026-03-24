// path: src/store/companyUsers/actions.js

import {
  FETCH_USERS,
  FETCH_USERS_SUCCESS,
  FETCH_USERS_FAIL,
  FETCH_USER,
  FETCH_USER_SUCCESS,
  FETCH_USER_FAIL,
  CREATE_USER,
  CREATE_USER_SUCCESS,
  CREATE_USER_FAIL,
  UPDATE_USER,
  UPDATE_USER_SUCCESS,
  UPDATE_USER_FAIL,
  DELETE_USER,
  DELETE_USER_SUCCESS,
  DELETE_USER_FAIL,
} from "./actionTypes";

export const fetchUsers = () => ({ type: FETCH_USERS });
export const fetchUsersSuccess = (items) => ({ type: FETCH_USERS_SUCCESS, payload: items });
export const fetchUsersFail = (error) => ({ type: FETCH_USERS_FAIL, payload: error });

export const fetchUser = (id) => ({ type: FETCH_USER, payload: { id } });
export const fetchUserSuccess = (item) => ({ type: FETCH_USER_SUCCESS, payload: item });
export const fetchUserFail = (error) => ({ type: FETCH_USER_FAIL, payload: error });

export const createUser = (data) => ({ type: CREATE_USER, payload: { data } });
export const createUserSuccess = (item) => ({ type: CREATE_USER_SUCCESS, payload: item });
export const createUserFail = (error) => ({ type: CREATE_USER_FAIL, payload: error });

export const updateUser = (id, data) => ({ type: UPDATE_USER, payload: { id, data } });
export const updateUserSuccess = (item) => ({ type: UPDATE_USER_SUCCESS, payload: item });
export const updateUserFail = (error) => ({ type: UPDATE_USER_FAIL, payload: error });

export const deleteUser = (id) => ({ type: DELETE_USER, payload: { id } });
export const deleteUserSuccess = (id) => ({ type: DELETE_USER_SUCCESS, payload: { id } });
export const deleteUserFail = (error) => ({ type: DELETE_USER_FAIL, payload: error });