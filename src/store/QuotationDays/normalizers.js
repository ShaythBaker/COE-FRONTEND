const getId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return getId(value._id);
  if (value?.$oid) return value.$oid;
  return "";
};

const normalizeRoute = item => {
  const basic = item?.basic || {};
  const route = item?.route || {};

  return {
    text: route?.text || basic?.ROUTE_TEXT || item?.ROUTE_TEXT || "",
    cities: Array.isArray(route?.cities) ? route.cities : [],
  };
};

const normalizeTransportationResolved = item => {
  if (Array.isArray(item?.TRANSPORTATION_RESOLVED)) {
    return item.TRANSPORTATION_RESOLVED;
  }

  if (Array.isArray(item?.transportation?.TRANSPORTATION_RESOLVED)) {
    return item.transportation.TRANSPORTATION_RESOLVED;
  }

  if (!item?.TRANSPORTATION_TYPE && !item?.TRANSPORTATION_BY) {
    return [];
  }

  return [
    {
      TRANSPORTATION_TYPE_ID: item?.TRANSPORTATION_TYPE || null,
      TRANSPORTATION_TYPE_NAME: item?.TRANSPORTATION_TYPE_NAME || "",
      TRANSPORTATION_COMPANY_ID: item?.TRANSPORTATION_COMPANY_ID || null,
      TRANSPORTATION_COMPANY_NAME: item?.TRANSPORTATION_COMPANY_NAME || "",
      TRANSPORTATION_SIZE_ID: item?.TRANSPORTATION_BY || null,
      TRANSPORTATION_BY: item?.TRANSPORTATION_SIZE_LABEL || "",
      MINIMUM_CAPACITY: item?.TRANSPORTATION_MIN_CAPACITY ?? null,
      MAXIMUM_CAPACITY: item?.TRANSPORTATION_MAX_CAPACITY ?? null,
      RATE_ID: item?.TRANSPORTATION_RATE_ID || null,
      RATE: item?.TRANSPORTATION_RATE ?? null,
    },
  ];
};

const normalizeGuide = item => {
  if (item?.guide) {
    return {
      enabled: !!item.guide?.enabled,
      GUIDE_TYPE: item.guide?.GUIDE_TYPE || null,
      GUIDE_TYPE_NAME: item.guide?.GUIDE_TYPE_NAME || "",
    };
  }

  return {
    enabled: !!item?.GUIDE_TYPE,
    GUIDE_TYPE: item?.GUIDE_TYPE || null,
    GUIDE_TYPE_NAME: item?.GUIDE_TYPE_NAME || "",
  };
};

const normalizeMealsRows = item => {
  if (Array.isArray(item?.meals?.rows)) {
    return item.meals.rows;
  }

  if (!Array.isArray(item?.MEALS)) {
    return [];
  }

  return item.MEALS.map(row => ({
    CITY_ID: getId(row?.CITY_ID || row?.REATAURANT_CITY || row?.RESTAURANT_CITY),
    CITY_NAME: row?.CITY_NAME || "",
    RESTAURANT_ID: getId(row?.RESTAURANT_ID),
    RESTAURANT_NAME: row?.RESTAURANT_NAME || row?.REATAURANT_NAME || "",
    MEAL_TYPE: getId(row?.MEAL_TYPE) || row?.MEAL_TYPE || "",
    MEAL_NAME: row?.MEAL_NAME || "",
    MEAL_PRICE_PER_PERSON: row?.MEAL_PRICE_PER_PERSON ?? null,
  }));
};

const normalizeEntranceFees = item => {
  if (Array.isArray(item?.NTRANCE_FEES)) {
    return item.NTRANCE_FEES;
  }

  if (Array.isArray(item?.entranceFees?.selectedPlaces)) {
    return item.entranceFees.selectedPlaces;
  }

  if (!Array.isArray(item?.PLACES)) {
    return [];
  }

  return item.PLACES.map(row => ({
    PLACE_ID: getId(row?.PLACE_ID || row),
    PLACE_NAME: row?.PLACE_NAME || "",
    PLACE_CITY: getId(row?.PLACE_CITY),
    PLACE_CITY_NAME: row?.PLACE_CITY_NAME || "",
    ENTRANCE_FEE_AMOUNT: row?.ENTRANCE_FEE_AMOUNT ?? null,
  }));
};

