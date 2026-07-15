// path: src/routes/index.jsx
import { Navigate } from "react-router-dom";

// Authentication related pages
import Login from "../pages/Authentication/Login";
import Logout from "../pages/Authentication/Logout";
import Register from "../pages/Authentication/Register";
import ForgetPwd from "../pages/Authentication/ForgetPassword";
import NotAuthorized from "../pages/Authentication/NotAuthorized";
import UserProfile from "../pages/Authentication/user-profile";

// Dashboard
import Dashboard from "../pages/Dashboard/index";
import Analytics from "../pages/Analytics";

// System Settings
import CompanyUsers from "../pages/Settings/CompanyUsers";
import DynamicListsPage from "../pages/Settings/DynamicLists/index";
import SystemInformation from "../pages/Settings/SystemInformation";
import RoleProtected from "../components/Common/RoleProtected";
import TemplatesPage from "../pages/Templates";

// Guides
import GuidesPage from "../pages/Guides/index.jsx";
import GuideDetails from "../pages/Guides/GuideDetails.jsx";

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

// Extra Services
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

// Quotation Pricing
import QuotationPricingList from "../pages/QuotationPricing/List";
import QuotationPricingDetails from "../pages/QuotationPricing/Details";

// Reservation Files
import ReservationFilesList from "../pages/ReservationFiles/List";
import ReservationFileDetails from "../pages/ReservationFiles/Details";
import EvaluationsPage from "../pages/Evaluations";
import TasksPage from "../pages/Tasks";
import EvaluationReviewsPage from "../pages/Evaluations/Reviews";
import PublicEvaluationPage from "../pages/Evaluations/PublicEvaluation";

const authProtectedRoutes = [
  { path: "/dashboard", component: <Dashboard /> },
  { path: "/profile", component: <UserProfile /> },
  {
    path: "/analytics",
    component: (
      <RoleProtected allowedRoles={["COMPANY_ADMIN"]}>
        <Analytics />
      </RoleProtected>
    ),
  },

  {
    path: "/settings/users",
    component: <CompanyUsers />,
    roles: ["COMPANY_ADMIN"],
  },
  {
    path: "/settings/system-information",
    component: (
      <RoleProtected allowedRoles={["COMPANY_ADMIN"]}>
        <SystemInformation />
      </RoleProtected>
    ),
  },
  {
    path: "/settings/lists",
    component: (
      <RoleProtected allowedRoles={["COMPANY_ADMIN", "CONTRACTING"]}>
        <DynamicListsPage />
      </RoleProtected>
    ),
  },
  {
    path: "/templates",
    component: (
      <RoleProtected allowedRoles={["COMPANY_ADMIN", "CONTRACTING"]}>
        <TemplatesPage />
      </RoleProtected>
    ),
  },

  {
    path: "/guides",
    component: (
      <RoleProtected
        allowedRoles={["COMPANY_ADMIN", "TOUR_OPERATION", "OPERATION"]}
      >
        <GuidesPage />
      </RoleProtected>
    ),
  },
  {
    path: "/guides/:id",
    component: (
      <RoleProtected
        allowedRoles={["COMPANY_ADMIN", "TOUR_OPERATION", "OPERATION"]}
      >
        <GuideDetails />
      </RoleProtected>
    ),
  },

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

  { path: "/reservation-files", component: <ReservationFilesList /> },
  { path: "/reservation-files/:id", component: <ReservationFileDetails /> },
  {
    path: "/tasks",
    component: (
      <RoleProtected
        allowedRoles={["QUALITY", "OPERATION", "COMPANY_ADMIN"]}
      >
        <TasksPage />
      </RoleProtected>
    ),
  },
  {
    path: "/evaluations",
    component: (
      <RoleProtected allowedRoles={["COMPANY_ADMIN", "QUALITY"]}>
        <EvaluationsPage />
      </RoleProtected>
    ),
  },
  {
    path: "/evaluations/:evaluationId/reviews",
    component: (
      <RoleProtected allowedRoles={["COMPANY_ADMIN", "QUALITY"]}>
        <EvaluationReviewsPage />
      </RoleProtected>
    ),
  },

  {
    path: "/quotation-pricing",
    component: (
      <RoleProtected allowedRoles={["ACCOUNTING", "COMPANY_ADMIN"]}>
        <QuotationPricingList />
      </RoleProtected>
    ),
  },
  {
    path: "/quotation-pricing/:quotationId",
    component: (
      <RoleProtected allowedRoles={["ACCOUNTING", "COMPANY_ADMIN"]}>
        <QuotationPricingDetails />
      </RoleProtected>
    ),
  },

  { path: "/", exact: true, component: <Navigate to="/dashboard" /> },
];

const publicRoutes = [
  { path: "/logout", component: <Logout /> },
  { path: "/login", component: <Login /> },
  { path: "/forgot-password", component: <ForgetPwd /> },
  { path: "/register", component: <Register /> },
  { path: "/not-authorized", component: <NotAuthorized /> },
  { path: "/public/evaluations/:token", component: <PublicEvaluationPage /> },
];

export { authProtectedRoutes, publicRoutes };
