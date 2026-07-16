const FULL_DATE_SECTIONS = [
  "arrDep",
  "hotels",
  "transportation",
  "guides",
  "entrance",
  "restaurants",
  "extras",
];

const FULL_SPECIAL_RATES_SECTIONS = [
  "hotels",
  "transportation",
  "guides",
  "restaurants",
  "extras",
];

const SECTION_PLANS = {
  "RES Details": {},
  General: {},
  "Arr/Dep": { dateSections: ["arrDep"] },
  Hotels: {
    dateSections: ["hotels"],
    specialRatesSections: ["hotels"],
  },
  Transportation: {
    dateSections: ["transportation"],
    specialRatesSections: ["transportation"],
  },
  Guides: {
    dateSections: ["guides"],
    specialRatesSections: ["guides"],
  },
  Entrance: { dateSections: ["entrance"] },
  Restaurants: {
    dateSections: ["restaurants"],
    specialRatesSections: ["restaurants"],
  },
  Extras: {
    dateSections: ["extras"],
    specialRatesSections: ["extras"],
  },
  Inclusions: {},
  Attach: {},
  Reminder: {},
  Log: {},
};

export const buildReservationSaveValidationPlan = ({
  activeSection = "",
  activeClientsTab = "manifest",
  fullReservation = false,
} = {}) => {
  let plan;

  if (fullReservation) {
    plan = {
      dateSections: [...FULL_DATE_SECTIONS],
      specialRatesSections: [...FULL_SPECIAL_RATES_SECTIONS],
      validateRoomingList: true,
    };
  } else if (activeSection === "Clients") {
    plan = {
      dateSections: [],
      specialRatesSections: [],
      validateRoomingList: activeClientsTab === "roomingList",
    };
  } else {
    const sectionPlan = SECTION_PLANS[activeSection] || {};
    plan = {
      dateSections: [...(sectionPlan.dateSections || [])],
      specialRatesSections: [...(sectionPlan.specialRatesSections || [])],
      validateRoomingList: false,
    };
  }

  const validationSections = Array.from(
    new Set([
      ...plan.dateSections,
      ...plan.specialRatesSections,
      ...(plan.validateRoomingList ? ["roomingList"] : []),
    ])
  );

  return {
    ...plan,
    validationScope: {
      mode: fullReservation ? "full" : "tab",
      sections: validationSections,
    },
  };
};
