import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  Table,
  TabContent,
  TabPane,
} from "reactstrap";
import { Chart, registerables } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ReactEcharts from "echarts-for-react";
import { jsPDF } from "jspdf";
import { withTranslation } from "react-i18next";

import Breadcrumbs from "../../components/Common/Breadcrumb";
import { getAnalyticsOverview } from "../../helpers/coe_backend_helper";

Chart.register(...registerables);

const CHART_COLORS = [
  "#556ee6",
  "#34c38f",
  "#f1b44c",
  "#50a5f1",
  "#f46a6a",
  "#74788d",
  "#6f42c1",
  "#20c997",
];

const TABS = [
  { key: "general", label: "General", icon: "bx bx-grid-alt" },
  { key: "users", label: "Users", icon: "bx bx-user" },
  { key: "guests", label: "Guests / Nationalities", icon: "bx bx-group" },
  { key: "filesTrips", label: "Files / Trips", icon: "bx bx-folder-open" },
  { key: "ratingsOverview", label: "Ratings Overview", icon: "bx bx-star" },
  { key: "today", label: "Today / Current Status", icon: "bx bx-calendar-check" },
  { key: "hotels", label: "Hotels", icon: "bx bx-hotel" },
  { key: "guides", label: "Guides", icon: "bx bx-map-pin" },
  { key: "restaurants", label: "Restaurants", icon: "bx bx-restaurant" },
  { key: "travelAgents", label: "Travel Agents", icon: "bx bxs-plane-alt" },
  { key: "places", label: "Places", icon: "bx bxs-map" },
  {
    key: "transportationCompanies",
    label: "Transportation Companies",
    icon: "bx bx-car",
  },
];

const TAB_DATA_BASIS = {
  general: "Company-scoped operational records currently available in the COE database.",
  users: "Current company user records, roles, creation dates, and completeness checks.",
  guests: "Quotation pax and reservation customer profiles; pax is not treated as individual guest records.",
  filesTrips: "Quotations and reservation files linked through saved quotation IDs.",
  ratingsOverview: "Approved evaluation responses and their saved reservation/quotation relationships.",
  hotels: "Hotel inventory, saved accommodation options, configured rates, and approved ratings.",
  guides: "Guide records, reservation assignments where names exist, guide types, and approved ratings.",
  restaurants: "Restaurant inventory, quotation-day meal rows, configured meals, and approved ratings.",
  travelAgents: "Travel-agent IDs stored on quotations with linked files, pax, and available saved pricing.",
  places: "Place inventory and saved quotation-day entrance selections; these are not confirmed visits.",
  transportationCompanies: "Resolved quotation-day transport selections, configured rates, and approved ratings.",
  today: "Today Analytics based on saved trip dates and schedules; it is not live location tracking.",
};

const RESEARCH_NOTES = {
  general: [
    {
      title: "Product analytics lens",
      body:
        "Track usage flows, cohorts, retention-style activity, and segmented behavior alongside business outcomes.",
      href: "https://amplitude.com/explore/analytics/product-analytics-guide",
      source: "Amplitude",
    },
    {
      title: "Funnel and cohort thinking",
      body:
        "Operational dashboards benefit from seeing where work moves, slows down, or drops between workflow states.",
      href: "https://mixpanel.com/blog/product-analytics-predict-retention/",
      source: "Mixpanel",
    },
  ],
  users: [
    {
      title: "Role segmentation",
      body:
        "SaaS analysis commonly segments users by properties such as role, cohort, and activity level before judging adoption.",
      href: "https://countly.com/blog/8-product-analytics-metrics-every-saas-growth-team-should-track",
      source: "Countly",
    },
  ],
  hotels: [
    {
      title: "Rate and revenue KPIs",
      body:
        "Hotel reporting commonly combines demand, ADR, RevPAR-style pricing, source mix, and guest satisfaction.",
      href: "https://www.mews.com/en/blog/hotel-industry-kpis",
      source: "Mews",
    },
    {
      title: "Hospitality metric definitions",
      body:
        "ADR, occupancy, RevPAR, guest satisfaction, and length of stay are useful benchmarks where the system has matching data.",
      href: "https://www.altexsoft.com/blog/revpar-occupancy-rate-adr-hotel-metrics/",
      source: "AltexSoft",
    },
  ],
  guides: [
    {
      title: "Service quality view",
      body:
        "For human-delivered travel services, useful signals include language coverage, utilization, customer ratings, and repeat demand.",
      href: "https://coaxsoft.com/blog/breaking-down-travel-analytics",
      source: "COAX",
    },
  ],
  restaurants: [
    {
      title: "Menu and guest feedback",
      body:
        "Restaurant KPIs often combine item popularity, average check or item price, customer satisfaction, and profitability signals.",
      href: "https://www.netsuite.com/portal/resource/articles/erp/restaurant-kpis.shtml",
      source: "NetSuite",
    },
    {
      title: "Meal mix",
      body:
        "Menu analytics can reveal the meals most often selected and whether prices differ sharply by meal type.",
      href: "https://get.apicbase.com/essential-restaurant-metrics/",
      source: "Apicbase",
    },
  ],
  travelAgents: [
    {
      title: "Agency performance",
      body:
        "Travel agency analysis usually watches booking volume, sales or revenue per trip, customer satisfaction, and repeat bookings.",
      href: "https://moguplatform.com/en/blog/essential-kpis-to-measure-the-performance-of-your-travel-agency",
      source: "MOGU",
    },
  ],
  places: [
    {
      title: "Destination demand",
      body:
        "Tourism analytics connects internal demand, destinations, seasonality, pricing, and customer experience into one view.",
      href: "https://coaxsoft.com/blog/breaking-down-travel-analytics",
      source: "COAX",
    },
  ],
  transportationCompanies: [
    {
      title: "Provider and cost control",
      body:
        "Travel management KPIs focus on cost control, preferred-provider usage, service quality, and compliance with operating rules.",
      href: "https://business.booking.com/en-us/business-travel-resources/blog/practical-guide-to-kpis-for-travel-management/",
      source: "Booking.com for Business",
    },
  ],
};

const asArray = value => (Array.isArray(value) ? value : []);
const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = value => new Intl.NumberFormat().format(toNumber(value));
const formatDecimal = value =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(toNumber(value));
const formatMoney = value =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(toNumber(value));
const formatDate = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatMetric = (value, type) => {
  if (type === "text") return value || "-";
  if (type === "money") return formatMoney(value);
  if (type === "decimal") return formatDecimal(value);
  return formatNumber(value);
};

const getTopName = rows => asArray(rows)[0]?.name || "-";

const EMPTY_ANALYTICS_FILTERS = {
  from: "",
  to: "",
  nationality: "",
  guide: "",
  travelAgent: "",
  restaurant: "",
  hotel: "",
  transportationCompany: "",
  place: "",
  minRating: "",
  maxRating: "",
  status: "",
};

const firstValue = (...values) => values.find(value => value !== undefined && value !== null && value !== "") ?? "";

const friendlyReportValue = value => {
  const text = String(value ?? "-").trim();
  const labels = {
    SEND_FOR_PRICING: "Send for Pricing",
    APPROVED: "Approved",
    CANCELLED: "Cancelled",
    CANCELED: "Canceled",
    REJECTED: "Rejected",
    DRAFT: "Draft",
    PENDING: "Pending",
    CLOSED: "Closed",
    ACTIVE: "Active",
    INACTIVE: "Inactive",
  };
  return labels[text] || text || "-";
};

const reportTable = (title, columns, rows) => ({
  title,
  headers: columns.map(column => column.label),
  rows: asArray(rows).map(row =>
    columns.map(column =>
      typeof column.value === "function" ? column.value(row) : row?.[column.value],
    ),
  ),
});

const metricsTable = (rows, title = "Summary") => ({
  title,
  headers: ["Metric", "Value", "Notes"],
  rows: asArray(rows).map(row => [row.label, row.value ?? "", row.notes || row.footer || ""]),
});

const rankingTable = (title, rows) => reportTable(
  title,
  [
    { label: "Name", value: row => row?.name || "-" },
    { label: "Count", value: row => firstValue(row?.value, row?.count, row?.quotations, row?.ratingCount) },
    { label: "Average", value: row => firstValue(row?.averageRating, row?.averageRate, row?.averagePrice, row?.averageAmount, row?.averageQuotationValue) },
    { label: "Files / Trips", value: row => firstValue(row?.tripCount, row?.filesHandled, row?.reservationFiles) },
    { label: "Occurrences", value: row => firstValue(row?.occurrences, row?.days) },
    { label: "Pax", value: row => firstValue(row?.linkedGroupPax, row?.paxHandled, row?.totalPax, row?.pax) },
  ],
  rows,
);

const nationalityRatingsTable = rows => reportTable(
  "Ratings by Nationality",
  [
    { label: "Nationality", value: "name" },
    { label: "Responses", value: row => firstValue(row?.ratedResponses, row?.ratingCount) },
    { label: "Overall Average", value: row => firstValue(row?.overallAverage, row?.averageRating) },
    { label: "Hotel Average", value: "hotelAverage" },
    { label: "Guide Average", value: "guideAverage" },
    { label: "Restaurant Average", value: "restaurantAverage" },
    { label: "Transportation Average", value: "transportationAverage" },
    { label: "Place Average", value: "placeAverage" },
  ],
  rows,
);

const filterReportRows = analytics => {
  const filters = analytics?.filters || {};
  const options = analytics?.filterOptions || {};
  const definitions = [
    ["from", "From date"], ["to", "To date"],
    ["nationality", "Nationality", options.nationalities],
    ["guide", "Guide", options.guides],
    ["travelAgent", "Travel agent", options.travelAgents],
    ["restaurant", "Restaurant", options.restaurants],
    ["hotel", "Hotel", options.hotels],
    ["transportationCompany", "Transportation company", options.transportationCompanies],
    ["place", "Place", options.places],
    ["minRating", "Minimum rating"], ["maxRating", "Maximum rating"],
    ["status", "Status", options.statuses],
  ];
  return definitions.map(([key, label, rows]) => {
    const rawValue = filters[key];
    const selected = asArray(rows).find(row => String(row.id) === String(rawValue));
    return { label, value: rawValue ? selected?.name || rawValue : "All" };
  });
};

const executiveSummaryRows = analytics => {
  const general = analytics?.general || {};
  const users = analytics?.users || {};
  const guests = analytics?.guests || {};
  const files = analytics?.filesTrips || {};
  const ratings = analytics?.ratingsOverview || {};
  const hotels = analytics?.hotels || {};
  const guides = analytics?.guides || {};
  const restaurants = analytics?.restaurants || {};
  const transportation = analytics?.transportationCompanies || {};
  return [
    { label: "Active Users", value: users.active, notes: `${formatNumber(users.total)} total users` },
    { label: "Total Quotations", value: files.totalQuotations, notes: "Selected reporting period" },
    { label: "Total Files / Trips", value: files.totalFilesTrips, notes: "Reservation files linked to quotations" },
    { label: "Total Pax", value: guests.totalPax, notes: "Quotation group pax" },
    { label: "Final Priced Total", value: general.priceSummary?.finalTotal, notes: "Available saved pricing; not collected revenue" },
    { label: "Total Ratings", value: ratings.totalRatings, notes: "Approved evaluation ratings" },
    { label: "Average Rating", value: ratings.averageOverallRating, notes: "Across approved rating answers" },
    { label: "Best Hotel", value: hotels.bestHotel?.name || "No data", notes: hotels.bestHotel ? `${hotels.bestHotel.averageRating} average rating` : "" },
    { label: "Best Guide", value: guides.bestGuide?.name || "No data", notes: guides.bestGuide ? `${guides.bestGuide.averageRating} average rating` : "" },
    { label: "Best Restaurant", value: restaurants.bestRestaurant?.name || "No data", notes: restaurants.bestRestaurant ? `${restaurants.bestRestaurant.averageRating} average rating` : "" },
    { label: "Most Used Hotel", value: getTopName(hotels.rankedByUsage), notes: "Based on linked files / trips" },
    { label: "Most Used Transportation Company", value: getTopName(transportation.rankedByUsage), notes: "Based on linked files / trips" },
    { label: "Top Nationality", value: guests.topNationality || "No data", notes: "Based on quotation pax" },
  ];
};

