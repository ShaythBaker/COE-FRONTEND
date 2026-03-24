import { combineReducers } from "redux";

// Front
import Layout from "./layout/reducer";

// Authentication
import Login from "./auth/login/reducer";
import Account from "./auth/register/reducer";
import ForgetPassword from "./auth/forgetpwd/reducer";
import Profile from "./auth/profile/reducer";

// Company Users
import CompanyUsers from "./companyUsers/reducer";

// Dynamic Lists Items
import ListItems from "./listItems/reducer";

import Hotels from "./Hotels/reducer";
import Restaurants from "./Restaurants/reducer";
import TravelAgents from "./TravelAgents/reducer";
import Places from "./Places/reducer";
import TransportationSizes from "./TransportationSizes/reducer";
import TransportationTypes from "./TransportationTypes/reducer";
import TransportationCompanies from "./TransportationCompanies/reducer";
import Quotations from "./Quotations/reducer";

const rootReducer = combineReducers({
  // public
  Layout,
  Login,
  Account,
  ForgetPassword,
  Profile,
  CompanyUsers,
  ListItems,
  Hotels,
  Restaurants,
  TravelAgents,
  Places,
  TransportationSizes,
  TransportationTypes,
  TransportationCompanies,
  Quotations,
});

export default rootReducer;
