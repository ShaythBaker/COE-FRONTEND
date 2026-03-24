// path: src/store/Restaurants/reducer.js
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
    RESTAURANTS_MEALS: [],
  },

  mealsLoading: false,
  mealsError: "",
  mealsByRestaurant: {},
};

const Restaurants = (state = initialState, action) => {
  switch (action.type) {
    case T.FETCH_RESTAURANTS:
    case T.FETCH_RESTAURANT:
    case T.CREATE_RESTAURANT:
    case T.UPDATE_RESTAURANT:
    case T.DELETE_RESTAURANT:
      return { ...state, loading: true, error: "" };

    case T.FETCH_RESTAURANTS_SUCCESS:
      return {
        ...state,
        loading: false,
        items: Array.isArray(action.payload) ? action.payload : [],
        error: "",
      };

    case T.FETCH_RESTAURANT_SUCCESS:
      return {
        ...state,
        loading: false,
        selected: action.payload || null,
        error: "",
      };

    case T.CREATE_RESTAURANT_SUCCESS:
      return {
        ...state,
        loading: false,
        items: [action.payload, ...state.items],
        error: "",
      };

    case T.UPDATE_RESTAURANT_SUCCESS: {
      const updated = action.payload;
      return {
        ...state,
        loading: false,
        items: state.items.map((x) => (x?._id === updated?._id ? updated : x)),
        selected:
          state.selected?._id === updated?._id ? updated : state.selected,
        error: "",
      };
    }

    case T.DELETE_RESTAURANT_SUCCESS: {
      const id = action.payload?.id;
      return {
        ...state,
        loading: false,
        items: state.items.filter((x) => x?._id !== id),
        selected: state.selected?._id === id ? null : state.selected,
        mealsByRestaurant: { ...state.mealsByRestaurant, [id]: [] },
        error: "",
      };
    }

    case T.FETCH_RESTAURANTS_FAIL:
    case T.FETCH_RESTAURANT_FAIL:
    case T.CREATE_RESTAURANT_FAIL:
    case T.UPDATE_RESTAURANT_FAIL:
    case T.DELETE_RESTAURANT_FAIL:
      return { ...state, loading: false, error: action.payload || "Error" };

    case T.FETCH_RESTAURANTS_LOOKUPS:
      return { ...state, lookupsLoading: true, lookupsError: "" };
    case T.FETCH_RESTAURANTS_LOOKUPS_SUCCESS:
      return {
        ...state,
        lookupsLoading: false,
        lookups: { ...state.lookups, ...(action.payload || {}) },
      };
    case T.FETCH_RESTAURANTS_LOOKUPS_FAIL:
      return {
        ...state,
        lookupsLoading: false,
        lookupsError: action.payload || "Error",
      };

    case T.FETCH_MEALS:
    case T.CREATE_MEAL:
    case T.UPDATE_MEAL:
    case T.DELETE_MEAL:
      return { ...state, mealsLoading: true, mealsError: "" };

    case T.FETCH_MEALS_SUCCESS: {
      const { restaurantId, items } = action.payload || {};
      return {
        ...state,
        mealsLoading: false,
        mealsByRestaurant: {
          ...state.mealsByRestaurant,
          [restaurantId]: Array.isArray(items) ? items : [],
        },
      };
    }

    case T.CREATE_MEAL_SUCCESS: {
      const { restaurantId, item } = action.payload || {};
      const curr = state.mealsByRestaurant[restaurantId] || [];
      return {
        ...state,
        mealsLoading: false,
        mealsByRestaurant: {
          ...state.mealsByRestaurant,
          [restaurantId]: [item, ...curr],
        },
      };
    }

    case T.UPDATE_MEAL_SUCCESS: {
      const { restaurantId, item } = action.payload || {};
      const curr = state.mealsByRestaurant[restaurantId] || [];
      return {
        ...state,
        mealsLoading: false,
        mealsByRestaurant: {
          ...state.mealsByRestaurant,
          [restaurantId]: curr.map((x) => (x?._id === item?._id ? item : x)),
        },
      };
    }

    case T.DELETE_MEAL_SUCCESS: {
      const { restaurantId, mealId } = action.payload || {};
      const curr = state.mealsByRestaurant[restaurantId] || [];
      return {
        ...state,
        mealsLoading: false,
        mealsByRestaurant: {
          ...state.mealsByRestaurant,
          [restaurantId]: curr.filter((x) => x?._id !== mealId),
        },
      };
    }

    case T.FETCH_MEALS_FAIL:
    case T.CREATE_MEAL_FAIL:
    case T.UPDATE_MEAL_FAIL:
    case T.DELETE_MEAL_FAIL:
      return {
        ...state,
        mealsLoading: false,
        mealsError: action.payload || "Error",
      };

    default:
      return state;
  }
};

export default Restaurants;