const buildAnalyticsReport = analytics => {
  const general = analytics?.general || {};
  const users = analytics?.users || {};
  const guests = analytics?.guests || {};
  const files = analytics?.filesTrips || {};
  const ratings = analytics?.ratingsOverview || {};
  const hotels = analytics?.hotels || {};
  const guides = analytics?.guides || {};
  const restaurants = analytics?.restaurants || {};
  const agents = analytics?.travelAgents || {};
  const places = analytics?.places || {};
  const transportation = analytics?.transportationCompanies || {};
  const today = analytics?.today || {};

  return [
    { name: "Summary", title: "Executive Summary", tables: [metricsTable(executiveSummaryRows(analytics), "Key Performance Indicators")] },
    { name: "Filters", tables: [reportTable("Selected Filters", [{ label: "Filter", value: "label" }, { label: "Value", value: "value" }], filterReportRows(analytics))] },
    { name: "General", title: "General Overview", tables: [
      metricsTable([
        ...asArray(general.summaryCards).map(card => ({ label: card.label, value: card.value, notes: card.footer })),
        { label: "Base Total", value: general.priceSummary?.baseTotal, notes: "Before profit" },
        { label: "Profit Total", value: general.priceSummary?.profitTotal, notes: "Saved pricing rows" },
        { label: "Final Priced Total", value: general.priceSummary?.finalTotal, notes: "Available saved pricing" },
      ]),
      rankingTable("Entity Counts", general.entityCounts),
      rankingTable("Quotation Status", general.quotationStatus),
      rankingTable("Pricing Breakdown", general.pricingBreakdown),
      reportTable("Quotation Activity by Month", [
        { label: "Month", value: row => row?.month || row?.name }, { label: "Total", value: "total" },
        { label: "Approved", value: "APPROVED" }, { label: "Sent for Pricing", value: "SEND_FOR_PRICING" },
        { label: "Cancelled", value: "CANCELLED" },
      ], general.monthlyQuotations),
    ] },
    { name: "Users", tables: [
      metricsTable([
        { label: "Total Users", value: users.total }, { label: "Active Users", value: users.active },
        { label: "Inactive Users", value: users.inactive }, { label: "Role Assignments", value: users.roleAssignments },
      ]),
      rankingTable("Users by Role", users.byRole),
      reportTable("Recent Users", [
        { label: "Name", value: "name" }, { label: "Email", value: "email" },
        { label: "Roles", value: row => asArray(row?.roles).join(", ") }, { label: "Created", value: row => formatDate(row?.createdOn) },
      ], users.recentUsers),
    ] },
    { name: "Guests - Nationalities", tables: [
      metricsTable([
        { label: "Total Pax", value: guests.totalPax, notes: "Quotation pax" },
        { label: "Quotations", value: guests.quotationCount }, { label: "Top Nationality", value: guests.topNationality },
        { label: "Nationalities", value: guests.nationalityCount }, { label: "Rated Responses", value: guests.totalRatedResponses },
      ]),
      reportTable("Pax by Nationality", [
        { label: "Nationality", value: "name" }, { label: "Pax", value: "pax" },
        { label: "Quotations", value: "quotations" }, { label: "Share %", value: "sharePercent" },
      ], guests.byNationality),
      reportTable("Pax Trend", [{ label: "Month", value: "month" }, { label: "Quotations", value: "quotations" }, { label: "Pax", value: "pax" }], guests.paxByMonth),
      nationalityRatingsTable(guests.ratingsByNationality),
      reportTable("Recent Guest Activity", [
        { label: "Quotation", value: "quotationReference" }, { label: "File", value: "fileReference" },
        { label: "Nationality", value: "nationality" }, { label: "Pax", value: "pax" },
        { label: "Trip Start", value: row => formatDate(row?.tripStart) }, { label: "Status", value: "status" },
      ], guests.recentActivity),
    ] },
    { name: "Files - Trips", tables: [
      metricsTable([
        { label: "Files / Trips", value: files.totalFilesTrips }, { label: "Quotations", value: files.totalQuotations },
        { label: "Reservation Files", value: files.totalReservationFiles }, { label: "Total Pax", value: files.totalPax },
        { label: "Average Pax per Trip", value: files.averagePaxPerTrip }, { label: "Average Trip Duration", value: files.averageTripDuration, notes: "Days" },
      ]),
      reportTable("Files / Trips by Month", [{ label: "Month", value: "month" }, { label: "Files / Trips", value: "files" }, { label: "Pax", value: "pax" }], files.filesByMonth),
      rankingTable("Files by Status", files.filesByStatus), rankingTable("Files by Travel Agent", files.filesByAgent),
      reportTable("Recent Files / Trips", [
        { label: "File", value: "fileReference" }, { label: "Quotation", value: "quotationReference" },
        { label: "Travel Agent", value: "agentName" }, { label: "Start", value: row => formatDate(row?.tripStart) },
        { label: "End", value: row => formatDate(row?.tripEnd) }, { label: "Pax", value: "pax" }, { label: "Status", value: "status" },
      ], files.recentFiles),
      reportTable("Top Linked Services", [
        { label: "Service Type", value: "serviceType" }, { label: "Service", value: "name" },
        { label: "Files / Trips", value: "tripCount" }, { label: "Occurrences", value: "occurrences" },
      ], files.topLinkedServices),
    ] },
    { name: "Ratings Overview", tables: [
      metricsTable([
        { label: "Rating Responses", value: ratings.totalResponses }, { label: "Total Ratings", value: ratings.totalRatings },
        { label: "Average Overall Rating", value: ratings.averageOverallRating }, { label: "Best Rated Entity Type", value: ratings.bestRatedEntityType },
        { label: "Most Reviewed Entity Type", value: ratings.mostReviewedEntityType }, { label: "Unmatched Ratings", value: ratings.unmatchedRatings },
      ]),
      reportTable("Ratings by Entity Type", [
        { label: "Entity Type", value: "name" }, { label: "Ratings", value: "ratingCount" },
        { label: "Responses", value: "responseCount" }, { label: "Average", value: "averageRating" },
      ], ratings.ratingsByType),
      reportTable("Top Rated Entities", [{ label: "Entity Type", value: "entityType" }, { label: "Name", value: "name" }, { label: "Ratings", value: "ratingCount" }, { label: "Average", value: "averageRating" }], ratings.topRatedEntities),
      reportTable("Lowest Rated Entities", [{ label: "Entity Type", value: "entityType" }, { label: "Name", value: "name" }, { label: "Ratings", value: "ratingCount" }, { label: "Average", value: "averageRating" }], ratings.lowestRatedEntities),
      nationalityRatingsTable(ratings.ratingsByNationality),
    ] },
    { name: "Hotels", tables: [
      metricsTable([{ label: "Total Hotels", value: hotels.total }, { label: "Average Rate", value: hotels.priceSummary?.averageRate }, { label: "Best Hotel", value: hotels.bestHotel?.name }, { label: "Most Used Hotel", value: getTopName(hotels.rankedByUsage) }]),
      rankingTable("Top Rated Hotels", hotels.rankedByRating), rankingTable("Most Used Hotels", hotels.rankedByUsage),
      rankingTable("Hotels by Linked Group Pax", hotels.hotelsByLinkedGroupPax),
      reportTable("Hotel Usage by Month", [{ label: "Month", value: "month" }, { label: "Hotel", value: "name" }, { label: "Files / Trips", value: "filesHandled" }, { label: "Occurrences", value: "occurrences" }, { label: "Nights", value: "totalNights" }, { label: "Linked Pax", value: "linkedGroupPax" }], hotels.usageByMonth),
      rankingTable("Hotels by City", hotels.byCity), rankingTable("Hotels by Chain", hotels.byChain), rankingTable("Hotels by Stars", hotels.byStars),
      nationalityRatingsTable(hotels.ratingsByNationality), rankingTable("Rates by Board", hotels.ratesByBoard), rankingTable("Rates by Season", hotels.ratesBySeason),
    ] },
    { name: "Guides", tables: [
      metricsTable([{ label: "Total Guides", value: guides.total }, { label: "Best Guide", value: guides.bestGuide?.name }, { label: "Most Languages", value: guides.mostLanguagesGuide?.name }, { label: "Average Guide Cost", value: guides.priceSummary?.averageGuideCost }]),
      rankingTable("Top Rated Guides", guides.rankedByRating), rankingTable("Most Multilingual Guides", guides.rankedByLanguages),
      rankingTable("Most Used Guides", guides.mostUsedGuides), rankingTable("Guides by Pax Handled", guides.guidesByPaxHandled),
      rankingTable("Guide Type Usage", guides.guideTypeUsage), nationalityRatingsTable(guides.ratingsByNationality),
    ] },
    { name: "Restaurants", tables: [
      metricsTable([{ label: "Total Restaurants", value: restaurants.total }, { label: "Average Meal Price", value: restaurants.priceSummary?.averageMealPrice }, { label: "Best Restaurant", value: restaurants.bestRestaurant?.name }, { label: "Most Used Restaurant", value: getTopName(restaurants.rankedByUsage) }]),
      rankingTable("Top Rated Restaurants", restaurants.rankedByRating), rankingTable("Most Used Restaurants", restaurants.rankedByUsage),
      rankingTable("Restaurants by Linked Group Pax", restaurants.restaurantsByLinkedGroupPax), rankingTable("Restaurants by City", restaurants.byCity),
      rankingTable("Meal Types", restaurants.mealTypes), nationalityRatingsTable(restaurants.ratingsByNationality),
    ] },
    { name: "Travel Agents", tables: [
      metricsTable([{ label: "Total Travel Agents", value: agents.total }, { label: "Quotations", value: agents.totalQuotations }, { label: "Files / Trips", value: agents.totalReservationFiles }, { label: "Linked Group Pax", value: agents.totalPax }, { label: "Saved Pricing Total", value: agents.totalPricing, notes: "Not collected revenue" }]),
      rankingTable("Most Active Agents", agents.mostActiveAgents), rankingTable("Agents by Quotations", agents.byQuotations),
      rankingTable("Agents by Files / Trips", agents.byReservationFiles), rankingTable("Agents by Pax", agents.byPax),
      rankingTable("Saved Pricing by Agent", agents.byPricingTotal), rankingTable("Agents by Country", agents.byCountry),
    ] },
    { name: "Places", tables: [
      metricsTable([{ label: "Total Places", value: places.total }, { label: "Average Entrance Fee", value: places.priceSummary?.averageEntranceFee }, { label: "Best Rated Place", value: places.bestPlace?.name }, { label: "Most Used Place", value: getTopName(places.rankedByUsage) }]),
      rankingTable("Top Rated Places", places.rankedByRating), rankingTable("Most Used Places", places.rankedByUsage),
      rankingTable("Places by Linked Group Pax", places.placesByLinkedGroupPax), rankingTable("Places by City", places.byCity),
      rankingTable("Configured Entrance Fees by Nationality", places.feesByNationality), rankingTable("Selected Entrance Fees by Nationality", places.selectedFeesByNationality),
      nationalityRatingsTable(places.ratingsByNationality),
    ] },
    { name: "Transportation Companies", tables: [
      metricsTable([{ label: "Transportation Companies", value: transportation.total }, { label: "Average Configured Rate", value: transportation.priceSummary?.averageRate }, { label: "Average Selected Rate", value: transportation.priceSummary?.averageSelectedRate }, { label: "Best Company", value: transportation.bestTransportationCompany?.name }, { label: "Most Used Company", value: getTopName(transportation.rankedByUsage) }]),
      rankingTable("Top Rated Transportation Companies", transportation.rankedByRating), rankingTable("Most Used Transportation Companies", transportation.rankedByUsage),
      rankingTable("Transportation by Linked Group Pax", transportation.companiesByLinkedGroupPax), rankingTable("Type Usage", transportation.typeUsage),
      rankingTable("Vehicle / Size Usage", transportation.sizeUsage), rankingTable("Rates by Type", transportation.ratesByType),
      rankingTable("Rates by Size", transportation.ratesBySize), nationalityRatingsTable(transportation.ratingsByNationality),
    ] },
    { name: "Today - Current Status", tables: [
      metricsTable([{ label: "Report Date", value: today.date }, { label: "Active Trips Today", value: today.activeTripsCount }, { label: "Active Linked Pax", value: today.activePax }, { label: "Scheduled Days", value: today.scheduledDaysCount }, { label: "Explicit Free Days", value: today.explicitFreeDays, notes: today.freeDayBasis }]),
      reportTable("Active Files / Trips", [{ label: "File", value: "fileReference" }, { label: "Quotation", value: "quotationReference" }, { label: "Status", value: "status" }, { label: "Start", value: row => formatDate(row?.startDate) }, { label: "End", value: row => formatDate(row?.endDate) }, { label: "Pax", value: "pax" }], today.activeTrips),
      rankingTable("Guide Types Today", today.serviceDistribution?.guideTypes), rankingTable("Restaurants Today", today.serviceDistribution?.restaurants),
      rankingTable("Transportation Companies Today", today.serviceDistribution?.transportationCompanies), rankingTable("Places Today", today.serviceDistribution?.places),
      rankingTable("Saved Hotel Options", today.serviceDistribution?.hotelOptions), rankingTable("Today Itinerary", today.serviceDistribution?.itinerary),
    ] },
  ];
};

const REPORT_SECTION_BY_TAB = {
  general: "General",
  users: "Users",
  guests: "Guests - Nationalities",
  filesTrips: "Files - Trips",
  ratingsOverview: "Ratings Overview",
  hotels: "Hotels",
  guides: "Guides",
  restaurants: "Restaurants",
  travelAgents: "Travel Agents",
  places: "Places",
  transportationCompanies: "Transportation Companies",
  today: "Today - Current Status",
};

const reportTitleForTab = activeTab => {
  const label = TABS.find(tab => tab.key === activeTab)?.label || "Analytics";
  return `COE ${label.replace(" / Current Status", "")} Analytics Report`;
};

const getCurrentReportSection = (analytics, activeTab) =>
  buildAnalyticsReport(analytics).find(
    section => section.name === REPORT_SECTION_BY_TAB[activeTab],
  );

const getPdfChartSpecs = (analytics, activeTab) => {
  const data = analytics?.[activeTab] || {};
  const chart = (title, type, rows, valueKey, labelKey = "name") => ({
    title,
    type,
    rows: asArray(rows),
    valueKey,
    labelKey,
  });
  const specs = {
    general: [
      chart("Entity Overview", "bar", data.entityCounts, "value"),
      chart("Quotation Status", "doughnut", data.quotationStatus, "value"),
      chart("Quotation Activity", "line", data.monthlyQuotations, "total", "month"),
    ],
    users: [
      chart("Users by Role", "bar", data.byRole, "value"),
      chart("User Status", "doughnut", data.byStatus, "value"),
      chart("User Creation Trend", "line", data.createdByMonth, "value"),
    ],
    guests: [
      chart("Pax by Nationality", "bar", data.byNationality, "pax"),
      chart("Pax Trend", "line", data.paxByMonth, "pax", "month"),
    ],
    filesTrips: [
      chart("Files / Trips by Month", "line", data.filesByMonth, "files", "month"),
      chart("Files / Trips by Status", "doughnut", data.filesByStatus, "value"),
      chart("Files / Trips by Agent", "bar", data.filesByAgent, "value"),
    ],
    ratingsOverview: [
      chart("Average Rating by Entity Type", "bar", data.ratingsByType, "averageRating"),
      chart("Rating Responses by Type", "doughnut", data.ratingsByType, "ratingCount"),
      chart("Rating Trend", "line", data.ratingTrendByMonth, "averageRating", "month"),
    ],
    hotels: [
      chart("Top Rated Hotels", "bar", data.rankedByRating, "averageRating"),
      chart("Most Used Hotels", "bar", data.rankedByUsage, "tripCount"),
      chart("Hotels by City", "doughnut", data.byCity, "value"),
    ],
    guides: [
      chart("Top Rated Guides", "bar", data.rankedByRating, "averageRating"),
      chart("Most Used Guides", "bar", data.mostUsedGuides, "filesHandled"),
      chart("Most Multilingual Guides", "bar", data.rankedByLanguages, "languageCount"),
    ],
    restaurants: [
      chart("Top Rated Restaurants", "bar", data.rankedByRating, "averageRating"),
      chart("Most Used Restaurants", "bar", data.rankedByUsage, "tripCount"),
      chart("Restaurants by City", "doughnut", data.byCity, "value"),
    ],
    travelAgents: [
      chart("Agents by Files / Trips", "bar", data.byReservationFiles, "reservationFiles"),
      chart("Agents by Quotations", "bar", data.byQuotations, "quotations"),
      chart("Agents by Country", "doughnut", data.byCountry, "value"),
    ],
    places: [
      chart("Top Rated Places", "bar", data.rankedByRating, "averageRating"),
      chart("Most Used Places", "bar", data.rankedByUsage, "tripCount"),
      chart("Places by City", "doughnut", data.byCity, "value"),
    ],
    transportationCompanies: [
      chart("Top Rated Transportation Companies", "bar", data.rankedByRating, "averageRating"),
      chart("Most Used Transportation Companies", "bar", data.rankedByUsage, "tripCount"),
      chart("Transportation Type Usage", "doughnut", data.typeUsage, "value"),
    ],
    today: [
      chart("Restaurants Today", "bar", data.serviceDistribution?.restaurants, "value"),
      chart("Transportation Today", "bar", data.serviceDistribution?.transportationCompanies, "value"),
      chart("Places / Activities Today", "bar", data.serviceDistribution?.places, "value"),
    ],
  };
  return asArray(specs[activeTab]).filter(spec =>
    spec.rows.some(row => toNumber(row?.[spec.valueKey]) > 0),
  );
};

