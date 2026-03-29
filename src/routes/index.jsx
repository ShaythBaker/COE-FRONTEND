// path: src/routes/index.jsx
import React from "react";
import { Navigate } from "react-router-dom";

// Authentication related pages
import Login from "../pages/Authentication/Login";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register";
import ForgetPwd from "../pages/Authentication/ForgetPassword";

// Dashboard
import Dashboard from "../pages/Dashboard/index";

// System Settings
import CompanyUsers from "../pages/Settings/CompanyUsers";
import DynamicListsPage from "../pages/Settings/DynamicLists/index";
import RoleProtected from "../components/Common/RoleProtected";

// Hotels
import Hotels from "../pages/Hotels/index";
import HotelDetails from "../pages/Hotels/HotelDetails";

// Restaurants
import Restaurants from "../pages/Restaurants/index";
import RestaurantDetails from "../pages/Restaurants/RestaurantDetails";

// Travel Agents
import TravelAgents from "../pages/TravelAgents/index";
import TravelAgentDetails from "../pages/TravelAgents/TravelAgentDetails";

// Places
import Places from "../pages/Places";
import PlaceDetails from "../pages/Places/PlaceDetails";

//Extra Services
import ExtraServicesPage from "../pages/ExtraServices/index";

import TransportationSizes from "../pages/Settings/TransportationSizes";
import TransportationTypes from "../pages/Settings/TransportationTypes";

// Transportation Companies
import TransportationCompaniesList from "../pages/TransportationCompanies/List";
import TransportationCompanyDetails from "../pages/TransportationCompanies/Details";

// Quotations
import QuotationsList from "../pages/Quotations/List";
import QuotationsDetails from "../pages/Quotations/Details";
import PlanQuotation from "../pages/Quotations/Plan";
import Accommodation from "../pages/Quotations/Accommodation";
import ExtraServicesQuotation from "../pages/Quotations/ExtraServices";

const authProtectedRoutes = [
  { path: "/dashboard", component: <Dashboard /> },

  {
    path: "/settings/users",
    component: <CompanyUsers />,
    roles: ["COMPANY_ADMIN"],
  },
  {
    path: "/settings/lists",
    component: (
      <RoleProtected allowedRoles={["COMPANY_ADMIN", "CONTRACTING"]}>
        <DynamicListsPage />
      </RoleProtected>
    ),
  },

  // Settings
  {
    path: "/settings/transportation-sizes",
    component: <TransportationSizes />,
  },

  {
    path: "/settings/transportation-types",
    component: <TransportationTypes />,
  },

   { path: "/extra-services", component: <ExtraServicesPage /> },

  { path: "/hotels", component: <Hotels /> },
  { path: "/hotels/:id", component: <HotelDetails /> },

  { path: "/restaurants", component: <Restaurants /> },
  { path: "/restaurants/:id", component: <RestaurantDetails /> },

  { path: "/travel-agents", component: <TravelAgents /> },
  { path: "/travel-agents/:id", component: <TravelAgentDetails /> },

  { path: "/places", component: <Places /> },
  { path: "/places/:id", component: <PlaceDetails /> },

  {
    path: "/transportation-companies",
    component: <TransportationCompaniesList />,
  },
  {
    path: "/transportation-companies/:id",
    component: <TransportationCompanyDetails />,
  },

  { path: "/quotations", component: <QuotationsList /> },
  { path: "/quotations/:id", component: <QuotationsDetails /> },
  { path: "/quotations/:id/plan", component: <PlanQuotation /> },
  { path: "/quotations/:id/accommodation", component: <Accommodation /> },
   { path: "/quotations/:id/extra-services", component: <ExtraServicesQuotation /> },
  

  { path: "/", exact: true, component: <Navigate to="/dashboard" /> },
];

const publicRoutes = [
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login /> },
  { path: "/forgot-password", component: <ForgetPwd /> },
  { path: "/register", component: <Register /> },
];

export { authProtectedRoutes, publicRoutes };
