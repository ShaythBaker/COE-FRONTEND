import * as T from "./actionTypes";

const initialState = {
  loading: false,
  error: "",
  items: [],
};

const Templates = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_TEMPLATES:
    case T.CREATE_TEMPLATE:
    case T.UPDATE_TEMPLATE:
    case T.DELETE_TEMPLATE:
      return {
        ...state,
        loading: true,
        error: "",
      };

    case T.FETCH_TEMPLATES_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.CREATE_TEMPLATE_SUCCESS:
      return {
        ...state,
        loading: false,
        items: [action.payload, ...state.items],
        error: "",
      };

    case T.UPDATE_TEMPLATE_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map(item =>
          item?._id === updated?._id ? updated : item,
        ),
        error: "",
      };
    }

    case T.DELETE_TEMPLATE_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter(item => item?._id !== id),
        error: "",
      };
    }

    case T.FETCH_TEMPLATES_FAIL:
    case T.CREATE_TEMPLATE_FAIL:
    case T.UPDATE_TEMPLATE_FAIL:
    case T.DELETE_TEMPLATE_FAIL:
      return {
        ...state,
        loading: false,
        error: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default Templates;