export const normalizeQuotationDay = item => {
  if (!item) return item;

  const basic = item?.basic || {
    _id: item?._id || "",
    ORIGINAL_QUOTATION_ID: item?.ORIGINAL_QUOTATION_ID || "",
    DAY_ORDER: item?.DAY_ORDER ?? null,
    DAY_DATE: item?.DAY_DATE || "",
    ROUTE_TEXT: item?.ROUTE_TEXT || "",
  };
  const route = normalizeRoute(item);
  const transportationResolved = normalizeTransportationResolved(item);
  const primaryTransportation = transportationResolved[0] || {};
  const guide = normalizeGuide(item);
  const mealRows = normalizeMealsRows(item);
  const meals = item?.meals || {
    enabled: mealRows.length > 0,
    rows: mealRows,
  };
  const entranceFees = normalizeEntranceFees(item);
  const totalEntranceFees =
    item?.TOTAL_ENTRANCE_FEES ??
    item?.entranceFees?.total ??
    entranceFees.reduce(
      (sum, row) => sum + (Number(row?.ENTRANCE_FEE_AMOUNT) || 0),
      0
    );
  const overnight = item?.overnight || {
    OVERNIGHT_CITY: item?.OVERNIGHT_CITY || null,
    OVERNIGHT_CITY_NAME: item?.OVERNIGHT_CITY_NAME || "",
  };

  return {
    ...item,
    basic,
    route,
    TRANSPORTATION_RESOLVED: transportationResolved,
    guide,
    meals,
    NTRANCE_FEES: entranceFees,
    TOTAL_ENTRANCE_FEES: totalEntranceFees,
    overnight,

    _id: item?._id || basic?._id || "",
    ORIGINAL_QUOTATION_ID:
      item?.ORIGINAL_QUOTATION_ID || basic?.ORIGINAL_QUOTATION_ID || "",
    DAY_ORDER: item?.DAY_ORDER ?? basic?.DAY_ORDER ?? null,
    DAY_DATE: item?.DAY_DATE || basic?.DAY_DATE || "",
    ROUTE_TEXT: item?.ROUTE_TEXT || basic?.ROUTE_TEXT || route?.text || "",

    TRANSPORTATION_TYPE:
      item?.TRANSPORTATION_TYPE || primaryTransportation?.TRANSPORTATION_TYPE_ID || "",
    TRANSPORTATION_COMPANY_ID:
      item?.TRANSPORTATION_COMPANY_ID ||
      primaryTransportation?.TRANSPORTATION_COMPANY_ID ||
      "",
    TRANSPORTATION_BY:
      item?.TRANSPORTATION_BY || primaryTransportation?.TRANSPORTATION_SIZE_ID || "",
    TRANSPORTATION_COMPANY_NAME:
      item?.TRANSPORTATION_COMPANY_NAME ||
      primaryTransportation?.TRANSPORTATION_COMPANY_NAME ||
      "",
    TRANSPORTATION_RATE_ID:
      item?.TRANSPORTATION_RATE_ID || primaryTransportation?.RATE_ID || "",
    TRANSPORTATION_RATE:
      item?.TRANSPORTATION_RATE ?? primaryTransportation?.RATE ?? null,
    TRANSPORTATION_SIZE_LABEL:
      item?.TRANSPORTATION_SIZE_LABEL || primaryTransportation?.TRANSPORTATION_BY || "",
    TRANSPORTATION_MIN_CAPACITY:
      item?.TRANSPORTATION_MIN_CAPACITY ??
      primaryTransportation?.MINIMUM_CAPACITY ??
      null,
    TRANSPORTATION_MAX_CAPACITY:
      item?.TRANSPORTATION_MAX_CAPACITY ??
      primaryTransportation?.MAXIMUM_CAPACITY ??
      null,

    GUIDE_TYPE: item?.GUIDE_TYPE || guide?.GUIDE_TYPE || "",
    GUIDE_TYPE_NAME: item?.GUIDE_TYPE_NAME || guide?.GUIDE_TYPE_NAME || "",
    hasGuide:
      item?.hasGuide !== undefined ? !!item.hasGuide : !!guide?.enabled,

    MEALS: mealRows.map(row => ({
      CITY_ID: row?.CITY_ID || "",
      RESTAURANT_ID: row?.RESTAURANT_ID || "",
      MEAL_TYPE: row?.MEAL_TYPE || "",
      MEAL_PRICE_PER_PERSON: row?.MEAL_PRICE_PER_PERSON ?? null,
    })),
    hasMeals:
      item?.hasMeals !== undefined ? !!item.hasMeals : !!meals?.enabled,

    PLACES: entranceFees,
    selectedEntranceFeePlaceIds: entranceFees.map(row => getId(row?.PLACE_ID)).filter(Boolean),
    OVERNIGHT_CITY: item?.OVERNIGHT_CITY || overnight?.OVERNIGHT_CITY || "",
    OVERNIGHT_CITY_NAME:
      item?.OVERNIGHT_CITY_NAME || overnight?.OVERNIGHT_CITY_NAME || "",
  };
};

export const normalizeQuotationDays = items =>
  (Array.isArray(items) ? items : []).map(normalizeQuotationDay);
