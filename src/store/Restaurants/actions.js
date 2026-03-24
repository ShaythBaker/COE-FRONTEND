// path: src/store/Restaurants/actions.js
import * as T from "./actionTypes";

export const fetchRestaurants = (params = {}) => ({
  type: T.FETCH_RESTAURANTS,
  payload: { params },
});
export const fetchRestaurantsSuccess = (items) => ({
  type: T.FETCH_RESTAURANTS_SUCCESS,
  payload: items,
});
export const fetchRestaurantsFail = (error) => ({
  type: T.FETCH_RESTAURANTS_FAIL,
  payload: error,
});

export const fetchRestaurant = (id) => ({
  type: T.FETCH_RESTAURANT,
  payload: { id },
});
export const fetchRestaurantSuccess = (item) => ({
  type: T.FETCH_RESTAURANT_SUCCESS,
  payload: item,
});
export const fetchRestaurantFail = (error) => ({
  type: T.FETCH_RESTAURANT_FAIL,
  payload: error,
});

export const createRestaurant = (data, onDone) => ({
  type: T.CREATE_RESTAURANT,
  payload: { data, onDone },
});
export const createRestaurantSuccess = (item) => ({
  type: T.CREATE_RESTAURANT_SUCCESS,
  payload: item,
});
export const createRestaurantFail = (error) => ({
  type: T.CREATE_RESTAURANT_FAIL,
  payload: error,
});

export const updateRestaurant = (id, data, onDone) => ({
  type: T.UPDATE_RESTAURANT,
  payload: { id, data, onDone },
});
export const updateRestaurantSuccess = (item) => ({
  type: T.UPDATE_RESTAURANT_SUCCESS,
  payload: item,
});
export const updateRestaurantFail = (error) => ({
  type: T.UPDATE_RESTAURANT_FAIL,
  payload: error,
});

export const deleteRestaurant = (id, onDone) => ({
  type: T.DELETE_RESTAURANT,
  payload: { id, onDone },
});
export const deleteRestaurantSuccess = (id) => ({
  type: T.DELETE_RESTAURANT_SUCCESS,
  payload: { id },
});
export const deleteRestaurantFail = (error) => ({
  type: T.DELETE_RESTAURANT_FAIL,
  payload: error,
});

export const fetchRestaurantsLookups = () => ({
  type: T.FETCH_RESTAURANTS_LOOKUPS,
});
export const fetchRestaurantsLookupsSuccess = (lookups) => ({
  type: T.FETCH_RESTAURANTS_LOOKUPS_SUCCESS,
  payload: lookups,
});
export const fetchRestaurantsLookupsFail = (error) => ({
  type: T.FETCH_RESTAURANTS_LOOKUPS_FAIL,
  payload: error,
});

export const fetchMeals = (restaurantId) => ({
  type: T.FETCH_MEALS,
  payload: { restaurantId },
});
export const fetchMealsSuccess = (restaurantId, items) => ({
  type: T.FETCH_MEALS_SUCCESS,
  payload: { restaurantId, items },
});
export const fetchMealsFail = (error) => ({
  type: T.FETCH_MEALS_FAIL,
  payload: error,
});

export const createMeal = (restaurantId, data, onDone) => ({
  type: T.CREATE_MEAL,
  payload: { restaurantId, data, onDone },
});
export const createMealSuccess = (restaurantId, item) => ({
  type: T.CREATE_MEAL_SUCCESS,
  payload: { restaurantId, item },
});
export const createMealFail = (error) => ({
  type: T.CREATE_MEAL_FAIL,
  payload: error,
});

export const updateMeal = (restaurantId, mealId, data, onDone) => ({
  type: T.UPDATE_MEAL,
  payload: { restaurantId, mealId, data, onDone },
});
export const updateMealSuccess = (restaurantId, item) => ({
  type: T.UPDATE_MEAL_SUCCESS,
  payload: { restaurantId, item },
});
export const updateMealFail = (error) => ({
  type: T.UPDATE_MEAL_FAIL,
  payload: error,
});

export const deleteMeal = (restaurantId, mealId, onDone) => ({
  type: T.DELETE_MEAL,
  payload: { restaurantId, mealId, onDone },
});
export const deleteMealSuccess = (restaurantId, mealId) => ({
  type: T.DELETE_MEAL_SUCCESS,
  payload: { restaurantId, mealId },
});
export const deleteMealFail = (error) => ({
  type: T.DELETE_MEAL_FAIL,
  payload: error,
});
