// path: src/pages/QuotationPricing/Details.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  Input,
  InputGroup,
  InputGroupText,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import { get, post } from "../../helpers/api_helper";
import { fetchListItems } from "../../helpers/list_items_helper";
import {
  fetchQuotationPricing,
  rejectQuotationPricing,
  updateQuotationPricingProfit,
} from "../../store/QuotationPricing/actions";
import { fetchQuotation } from "../../store/Quotations/actions";

const ALLOWED_ROLES = ["ACCOUNTING", "COMPANY_ADMIN"];
const SUPPLEMENT_PRICE_FIELDS = [
  { key: "bb", label: "BB" },
  { key: "hb", label: "HB" },
  { key: "fb", label: "FB" },
  { key: "ss", label: "SS" },
];

const getId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return getId(value._id);
  if (value?.$oid) return value.$oid;
  return "";
};

const formatCurrency = value => {
  const n = Number(value || 0);
  if (Number.isNaN(n)) return "-";
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

const formatDateTime = value => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB");
};

const formatDate = value => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB");
};

const getDateValue = (...values) =>
  values.find(value => String(value || "").trim()) || "";

const getDateKey = value => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toISOString().slice(0, 10);
};

const formatDateRange = (from, to, fallback = "-") => {
  if (from && to) return `${formatDate(from)} - ${formatDate(to)}`;
  if (from) return formatDate(from);
  if (to) return formatDate(to);
  return fallback;
};

const getDurationDays = (from, to) => {
  if (!from || !to) return null;

  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.round((end - start) / dayMs) + 1);
};

const addDays = (value, days) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setDate(date.getDate() + days);
  return date;
};

const getOverlapNights = (stayStartValue, nights, seasonStartValue, seasonEndValue) => {
  if (!stayStartValue || !seasonStartValue || !seasonEndValue || !nights) return nights;

  const stayStart = new Date(stayStartValue);
  const stayEnd = addDays(stayStartValue, nights);
  const seasonStart = new Date(seasonStartValue);
  const seasonEnd = addDays(seasonEndValue, 1);

  if (
    Number.isNaN(stayStart.getTime()) ||
    !stayEnd ||
    Number.isNaN(seasonStart.getTime()) ||
    !seasonEnd
  ) {
    return nights;
  }

  const from = Math.max(stayStart.getTime(), seasonStart.getTime());
  const to = Math.min(stayEnd.getTime(), seasonEnd.getTime());
  if (to <= from) return 0;

  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((to - from) / dayMs);
};

const formatStars = value => {
  const stars = String(value || "").trim();
  if (!stars) return "-";
  return `${stars} Star${stars === "1" ? "" : "s"}`;
};

const normalizeKey = value => String(value || "").trim().toLowerCase();

const asArray = value => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return [value];
};

const getSeasonKey = season =>
  [
    getId(
      season?.SEASON_NAME ||
        season?.HOTEL_SEASON ||
        season?.HOTEL_SEASON_ID ||
        season?._id ||
        season?.SEASON_ID ||
        season?.id
    ),
    normalizeKey(
      season?.HOTEL_SEASON_VALUE ||
        season?.HOTELSEASON_VALUE ||
        season?.ITEM_VALUE ||
        season?.SEASON_NAME
    ),
    getDateKey(getDateValue(season?.FROM_DATE, season?.START_DATE, season?.DATE_FROM)),
    getDateKey(getDateValue(season?.TO_DATE, season?.END_DATE, season?.DATE_TO)),
  ].join("|");

const mergeSeasons = (...seasonLists) => {
  const map = new Map();

  seasonLists.flatMap(asArray).forEach(season => {
    if (!season || typeof season !== "object") return;
    const key = getSeasonKey(season);
    if (!key.replaceAll("|", "")) return;
    map.set(key, {
      ...(map.get(key) || {}),
      ...season,
    });
  });

  return Array.from(map.values());
};

const collectAccommodationEntries = value => {
  const entries = [];
  const seen = new WeakSet();

  const walk = node => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);

    if (
      Array.isArray(node?.OPTIONS) &&
      node.OPTIONS.some(option => Array.isArray(option?.CITY_GROUPS))
    ) {
      entries.push(node);
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    Object.values(node).forEach(child => {
      if (child && typeof child === "object") walk(child);
    });
  };

  walk(value);
  return entries;
};

const collectHotelIds = value => {
  const ids = new Set();
  const seen = new WeakSet();

  const walk = node => {
    if (!node || typeof node !== "object" || seen.has(node)) return;
    seen.add(node);

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (node?.HOTEL_NAME || node?.HOTEL_ID || node?.HOTEL) {
      const id = getId(node?.HOTEL_ID || node?.HOTEL || node?._id);
      if (id) ids.add(id);
    }

    Object.values(node).forEach(child => {
      if (child && typeof child === "object") walk(child);
    });
  };

  walk(value);
  return Array.from(ids);
};

const getStatusColor = status => {
  switch (String(status || "").toUpperCase()) {
    case "SEND_FOR_PRICING":
      return "warning";
    case "APPROVED":
      return "success";
    case "REJECTED":
      return "danger";
    case "CANCELLED":
      return "secondary";
    default:
      return "light";
  }
};

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

const PriceCard = ({ title, value, subtitle = null }) => (
  <div className="border rounded p-3 h-100 bg-white">
    <div className="text-muted small mb-1">{title}</div>
    <div className="fw-bold font-size-18">{formatCurrency(value)}</div>
    {subtitle ? <div className="small text-muted mt-1">{subtitle}</div> : null}
  </div>
);

const SectionHeader = ({ icon, title, subtitle }) => (
  <div className="d-flex align-items-start gap-3 mb-4">
    <div
      className="avatar-sm rounded-circle d-flex align-items-center justify-content-center bg-light"
      style={{ minWidth: 44 }}
    >
      <i className={`${icon} font-size-20 text-primary`} />
    </div>
    <div>
      <h4 className="card-title mb-1">{title}</h4>
      {subtitle ? <p className="text-muted mb-0">{subtitle}</p> : null}
    </div>
  </div>
);

const SummaryInfoCard = ({ label, value, accent = false }) => (
  <div
    className={`h-100 rounded-3 border px-3 py-3 ${
      accent ? "bg-primary border-primary text-white" : "bg-light border-light"
    }`}
  >
    <div className={`small mb-1 ${accent ? "text-white text-opacity-75" : "text-muted"}`}>
      {label}
    </div>
    <div className={`fw-semibold ${accent ? "text-white" : ""}`}>{value}</div>
  </div>
);

const SidePanelSectionTitle = ({ icon, title, subtitle }) => (
  <div className="mb-3">
    <div className="d-flex align-items-center gap-2 mb-1">
      <div
        className="rounded-circle d-flex align-items-center justify-content-center bg-light"
        style={{ width: 34, height: 34 }}
      >
        <i className={`${icon} text-primary`} />
      </div>
      <h5 className="mb-0">{title}</h5>
    </div>
    {subtitle ? <div className="text-muted small">{subtitle}</div> : null}
  </div>
);

