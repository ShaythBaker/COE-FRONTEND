// path: src/pages/Quotations/Plan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Collapse,
  Container,
  FormFeedback,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError, notifyInfo } from "../../helpers/notify";
import { fetchQuotation } from "../../store/Quotations/actions";
import {
  createQuotationDay,
  fetchQuotationDayLookups,
  fetchQuotationDays,
  fetchRestaurantsByCity,
  fetchRouteEntranceFeePlaces,
  fetchTransportationBestRate,
  updateQuotationDay,
} from "../../store/QuotationDays/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const toDateOnly = value => {
  if (!value) return "";
  const str = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDays = (dateStr, daysToAdd) => {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + daysToAdd);

  const nextYear = d.getFullYear();
  const nextMonth = String(d.getMonth() + 1).padStart(2, "0");
  const nextDay = String(d.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const getId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return getId(value._id);
  if (value?.$oid) return value.$oid;
  return "";
};

const routeKey = (cityId, nationalityId) => `${cityId || ""}__${nationalityId || ""}`;
const bestRateKey = (typeId, pax, transportationCompanyId) =>
  `${typeId || ""}__${pax || 0}__${transportationCompanyId || ""}`;

const getTransportationTypeLabel = item =>
  item?.TRANSPORTATION_TYPE_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getGuideTypeLabel = item =>
  item?.ITEM_VALUE ||
  item?.LIST_ITEM_VALUE ||
  item?.LIST_ITEM_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getRestaurantLabel = item =>
  item?.REATAURANT_NAME ||
  item?.RESTAURANT_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getMealLabel = item =>
  item?.MEAL_NAME || item?.NAME || item?.TITLE || item?.VALUE || "-";

const getMealValue = item =>
  getId(item) || item?.MEAL_TYPE || item?.MEAL_NAME || item?.NAME || "";

const getCityLabel = item =>
  item?.ITEM_VALUE ||
  item?.LIST_ITEM_VALUE ||
  item?.LIST_ITEM_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getCompanyLabel = item =>
  item?.COMPANY_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getSizeTypeLabel = item =>
  item?.TRANSPORTATION_TYPE ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getEntranceFeeAmount = (place, nationalityId) => {
  if (!place || !nationalityId) return 0;

  const fee = Array.isArray(place.ENTRANCE_FEES)
    ? place.ENTRANCE_FEES.find(
        item =>
          getId(item?.ENTRANCE_FEE_NATIONALATY) === nationalityId ||
          getId(item?.NATIONALITY_ID) === nationalityId
      )
    : null;

  return Number(fee?.ENTRANCE_FEE_AMOUNT ?? 0) || 0;
};

const buildDayState = ({
  quotationId,
  order,
  date,
  existing,
  cities = [],
}) => {
  const cityById = new Map(cities.map(city => [getId(city), city]));
  const existingSelectedPlaces = Array.isArray(existing?.PLACES) ? existing.PLACES : [];

  const existingCityNames = Array.from(
    new Set(
      existingSelectedPlaces
        .map(place => {
          const cityId = getId(place?.PLACE_CITY);
          const city = cityById.get(cityId);
          return city ? getCityLabel(city) : "";
        })
        .filter(Boolean)
    )
  );

  const existingMeals = Array.isArray(existing?.MEALS) ? existing.MEALS : [];

  return {
    _id: existing?._id || "",
    ORIGINAL_QUOTATION_ID: quotationId,
    DAY_ORDER: order,
    DAY_DATE: date,
    ROUTE_TEXT:
      existing?.ROUTE_TEXT ||
      existing?.DAY_SNAPSHOT?.route?.text ||
      existing?.ROUTE?.text ||
      existingCityNames.join(" - "),
    TRANSPORTATION_TYPE: getId(existing?.TRANSPORTATION_TYPE),
    TRANSPORTATION_COMPANY_ID: getId(
      existing?.TRANSPORTATION_COMPANY_ID || existing?.TRANSPORTATION_COMPANY
    ),
    TRANSPORTATION_BY: getId(existing?.TRANSPORTATION_BY),
    TRANSPORTATION_COMPANY_NAME:
      existing?.TRANSPORTATION_COMPANY_NAME ||
      existing?.TRANSPORTATION_COMPANY?.COMPANY_NAME ||
      "",
    TRANSPORTATION_RATE_ID: getId(existing?.TRANSPORTATION_RATE_ID || existing?.TRANSPORTATION_RATE),
    TRANSPORTATION_RATE:
      existing?.TRANSPORTATION_RATE?.RATE ??
      existing?.TRANSPORTATION_RATE_AMOUNT ??
      existing?.TRANSPORTATION_RATE ??
      null,
    TRANSPORTATION_SIZE_LABEL:
      existing?.TRANSPORTATION_SIZE_LABEL ||
      existing?.TRANSPORTATION_BY_VALUE ||
      "",
    TRANSPORTATION_MIN_CAPACITY:
      existing?.TRANSPORTATION_MIN_CAPACITY ??
      existing?.TRANSPORTATION_BY?.MINIMUM_CAPACITY ??
      null,
    TRANSPORTATION_MAX_CAPACITY:
      existing?.TRANSPORTATION_MAX_CAPACITY ??
      existing?.TRANSPORTATION_BY?.MAXIMUM_CAPACITY ??
      null,
    hasGuide: !!getId(existing?.GUIDE_TYPE),
    GUIDE_TYPE: getId(existing?.GUIDE_TYPE),
    hasMeals: existingMeals.length > 0,
    MEALS:
      existingMeals.length > 0
        ? existingMeals.map(m => ({
            CITY_ID: getId(m?.CITY_ID || m?.REATAURANT_CITY || m?.RESTAURANT_CITY),
            RESTAURANT_ID: getId(m?.RESTAURANT_ID),
            MEAL_TYPE: getId(m?.MEAL_TYPE) || getMealValue(m),
          }))
        : [{ CITY_ID: "", RESTAURANT_ID: "", MEAL_TYPE: "" }],
    selectedEntranceFeePlaceIds: existingSelectedPlaces.map(p => getId(p)).filter(Boolean),
    OVERNIGHT_CITY: getId(existing?.OVERNIGHT_CITY),
    touched: {},
  };
};

const SectionCard = ({ icon, title, subtitle, children, className = "" }) => (
  <div className={`border rounded p-3 h-100 ${className}`}>
    <div className="d-flex align-items-start mb-3">
      <div className="avatar-xs me-3">
        <span className="avatar-title rounded-circle bg-primary-subtle text-primary font-size-16">
          <i className={`bx ${icon}`} />
        </span>
      </div>
      <div>
        <h5 className="mb-1">{title}</h5>
        {subtitle ? <p className="text-muted mb-0 small">{subtitle}</p> : null}
      </div>
    </div>
    {children}
  </div>
);

