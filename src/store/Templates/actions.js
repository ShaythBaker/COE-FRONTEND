import * as T from "./actionTypes";

export const fetchTemplates = (params = {}) => ({
  type: T.FETCH_TEMPLATES,
  payload: { params },
});

export const fetchTemplatesSuccess = items => ({
  type: T.FETCH_TEMPLATES_SUCCESS,
  payload: items,
});

export const fetchTemplatesFail = error => ({
  type: T.FETCH_TEMPLATES_FAIL,
  payload: error,
});

export const createTemplate = (data, onDone) => ({
  type: T.CREATE_TEMPLATE,
  payload: { data, onDone },
});

export const createTemplateSuccess = item => ({
  type: T.CREATE_TEMPLATE_SUCCESS,
  payload: item,
});

export const createTemplateFail = error => ({
  type: T.CREATE_TEMPLATE_FAIL,
  payload: error,
});

export const updateTemplate = (id, data, onDone) => ({
  type: T.UPDATE_TEMPLATE,
  payload: { id, data, onDone },
});

export const updateTemplateSuccess = item => ({
  type: T.UPDATE_TEMPLATE_SUCCESS,
  payload: item,
});

export const updateTemplateFail = error => ({
  type: T.UPDATE_TEMPLATE_FAIL,
  payload: error,
});

export const deleteTemplate = (id, onDone) => ({
  type: T.DELETE_TEMPLATE,
  payload: { id, onDone },
});

export const deleteTemplateSuccess = id => ({
  type: T.DELETE_TEMPLATE_SUCCESS,
  payload: { id },
});

export const deleteTemplateFail = error => ({
  type: T.DELETE_TEMPLATE_FAIL,
  payload: error,
});