const QuotationPricingDetails = () => {
  const { quotationId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const roles = useSelector(state => state.Login?.roles || []);
  const canAccess = hasAnyRole(roles, ALLOWED_ROLES);

  const { selected, loading, saving } = useSelector(
    state => state.QuotationPricing || {}
  );
  const quotation = useSelector(state => state.Quotations?.selected || null);
  const hotelLookups = useSelector(state => state.Hotels?.lookups || {});

  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeData, setFinanceData] = useState(null);
  const [savedAccommodationData, setSavedAccommodationData] = useState(null);
  const [hotelSeasonRatesById, setHotelSeasonRatesById] = useState({});
  const [hotelSeasonLookups, setHotelSeasonLookups] = useState([]);
  const [guideSaving, setGuideSaving] = useState(false);
  const [guidePrices, setGuidePrices] = useState({});
  const [guideTouched, setGuideTouched] = useState({});

  const [profitForm, setProfitForm] = useState({
    PROFIT_TYPE: "PERCENT",
    PROFIT_VALUE: "0",
  });
  const [profitTouched, setProfitTouched] = useState({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTouched, setRejectTouched] = useState(false);
  const [pricingSearch, setPricingSearch] = useState("");
  const [pricingOptionFilter, setPricingOptionFilter] = useState("ALL");
  const [expandedPriceCity, setExpandedPriceCity] = useState("");
  const [expandedPriceHotel, setExpandedPriceHotel] = useState("");
  const [expandedPriceSeason, setExpandedPriceSeason] = useState("");
  const [selectedSupplements, setSelectedSupplements] = useState(["bb"]);
  const [selectedHotelSeasonKeys, setSelectedHotelSeasonKeys] = useState({});

  const hotelSeasonNameById = useMemo(() => {
    const map = new Map();

    [...(hotelLookups?.HOTELSEASONS || []), ...hotelSeasonLookups].forEach(item => {
      const id = getId(item?._id || item?.id);
      const label =
        item?.ITEM_VALUE ||
        item?.SEASON_NAME ||
        item?.HOTEL_SEASON_VALUE ||
        item?.HOTELSEASON_VALUE ||
        item?.name ||
        "";
      if (id && label) map.set(id, label);
    });

    return map;
  }, [hotelLookups?.HOTELSEASONS, hotelSeasonLookups]);

  useEffect(() => {
    if (!canAccess) {
      notifyError("Permission/role mismatch");
      navigate("/dashboard");
    }
  }, [canAccess, navigate]);

  useEffect(() => {
    if (!canAccess || !quotationId) return;
    dispatch(fetchQuotationPricing(quotationId));
    dispatch(fetchQuotation(quotationId));
  }, [dispatch, canAccess, quotationId]);

  useEffect(() => {
    let ignore = false;

    const loadHotelSeasonLookups = async () => {
      if (!canAccess) return;

      try {
        const items = await fetchListItems("HOTELSEASONS");
        if (!ignore) {
          setHotelSeasonLookups(Array.isArray(items) ? items : []);
        }
      } catch (error) {
        if (!ignore) {
          setHotelSeasonLookups([]);
        }
      }
    };

    loadHotelSeasonLookups();

    return () => {
      ignore = true;
    };
  }, [canAccess]);

  const loadFinance = useCallback(async ({ silent = false } = {}) => {
    if (!canAccess || !quotationId) return;

    if (!silent) {
      setFinanceLoading(true);
    }

    try {
      const [financeResult, accommodationResult] = await Promise.allSettled([
        get(`/quotation-finances/quotation/${quotationId}`),
        get(`/quotation-accumidation?QUOTATION_ID=${encodeURIComponent(quotationId)}`),
      ]);

      if (financeResult.status === "fulfilled") {
        setFinanceData(financeResult.value || null);
      } else {
        setFinanceData(null);
        notifyError(
          getErrorMessage(
            financeResult.reason,
            "Failed to load quotation finance details."
          )
        );
      }

      if (accommodationResult.status === "fulfilled") {
        setSavedAccommodationData(accommodationResult.value || null);
      } else {
        setSavedAccommodationData(null);
      }
    } catch (error) {
      setFinanceData(null);
      setSavedAccommodationData(null);
      notifyError(
        getErrorMessage(error, "Failed to load quotation finance details.")
      );
    } finally {
      if (!silent) {
        setFinanceLoading(false);
      }
    }
  }, [canAccess, quotationId]);

  useEffect(() => {
    loadFinance();
  }, [loadFinance]);

  const hotelIdsForSeasonRates = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...collectHotelIds(financeData),
            ...collectHotelIds(savedAccommodationData),
            ...collectHotelIds(quotation),
            ...collectHotelIds(selected),
          ].filter(Boolean)
        )
      ),
    [financeData, savedAccommodationData, quotation, selected]
  );

  useEffect(() => {
    let ignore = false;

    const loadHotelSeasonRates = async () => {
      const missingIds = hotelIdsForSeasonRates.filter(
        id => !Array.isArray(hotelSeasonRatesById[id])
      );

      if (missingIds.length === 0) return;

      const results = await Promise.allSettled(
        missingIds.map(id => get(`/hotels/${id}/season-rates`))
      );

      if (ignore) return;

      setHotelSeasonRatesById(prev => {
        const next = { ...prev };

        results.forEach((result, index) => {
          const id = missingIds[index];
          next[id] = result.status === "fulfilled" && Array.isArray(result.value)
            ? result.value
            : [];
        });

        return next;
      });
    };

    loadHotelSeasonRates();

    return () => {
      ignore = true;
    };
  }, [hotelIdsForSeasonRates, hotelSeasonRatesById]);

  useEffect(() => {
    if (!selected) return;
    setProfitForm({
      PROFIT_TYPE: selected?.PROFIT_TYPE || "PERCENT",
      PROFIT_VALUE:
        selected?.PROFIT_VALUE !== undefined && selected?.PROFIT_VALUE !== null
          ? String(selected.PROFIT_VALUE)
          : "0",
    });
    setProfitTouched({});
  }, [selected]);

  const isTerminalStatus = useMemo(() => {
    const status = String(selected?.STATUS || "").toUpperCase();
    return ["APPROVED", "REJECTED", "CANCELLED"].includes(status);
  }, [selected]);

  const boardBasis = String(selected?.BOARD_BASIS || "").toUpperCase();
  const pax = Number(
    financeData?.DAYS?.[0]?.SNAPSHOT?.QUOTATION?.NUMBER_OF_PAX ||
      financeData?.ACCOMMODATION?.NUMBER_OF_PAX ||
      selected?.SNAPSHOT?.QUOTATION?.NUMBER_OF_PAX ||
      quotation?.NUMBER_OF_PAX ||
      0
  ) || 0;

  useEffect(() => {
    const days = Array.isArray(financeData?.DAYS) ? financeData.DAYS : [];
    const next = {};

    days.forEach(day => {
      const key = getId(day) || String(day?.DAY_ORDER || "");
      if (!key) return;

      const totalGuideCost = Number(day?.guide?.GUIDE_COST || 0) || 0;
      next[key] = totalGuideCost ? String(totalGuideCost) : "";
    });

    setGuidePrices(next);
    setGuideTouched({});
  }, [financeData]);

  const profitErrors = useMemo(() => {
    const next = {};
    if (!String(profitForm.PROFIT_TYPE || "").trim()) {
      next.PROFIT_TYPE = "Required";
    }
    if (!String(profitForm.PROFIT_VALUE || "").trim()) {
      next.PROFIT_VALUE = "Required";
    } else if (Number(profitForm.PROFIT_VALUE) < 0) {
      next.PROFIT_VALUE = "Must be greater than or equal to 0";
    }
    return next;
  }, [profitForm]);

  const pricingView = useMemo(() => {
    const accommodation = financeData?.ACCOMMODATION || null;
    const days = Array.isArray(financeData?.DAYS) ? financeData.DAYS : [];
    const extraServices = Array.isArray(financeData?.EXTRA_SERVICES)
      ? financeData.EXTRA_SERVICES
      : [];
    const savedAccommodationEntries = [
      ...collectAccommodationEntries(savedAccommodationData),
      ...collectAccommodationEntries(quotation),
      ...collectAccommodationEntries(selected),
      ...collectAccommodationEntries(financeData),
    ];

    const resolveHotelBoardBase = seasonRates => {
      const bb = Number(seasonRates?.BB_RATE_AMOUNT || 0);
      const hb = Number(seasonRates?.HB_RATE_AMOUNT || 0);
      const fb = Number(seasonRates?.FB_RATE_AMOUNT || 0);
      const ss = Number(seasonRates?.SINGLE_SUPPLIMENT_AMOUNT || 0);

      let perPerson = bb;

      if (boardBasis === "HB") {
        perPerson = bb + hb;
      } else if (boardBasis === "FB") {
        perPerson = bb + fb;
      }

      if (pax === 1) {
        perPerson += ss;
      }

      return {
        bb,
        hb,
        fb,
        ss,
        perPerson,
      };
    };

    const resolveSeasonName = (seasonRates, fallback) => {
      const rawName =
        seasonRates?.SEASON_NAME ||
        seasonRates?.HOTEL_SEASON_VALUE ||
        seasonRates?.HOTELSEASON_VALUE ||
        seasonRates?.ITEM_VALUE ||
        "";
      const id = getId(rawName || seasonRates?.SEASON_ID || seasonRates?.HOTEL_SEASON);

      return hotelSeasonNameById.get(id) || rawName || fallback;
    };

    const savedStayLookup = new Map();

    savedAccommodationEntries.forEach(entry => {
      const options = Array.isArray(entry?.OPTIONS) ? entry.OPTIONS : [];

      options.forEach(option => {
        const optionName = option?.OPTION_NAME || "";
        const cityGroups = Array.isArray(option?.CITY_GROUPS) ? option.CITY_GROUPS : [];

        cityGroups.forEach(cityGroup => {
          const cityName = cityGroup?.CITY_NAME || "";
          const stays = Array.isArray(cityGroup?.STAYS) ? cityGroup.STAYS : [];

          stays.forEach(stay => {
            const seasons = Array.isArray(stay?.SEASONS) ? stay.SEASONS : [];
            if (seasons.length === 0) return;

            const hotelId = getId(stay?.HOTEL_ID || stay?.HOTEL || stay?.HOTEL_REF);
            const hotelName = stay?.HOTEL_NAME || "";
            const keys = [
              `${normalizeKey(optionName)}|${normalizeKey(cityName)}|id:${hotelId}`,
              `${normalizeKey(optionName)}|${normalizeKey(cityName)}|name:${normalizeKey(
                hotelName
              )}`,
              `${normalizeKey(cityName)}|id:${hotelId}`,
              `${normalizeKey(cityName)}|name:${normalizeKey(hotelName)}`,
              `id:${hotelId}`,
              `name:${normalizeKey(hotelName)}`,
            ].filter(key => !key.endsWith("id:") && !key.endsWith("name:"));

            keys.forEach(key => {
              savedStayLookup.set(key, mergeSeasons(savedStayLookup.get(key), seasons));
            });
          });
        });
      });
    });

    const findSavedSeasons = (option, cityGroup, stay) => {
      const optionName = option?.OPTION_NAME || "";
      const cityName = cityGroup?.CITY_NAME || stay?.HOTEL_CITY_VALUE || "";
      const hotelId = getId(stay?.HOTEL_ID || stay?.HOTEL || stay?.HOTEL_REF);
      const hotelName = stay?.HOTEL_NAME || "";

      const keys = [
        `${normalizeKey(optionName)}|${normalizeKey(cityName)}|id:${hotelId}`,
        `${normalizeKey(optionName)}|${normalizeKey(cityName)}|name:${normalizeKey(
          hotelName
        )}`,
        `${normalizeKey(cityName)}|id:${hotelId}`,
        `${normalizeKey(cityName)}|name:${normalizeKey(hotelName)}`,
        `id:${hotelId}`,
        `name:${normalizeKey(hotelName)}`,
      ].filter(key => !key.endsWith("id:") && !key.endsWith("name:"));

      for (const key of keys) {
        const seasons = savedStayLookup.get(key);
        if (Array.isArray(seasons) && seasons.length > 0) return seasons;
      }

      return [];
    };

    const buildSupplementRows = rows => {
      const datedRows = rows.filter(row => row.seasonStartDate && row.seasonEndDate);

      if (datedRows.length === 0) {
        return ["BB", "HB", "FB", "SS"].map(name => ({
          duration: "-",
          seasons: "-",
          name,
          price: rows.reduce(
            (sum, row) =>
              sum +
              Number(row[String(name).toLowerCase()] || 0) *
                Number(row.totalHotelNights || row.nights || 0),
            0
          ),
        }));
      }

      const boundaryTimes = new Set();

      datedRows.forEach(row => {
        const start = new Date(row.seasonStartDate);
        const endExclusive = addDays(row.seasonEndDate, 1);

        if (!Number.isNaN(start.getTime()) && endExclusive) {
          boundaryTimes.add(start.getTime());
          boundaryTimes.add(endExclusive.getTime());
        }
      });

      const sortedBoundaries = Array.from(boundaryTimes).sort((a, b) => a - b);
      const periodRows = [];

      for (let index = 0; index < sortedBoundaries.length - 1; index += 1) {
        const periodStart = new Date(sortedBoundaries[index]);
        const periodEndExclusive = new Date(sortedBoundaries[index + 1]);
        const periodEnd = new Date(periodEndExclusive);
        periodEnd.setDate(periodEnd.getDate() - 1);

        const activeRows = datedRows.filter(row => {
          const start = new Date(row.seasonStartDate);
          const endExclusive = addDays(row.seasonEndDate, 1);
          if (Number.isNaN(start.getTime()) || !endExclusive) return false;

          return start.getTime() < periodEndExclusive.getTime() &&
            endExclusive.getTime() > periodStart.getTime();
        });

        if (activeRows.length === 0) continue;

        const duration = formatDateRange(periodStart, periodEnd);
        const seasons = Array.from(new Set(activeRows.map(row => row.seasonName))).join(
          " + "
        );

        ["BB", "HB", "FB", "SS"].forEach(name => {
          const field = String(name).toLowerCase();
          const price = activeRows.reduce(
            (sum, row) =>
              sum +
              Number(row[field] || 0) *
                Number(row.totalHotelNights || row.nights || 0),
            0
          );

          periodRows.push({
            duration,
            seasons,
            name,
            price,
          });
        });
      }

      return periodRows;
    };

    const accommodationOptions = Array.isArray(accommodation?.OPTIONS)
      ? accommodation.OPTIONS
      : [];

    const accommodationRows = [];
    let accommodationTotal = 0;

    accommodationOptions.forEach((option, optionIndex) => {
      const optionKey = getId(option) || `${option?.OPTION_NAME || "Option"}-${optionIndex}`;
      const cityGroups = Array.isArray(option?.CITY_GROUPS) ? option.CITY_GROUPS : [];

      cityGroups.forEach(cityGroup => {
        const stays = Array.isArray(cityGroup?.STAYS) ? cityGroup.STAYS : [];

        stays.forEach(stay => {
          const nights = Number(stay?.NIGHTS || 0) || 0;
          const stayStartDate = stay?.OVERNIGHT_DATE || cityGroup?.OVERNIGHT_DATE || "";
          const hotelId = getId(stay?.HOTEL_ID || stay?.HOTEL || stay?.HOTEL_REF);
          const financeSeasonEntries = Array.isArray(stay?.SEASONS) ? stay.SEASONS : [];
          const savedSeasonEntries = findSavedSeasons(option, cityGroup, stay);
          const directHotelSeasonEntries = Array.isArray(hotelSeasonRatesById[hotelId])
            ? hotelSeasonRatesById[hotelId]
            : [];
          const mergedSeasonEntries = mergeSeasons(
            directHotelSeasonEntries,
            savedSeasonEntries,
            financeSeasonEntries
          );
          const seasonEntries =
            mergedSeasonEntries.length > 0
              ? mergedSeasonEntries
              : [stay?.SEASON_RATES || {}];

          seasonEntries.forEach((season, seasonIndex) => {
            const seasonRates = {
              ...(stay?.SEASON_RATES || {}),
              ...(season || {}),
            };
            const { bb, hb, fb, ss, perPerson } = resolveHotelBoardBase(seasonRates);
            const seasonStartDate = getDateValue(
              seasonRates?.FROM_DATE,
              seasonRates?.START_DATE,
              seasonRates?.DATE_FROM,
              stay?.FROM_DATE,
              stay?.START_DATE,
              stay?.DATE_FROM
            );
            const seasonEndDate = getDateValue(
              seasonRates?.TO_DATE,
              seasonRates?.END_DATE,
              seasonRates?.DATE_TO,
              stay?.TO_DATE,
              stay?.END_DATE,
              stay?.DATE_TO
            );
            const seasonNights =
              seasonEntries.length > 1
                ? getOverlapNights(stayStartDate, nights, seasonStartDate, seasonEndDate)
                : nights;

            const costNights = seasonNights > 0 ? seasonNights : 0;
            const displayNights = seasonNights > 0 ? seasonNights : nights;

            const stayPerPerson = perPerson * displayNights;
            const costStayPerPerson = perPerson * costNights;
            const stayTotal = costStayPerPerson * pax;

            accommodationTotal += stayTotal;

            accommodationRows.push({
              optionKey,
              optionName: option?.OPTION_NAME || "-",
              cityName: cityGroup?.CITY_NAME || stay?.HOTEL_CITY_VALUE || "-",
              overnightDate: stayStartDate,
              hotelId,
              hotelName: stay?.HOTEL_NAME || "-",
              hotelStars: stay?.HOTEL_STARS || option?.SELECTED_HOTEL_STARS || "",
              seasonName: resolveSeasonName(
                seasonRates,
                stay?.SEASON_NAME || `Season ${seasonIndex + 1}`
              ),
              seasonStartDate,
              seasonEndDate,
              seasonDuration: formatDateRange(
                seasonStartDate,
                seasonEndDate,
                stayStartDate
                  ? `${formatDate(stayStartDate)} (${displayNights} night${
                      displayNights === 1 ? "" : "s"
                    })`
                  : `${displayNights} night${displayNights === 1 ? "" : "s"}`
              ),
              seasonDays: getDurationDays(seasonStartDate, seasonEndDate),
              nights: displayNights,
              costNights,
              totalHotelNights: nights,
              bb,
              hb,
              fb,
              ss,
              perPerson,
              stayPerPerson,
              costStayPerPerson,
            });
          });
        });
      });
    });

    const accommodationOptionsList = accommodationOptions.map((option, optionIndex) => {
      const optionKey = getId(option) || `${option?.OPTION_NAME || "Option"}-${optionIndex}`;
      const optionName = option?.OPTION_NAME || `Option ${optionIndex + 1}`;
      const rows = Object.values(
        accommodationRows
          .filter(row => row.optionKey === optionKey)
          .reduce((acc, row) => {
            const key = [
              row.hotelId || normalizeKey(row.hotelName),
              normalizeKey(row.seasonName),
              getDateKey(row.seasonStartDate),
              getDateKey(row.seasonEndDate),
            ].join("|");

            if (!acc[key]) {
              acc[key] = row;
              return acc;
            }

            acc[key] = {
              ...acc[key],
              ...row,
              nights: Math.max(Number(acc[key].nights || 0), Number(row.nights || 0)),
              costNights: Math.max(
                Number(acc[key].costNights || 0),
                Number(row.costNights || 0)
              ),
              totalHotelNights: Math.max(
                Number(acc[key].totalHotelNights || 0),
                Number(row.totalHotelNights || 0)
              ),
              stayPerPerson: Math.max(
                Number(acc[key].stayPerPerson || 0),
                Number(row.stayPerPerson || 0)
              ),
              costStayPerPerson: Math.max(
                Number(acc[key].costStayPerPerson || 0),
                Number(row.costStayPerPerson || 0)
              ),
            };

            return acc;
          }, {})
      );
      const hotelStayRows = Object.values(
        rows.reduce((acc, row) => {
          const key = `${row.cityName}-${row.hotelName}`;

          if (!acc[key]) {
            acc[key] = {
              cityName: row.cityName,
              hotelName: row.hotelName,
              nights: row.totalHotelNights || row.nights,
            };
          }
          return acc;
        }, {})
      );
      const supplementRows = buildSupplementRows(rows);
      const supplementGroups = Object.values(
        supplementRows.reduce((acc, row) => {
          const key = `${row.duration}-${row.seasons}`;

          if (!acc[key]) {
            acc[key] = {
              duration: row.duration,
              seasons: row.seasons,
              rows: [],
            };
          }

          acc[key].rows.push(row);
          return acc;
        }, {})
      );

      return {
        optionKey,
        optionName,
        optionStars: option?.SELECTED_HOTEL_STARS || rows[0]?.hotelStars || "",
        rows,
        hotelStayRows,
        hotelsPerPerson: rows.reduce(
          (sum, row) => sum + (row.costStayPerPerson ?? row.stayPerPerson),
          0
        ),
        supplementRows,
        supplementGroups,
      };
    });

    const daysRows = [];
    let transportationTotal = 0;
    let mealsTotal = 0;
    let entranceFeesTotal = 0;
    let guideTotal = 0;

    days.forEach(day => {
      const transportationResolved = Array.isArray(day?.TRANSPORTATION_RESOLVED)
        ? day.TRANSPORTATION_RESOLVED
        : [];
      const mealsRows = Array.isArray(day?.meals?.rows) ? day.meals.rows : [];
      const entranceFeesRows = Array.isArray(day?.NTRANCE_FEES) ? day.NTRANCE_FEES : [];

      const transportationItems = transportationResolved.map(item => {
        const rate = Number(item?.RATE || 0) || 0;
        const minimumCapacity = Number(item?.MINIMUM_CAPACITY || 0) || 0;
        const perPerson = minimumCapacity > 0 ? Math.ceil(rate / minimumCapacity) : 0;

        transportationTotal += perPerson * pax;

        return {
          typeName: item?.TRANSPORTATION_TYPE_NAME || "-",
          transportationBy: item?.TRANSPORTATION_BY || "-",
          companyName: item?.TRANSPORTATION_COMPANY_NAME || "-",
          rate,
          minimumCapacity,
          maximumCapacity: Number(item?.MAXIMUM_CAPACITY || 0) || 0,
          perPerson,
        };
      });

      const mealItems = mealsRows.map(item => {
        const pricePerPerson = Number(item?.MEAL_PRICE_PER_PERSON || 0) || 0;

        mealsTotal += pricePerPerson * pax;

        return {
          cityName: item?.CITY_NAME || "-",
          restaurantName: item?.RESTAURANT_NAME || "-",
          mealName: item?.MEAL_NAME || "-",
          pricePerPerson,
        };
      });

      const entranceFeeItems = entranceFeesRows.map(item => {
        const amount = Number(item?.ENTRANCE_FEE_AMOUNT || 0) || 0;

        entranceFeesTotal += amount * pax;

        return {
          placeName: item?.PLACE_NAME || "-",
          cityName: item?.PLACE_CITY_NAME || "-",
          amount,
        };
      });

      const guideKey = getId(day) || String(day?.DAY_ORDER || "");
      const guideInputValue = guidePrices[guideKey];
      const currentGuideCost = String(guideInputValue || "").trim()
        ? Number(guideInputValue) || 0
        : Number(day?.guide?.GUIDE_COST || 0) || 0;
      guideTotal += currentGuideCost;

      daysRows.push({
        dayId: getId(day),
        guideKey,
        dayOrder: Number(day?.DAY_ORDER || 0) || 0,
        dayDate: day?.DAY_DATE || "",
        routeText: day?.ROUTE_TEXT || "-",
        overnightCityName: day?.overnight?.OVERNIGHT_CITY_NAME || "-",
        guideEnabled: !!day?.guide?.enabled,
        guideTypeName: day?.guide?.GUIDE_TYPE_NAME || "-",
        guideCostPerDay: currentGuideCost,
        guideCostPerPerson: pax > 0 ? currentGuideCost / pax : currentGuideCost,
        transportationItems,
        mealItems,
        entranceFeeItems,
      });
    });

    const extraServicesRows = extraServices.map(item => {
      const pricePerPerson = Number(item?.SERVICE_COST_PP || 0) || 0;
      return {
        serviceName: item?.SERVICE_NAME || "-",
        description: item?.SERVICE_DESCRIPTION || "",
        pricePerPerson,
      };
    });

    const extraServicesTotal = extraServicesRows.reduce(
      (sum, item) => sum + item.pricePerPerson * pax,
      0
    );

    const baseTotal =
      accommodationTotal +
      transportationTotal +
      mealsTotal +
      entranceFeesTotal +
      guideTotal +
      extraServicesTotal;

    const sharedPerPersonSummary = {
      transportation: pax > 0 ? transportationTotal / pax : transportationTotal,
      meals: pax > 0 ? mealsTotal / pax : mealsTotal,
      entranceFees: pax > 0 ? entranceFeesTotal / pax : entranceFeesTotal,
      guide: pax > 0 ? guideTotal / pax : guideTotal,
      extraServices: pax > 0 ? extraServicesTotal / pax : extraServicesTotal,
    };

    const sharedPerPersonTotal =
      sharedPerPersonSummary.transportation +
      sharedPerPersonSummary.meals +
      sharedPerPersonSummary.entranceFees +
      sharedPerPersonSummary.guide +
      sharedPerPersonSummary.extraServices;

    const profitType = String(profitForm.PROFIT_TYPE || selected?.PROFIT_TYPE || "PERCENT")
      .toUpperCase();
    const profitValue = Number(profitForm.PROFIT_VALUE || selected?.PROFIT_VALUE || 0) || 0;

    const calculateProfit = amount => {
      if (profitType === "PERCENT") {
        return amount * (profitValue / 100);
      }

      return profitValue;
    };

    const optionSummaries = accommodationOptionsList.map((option, index) => {
      const basePerPerson = option.hotelsPerPerson + sharedPerPersonTotal;
      const profitPerPerson = calculateProfit(basePerPerson);
      const finalTotal = basePerPerson + profitPerPerson;
      const seasonPriceRows = option.rows.map(row => {
        const seasonBasePrice = row.stayPerPerson;

        return {
          optionName: option.optionName || `Option ${index + 1}`,
          seasonName: row.seasonName,
          hotelName: row.hotelName,
          pricePerPerson: seasonBasePrice,
        };
      });
      const otherPerPersonRows = [
        {
          name: "Transportation",
          pricePerPerson: sharedPerPersonSummary.transportation,
        },
        {
          name: "Meals",
          pricePerPerson: sharedPerPersonSummary.meals,
        },
        {
          name: "Entrance Fees",
          pricePerPerson: sharedPerPersonSummary.entranceFees,
        },
        {
          name: "Guide",
          pricePerPerson: sharedPerPersonSummary.guide,
        },
        {
          name: "Extra Services",
          pricePerPerson: sharedPerPersonSummary.extraServices,
        },
      ];

      return {
        optionKey: option.optionKey,
        optionIndex: index,
        optionName: option.optionName || `Option ${index + 1}`,
        optionStars: option.optionStars,
        rows: option.rows,
        hotelStayRows: option.hotelStayRows,
        supplementRows: option.supplementRows,
        supplementGroups: option.supplementGroups,
        seasonPriceRows,
        otherPerPersonRows,
        hotelsPerPerson: option.hotelsPerPerson,
        ...sharedPerPersonSummary,
        sharedPerPersonTotal,
        basePerPerson,
        profitType,
        profitValue,
        profitPerPerson,
        finalTotal,
      };
    });

    const perPersonSummary = {
      accommodation: pax > 0 ? accommodationTotal / pax : accommodationTotal,
      ...sharedPerPersonSummary,
      baseTotal: pax > 0 ? baseTotal / pax : baseTotal,
    };

    return {
      accommodationRows,
      accommodationOptionsList,
      accommodationTotal,
      daysRows,
      transportationTotal,
      mealsTotal,
      entranceFeesTotal,
      guideTotal,
      extraServicesRows,
      extraServicesTotal,
      baseTotal,
      perPersonSummary,
      sharedPerPersonSummary,
      optionSummaries,
    };
  }, [
    financeData,
    boardBasis,
    pax,
    quotation?.NUMBER_OF_PAX,
    selected,
    quotation,
    guidePrices,
    profitForm,
    savedAccommodationData,
    hotelSeasonRatesById,
    hotelSeasonNameById,
  ]);

  const accommodationOptionChoices = useMemo(
    () =>
      pricingView.accommodationOptionsList.map((option, index) => ({
        key: option.optionKey || `${option.optionName}-${index}`,
        label: option.optionName || `Option ${index + 1}`,
        index,
      })),
    [pricingView.accommodationOptionsList]
  );

  const filteredOptionSummaries = useMemo(() => {
    const query = normalizeKey(pricingSearch);

    return pricingView.optionSummaries.filter((option, index) => {
      const optionKey = option.optionKey || `${option.optionName}-${index}`;
      if (pricingOptionFilter !== "ALL" && optionKey !== pricingOptionFilter) {
        return false;
      }

      if (!query) return true;

      const searchable = [
        option.optionName,
        option.optionStars,
        ...option.hotelStayRows.map(row => `${row.cityName} ${row.hotelName}`),
        ...option.rows.map(row => `${row.cityName} ${row.hotelName} ${row.seasonName}`),
      ].join(" ");

      return normalizeKey(searchable).includes(query);
    });
  }, [pricingSearch, pricingOptionFilter, pricingView.optionSummaries]);

  const accommodationTableRows = useMemo(() => {
    const query = normalizeKey(pricingSearch);

    return pricingView.accommodationOptionsList.flatMap((option, optionIndex) => {
      const optionKey = option.optionKey || `${option.optionName}-${optionIndex}`;

      return option.rows
        .map((row, rowIndex) => ({
          ...row,
          optionKey,
          optionIndex,
          optionName: option.optionName || `Option ${optionIndex + 1}`,
          rowIndex,
        }))
        .filter(row => {
          if (pricingOptionFilter !== "ALL" && row.optionKey !== pricingOptionFilter) {
            return false;
          }

          if (!query) return true;

          return normalizeKey(
            [
              row.optionName,
              row.cityName,
              row.hotelName,
              row.hotelStars,
              row.seasonName,
              row.seasonDuration,
              row.overnightDate,
            ].join(" ")
          ).includes(query);
        });
    });
  }, [pricingSearch, pricingOptionFilter, pricingView.accommodationOptionsList]);

  const selectedOptionDetail = useMemo(() => {
    if (pricingOptionFilter === "ALL") return null;

    return pricingView.optionSummaries.find((option, index) => {
      const optionKey = option.optionKey || `${option.optionName}-${index}`;
      return optionKey === pricingOptionFilter;
    }) || null;
  }, [pricingOptionFilter, pricingView.optionSummaries]);

  const selectedOptionPriceTree = useMemo(() => {
    if (!selectedOptionDetail) return [];

    const cityMap = new Map();

    selectedOptionDetail.rows.forEach((row, rowIndex) => {
      const cityName = row.cityName || "-";
      const hotelName = row.hotelName || "-";
      const seasonName = row.seasonName || "-";
      const cityKey = normalizeKey(cityName) || `city-${rowIndex}`;
      const hotelKey = `${cityKey}|${normalizeKey(hotelName) || `hotel-${rowIndex}`}`;
      const seasonKey = [
        hotelKey,
        normalizeKey(seasonName),
        getDateKey(row.seasonStartDate),
        getDateKey(row.seasonEndDate),
      ].join("|");

      if (!cityMap.has(cityKey)) {
        cityMap.set(cityKey, {
          key: cityKey,
          name: cityName,
          total: 0,
          hotels: new Map(),
        });
      }

      const city = cityMap.get(cityKey);
      city.total += Number(row.stayPerPerson || 0);

      if (!city.hotels.has(hotelKey)) {
        city.hotels.set(hotelKey, {
          key: hotelKey,
          name: hotelName,
          total: 0,
          seasons: new Map(),
        });
      }

      const hotel = city.hotels.get(hotelKey);
      hotel.total += Number(row.stayPerPerson || 0);

      if (!hotel.seasons.has(seasonKey)) {
        hotel.seasons.set(seasonKey, {
          key: seasonKey,
          name: seasonName,
          duration: row.seasonDuration,
          total: 0,
          nights: 0,
          rows: [],
        });
      }

      const season = hotel.seasons.get(seasonKey);
      season.total += Number(row.stayPerPerson || 0);
      season.nights += Number(row.nights || 0);
      season.rows.push({
        ...row,
        rowIndex,
      });
    });

    return Array.from(cityMap.values()).map(city => ({
      ...city,
      hotels: Array.from(city.hotels.values()).map(hotel => ({
        ...hotel,
        seasons: Array.from(hotel.seasons.values()),
      })),
    }));
  }, [selectedOptionDetail]);

  useEffect(() => {
    setExpandedPriceCity("");
    setExpandedPriceHotel("");
    setExpandedPriceSeason("");
    setSelectedHotelSeasonKeys({});
  }, [pricingOptionFilter]);

  const selectedSupplementTotal = useMemo(() => {
    if (!selectedOptionPriceTree.length || selectedSupplements.length === 0) {
      return {
        total: 0,
        rows: [],
      };
    }

    const rows = [];

    selectedOptionPriceTree.forEach(city => {
      city.hotels.forEach(hotel => {
        const selectedSeasonKey =
          selectedHotelSeasonKeys[hotel.key] || hotel.seasons[0]?.key || "";
        const selectedSeason = hotel.seasons.find(
          season => season.key === selectedSeasonKey
        );

        if (!selectedSeason) return;

        const price = selectedSeason.rows.reduce((sum, row) => {
          const perNight = selectedSupplements.reduce(
            (fieldSum, field) => fieldSum + Number(row[field] || 0),
            0
          );

          return sum + perNight * Number(row.nights || 0);
        }, 0);

        rows.push({
          cityName: city.name,
          hotelName: hotel.name,
          hotelKey: hotel.key,
          seasonKey: selectedSeason.key,
          seasonName: selectedSeason.name,
          duration: selectedSeason.duration,
          nights: selectedSeason.nights,
          price,
          rows: selectedSeason.rows,
        });
      });
    });

    return {
      total: rows.reduce((sum, row) => sum + row.price, 0),
      rows,
    };
  }, [selectedHotelSeasonKeys, selectedOptionPriceTree, selectedSupplements]);

  const toggleSupplement = key => {
    if (key === "bb") return;

    setSelectedSupplements(prev => {
      const withoutBoardAdds = prev.filter(item => item !== "hb" && item !== "fb");

      if (key === "hb" || key === "fb") {
        return prev.includes(key) ? withoutBoardAdds : [...withoutBoardAdds, key];
      }

      if (prev.includes(key)) {
        return prev.filter(item => item !== key);
      }

      return [...prev, key];
    });
  };

  const selectedCalculatedTotals = useMemo(() => {
    if (!selectedOptionDetail) {
      return {
        basePerPerson: 0,
        profitPerPerson: 0,
        finalTotal: 0,
      };
    }

    const basePerPerson =
      selectedSupplementTotal.total + selectedOptionDetail.sharedPerPersonTotal;
    const profitPerPerson =
      selectedOptionDetail.profitType === "PERCENT"
        ? basePerPerson * (Number(selectedOptionDetail.profitValue || 0) / 100)
        : Number(selectedOptionDetail.profitValue || 0);

    return {
      basePerPerson,
      profitPerPerson,
      finalTotal: basePerPerson + profitPerPerson,
    };
  }, [selectedOptionDetail, selectedSupplementTotal.total]);

  const handleProfitChange = e => {
    const { name, value } = e.target;
    setProfitForm(prev => ({
      ...prev,
      [name]: value,
    }));
    setProfitTouched(prev => ({
      ...prev,
      [name]: true,
    }));
  };

  const touchProfitAll = () => {
    setProfitTouched({
      PROFIT_TYPE: true,
      PROFIT_VALUE: true,
    });
  };

  const handleSaveProfit = e => {
    e.preventDefault();

    if (isTerminalStatus) {
      notifyError("This quotation pricing record is no longer editable.");
      return;
    }

    touchProfitAll();

    if (Object.keys(profitErrors).length > 0) {
      notifyError("Please fix validation errors before saving.");
      return;
    }

    dispatch(
      updateQuotationPricingProfit(
        quotationId,
        {
          PROFIT_TYPE: profitForm.PROFIT_TYPE,
          PROFIT_VALUE: Number(profitForm.PROFIT_VALUE),
        },
        () => {
          dispatch(fetchQuotationPricing(quotationId));
        }
      )
    );
  };

  const guideErrors = useMemo(() => {
    const next = {};

    pricingView.daysRows.forEach(day => {
      if (!day.guideEnabled) return;

      const key = day.guideKey;
      const value = guidePrices[key];

      if (!String(value || "").trim()) {
        next[key] = "Required";
      } else if (Number(value) < 0) {
        next[key] = "Must be greater than or equal to 0";
      }
    });

    return next;
  }, [guidePrices, pricingView.daysRows]);

  const missingGuidePrices = useMemo(
    () =>
      pricingView.daysRows.filter(
        day => day.guideEnabled && Number(guidePrices[day.guideKey] || 0) <= 0
      ),
    [guidePrices, pricingView.daysRows]
  );

  const handleGuidePriceChange = (key, value) => {
    setGuidePrices(prev => ({
      ...prev,
      [key]: value,
    }));
    setGuideTouched(prev => ({
      ...prev,
      [key]: true,
    }));
  };

  const touchGuideAll = () => {
    const next = {};
    pricingView.daysRows.forEach(day => {
      if (day.guideEnabled) {
        next[day.guideKey] = true;
      }
    });
    setGuideTouched(next);
  };

  const handleSaveGuidePrices = async e => {
    e.preventDefault();

    if (isTerminalStatus) {
      notifyError("This quotation pricing record is no longer editable.");
      return;
    }

    touchGuideAll();

    if (Object.keys(guideErrors).length > 0) {
      notifyError("Please fix guide price validation errors before saving.");
      return;
    }

    const days = pricingView.daysRows
      .filter(day => day.guideEnabled)
      .map(day => {
        const pricePerDay = Number(guidePrices[day.guideKey] || 0) || 0;
        const pricePerPerson = pax > 0 ? pricePerDay / pax : pricePerDay;

        return {
          DAY_ID: day.dayId || null,
          DAY_ORDER: day.dayOrder,
          GUIDE_COST_PER_DAY: pricePerDay,
          GUIDE_COST_PER_PERSON: pricePerPerson,
          GUIDE_COST: pricePerDay,
        };
      });

    setGuideSaving(true);

    try {
      await post(`/quotation-pricing/quotation/${quotationId}/guide`, {
        DAYS: days,
      });
      await loadFinance({ silent: true });
      dispatch(fetchQuotationPricing(quotationId));
    } catch (error) {
      notifyError(getErrorMessage(error, "Failed to save guide prices."));
    } finally {
      setGuideSaving(false);
    }
  };

  const handleApprove = async () => {
    if (isTerminalStatus) {
      notifyError("This quotation pricing record is no longer editable.");
      return;
    }

    if (missingGuidePrices.length > 0) {
      touchGuideAll();
      notifyError("Set guide prices before approving this quotation.");
      return;
    }

    const optionSummaries = pricingView.optionSummaries.map((option, index) => ({
      optionKey: option.optionKey || `${option.optionName || "Option"}-${index}`,
      optionIndex: option.optionIndex ?? index,
      optionName: option.optionName || `Option ${index + 1}`,
      optionStars: option.optionStars || "",
      rows: option.rows || [],
      hotelStayRows: option.hotelStayRows || [],
      supplementRows: option.supplementRows || [],
      supplementGroups: option.supplementGroups || [],
      seasonPriceRows: option.seasonPriceRows || [],
      otherPerPersonRows: option.otherPerPersonRows || [],
      hotelsPerPerson: Number(option.hotelsPerPerson || 0),
      transportation: Number(option.transportation || 0),
      meals: Number(option.meals || 0),
      entranceFees: Number(option.entranceFees || 0),
      guide: Number(option.guide || 0),
      extraServices: Number(option.extraServices || 0),
      sharedPerPersonTotal: Number(option.sharedPerPersonTotal || 0),
      basePerPerson: Number(option.basePerPerson || 0),
      profitType: option.profitType || selected?.PROFIT_TYPE || profitForm.PROFIT_TYPE || "PERCENT",
      profitValue: Number(
        option.profitValue ??
          selected?.PROFIT_VALUE ??
          profitForm.PROFIT_VALUE ??
          0
      ),
      profitPerPerson: Number(option.profitPerPerson || 0),
      finalTotal: Number(option.finalTotal || 0),
    }));

    const payload = {
      DECISION: "APPROVE",
      BOARD_BASIS: boardBasis || selected?.BOARD_BASIS || "BB",
      PROFIT_TYPE: selected?.PROFIT_TYPE || profitForm.PROFIT_TYPE || "PERCENT",
      PROFIT_VALUE: Number(selected?.PROFIT_VALUE ?? profitForm.PROFIT_VALUE ?? 0),
      OPTION_SUMMARIES: optionSummaries,
      FINAL_OPTIONS: optionSummaries,
      FINAL_TOTAL: optionSummaries[0]?.finalTotal || 0,
      PRICING_VIEW: {
        optionSummaries,
        perPersonSummary: pricingView.perPersonSummary,
        sharedPerPersonSummary: pricingView.sharedPerPersonSummary,
      },
      SNAPSHOT: {
        ...(selected?.SNAPSHOT || {}),
        OPTION_SUMMARIES: optionSummaries,
        FINAL_OPTIONS: optionSummaries,
        PRICING_VIEW: {
          optionSummaries,
          perPersonSummary: pricingView.perPersonSummary,
          sharedPerPersonSummary: pricingView.sharedPerPersonSummary,
        },
      },
    };

    try {
      await post(`/quotation-pricing/quotation/${quotationId}/decision`, payload);
      dispatch(fetchQuotationPricing(quotationId));
      dispatch(fetchQuotation(quotationId));
      await loadFinance({ silent: true });
    } catch (error) {
      notifyError(getErrorMessage(error, "Failed to approve quotation pricing."));
    }
  };

  const handleReject = () => {
    setRejectTouched(true);

    if (isTerminalStatus) {
      notifyError("This quotation pricing record is no longer editable.");
      return;
    }

    if (!String(rejectReason || "").trim()) {
      notifyError("Reject reason is required.");
      return;
    }

    dispatch(
      rejectQuotationPricing(
        quotationId,
        { REJECT_REASON: rejectReason.trim() },
        () => {
          setRejectOpen(false);
          setRejectReason("");
          setRejectTouched(false);
          dispatch(fetchQuotationPricing(quotationId));
          dispatch(fetchQuotation(quotationId));
        }
      )
    );
  };

  if (!canAccess) {
    return null;
  }

  document.title = "Quotation Pricing Details | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotation Pricing" breadcrumbItem="Details" />

          <Row className="g-3 mb-4">
            <Col xl="8">
              <Card className="border-0 shadow-sm h-100">
                <CardBody className="p-4">
                  {loading && !selected ? (
                    <div className="text-center py-4">
                      <Spinner size="sm" className="me-2" />
                      Loading...
                    </div>
                  ) : !selected ? (
                    <Alert color="warning" className="mb-0">
                      Quotation pricing record not found.{" "}
                      <Link to="/quotation-pricing" className="alert-link">
                        Go back
                      </Link>
                    </Alert>
                  ) : (
                    <>
                      <div className="d-flex flex-wrap align-items-start justify-content-between gap-3 mb-4">
                        <div className="d-flex align-items-start gap-3">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center bg-light"
                            style={{ width: 58, height: 58, minWidth: 58 }}
                          >
                            <i className="bx bx-dollar-circle font-size-24 text-primary" />
                          </div>

                          <div>
                            <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                              <h3 className="mb-0">Quotation Prices</h3>
                              <Badge color={getStatusColor(selected?.STATUS)} pill>
                                {selected?.STATUS || "-"}
                              </Badge>
                              <Badge color="light" className="text-dark border" pill>
                                {financeData?.ACCOMMODATION?.REFERANCE_NUMBER ||
                                  selected?.SNAPSHOT?.QUOTATION?.REFERANCE_NUMBER ||
                                  "-"}
                              </Badge>
                              <Badge color="light" className="text-dark border" pill>
                                {selected?.BOARD_BASIS || "-"}
                              </Badge>
                            </div>

                            <p className="text-muted mb-0">
                              Simple per-person pricing view for accommodation, routes and
                              days, and extra services.
                            </p>
                          </div>
                        </div>

                      </div>

                      <Row className="g-3">
                        <Col md="6" xl="3">
                          <SummaryInfoCard
                            label="Reference Number"
                            value={
                              financeData?.ACCOMMODATION?.REFERANCE_NUMBER ||
                              selected?.SNAPSHOT?.QUOTATION?.REFERANCE_NUMBER ||
                              "-"
                            }
                            accent
                          />
                        </Col>

                        <Col md="6" xl="2">
                          <SummaryInfoCard label="Pax" value={pax || "-"} />
                        </Col>

                        <Col md="6" xl="2">
                          <SummaryInfoCard
                            label="Board Basis"
                            value={selected?.BOARD_BASIS || "-"}
                          />
                        </Col>

                        <Col md="6" xl="3">
                          <SummaryInfoCard
                            label="Sent On"
                            value={formatDateTime(selected?.SENT_ON)}
                          />
                        </Col>

                        <Col md="6" xl="2">
                          <SummaryInfoCard
                            label="Quotation Status"
                            value={quotation?.STATUS || selected?.STATUS || "-"}
                          />
                        </Col>
                      </Row>

                      {selected?.REJECT_REASON ? (
                        <Alert color="danger" className="mt-4 mb-0">
                          <div className="fw-semibold mb-1">Reject Reason</div>
                          <div>{selected.REJECT_REASON}</div>
                        </Alert>
                      ) : null}

                      {selected?.CANCEL_REASON ? (
                        <Alert color="secondary" className="mt-4 mb-0">
                          <div className="fw-semibold mb-1">Cancel Reason</div>
                          <div>{selected.CANCEL_REASON}</div>
                        </Alert>
                      ) : null}
                    </>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col xl="4">
              <Card
                className="border-0 shadow-sm"
                style={{ position: "sticky", top: "90px" }}
              >
                <CardBody className="p-4">
                  <div className="d-flex align-items-center justify-content-between mb-4">
                    <div>
                      <h4 className="mb-1">Workflow Panel</h4>
                      <p className="text-muted mb-0 small">
                        Fast navigation and approval actions.
                      </p>
                    </div>
                    <div
                      className="rounded-circle d-flex align-items-center justify-content-center bg-light"
                      style={{ width: 42, height: 42 }}
                    >
                      <i className="bx bx-grid-alt text-primary font-size-18" />
                    </div>
                  </div>

                  <SidePanelSectionTitle
                    icon="bx bx-link-alt"
                    title="Quick Access"
                    subtitle="Move quickly between related pages."
                  />

                  <div className="d-grid gap-2 mb-4">
                    <Button
                      color="light"
                      className="fw-semibold"
                      type="button"
                      onClick={() => navigate("/quotation-pricing")}
                    >
                      <i className="bx bx-arrow-back me-1" />
                      Back to Queue
                    </Button>

                    <Button
                      color="primary"
                      className="fw-semibold"
                      type="button"
                      onClick={() => navigate(`/quotations/${quotationId}`)}
                    >
                      <i className="bx bx-file me-1" />
                      Quotation Details
                    </Button>
                  </div>

                  <div className="border-top pt-4">
                    <SidePanelSectionTitle
                      icon="bx bx-check-shield"
                      title="Actions"
                      subtitle={
                        isTerminalStatus
                          ? "This record is finalized."
                          : "Approve or reject this quotation pricing."
                      }
                    />

                    {isTerminalStatus ? (
                      <Alert color="info" className="mb-0">
                        This quotation pricing record is already finalized and cannot be
                        changed.
                      </Alert>
                    ) : (
                      <div className="d-grid gap-2">
                        <Button
                          color="success"
                          className="fw-semibold"
                          onClick={handleApprove}
                          disabled={saving || loading}
                        >
                          {saving ? <Spinner size="sm" className="me-2" /> : null}
                          <i className="bx bx-check-circle me-1" />
                          Approve
                        </Button>

                        <Button
                          color="danger"
                          outline
                          className="fw-semibold"
                          onClick={() => setRejectOpen(true)}
                          disabled={saving || loading}
                        >
                          <i className="bx bx-x-circle me-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {financeLoading ? (
            <Card className="mb-3 border-0 shadow-sm">
              <CardBody className="text-center py-4">
                <Spinner size="sm" className="me-2" />
                Loading finance details...
              </CardBody>
            </Card>
          ) : null}

          {!selected ? null : (
            <>
              <Row className="mb-3">
                <Col xl="12">
                  <Card className="border-0 shadow-sm">
                    <CardBody>
                      <SectionHeader
                        icon="bx bx-calculator"
                        title="Options Summary"
                        subtitle="Each option has its own hotel person price, then the shared person costs and profit are added clearly."
                      />

                      {pricingView.optionSummaries.length === 0 ? (
                        <Alert color="info" className="mb-0">
                          No option pricing data found.
                        </Alert>
                      ) : (
                        <>
                          <Row className="g-3 mb-3">
                            <Col lg="7">
                              <InputGroup>
                                <InputGroupText>
                                  <i className="bx bx-search" />
                                </InputGroupText>
                                <Input
                                  value={pricingSearch}
                                  onChange={e => setPricingSearch(e.target.value)}
                                  placeholder="Search option, city, hotel, or season"
                                />
                              </InputGroup>
                            </Col>
                            <Col lg="5">
                              <Input
                                type="select"
                                value={pricingOptionFilter}
                                onChange={e => setPricingOptionFilter(e.target.value)}
                              >
                                <option value="ALL">All options</option>
                                {accommodationOptionChoices.map(option => (
                                  <option key={option.key} value={option.key}>
                                    Option {option.index + 1} - {option.label}
                                  </option>
                                ))}
                              </Input>
                            </Col>
                          </Row>

                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge color="light" className="text-dark border">
                              Showing {filteredOptionSummaries.length} of{" "}
                              {pricingView.optionSummaries.length} options
                            </Badge>
                            <Badge color="light" className="text-dark border">
                              {accommodationTableRows.length} season rows
                            </Badge>
                          </div>

                          <div
                            className="table-responsive border rounded"
                            style={{ maxHeight: "65vh", overflow: "auto" }}
                          >
                            <table className="table table-sm table-hover align-middle mb-0">
                              <thead className="table-light">
                                <tr>
                                  <th style={{ position: "sticky", top: 0, zIndex: 2 }}>
                                    Option
                                  </th>
                                  <th style={{ position: "sticky", top: 0, zIndex: 2 }}>
                                    Hotels
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                                  >
                                    Seasons
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                                  >
                                    Hotels / Person
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                                  >
                                    Shared / Person
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                                  >
                                    Cost / Person
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                                  >
                                    Profit
                                  </th>
                                  <th
                                    className="text-end"
                                    style={{ position: "sticky", top: 0, zIndex: 2 }}
                                  >
                                    Final Total
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {filteredOptionSummaries.length === 0 ? (
                                  <tr>
                                    <td className="text-center text-muted py-4" colSpan="8">
                                      No matching options.
                                    </td>
                                  </tr>
                                ) : (
                                  filteredOptionSummaries.map(option => (
                                    <tr key={option.optionKey || option.optionName}>
                                      <td style={{ minWidth: 220 }}>
                                        <div className="d-flex flex-column gap-1">
                                          <div className="fw-semibold">
                                            {option.optionName}
                                          </div>
                                          <div>
                                            <Badge color="primary" pill>
                                              Option {option.optionIndex + 1}
                                            </Badge>{" "}
                                            <Badge
                                              color="light"
                                              className="text-dark border"
                                              pill
                                            >
                                              {formatStars(option.optionStars)}
                                            </Badge>
                                          </div>
                                        </div>
                                      </td>
                                      <td style={{ minWidth: 260 }}>
                                        <div className="d-flex flex-column gap-1">
                                          {option.hotelStayRows.slice(0, 3).map(row => (
                                            <div
                                              key={`${option.optionKey}-${row.cityName}-${row.hotelName}`}
                                              className="small"
                                            >
                                              <span className="fw-semibold">
                                                {row.cityName}
                                              </span>
                                              : {row.hotelName} ({row.nights}N)
                                            </div>
                                          ))}
                                          {option.hotelStayRows.length > 3 ? (
                                            <div className="text-muted small">
                                              +{option.hotelStayRows.length - 3} more hotels
                                            </div>
                                          ) : null}
                                        </div>
                                      </td>
                                      <td className="text-end">{option.rows.length}</td>
                                      <td className="text-end fw-semibold">
                                        {formatCurrency(option.hotelsPerPerson)}
                                      </td>
                                      <td className="text-end">
                                        {formatCurrency(option.sharedPerPersonTotal)}
                                      </td>
                                      <td className="text-end fw-semibold">
                                        {formatCurrency(option.basePerPerson)}
                                      </td>
                                      <td className="text-end">
                                        {formatCurrency(option.profitPerPerson)}
                                      </td>
                                      <td className="text-end fw-bold text-primary">
                                        {formatCurrency(option.finalTotal)}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>

                          {selectedOptionDetail ? (
                            <div className="border rounded bg-white mt-4 overflow-hidden">
                              <div className="bg-light border-bottom p-3">
                                <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                                  <div>
                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
                                      <Badge color="primary" pill>
                                        Option {selectedOptionDetail.optionIndex + 1}
                                      </Badge>
                                      <h5 className="mb-0">
                                        {selectedOptionDetail.optionName}
                                      </h5>
                                      <Badge color="light" className="text-dark border" pill>
                                        {formatStars(selectedOptionDetail.optionStars)}
                                      </Badge>
                                    </div>
                                    <div className="text-muted small">
                                      Full price source: hotel seasons, board basis,
                                      shared daily costs, profit, and final person total.
                                    </div>
                                  </div>

                                    <div className="text-end">
                                    <div className="text-muted small">Final Total / Person</div>
                                    <div className="fw-bold font-size-24 text-primary">
                                      {formatCurrency(selectedCalculatedTotals.finalTotal)}
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="p-3">
                                <Row className="g-3 mb-3">
                                  <Col md="3">
                                    <PriceCard
                                      title="Hotels / Person"
                                      value={selectedSupplementTotal.total}
                                      subtitle="Selected supplements and seasons only"
                                    />
                                  </Col>
                                  <Col md="3">
                                    <PriceCard
                                      title="Shared / Person"
                                      value={selectedOptionDetail.sharedPerPersonTotal}
                                      subtitle="Transport, meals, fees, guide, services"
                                    />
                                  </Col>
                                  <Col md="3">
                                    <PriceCard
                                      title="Cost / Person"
                                      value={selectedCalculatedTotals.basePerPerson}
                                      subtitle="Hotels + shared costs"
                                    />
                                  </Col>
                                  <Col md="3">
                                    <PriceCard
                                      title="Profit / Person"
                                      value={selectedCalculatedTotals.profitPerPerson}
                                      subtitle={
                                        selectedOptionDetail.profitType === "PERCENT"
                                          ? `${formatCurrency(
                                              selectedOptionDetail.profitValue
                                            )}%`
                                          : "Fixed amount"
                                      }
                                    />
                                  </Col>
                                </Row>

                                <div className="border rounded mb-3">
                                  <div className="px-3 py-2 bg-light border-bottom">
                                    <div className="fw-semibold">
                                      Hotel Season Price Selection
                                    </div>
                                    <div className="text-muted small">
                                      Choose one or more supplements, then choose one season
                                      for each hotel. Hotels / Person is the sum of those
                                      selected prices only.
                                    </div>
                                  </div>
                                  <div className="p-3 border-bottom">
                                    <div className="fw-semibold mb-2">Supplements</div>
                                    <div className="d-flex flex-wrap gap-2">
                                      {SUPPLEMENT_PRICE_FIELDS.map(field => (
                                        <Button
                                          key={field.key}
                                          color={
                                            field.key === "bb" ||
                                            selectedSupplements.includes(field.key)
                                              ? "primary"
                                              : "light"
                                          }
                                          outline={
                                            field.key !== "bb" &&
                                            !selectedSupplements.includes(field.key)
                                          }
                                          className={
                                            field.key === "bb"
                                              ? "fw-semibold opacity-75"
                                              : "fw-semibold"
                                          }
                                          type="button"
                                          size="sm"
                                          disabled={field.key === "bb"}
                                          onClick={() => toggleSupplement(field.key)}
                                        >
                                          <i
                                            className={`bx ${
                                              field.key === "bb" ||
                                              selectedSupplements.includes(field.key)
                                                ? "bx-check"
                                                : "bx-plus"
                                            } me-1`}
                                          />
                                          {field.label}
                                        </Button>
                                      ))}
                                    </div>
                                  </div>
                                  <div
                                    className="table-responsive"
                                    style={{ maxHeight: "52vh", overflow: "auto" }}
                                  >
                                    <table className="table table-sm table-hover align-middle mb-0">
                                      <thead className="table-light">
                                        <tr>
                                          <th
                                            style={{
                                              position: "sticky",
                                              top: 0,
                                              zIndex: 2,
                                              minWidth: 280,
                                            }}
                                          >
                                            Price Source
                                          </th>
                                          <th
                                            style={{
                                              position: "sticky",
                                              top: 0,
                                              zIndex: 2,
                                              minWidth: 220,
                                            }}
                                          >
                                            Details
                                          </th>
                                          <th
                                            className="text-end"
                                            style={{ position: "sticky", top: 0, zIndex: 2 }}
                                          >
                                            Nights
                                          </th>
                                          <th
                                            className="text-end"
                                            style={{ position: "sticky", top: 0, zIndex: 2 }}
                                          >
                                            Used Rate
                                          </th>
                                          <th
                                            className="text-end"
                                            style={{ position: "sticky", top: 0, zIndex: 2 }}
                                          >
                                            Formula
                                          </th>
                                          <th
                                            className="text-end"
                                            style={{ position: "sticky", top: 0, zIndex: 2 }}
                                          >
                                            Price
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {selectedOptionPriceTree.map(city => (
                                          <React.Fragment key={city.key}>
                                            <tr>
                                              <td
                                                style={{
                                                  backgroundColor: "#e9f2ff",
                                                  color: "#2f5bea",
                                                }}
                                              >
                                                <Button
                                                  color="link"
                                                  className="p-0 fw-semibold text-start text-decoration-none"
                                                  type="button"
                                                  onClick={() => {
                                                    const isOpen =
                                                      expandedPriceCity === city.key;
                                                    setExpandedPriceCity(
                                                      isOpen ? "" : city.key
                                                    );
                                                    setExpandedPriceHotel("");
                                                    setExpandedPriceSeason("");
                                                  }}
                                                >
                                                  <i
                                                    className={`bx ${
                                                      expandedPriceCity === city.key
                                                        ? "bx-chevron-down"
                                                        : "bx-chevron-right"
                                                    } me-1`}
                                                  />
                                                  {city.name}
                                                </Button>
                                              </td>
                                              <td
                                                className="small"
                                                style={{
                                                  backgroundColor: "#e9f2ff",
                                                  color: "#4f6b95",
                                                }}
                                              >
                                                {city.hotels.length} hotel
                                                {city.hotels.length === 1 ? "" : "s"}
                                              </td>
                                              <td
                                                className="text-end"
                                                style={{ backgroundColor: "#e9f2ff" }}
                                              >
                                                -
                                              </td>
                                              <td
                                                className="text-end"
                                                style={{ backgroundColor: "#e9f2ff" }}
                                              >
                                                -
                                              </td>
                                              <td
                                                className="text-end"
                                                style={{ backgroundColor: "#e9f2ff" }}
                                              >
                                                -
                                              </td>
                                              <td
                                                className="text-end"
                                                style={{ backgroundColor: "#e9f2ff" }}
                                              >
                                                -
                                              </td>
                                            </tr>

                                            {expandedPriceCity === city.key
                                              ? city.hotels.map(hotel => (
                                                  <React.Fragment key={hotel.key}>
                                                    <tr>
                                                      <td className="ps-4">
                                                        <Button
                                                          color="link"
                                                          className="p-0 fw-semibold text-start text-decoration-none"
                                                          type="button"
                                                          onClick={() => {
                                                            const isOpen =
                                                              expandedPriceHotel ===
                                                              hotel.key;
                                                            setExpandedPriceHotel(
                                                              isOpen ? "" : hotel.key
                                                            );
                                                            setExpandedPriceSeason("");
                                                          }}
                                                        >
                                                          <i
                                                            className={`bx ${
                                                              expandedPriceHotel ===
                                                              hotel.key
                                                                ? "bx-chevron-down"
                                                                : "bx-chevron-right"
                                                            } me-1`}
                                                          />
                                                          {hotel.name}
                                                        </Button>
                                                      </td>
                                                      <td className="text-muted small">
                                                        {hotel.seasons.length} season
                                                        {hotel.seasons.length === 1
                                                          ? ""
                                                          : "s"}
                                                      </td>
                                                      <td className="text-end">-</td>
                                                      <td className="text-end">-</td>
                                                      <td className="text-end">-</td>
                                                      <td className="text-end">-</td>
                                                    </tr>

                                                    {expandedPriceHotel === hotel.key
                                                      ? hotel.seasons.map(season => (
                                                          <React.Fragment key={season.key}>
                                                            <tr>
                                                              <td className="ps-5">
                                                                <Button
                                                                  color="link"
                                                                  className="p-0 fw-semibold text-start text-decoration-none"
                                                                  type="button"
                                                                  onClick={() => {
                                                                    setSelectedHotelSeasonKeys(
                                                                      prev => ({
                                                                        ...prev,
                                                                        [hotel.key]:
                                                                          season.key,
                                                                      })
                                                                    );
                                                                    setExpandedPriceSeason(
                                                                      expandedPriceSeason ===
                                                                        season.key
                                                                        ? ""
                                                                        : season.key
                                                                    );
                                                                  }}
                                                                >
                                                                  <i
                                                                    className={`bx ${
                                                                      expandedPriceSeason ===
                                                                      season.key
                                                                        ? "bx-chevron-down"
                                                                        : "bx-chevron-right"
                                                                    } me-1`}
                                                                  />
                                                                  {season.name}
                                                                </Button>
                                                                {(selectedHotelSeasonKeys[
                                                                  hotel.key
                                                                ] ||
                                                                  hotel.seasons[0]?.key) ===
                                                                season.key ? (
                                                                  <Badge
                                                                    color="success"
                                                                    className="ms-2"
                                                                    pill
                                                                  >
                                                                    Selected
                                                                  </Badge>
                                                                ) : null}
                                                              </td>
                                                              <td>
                                                                <div>{season.duration}</div>
                                                                <div className="text-muted small">
                                                                  Click season to use it for
                                                                  this hotel
                                                                </div>
                                                              </td>
                                                              <td className="text-end">
                                                                {season.nights}
                                                              </td>
                                                              <td className="text-end">
                                                                {formatCurrency(
                                                                  season.rows.reduce(
                                                                    (sum, row) =>
                                                                      sum +
                                                                      selectedSupplements.reduce(
                                                                        (fieldSum, field) =>
                                                                          fieldSum +
                                                                          Number(
                                                                            row[field] || 0
                                                                          ),
                                                                        0
                                                                      ),
                                                                    0
                                                                  )
                                                                )}
                                                              </td>
                                                              <td className="text-end text-muted small">
                                                                {selectedSupplements
                                                                  .map(field =>
                                                                    field.toUpperCase()
                                                                  )
                                                                  .join(" + ")}{" "}
                                                                x {season.nights}
                                                              </td>
                                                              <td className="text-end fw-semibold text-primary">
                                                                {formatCurrency(
                                                                  season.rows.reduce(
                                                                    (sum, row) => {
                                                                      const perNight =
                                                                        selectedSupplements.reduce(
                                                                          (
                                                                            fieldSum,
                                                                            field
                                                                          ) =>
                                                                            fieldSum +
                                                                            Number(
                                                                              row[field] ||
                                                                                0
                                                                            ),
                                                                          0
                                                                        );

                                                                      return (
                                                                        sum +
                                                                        perNight *
                                                                          Number(
                                                                            row.nights || 0
                                                                          )
                                                                      );
                                                                    },
                                                                    0
                                                                  )
                                                                )}
                                                              </td>
                                                            </tr>

                                                            {expandedPriceSeason ===
                                                            season.key
                                                              ? season.rows.map(row => (
                                                                  <tr
                                                                    key={`${season.key}-${row.rowIndex}`}
                                                                  >
                                                                    <td className="ps-5">
                                                                      <div className="ms-4">
                                                                        <div className="fw-semibold">
                                                                          Price row
                                                                        </div>
                                                                        <div className="text-muted small">
                                                                          Overnight:{" "}
                                                                          {formatDate(
                                                                            row.overnightDate
                                                                          )}
                                                                        </div>
                                                                      </div>
                                                                    </td>
                                                                    <td>
                                                                      <div className="d-flex flex-wrap gap-2">
                                                                        <Badge
                                                                          color="light"
                                                                          className="text-dark border"
                                                                        >
                                                                          BB{" "}
                                                                          {formatCurrency(
                                                                            row.bb
                                                                          )}
                                                                        </Badge>
                                                                        <Badge
                                                                          color="light"
                                                                          className="text-dark border"
                                                                        >
                                                                          HB{" "}
                                                                          {formatCurrency(
                                                                            row.hb
                                                                          )}
                                                                        </Badge>
                                                                        <Badge
                                                                          color="light"
                                                                          className="text-dark border"
                                                                        >
                                                                          FB{" "}
                                                                          {formatCurrency(
                                                                            row.fb
                                                                          )}
                                                                        </Badge>
                                                                        <Badge
                                                                          color="light"
                                                                          className="text-dark border"
                                                                        >
                                                                          SS{" "}
                                                                          {formatCurrency(
                                                                            row.ss
                                                                          )}
                                                                        </Badge>
                                                                      </div>
                                                                    </td>
                                                                    <td className="text-end">
                                                                      {row.nights}
                                                                    </td>
                                                                    <td className="text-end fw-semibold">
                                                                      {formatCurrency(
                                                                        selectedSupplements.reduce(
                                                                          (sum, field) =>
                                                                            sum +
                                                                            Number(
                                                                              row[field] || 0
                                                                            ),
                                                                          0
                                                                        )
                                                                      )}
                                                                    </td>
                                                                    <td className="text-end text-muted small">
                                                                      {formatCurrency(
                                                                        selectedSupplements.reduce(
                                                                          (sum, field) =>
                                                                            sum +
                                                                            Number(
                                                                              row[field] || 0
                                                                            ),
                                                                          0
                                                                        )
                                                                      )}{" "}
                                                                      x {row.nights}
                                                                    </td>
                                                                    <td className="text-end fw-bold text-primary">
                                                                      {formatCurrency(
                                                                        selectedSupplements.reduce(
                                                                          (sum, field) =>
                                                                            sum +
                                                                            Number(
                                                                              row[field] || 0
                                                                            ),
                                                                          0
                                                                        ) *
                                                                          Number(
                                                                            row.nights || 0
                                                                          )
                                                                      )}
                                                                    </td>
                                                                  </tr>
                                                                ))
                                                              : null}
                                                          </React.Fragment>
                                                        ))
                                                      : null}
                                                  </React.Fragment>
                                                ))
                                              : null}
                                          </React.Fragment>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                <Row className="g-3">
                                  <Col xl="6">
                                    <div className="border rounded h-100">
                                      <div className="px-3 py-2 bg-light border-bottom">
                                        <div className="fw-semibold">
                                          Shared Prices Added To This Option
                                        </div>
                                      </div>
                                      <div className="table-responsive">
                                        <table className="table table-sm align-middle mb-0">
                                          <thead className="table-light">
                                            <tr>
                                              <th>Item</th>
                                              <th className="text-end">Price / Person</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {selectedOptionDetail.otherPerPersonRows.map(row => (
                                              <tr
                                                key={`${selectedOptionDetail.optionKey}-${row.name}`}
                                              >
                                                <td>{row.name}</td>
                                                <td className="text-end fw-semibold">
                                                  {formatCurrency(row.pricePerPerson)}
                                                </td>
                                              </tr>
                                            ))}
                                            <tr className="table-light">
                                              <td className="fw-semibold">Shared Total</td>
                                              <td className="text-end fw-bold">
                                                {formatCurrency(
                                                  selectedOptionDetail.sharedPerPersonTotal
                                                )}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </Col>

                                  <Col xl="6">
                                    <div className="border rounded h-100">
                                      <div className="px-3 py-2 bg-light border-bottom">
                                        <div className="fw-semibold">
                                          Final Sum For This Option
                                        </div>
                                      </div>
                                      <div className="table-responsive">
                                        <table className="table table-sm align-middle mb-0">
                                          <tbody>
                                            <tr>
                                              <td>Hotels / Person</td>
                                              <td className="text-end fw-semibold">
                                                {formatCurrency(
                                                  selectedSupplementTotal.total
                                                )}
                                              </td>
                                            </tr>
                                            <tr>
                                              <td>Shared Prices / Person</td>
                                              <td className="text-end fw-semibold">
                                                {formatCurrency(
                                                  selectedOptionDetail.sharedPerPersonTotal
                                                )}
                                              </td>
                                            </tr>
                                            <tr>
                                              <td>Cost / Person</td>
                                              <td className="text-end fw-semibold">
                                                {formatCurrency(
                                                  selectedCalculatedTotals.basePerPerson
                                                )}
                                              </td>
                                            </tr>
                                            <tr>
                                              <td>
                                                Profit{" "}
                                                {selectedOptionDetail.profitType === "PERCENT"
                                                  ? `(${formatCurrency(
                                                      selectedOptionDetail.profitValue
                                                    )}%)`
                                                  : "(Fixed)"}
                                              </td>
                                              <td className="text-end fw-semibold">
                                                {formatCurrency(
                                                  selectedCalculatedTotals.profitPerPerson
                                                )}
                                              </td>
                                            </tr>
                                            <tr className="table-primary">
                                              <td className="fw-bold">Final Total / Person</td>
                                              <td className="text-end fw-bold">
                                                {formatCurrency(
                                                  selectedCalculatedTotals.finalTotal
                                                )}
                                              </td>
                                            </tr>
                                          </tbody>
                                        </table>
                                      </div>
                                    </div>
                                  </Col>
                                </Row>
                              </div>
                            </div>
                          ) : null}
                        </>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xl="12">
                  <Card className="border-0 shadow-sm">
                    <CardBody>
                      <SectionHeader
                        icon="bx bx-hotel"
                        title="Accommodation"
                        subtitle="Searchable hotel and season pricing built for very large option lists."
                      />

                      {pricingView.accommodationOptionsList.length === 0 ? (
                        <Alert color="info" className="mb-0">
                          No accommodation pricing data found.
                        </Alert>
                      ) : (
                        <div>
                          <div className="d-flex flex-wrap gap-2 mb-3">
                            <Badge color="light" className="text-dark border">
                              {accommodationTableRows.length} visible rows
                            </Badge>
                            <Badge color="light" className="text-dark border">
                              {pricingView.accommodationRows.length} total season rows
                            </Badge>
                            <Badge color="light" className="text-dark border">
                              Board basis: {boardBasis || "-"}
                            </Badge>
                          </div>

                          <div
                            className="table-responsive border rounded"
                            style={{ maxHeight: "72vh", overflow: "auto" }}
                          >
                            <table className="table table-sm table-hover align-middle mb-0">
                              <thead className="table-light">
                                <tr>
                                  {[
                                    "Option",
                                    "City",
                                    "Hotel",
                                    "Stars",
                                    "Season",
                                    "Date / Nights",
                                    "BB",
                                    "HB Add",
                                    "FB Add",
                                    "SS",
                                    "Person Price",
                                  ].map((heading, index) => (
                                    <th
                                      key={heading}
                                      className={index >= 6 ? "text-end" : ""}
                                      style={{
                                        position: "sticky",
                                        top: 0,
                                        zIndex: 2,
                                        minWidth:
                                          heading === "Hotel"
                                            ? 220
                                            : heading === "Date / Nights"
                                            ? 190
                                            : undefined,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {heading}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {accommodationTableRows.length === 0 ? (
                                  <tr>
                                    <td className="text-center text-muted py-4" colSpan="11">
                                      No matching accommodation rows.
                                    </td>
                                  </tr>
                                ) : (
                                  accommodationTableRows.map(row => (
                                    <tr
                                      key={`${row.optionKey}-${row.hotelName}-${row.seasonName}-${row.rowIndex}`}
                                    >
                                      <td style={{ minWidth: 190 }}>
                                        <div className="fw-semibold">{row.optionName}</div>
                                        <Badge color="primary" pill>
                                          Option {row.optionIndex + 1}
                                        </Badge>
                                      </td>
                                      <td>{row.cityName}</td>
                                      <td className="fw-semibold">{row.hotelName}</td>
                                      <td>{formatStars(row.hotelStars)}</td>
                                      <td style={{ minWidth: 180 }}>
                                        <div>{row.seasonName}</div>
                                        {row.seasonDays ? (
                                          <div className="text-muted small">
                                            {row.seasonDays} days
                                          </div>
                                        ) : null}
                                      </td>
                                      <td style={{ minWidth: 190 }}>
                                        <div>{row.seasonDuration}</div>
                                        <div className="text-muted small">
                                          Overnight: {formatDate(row.overnightDate)} |{" "}
                                          {row.nights} night
                                          {Number(row.nights) === 1 ? "" : "s"}
                                        </div>
                                      </td>
                                      <td className="text-end">{formatCurrency(row.bb)}</td>
                                      <td className="text-end">{formatCurrency(row.hb)}</td>
                                      <td className="text-end">{formatCurrency(row.fb)}</td>
                                      <td className="text-end">{formatCurrency(row.ss)}</td>
                                      <td className="text-end fw-bold text-primary">
                                        {formatCurrency(row.stayPerPerson)}
                                      </td>
                                    </tr>
                                  ))
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xl="12">
                  <Card className="border-0 shadow-sm">
                    <CardBody>
                      <SectionHeader
                        icon="bx bx-map-alt"
                        title="Routes And Days"
                        subtitle="Clear daily person prices for transportation, meals, entrance fees, and guide."
                      />

                      {pricingView.daysRows.length === 0 ? (
                        <Alert color="info" className="mb-0">
                          No routes and days pricing data found.
                        </Alert>
                      ) : (
                        <Form onSubmit={handleSaveGuidePrices}>
                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
                            <div className="text-muted small">
                              Add the guide cost for each day before approving the quotation.
                            </div>
                            <Button
                              color="primary"
                              type="submit"
                              disabled={saving || guideSaving || isTerminalStatus}
                            >
                              {guideSaving ? <Spinner size="sm" className="me-2" /> : null}
                              Save Guide Prices
                            </Button>
                          </div>

                          <div className="d-flex flex-column gap-3">
                          {pricingView.daysRows.map(day => (
                            <div key={`day-${day.dayOrder}`} className="border rounded p-3">
                              <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                <div>
                                  <h5 className="mb-1">Day {day.dayOrder}</h5>
                                  <div className="text-muted small">
                                    {formatDate(day.dayDate)} • {day.routeText}
                                  </div>
                                </div>

                                <Badge color="light" className="text-dark">
                                  Overnight: {day.overnightCityName || "-"}
                                </Badge>
                              </div>

                              <Row className="g-3">
                                <Col xl="3">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">Transportation</h6>
                                    {day.transportationItems.length === 0 ? (
                                      <div className="text-muted small">No transportation.</div>
                                    ) : (
                                      day.transportationItems.map((item, index) => (
                                        <div
                                          key={`${item.companyName}-${index}`}
                                          className={
                                            index === day.transportationItems.length - 1
                                              ? ""
                                              : "border-bottom pb-3 mb-3"
                                          }
                                        >
                                          <div className="fw-semibold mb-1">
                                            {item.typeName}
                                          </div>
                                          <div className="text-muted small mb-1">
                                            {item.companyName}
                                          </div>
                                          <div className="text-muted small mb-1">
                                            {item.transportationBy}
                                          </div>
                                          <div className="fw-bold text-primary">
                                            {formatCurrency(item.perPerson)}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </Col>

                                <Col xl="3">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">Meals</h6>
                                    {day.mealItems.length === 0 ? (
                                      <div className="text-muted small">No meals.</div>
                                    ) : (
                                      day.mealItems.map((item, index) => (
                                        <div
                                          key={`${item.restaurantName}-${item.mealName}-${index}`}
                                          className={
                                            index === day.mealItems.length - 1
                                              ? ""
                                              : "border-bottom pb-3 mb-3"
                                          }
                                        >
                                          <div className="fw-semibold mb-1">
                                            {item.mealName}
                                          </div>
                                          <div className="text-muted small mb-1">
                                            {item.restaurantName}
                                          </div>
                                          <div className="text-muted small mb-1">
                                            {item.cityName}
                                          </div>
                                          <div className="fw-bold text-primary">
                                            {formatCurrency(item.pricePerPerson)}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </Col>

                                <Col xl="3">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">Entrance Fees</h6>
                                    {day.entranceFeeItems.length === 0 ? (
                                      <div className="text-muted small">No entrance fees.</div>
                                    ) : (
                                      day.entranceFeeItems.map((item, index) => (
                                        <div
                                          key={`${item.placeName}-${index}`}
                                          className={
                                            index === day.entranceFeeItems.length - 1
                                              ? ""
                                              : "border-bottom pb-3 mb-3"
                                          }
                                        >
                                          <div className="fw-semibold mb-1">
                                            {item.placeName}
                                          </div>
                                          <div className="text-muted small mb-1">
                                            {item.cityName}
                                          </div>
                                          <div className="fw-bold text-primary">
                                            {formatCurrency(item.amount)}
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </Col>

                                <Col xl="3">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">Guide</h6>
                                    <div className="text-muted small mb-1">
                                      Enabled: {day.guideEnabled ? "Yes" : "No"}
                                    </div>
                                    <div className="text-muted small mb-2">
                                      {day.guideTypeName || "-"}
                                    </div>
                                    {day.guideEnabled ? (
                                      <div>
                                        <Label className="form-label small">
                                          Guide Price / Day
                                        </Label>
                                        <InputGroup>
                                          <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={guidePrices[day.guideKey] || ""}
                                            onChange={e =>
                                              handleGuidePriceChange(
                                                day.guideKey,
                                                e.target.value
                                              )
                                            }
                                            invalid={
                                              !!(
                                                guideTouched[day.guideKey] &&
                                                guideErrors[day.guideKey]
                                              )
                                            }
                                            disabled={
                                              saving || guideSaving || isTerminalStatus
                                            }
                                          />
                                          <InputGroupText>DAY</InputGroupText>
                                          <FormFeedback>
                                            {guideErrors[day.guideKey]}
                                          </FormFeedback>
                                        </InputGroup>
                                        <div className="text-muted small mt-2">
                                          Per person from this day:{" "}
                                          {formatCurrency(
                                            pax > 0
                                              ? Number(guidePrices[day.guideKey] || 0) / pax
                                              : Number(guidePrices[day.guideKey] || 0)
                                          )}
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="fw-bold text-primary">
                                        {formatCurrency(day.guideCostPerPerson)}
                                      </div>
                                    )}
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          ))}
                          </div>
                        </Form>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row className="mb-3">
                <Col xl="12">
                  <Card className="border-0 shadow-sm">
                    <CardBody>
                      <SectionHeader
                        icon="bx bx-gift"
                        title="Extra Services"
                        subtitle="Simple extra service person price list."
                      />

                      {pricingView.extraServicesRows.length === 0 ? (
                        <Alert color="info" className="mb-0">
                          No extra services found.
                        </Alert>
                      ) : (
                        <Row className="g-3">
                          {pricingView.extraServicesRows.map((item, index) => (
                            <Col md="6" xl="4" key={`${item.serviceName}-${index}`}>
                              <div className="border rounded p-3 h-100">
                                <div className="fw-semibold mb-1">{item.serviceName}</div>
                                <div className="text-muted small mb-3">
                                  {item.description || "No description."}
                                </div>
                                <div className="bg-primary-subtle rounded p-2">
                                  <div className="text-muted small">Person Price</div>
                                  <div className="fw-bold text-primary">
                                    {formatCurrency(item.pricePerPerson)}
                                  </div>
                                </div>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col xl="12">
                  <Card className="border-0 shadow-sm">
                    <CardBody>
                      <SectionHeader
                        icon="bx bx-line-chart"
                        title="Profit Setup"
                        subtitle="Set profit before the final decision."
                      />

                      <Form onSubmit={handleSaveProfit}>
                        <Row className="g-3">
                          <Col md="4">
                            <Label className="form-label">Profit Type</Label>
                            <Input
                              type="select"
                              name="PROFIT_TYPE"
                              value={profitForm.PROFIT_TYPE}
                              onChange={handleProfitChange}
                              invalid={!!(profitTouched.PROFIT_TYPE && profitErrors.PROFIT_TYPE)}
                              disabled={saving || isTerminalStatus}
                            >
                              <option value="PERCENT">PERCENT</option>
                              <option value="FIXED">FIXED</option>
                            </Input>
                            <FormFeedback>{profitErrors.PROFIT_TYPE}</FormFeedback>
                          </Col>

                          <Col md="4">
                            <Label className="form-label">Profit Value</Label>
                            <InputGroup>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                name="PROFIT_VALUE"
                                value={profitForm.PROFIT_VALUE}
                                onChange={handleProfitChange}
                                invalid={!!(profitTouched.PROFIT_VALUE && profitErrors.PROFIT_VALUE)}
                                disabled={saving || isTerminalStatus}
                              />
                              {profitForm.PROFIT_TYPE === "PERCENT" ? (
                                <InputGroupText>%</InputGroupText>
                              ) : null}
                              <FormFeedback>{profitErrors.PROFIT_VALUE}</FormFeedback>
                            </InputGroup>
                          </Col>

                          <Col md="4" className="d-flex align-items-end">
                            <Button
                              color="primary"
                              type="submit"
                              disabled={saving || isTerminalStatus}
                            >
                              {saving ? <Spinner size="sm" className="me-2" /> : null}
                              Save Profit
                            </Button>
                          </Col>
                        </Row>
                      </Form>
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </>
          )}

          <Modal isOpen={rejectOpen} toggle={() => setRejectOpen(false)} centered>
            <ModalHeader toggle={() => setRejectOpen(false)}>
              Reject Quotation Pricing
            </ModalHeader>
            <ModalBody>
              <div className="mb-3">
                <Label className="form-label">Reject Reason</Label>
                <Input
                  type="textarea"
                  rows="5"
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                  invalid={!!(rejectTouched && !String(rejectReason || "").trim())}
                />
                <FormFeedback>Reject reason is required.</FormFeedback>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="light"
                type="button"
                onClick={() => {
                  setRejectOpen(false);
                  setRejectReason("");
                  setRejectTouched(false);
                }}
              >
                Cancel
              </Button>
              <Button color="danger" type="button" onClick={handleReject} disabled={saving}>
                {saving ? <Spinner size="sm" className="me-2" /> : null}
                Reject
              </Button>
            </ModalFooter>
          </Modal>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default QuotationPricingDetails;
