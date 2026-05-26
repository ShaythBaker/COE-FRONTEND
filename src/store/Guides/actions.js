// path: src/store/Guides/actions.js
import * as T from "./actionTypes";

export const fetchGuides = (params = {}) => ({
  type: T.FETCH_GUIDES,
  payload: { params },
});
export const fetchGuidesSuccess = payload => ({
  type: T.FETCH_GUIDES_SUCCESS,
  payload,
});
export const fetchGuidesFail = error => ({
  type: T.FETCH_GUIDES_FAIL,
  payload: error,
});

export const fetchGuide = id => ({
  type: T.FETCH_GUIDE,
  payload: { id },
});
export const fetchGuideSuccess = item => ({
  type: T.FETCH_GUIDE_SUCCESS,
  payload: item,
});
export const fetchGuideFail = error => ({
  type: T.FETCH_GUIDE_FAIL,
  payload: error,
});

export const createGuide = (data, onDone) => ({
  type: T.CREATE_GUIDE,
  payload: { data, onDone },
});
export const createGuideSuccess = item => ({
  type: T.CREATE_GUIDE_SUCCESS,
  payload: item,
});
export const createGuideFail = error => ({
  type: T.CREATE_GUIDE_FAIL,
  payload: error,
});

export const updateGuide = (id, data, onDone) => ({
  type: T.UPDATE_GUIDE,
  payload: { id, data, onDone },
});
export const updateGuideSuccess = item => ({
  type: T.UPDATE_GUIDE_SUCCESS,
  payload: item,
});
export const updateGuideFail = error => ({
  type: T.UPDATE_GUIDE_FAIL,
  payload: error,
});

export const deleteGuide = (id, onDone) => ({
  type: T.DELETE_GUIDE,
  payload: { id, onDone },
});
export const deleteGuideSuccess = id => ({
  type: T.DELETE_GUIDE_SUCCESS,
  payload: { id },
});
export const deleteGuideFail = error => ({
  type: T.DELETE_GUIDE_FAIL,
  payload: error,
});

export const fetchGuideLanguages = () => ({
  type: T.FETCH_GUIDE_LANGUAGES,
});

export const fetchGuideLanguagesSuccess = items => ({
  type: T.FETCH_GUIDE_LANGUAGES_SUCCESS,
  payload: items,
});

export const fetchGuideLanguagesFail = error => ({
  type: T.FETCH_GUIDE_LANGUAGES_FAIL,
  payload: error,
});