const createPdfChartImage = spec => {
  const rows = spec.rows
    .map(row => ({
      name: friendlyReportValue(row?.[spec.labelKey] || "Unspecified"),
      value: toNumber(row?.[spec.valueKey]),
    }))
    .filter(row => row.value > 0)
    .slice(0, 8);
  if (!rows.length) return null;
  const canvas = document.createElement("canvas");
  canvas.width = 1000;
  canvas.height = 470;
  const context = canvas.getContext("2d");
  const colors = ["#4472C4", "#70AD47", "#ED7D31", "#5B9BD5", "#A5A5A5", "#FFC000", "#8064A2", "#4BACC6"];
  context.fillStyle = "#FFFFFF";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#25324A";
  context.font = "bold 28px Arial";
  context.fillText(spec.title, 42, 46);

  if (spec.type === "doughnut") {
    const total = rows.reduce((sum, row) => sum + row.value, 0);
    let angle = -Math.PI / 2;
    rows.forEach((row, index) => {
      const nextAngle = angle + (row.value / total) * Math.PI * 2;
      context.beginPath();
      context.moveTo(245, 260);
      context.arc(245, 260, 145, angle, nextAngle);
      context.closePath();
      context.fillStyle = colors[index % colors.length];
      context.fill();
      angle = nextAngle;
    });
    context.beginPath();
    context.arc(245, 260, 76, 0, Math.PI * 2);
    context.fillStyle = "#FFFFFF";
    context.fill();
    context.fillStyle = "#25324A";
    context.font = "bold 25px Arial";
    context.textAlign = "center";
    context.fillText(formatNumber(total), 245, 267);
    context.textAlign = "left";
    rows.forEach((row, index) => {
      const yPosition = 105 + index * 42;
      context.fillStyle = colors[index % colors.length];
      context.fillRect(480, yPosition - 17, 22, 22);
      context.fillStyle = "#3F4A5A";
      context.font = "20px Arial";
      context.fillText(`${row.name.slice(0, 28)} — ${formatNumber(row.value)}`, 516, yPosition);
    });
  } else if (spec.type === "line") {
    const max = Math.max(...rows.map(row => row.value), 1);
    const left = 90;
    const top = 95;
    const width = 840;
    const height = 285;
    context.strokeStyle = "#D9DEE8";
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(left, top);
    context.lineTo(left, top + height);
    context.lineTo(left + width, top + height);
    context.stroke();
    context.strokeStyle = "#4472C4";
    context.lineWidth = 5;
    context.beginPath();
    rows.forEach((row, index) => {
      const x = left + (rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width);
      const yPosition = top + height - (row.value / max) * (height - 25);
      if (index === 0) context.moveTo(x, yPosition);
      else context.lineTo(x, yPosition);
    });
    context.stroke();
    rows.forEach((row, index) => {
      const x = left + (rows.length === 1 ? width / 2 : (index / (rows.length - 1)) * width);
      const yPosition = top + height - (row.value / max) * (height - 25);
      context.fillStyle = "#4472C4";
      context.beginPath();
      context.arc(x, yPosition, 7, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#4A5568";
      context.font = "16px Arial";
      context.textAlign = "center";
      context.fillText(row.name.slice(0, 12), x, top + height + 27);
      context.fillText(formatDecimal(row.value), x, yPosition - 14);
    });
    context.textAlign = "left";
  } else {
    const max = Math.max(...rows.map(row => row.value), 1);
    rows.forEach((row, index) => {
      const yPosition = 90 + index * 45;
      const barWidth = (row.value / max) * 570;
      context.fillStyle = "#4A5568";
      context.font = "18px Arial";
      context.fillText(row.name.slice(0, 27), 42, yPosition + 21);
      context.fillStyle = "#E8EDF5";
      context.fillRect(320, yPosition, 570, 28);
      context.fillStyle = colors[index % colors.length];
      context.fillRect(320, yPosition, barWidth, 28);
      context.fillStyle = "#25324A";
      context.font = "bold 17px Arial";
      context.fillText(formatDecimal(row.value), 905, yPosition + 21);
    });
  }
  return canvas.toDataURL("image/png");
};

const xmlEscape = value =>
  String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");

const downloadBlob = (content, type, filename) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const exportAnalyticsExcel = (analytics, activeTab) => {
  const currentSection = getCurrentReportSection(analytics, activeTab);
  if (!currentSection) return;
  const filterSection = buildAnalyticsReport(analytics).find(section => section.name === "Filters");
  const usedSheetNames = new Set();
  const safeSheetName = value => {
    const base = ["\\", "/", ":", "?", "*", "[", "]"]
      .reduce((name, character) => name.replaceAll(character, " "), String(value || "Data"))
      .trim()
      .slice(0, 31) || "Data";
    let name = base;
    let suffix = 2;
    while (usedSheetNames.has(name)) {
      const ending = ` ${suffix}`;
      name = `${base.slice(0, 31 - ending.length)}${ending}`;
      suffix += 1;
    }
    usedSheetNames.add(name);
    return name;
  };
  const workbookSections = [
    {
      name: safeSheetName("Summary"),
      title: `${currentSection.title || currentSection.name} Summary`,
      tables: currentSection.tables.slice(0, 1),
    },
    ...currentSection.tables.slice(1).map(table => ({
      name: safeSheetName(table.title),
      title: table.title,
      tables: [table],
    })),
    {
      name: safeSheetName("Filters"),
      title: "Selected Filters",
      tables: filterSection?.tables || [],
    },
  ];
  const cell = (value, style = "") => {
    const isNumber = typeof value === "number" && Number.isFinite(value);
    const displayValue = isNumber ? value : friendlyReportValue(value ?? "");
    return `<Cell${style ? ` ss:StyleID="${style}"` : ""}><Data ss:Type="${isNumber ? "Number" : "String"}">${xmlEscape(displayValue)}</Data></Cell>`;
  };
  const worksheets = workbookSections.map(section => {
    const maxColumns = Math.max(...section.tables.map(table => table.headers.length), 1);
    const widths = Array.from({ length: maxColumns }, (_, index) => {
      const values = section.tables.flatMap(table => [
        table.headers[index],
        ...table.rows.map(row => row[index]),
      ]).filter(value => value !== undefined && value !== null);
      const longest = Math.max(...values.map(value => String(value).length), 10);
      return Math.min(Math.max(longest * 6.5, 75), 220);
    });
    const columns = widths.map(width => `<Column ss:AutoFitWidth="1" ss:Width="${width}"/>`).join("");
    const tableRows = section.tables.map(table => {
      const columnCount = Math.max(table.headers.length, 1);
      const title = `<Row><Cell ss:StyleID="Section" ss:MergeAcross="${columnCount - 1}"><Data ss:Type="String">${xmlEscape(table.title)}</Data></Cell></Row>`;
      const headers = `<Row>${table.headers.map(header => cell(header, "Header")).join("")}</Row>`;
      const rows = table.rows.length
        ? table.rows.map(row => `<Row>${row.map(value => cell(value)).join("")}</Row>`).join("")
        : `<Row>${cell("No data available")}</Row>`;
      return `${title}${headers}${rows}<Row/>`;
    }).join("");
    const title = section.title || section.name;
    return `<Worksheet ss:Name="${xmlEscape(section.name.slice(0, 31))}"><Table>${columns}<Row><Cell ss:StyleID="Title" ss:MergeAcross="${maxColumns - 1}"><Data ss:Type="String">${xmlEscape(title)}</Data></Cell></Row><Row><Cell ss:StyleID="Subtitle" ss:MergeAcross="${maxColumns - 1}"><Data ss:Type="String">${xmlEscape(`Generated ${new Date(analytics?.generatedAt || Date.now()).toLocaleString()} | Company-scoped analytics report`)}</Data></Cell></Row><Row/>${tableRows}</Table><WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal><TopRowBottomPane>3</TopRowBottomPane><ActivePane>2</ActivePane></WorksheetOptions></Worksheet>`;
  }).join("");
  const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:x="urn:schemas-microsoft-com:office:excel"><Styles><Style ss:ID="Title"><Font ss:Bold="1" ss:Size="16" ss:Color="#FFFFFF"/><Interior ss:Color="#2F5597" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style><Style ss:ID="Subtitle"><Font ss:Italic="1" ss:Color="#44546A"/></Style><Style ss:ID="Section"><Font ss:Bold="1" ss:Size="12" ss:Color="#1F1F1F"/><Interior ss:Color="#D9EAF7" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/></Style><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#4472C4" ss:Pattern="Solid"/><Alignment ss:Vertical="Center"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/><Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/></Borders></Style></Styles>${worksheets}</Workbook>`;
  downloadBlob(
    workbook,
    "application/vnd.ms-excel;charset=utf-8",
    `coe-${activeTab}-analytics-${new Date().toISOString().slice(0, 10)}.xls`,
  );
};

const exportAnalyticsPdf = (analytics, activeTab) => {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const margin = 44;
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentWidth = pageWidth - margin * 2;
  const bottomMargin = 46;
  const tableSpacingBefore = 16;
  const tableSpacingAfter = 20;
  const subsectionSpacingAfter = 9;
  const cellPaddingX = 6;
  const cellPaddingY = 6;
  const tableFontSize = 7.5;
  const tableLineHeight = 9.5;
  let y = margin;
  let currentSection = "";

  const setText = (size = 9, bold = false, color = [45, 55, 72]) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };
  const addSectionPage = (title, continued = false) => {
    doc.addPage();
    currentSection = title;
    doc.setFillColor(47, 85, 151);
    doc.rect(0, 0, pageWidth, 74, "F");
    setText(16, true, [255, 255, 255]);
    doc.text(`${title}${continued ? " (continued)" : ""}`, margin, 44);
    y = 104;
  };
  const ensureSpace = height => {
    if (y + height > pageHeight - bottomMargin) {
      addSectionPage(currentSection, true);
      return false;
    }
    return true;
  };
  const drawText = (text, size = 9, bold = false, width = contentWidth) => {
    setText(size, bold);
    const lines = doc.splitTextToSize(String(text ?? ""), width);
    ensureSpace(lines.length * (size + 3) + 4);
    setText(size, bold);
    doc.text(lines, margin, y);
    y += lines.length * (size + 3) + 4;
  };
  const wrapCell = (value, width) =>
    doc.splitTextToSize(friendlyReportValue(value), Math.max(width - cellPaddingX * 2, 20));
  const tableWidths = columnCount => {
    if (columnCount === 2) return [contentWidth * 0.42, contentWidth * 0.58];
    if (columnCount === 3) return [contentWidth * 0.34, contentWidth * 0.20, contentWidth * 0.46];
    return Array.from({ length: columnCount }, () => contentWidth / columnCount);
  };
  const measureTableHeader = (headers, widths) => {
    setText(tableFontSize, true, [255, 255, 255]);
    const headerLines = headers.map((header, index) =>
      wrapCell(header, widths[index]),
    );
    return {
      lines: headerLines,
      height:
        Math.max(...headerLines.map(lines => lines.length), 1) * tableLineHeight +
        cellPaddingY * 2,
    };
  };
  const measureTableRow = (row, widths) => {
    setText(tableFontSize, false, [45, 55, 72]);
    const lines = widths.map((width, index) => wrapCell(row[index], width));
    return {
      lines,
      height:
        Math.max(...lines.map(cellLines => cellLines.length), 1) * tableLineHeight +
        cellPaddingY * 2,
    };
  };
  const drawTableHeader = (headers, widths, measurement) => {
    setText(tableFontSize, true, [255, 255, 255]);
    let x = margin;
    headers.forEach((header, index) => {
      doc.setFillColor(68, 114, 196);
      doc.setDrawColor(255, 255, 255);
      doc.rect(x, y, widths[index], measurement.height, "FD");
      doc.text(
        measurement.lines[index],
        x + cellPaddingX,
        y + cellPaddingY + tableLineHeight - 2,
      );
      x += widths[index];
    });
    y += measurement.height;
  };
  const drawSubsectionTitle = (title, continued = false) => {
    setText(11, true);
    const lines = doc.splitTextToSize(
      `${title}${continued ? " (continued)" : ""}`,
      contentWidth,
    );
    doc.text(lines, margin, y);
    y += lines.length * 14 + subsectionSpacingAfter;
  };
  const drawTable = (table, { rowLimit = 10, columnLimit = 6 } = {}) => {
    const headers = table.headers.slice(0, columnLimit);
    const rows = table.rows.slice(0, rowLimit).map(row => row.slice(0, columnLimit));
    const widths = tableWidths(headers.length);
    const headerMeasurement = measureTableHeader(headers, widths);
    const firstRowMeasurement = rows.length
      ? measureTableRow(rows[0], widths)
      : { height: 30 };
    const titleLines = doc.splitTextToSize(String(table.title), contentWidth);
    const minimumTableHeight =
      tableSpacingBefore +
      titleLines.length * 14 +
      subsectionSpacingAfter +
      headerMeasurement.height +
      firstRowMeasurement.height;
    ensureSpace(minimumTableHeight);
    y += tableSpacingBefore;
    drawSubsectionTitle(table.title);
    if (!rows.length) {
      doc.setFillColor(246, 248, 251);
      doc.setDrawColor(215, 220, 228);
      doc.roundedRect(margin, y, contentWidth, 30, 3, 3, "FD");
      setText(8.5, false, [95, 105, 120]);
      doc.text("No data available for the selected filters.", margin + 10, y + 19);
      y += 30 + tableSpacingAfter;
      return;
    }
    drawTableHeader(headers, widths, headerMeasurement);
    rows.forEach((row, rowIndex) => {
      setText(tableFontSize, false, [45, 55, 72]);
      const measurement = measureTableRow(row, widths);
      if (y + measurement.height > pageHeight - bottomMargin) {
        addSectionPage(currentSection, true);
        drawSubsectionTitle(table.title, true);
        drawTableHeader(headers, widths, headerMeasurement);
      }
      let x = margin;
      headers.forEach((_, index) => {
        doc.setFillColor(...(rowIndex % 2 ? [248, 250, 253] : [255, 255, 255]));
        doc.setDrawColor(216, 221, 230);
        doc.rect(x, y, widths[index], measurement.height, "FD");
        doc.text(
          measurement.lines[index],
          x + cellPaddingX,
          y + cellPaddingY + tableLineHeight - 2,
        );
        x += widths[index];
      });
      y += measurement.height;
    });
    y += tableSpacingAfter;
    if (table.rows.length > rowLimit) {
      drawText(`Showing top ${rowLimit} of ${table.rows.length} records. The Excel report contains the detailed table.`, 7.5, false);
    }
    if (table.headers.length > columnLimit) {
      drawText("Additional columns are available in the Excel report.", 7.5, false);
    }
  };
  const drawKpiCards = table => {
    const cards = asArray(table?.rows).slice(0, 6);
    if (!cards.length) {
      drawText("No data available for the selected filters.", 10, false);
      return;
    }
    const gap = 14;
    const cardWidth = (contentWidth - gap) / 2;
    const cardHeight = 92;
    cards.forEach((row, index) => {
      if (index % 2 === 0) ensureSpace(cardHeight + gap);
      const column = index % 2;
      const x = margin + column * (cardWidth + gap);
      const cardY = y;
      doc.setFillColor(246, 249, 253);
      doc.setDrawColor(205, 215, 230);
      doc.roundedRect(x, cardY, cardWidth, cardHeight, 5, 5, "FD");
      setText(8.5, true, [68, 85, 112]);
      const labelLines = doc.splitTextToSize(friendlyReportValue(row[0]), cardWidth - 20);
      doc.text(labelLines, x + 10, cardY + 17);
      setText(16, true, [47, 85, 151]);
      const valueLines = doc.splitTextToSize(friendlyReportValue(row[1]), cardWidth - 20);
      doc.text(valueLines.slice(0, 2), x + 10, cardY + 43);
      setText(7.5, false, [100, 110, 125]);
      const noteLines = doc.splitTextToSize(friendlyReportValue(row[2] || ""), cardWidth - 20);
      doc.text(noteLines.slice(0, 2), x + 10, cardY + 72);
      if (column === 1 || index === cards.length - 1) y += cardHeight + gap;
    });
  };
  const drawChart = spec => {
    const image = createPdfChartImage(spec);
    if (!image) return;
    const chartHeight = 238;
    ensureSpace(chartHeight + 22);
    doc.setDrawColor(210, 218, 230);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(margin, y, contentWidth, chartHeight, 4, 4, "FD");
    doc.addImage(image, "PNG", margin + 8, y + 8, contentWidth - 16, chartHeight - 16);
    y += chartHeight + 22;
  };

  const report = buildAnalyticsReport(analytics);
  const filterTable = report.find(section => section.name === "Filters")?.tables[0];
  const selectedSection = getCurrentReportSection(analytics, activeTab);
  if (!selectedSection) return;
  const summaryTable = selectedSection.tables[0];
  const reportTitle = reportTitleForTab(activeTab);
  const dataBasis = analytics?.[activeTab]?.dataBasis || TAB_DATA_BASIS[activeTab];
  const selectedHasData = selectedSection.tables.some(table =>
    table.rows.some(row =>
      row.slice(1).some(value =>
        value !== "" &&
        value !== null &&
        value !== undefined &&
        value !== 0 &&
        value !== "No data",
      ),
    ),
  );

  doc.setFillColor(47, 85, 151);
  doc.rect(0, 0, pageWidth, 178, "F");
  setText(22, true, [255, 255, 255]);
  const titleLines = doc.splitTextToSize(reportTitle, contentWidth);
  doc.text(titleLines, margin, 68);
  setText(11, false, [225, 235, 250]);
  doc.text(`Generated ${new Date(analytics?.generatedAt || Date.now()).toLocaleString()}`, margin, 115);
  doc.text("Company-scoped analytics based on the current user's authorized company data.", margin, 140);
  currentSection = "Report Overview";
  y = 218;
  drawText("Active Filters", 14, true);
  drawTable(filterTable, { rowLimit: 20, columnLimit: 2 });
  drawText("Data Basis", 12, true);
  drawText(dataBasis || "Current company analytics data for the selected filters.", 9, false);

  addSectionPage("Executive Summary");
  drawText(`Key performance indicators for ${TABS.find(tab => tab.key === activeTab)?.label || "this section"}.`, 9, false);
  if (selectedHasData) drawKpiCards(summaryTable);
  else drawText("No data available for the selected filters.", 10, false);

  const chartSpecs = getPdfChartSpecs(analytics, activeTab);
  if (selectedHasData && chartSpecs.length) {
    addSectionPage("Visual Insights");
    drawText("Charts highlight the most important rankings, distributions, and trends for this report.", 9, false);
    chartSpecs.slice(0, 3).forEach(drawChart);
  }

  const importantTables = selectedSection.tables.slice(1, 6);
  if (selectedHasData && importantTables.length) {
    addSectionPage(selectedSection.title || selectedSection.name.replaceAll(" - ", " / "));
    drawText("Detailed business tables for the selected Analytics tab.", 9, false);
    importantTables.forEach(table => drawTable(table, { rowLimit: 10, columnLimit: 6 }));
  }

  const pageCount = doc.getNumberOfPages();
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(215, 220, 228);
    doc.line(margin, pageHeight - 30, pageWidth - margin, pageHeight - 30);
    setText(7.5, false, [110, 120, 135]);
    doc.text(reportTitle, margin, pageHeight - 16);
    doc.text(`Page ${page} of ${pageCount}`, pageWidth - margin, pageHeight - 16, { align: "right" });
  }
  doc.save(`coe-${activeTab}-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
};

const EmptyState = ({ label }) => (
  <div className="analytics-empty-state">
    <i className="bx bx-bar-chart-square" />
    <span>{label}</span>
  </div>
);

EmptyState.propTypes = {
  label: PropTypes.string.isRequired,
};

const CardHeaderBlock = ({ title, subtitle, badge = "" }) => (
  <div className="dashboard-card__header">
    <div>
      <h4 className="dashboard-card__title">{title}</h4>
      <p className="dashboard-card__subtitle mb-0">{subtitle}</p>
    </div>
    {badge ? (
      <Badge color="light" className="dashboard-card__badge">
        {badge}
      </Badge>
    ) : null}
  </div>
);

CardHeaderBlock.propTypes = {
  badge: PropTypes.string,
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

const StatCard = ({
  icon,
  label,
  value,
  footer = "",
  accentClass = "primary",
  valueType = "number",
}) => (
  <Card className="dashboard-stat-card h-100">
    <CardBody>
      <div className="dashboard-stat-card__top">
        <div>
          <span className="dashboard-stat-card__label">{label}</span>
          <h3 className="dashboard-stat-card__value mb-1">
            {formatMetric(value, valueType)}
          </h3>
          <p className="dashboard-stat-card__footer mb-0">{footer}</p>
        </div>
        <div className={`dashboard-stat-card__icon ${accentClass}`}>
          <i className={icon} />
        </div>
      </div>
    </CardBody>
  </Card>
);

StatCard.propTypes = {
  accentClass: PropTypes.string,
  footer: PropTypes.string,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  valueType: PropTypes.string,
};

const SummaryCards = ({ cards }) => (
  <Row className="g-4 mb-4">
    {asArray(cards).map((card, index) => (
      <Col xl={3} md={6} key={`${card.label}-${index}`}>
        <StatCard
          icon={card.icon || "bx bx-bar-chart"}
          label={card.label}
          value={card.value}
          footer={card.footer || ""}
          accentClass={card.accentClass || "primary"}
          valueType={card.valueType || (String(card.label).toLowerCase().includes("total") ? "money" : "number")}
        />
      </Col>
    ))}
  </Row>
);

SummaryCards.propTypes = {
  cards: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const buildBarOption = ({ rows, valueField, nameField, valueType, horizontal }) => {
  const labels = rows.map(row => row[nameField] || row.name || "Unspecified");
  const values = rows.map(row => toNumber(row[valueField]));

  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(16,24,40,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: params => {
        const item = Array.isArray(params) ? params[0] : params;
        return `${item.name}<br/>${formatMetric(item.value, valueType)}`;
      },
    },
    grid: {
      left: horizontal ? 118 : 28,
      right: 20,
      top: 28,
      bottom: horizontal ? 18 : 58,
      containLabel: true,
    },
    xAxis: horizontal
      ? {
          type: "value",
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "rgba(166,176,207,0.16)" } },
          axisLabel: { color: "#6c757d" },
        }
      : {
          type: "category",
          data: labels,
          axisTick: { show: false },
          axisLabel: { color: "#6c757d", interval: 0, rotate: labels.length > 5 ? 28 : 0 },
          axisLine: { lineStyle: { color: "rgba(166,176,207,0.35)" } },
        },
    yAxis: horizontal
      ? {
          type: "category",
          data: labels,
          axisTick: { show: false },
          axisLabel: { color: "#6c757d" },
          axisLine: { lineStyle: { color: "rgba(166,176,207,0.35)" } },
        }
      : {
          type: "value",
          axisLine: { show: false },
          axisLabel: { color: "#6c757d" },
          splitLine: { lineStyle: { color: "rgba(166,176,207,0.16)" } },
        },
    series: [
      {
        type: "bar",
        barMaxWidth: 34,
        data: values,
        itemStyle: { borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0] },
      },
    ],
  };
};

const buildLineOption = ({ rows, fields, nameField }) => ({
  color: CHART_COLORS,
  tooltip: {
    trigger: "axis",
    backgroundColor: "rgba(16,24,40,0.92)",
    borderWidth: 0,
    textStyle: { color: "#fff" },
  },
  legend: {
    top: 0,
    right: 0,
    icon: "circle",
    textStyle: { color: "#6c757d" },
  },
  grid: { left: 28, right: 20, top: 52, bottom: 24, containLabel: true },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: rows.map(row => row[nameField] || row.name),
    axisLine: { lineStyle: { color: "rgba(166,176,207,0.35)" } },
    axisTick: { show: false },
    axisLabel: { color: "#6c757d" },
  },
  yAxis: {
    type: "value",
    splitLine: { lineStyle: { color: "rgba(166,176,207,0.16)" } },
    axisLine: { show: false },
    axisLabel: { color: "#6c757d" },
  },
  series: fields.map((field, index) => ({
    name: field.label,
    type: "line",
    smooth: true,
    symbol: "circle",
    symbolSize: 7,
    lineStyle: { width: 3, type: field.dashed ? "dashed" : "solid" },
    areaStyle:
      index === 0
        ? {
            color: "rgba(85,110,230,0.10)",
          }
        : undefined,
    data: rows.map(row => toNumber(row[field.key])),
  })),
});

const BarChartCard = ({
  title,
  subtitle,
  badge = "",
  rows = [],
  valueField = "value",
  nameField = "name",
  valueType = "number",
  horizontal = false,
}) => {
  const cleanRows = asArray(rows).filter(row => row && row[nameField || "name"] !== "");
  const option = useMemo(
    () =>
      buildBarOption({
        rows: cleanRows,
        valueField,
        nameField,
        valueType,
        horizontal,
      }),
    [cleanRows, horizontal, nameField, valueField, valueType],
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
        {cleanRows.length ? (
          <ReactEcharts option={option} style={{ height: horizontal ? 350 : 320 }} />
        ) : (
          <EmptyState label="No rows available yet" />
        )}
      </CardBody>
    </Card>
  );
};

BarChartCard.propTypes = {
  badge: PropTypes.string,
  horizontal: PropTypes.bool,
  nameField: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  valueField: PropTypes.string,
  valueType: PropTypes.string,
};

const LineChartCard = ({
  title,
  subtitle,
  badge = "",
  rows = [],
  fields,
  nameField = "month",
}) => {
  const cleanRows = asArray(rows);
  const option = useMemo(
    () => buildLineOption({ rows: cleanRows, fields, nameField }),
    [cleanRows, fields, nameField],
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
        {cleanRows.length ? (
          <ReactEcharts option={option} style={{ height: 340 }} />
        ) : (
          <EmptyState label="No timeline rows available yet" />
        )}
      </CardBody>
    </Card>
  );
};

LineChartCard.propTypes = {
  badge: PropTypes.string,
  fields: PropTypes.arrayOf(PropTypes.object).isRequired,
  nameField: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

const DoughnutCard = ({
  title,
  subtitle,
  badge = "",
  rows = [],
  centerLabel = "",
  centerValue = 0,
}) => {
  const cleanRows = asArray(rows).filter(row => toNumber(row.value) > 0);
  const data = useMemo(
    () => ({
      labels: cleanRows.map(row => row.name),
      datasets: [
        {
          data: cleanRows.map(row => row.value),
          backgroundColor: CHART_COLORS,
          borderColor: "#fff",
          borderWidth: 4,
          hoverOffset: 10,
        },
      ],
    }),
    [cleanRows],
  );
  const options = useMemo(
    () => ({
      cutout: "64%",
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            color: "#6c757d",
            padding: 16,
          },
        },
      },
    }),
    [],
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
        {cleanRows.length ? (
          <div className="dashboard-doughnut-panel__chart dashboard-doughnut-panel__chart--compact">
            <Doughnut data={data} options={options} />
            {centerLabel ? (
              <div className="dashboard-doughnut-center">
                <strong>{formatNumber(centerValue)}</strong>
                <span>{centerLabel}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState label="No distribution rows available yet" />
        )}
      </CardBody>
    </Card>
  );
};

DoughnutCard.propTypes = {
  badge: PropTypes.string,
  centerLabel: PropTypes.string,
  centerValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  rows: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

const RankingList = ({
  rows = [],
  valueField = "value",
  valueType = "number",
  secondary = null,
}) => {
  const cleanRows = asArray(rows);
  const max = Math.max(...cleanRows.map(row => toNumber(row[valueField])), 1);

  if (!cleanRows.length) return <EmptyState label="No ranked rows available yet" />;

  return (
    <div className="dashboard-ranking-list">
      {cleanRows.map((row, index) => (
        <div key={`${row.name}-${index}`} className="dashboard-ranking-list__item">
          <div className="dashboard-ranking-list__head">
            <div className="dashboard-ranking-list__title">
              <span
                className="dashboard-ranking-list__swatch"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span>{row.name}</span>
            </div>
            <strong>{formatMetric(row[valueField], valueType)}</strong>
          </div>
          <div className="dashboard-progress mt-2">
            <span
              className="dashboard-progress__fill"
              style={{
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                width: `${Math.max(6, (toNumber(row[valueField]) / max) * 100)}%`,
              }}
            />
          </div>
          {secondary ? (
            <div className="dashboard-status-line">
              {secondary.map(item => (
                <span key={item.label}>
                  {item.label}: {formatMetric(row[item.field], item.type)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

RankingList.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  secondary: PropTypes.arrayOf(PropTypes.object),
  valueField: PropTypes.string,
  valueType: PropTypes.string,
};

const RankingCard = ({
  title,
  subtitle,
  badge = "",
  rows = [],
  valueField = "value",
  valueType = "number",
  secondary = null,
}) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
      <RankingList
        rows={rows}
        valueField={valueField}
        valueType={valueType}
        secondary={secondary}
      />
    </CardBody>
  </Card>
);

RankingCard.propTypes = {
  badge: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  secondary: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  valueField: PropTypes.string,
  valueType: PropTypes.string,
};

const InsightGrid = ({ items }) => (
  <Row className="g-4 mb-4">
    {items.map((item, index) => (
      <Col xl={3} md={6} key={`${item.label}-${index}`}>
        <div className={`dashboard-insight-card h-100 ${item.className || ""}`}>
          <span className="dashboard-insight-card__label">{item.label}</span>
          <strong>{formatMetric(item.value, item.type)}</strong>
          <p className="mb-0">{item.footer}</p>
        </div>
      </Col>
    ))}
  </Row>
);

InsightGrid.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const ResearchPanel = ({ tabKey }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Internet-informed analysis"
        subtitle="External KPI patterns mapped to the data this system already stores."
        badge="Research"
      />
      <div className="analytics-research-list">
        {asArray(RESEARCH_NOTES[tabKey]).map(item => (
          <div key={item.title} className="dashboard-ranking-list__item">
            <div className="dashboard-ranking-list__head">
              <strong>{item.title}</strong>
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.source}
              </a>
            </div>
            <p className="mb-0 mt-2 text-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </CardBody>
  </Card>
);

ResearchPanel.propTypes = {
  tabKey: PropTypes.string.isRequired,
};

const DataQualityPanel = ({ dataQuality = {} }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Data Quality"
        subtitle="Completeness, uniqueness, coverage, and freshness checks for the dashboard grain."
        badge={`${asArray(dataQuality?.checks).length} checks`}
      />
      <div className="dashboard-ranking-list">
        {asArray(dataQuality?.checks).map(check => (
          <div key={check.label} className="dashboard-ranking-list__item">
            <div className="dashboard-ranking-list__head">
              <div>
                <strong>{check.label}</strong>
                <p className="mb-0 text-muted">{check.detail}</p>
              </div>
              <Badge color={check.status === "ok" ? "success" : "warning"}>
                {check.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  </Card>
);

DataQualityPanel.propTypes = {
  dataQuality: PropTypes.object,
};

const ProfileTable = ({ rows = [] }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Collection Profile"
        subtitle="Rows and latest observed changes by source collection."
        badge={`${asArray(rows).length} collections`}
      />
      <div className="table-responsive">
        <Table className="table-nowrap align-middle mb-0">
          <thead>
            <tr>
              <th>Collection</th>
              <th className="text-end">Rows</th>
              <th>Latest change</th>
            </tr>
          </thead>
          <tbody>
            {asArray(rows).map(row => (
              <tr key={row.name}>
                <td className="fw-semibold">{row.name}</td>
                <td className="text-end">{formatNumber(row.value)}</td>
                <td>{formatDate(row.latestChange)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);

ProfileTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
};

const RecentUsersTable = ({ users = [] }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Recent Users"
        subtitle="Latest active user records captured in the company account."
        badge={`${asArray(users).length} shown`}
      />
      <div className="table-responsive">
        <Table className="table-nowrap align-middle mb-0">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {asArray(users).map(user => (
              <tr key={`${user.email}-${user.createdOn}`}>
                <td className="fw-semibold">{user.name || "-"}</td>
                <td>{user.email || "-"}</td>
                <td>{asArray(user.roles).join(", ") || "-"}</td>
                <td>{formatDate(user.createdOn)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);

RecentUsersTable.propTypes = {
  users: PropTypes.arrayOf(PropTypes.object),
};

const GeneralTab = ({ analytics }) => {
  const general = analytics.general || {};
  return (
    <>
      <SummaryCards cards={general.summaryCards || []} />
      <Row className="g-4 mb-4">
        <Col xl={7}>
          <LineChartCard
            title="Quotation Activity"
            subtitle="Monthly quotation volume and pricing progress."
            badge={`${formatNumber(asArray(general.monthlyQuotations).length)} months`}
            rows={general.monthlyQuotations}
            fields={[
              { key: "total", label: "Total" },
              { key: "APPROVED", label: "Approved" },
              { key: "SEND_FOR_PRICING", label: "Sent for pricing" },
              { key: "CANCELLED", label: "Cancelled", dashed: true },
            ]}
          />
        </Col>
        <Col xl={5}>
          <DoughnutCard
            title="Quotation Status"
            subtitle="Active quotation split by workflow state."
            badge={`${formatNumber(asArray(general.quotationStatus).length)} statuses`}
            rows={general.quotationStatus}
            centerLabel="Quotes"
            centerValue={asArray(general.quotationStatus).reduce(
              (sum, row) => sum + toNumber(row.value),
              0,
            )}
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={6}>
          <BarChartCard
            title="System Entity Counts"
            subtitle="Inventory and supplier records available for analysis."
            badge="Counts"
            rows={general.entityCounts}
            horizontal
          />
        </Col>
        <Col xl={6}>
          <BarChartCard
            title="Pricing Breakdown"
            subtitle="Saved quotation pricing snapshot totals."
            badge={formatMoney(general.priceSummary?.finalTotal)}
            rows={general.pricingBreakdown}
            valueType="money"
            horizontal
          />
        </Col>
      </Row>
      <InsightGrid
        items={[
          {
            label: "Base total",
            value: general.priceSummary?.baseTotal,
            type: "money",
            footer: "Before profit",
          },
          {
            label: "Profit total",
            value: general.priceSummary?.profitTotal,
            type: "money",
            footer: "Saved pricing rows",
            className: "success",
          },
          {
            label: "Average meal",
            value: general.priceSummary?.averageMealPrice,
            type: "money",
            footer: "From restaurant meals and itinerary rows",
          },
          {
            label: "Average transport",
            value: general.priceSummary?.averageTransportRate,
            type: "money",
            footer: "From resolved quotation-day rates",
          },
        ]}
      />
      <Row className="g-4">
        <Col xl={6}>
          <DataQualityPanel dataQuality={analytics.dataQuality} />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="general" />
        </Col>
      </Row>
    </>
  );
};

GeneralTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const UsersTab = ({ analytics }) => {
  const users = analytics.users || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Total users", value: users.total, footer: "All company users" },
          { label: "Active users", value: users.active, footer: "Can use the system", className: "success" },
          { label: "Inactive users", value: users.inactive, footer: "Soft-disabled accounts" },
          { label: "Role assignments", value: users.roleAssignments, footer: "Total roles assigned" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={5}>
          <DoughnutCard
            title="Roles"
            subtitle="Most common operational roles among active users."
            badge={`${formatNumber(users.active)} active`}
            rows={users.byRole}
            centerLabel="Users"
            centerValue={users.total}
          />
        </Col>
        <Col xl={7}>
          <LineChartCard
            title="User Creation"
            subtitle="New user records by month."
            badge={`${formatNumber(asArray(users.createdByMonth).length)} months`}
            rows={users.createdByMonth}
            fields={[{ key: "value", label: "Users" }]}
            nameField="name"
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="User Status"
            subtitle="Active and inactive account split."
            rows={users.byStatus}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Most Roles"
            subtitle="Role assignment counts across active users."
            rows={users.byRole}
          />
        </Col>
        <Col xl={4}>
          <ResearchPanel tabKey="users" />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={8}>
          <RecentUsersTable users={users.recentUsers} />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="User Data Gaps"
            subtitle="Quality issues found in user records."
            rows={[
              { name: "Missing email", value: users.quality?.missingEmail },
              { name: "Missing name", value: users.quality?.missingName },
              { name: "Missing roles", value: users.quality?.missingRoles },
              { name: "Duplicate emails", value: users.quality?.duplicateEmails },
            ]}
          />
        </Col>
      </Row>
    </>
  );
};

UsersTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const ratingValue = value => (toNumber(value) > 0 ? formatDecimal(value) : "-");

const GuestsNationalitiesTab = ({
  analytics,
  filterDraft,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const guests = analytics.guests || {};
  const nationalities = asArray(guests.byNationality);
  const ratings = asArray(guests.ratingsByNationality);
  const trend = asArray(guests.paxByMonth);
  const recentActivity = asArray(guests.recentActivity);
  const invalidDateRange = Boolean(
    filterDraft.from && filterDraft.to && filterDraft.from > filterDraft.to,
  );

  return (
    <>
      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Guest and Nationality Filters"
            subtitle="Shared date range: this section and Files / Trips use quotation start dates; Ratings Overview uses submission dates."
            badge="Real quotation data"
          />
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Label className="form-label">From</Label>
              <Input
                type="date"
                value={filterDraft.from}
                onChange={event => onFilterChange("from", event.target.value)}
              />
            </Col>
            <Col md={4}>
              <Label className="form-label">To</Label>
              <Input
                type="date"
                value={filterDraft.to}
                onChange={event => onFilterChange("to", event.target.value)}
              />
            </Col>
            <Col md={4} className="d-flex gap-2">
              <Button
                color="primary"
                onClick={onApplyFilters}
                disabled={invalidDateRange}
              >
                Apply
              </Button>
              <Button color="light" className="border" onClick={onClearFilters}>
                Clear
              </Button>
            </Col>
          </Row>
          {invalidDateRange ? (
            <Alert color="warning" className="mt-3 mb-0">
              The From date must be before the To date.
            </Alert>
          ) : null}
          <p className="text-muted small mb-0 mt-3">{guests.dataBasis}</p>
        </CardBody>
      </Card>

      <InsightGrid
        items={[
          {
            label: "Total pax",
            value: guests.totalPax,
            footer: `${formatNumber(guests.quotationCount)} quotations`,
          },
          {
            label: "Top nationality",
            value: guests.topNationality,
            type: "text",
            footer: "Based on quotation pax",
            className: "success",
          },
          {
            label: "Nationalities",
            value: guests.nationalityCount,
            footer: "Known quotation nationalities",
          },
          {
            label: "Rated responses",
            value: guests.totalRatedResponses,
            footer: `${formatNumber(guests.recordedCustomerProfiles)} identified customer profiles`,
          },
        ]}
      />

      <Row className="g-4 mb-4">
        <Col xl={5}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Pax by Nationality"
                subtitle="Nationality and pax are taken directly from quotations."
                badge={`${formatNumber(nationalities.length)} rows`}
              />
              {nationalities.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Nationality</th>
                        <th className="text-end">Pax</th>
                        <th className="text-end">Quotes</th>
                        <th className="text-end">Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {nationalities.map(row => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.pax)}</td>
                          <td className="text-end">{formatNumber(row.quotations)}</td>
                          <td className="text-end">{formatDecimal(row.sharePercent)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No quotation nationality data is available." />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={7}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Pax Trend"
                subtitle="Trip volume grouped by quotation start month."
                badge={`${formatNumber(trend.length)} months`}
              />
              {trend.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th className="text-end">Quotations</th>
                        <th className="text-end">Pax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {trend.map(row => (
                        <tr key={row.month}>
                          <td>{row.month}</td>
                          <td className="text-end">{formatNumber(row.quotations)}</td>
                          <td className="text-end">{formatNumber(row.pax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No pax trend is available for this range." />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Ratings by Nationality"
            subtitle="Customer nationality is linked from evaluation response to reservation file and quotation."
            badge={`${formatNumber(guests.totalRatedResponses)} responses`}
          />
          {ratings.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nationality</th>
                    <th className="text-end">Responses</th>
                    <th className="text-end">Overall</th>
                    <th className="text-end">Hotels</th>
                    <th className="text-end">Restaurants</th>
                    <th className="text-end">Guides</th>
                    <th className="text-end">Transportation</th>
                    <th className="text-end">Places</th>
                  </tr>
                </thead>
                <tbody>
                  {ratings.map(row => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.ratedResponses)}</td>
                      <td className="text-end">{ratingValue(row.overallAverage)}</td>
                      <td className="text-end">{ratingValue(row.hotelAverage)}</td>
                      <td className="text-end">{ratingValue(row.restaurantAverage)}</td>
                      <td className="text-end">{ratingValue(row.guideAverage)}</td>
                      <td className="text-end">{ratingValue(row.transportationAverage)}</td>
                      <td className="text-end">{ratingValue(row.placeAverage)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No approved rating responses are linked to quotation nationalities." />
          )}
        </CardBody>
      </Card>

      <Card className="dashboard-card">
        <CardBody>
          <CardHeaderBlock
            title="Recent Guest Activity"
            subtitle="Recent quotation trips with their real pax and nationality data."
            badge={`${formatNumber(recentActivity.length)} recent`}
          />
          {recentActivity.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Quotation</th>
                    <th>Reservation File</th>
                    <th>Nationality</th>
                    <th className="text-end">Pax</th>
                    <th>Trip Start</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentActivity.map((row, index) => (
                    <tr key={`${row.quotationReference}-${index}`}>
                      <td>{row.quotationReference || "-"}</td>
                      <td>{row.fileReference || "-"}</td>
                      <td>{row.nationality}</td>
                      <td className="text-end">{formatNumber(row.pax)}</td>
                      <td>{formatDate(row.tripStart)}</td>
                      <td>{row.status || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No guest activity is available for this range." />
          )}
        </CardBody>
      </Card>
    </>
  );
};

GuestsNationalitiesTab.propTypes = {
  analytics: PropTypes.object.isRequired,
  filterDraft: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
};

const FilesTripsTab = ({
  analytics,
  filterDraft,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const filesTrips = analytics.filesTrips || {};
  const monthly = asArray(filesTrips.filesByMonth);
  const recentFiles = asArray(filesTrips.recentFiles);
  const linkedServices = asArray(filesTrips.topLinkedServices);
  const invalidDateRange = Boolean(
    filterDraft.from && filterDraft.to && filterDraft.from > filterDraft.to,
  );

  return (
    <>
      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Files / Trips Filters"
            subtitle="Shared date range: Files / Trips and Guests use quotation start dates; Ratings Overview uses submission dates."
            badge="Reservation file data"
          />
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Label className="form-label">From</Label>
              <Input
                type="date"
                value={filterDraft.from}
                onChange={event => onFilterChange("from", event.target.value)}
              />
            </Col>
            <Col md={4}>
              <Label className="form-label">To</Label>
              <Input
                type="date"
                value={filterDraft.to}
                onChange={event => onFilterChange("to", event.target.value)}
              />
            </Col>
            <Col md={4} className="d-flex gap-2">
              <Button
                color="primary"
                onClick={onApplyFilters}
                disabled={invalidDateRange}
              >
                Apply
              </Button>
              <Button color="light" className="border" onClick={onClearFilters}>
                Clear
              </Button>
            </Col>
          </Row>
          {invalidDateRange ? (
            <Alert color="warning" className="mt-3 mb-0">
              The From date must be before the To date.
            </Alert>
          ) : null}
          <p className="text-muted small mb-0 mt-3">{filesTrips.dataBasis}</p>
        </CardBody>
      </Card>

      <InsightGrid
        items={[
          {
            label: "Files / trips",
            value: filesTrips.totalFilesTrips,
            footer: "Reservation files linked to quotations",
          },
          {
            label: "Quotations",
            value: filesTrips.totalQuotations,
            footer: "Quotation trips in the selected range",
          },
          {
            label: "Total pax",
            value: filesTrips.totalPax,
            footer: `${formatDecimal(filesTrips.averagePaxPerTrip)} average per file`,
            className: "success",
          },
          {
            label: "Average duration",
            value: filesTrips.averageTripDuration,
            footer: "Days per reservation file trip",
          },
        ]}
      />

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <LineChartCard
            title="Files / Trips by Month"
            subtitle="Reservation files grouped by linked quotation start month."
            badge={`${formatNumber(monthly.length)} months`}
            rows={monthly}
            fields={[
              { key: "files", label: "Files / Trips" },
              { key: "pax", label: "Pax" },
            ]}
            nameField="month"
          />
        </Col>
        <Col xl={5}>
          <DoughnutCard
            title="Files / Trips by Status"
            subtitle="Current reservation file workflow status."
            rows={filesTrips.filesByStatus}
            centerLabel="Files"
            centerValue={filesTrips.totalReservationFiles}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={6}>
          <RankingCard
            title="Files / Trips by Travel Agent"
            subtitle="Reservation-file trips grouped by the quotation travel agent."
            rows={filesTrips.filesByAgent}
          />
        </Col>
        <Col xl={6}>
          <RankingCard
            title="Most Active Months"
            subtitle="Months with the highest number of reservation-file trips."
            rows={filesTrips.mostActiveMonths}
            valueField="files"
            secondary={[{ label: "Pax", field: "pax" }]}
          />
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Recent Files / Trips"
            subtitle="Recent reservation files with linked quotation dates, pax, and agent."
            badge={`${formatNumber(recentFiles.length)} recent`}
          />
          {recentFiles.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>File</th>
                    <th>Quotation</th>
                    <th>Travel Agent</th>
                    <th>Start</th>
                    <th>End</th>
                    <th className="text-end">Days</th>
                    <th className="text-end">Pax</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentFiles.map((row, index) => (
                    <tr key={`${row.fileReference}-${index}`}>
                      <td>{row.fileReference || "-"}</td>
                      <td>{row.quotationReference || "-"}</td>
                      <td>{row.agentName || "-"}</td>
                      <td>{formatDate(row.tripStart)}</td>
                      <td>{formatDate(row.tripEnd)}</td>
                      <td className="text-end">{formatNumber(row.durationDays)}</td>
                      <td className="text-end">{formatNumber(row.pax)}</td>
                      <td>{row.status || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No reservation-file trips are available for this range." />
          )}
        </CardBody>
      </Card>

      <Card className="dashboard-card">
        <CardBody>
          <CardHeaderBlock
            title="Top Linked Services"
            subtitle="Each service is counted once per linked reservation-file trip; occurrences show repeated itinerary use."
            badge={`${formatNumber(linkedServices.length)} services`}
          />
          {linkedServices.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Service Type</th>
                    <th>Service</th>
                    <th className="text-end">Files / Trips</th>
                    <th className="text-end">Occurrences</th>
                  </tr>
                </thead>
                <tbody>
                  {linkedServices.map(row => (
                    <tr key={`${row.serviceType}-${row.name}`}>
                      <td>{row.serviceType}</td>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.tripCount)}</td>
                      <td className="text-end">{formatNumber(row.occurrences)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No linked itinerary or accommodation services are available." />
          )}
        </CardBody>
      </Card>
    </>
  );
};

FilesTripsTab.propTypes = {
  analytics: PropTypes.object.isRequired,
  filterDraft: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
};

const RatedEntitiesTable = ({ rows, emptyLabel }) =>
  rows.length ? (
    <div className="table-responsive">
      <Table className="align-middle mb-0">
        <thead>
          <tr>
            <th>Entity Type</th>
            <th>Entity</th>
            <th className="text-end">Ratings</th>
            <th className="text-end">Average</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={`${row.entityType}-${row.name}`}>
              <td>{row.entityType}</td>
              <td>{row.name}</td>
              <td className="text-end">{formatNumber(row.ratingCount)}</td>
              <td className="text-end">{ratingValue(row.averageRating)}</td>
            </tr>
          ))}
        </tbody>
      </Table>
    </div>
  ) : (
    <EmptyState label={emptyLabel} />
  );

RatedEntitiesTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object).isRequired,
  emptyLabel: PropTypes.string.isRequired,
};

const RatingsOverviewTab = ({
  analytics,
  filterDraft,
  onFilterChange,
  onApplyFilters,
  onClearFilters,
}) => {
  const ratings = analytics.ratingsOverview || {};
  const byType = asArray(ratings.ratingsByType);
  const topEntities = asArray(ratings.topRatedEntities);
  const lowestEntities = asArray(ratings.lowestRatedEntities);
  const recentResponses = asArray(ratings.recentResponses);
  const trend = asArray(ratings.ratingTrendByMonth);
  const byNationality = asArray(ratings.ratingsByNationality);
  const invalidDateRange = Boolean(
    filterDraft.from && filterDraft.to && filterDraft.from > filterDraft.to,
  );

  return (
    <>
      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Ratings Overview Filters"
            subtitle="Filters use evaluation response submission dates."
            badge="Approved responses"
          />
          <Row className="g-3 align-items-end">
            <Col md={4}>
              <Label className="form-label">From</Label>
              <Input
                type="date"
                value={filterDraft.from}
                onChange={event => onFilterChange("from", event.target.value)}
              />
            </Col>
            <Col md={4}>
              <Label className="form-label">To</Label>
              <Input
                type="date"
                value={filterDraft.to}
                onChange={event => onFilterChange("to", event.target.value)}
              />
            </Col>
            <Col md={4} className="d-flex gap-2">
              <Button
                color="primary"
                onClick={onApplyFilters}
                disabled={invalidDateRange}
              >
                Apply
              </Button>
              <Button color="light" className="border" onClick={onClearFilters}>
                Clear
              </Button>
            </Col>
          </Row>
          {invalidDateRange ? (
            <Alert color="warning" className="mt-3 mb-0">
              The From date must be before the To date.
            </Alert>
          ) : null}
          <p className="text-muted small mb-1 mt-3">{ratings.dataBasis}</p>
          <p className="text-muted small mb-0">
            Matching: {ratings.matchingMethod || "-"}
          </p>
        </CardBody>
      </Card>

      <InsightGrid
        items={[
          {
            label: "Total ratings",
            value: ratings.totalRatings,
            footer: `${formatNumber(ratings.totalResponses)} approved responses`,
          },
          {
            label: "Average rating",
            value: ratings.averageOverallRating,
            type: "decimal",
            footer: "Across valid submitted answers",
            className: "success",
          },
          {
            label: "Best rated type",
            value: ratings.bestRatedEntityType,
            type: "text",
            footer: "Highest average with ratings",
          },
          {
            label: "Most reviewed type",
            value: ratings.mostReviewedEntityType,
            type: "text",
            footer: "Largest rating count",
          },
          {
            label: "Unmatched ratings",
            value: ratings.unmatchedRatings,
            footer: `${formatNumber(ratings.ambiguousNameMatches)} ambiguous name matches`,
          },
        ]}
      />

      <Row className="g-4 mb-4">
        <Col xl={6}>
          <BarChartCard
            title="Rating Count by Entity Type"
            subtitle="Submitted answer count for each supported entity type."
            rows={byType}
            valueField="ratingCount"
            horizontal
          />
        </Col>
        <Col xl={6}>
          <LineChartCard
            title="Rating Trend by Month"
            subtitle="Average rating grouped by response submission month."
            badge={`${formatNumber(trend.reduce((sum, row) => sum + toNumber(row.ratings), 0))} ratings`}
            rows={trend}
            fields={[{ key: "averageRating", label: "Average Rating" }]}
            nameField="month"
          />
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Ratings by Entity Type"
            subtitle="Counts and averages from approved evaluation answers."
            badge={`${formatNumber(byType.length)} types`}
          />
          {byType.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Entity Type</th>
                    <th className="text-end">Responses</th>
                    <th className="text-end">Ratings</th>
                    <th className="text-end">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {byType.map(row => (
                    <tr key={row.key}>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.responseCount)}</td>
                      <td className="text-end">{formatNumber(row.ratingCount)}</td>
                      <td className="text-end">{ratingValue(row.averageRating)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No approved rating data is available." />
          )}
        </CardBody>
      </Card>

      <Row className="g-4 mb-4">
        <Col xl={6}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Top Rated Entities"
                subtitle="Highest average rating within each entity type."
                badge={`${formatNumber(topEntities.length)} entities`}
              />
              <RatedEntitiesTable
                rows={topEntities}
                emptyLabel="No matched rated entities are available."
              />
            </CardBody>
          </Card>
        </Col>
        <Col xl={6}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Lowest Rated Entities"
                subtitle="Lowest average rating within each entity type."
                badge={`${formatNumber(lowestEntities.length)} entities`}
              />
              <RatedEntitiesTable
                rows={lowestEntities}
                emptyLabel="No matched rated entities are available."
              />
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Recent Rating Responses"
            subtitle="Approved responses with linked file, quotation, and nationality where available."
            badge={`${formatNumber(recentResponses.length)} recent`}
          />
          {recentResponses.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Customer</th>
                    <th>File</th>
                    <th>Quotation</th>
                    <th>Nationality</th>
                    <th className="text-end">Ratings</th>
                    <th className="text-end">Average</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {recentResponses.map((row, index) => (
                    <tr key={row.responseId || `${row.fileReference}-${index}`}>
                      <td>{row.clientName}</td>
                      <td>{row.fileReference || "-"}</td>
                      <td>{row.quotationReference || "-"}</td>
                      <td>{row.nationality}</td>
                      <td className="text-end">{formatNumber(row.ratingCount)}</td>
                      <td className="text-end">{ratingValue(row.averageRating)}</td>
                      <td>{formatDate(row.submittedOn)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No approved responses are available for this range." />
          )}
        </CardBody>
      </Card>

      <Card className="dashboard-card">
        <CardBody>
          <CardHeaderBlock
            title="Ratings by Nationality"
            subtitle="Nationality is linked through reservation file and quotation records."
            badge={`${formatNumber(byNationality.length)} nationalities`}
          />
          {byNationality.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Nationality</th>
                    <th className="text-end">Responses</th>
                    <th className="text-end">Ratings</th>
                    <th className="text-end">Average</th>
                  </tr>
                </thead>
                <tbody>
                  {byNationality.map(row => (
                    <tr key={row.name}>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.ratedResponses)}</td>
                      <td className="text-end">{formatNumber(row.ratingCount)}</td>
                      <td className="text-end">{ratingValue(row.averageRating)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No nationality-linked ratings are available." />
          )}
          <p className="text-muted small mb-0 mt-3">
            {formatNumber(ratings.linkedReservationResponses)} responses linked to reservation files; {" "}
            {formatNumber(ratings.linkedQuotationResponses)} linked to quotations.
          </p>
        </CardBody>
      </Card>
    </>
  );
};

RatingsOverviewTab.propTypes = {
  analytics: PropTypes.object.isRequired,
  filterDraft: PropTypes.shape({
    from: PropTypes.string,
    to: PropTypes.string,
  }).isRequired,
  onFilterChange: PropTypes.func.isRequired,
  onApplyFilters: PropTypes.func.isRequired,
  onClearFilters: PropTypes.func.isRequired,
};

const HotelsTab = ({ analytics }) => {
  const hotels = analytics.hotels || {};
  const rankedByRating = asArray(hotels.rankedByRating);
  const rankedByUsage = asArray(hotels.rankedByUsage);
  const byLinkedPax = asArray(hotels.hotelsByLinkedGroupPax);
  const usageByMonth = asArray(hotels.usageByMonth);
  const ratingsByNationality = asArray(hotels.ratingsByNationality);
  const rateProfiles = asArray(hotels.hotelRateProfiles);
  const bestHotel = hotels.bestHotel;

  return (
    <>
      <Alert color="info" className="mb-4">
        {hotels.dataBasis}
      </Alert>
      <InsightGrid
        items={[
          { label: "Hotels", value: hotels.total, footer: "Active hotel records" },
          { label: "Average rate", value: hotels.priceSummary?.averageRate, type: "money", footer: "Season rate rows" },
          {
            label: "Best hotel",
            value: bestHotel?.name || "-",
            type: "text",
            footer: bestHotel
              ? `${ratingValue(bestHotel.averageRating)} average from ${formatNumber(bestHotel.ratingCount)} ratings`
              : "No matched approved ratings",
          },
          {
            label: "Most used hotel",
            value: getTopName(rankedByUsage),
            type: "text",
            footer: rankedByUsage.length
              ? `${formatNumber(rankedByUsage[0].tripCount)} files / trips; ${formatNumber(rankedByUsage[0].occurrences)} occurrences`
              : "No matched accommodation stays",
          },
          {
            label: "Highest linked group pax",
            value: getTopName(byLinkedPax),
            type: "text",
            footer: byLinkedPax.length
              ? `${formatNumber(byLinkedPax[0].linkedGroupPax)} quotation pax`
              : "Not available",
          },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="Hotels by City"
            subtitle="Hotel inventory by destination."
            rows={hotels.byCity}
          />
        </Col>
        <Col xl={4}>
          <DoughnutCard
            title="Hotels by Chain"
            subtitle="Chain and independent inventory mix."
            rows={hotels.byChain}
          />
        </Col>
        <Col xl={4}>
          <DoughnutCard
            title="Hotels by Stars"
            subtitle="Star-rating distribution."
            rows={hotels.byStars}
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <RankingCard
            title="Most Used Hotels"
            subtitle="Matched hotels ranked by unique reservation-file trips."
            rows={rankedByUsage}
            valueField="tripCount"
            secondary={[
              { label: "Occurrences", field: "occurrences" },
              { label: "Nights", field: "totalNights" },
            ]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Top Rated Hotels"
            subtitle="Approved ratings matched to real hotel names."
            rows={rankedByRating}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Ratings", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Hotels by Linked Group Pax"
            subtitle="Quotation group pax linked to trips containing the hotel; not confirmed guests."
            rows={byLinkedPax}
            valueField="linkedGroupPax"
            secondary={[
              { label: "Trips", field: "tripCount" },
              { label: "Occurrences", field: "occurrences" },
            ]}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Hotel Usage by Month"
                subtitle="Matched accommodation stays grouped by quotation start month."
                badge={`${formatNumber(usageByMonth.length)} rows`}
              />
              {usageByMonth.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Hotel</th>
                        <th className="text-end">Files / Trips</th>
                        <th className="text-end">Occurrences</th>
                        <th className="text-end">Nights</th>
                        <th className="text-end">Linked Group Pax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByMonth.map(row => (
                        <tr key={`${row.month}-${row.name}`}>
                          <td>{row.month}</td>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.filesHandled)}</td>
                          <td className="text-end">{formatNumber(row.occurrences)}</td>
                          <td className="text-end">{formatNumber(row.totalNights)}</td>
                          <td className="text-end">{formatNumber(row.linkedGroupPax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No matched hotel usage is available." />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Hotel Ratings by Nationality"
                subtitle="Nationality is linked through reservation file and quotation records."
                badge={`${formatNumber(ratingsByNationality.length)} nationalities`}
              />
              {ratingsByNationality.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Nationality</th>
                        <th className="text-end">Ratings</th>
                        <th className="text-end">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratingsByNationality.map(row => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.ratingCount)}</td>
                          <td className="text-end">{ratingValue(row.averageRating)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No nationality-linked hotel ratings are available." />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={6}>
          <BarChartCard
            title="Rate by Board"
            subtitle="Average saved hotel season rates by board basis."
            rows={hotels.ratesByBoard}
            valueField="averageAmount"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={6}>
          <BarChartCard
            title="Rate by Season"
            subtitle="Average combined saved rate values by season row."
            rows={hotels.ratesBySeason}
            valueField="averageAmount"
            valueType="money"
            horizontal
          />
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Hotel Rate Profiles"
            subtitle="Saved season-rate rows and average positive board rate for each hotel."
            badge={`${formatNumber(rateProfiles.length)} hotels`}
          />
          {rateProfiles.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Hotel</th>
                    <th className="text-end">Rate Rows</th>
                    <th className="text-end">Rate Values</th>
                    <th className="text-end">Average Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {rateProfiles.map(row => (
                    <tr key={row.hotelId}>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.rateRows)}</td>
                      <td className="text-end">{formatNumber(row.amountCount)}</td>
                      <td className="text-end">{formatMoney(row.averageRate)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No saved hotel season-rate rows are available." />
          )}
        </CardBody>
      </Card>

      <Row className="g-4">
        <Col xl={6}>
          <RankingCard
            title="Hotel Data Gaps"
            subtitle="Completeness and accommodation-matching checks."
            rows={[
              { name: "Missing city", value: hotels.quality?.missingCity },
              { name: "Missing chain", value: hotels.quality?.missingChain },
              { name: "Missing stars", value: hotels.quality?.missingStars },
              { name: "Missing phone", value: hotels.quality?.missingPhone },
              { name: "Missing website", value: hotels.quality?.missingWebsite },
              { name: "Without rates", value: hotels.quality?.hotelsWithoutRates },
              { name: "Unmatched accommodation stays", value: hotels.quality?.unmatchedAccommodationOccurrences },
              { name: "Accommodation records with alternatives", value: hotels.quality?.accommodationRecordsWithAlternatives },
              { name: "Matched by hotel ID", value: hotels.quality?.matchedByHotelId },
              { name: "Matched by name fallback", value: hotels.quality?.matchedByNameFallback },
            ]}
          />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="hotels" />
        </Col>
      </Row>
    </>
  );
};

HotelsTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const GuidesTab = ({ analytics }) => {
  const guides = analytics.guides || {};
  const rankedByRating = asArray(guides.rankedByRating);
  const rankedByLanguages = asArray(guides.rankedByLanguages);
  const mostUsedGuides = asArray(guides.mostUsedGuides);
  const guidesByPax = asArray(guides.guidesByPaxHandled);
  const guideTypeUsage = asArray(guides.guideTypeUsage);
  const guideUsageByMonth = asArray(guides.guideUsageByMonth);
  const ratingsByNationality = asArray(guides.ratingsByNationality);
  const bestGuide = guides.bestGuide;
  const mostLanguagesGuide = guides.mostLanguagesGuide;

  return (
    <>
      <Alert color="info" className="mb-4">
        {guides.dataBasis}
      </Alert>
      <InsightGrid
        items={[
          { label: "Guides", value: guides.total, footer: "Active guide records" },
          { label: "Multilingual", value: guides.multilingual, footer: "More than one language", className: "success" },
          { label: "Average guide cost", value: guides.priceSummary?.averageGuideCost, type: "money", footer: "Quotation-day guide costs" },
          {
            label: "Best guide",
            value: bestGuide?.name || "-",
            type: "text",
            footer: bestGuide
              ? `${ratingValue(bestGuide.averageRating)} average from ${formatNumber(bestGuide.ratingCount)} ratings`
              : "No matched approved ratings",
          },
          {
            label: "Most languages",
            value: mostLanguagesGuide?.name || "-",
            type: "text",
            footer: `${formatNumber(mostLanguagesGuide?.languageCount)} languages`,
          },
          {
            label: "Most used named guide",
            value: getTopName(mostUsedGuides),
            type: "text",
            footer: mostUsedGuides.length
              ? `${formatNumber(mostUsedGuides[0].filesHandled)} files / trips`
              : "No matched named assignments",
          },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={6}>
          <BarChartCard
            title="Guide Languages"
            subtitle="Most common languages guides can speak."
            rows={guides.languages}
            horizontal
          />
        </Col>
        <Col xl={6}>
          <BarChartCard
            title="Guide Type Usage"
            subtitle="Guide types from quotation days; these are not specific guide assignments."
            rows={guideTypeUsage.length ? guideTypeUsage : guides.guideTypes}
            valueField={guideTypeUsage.length ? "filesHandled" : "value"}
            horizontal
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={3}>
          <RankingCard
            title="Top Rated Guides"
            subtitle="Approved ratings matched to real guide names."
            rows={rankedByRating}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Ratings", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={3}>
          <RankingCard
            title="Most Multilingual Guides"
            subtitle="Language count stored on each guide record."
            rows={rankedByLanguages}
            valueField="languageCount"
            secondary={[{ label: "Languages", field: "languageCount" }]}
          />
        </Col>
        <Col xl={3}>
          <RankingCard
            title="Most Used Named Guides"
            subtitle="Specific guide names matched from reservation files."
            rows={mostUsedGuides}
            valueField="filesHandled"
            secondary={[{ label: "Pax", field: "paxHandled" }]}
          />
        </Col>
        <Col xl={3}>
          <RankingCard
            title="Guides by Pax Handled"
            subtitle="Group pax assigned to each matched named guide."
            rows={guidesByPax}
            valueField="paxHandled"
            secondary={[{ label: "Files", field: "filesHandled" }]}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Named Guide Usage by Month"
                subtitle="Only saved guide names that match real guide records are included."
                badge={`${formatNumber(guideUsageByMonth.length)} rows`}
              />
              {guideUsageByMonth.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Guide</th>
                        <th className="text-end">Files / Trips</th>
                        <th className="text-end">Pax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {guideUsageByMonth.map(row => (
                        <tr key={`${row.month}-${row.name}`}>
                          <td>{row.month}</td>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.filesHandled)}</td>
                          <td className="text-end">{formatNumber(row.paxHandled)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No matched named-guide usage is available." />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Guide Ratings by Nationality"
                subtitle="Nationality is linked through reservation file and quotation records."
                badge={`${formatNumber(ratingsByNationality.length)} nationalities`}
              />
              {ratingsByNationality.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Nationality</th>
                        <th className="text-end">Ratings</th>
                        <th className="text-end">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratingsByNationality.map(row => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.ratingCount)}</td>
                          <td className="text-end">{ratingValue(row.averageRating)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No nationality-linked guide ratings are available." />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xl={6}>
          <RankingCard
            title="Guide Data Gaps"
            subtitle="Completeness checks for guide records."
            rows={[
              { name: "Missing languages", value: guides.quality?.missingLanguages },
              { name: "Missing email", value: guides.quality?.missingEmail },
              { name: "Missing phone", value: guides.quality?.missingPhone },
              { name: "Unmatched saved guide names", value: guides.quality?.unmatchedNamedAssignments },
            ]}
          />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="guides" />
        </Col>
      </Row>
    </>
  );
};

GuidesTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const RestaurantsTab = ({ analytics }) => {
  const restaurants = analytics.restaurants || {};
  const rankedByRating = asArray(restaurants.rankedByRating);
  const rankedByUsage = asArray(restaurants.rankedByUsage);
  const byLinkedPax = asArray(restaurants.restaurantsByLinkedGroupPax);
  const usageByMonth = asArray(restaurants.usageByMonth);
  const ratingsByNationality = asArray(restaurants.ratingsByNationality);
  const mealProfiles = asArray(restaurants.mealProfiles);
  const bestRestaurant = restaurants.bestRestaurant;

  return (
    <>
      <Alert color="info" className="mb-4">
        {restaurants.dataBasis}
      </Alert>
      <InsightGrid
        items={[
          { label: "Restaurants", value: restaurants.total, footer: "Active restaurant records" },
          { label: "Average meal", value: restaurants.priceSummary?.averageMealPrice, type: "money", footer: "Meal price rows" },
          {
            label: "Best restaurant",
            value: bestRestaurant?.name || "-",
            type: "text",
            footer: bestRestaurant
              ? `${ratingValue(bestRestaurant.averageRating)} average from ${formatNumber(bestRestaurant.ratingCount)} ratings`
              : "No matched approved ratings",
          },
          {
            label: "Most used restaurant",
            value: getTopName(rankedByUsage),
            type: "text",
            footer: rankedByUsage.length
              ? `${formatNumber(rankedByUsage[0].tripCount)} files / trips; ${formatNumber(rankedByUsage[0].occurrences)} occurrences`
              : "No matched trip meal rows",
          },
          {
            label: "Highest linked group pax",
            value: getTopName(byLinkedPax),
            type: "text",
            footer: byLinkedPax.length
              ? `${formatNumber(byLinkedPax[0].linkedGroupPax)} quotation pax`
              : "Not available",
          },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="Restaurants by City"
            subtitle="Restaurant inventory by destination."
            rows={restaurants.byCity}
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Meal Price by Type"
            subtitle="Average meal price from restaurant meal rows."
            rows={restaurants.mealTypes}
            valueField="averagePrice"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Most Ordered Meals"
            subtitle="Meal type selections from quotation days."
            rows={asArray(restaurants.orderedMealTypes).length
              ? restaurants.orderedMealTypes
              : restaurants.mostOrderedMeals}
            horizontal
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <RankingCard
            title="Most Used Restaurants"
            subtitle="Matched restaurants ranked by unique reservation-file trips."
            rows={rankedByUsage}
            valueField="tripCount"
            secondary={[
              { label: "Occurrences", field: "occurrences" },
              { label: "Linked pax", field: "linkedGroupPax" },
            ]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Top Rated Restaurants"
            subtitle="Approved ratings matched to real restaurant names."
            rows={rankedByRating}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Ratings", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Restaurants by Linked Group Pax"
            subtitle="Quotation group pax linked to trips containing the restaurant; not confirmed diners."
            rows={byLinkedPax}
            valueField="linkedGroupPax"
            secondary={[
              { label: "Trips", field: "tripCount" },
              { label: "Occurrences", field: "occurrences" },
            ]}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Restaurant Usage by Month"
                subtitle="Matched restaurant meal rows grouped by quotation start month."
                badge={`${formatNumber(usageByMonth.length)} rows`}
              />
              {usageByMonth.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Restaurant</th>
                        <th className="text-end">Files / Trips</th>
                        <th className="text-end">Occurrences</th>
                        <th className="text-end">Linked Group Pax</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByMonth.map(row => (
                        <tr key={`${row.month}-${row.name}`}>
                          <td>{row.month}</td>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.filesHandled)}</td>
                          <td className="text-end">{formatNumber(row.occurrences)}</td>
                          <td className="text-end">{formatNumber(row.linkedGroupPax)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No matched restaurant usage is available." />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Restaurant Ratings by Nationality"
                subtitle="Nationality is linked through reservation file and quotation records."
                badge={`${formatNumber(ratingsByNationality.length)} nationalities`}
              />
              {ratingsByNationality.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Nationality</th>
                        <th className="text-end">Ratings</th>
                        <th className="text-end">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratingsByNationality.map(row => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.ratingCount)}</td>
                          <td className="text-end">{ratingValue(row.averageRating)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No nationality-linked restaurant ratings are available." />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Restaurant Meal Profiles"
            subtitle="Saved menu rows and average price for each restaurant."
            badge={`${formatNumber(mealProfiles.length)} restaurants`}
          />
          {mealProfiles.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Restaurant</th>
                    <th className="text-end">Meal Types</th>
                    <th className="text-end">Average Price</th>
                  </tr>
                </thead>
                <tbody>
                  {mealProfiles.map(row => (
                    <tr key={row.restaurantId}>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.mealCount)}</td>
                      <td className="text-end">{formatMoney(row.averagePrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No saved restaurant meal rows are available." />
          )}
        </CardBody>
      </Card>

      <Row className="g-4">
        <Col xl={6}>
          <RankingCard
            title="Restaurant Data Gaps"
            subtitle="Completeness and matching checks for restaurant analytics."
            rows={[
              { name: "Missing city", value: restaurants.quality?.missingCity },
              { name: "Missing email", value: restaurants.quality?.missingEmail },
              { name: "Missing phone", value: restaurants.quality?.missingPhone },
              { name: "Missing website", value: restaurants.quality?.missingWebsite },
              { name: "Without meal rows", value: restaurants.quality?.restaurantsWithoutMeals },
              { name: "Unmatched trip occurrences", value: restaurants.quality?.unmatchedRestaurantOccurrences },
            ]}
          />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="restaurants" />
        </Col>
      </Row>
    </>
  );
};

RestaurantsTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const TravelAgentsTab = ({ analytics }) => {
  const agents = analytics.travelAgents || {};
  const mostActive = asArray(agents.mostActiveAgents);
  const byQuotations = asArray(agents.byQuotations);
  const byFiles = asArray(agents.byReservationFiles);
  const byPax = asArray(agents.byPax);
  const byPricing = asArray(agents.byPricingTotal);
  const activityByMonth = asArray(agents.activityByMonth);
  const recentTrips = asArray(agents.recentAgentTrips);

  return (
    <>
      <Alert color="info" className="mb-4">
        {agents.dataBasis}
      </Alert>
      <InsightGrid
        items={[
          { label: "Travel agents", value: agents.total, footer: "Active agent records" },
          { label: "Quotations", value: agents.totalQuotations, footer: "In the selected date range" },
          { label: "Files / Trips", value: agents.totalReservationFiles, footer: "Reservation files linked to quotations" },
          { label: "Linked Group Pax", value: agents.totalPax, footer: "Quotation pax, not confirmed travellers" },
          { label: "Saved pricing total", value: agents.totalPricing, type: "money", footer: `${formatNumber(agents.pricedQuotations)} priced quotations; not collected revenue` },
          { label: "Most active agent", value: getTopName(mostActive), type: "text", footer: mostActive.length ? `${formatNumber(mostActive[0].reservationFiles)} files / trips` : "No linked activity" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="Agents by Country"
            subtitle="Travel agent distribution by country."
            rows={agents.byCountry}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Most Active Agents"
            subtitle="Ranked by reservation files, then quotations and pax."
            rows={mostActive}
            valueField="reservationFiles"
            secondary={[
              { label: "Quotations", field: "quotations" },
              { label: "Pax", field: "totalPax" },
            ]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Agents by Quotations"
            subtitle="Quotation volume linked by saved travel-agent ID."
            rows={byQuotations}
            valueField="quotations"
            secondary={[
              { label: "Avg pax", field: "averagePax" },
              { label: "Files", field: "reservationFiles" },
            ]}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={4}>
          <RankingCard
            title="Agents by Files / Trips"
            subtitle="Reservation files linked through agent quotations."
            rows={byFiles}
            valueField="reservationFiles"
            secondary={[
              { label: "Quotations", field: "quotations" },
              { label: "Pax", field: "totalPax" },
            ]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Agents by Linked Group Pax"
            subtitle="Quotation pax linked to each agent; not confirmed travellers."
            rows={byPax}
            valueField="totalPax"
            secondary={[
              { label: "Quotations", field: "quotations" },
              { label: "Avg pax", field: "averagePax" },
            ]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Saved Pricing Totals by Agent"
            subtitle="Final totals from available quotation-pricing records; not collected revenue."
            rows={byPricing}
            valueField="pricingTotal"
            valueType="money"
            secondary={[
              { label: "Priced quotes", field: "pricedQuotations" },
              { label: "Average", field: "averageQuotationValue", type: "money" },
            ]}
          />
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Agent Activity by Month"
            subtitle="Quotation start month with files, pax, and available saved pricing totals."
            badge={`${formatNumber(activityByMonth.length)} rows`}
          />
          {activityByMonth.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Month</th>
                    <th>Agent</th>
                    <th className="text-end">Quotations</th>
                    <th className="text-end">Files / Trips</th>
                    <th className="text-end">Pax</th>
                    <th className="text-end">Saved Pricing</th>
                  </tr>
                </thead>
                <tbody>
                  {activityByMonth.map(row => (
                    <tr key={`${row.month}-${row.agentId}`}>
                      <td>{row.month}</td>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.quotations)}</td>
                      <td className="text-end">{formatNumber(row.reservationFiles)}</td>
                      <td className="text-end">{formatNumber(row.totalPax)}</td>
                      <td className="text-end">{formatMoney(row.pricingTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No agent activity is available for this range." />
          )}
        </CardBody>
      </Card>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Recent Agent-linked Files / Trips"
            subtitle="Recent reservation files linked through quotation travel-agent IDs."
            badge={`${formatNumber(recentTrips.length)} recent`}
          />
          {recentTrips.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Trip Start</th>
                    <th>Agent</th>
                    <th>File</th>
                    <th>Quotation</th>
                    <th>Status</th>
                    <th className="text-end">Pax</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTrips.map(row => (
                    <tr key={row.fileId}>
                      <td>{formatDate(row.tripStart)}</td>
                      <td>{row.agentName}</td>
                      <td>{row.fileReference || "-"}</td>
                      <td>{row.quotationReference || "-"}</td>
                      <td>{row.status || "-"}</td>
                      <td className="text-end">{formatNumber(row.pax)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No agent-linked reservation files are available." />
          )}
        </CardBody>
      </Card>

      <Row className="g-4">
        <Col xl={6}>
          <RankingCard
            title="Agent Data and Linkage Gaps"
            subtitle="Contact, quotation, reservation-file, and pricing completeness checks."
            rows={[
              { name: "Missing country", value: agents.quality?.missingCountry },
              { name: "Missing email", value: agents.quality?.missingEmail },
              { name: "Missing phone", value: agents.quality?.missingPhone },
              { name: "Agents without quotations", value: agents.quality?.agentsWithoutQuotations },
              { name: "Quotations without known agent", value: agents.quality?.quotationsWithoutKnownAgent },
              { name: "Quotations without reservation file", value: agents.quality?.quotationsWithoutReservationFile },
              { name: "Reservation files without quotation", value: agents.quality?.reservationFilesWithoutQuotation },
              { name: "Quotations without pricing", value: agents.quality?.quotationsWithoutPricing },
            ]}
          />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="travelAgents" />
        </Col>
      </Row>
    </>
  );
};

TravelAgentsTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const PlacesTab = ({ analytics }) => {
  const places = analytics.places || {};
  const rankedByRating = asArray(places.rankedByRating);
  const rankedByUsage = asArray(places.rankedByUsage);
  const byLinkedPax = asArray(places.placesByLinkedGroupPax);
  const usageByMonth = asArray(places.usageByMonth);
  const ratingsByNationality = asArray(places.ratingsByNationality);
  const selectedFeesByNationality = asArray(places.selectedFeesByNationality);
  const bestPlace = places.bestPlace;

  return (
    <>
      <Alert color="info" className="mb-4">
        {places.dataBasis}
      </Alert>
      <InsightGrid
        items={[
          { label: "Places", value: places.total, footer: "Active destination records" },
          { label: "Average entrance", value: places.priceSummary?.averageEntranceFee, type: "money", footer: "Saved entrance fee rows" },
          {
            label: "Best rated place",
            value: bestPlace?.name || "-",
            type: "text",
            footer: bestPlace
              ? `${ratingValue(bestPlace.averageRating)} average from ${formatNumber(bestPlace.ratingCount)} ratings`
              : "No matched approved ratings",
          },
          {
            label: "Most used place",
            value: getTopName(rankedByUsage),
            type: "text",
            footer: rankedByUsage.length
              ? `${formatNumber(rankedByUsage[0].tripCount)} files / trips; ${formatNumber(rankedByUsage[0].occurrences)} occurrences`
              : "No matched place rows",
          },
          {
            label: "Highest linked group pax",
            value: getTopName(byLinkedPax),
            type: "text",
            footer: byLinkedPax.length
              ? `${formatNumber(byLinkedPax[0].linkedGroupPax)} quotation pax`
              : "Not available",
          },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="Places by City"
            subtitle="Place inventory by destination city."
            rows={places.byCity}
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Configured Entrance Fees"
            subtitle="Average configured place entrance fee by nationality list item."
            rows={places.feesByNationality}
            valueField="averageAmount"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Selected Entrance Fees by Nationality"
            subtitle="Average saved quotation-day fee grouped by quotation nationality."
            rows={selectedFeesByNationality}
            valueField="averageAmount"
            valueType="money"
            horizontal
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <RankingCard
            title="Top Rated Places"
            subtitle="Approved place ratings matched to real place names."
            rows={rankedByRating}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Ratings", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Most Used Places"
            subtitle="Matched places ranked by unique reservation-file trips."
            rows={rankedByUsage}
            valueField="tripCount"
            secondary={[
              { label: "Occurrences", field: "occurrences" },
              { label: "Avg selected fee", field: "averageSelectedFee", type: "money" },
            ]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Places by Linked Group Pax"
            subtitle="Quotation group pax linked to trips containing the place; not confirmed visitors."
            rows={byLinkedPax}
            valueField="linkedGroupPax"
            secondary={[
              { label: "Trips", field: "tripCount" },
              { label: "Occurrences", field: "occurrences" },
            ]}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Place Usage by Month"
                subtitle="Matched entrance/place rows grouped by quotation start month."
                badge={`${formatNumber(usageByMonth.length)} rows`}
              />
              {usageByMonth.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Place</th>
                        <th className="text-end">Files / Trips</th>
                        <th className="text-end">Occurrences</th>
                        <th className="text-end">Linked Group Pax</th>
                        <th className="text-end">Avg Fee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByMonth.map(row => (
                        <tr key={`${row.month}-${row.name}`}>
                          <td>{row.month}</td>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.filesHandled)}</td>
                          <td className="text-end">{formatNumber(row.occurrences)}</td>
                          <td className="text-end">{formatNumber(row.linkedGroupPax)}</td>
                          <td className="text-end">{formatMoney(row.averageSelectedFee)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No matched place usage is available." />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Place Ratings by Nationality"
                subtitle="Nationality is linked through reservation file and quotation records."
                badge={`${formatNumber(ratingsByNationality.length)} nationalities`}
              />
              {ratingsByNationality.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Nationality</th>
                        <th className="text-end">Ratings</th>
                        <th className="text-end">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratingsByNationality.map(row => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.ratingCount)}</td>
                          <td className="text-end">{ratingValue(row.averageRating)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No nationality-linked place ratings are available." />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-4">
        <Col xl={6}>
          <RankingCard
            title="Place Data Gaps"
            subtitle="Place record, nationality, and trip-row matching completeness checks."
            rows={[
              { name: "Missing city", value: places.quality?.missingCity },
              { name: "Without configured fees", value: places.quality?.placesWithoutFees },
              { name: "Missing description", value: places.quality?.missingDescription },
              { name: "Missing images", value: places.quality?.missingImages },
              { name: "Unmatched place occurrences", value: places.quality?.unmatchedPlaceOccurrences },
              { name: "Occurrences without known nationality", value: places.quality?.occurrencesWithoutKnownNationality },
              { name: "Matched by place ID", value: places.quality?.matchedByPlaceId },
              { name: "Matched by name fallback", value: places.quality?.matchedByNameFallback },
            ]}
          />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="places" />
        </Col>
      </Row>
    </>
  );
};

PlacesTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const TransportationCompaniesTab = ({ analytics }) => {
  const transportation = analytics.transportationCompanies || {};
  const rankedByRating = asArray(transportation.rankedByRating);
  const rankedByUsage = asArray(transportation.rankedByUsage);
  const byLinkedPax = asArray(transportation.companiesByLinkedGroupPax);
  const usageByMonth = asArray(transportation.usageByMonth);
  const ratingsByNationality = asArray(transportation.ratingsByNationality);
  const typeOnlyUsage = asArray(transportation.typeOnlyUsage);
  const sizeCapacityProfiles = asArray(transportation.sizeCapacityProfiles);
  const bestCompany = transportation.bestTransportationCompany;

  return (
    <>
      <Alert color="info" className="mb-4">
        {transportation.dataBasis}
      </Alert>
      <InsightGrid
        items={[
          { label: "Companies", value: transportation.total, footer: "Active transportation providers" },
          { label: "Average configured rate", value: transportation.priceSummary?.averageRate, type: "money", footer: "Active company rate rows" },
          { label: "Average selected rate", value: transportation.priceSummary?.averageSelectedRate, type: "money", footer: "Resolved quotation-day selections" },
          {
            label: "Best company",
            value: bestCompany?.name || "-",
            type: "text",
            footer: bestCompany
              ? `${ratingValue(bestCompany.averageRating)} average from ${formatNumber(bestCompany.ratingCount)} ratings`
              : "No matched approved ratings",
          },
          {
            label: "Most used company",
            value: getTopName(rankedByUsage),
            type: "text",
            footer: rankedByUsage.length
              ? `${formatNumber(rankedByUsage[0].tripCount)} files / trips; ${formatNumber(rankedByUsage[0].occurrences)} occurrences`
              : "No matched transportation rows",
          },
          {
            label: "Highest linked group pax",
            value: getTopName(byLinkedPax),
            type: "text",
            footer: byLinkedPax.length
              ? `${formatNumber(byLinkedPax[0].linkedGroupPax)} quotation pax`
              : "Not available",
          },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <BarChartCard
            title="Rates by Company"
            subtitle="Average saved transportation rates per company."
            rows={transportation.byRateCount}
            valueField="averageRate"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Rates by Type"
            subtitle="Average rate by transportation type."
            rows={transportation.ratesByType}
            valueField="averageRate"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Rates by Size"
            subtitle="Average configured rate by vehicle/size profile."
            rows={transportation.ratesBySize}
            valueField="averageRate"
            valueType="money"
            horizontal
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={4}>
          <RankingCard
            title="Most Used Transportation Companies"
            subtitle="Matched companies ranked by unique reservation-file trips."
            rows={rankedByUsage}
            valueField="tripCount"
            secondary={[
              { label: "Occurrences", field: "occurrences" },
              { label: "Avg selected rate", field: "averageSelectedRate", type: "money" },
            ]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Top Rated Transportation Companies"
            subtitle="Approved ratings matched to real company names."
            rows={rankedByRating}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Ratings", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Transportation by Linked Group Pax"
            subtitle="Quotation group pax linked to trips using the company; not confirmed passengers."
            rows={byLinkedPax}
            valueField="linkedGroupPax"
            secondary={[
              { label: "Trips", field: "tripCount" },
              { label: "Occurrences", field: "occurrences" },
            ]}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={7}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Transportation Usage by Month"
                subtitle="Matched company rows grouped by quotation start month."
                badge={`${formatNumber(usageByMonth.length)} rows`}
              />
              {usageByMonth.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Month</th>
                        <th>Company</th>
                        <th className="text-end">Files / Trips</th>
                        <th className="text-end">Occurrences</th>
                        <th className="text-end">Linked Group Pax</th>
                        <th className="text-end">Avg Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usageByMonth.map(row => (
                        <tr key={`${row.month}-${row.name}`}>
                          <td>{row.month}</td>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.filesHandled)}</td>
                          <td className="text-end">{formatNumber(row.occurrences)}</td>
                          <td className="text-end">{formatNumber(row.linkedGroupPax)}</td>
                          <td className="text-end">{formatMoney(row.averageSelectedRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No matched transportation company usage is available." />
              )}
            </CardBody>
          </Card>
        </Col>
        <Col xl={5}>
          <Card className="dashboard-card h-100">
            <CardBody>
              <CardHeaderBlock
                title="Transportation Ratings by Nationality"
                subtitle="Nationality is linked through reservation file and quotation records."
                badge={`${formatNumber(ratingsByNationality.length)} nationalities`}
              />
              {ratingsByNationality.length ? (
                <div className="table-responsive">
                  <Table className="align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Nationality</th>
                        <th className="text-end">Ratings</th>
                        <th className="text-end">Average</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ratingsByNationality.map(row => (
                        <tr key={row.name}>
                          <td>{row.name}</td>
                          <td className="text-end">{formatNumber(row.ratingCount)}</td>
                          <td className="text-end">{ratingValue(row.averageRating)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              ) : (
                <EmptyState label="No nationality-linked transportation ratings are available." />
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        <Col xl={4}>
          <RankingCard
            title="Transportation Type Usage"
            subtitle="Types found in resolved quotation-day transportation rows."
            rows={transportation.typeUsage}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Vehicle / Size Usage"
            subtitle="Vehicle or size selections found in resolved rows."
            rows={transportation.sizeUsage}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Type-only Transportation Usage"
            subtitle="Real selections where a type exists but no company could be matched."
            rows={typeOnlyUsage}
            valueField="occurrences"
            secondary={[
              { label: "Trips", field: "tripCount" },
              { label: "Linked pax", field: "linkedGroupPax" },
            ]}
          />
        </Col>
      </Row>

      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock
            title="Vehicle / Size Capacity Profiles"
            subtitle="Configured transportation size records and their saved capacity ranges."
            badge={`${formatNumber(sizeCapacityProfiles.length)} profiles`}
          />
          {sizeCapacityProfiles.length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead>
                  <tr>
                    <th>Vehicle / Size</th>
                    <th className="text-end">Minimum Capacity</th>
                    <th className="text-end">Maximum Capacity</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeCapacityProfiles.map(row => (
                    <tr key={row.sizeId}>
                      <td>{row.name}</td>
                      <td className="text-end">{formatNumber(row.minimumCapacity)}</td>
                      <td className="text-end">{formatNumber(row.maximumCapacity)}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <EmptyState label="No transportation size profiles are available." />
          )}
        </CardBody>
      </Card>

      <Row className="g-4">
        <Col xl={6}>
          <RankingCard
            title="Transportation Data Gaps"
            subtitle="Company, rate, type, size, and matching completeness checks."
            rows={[
              { name: "Companies without rates", value: transportation.quality?.companiesWithoutRates },
              { name: "Missing company name", value: transportation.quality?.missingCompanyName },
              { name: "Missing company phone", value: transportation.quality?.missingCompanyPhone },
              { name: "Missing company email", value: transportation.quality?.missingCompanyEmail },
              { name: "Disabled types", value: transportation.quality?.disabledTypes },
              { name: "Types without configured rates", value: transportation.quality?.typesWithoutConfiguredRates },
              { name: "Sizes without configured rates", value: transportation.quality?.sizesWithoutConfiguredRates },
              { name: "Unmatched company occurrences", value: transportation.quality?.unmatchedCompanyOccurrences },
              { name: "Type-only occurrences", value: transportation.quality?.typeOnlyOccurrences },
              { name: "Selections missing type", value: transportation.quality?.missingTypeSelections },
              { name: "Selections missing size", value: transportation.quality?.missingSizeSelections },
              { name: "Matched by company ID", value: transportation.quality?.matchedByCompanyId },
              { name: "Matched by name fallback", value: transportation.quality?.matchedByNameFallback },
            ]}
          />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="transportationCompanies" />
        </Col>
      </Row>
    </>
  );
};

TransportationCompaniesTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const UnifiedAnalyticsToolbar = ({
  analytics,
  draft,
  applied,
  loading,
  onChange,
  onApply,
  onClear,
  onExportExcel,
  onExportPdf,
}) => {
  const [open, setOpen] = useState(false);
  const options = analytics?.filterOptions || {};
  const optionFields = [
    ["nationality", "Nationality", options.nationalities],
    ["guide", "Guide", options.guides],
    ["travelAgent", "Travel agent", options.travelAgents],
    ["restaurant", "Restaurant", options.restaurants],
    ["hotel", "Hotel", options.hotels],
    ["transportationCompany", "Transportation company", options.transportationCompanies],
    ["place", "Place", options.places],
    ["status", "Status", options.statuses],
  ];
  const optionLabels = Object.fromEntries(
    optionFields.flatMap(([key, , rows]) =>
      asArray(rows).map(row => [`${key}:${row.id}`, row.name]),
    ),
  );
  const activeEntries = Object.entries(applied).filter(([, value]) => value);
  const activeLabel = (key, value) => {
    if (key === "from") return `From: ${value}`;
    if (key === "to") return `To: ${value}`;
    if (key === "minRating") return `Rating from: ${value}`;
    if (key === "maxRating") return `Rating to: ${value}`;
    const label = optionFields.find(([field]) => field === key)?.[1] || key;
    return `${label}: ${optionLabels[`${key}:${value}`] || value}`;
  };

  return (
    <Card className="dashboard-card mb-4">
      <CardBody>
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h4 className="dashboard-card__title mb-1">Analytics Filters and Export</h4>
            <p className="dashboard-card__subtitle mb-0">
              Filters affect only sections that use the selected data relationship.
            </p>
          </div>
          <div className="d-flex flex-wrap gap-2">
            <Button color="light" className="border" onClick={() => setOpen(current => !current)}>
              <i className="bx bx-filter-alt me-1" />
              {open ? "Hide filters" : "Show filters"}
            </Button>
            <Button color="success" outline disabled={!analytics} onClick={onExportExcel}>
              <i className="bx bx-spreadsheet me-1" /> Export Current Tab Excel
            </Button>
            <Button color="danger" outline disabled={!analytics} onClick={onExportPdf}>
              <i className="bx bxs-file-pdf me-1" /> Export Current Tab PDF
            </Button>
          </div>
        </div>

        {activeEntries.length ? (
          <div className="d-flex flex-wrap gap-2 mt-3">
            {activeEntries.map(([key, value]) => (
              <Badge color="primary" pill key={key}>{activeLabel(key, value)}</Badge>
            ))}
          </div>
        ) : (
          <p className="text-muted small mb-0 mt-3">No filters are active.</p>
        )}

        {open ? (
          <div className="mt-4 pt-3 border-top">
            <Row className="g-3">
              <Col xl={2} md={4} sm={6}>
                <Label for="analytics-from">From</Label>
                <Input id="analytics-from" type="date" value={draft.from} onChange={event => onChange("from", event.target.value)} />
              </Col>
              <Col xl={2} md={4} sm={6}>
                <Label for="analytics-to">To</Label>
                <Input id="analytics-to" type="date" value={draft.to} onChange={event => onChange("to", event.target.value)} />
              </Col>
              {optionFields.map(([key, label, rows]) => (
                <Col xl={2} md={4} sm={6} key={key}>
                  <Label for={`analytics-${key}`}>{label}</Label>
                  <Input id={`analytics-${key}`} type="select" value={draft[key]} onChange={event => onChange(key, event.target.value)}>
                    <option value="">All</option>
                    {asArray(rows).map(row => <option value={row.id} key={row.id}>{row.name}</option>)}
                  </Input>
                </Col>
              ))}
              <Col xl={2} md={4} sm={6}>
                <Label for="analytics-min-rating">Minimum rating</Label>
                <Input id="analytics-min-rating" type="select" value={draft.minRating} onChange={event => onChange("minRating", event.target.value)}>
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
                </Input>
              </Col>
              <Col xl={2} md={4} sm={6}>
                <Label for="analytics-max-rating">Maximum rating</Label>
                <Input id="analytics-max-rating" type="select" value={draft.maxRating} onChange={event => onChange("maxRating", event.target.value)}>
                  <option value="">Any</option>
                  {[1, 2, 3, 4, 5].map(value => <option key={value} value={value}>{value}</option>)}
                </Input>
              </Col>
            </Row>
            <div className="d-flex flex-wrap gap-2 mt-3">
              <Button color="primary" disabled={loading} onClick={onApply}>Apply filters</Button>
              <Button color="light" className="border" disabled={loading} onClick={onClear}>Clear filters</Button>
            </div>
          </div>
        ) : null}
      </CardBody>
    </Card>
  );
};

UnifiedAnalyticsToolbar.propTypes = {
  analytics: PropTypes.object,
  applied: PropTypes.object.isRequired,
  draft: PropTypes.object.isRequired,
  loading: PropTypes.bool.isRequired,
  onApply: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  onExportExcel: PropTypes.func.isRequired,
  onExportPdf: PropTypes.func.isRequired,
};

const TodayStatusTab = ({ analytics }) => {
  const today = analytics.today || {};
  const distribution = today.serviceDistribution || {};
  return (
    <>
      <Alert color="info" className="mb-4">{today.dataBasis}</Alert>
      <InsightGrid
        items={[
          { label: "Active trips today", value: today.activeTripsCount, footer: today.date || "Current schedule date" },
          { label: "Active linked pax", value: today.activePax, footer: "Quotation group pax on active files" },
          { label: "Scheduled days", value: today.scheduledDaysCount, footer: "Quotation-day schedules saved for today" },
          { label: "Explicit Free Days", value: today.explicitFreeDays, footer: today.freeDayBasis },
        ]}
      />
      <Card className="dashboard-card mb-4">
        <CardBody>
          <CardHeaderBlock title="Active Files / Trips Today" subtitle="Reservation files whose quotation dates include today." badge={`${formatNumber(asArray(today.activeTrips).length)} trips`} />
          {asArray(today.activeTrips).length ? (
            <div className="table-responsive">
              <Table className="align-middle mb-0">
                <thead><tr><th>File</th><th>Quotation</th><th>Status</th><th>Start</th><th>End</th><th className="text-end">Pax</th></tr></thead>
                <tbody>{asArray(today.activeTrips).map(row => (
                  <tr key={row.fileId}><td>{row.fileReference || "-"}</td><td>{row.quotationReference || "-"}</td><td>{row.status || "-"}</td><td>{formatDate(row.startDate)}</td><td>{formatDate(row.endDate)}</td><td className="text-end">{formatNumber(row.pax)}</td></tr>
                ))}</tbody>
              </Table>
            </div>
          ) : <EmptyState label="No active reservation-file trips are scheduled for today." />}
        </CardBody>
      </Card>
      <Row className="g-4 mb-4">
        <Col xl={4}><RankingCard title="Guide Types Today" subtitle="Scheduled guide types; specific guide assignment is shown only when stored." rows={distribution.guideTypes} /></Col>
        <Col xl={4}><RankingCard title="Restaurants Today" subtitle="Restaurant rows saved on today’s quotation-day schedules." rows={distribution.restaurants} /></Col>
        <Col xl={4}><RankingCard title="Transportation Today" subtitle="Named transportation companies scheduled today." rows={distribution.transportationCompanies} /></Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={4}><RankingCard title="Transportation Types Today" subtitle="Type-only rows where no specific company is stored." rows={distribution.transportationTypes} /></Col>
        <Col xl={4}><RankingCard title="Places / Activities Today" subtitle="Saved place and entrance rows for today." rows={distribution.places} /></Col>
        <Col xl={4}><RankingCard title="Saved Hotel Options" subtitle="Options for active trips; alternatives may be included and are not confirmed assignments." rows={distribution.hotelOptions} /></Col>
      </Row>
      <Row className="g-4">
        <Col xl={8}><RankingCard title="Today Itinerary Distribution" subtitle="Saved route text from today’s quotation-day schedules." rows={distribution.itinerary} /></Col>
        <Col xl={4}><RankingCard title="Today Data Gaps" subtitle="Schedule and accommodation limitations for current-status reporting." rows={[
          { name: "Active trips without today schedule", value: today.quality?.activeTripsWithoutTodaySchedule },
          { name: "Accommodation records with alternatives", value: today.quality?.accommodationRecordsWithAlternatives },
        ]} /></Col>
      </Row>
    </>
  );
};

TodayStatusTab.propTypes = { analytics: PropTypes.object.isRequired };

const Analytics = ({ t }) => {
  document.title = "Analytics | COE Frontend";

  const [activeTab, setActiveTab] = useState("general");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterDraft, setFilterDraft] = useState({ ...EMPTY_ANALYTICS_FILTERS });
  const [filters, setFilters] = useState({ ...EMPTY_ANALYTICS_FILTERS });
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const data = await getAnalyticsOverview(filters);
        if (mounted) setAnalytics(data);
      } catch (err) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load analytics.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, [filters, reloadKey]);

  const handleFilterChange = (field, value) => {
    setFilterDraft(current => ({ ...current, [field]: value }));
  };

  const applyFilters = () => {
    setFilters({ ...filterDraft });
  };

  const clearFilters = () => {
    setFilterDraft({ ...EMPTY_ANALYTICS_FILTERS });
    setFilters({ ...EMPTY_ANALYTICS_FILTERS });
  };

  const tabContent = () => {
    if (!analytics) return null;
    switch (activeTab) {
      case "users":
        return <UsersTab analytics={analytics} />;
      case "guests":
        return (
          <GuestsNationalitiesTab
            analytics={analytics}
            filterDraft={filterDraft}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
          />
        );
      case "filesTrips":
        return (
          <FilesTripsTab
            analytics={analytics}
            filterDraft={filterDraft}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
          />
        );
      case "ratingsOverview":
        return (
          <RatingsOverviewTab
            analytics={analytics}
            filterDraft={filterDraft}
            onFilterChange={handleFilterChange}
            onApplyFilters={applyFilters}
            onClearFilters={clearFilters}
          />
        );
      case "today":
        return <TodayStatusTab analytics={analytics} />;
      case "hotels":
        return <HotelsTab analytics={analytics} />;
      case "guides":
        return <GuidesTab analytics={analytics} />;
      case "restaurants":
        return <RestaurantsTab analytics={analytics} />;
      case "travelAgents":
        return <TravelAgentsTab analytics={analytics} />;
      case "places":
        return <PlacesTab analytics={analytics} />;
      case "transportationCompanies":
        return <TransportationCompaniesTab analytics={analytics} />;
      case "general":
      default:
        return <GeneralTab analytics={analytics} />;
    }
  };

  return (
    <div className="page-content dashboard-page analytics-page">
      <Container fluid>
        <Breadcrumbs title={t("Dashboards")} breadcrumbItem="Analytics" />

        <Row className="mb-4">
          <Col xs={12}>
            <Card className="dashboard-hero-card">
              <CardBody>
                <div className="dashboard-hero-card__content">
                  <div>
                    <span className="dashboard-hero-card__eyebrow">
                      Company Analytics Workspace
                    </span>
                    <h2 className="dashboard-hero-card__title mb-2">
                      Real system analytics across users, suppliers, pricing,
                      quotations, and traveler feedback
                    </h2>
                    <p className="dashboard-hero-card__text mb-0">
                      The dashboard reads from tenant-scoped backend collections
                      and pairs those results with practical SaaS and travel
                      KPI patterns.
                    </p>
                  </div>
                  <div className="dashboard-hero-card__status">
                    <Badge color="success" className="dashboard-hero-card__pill">
                      Real data mode
                    </Badge>
                    {analytics?.generatedAt ? (
                      <Badge color="light" className="dashboard-hero-card__pill">
                        Updated {formatDate(analytics.generatedAt)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <UnifiedAnalyticsToolbar
          analytics={analytics}
          draft={filterDraft}
          applied={filters}
          loading={loading}
          onChange={handleFilterChange}
          onApply={applyFilters}
          onClear={clearFilters}
          onExportExcel={() => exportAnalyticsExcel(analytics, activeTab)}
          onExportPdf={() => exportAnalyticsPdf(analytics, activeTab)}
        />

        <Card className="dashboard-card analytics-tabs-card mb-4">
          <CardBody>
            <Nav pills className="analytics-tab-nav">
              {TABS.map(tab => (
                <NavItem key={tab.key}>
                  <NavLink
                    href="#"
                    className={activeTab === tab.key ? "active" : ""}
                    onClick={event => {
                      event.preventDefault();
                      setActiveTab(tab.key);
                    }}
                  >
                    <i className={tab.icon} />
                    <span>{tab.label}</span>
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </CardBody>
        </Card>

        {loading ? (
          <div className="analytics-loading">
            <Spinner color="primary" />
            <span>Loading analytics</span>
          </div>
        ) : null}

        {!loading && error ? (
          <Alert color="danger" className="mb-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <span>{error}</span>
              <Button color="danger" outline size="sm" onClick={() => setReloadKey(current => current + 1)}>
                Retry
              </Button>
            </div>
          </Alert>
        ) : null}

        {!loading && !error && analytics ? (
          <>
            <Alert color="light" className="border mb-4">
              <strong>Data basis:</strong> {TAB_DATA_BASIS[activeTab]}
            </Alert>
            <TabContent activeTab={activeTab}>
              <TabPane tabId={activeTab}>{tabContent()}</TabPane>
            </TabContent>
          </>
        ) : null}

        {!loading && !error && analytics?.dataQuality ? (
          <Row className="g-4 mt-1">
            <Col xl={12}>
              <ProfileTable rows={analytics.dataQuality.collectionProfile} />
            </Col>
          </Row>
        ) : null}
      </Container>
    </div>
  );
};

Analytics.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation()(Analytics);
