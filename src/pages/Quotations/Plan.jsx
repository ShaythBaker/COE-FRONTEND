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
import {
  isQuotationReadOnly,
  getQuotationReadOnlyMessage,
  canViewQuotationPrices,
} from "../../helpers/quotation_pricing_helper";

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

const getQuotationPax = quotation => {
  const value =
    quotation?.NUMBER_OF_PAX ??
    quotation?.PAX ??
    quotation?.NO_OF_PAX ??
    quotation?.TOTAL_PAX ??
    quotation?.pax;
  const pax = Number(value);
  return Number.isFinite(pax) && pax > 0 ? pax : 0;
};

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

const formatMoney = value => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toFixed(2);
};

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

const isActiveRecord = item => item?.ACTIVE_STATUS !== false;

const getCapacityMin = size => {
  const value =
    size?.MINIMUM_CAPACITY ??
    size?.MIN_CAPACITY ??
    size?.MINIMUM ??
    size?.CAPACITY ??
    0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getCapacityMax = size => {
  const value =
    size?.MAXIMUM_CAPACITY ??
    size?.MAX_CAPACITY ??
    size?.MAXIMUM ??
    size?.CAPACITY ??
    0;

  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const isTransportationSizeValidForPax = (size, pax) => {
  const currentPax = Number(pax);
  if (!size || !Number.isFinite(currentPax) || currentPax <= 0) return false;

  const min = getCapacityMin(size);
  const max = getCapacityMax(size);

  if (max <= 0) return false;

  return currentPax >= min && currentPax <= max;
};

const clearTransportationRateFields = () => ({
  TRANSPORTATION_BY: "",
  TRANSPORTATION_COMPANY_NAME: "",
  TRANSPORTATION_RATE_ID: "",
  TRANSPORTATION_RATE: null,
  TRANSPORTATION_SIZE_LABEL: "",
  TRANSPORTATION_MIN_CAPACITY: null,
  TRANSPORTATION_MAX_CAPACITY: null,
});

const getEntranceFeeAmount = (place, nationalityId) => {
  if (!place || !nationalityId) return null;

  const fee = Array.isArray(place.ENTRANCE_FEES)
    ? place.ENTRANCE_FEES.find(
        item =>
          getId(item?.ENTRANCE_FEE_NATIONALATY) === nationalityId ||
          getId(item?.NATIONALITY_ID) === nationalityId
      )
    : null;

  if (!fee) return null;

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
  const existingTransportationRows = Array.isArray(existing?.TRANSPORTATION_RESOLVED)
    ? existing.TRANSPORTATION_RESOLVED
    : Array.isArray(existing?.transportation?.TRANSPORTATION_RESOLVED)
      ? existing.transportation.TRANSPORTATION_RESOLVED
      : [];
  const existingTransportation = existingTransportationRows[0] || {};

  const existingCityNames = Array.from(
    new Set(
      existingSelectedPlaces
        .map(item => cityById.get(getId(item?.PLACE_CITY)))
        .filter(Boolean)
        .map(getCityLabel)
        .filter(Boolean)
    )
  );

  const routeText = existing?.ROUTE_TEXT
    ? existing.ROUTE_TEXT
    : existingCityNames.join(" - ");

  return {
    _id: existing?._id || "",
    ORIGINAL_QUOTATION_ID:
      existing?.ORIGINAL_QUOTATION_ID || quotationId || "",
    DAY_ORDER: order,
    DAY_DATE: date,

    ROUTE_TEXT: routeText,

    TRANSPORTATION_TYPE: existing?.TRANSPORTATION?.ids?.TRANSPORTATION_TYPE ||
      existing?.TRANSPORTATION_TYPE ||
      existingTransportation?.TRANSPORTATION_TYPE_ID ||
      "",
    TRANSPORTATION_COMPANY_ID:
      existing?.TRANSPORTATION?.ids?.TRANSPORTATION_COMPANY_ID ||
      existing?.TRANSPORTATION_COMPANY_ID ||
      existingTransportation?.TRANSPORTATION_COMPANY_ID ||
      "",
    TRANSPORTATION_COMPANY_NAME:
      existing?.TRANSPORTATION?.texts?.TRANSPORTATION_COMPANY_NAME ||
      existing?.TRANSPORTATION_COMPANY_NAME ||
      existingTransportation?.TRANSPORTATION_COMPANY_NAME ||
      "",
    TRANSPORTATION_BY:
      existing?.TRANSPORTATION?.ids?.TRANSPORTATION_BY ||
      existing?.TRANSPORTATION_BY ||
      existingTransportation?.TRANSPORTATION_SIZE_ID ||
      "",
    TRANSPORTATION_RATE_ID:
      existing?.TRANSPORTATION?.ids?.TRANSPORTATION_RATE_ID ||
      existing?.TRANSPORTATION_RATE_ID ||
      existingTransportation?.RATE_ID ||
      getId(existing?.TRANSPORTATION_RATE_ID || existing?.TRANSPORTATION_RATE),
    TRANSPORTATION_RATE:
      existing?.TRANSPORTATION?.RATE ??
      existing?.TRANSPORTATION_RATE_AMOUNT ??
      existing?.TRANSPORTATION_RATE ??
      existingTransportation?.RATE ??
      existing?.RATE ??
      null,
    TRANSPORTATION_SIZE_LABEL:
      existing?.TRANSPORTATION?.texts?.TRANSPORTATION_SIZE_LABEL ||
      existing?.TRANSPORTATION_BY_VALUE ||
      existing?.TRANSPORTATION_SIZE_LABEL ||
      existingTransportation?.TRANSPORTATION_BY ||
      "",
    TRANSPORTATION_MIN_CAPACITY:
      existing?.TRANSPORTATION?.capacities?.MINIMUM_CAPACITY ??
      existing?.MINIMUM_CAPACITY ??
      existingTransportation?.MINIMUM_CAPACITY ??
      null,
    TRANSPORTATION_MAX_CAPACITY:
      existing?.TRANSPORTATION?.capacities?.MAXIMUM_CAPACITY ??
      existing?.MAXIMUM_CAPACITY ??
      existingTransportation?.MAXIMUM_CAPACITY ??
      null,

    hasGuide: !!(
      existing?.GUIDE_TYPE ||
      existing?.guide?.GUIDE_TYPE ||
      existing?.guide?.enabled
    ),
    GUIDE_TYPE:
      existing?.guide?.GUIDE_TYPE ||
      existing?.GUIDE_TYPE ||
      "",

    hasMeals:
      existing?.meals?.enabled ||
      (Array.isArray(existing?.MEALS) && existing.MEALS.length > 0) ||
      (Array.isArray(existing?.meals?.rows) && existing.meals.rows.length > 0),
    MEALS:
      (existing?.meals?.rows || existing?.MEALS || []).map(item => ({
        CITY_ID: item?.CITY_ID || "",
        RESTAURANT_ID: item?.RESTAURANT_ID || "",
        MEAL_TYPE: item?.MEAL_TYPE || item?.MEAL_NAME || "",
        MEAL_PRICE_PER_PERSON: item?.MEAL_PRICE_PER_PERSON ?? null,
      })).length > 0
        ? (existing?.meals?.rows || existing?.MEALS || []).map(item => ({
            CITY_ID: item?.CITY_ID || "",
            RESTAURANT_ID: item?.RESTAURANT_ID || "",
            MEAL_TYPE: item?.MEAL_TYPE || item?.MEAL_NAME || "",
            MEAL_PRICE_PER_PERSON: item?.MEAL_PRICE_PER_PERSON ?? null,
          }))
        : [{ CITY_ID: "", RESTAURANT_ID: "", MEAL_TYPE: "" }],

    OVERNIGHT_CITY:
      existing?.overnight?.OVERNIGHT_CITY ||
      existing?.OVERNIGHT_CITY ||
      "",

    selectedEntranceFeePlaceIds:
      existing?.entranceFees?.selectedPlaceIds ||
      existingSelectedPlaces.map(item => getId(item?.PLACE_ID || item)) ||
      [],

    touched: {},
  };
};

const SectionCard = ({ icon, title, subtitle, children }) => (
  <div className="border rounded p-3 h-100 bg-white">
    <div className="d-flex align-items-start gap-3 mb-3">
      <div className="avatar-sm flex-shrink-0">
        <span className="avatar-title rounded-circle bg-primary-subtle text-primary font-size-18">
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

const DayToggle = ({ active, onYes, onNo, disabled = false }) => (
  <div className="d-flex flex-wrap gap-2">
    <Button type="button" color={active ? "primary" : "light"} onClick={onYes} disabled={disabled}>
      <i className="bx bx-check me-1" />
      Yes
    </Button>
    <Button type="button" color={!active ? "danger" : "light"} onClick={onNo} disabled={disabled}>
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
  const canViewPrices = canViewQuotationPrices(roles);
  const readOnly = isQuotationReadOnly(quotation);
  const canEditQuotation = canMutate && !readOnly;
  const readOnlyMessage = getQuotationReadOnlyMessage(quotation);

  const [dayForms, setDayForms] = useState([]);
  const [openDays, setOpenDays] = useState({});
  const [savingDayOrder, setSavingDayOrder] = useState(null);

  const transportationTypes = lookups?.transportationTypes || [];
  const transportationCompanies = lookups?.transportationCompanies || [];
  const transportationSizes = lookups?.transportationSizes || [];
  const guideTypes = lookups?.guideTypes || [];
  const cities = lookups?.cities || [];

  const quotationStartDate = toDateOnly(quotation?.QUOTATION_START_DATE);
  const totalDays =
    Number(quotation?.NUMBER_OF_DAYS) > 0
      ? Number(quotation.NUMBER_OF_DAYS)
      : Number(quotation?.DURATION_IN_DAYS) > 0
      ? Number(quotation.DURATION_IN_DAYS)
      : 0;
  const quotationNationalityId = getId(quotation?.NATIONALITY);
  const quotationPax = getQuotationPax(quotation);

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

    setDayForms(prev => {
      const currentByOrder = new Map(
        prev.map(day => [Number(day?.DAY_ORDER || 0), day])
      );

      return generatedDays.map(generatedDay => {
        const current = currentByOrder.get(Number(generatedDay.DAY_ORDER || 0));
        const hasUnsavedChanges = Object.keys(current?.touched || {}).length > 0;

        if (!current || !hasUnsavedChanges) {
          return generatedDay;
        }

        return {
          ...generatedDay,
          ...current,
          _id: current._id || generatedDay._id,
          ORIGINAL_QUOTATION_ID:
            current.ORIGINAL_QUOTATION_ID || generatedDay.ORIGINAL_QUOTATION_ID,
          DAY_ORDER: generatedDay.DAY_ORDER,
          DAY_DATE: generatedDay.DAY_DATE,
        };
      });
    });
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

        const apiBestRate =
          bestRate?.size && isTransportationSizeValidForPax(bestRate.size, quotationPax)
            ? bestRate
            : null;

        const localBestRate = findLocalBestTransportationRate(
          day.TRANSPORTATION_TYPE,
          day.TRANSPORTATION_COMPANY_ID
        );

        const rateToApply = apiBestRate || localBestRate;

        if (rateToApply?.size && getId(rateToApply.size)) {
          return {
            ...day,
            ...getTransportationRateFields(
              rateToApply,
              day.TRANSPORTATION_COMPANY_ID
            ),
          };
        }

        if (bestRateError || day.TRANSPORTATION_BY) {
          return {
            ...day,
            ...clearTransportationRateFields(),
          };
        }

        return day;
      })
    );
  }, [
    quotationPax,
    transportationBestRateByKey,
    transportationBestRateErrorByKey,
    transportationCompanies,
    transportationSizes,
  ]);

  const findLocalBestTransportationRate = (typeId, companyId) => {
    if (!typeId || !companyId || !quotationPax) return null;

    const company = transportationCompanies.find(item => getId(item) === companyId);
    const rates = Array.isArray(company?.TRANSPORTATION_RATES)
      ? company.TRANSPORTATION_RATES
      : [];

    const candidates = rates
      .map(rate => {
        if (!isActiveRecord(rate)) return null;
        if (getId(rate?.TRANSPORTATION_TYPE_ID) !== typeId) return null;

        const size =
          transportationSizes.find(
            item => getId(item) === getId(rate?.TRANSPORTATION_SIZE_ID)
          ) || null;

        if (!size || !isActiveRecord(size)) return null;
        if (!isTransportationSizeValidForPax(size, quotationPax)) return null;

        return { company, rate, size };
      })
      .filter(Boolean);

    if (!candidates.length) return null;

    return candidates.sort((a, b) => {
      const aMax = getCapacityMax(a.size);
      const bMax = getCapacityMax(b.size);
      if (aMax !== bMax) return aMax - bMax;

      return Number(a?.rate?.RATE || 0) - Number(b?.rate?.RATE || 0);
    })[0];
  };

  const getTransportationRateFields = (rateToApply, fallbackCompanyId = "") => {
    if (!rateToApply?.size?._id) return {};

    return {
      TRANSPORTATION_BY: getId(rateToApply.size),
      TRANSPORTATION_COMPANY_ID:
        getId(rateToApply.company) || fallbackCompanyId,
      TRANSPORTATION_COMPANY_NAME: getCompanyLabel(rateToApply.company),
      TRANSPORTATION_RATE_ID: getId(rateToApply.rate),
      TRANSPORTATION_RATE: rateToApply?.rate?.RATE ?? null,
      TRANSPORTATION_SIZE_LABEL: getSizeTypeLabel(rateToApply.size),
      TRANSPORTATION_MIN_CAPACITY: getCapacityMin(rateToApply.size),
      TRANSPORTATION_MAX_CAPACITY: getCapacityMax(rateToApply.size),
    };
  };

  const parseRouteCities = routeText => {
    const names = String(routeText || "")
      .split("-")
      .map(item => item.trim())
      .filter(Boolean);

    const uniqueMap = new Map();
    const unknownNames = [];

    names.forEach(name => {
      const city = cityNameMap.get(name.toLowerCase());
      if (city) {
        uniqueMap.set(getId(city), city);
      } else {
        unknownNames.push(name);
      }
    });

    return {
      uniqueCities: Array.from(uniqueMap.values()),
      unknownNames,
    };
  };

  useEffect(() => {
    if (!quotationNationalityId) return;

    dayForms.forEach(day => {
      const { uniqueCities } = parseRouteCities(day.ROUTE_TEXT);

      uniqueCities.forEach(city => {
        const cityId = getId(city);
        const key = routeKey(cityId, quotationNationalityId);

        if (
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
    const requestedCityIds = new Set();

    dayForms.forEach(day => {
      (day.MEALS || []).forEach(meal => {
        if (meal.CITY_ID) {
          requestedCityIds.add(meal.CITY_ID);
        }
      });
    });

    requestedCityIds.forEach(cityId => {
      if (
        !restaurantsByCityId?.[cityId] &&
        !restaurantsLoadingByCityId?.[cityId]
      ) {
        dispatch(fetchRestaurantsByCity(cityId));
      }
    });
  }, [dayForms, restaurantsByCityId, restaurantsLoadingByCityId, dispatch]);

  const setDayValue = (dayOrder, updater) => {
    setDayForms(prev =>
      prev.map(day =>
        day.DAY_ORDER === dayOrder
          ? typeof updater === "function"
            ? updater(day)
            : { ...day, ...updater }
          : day
      )
    );
  };

  const handleFieldChange = (dayOrder, field, value) => {
    if (!canEditQuotation) return;

    setDayValue(dayOrder, current => {
      const next = {
        ...current,
        [field]: value,
        touched: {
          ...current.touched,
          [field]: true,
        },
      };

      if (field === "ROUTE_TEXT") {
        next.selectedEntranceFeePlaceIds = [];
        next.OVERNIGHT_CITY = "";
      }

      if (field === "TRANSPORTATION_TYPE") {
        next.TRANSPORTATION_COMPANY_ID = "";
        Object.assign(next, clearTransportationRateFields());
      }

      if (field === "TRANSPORTATION_COMPANY_ID") {
        Object.assign(next, clearTransportationRateFields());

        const localBestRate = findLocalBestTransportationRate(
          next.TRANSPORTATION_TYPE,
          value
        );

        Object.assign(
          next,
          getTransportationRateFields(localBestRate, value)
        );
      }

      return next;
    });
  };

  const handleMealFieldChange = (dayOrder, mealIndex, field, value) => {
    if (!canEditQuotation) return;

    setDayValue(dayOrder, current => ({
      ...current,
      MEALS: (current.MEALS || []).map((meal, index) => {
        if (index !== mealIndex) return meal;

        if (field === "CITY_ID") {
          return {
            CITY_ID: value,
            RESTAURANT_ID: "",
            MEAL_TYPE: "",
          };
        }

        if (field === "RESTAURANT_ID") {
          return {
            ...meal,
            RESTAURANT_ID: value,
            MEAL_TYPE: "",
          };
        }

        return {
          ...meal,
          [field]: value,
        };
      }),
      touched: {
        ...current.touched,
        MEALS: true,
      },
    }));
  };

  const handleToggleGuide = (dayOrder, enabled) => {
    if (!canEditQuotation) return;

    setDayValue(dayOrder, current => ({
      ...current,
      hasGuide: enabled,
      GUIDE_TYPE: enabled ? current.GUIDE_TYPE : "",
      touched: {
        ...current.touched,
        GUIDE_TYPE: true,
      },
    }));
  };

  const handleToggleMeals = (dayOrder, enabled) => {
    if (!canEditQuotation) return;

    setDayValue(dayOrder, current => ({
      ...current,
      hasMeals: enabled,
      MEALS: enabled
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

  const addMealRow = dayOrder => {
    if (!canEditQuotation) return;

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
    if (!canEditQuotation) return;

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
    if (!canEditQuotation) return;

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
      ORIGINAL_QUOTATION_ID: snapshot.basic.ORIGINAL_QUOTATION_ID,
      DAY_ORDER: snapshot.basic.DAY_ORDER,
      DAY_DATE: snapshot.basic.DAY_DATE,
      ROUTE_TEXT: snapshot.basic.ROUTE_TEXT,
      TRANSPORTATION_TYPE: day.TRANSPORTATION_TYPE || null,
      TRANSPORTATION_COMPANY_ID: day.TRANSPORTATION_COMPANY_ID || null,
      TRANSPORTATION_BY: day.TRANSPORTATION_BY || null,
      TRANSPORTATION_RATE_ID: day.TRANSPORTATION_RATE_ID || null,
      TRANSPORTATION_RATE: day.TRANSPORTATION_RATE ?? null,
      TRANSPORTATION_RESOLVED: snapshot.transportation.TRANSPORTATION_RESOLVED,
      GUIDE_TYPE: day.hasGuide ? day.GUIDE_TYPE || null : null,
      MEALS: snapshot.meals.enabled ? snapshot.meals.rows : [],
      PLACES: snapshot.entranceFees.selectedPlaces,
      NTRANCE_FEES: snapshot.entranceFees.selectedPlaces,
      TOTAL_ENTRANCE_FEES: snapshot.entranceFees.total,
      OVERNIGHT_CITY: snapshot.overnight.OVERNIGHT_CITY,
      basic: snapshot.basic,
      route: snapshot.route,
      transportation: snapshot.transportation,
      guide: snapshot.guide,
      meals: snapshot.meals,
      entranceFees: snapshot.entranceFees,
      overnight: snapshot.overnight,
      fullDayState: snapshot.fullDayState,
    };
  };

  const validateDay = day => {
    const errors = {};

    if (!String(day.ROUTE_TEXT || "").trim()) {
      errors.ROUTE_TEXT = "Route is required.";
    }

    if (!day.TRANSPORTATION_TYPE) {
      errors.TRANSPORTATION_TYPE = "Transportation type is required.";
    }

    if (!day.TRANSPORTATION_COMPANY_ID) {
      errors.TRANSPORTATION_COMPANY_ID = "Transportation company is required.";
    }

    if (!day.TRANSPORTATION_BY) {
      errors.TRANSPORTATION_BY = "Transportation size is required.";
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

    if (readOnly) {
      notifyError(readOnlyMessage);
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
        touched: {},
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

          {readOnly ? (
            <Alert color="warning" className="mb-3" fade={false}>
              {readOnlyMessage}
            </Alert>
          ) : null}

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
                    <Col md="4">
                      <div>
                        <div className="text-muted small">Quotation Type</div>
                        <div className="fw-semibold">
                          {quotation?.QUOTATION_TYPE_VALUE || "-"}
                        </div>
                      </div>
                    </Col>
                    <Col md="4">
                      <div>
                        <div className="text-muted small">Nationality</div>
                        <div className="fw-semibold">
                          {quotation?.NATIONALITY_VALUE || "-"}
                        </div>
                      </div>
                    </Col>
                    <Col md="4">
                      <div>
                        <div className="text-muted small">Pax</div>
                        <div className="fw-semibold">
                          {quotationPax || "-"}
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
                    {!canViewPrices ? (
                      <Alert color="warning" className="mb-0 py-2">
                        Prices hidden for your role.
                      </Alert>
                    ) : null}

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
                      <fieldset disabled={readOnly} className="border-0 m-0 p-0">
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
                                        disabled={lookupsLoading || readOnly}
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
                                                <th style={{ width: 220 }}>City</th>
                                                {canViewPrices ? <th style={{ width: 180 }}>Price</th> : null}
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
                                                      {getCityLabel(
                                                        cities.find(
                                                          city => getId(city) === getId(place?.PLACE_CITY)
                                                        ) || {}
                                                      )}
                                                    </td>
                                                    {canViewPrices ? (
                                                      <td>
                                                        {getEntranceFeeAmount(
                                                          place,
                                                          quotationNationalityId
                                                        ) === null ? (
                                                          <span className="text-muted small">
                                                            No price for nationality
                                                          </span>
                                                        ) : (
                                                          <Badge color="primary" pill>
                                                            {formatMoney(
                                                              getEntranceFeeAmount(
                                                                place,
                                                                quotationNationalityId
                                                              )
                                                            )}
                                                          </Badge>
                                                        )}
                                                      </td>
                                                    ) : null}
                                                    <td>
                                                      <div className="d-flex gap-2">
                                                        <Button
                                                          type="button"
                                                          size="sm"
                                                          color={selected ? "primary" : "light"}
                                                          className={selected ? "" : "border"}
                                                          onClick={() =>
                                                            toggleEntranceFeePlace(
                                                              day.DAY_ORDER,
                                                              placeId,
                                                              !selected
                                                            )
                                                          }
                                                          disabled={readOnly}
                                                        >
                                                          <i
                                                            className={`bx ${
                                                              selected
                                                                ? "bx-check-circle"
                                                                : "bx-plus-circle"
                                                            } me-1`}
                                                          />
                                                          {selected ? "Inserted" : "Insert"}
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

                                      {canViewPrices &&
                                      (day.selectedEntranceFeePlaceIds || []).length > 0 ? (
                                        <div className="mt-3 d-flex justify-content-end">
                                          <Badge color="primary" className="rounded-pill px-3 py-2">
                                            Entrance Fees Total: {formatMoney(
                                              entranceFeePlaces
                                                .filter(place =>
                                                  (day.selectedEntranceFeePlaceIds || []).includes(getId(place))
                                                )
                                                .reduce(
                                                  (sum, place) =>
                                                    sum +
                                                    (Number(
                                                      getEntranceFeeAmount(place, quotationNationalityId)
                                                    ) || 0),
                                                  0
                                                )
                                            )}
                                          </Badge>
                                        </div>
                                      ) : null}

                                      {day.touched.selectedEntranceFeePlaceIds &&
                                      dayErrors.selectedEntranceFeePlaceIds ? (
                                        <div className="text-danger small mt-2">
                                          {dayErrors.selectedEntranceFeePlaceIds}
                                        </div>
                                      ) : null}
                                    </div>
                                  </Col>
                                </Row>
                              </SectionCard>
                            </Col>

                            <Col xl="6">
                              <SectionCard
                                icon="bx-car"
                                title="Transportation"
                                subtitle="Select transportation type and company. The best matching size will be loaded automatically."
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
                                        disabled={lookupsLoading || readOnly}
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
                                        disabled={lookupsLoading || readOnly}
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
                                      ) : currentBestRateLoading && !day.TRANSPORTATION_BY ? (
                                        <div className="bg-light rounded p-3 d-flex align-items-center">
                                          <Spinner size="sm" className="me-2" />
                                          <span className="text-muted small">
                                            Loading best transportation rate...
                                          </span>
                                        </div>
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
                                            {canViewPrices ? (
                                              <Col md="12">
                                                <div className="text-muted small">Best Rate</div>
                                                <div className="fw-semibold">
                                                  {day.TRANSPORTATION_RATE !== null &&
                                                  day.TRANSPORTATION_RATE !== undefined
                                                    ? formatMoney(day.TRANSPORTATION_RATE)
                                                    : "-"}
                                                </div>
                                              </Col>
                                            ) : null}
                                          </Row>
                                        </div>
                                      ) : currentBestRateError ? (
                                        <Alert color="danger" className="mb-0">
                                          <div className="fw-semibold mb-1">Transportation rate not found</div>
                                          <div>{currentBestRateError}</div>
                                        </Alert>
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
                                    disabled={readOnly}
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
                                      disabled={lookupsLoading || readOnly}
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
                                    disabled={readOnly}
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
                                                disabled={readOnly}
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
                                                disabled={readOnly}
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
                                                  disabled={readOnly}
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
                                                  disabled={!meal.CITY_ID || readOnly}
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
                                                  disabled={!meal.RESTAURANT_ID || readOnly}
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

                                                {canViewPrices && meal.MEAL_TYPE ? (
                                                  <div className="mt-2">
                                                    <Badge color="primary" pill>
                                                      Price / Person: {formatMoney(
                                                        availableMeals.find(
                                                          item =>
                                                            getId(item) === meal.MEAL_TYPE ||
                                                            item?.MEAL_TYPE === meal.MEAL_TYPE ||
                                                            item?.MEAL_NAME === meal.MEAL_TYPE
                                                        )?.MEAL_PRICE_PER_PERSON
                                                      )}
                                                    </Badge>
                                                  </div>
                                                ) : null}
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
                                        disabled={!routeCities.length || readOnly}
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
                                    disabled={readOnly}
                                    onClick={() => {
                                      if (readOnly) {
                                        notifyError(readOnlyMessage);
                                        return;
                                      }

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
                                    disabled={isSavingThisDay || readOnly}
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
                      </fieldset>
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