const DayToggle = ({ active, onYes, onNo }) => (
  <div className="d-flex flex-wrap gap-2">
    <Button type="button" color={active ? "primary" : "light"} onClick={onYes}>
      <i className="bx bx-check me-1" />
      Yes
    </Button>
    <Button type="button" color={!active ? "danger" : "light"} onClick={onNo}>
      <i className="bx bx-x me-1" />
      No
    </Button>
  </div>
);

const PlanQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const quotationState = useSelector(state => state.Quotations || {});
  const quotation = quotationState?.selected;

  const {
    items = [],
    loading,
    lookups = {},
    lookupsLoading,
    restaurantsByCityId = {},
    restaurantsLoadingByCityId = {},
    routeEntranceFeePlacesByKey = {},
    routeEntranceFeePlacesLoadingByKey = {},
    transportationBestRateByKey = {},
    transportationBestRateLoadingByKey = {},
    transportationBestRateErrorByKey = {},
  } = useSelector(state => state.QuotationDays || {});

  const roles = useSelector(state => state.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [dayForms, setDayForms] = useState([]);
  const [openDays, setOpenDays] = useState({});
  const [savingDayOrder, setSavingDayOrder] = useState(null);

  const transportationTypes = lookups?.transportationTypes || [];
  const transportationCompanies = lookups?.transportationCompanies || [];
  const guideTypes = lookups?.guideTypes || [];
  const cities = lookups?.cities || [];

  const quotationStartDate = toDateOnly(quotation?.QUOTATION_START_DATE);
  const totalDays = Number(quotation?.DURATION_IN_DAYS) > 0 ? Number(quotation?.DURATION_IN_DAYS) : 0;
  const quotationNationalityId = getId(quotation?.NATIONALITY);
  const quotationPax = Number(quotation?.NUMBER_OF_PAX || 0);

  const cityNameMap = useMemo(() => {
    const map = new Map();
    cities.forEach(city => {
      map.set(getCityLabel(city).trim().toLowerCase(), city);
    });
    return map;
  }, [cities]);

  useEffect(() => {
    if (id) {
      dispatch(fetchQuotation(id));
      dispatch(fetchQuotationDays(id));
      dispatch(fetchQuotationDayLookups());
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!quotation?._id || !quotationStartDate || !totalDays) {
      setDayForms([]);
      setOpenDays({});
      return;
    }

    const generatedDays = Array.from({ length: totalDays }, (_, index) => {
      const dayOrder = index + 1;
      const dayDate = addDays(quotationStartDate, index);
      const existing = (items || []).find(item => Number(item?.DAY_ORDER) === dayOrder);

      return buildDayState({
        quotationId: quotation._id,
        order: dayOrder,
        date: dayDate,
        existing,
        cities,
      });
    });

    setDayForms(generatedDays);
    setOpenDays(prev => {
      if (Object.keys(prev).length) return prev;

      const next = {};
      generatedDays.forEach((day, index) => {
        next[day.DAY_ORDER] = index === 0;
      });
      return next;
    });
  }, [quotation?._id, quotationStartDate, totalDays, items, cities]);

  useEffect(() => {
    if (!quotationPax) return;

    dayForms.forEach(day => {
      if (!day?.TRANSPORTATION_TYPE || !day?.TRANSPORTATION_COMPANY_ID) return;

      const key = bestRateKey(
        day.TRANSPORTATION_TYPE,
        quotationPax,
        day.TRANSPORTATION_COMPANY_ID
      );

      if (
        !transportationBestRateByKey?.[key] &&
        !transportationBestRateLoadingByKey?.[key] &&
        !transportationBestRateErrorByKey?.[key]
      ) {
        dispatch(
          fetchTransportationBestRate(
            day.TRANSPORTATION_TYPE,
            quotationPax,
            day.TRANSPORTATION_COMPANY_ID
          )
        );
      }
    });
  }, [
    dayForms,
    quotationPax,
    transportationBestRateByKey,
    transportationBestRateLoadingByKey,
    transportationBestRateErrorByKey,
    dispatch,
  ]);

  useEffect(() => {
    if (!quotationPax) return;

    setDayForms(prev =>
      prev.map(day => {
        if (!day.TRANSPORTATION_TYPE || !day.TRANSPORTATION_COMPANY_ID) return day;

        const key = bestRateKey(
          day.TRANSPORTATION_TYPE,
          quotationPax,
          day.TRANSPORTATION_COMPANY_ID
        );

        const bestRate = transportationBestRateByKey?.[key];
        const bestRateError = transportationBestRateErrorByKey?.[key];

        if (bestRate?.size?._id) {
          return {
            ...day,
            TRANSPORTATION_BY: getId(bestRate?.size),
            TRANSPORTATION_COMPANY_ID: getId(bestRate?.company),
            TRANSPORTATION_COMPANY_NAME: getCompanyLabel(bestRate?.company),
            TRANSPORTATION_RATE_ID: getId(bestRate?.rate),
            TRANSPORTATION_RATE: bestRate?.rate?.RATE ?? null,
            TRANSPORTATION_SIZE_LABEL: getSizeTypeLabel(bestRate?.size),
            TRANSPORTATION_MIN_CAPACITY:
              bestRate?.size?.MINIMUM_CAPACITY ?? bestRate?.size?.CAPACITY ?? null,
            TRANSPORTATION_MAX_CAPACITY:
              bestRate?.size?.MAXIMUM_CAPACITY ?? bestRate?.size?.CAPACITY ?? null,
          };
        }

        if (bestRateError) {
          return {
            ...day,
            TRANSPORTATION_BY: "",
            TRANSPORTATION_COMPANY_NAME: "",
            TRANSPORTATION_RATE_ID: "",
            TRANSPORTATION_RATE: null,
            TRANSPORTATION_SIZE_LABEL: "",
            TRANSPORTATION_MIN_CAPACITY: null,
            TRANSPORTATION_MAX_CAPACITY: null,
          };
        }

        return day;
      })
    );
  }, [transportationBestRateByKey, transportationBestRateErrorByKey, quotationPax]);

  useEffect(() => {
    if (!quotationNationalityId) return;

    dayForms.forEach(day => {
      const { uniqueCities, unknownNames } = parseRouteCities(day.ROUTE_TEXT);

      if (unknownNames.length > 0) return;

      uniqueCities.forEach(city => {
        const cityId = getId(city);
        const key = routeKey(cityId, quotationNationalityId);

        if (
          cityId &&
          !routeEntranceFeePlacesByKey?.[key] &&
          !routeEntranceFeePlacesLoadingByKey?.[key]
        ) {
          dispatch(fetchRouteEntranceFeePlaces(cityId, quotationNationalityId));
        }
      });
    });
  }, [
    dayForms,
    quotationNationalityId,
    routeEntranceFeePlacesByKey,
    routeEntranceFeePlacesLoadingByKey,
    dispatch,
  ]);

  useEffect(() => {
    dayForms.forEach(day => {
      if (!day?.hasMeals) return;

      (day.MEALS || []).forEach(meal => {
        if (
          meal?.CITY_ID &&
          !restaurantsByCityId?.[meal.CITY_ID] &&
          !restaurantsLoadingByCityId?.[meal.CITY_ID]
        ) {
          dispatch(fetchRestaurantsByCity(meal.CITY_ID));
        }
      });
    });
  }, [dayForms, restaurantsByCityId, restaurantsLoadingByCityId, dispatch]);

  useEffect(() => {
    dayForms.forEach(day => {
      const dayLog = buildBackendDayPayload(day);

      console.groupCollapsed(`[PlanQuotation] Day ${day.DAY_ORDER}`);
      console.log("Basic", dayLog.basic);
      console.log("Route", dayLog.route);
      console.log("TRANSPORTATION_RESOLVED", dayLog.TRANSPORTATION_RESOLVED);
      console.log("Guide", dayLog.guide);
      console.log("Meals", dayLog.meals);
      console.log("NTRANCE_FEES", dayLog.NTRANCE_FEES);
      console.log("TOTAL_ENTRANCE_FEES", dayLog.TOTAL_ENTRANCE_FEES);
      console.log("Overnight", dayLog.overnight);
      console.log("Backend Payload", dayLog);
      console.log("Full Day JSON", JSON.stringify(dayLog, null, 2));
      console.groupEnd();
    });
  }, [
    dayForms,
    cities,
    transportationTypes,
    transportationCompanies,
    guideTypes,
    quotationNationalityId,
    restaurantsByCityId,
  ]);

  const parseRouteCities = routeText => {
    const rawSegments = String(routeText || "")
      .split("-")
      .map(item => item.trim())
      .filter(Boolean);

    const matchedCities = [];
    const unknownNames = [];

    rawSegments.forEach(name => {
      const city = cityNameMap.get(name.toLowerCase());
      if (city) {
        matchedCities.push(city);
      } else {
        unknownNames.push(name);
      }
    });

    const uniqueCities = [];
    const seen = new Set();

    matchedCities.forEach(city => {
      const cityId = getId(city);
      if (!seen.has(cityId)) {
        seen.add(cityId);
        uniqueCities.push(city);
      }
    });

    return { uniqueCities, unknownNames };
  };

  const requestTransportationBestRate = (
    transportationType,
    transportationCompanyId
  ) => {
    if (!quotationPax || !transportationType || !transportationCompanyId) return;

    dispatch(
      fetchTransportationBestRate(
        transportationType,
        quotationPax,
        transportationCompanyId
      )
    );
  };

  const requestRouteEntranceFees = routeText => {
    if (!quotationNationalityId) return;

    const { uniqueCities, unknownNames } = parseRouteCities(routeText);
    if (unknownNames.length > 0) return;

    uniqueCities.forEach(city => {
      const cityId = getId(city);
      if (!cityId) return;
      dispatch(fetchRouteEntranceFeePlaces(cityId, quotationNationalityId));
    });
  };

  const setDayValue = (dayOrder, updater) => {
    setDayForms(prev =>
      prev.map(item =>
        item.DAY_ORDER === dayOrder
          ? typeof updater === "function"
            ? updater(item)
            : { ...item, ...updater }
          : item
      )
    );
  };

  const handleFieldChange = (dayOrder, field, value) => {
    const currentDay =
      dayForms.find(item => item.DAY_ORDER === dayOrder) || null;

    setDayValue(dayOrder, current => {
      const next = {
        ...current,
        [field]: value,
        touched: {
          ...current.touched,
          [field]: true,
        },
      };

      if (field === "TRANSPORTATION_TYPE") {
        next.TRANSPORTATION_BY = "";
        next.TRANSPORTATION_RATE_ID = "";
        next.TRANSPORTATION_RATE = null;
        next.TRANSPORTATION_SIZE_LABEL = "";
        next.TRANSPORTATION_MIN_CAPACITY = null;
        next.TRANSPORTATION_MAX_CAPACITY = null;
      }

      if (field === "TRANSPORTATION_COMPANY_ID") {
        next.TRANSPORTATION_BY = "";
        next.TRANSPORTATION_RATE_ID = "";
        next.TRANSPORTATION_RATE = null;
        next.TRANSPORTATION_SIZE_LABEL = "";
        next.TRANSPORTATION_MIN_CAPACITY = null;
        next.TRANSPORTATION_MAX_CAPACITY = null;

        const selectedCompany =
          transportationCompanies.find(x => getId(x) === value) || null;
        next.TRANSPORTATION_COMPANY_NAME = selectedCompany
          ? getCompanyLabel(selectedCompany)
          : "";
      }

      return next;
    });

    if (field === "ROUTE_TEXT") {
      requestRouteEntranceFees(value);
    }

    if (field === "TRANSPORTATION_TYPE" || field === "TRANSPORTATION_COMPANY_ID") {
      const nextTransportationType =
        field === "TRANSPORTATION_TYPE"
          ? value
          : currentDay?.TRANSPORTATION_TYPE || "";
      const nextTransportationCompanyId =
        field === "TRANSPORTATION_COMPANY_ID"
          ? value
          : currentDay?.TRANSPORTATION_COMPANY_ID || "";

      requestTransportationBestRate(
        nextTransportationType,
        nextTransportationCompanyId
      );
    }
  };

  const handleToggleGuide = (dayOrder, nextValue) => {
    setDayValue(dayOrder, current => ({
      ...current,
      hasGuide: nextValue,
      GUIDE_TYPE: nextValue ? current.GUIDE_TYPE : "",
      touched: {
        ...current.touched,
        GUIDE_TYPE: true,
      },
    }));
  };

  const handleToggleMeals = (dayOrder, nextValue) => {
    setDayValue(dayOrder, current => ({
      ...current,
      hasMeals: nextValue,
      MEALS: nextValue
        ? current.MEALS?.length
          ? current.MEALS
          : [{ CITY_ID: "", RESTAURANT_ID: "", MEAL_TYPE: "" }]
        : [{ CITY_ID: "", RESTAURANT_ID: "", MEAL_TYPE: "" }],
      touched: {
        ...current.touched,
        MEALS: true,
      },
    }));
  };

  const handleMealFieldChange = (dayOrder, index, field, value) => {
    setDayValue(dayOrder, current => {
      const nextMeals = [...(current.MEALS || [])];
      const currentRow = nextMeals[index] || { CITY_ID: "", RESTAURANT_ID: "", MEAL_TYPE: "" };

      nextMeals[index] = {
        ...currentRow,
        [field]: value,
        ...(field === "CITY_ID" ? { RESTAURANT_ID: "", MEAL_TYPE: "" } : {}),
        ...(field === "RESTAURANT_ID" ? { MEAL_TYPE: "" } : {}),
      };

      return {
        ...current,
        MEALS: nextMeals,
        touched: {
          ...current.touched,
          MEALS: true,
        },
      };
    });

    if (field === "CITY_ID" && value) {
      dispatch(fetchRestaurantsByCity(value));
    }
  };

  const addMealRow = dayOrder => {
    setDayValue(dayOrder, current => ({
      ...current,
      MEALS: [...(current.MEALS || []), { CITY_ID: "", RESTAURANT_ID: "", MEAL_TYPE: "" }],
      touched: {
        ...current.touched,
        MEALS: true,
      },
    }));
  };

  const removeMealRow = (dayOrder, index) => {
    setDayValue(dayOrder, current => {
      const nextMeals = (current.MEALS || []).filter((_, i) => i !== index);
      return {
        ...current,
        MEALS: nextMeals.length ? nextMeals : [{ CITY_ID: "", RESTAURANT_ID: "", MEAL_TYPE: "" }],
        touched: {
          ...current.touched,
          MEALS: true,
        },
      };
    });
  };

  const toggleDayCollapse = dayOrder => {
    setOpenDays(prev => ({
      ...prev,
      [dayOrder]: !prev[dayOrder],
    }));
  };

  const getDayEntranceFeePlaces = day => {
    const { uniqueCities, unknownNames } = parseRouteCities(day.ROUTE_TEXT);
    const merged = [];
    const seen = new Set();

    uniqueCities.forEach(city => {
      const cityId = getId(city);
      const key = routeKey(cityId, quotationNationalityId);
      const itemsByCity = routeEntranceFeePlacesByKey?.[key] || [];

      itemsByCity.forEach(place => {
        const placeId = getId(place);
        if (!seen.has(placeId)) {
          seen.add(placeId);
          merged.push(place);
        }
      });
    });

    return { uniqueCities, unknownNames, places: merged };
  };

  const toggleEntranceFeePlace = (dayOrder, placeId, checked) => {
    setDayValue(dayOrder, current => {
      const currentIds = Array.isArray(current.selectedEntranceFeePlaceIds)
        ? current.selectedEntranceFeePlaceIds
        : [];

      const nextIds = checked
        ? Array.from(new Set([...currentIds, placeId]))
        : currentIds.filter(idValue => idValue !== placeId);

      return {
        ...current,
        selectedEntranceFeePlaceIds: nextIds,
        touched: {
          ...current.touched,
          selectedEntranceFeePlaceIds: true,
        },
      };
    });
  };

  const getRouteCitiesForDay = day => parseRouteCities(day.ROUTE_TEXT).uniqueCities;

  const getRestaurantsForCity = cityId =>
    Array.isArray(restaurantsByCityId?.[cityId]) ? restaurantsByCityId[cityId] : [];

  const getRestaurantMealsForSelectedRestaurant = (cityId, restaurantId) => {
    const restaurants = getRestaurantsForCity(cityId);
    const restaurant = restaurants.find(item => getId(item) === restaurantId);
    return Array.isArray(restaurant?.MEALS) ? restaurant.MEALS : [];
  };

  const buildDaySnapshot = day => {
    const { places: entranceFeePlaces } = getDayEntranceFeePlaces(day);
    const routeCities = getRouteCitiesForDay(day);

    const transportationTypeObj =
      transportationTypes.find(x => getId(x) === day.TRANSPORTATION_TYPE) || null;
    const transportationCompanyObj =
      transportationCompanies.find(x => getId(x) === day.TRANSPORTATION_COMPANY_ID) || null;
    const guideTypeObj =
      guideTypes.find(x => getId(x) === day.GUIDE_TYPE) || null;
    const overnightCityObj =
      cities.find(x => getId(x) === day.OVERNIGHT_CITY) || null;

    const mealsDetailed = (day.MEALS || []).map(meal => {
      const cityObj = cities.find(x => getId(x) === meal.CITY_ID) || null;
      const cityRestaurants = Array.isArray(restaurantsByCityId?.[meal.CITY_ID])
        ? restaurantsByCityId[meal.CITY_ID]
        : [];
      const restaurantObj =
        cityRestaurants.find(x => getId(x) === meal.RESTAURANT_ID) || null;
      const mealObj =
        Array.isArray(restaurantObj?.MEALS)
          ? restaurantObj.MEALS.find(
              x =>
                getId(x) === meal.MEAL_TYPE ||
                x?.MEAL_TYPE === meal.MEAL_TYPE ||
                x?.MEAL_NAME === meal.MEAL_TYPE
            ) || null
          : null;

      return {
        CITY_ID: meal.CITY_ID || "",
        CITY_NAME: cityObj ? getCityLabel(cityObj) : "",
        RESTAURANT_ID: meal.RESTAURANT_ID || "",
        RESTAURANT_NAME: restaurantObj ? getRestaurantLabel(restaurantObj) : "",
        MEAL_TYPE: meal.MEAL_TYPE || "",
        MEAL_NAME: mealObj ? getMealLabel(mealObj) : meal.MEAL_TYPE,
        MEAL_PRICE_PER_PERSON:
          mealObj?.MEAL_PRICE_PER_PERSON ?? meal?.MEAL_PRICE_PER_PERSON ?? null,
      };
    });

    const selectedPlaces = entranceFeePlaces
      .filter(place => (day.selectedEntranceFeePlaceIds || []).includes(getId(place)))
      .map(place => {
        const placeCityObj = cities.find(x => getId(x) === getId(place?.PLACE_CITY)) || null;

        return {
          PLACE_ID: getId(place),
          PLACE_NAME: place?.PLACE_NAME || "",
          PLACE_CITY: getId(place?.PLACE_CITY),
          PLACE_CITY_NAME: placeCityObj ? getCityLabel(placeCityObj) : "",
          ENTRANCE_FEE_AMOUNT: getEntranceFeeAmount(place, quotationNationalityId),
        };
      });

    const transportationResolved = day.TRANSPORTATION_BY
      ? [
          {
            TRANSPORTATION_TYPE_ID: day.TRANSPORTATION_TYPE || null,
            TRANSPORTATION_TYPE_NAME: transportationTypeObj
              ? getTransportationTypeLabel(transportationTypeObj)
              : "",
            TRANSPORTATION_COMPANY_ID: day.TRANSPORTATION_COMPANY_ID || null,
            TRANSPORTATION_COMPANY_NAME:
              day.TRANSPORTATION_COMPANY_NAME ||
              (transportationCompanyObj ? getCompanyLabel(transportationCompanyObj) : ""),
            TRANSPORTATION_SIZE_ID: day.TRANSPORTATION_BY || null,
            TRANSPORTATION_BY: day.TRANSPORTATION_SIZE_LABEL || "",
            MINIMUM_CAPACITY: day.TRANSPORTATION_MIN_CAPACITY,
            MAXIMUM_CAPACITY: day.TRANSPORTATION_MAX_CAPACITY,
            RATE_ID: day.TRANSPORTATION_RATE_ID || null,
            RATE: day.TRANSPORTATION_RATE ?? null,
          },
        ]
      : [];

    const totalEntranceFees = selectedPlaces.reduce(
      (sum, place) => sum + (Number(place.ENTRANCE_FEE_AMOUNT) || 0),
      0
    );

    return {
      basic: {
        _id: day._id,
        ORIGINAL_QUOTATION_ID: day.ORIGINAL_QUOTATION_ID,
        DAY_ORDER: day.DAY_ORDER,
        DAY_DATE: day.DAY_DATE,
        ROUTE_TEXT: day.ROUTE_TEXT,
      },
      route: {
        text: day.ROUTE_TEXT,
        cities: routeCities.map(city => ({
          CITY_ID: getId(city),
          CITY_NAME: getCityLabel(city),
        })),
      },
      transportation: {
        ids: {
          TRANSPORTATION_TYPE: day.TRANSPORTATION_TYPE,
          TRANSPORTATION_COMPANY_ID: day.TRANSPORTATION_COMPANY_ID,
          TRANSPORTATION_BY: day.TRANSPORTATION_BY,
          TRANSPORTATION_RATE_ID: day.TRANSPORTATION_RATE_ID,
        },
        texts: {
          TRANSPORTATION_TYPE_NAME: transportationTypeObj
            ? getTransportationTypeLabel(transportationTypeObj)
            : "",
          TRANSPORTATION_COMPANY_NAME:
            day.TRANSPORTATION_COMPANY_NAME ||
            (transportationCompanyObj ? getCompanyLabel(transportationCompanyObj) : ""),
          TRANSPORTATION_SIZE_LABEL: day.TRANSPORTATION_SIZE_LABEL,
        },
        capacities: {
          MINIMUM_CAPACITY: day.TRANSPORTATION_MIN_CAPACITY,
          MAXIMUM_CAPACITY: day.TRANSPORTATION_MAX_CAPACITY,
        },
        RATE: day.TRANSPORTATION_RATE,
        TRANSPORTATION_RESOLVED: transportationResolved,
      },
      guide: {
        enabled: day.hasGuide,
        GUIDE_TYPE: day.hasGuide ? day.GUIDE_TYPE || null : null,
        GUIDE_TYPE_NAME: guideTypeObj ? getGuideTypeLabel(guideTypeObj) : "",
      },
      meals: {
        enabled: day.hasMeals,
        rows: mealsDetailed,
      },
      entranceFees: {
        selectedPlaceIds: day.selectedEntranceFeePlaceIds || [],
        selectedPlaces,
        total: totalEntranceFees,
      },
      overnight: {
        OVERNIGHT_CITY: day.OVERNIGHT_CITY || null,
        OVERNIGHT_CITY_NAME: overnightCityObj ? getCityLabel(overnightCityObj) : "",
      },
      fullDayState: day,
    };
  };

  const buildBackendDayPayload = day => {
    const snapshot = buildDaySnapshot(day);

    return {
      basic: snapshot.basic,
      route: snapshot.route,
      TRANSPORTATION_RESOLVED:
        snapshot.transportation?.TRANSPORTATION_RESOLVED || [],
      guide: snapshot.guide,
      meals: snapshot.meals,
      NTRANCE_FEES: snapshot.entranceFees?.selectedPlaces || [],
      TOTAL_ENTRANCE_FEES: snapshot.entranceFees?.total ?? 0,
      overnight: snapshot.overnight,
    };
  };

  const validateDay = day => {
    const errors = {};
    const { unknownNames } = parseRouteCities(day.ROUTE_TEXT);

    if (!day.ROUTE_TEXT || !String(day.ROUTE_TEXT).trim()) {
      errors.ROUTE_TEXT = "Route is required.";
    } else if (unknownNames.length > 0) {
      errors.ROUTE_TEXT = `Unknown cities: ${unknownNames.join(", ")}`;
    }

    if (!day.TRANSPORTATION_TYPE) {
      errors.TRANSPORTATION_TYPE = "Transportation type is required.";
    }

    if (!day.TRANSPORTATION_COMPANY_ID) {
      errors.TRANSPORTATION_COMPANY_ID = "Transportation company is required.";
    }

    if (!day.TRANSPORTATION_BY) {
      errors.TRANSPORTATION_BY = "Transportation by is required.";
    }

    if (day.hasGuide && !day.GUIDE_TYPE) {
      errors.GUIDE_TYPE = "Guide type is required.";
    }

    if (day.hasMeals) {
      const hasInvalidMeal = (day.MEALS || []).some(
        item => !item.CITY_ID || !item.RESTAURANT_ID || !item.MEAL_TYPE
      );
      if (hasInvalidMeal) {
        errors.MEALS = "Meal city, restaurant and meal type are required.";
      }
    }

    const routeCities = getRouteCitiesForDay(day);
    if (routeCities.length > 0 && !day.OVERNIGHT_CITY) {
      errors.OVERNIGHT_CITY = "Overnight city is required.";
    }

    return errors;
  };

  const handleSaveDay = day => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    const errors = validateDay(day);
    if (Object.keys(errors).length > 0) {
      notifyError(Object.values(errors)[0]);
      setDayValue(day.DAY_ORDER, current => ({
        ...current,
        touched: {
          ...current.touched,
          ROUTE_TEXT: true,
          TRANSPORTATION_TYPE: true,
          TRANSPORTATION_COMPANY_ID: true,
          TRANSPORTATION_BY: true,
          GUIDE_TYPE: true,
          MEALS: true,
          OVERNIGHT_CITY: true,
          selectedEntranceFeePlaceIds: true,
        },
      }));
      return;
    }

    const payload = buildBackendDayPayload(day);

    setSavingDayOrder(day.DAY_ORDER);

    const onDone = savedDay => {
      setSavingDayOrder(null);
      setDayValue(day.DAY_ORDER, current => ({
        ...current,
        _id: savedDay?._id || current._id,
      }));
    };

    if (day._id) {
      dispatch(updateQuotationDay(day._id, payload, onDone));
    } else {
      dispatch(createQuotationDay(payload, onDone));
    }
  };

  useEffect(() => {
    if (!loading) {
      setSavingDayOrder(null);
    }
  }, [loading]);

  document.title = "Quotation Plan | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Plan Quotation" />

          <Row className="mb-3">
            <Col xl="8">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <h4 className="card-title mb-1">Travel Quotation Plan</h4>
                      <p className="card-title-desc mb-0">
                        Each day is saved and edited individually.
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      {quotation?.REFERANCE_NUMBER ? (
                        <Badge color="light" className="text-dark" pill>
                          {quotation.REFERANCE_NUMBER}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <Row className="mt-4 gy-3">
                    <Col md="6">
                      <div>
                        <div className="text-muted small">Quotation Type</div>
                        <div className="fw-semibold">
                          {quotation?.QUOTATION_TYPE_VALUE || "-"}
                        </div>
                      </div>
                    </Col>
                    <Col md="6">
                      <div>
                        <div className="text-muted small">Nationality</div>
                        <div className="fw-semibold">
                          {quotation?.NATIONALITY_VALUE || "-"}
                        </div>
                      </div>
                    </Col>
                  </Row>

                  {!quotation?._id ? (
                    <Alert color="warning" className="mt-4 mb-0">
                      Quotation not found.{" "}
                      <Link to="/quotations" className="alert-link">
                        Go back
                      </Link>
                    </Alert>
                  ) : null}
                </CardBody>
              </Card>
            </Col>

            <Col xl="4">
              <Card>
                <CardBody>
                  <h4 className="card-title mb-3">Quick Access</h4>
                  <div className="d-grid gap-2">
                    <Button
                      color="primary"
                      type="button"
                      onClick={() => navigate(`/quotations/${id}/accommodation`)}
                    >
                      Accommodation
                    </Button>

                    <Button
                      color="primary"
                      type="button"
                      onClick={() => navigate(`/quotations/${id}/extra-services`)}
                    >
                      Extra Services
                    </Button>

                    <Button
                      color="light"
                      onClick={() => navigate(`/quotations/${id}`)}
                    >
                      Summary
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {!quotation?._id ? null : loading && !dayForms.length ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : (
            dayForms.map(day => {
              const dayErrors = validateDay(day);
              const isSaved = !!day._id;
              const isSavingThisDay = savingDayOrder === day.DAY_ORDER;
              const { places: entranceFeePlaces } = getDayEntranceFeePlaces(day);
              const routeCities = getRouteCitiesForDay(day);
              const currentBestRateLoading =
                !!transportationBestRateLoadingByKey?.[
                  bestRateKey(day.TRANSPORTATION_TYPE, quotationPax, day.TRANSPORTATION_COMPANY_ID)
                ];
              const currentBestRateError =
                transportationBestRateErrorByKey?.[
                  bestRateKey(day.TRANSPORTATION_TYPE, quotationPax, day.TRANSPORTATION_COMPANY_ID)
                ] || "";

              return (
                <Card key={day.DAY_ORDER} className="shadow-sm border">
                  <CardBody className="p-0">
                    <div className="p-4 border-bottom">
                      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3">
                        <div className="d-flex align-items-center gap-3">
                          <div className="avatar-sm">
                            <span className="avatar-title rounded-circle bg-primary text-white font-size-16">
                              {day.DAY_ORDER}
                            </span>
                          </div>
                          <div>
                            <h4 className="card-title mb-1">Day {day.DAY_ORDER}</h4>
                            <p className="text-muted mb-0 small">
                              Manage route, transportation, meals, overnight and optional entrance fees.
                            </p>
                          </div>
                          {isSaved ? (
                            <Badge color="success" pill>
                              Saved
                            </Badge>
                          ) : (
                            <Badge color="warning" pill>
                              Draft
                            </Badge>
                          )}
                        </div>

                        <Button
                          color={openDays[day.DAY_ORDER] ? "primary" : "light"}
                          type="button"
                          onClick={() => toggleDayCollapse(day.DAY_ORDER)}
                        >
                          <i
                            className={`bx ${
                              openDays[day.DAY_ORDER]
                                ? "bx-chevron-up"
                                : "bx-chevron-down"
                            } me-1`}
                          />
                          {openDays[day.DAY_ORDER] ? "Hide Details" : "Show Details"}
                        </Button>
                      </div>
                    </div>

                    <Collapse isOpen={!!openDays[day.DAY_ORDER]}>
                      <div className="p-4">
                        <Row className="g-4">
                          <Col lg="12">
                            <SectionCard
                              icon="bx-map-alt"
                              title="Route"
                              subtitle="Enter cities separated by dash (-), then choose the entrance fee places to include."
                            >
                              <Row className="g-3">
                                <Col lg="12">
                                  <div>
                                    <Label className="form-label">Route</Label>
                                    <Input
                                      value={day.ROUTE_TEXT}
                                      onChange={e =>
                                        handleFieldChange(day.DAY_ORDER, "ROUTE_TEXT", e.target.value)
                                      }
                                      placeholder="Amman - Petra - Amman"
                                      invalid={!!(day.touched.ROUTE_TEXT && dayErrors.ROUTE_TEXT)}
                                      disabled={lookupsLoading}
                                    />
                                    <FormFeedback>{dayErrors.ROUTE_TEXT}</FormFeedback>
                                    <div className="text-muted small mt-2">
                                      Example: Amman - Petra - Amman
                                    </div>
                                  </div>
                                </Col>

                                <Col lg="12">
                                  <div className="bg-light rounded p-3">
                                    <div className="d-flex align-items-center mb-3">
                                      <i className="bx bx-receipt text-primary font-size-18 me-2" />
                                      <div>
                                        <div className="fw-semibold">Entrance Fees</div>
                                        <div className="text-muted small">
                                          On the selected route we found a places with entrance fees would you like to insert them?
                                        </div>
                                      </div>
                                    </div>

                                    {!String(day.ROUTE_TEXT || "").trim() ? (
                                      <div className="text-muted small">
                                        Enter a route first to load entrance fee places.
                                      </div>
                                    ) : entranceFeePlaces.length === 0 ? (
                                      <div className="text-muted small">
                                        No entrance fee places found for the selected route.
                                      </div>
                                    ) : (
                                      <div className="table-responsive">
                                        <table className="table table-bordered table-nowrap align-middle mb-0 bg-white">
                                          <thead className="table-light">
                                            <tr>
                                              <th>Place Name</th>
                                              <th style={{ width: 180 }}>Insert</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {entranceFeePlaces.map(place => {
                                              const placeId = getId(place);
                                              const selected = (day.selectedEntranceFeePlaceIds || []).includes(placeId);

                                              return (
                                                <tr key={placeId}>
                                                  <td className="fw-medium">{place?.PLACE_NAME || "-"}</td>
                                                  <td>
                                                    <div className="d-flex gap-2">
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        color={selected ? "primary" : "light"}
                                                        onClick={() =>
                                                          toggleEntranceFeePlace(day.DAY_ORDER, placeId, true)
                                                        }
                                                      >
                                                        Yes
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        color={!selected ? "danger" : "light"}
                                                        onClick={() =>
                                                          toggleEntranceFeePlace(day.DAY_ORDER, placeId, false)
                                                        }
                                                      >
                                                        No
                                                      </Button>
                                                    </div>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </table>
                                      </div>
                                    )}
                                  </div>
                                </Col>
                              </Row>
                            </SectionCard>
                          </Col>

                          <Col xl="6">
                            <SectionCard
                              icon="bx-bus"
                              title="Transportation"
                              subtitle="Choose the transport category, company, and matching size."
                            >
                              <Row className="g-3">
                                <Col lg="12">
                                  <div>
                                    <Label className="form-label">Transportation Type</Label>
                                    <Input
                                      type="select"
                                      value={day.TRANSPORTATION_TYPE}
                                      onChange={e =>
                                        handleFieldChange(
                                          day.DAY_ORDER,
                                          "TRANSPORTATION_TYPE",
                                          e.target.value
                                        )
                                      }
                                      invalid={
                                        !!(
                                          day.touched.TRANSPORTATION_TYPE &&
                                          dayErrors.TRANSPORTATION_TYPE
                                        )
                                      }
                                      disabled={lookupsLoading}
                                    >
                                      <option value="">Select Transportation Type</option>
                                      {transportationTypes.map(item => (
                                        <option key={getId(item)} value={getId(item)}>
                                          {getTransportationTypeLabel(item)}
                                        </option>
                                      ))}
                                    </Input>
                                    <FormFeedback>{dayErrors.TRANSPORTATION_TYPE}</FormFeedback>
                                  </div>
                                </Col>

                                <Col lg="12">
                                  <div>
                                    <Label className="form-label">Transportation Company</Label>
                                    <Input
                                      type="select"
                                      value={day.TRANSPORTATION_COMPANY_ID}
                                      onChange={e =>
                                        handleFieldChange(
                                          day.DAY_ORDER,
                                          "TRANSPORTATION_COMPANY_ID",
                                          e.target.value
                                        )
                                      }
                                      invalid={
                                        !!(
                                          day.touched.TRANSPORTATION_COMPANY_ID &&
                                          dayErrors.TRANSPORTATION_COMPANY_ID
                                        )
                                      }
                                      disabled={lookupsLoading}
                                    >
                                      <option value="">Select Transportation Company</option>
                                      {transportationCompanies.map(item => (
                                        <option key={getId(item)} value={getId(item)}>
                                          {getCompanyLabel(item)}
                                        </option>
                                      ))}
                                    </Input>
                                    <FormFeedback>{dayErrors.TRANSPORTATION_COMPANY_ID}</FormFeedback>
                                  </div>
                                </Col>

                                <Col lg="12">
                                  <div>
                                    <Label className="form-label">Transportation By</Label>

                                    {!day.TRANSPORTATION_TYPE ? (
                                      <div className="bg-light rounded p-3 text-muted small">
                                        Select transportation type first.
                                      </div>
                                    ) : !day.TRANSPORTATION_COMPANY_ID ? (
                                      <div className="bg-light rounded p-3 text-muted small">
                                        Select transportation company first.
                                      </div>
                                    ) : currentBestRateLoading ? (
                                      <div className="bg-light rounded p-3 d-flex align-items-center">
                                        <Spinner size="sm" className="me-2" />
                                        <span className="text-muted small">
                                          Loading best transportation rate...
                                        </span>
                                      </div>
                                    ) : currentBestRateError ? (
                                      <Alert color="danger" className="mb-0">
                                        <div className="fw-semibold mb-1">Transportation rate not found</div>
                                        <div>{currentBestRateError}</div>
                                      </Alert>
                                    ) : day.TRANSPORTATION_BY ? (
                                      <div className="border rounded p-3">
                                        <Row className="g-3">
                                          <Col md="6">
                                            <div className="text-muted small">Transportation Company</div>
                                            <div className="fw-semibold">
                                              {day.TRANSPORTATION_COMPANY_NAME || "-"}
                                            </div>
                                          </Col>
                                          <Col md="6">
                                            <div className="text-muted small">Transportation Type</div>
                                            <div className="fw-semibold">
                                              {day.TRANSPORTATION_SIZE_LABEL || "-"}
                                            </div>
                                          </Col>
                                          <Col md="6">
                                            <div className="text-muted small">Minimum Capacity</div>
                                            <div className="fw-semibold">
                                              {day.TRANSPORTATION_MIN_CAPACITY ?? "-"}
                                            </div>
                                          </Col>
                                          <Col md="6">
                                            <div className="text-muted small">Maximum Capacity</div>
                                            <div className="fw-semibold">
                                              {day.TRANSPORTATION_MAX_CAPACITY ?? "-"}
                                            </div>
                                          </Col>
                                        </Row>
                                      </div>
                                    ) : (
                                      <div className="bg-light rounded p-3 text-muted small">
                                        No transportation size found for the selected company, type and pax.
                                      </div>
                                    )}

                                    {day.touched.TRANSPORTATION_BY && dayErrors.TRANSPORTATION_BY ? (
                                      <div className="text-danger small mt-2">
                                        {dayErrors.TRANSPORTATION_BY}
                                      </div>
                                    ) : null}
                                  </div>
                                </Col>
                              </Row>
                            </SectionCard>
                          </Col>

                          <Col xl="6">
                            <SectionCard
                              icon="bx-user-check"
                              title="Guide"
                              subtitle="Enable a guide for the day, then select the guide type if needed."
                            >
                              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                                <div>
                                  <div className="fw-semibold">Guide Required</div>
                                  <div className="text-muted small">
                                    Choose whether this day includes a guide.
                                  </div>
                                </div>

                                <DayToggle
                                  active={day.hasGuide}
                                  onYes={() => handleToggleGuide(day.DAY_ORDER, true)}
                                  onNo={() => handleToggleGuide(day.DAY_ORDER, false)}
                                />
                              </div>

                              {day.hasGuide ? (
                                <div>
                                  <Label className="form-label">Guide Type</Label>
                                  <Input
                                    type="select"
                                    value={day.GUIDE_TYPE}
                                    onChange={e =>
                                      handleFieldChange(
                                        day.DAY_ORDER,
                                        "GUIDE_TYPE",
                                        e.target.value
                                      )
                                    }
                                    invalid={
                                      !!(day.touched.GUIDE_TYPE && dayErrors.GUIDE_TYPE)
                                    }
                                    disabled={lookupsLoading}
                                  >
                                    <option value="">Select Guide Type</option>
                                    {guideTypes.map(item => (
                                      <option key={getId(item)} value={getId(item)}>
                                        {getGuideTypeLabel(item)}
                                      </option>
                                    ))}
                                  </Input>
                                  <FormFeedback>{dayErrors.GUIDE_TYPE}</FormFeedback>
                                </div>
                              ) : (
                                <div className="text-muted small bg-light rounded p-3">
                                  Guide is disabled for this day.
                                </div>
                              )}
                            </SectionCard>
                          </Col>

                          <Col lg="12">
                            <SectionCard
                              icon="bx-restaurant"
                              title="Meals"
                              subtitle="Select city, restaurant, and then one of the available meals."
                            >
                              <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                                <div>
                                  <div className="fw-semibold">Meals Required</div>
                                  <div className="text-muted small">
                                    Turn meals on if this day includes food arrangements.
                                  </div>
                                </div>

                                <DayToggle
                                  active={day.hasMeals}
                                  onYes={() => handleToggleMeals(day.DAY_ORDER, true)}
                                  onNo={() => handleToggleMeals(day.DAY_ORDER, false)}
                                />
                              </div>

                              {day.hasMeals ? (
                                <>
                                  {(day.MEALS || []).map((meal, index) => {
                                    const restaurantsForCity = getRestaurantsForCity(meal.CITY_ID);
                                    const availableMeals = getRestaurantMealsForSelectedRestaurant(
                                      meal.CITY_ID,
                                      meal.RESTAURANT_ID
                                    );
                                    const restaurantsLoading = !!restaurantsLoadingByCityId?.[meal.CITY_ID];

                                    return (
                                      <div
                                        key={`${day.DAY_ORDER}-${index}`}
                                        className={`rounded border p-3 ${
                                          index > 0 ? "mt-3" : ""
                                        }`}
                                      >
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                          <div className="fw-semibold">Meal Row {index + 1}</div>
                                          <div className="d-flex gap-2">
                                            <Button
                                              color="light"
                                              size="sm"
                                              type="button"
                                              onClick={() => addMealRow(day.DAY_ORDER)}
                                            >
                                              <i className="bx bx-plus me-1" />
                                              Add
                                            </Button>
                                            <Button
                                              color="light"
                                              size="sm"
                                              type="button"
                                              onClick={() =>
                                                removeMealRow(day.DAY_ORDER, index)
                                              }
                                            >
                                              <i className="bx bx-trash me-1" />
                                              Remove
                                            </Button>
                                          </div>
                                        </div>

                                        <Row className="g-3">
                                          <Col lg="4">
                                            <div>
                                              <Label className="form-label">City</Label>
                                              <Input
                                                type="select"
                                                value={meal.CITY_ID}
                                                onChange={e =>
                                                  handleMealFieldChange(
                                                    day.DAY_ORDER,
                                                    index,
                                                    "CITY_ID",
                                                    e.target.value
                                                  )
                                                }
                                              >
                                                <option value="">Select City</option>
                                                {cities.map(item => (
                                                  <option key={getId(item)} value={getId(item)}>
                                                    {getCityLabel(item)}
                                                  </option>
                                                ))}
                                              </Input>
                                            </div>
                                          </Col>

                                          <Col lg="4">
                                            <div>
                                              <Label className="form-label">Restaurant</Label>
                                              <Input
                                                type="select"
                                                value={meal.RESTAURANT_ID}
                                                onChange={e =>
                                                  handleMealFieldChange(
                                                    day.DAY_ORDER,
                                                    index,
                                                    "RESTAURANT_ID",
                                                    e.target.value
                                                  )
                                                }
                                                disabled={!meal.CITY_ID}
                                              >
                                                <option value="">
                                                  {restaurantsLoading
                                                    ? "Loading restaurants..."
                                                    : "Select Restaurant"}
                                                </option>
                                                {restaurantsForCity.map(item => (
                                                  <option key={getId(item)} value={getId(item)}>
                                                    {getRestaurantLabel(item)}
                                                  </option>
                                                ))}
                                              </Input>
                                            </div>
                                          </Col>

                                          <Col lg="4">
                                            <div>
                                              <Label className="form-label">Meal Type</Label>
                                              <Input
                                                type="select"
                                                value={meal.MEAL_TYPE}
                                                onChange={e =>
                                                  handleMealFieldChange(
                                                    day.DAY_ORDER,
                                                    index,
                                                    "MEAL_TYPE",
                                                    e.target.value
                                                  )
                                                }
                                                disabled={!meal.RESTAURANT_ID}
                                              >
                                                <option value="">Select Meal Type</option>
                                                {availableMeals.map((item, mealIndex) => (
                                                  <option
                                                    key={getId(item) || `${getMealValue(item)}-${mealIndex}`}
                                                    value={getMealValue(item)}
                                                  >
                                                    {getMealLabel(item)}
                                                  </option>
                                                ))}
                                              </Input>
                                            </div>
                                          </Col>
                                        </Row>
                                      </div>
                                    );
                                  })}

                                  {day.touched.MEALS && dayErrors.MEALS ? (
                                    <div className="text-danger small mt-3">{dayErrors.MEALS}</div>
                                  ) : null}
                                </>
                              ) : (
                                <div className="text-muted small bg-light rounded p-3">
                                  Meals are disabled for this day.
                                </div>
                              )}
                            </SectionCard>
                          </Col>

                          <Col lg="12">
                            <SectionCard
                              icon="bx-moon"
                              title="Overnight"
                              subtitle="Select the city of stay from the cities available on the selected route."
                            >
                              <Row className="g-3 align-items-end">
                                <Col lg="6">
                                  <div>
                                    <Label className="form-label">City of Stay</Label>
                                    <Input
                                      type="select"
                                      value={day.OVERNIGHT_CITY}
                                      onChange={e =>
                                        handleFieldChange(day.DAY_ORDER, "OVERNIGHT_CITY", e.target.value)
                                      }
                                      invalid={!!(day.touched.OVERNIGHT_CITY && dayErrors.OVERNIGHT_CITY)}
                                      disabled={!routeCities.length}
                                    >
                                      <option value="">
                                        {routeCities.length ? "Select City of Stay" : "Select route first"}
                                      </option>
                                      {routeCities.map(city => (
                                        <option key={getId(city)} value={getId(city)}>
                                          {getCityLabel(city)}
                                        </option>
                                      ))}
                                    </Input>
                                    <FormFeedback>{dayErrors.OVERNIGHT_CITY}</FormFeedback>
                                  </div>
                                </Col>

                                <Col lg="6">
                                  <div className="bg-light rounded p-3">
                                    <div className="fw-semibold mb-1">Available Route Cities</div>
                                    <div className="text-muted small">
                                      {routeCities.length
                                        ? routeCities.map(city => getCityLabel(city)).join(" • ")
                                        : "No route cities available yet."}
                                    </div>
                                  </div>
                                </Col>
                              </Row>
                            </SectionCard>
                          </Col>

                          <Col lg="12">
                            <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 border-top pt-4 mt-2">
                              <div className="text-muted small">
                                Review the day details before saving.
                              </div>

                              <div className="d-flex gap-2">
                                <Button
                                  color="light"
                                  type="button"
                                  onClick={() => {
                                    if (day._id) {
                                      dispatch(fetchQuotationDays(id));
                                      notifyInfo(`Day ${day.DAY_ORDER} restored from backend.`);
                                    } else {
                                      setDayForms(prev =>
                                        prev.map(item =>
                                          item.DAY_ORDER === day.DAY_ORDER
                                            ? buildDayState({
                                                quotationId: quotation._id,
                                                order: day.DAY_ORDER,
                                                date: day.DAY_DATE,
                                                existing: null,
                                                cities,
                                              })
                                            : item
                                        )
                                      );
                                    }
                                  }}
                                >
                                  Reset Day
                                </Button>

                                <Button
                                  color="primary"
                                  type="button"
                                  onClick={() => handleSaveDay(day)}
                                  disabled={isSavingThisDay}
                                >
                                  {isSavingThisDay ? (
                                    <Spinner size="sm" className="me-2" />
                                  ) : null}
                                  {day._id ? "Update Day" : "Save Day"}
                                </Button>
                              </div>
                            </div>
                          </Col>
                        </Row>
                      </div>
                    </Collapse>
                  </CardBody>
                </Card>
              );
            })
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default PlanQuotation;
