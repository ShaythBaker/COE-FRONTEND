export const ADMIN_ROLE = "COMPANY_ADMIN";

export const dashboardAnalyticsMock = {
  hotels: {
    total: 154,
    subtitle: "Explore hotel inventory by city, chain, or star rating.",
    monthlyTrend: [101, 109, 116, 124, 132, 141, 154],
    breakdowns: {
      city: [
        { name: "Amman", value: 42 },
        { name: "Aqaba", value: 31 },
        { name: "Petra", value: 21 },
        { name: "Dead Sea", value: 26 },
        { name: "Jerash", value: 13 },
        { name: "Madaba", value: 21 },
      ],
      chain: [
        { name: "Travco", value: 34 },
        { name: "Hilton", value: 29 },
        { name: "Marriott", value: 25 },
        { name: "Movenpick", value: 21 },
        { name: "Independent", value: 45 },
      ],
      stars: [
        { name: "3 Star", value: 26 },
        { name: "4 Star", value: 51 },
        { name: "5 Star", value: 77 },
      ],
    },
    payloadHint:
      "hotels.total, hotels.breakdowns.city[], hotels.breakdowns.chain[], hotels.breakdowns.stars[]",
  },
  restaurants: {
    total: 267,
    subtitle: "Restaurant distribution by destination.",
    monthlyTrend: [173, 182, 194, 211, 228, 244, 267],
    byCity: [
      { name: "Amman", value: 86 },
      { name: "Aqaba", value: 54 },
      { name: "Petra", value: 37 },
      { name: "Dead Sea", value: 31 },
      { name: "Madaba", value: 35 },
      { name: "Jerash", value: 24 },
    ],
    payloadHint: "restaurants.total, restaurants.byCity[]",
  },
  quotations: {
    total: 614,
    subtitle: "Generated quotations and operational status by month.",
    months: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
    generated: [48, 55, 63, 71, 77, 84, 102, 114],
    approved: [22, 28, 31, 38, 41, 46, 57, 61],
    pending: [15, 17, 19, 22, 24, 26, 28, 31],
    cancelled: [4, 5, 4, 6, 5, 7, 8, 6],
    payloadHint:
      "quotations.months[], quotations.generated[], quotations.approved[], quotations.pending[], quotations.cancelled[]",
  },
  travelAgents: {
    total: 21,
    subtitle: "Travel agents grouped by country with quotation volumes.",
    countries: [
      {
        country: "Jordan",
        totalQuotations: 297,
        agentCount: 7,
        agents: [
          { name: "Royal DMC", quotations: 128, status: "High activity" },
          { name: "Petra Horizon", quotations: 93, status: "Stable" },
          { name: "Desert Link", quotations: 76, status: "Growing" },
        ],
      },
      {
        country: "Saudi Arabia",
        totalQuotations: 145,
        agentCount: 5,
        agents: [
          { name: "Riyadh Routes", quotations: 84, status: "High activity" },
          { name: "Najd Travel", quotations: 61, status: "Stable" },
        ],
      },
      {
        country: "United Arab Emirates",
        totalQuotations: 121,
        agentCount: 4,
        agents: [
          { name: "Emirates Trails", quotations: 72, status: "Stable" },
          { name: "Gulf Sky", quotations: 49, status: "Emerging" },
        ],
      },
      {
        country: "Egypt",
        totalQuotations: 51,
        agentCount: 5,
        agents: [
          { name: "Nile Partners", quotations: 31, status: "Emerging" },
          { name: "Pyramids Connect", quotations: 20, status: "Emerging" },
        ],
      },
    ],
    payloadHint:
      "travelAgents.countries[].country, travelAgents.countries[].agents[].quotations",
  },
  users: {
    total: 83,
    active: 71,
    subtitle: "Active user base split across operational roles.",
    byRole: [
      { name: "COMPANY_ADMIN", value: 5 },
      { name: "ACCOUNTING", value: 8 },
      { name: "OPERATION", value: 18 },
      { name: "TOUR_OPERATION", value: 11 },
      { name: "CONTRACTING", value: 9 },
      { name: "QUALITY", value: 6 },
      { name: "USER", value: 26 },
    ],
    payloadHint: "users.total, users.active, users.byRole[]",
  },
};
