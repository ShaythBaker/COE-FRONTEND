// path: src/store/TravelAgents/actions.js
import * as T from "./actionTypes";

export const fetchTravelAgents = (params = {}) => ({
  type: T.FETCH_TRAVEL_AGENTS,
  payload: { params },
});
export const fetchTravelAgentsSuccess = (items) => ({
  type: T.FETCH_TRAVEL_AGENTS_SUCCESS,
  payload: items,
});
export const fetchTravelAgentsFail = (error) => ({
  type: T.FETCH_TRAVEL_AGENTS_FAIL,
  payload: error,
});

export const fetchTravelAgent = (id) => ({
  type: T.FETCH_TRAVEL_AGENT,
  payload: { id },
});
export const fetchTravelAgentSuccess = (item) => ({
  type: T.FETCH_TRAVEL_AGENT_SUCCESS,
  payload: item,
});
export const fetchTravelAgentFail = (error) => ({
  type: T.FETCH_TRAVEL_AGENT_FAIL,
  payload: error,
});

export const createTravelAgent = (data, onDone) => ({
  type: T.CREATE_TRAVEL_AGENT,
  payload: { data, onDone },
});
export const createTravelAgentSuccess = (item) => ({
  type: T.CREATE_TRAVEL_AGENT_SUCCESS,
  payload: item,
});
export const createTravelAgentFail = (error) => ({
  type: T.CREATE_TRAVEL_AGENT_FAIL,
  payload: error,
});

export const updateTravelAgent = (id, data, onDone) => ({
  type: T.UPDATE_TRAVEL_AGENT,
  payload: { id, data, onDone },
});
export const updateTravelAgentSuccess = (item) => ({
  type: T.UPDATE_TRAVEL_AGENT_SUCCESS,
  payload: item,
});
export const updateTravelAgentFail = (error) => ({
  type: T.UPDATE_TRAVEL_AGENT_FAIL,
  payload: error,
});

export const deleteTravelAgent = (id, onDone) => ({
  type: T.DELETE_TRAVEL_AGENT,
  payload: { id, onDone },
});
export const deleteTravelAgentSuccess = (id) => ({
  type: T.DELETE_TRAVEL_AGENT_SUCCESS,
  payload: { id },
});
export const deleteTravelAgentFail = (error) => ({
  type: T.DELETE_TRAVEL_AGENT_FAIL,
  payload: error,
});

export const fetchTravelAgentsLookups = () => ({
  type: T.FETCH_TRAVEL_AGENTS_LOOKUPS,
});
export const fetchTravelAgentsLookupsSuccess = (lookups) => ({
  type: T.FETCH_TRAVEL_AGENTS_LOOKUPS_SUCCESS,
  payload: lookups,
});
export const fetchTravelAgentsLookupsFail = (error) => ({
  type: T.FETCH_TRAVEL_AGENTS_LOOKUPS_FAIL,
  payload: error,
});