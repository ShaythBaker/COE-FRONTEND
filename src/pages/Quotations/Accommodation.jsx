// path: src/pages/Quotations/Accommodation.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  FormFeedback,
  Input,
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
import { notifyError, notifyInfo, notifySuccess } from "../../helpers/notify";
import { get } from "../../helpers/api_helper";
import { fetchListItems } from "../../helpers/list_items_helper";
import { fetchQuotation } from "../../store/Quotations/actions";
import {
  createQuotationAccumidation,
  fetchQuotationAccumidation,
  updateQuotationAccumidation,
} from "../../store/QuotationAccumidation/actions";
import {
  isQuotationReadOnly,
  getQuotationReadOnlyMessage,
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

const addDays = (dateValue, days) => {
  const normalized = toDateOnly(dateValue);
  if (!normalized) return "";

  const [year, month, day] = normalized.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + Number(days || 0));

  const outYear = d.getFullYear();
  const outMonth = String(d.getMonth() + 1).padStart(2, "0");
  const outDay = String(d.getDate()).padStart(2, "0");

  return `${outYear}-${outMonth}-${outDay}`;
};

const isDateInRange = (targetDate, startDate, endDate) => {
  const target = toDateOnly(targetDate);
  const start = toDateOnly(startDate);
  const end = toDateOnly(endDate);

  if (!target || !start || !end) return false;
  return target >= start && target <= end;
};

const diffNights = (start, end) => {
  if (!start || !end) return 0;

  const [startYear, startMonth, startDay] = String(start).split("-").map(Number);
  const [endYear, endMonth, endDay] = String(end).split("-").map(Number);

  const s = new Date(startYear, startMonth - 1, startDay);
  const e = new Date(endYear, endMonth - 1, endDay);

  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
};

const asArray = value => (Array.isArray(value) ? value : []);

const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const getId = value => {
  if (!value) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value === "object") {
    if (value._id) return String(value._id);
    if (value.id) return String(value.id);
    if (value.$oid) return String(value.$oid);
    if (value.ITEM_VALUE) return String(value.ITEM_VALUE);
  }
  return "";
};

const asId = value => String(getId(value || "") || "");

const extractErrorMessage = (error, fallback = "Something went wrong.") =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

const getStarLabel = value => {
  const v = String(value || "").trim();
  if (!v) return "-";
  return `${v} Star${v === "1" ? "" : "s"}`;
};

const getHotelLabel = hotel =>
  hotel?.HOTEL_NAME ||
  hotel?.HOTEL_NAME_EN ||
  hotel?.NAME ||
  hotel?.TITLE ||
  "-";

const getSeasonLabel = season => {
  if (!season) return "-";
  const name =
    season?.SEASON_NAME ||
    season?.HOTEL_SEASON_VALUE ||
    season?.HOTELSEASON_VALUE ||
    season?.ITEM_VALUE ||
    "";
  const from = toDateOnly(season?.FROM_DATE || season?.START_DATE || season?.DATE_FROM || "");
  const to = toDateOnly(season?.TO_DATE || season?.END_DATE || season?.DATE_TO || "");

  if (name && from && to) return `${name} (${from} → ${to})`;
  if (name) return name;
  if (from && to) return `${from} → ${to}`;
  return "-";
};

const normalizeOvernightCities = (response, fallbackStartDate = "") => {
  const rows = asArray(response?.OVERNIGHTS || response?.overnights || response?.data || [])
    .map((item, index) => {
      const totalNights = toNumber(item?.TOTAL_NIGHTS);
      const cityDate =
        toDateOnly(item?.OVERNIGHT_DATE) ||
        toDateOnly(item?.CITY_DATE) ||
        addDays(fallbackStartDate, index);

      return {
        localId: `city-${index + 1}-${asId(item?.OVERNIGHT_CITY || item?.CITY_ID || item?._id || index)}`,
        CITY_ID: asId(item?.OVERNIGHT_CITY || item?.CITY_ID || item?.CITY || item?._id),
        CITY_NAME:
          item?.OVERNIGHT_CITY_NAME ||
          item?.CITY_NAME ||
          item?.OVERNIGHT_CITY_VALUE ||
          item?.CITY_VALUE ||
          "-",
        OVERNIGHT_CITY: asId(item?.OVERNIGHT_CITY || item?.CITY_ID || item?.CITY || item?._id),
        OVERNIGHT_CITY_NAME:
          item?.OVERNIGHT_CITY_NAME ||
          item?.CITY_NAME ||
          item?.OVERNIGHT_CITY_VALUE ||
          item?.CITY_VALUE ||
          "-",
        OVERNIGHT_DATE: cityDate,
        TOTAL_NIGHTS: totalNights,
        stays: [],
      };
    })
    .filter(item => item.CITY_ID);

  return rows.sort((a, b) => {
    const aDate = toDateOnly(a?.OVERNIGHT_DATE);
    const bDate = toDateOnly(b?.OVERNIGHT_DATE);
    if (!aDate && !bDate) return 0;
    if (!aDate) return 1;
    if (!bDate) return -1;
    return aDate.localeCompare(bDate);
  });
};

const normalizeSearchResultsFromOvernights = (response, chainNameById = {}) => {
  const overnights = Array.isArray(response?.OVERNIGHTS) ? response.OVERNIGHTS : [];

  const directCandidates = [
    ...asArray(response?.HOTELS),
    ...asArray(response?.hotels),
    ...asArray(response?.SEARCH_RESULTS),
    ...asArray(response?.results),
  ];

  const map = new Map();

  const pushHotel = (hotel, overnight = null, index = 0) => {
    const hotelId = asId(hotel?._id || hotel?.HOTEL_ID || hotel?.id || index);
    if (!hotelId) return;

    const cityId = asId(
      hotel?.HOTEL_CITY ||
        hotel?.CITY_ID ||
        hotel?.CITY ||
        overnight?.OVERNIGHT_CITY ||
        overnight?.CITY_ID ||
        overnight?.CITY
    );

    const cityValue =
      hotel?.HOTEL_CITY_VALUE ||
      hotel?.CITY_NAME ||
      hotel?.OVERNIGHT_CITY_NAME ||
      hotel?.CITY_VALUE ||
      overnight?.OVERNIGHT_CITY_NAME ||
      overnight?.CITY_NAME ||
      "-";

    const chainId = asId(hotel?.HOTEL_CHAIN || hotel?.HOTEL_CHAIN_ID || hotel?.CHAIN_ID);

    const seasonsRaw =
      hotel?.seasons ||
      hotel?.SEASONS ||
      hotel?.HOTEL_SEASONS ||
      hotel?.seasonRates ||
      hotel?.SEASON_RATES ||
      hotel?.AVAILABLE_SEASONS ||
      [];

    const normalizedSeasons = asArray(seasonsRaw).map(item => ({
      ...item,
      _id: item?._id || item?.SEASON_ID || item?.id || "",
      SEASON_NAME:
        item?.SEASON_NAME ||
        item?.HOTEL_SEASON_VALUE ||
        item?.HOTELSEASON_VALUE ||
        item?.ITEM_VALUE ||
        "",
      FROM_DATE: toDateOnly(item?.FROM_DATE || item?.START_DATE || item?.DATE_FROM || ""),
      TO_DATE: toDateOnly(item?.TO_DATE || item?.END_DATE || item?.DATE_TO || ""),
      START_DATE: toDateOnly(item?.START_DATE || item?.FROM_DATE || item?.DATE_FROM || ""),
      END_DATE: toDateOnly(item?.END_DATE || item?.TO_DATE || item?.DATE_TO || ""),
    }));

    const normalizedHotel = {
      ...hotel,
      _id: hotelId,
      HOTEL_ID: hotelId,
      HOTEL_NAME: getHotelLabel(hotel),
      HOTEL_CITY: cityId,
      HOTEL_CITY_VALUE: cityValue,
      HOTEL_CHAIN: chainId,
      HOTEL_CHAIN_VALUE:
        hotel?.HOTEL_CHAIN_VALUE ||
        hotel?.HOTEL_CHAIN_NAME ||
        chainNameById[chainId] ||
        "-",
      HOTEL_STARS: String(
        hotel?.HOTEL_STARS ??
          hotel?.STARS ??
          hotel?.HOTEL_STAR ??
          hotel?.STAR_RATING ??
          ""
      ).trim(),
      seasons: normalizedSeasons,
    };

    const existing = map.get(hotelId);

    if (!existing) {
      map.set(hotelId, normalizedHotel);
      return;
    }

    const seasonMap = new Map();
    [...asArray(existing?.seasons), ...normalizedSeasons].forEach(season => {
      const seasonId = asId(season?._id || season?.SEASON_ID || season?.id);
      if (seasonId) {
        seasonMap.set(seasonId, season);
      }
    });

    map.set(hotelId, {
      ...existing,
      ...normalizedHotel,
      HOTEL_CITY: existing?.HOTEL_CITY || normalizedHotel.HOTEL_CITY,
      HOTEL_CITY_VALUE:
        existing?.HOTEL_CITY_VALUE && existing.HOTEL_CITY_VALUE !== "-"
          ? existing.HOTEL_CITY_VALUE
          : normalizedHotel.HOTEL_CITY_VALUE,
      seasons: Array.from(seasonMap.values()),
    });
  };

  directCandidates.forEach((hotel, index) => {
    pushHotel(hotel, null, index);
  });

  overnights.forEach((overnight, overnightIndex) => {
    const availableHotels = Array.isArray(overnight?.AVAILABLE_HOTELS)
      ? overnight.AVAILABLE_HOTELS
      : [];

    availableHotels.forEach((hotel, hotelIndex) => {
      pushHotel(hotel, overnight, `${overnightIndex}-${hotelIndex}`);
    });
  });

  return Array.from(map.values());
};

const createOption = (index, overnightCities = []) => ({
  localId: `option-${Date.now()}-${index}`,
  OPTION_NAME: `Option ${index + 1}`,
  SELECTED_HOTEL_STARS: "",
  touched: {},
  cityGroups: (overnightCities || []).map((city, cityIndex) => ({
    localId: `city-${Date.now()}-${index}-${cityIndex}`,
    CITY_ID: asId(city?.CITY_ID || city?._id || city?.id || city?.OVERNIGHT_CITY),
    CITY_NAME: city?.CITY_NAME || city?.OVERNIGHT_CITY_NAME || city?.name || "-",
    TOTAL_NIGHTS: toNumber(
      city?.TOTAL_NIGHTS ||
        city?.CITY_TOTAL_NIGHTS_LIMIT ||
        city?.ALLOWED_NIGHTS ||
        0
    ),
    OVERNIGHT_DATE: city?.OVERNIGHT_DATE || "",
    selectedHotelIds: [],
    stays: [],
  })),
});

const buildStayFromHotel = (hotel, cityGroup, option, findMatchingSeasonFn) => {
  if (!hotel) return null;

  const autoSeason = findMatchingSeasonFn
    ? findMatchingSeasonFn(hotel, cityGroup?.OVERNIGHT_DATE)
    : null;

  return {
    HOTEL_ID: String(asId(hotel?._id || hotel?.HOTEL_ID || hotel?.id) || ""),
    HOTEL_NAME: getHotelLabel(hotel),
    HOTEL_STARS: String(hotel?.HOTEL_STARS ?? option?.SELECTED_HOTEL_STARS ?? "").trim(),
    HOTEL_CHAIN: asId(hotel?.HOTEL_CHAIN || hotel?.HOTEL_CHAIN_ID),
    HOTEL_CHAIN_VALUE: hotel?.HOTEL_CHAIN_VALUE || hotel?.HOTEL_CHAIN_NAME || "",
    HOTEL_CITY: asId(hotel?.HOTEL_CITY || hotel?.CITY_ID || cityGroup?.CITY_ID),
    HOTEL_CITY_VALUE: hotel?.HOTEL_CITY_VALUE || cityGroup?.CITY_NAME || "",
    SEASON_ID: asId(autoSeason?._id || autoSeason?.SEASON_ID),
    SEASON_NAME: getSeasonLabel(autoSeason),
    NIGHTS: "1",
    OVERNIGHT_DATE: cityGroup?.OVERNIGHT_DATE || "",
  };
};

const syncCityGroupStaysFromSelected = (
  cityGroup,
  option,
  hotels = [],
  findMatchingSeasonFn
) => {
  const selectedHotelIds = Array.isArray(cityGroup?.selectedHotelIds)
    ? cityGroup.selectedHotelIds.map(id => String(asId(id) || ""))
    : [];

  const oldStays = Array.isArray(cityGroup?.stays) ? cityGroup.stays : [];

  const nextStays = selectedHotelIds
    .map(hotelId => {
      const existingStay = oldStays.find(
        stay => String(asId(stay?.HOTEL_ID) || "") === hotelId
      );

      if (existingStay) {
        return {
          ...existingStay,
          HOTEL_ID: hotelId,
        };
      }

      const hotel =
        (hotels || []).find(
          h => String(asId(h?._id || h?.HOTEL_ID || h?.id) || "") === hotelId
        ) || null;

      return buildStayFromHotel(hotel, cityGroup, option, findMatchingSeasonFn);
    })
    .filter(Boolean);

  return {
    ...cityGroup,
    selectedHotelIds,
    stays: nextStays,
  };
};

const mapSavedToOptions = (savedOptions = [], overnightCities = []) => {
  const baseCities = asArray(overnightCities);

  return asArray(savedOptions).map((option, optionIndex) => {
    const cityMap = new Map();

    baseCities.forEach(city => {
      const cityId = asId(city.CITY_ID || city.OVERNIGHT_CITY);

      cityMap.set(cityId, {
        localId: `saved-city-group-${optionIndex + 1}-${cityId}`,
        CITY_ID: cityId,
        CITY_NAME: city.CITY_NAME || city.OVERNIGHT_CITY_NAME || "-",
        OVERNIGHT_DATE: city.OVERNIGHT_DATE || "",
        TOTAL_NIGHTS: toNumber(city.TOTAL_NIGHTS),
        selectedHotelIds: [],
        stays: [],
      });
    });

    asArray(option?.CITY_GROUPS || option?.cityGroups).forEach((group, groupIndex) => {
      const cityId = asId(group?.CITY_ID || group?.OVERNIGHT_CITY);

      cityMap.set(cityId, {
        localId: `saved-city-group-${optionIndex + 1}-${groupIndex + 1}-${cityId}`,
        CITY_ID: cityId,
        CITY_NAME: group?.CITY_NAME || group?.OVERNIGHT_CITY_NAME || "-",
        OVERNIGHT_DATE: group?.OVERNIGHT_DATE || "",
        TOTAL_NIGHTS: toNumber(group?.TOTAL_NIGHTS),
        stays: asArray(group?.stays || group?.STAYS).map(stay => ({
          HOTEL_ID: asId(stay?.HOTEL_ID),
          HOTEL_NAME: stay?.HOTEL_NAME || "",
          HOTEL_STARS: String(stay?.HOTEL_STARS || option?.SELECTED_HOTEL_STARS || ""),
          HOTEL_CHAIN: asId(stay?.HOTEL_CHAIN),
          HOTEL_CHAIN_VALUE: stay?.HOTEL_CHAIN_VALUE || "",
          HOTEL_CITY: asId(stay?.HOTEL_CITY || cityId),
          HOTEL_CITY_VALUE: stay?.HOTEL_CITY_VALUE || group?.CITY_NAME || "",
          SEASON_ID: asId(stay?.SEASON_ID),
          SEASON_NAME: stay?.SEASON_NAME || "",
          NIGHTS: String(stay?.NIGHTS ?? ""),
          OVERNIGHT_DATE: stay?.OVERNIGHT_DATE || group?.OVERNIGHT_DATE || "",
        })),
        selectedHotelIds: asArray(group?.stays || group?.STAYS)
          .map(stay => String(asId(stay?.HOTEL_ID) || ""))
          .filter(Boolean),
      });
    });

    asArray(option?.STAYS).forEach(stay => {
      const cityId = asId(stay?.HOTEL_CITY || stay?.CITY_ID || stay?.OVERNIGHT_CITY);
      if (!cityId) return;

      const existing =
        cityMap.get(cityId) || {
          localId: `saved-city-group-${optionIndex + 1}-${cityId}`,
          CITY_ID: cityId,
          CITY_NAME: stay?.HOTEL_CITY_VALUE || "-",
          OVERNIGHT_DATE: stay?.OVERNIGHT_DATE || "",
          TOTAL_NIGHTS: 0,
          selectedHotelIds: [],
          stays: [],
        };

      existing.stays = [
        ...asArray(existing.stays),
        {
          HOTEL_ID: asId(stay?.HOTEL_ID),
          HOTEL_NAME: stay?.HOTEL_NAME || "",
          HOTEL_STARS: String(stay?.HOTEL_STARS || option?.SELECTED_HOTEL_STARS || ""),
          HOTEL_CHAIN: asId(stay?.HOTEL_CHAIN),
          HOTEL_CHAIN_VALUE: stay?.HOTEL_CHAIN_VALUE || "",
          HOTEL_CITY: cityId,
          HOTEL_CITY_VALUE: stay?.HOTEL_CITY_VALUE || existing.CITY_NAME || "",
          SEASON_ID: asId(stay?.SEASON_ID),
          SEASON_NAME: stay?.SEASON_NAME || "",
          NIGHTS: String(stay?.NIGHTS ?? ""),
          OVERNIGHT_DATE: stay?.OVERNIGHT_DATE || existing.OVERNIGHT_DATE || "",
        },
      ];

      existing.selectedHotelIds = asArray(existing.stays)
        .map(item => String(asId(item?.HOTEL_ID) || ""))
        .filter(Boolean);

      cityMap.set(cityId, existing);
    });

    return {
      localId: `saved-option-${optionIndex + 1}-${Math.random().toString(36).slice(2, 8)}`,
      OPTION_NAME: option?.OPTION_NAME || `Option ${optionIndex + 1}`,
      SELECTED_HOTEL_STARS: String(option?.SELECTED_HOTEL_STARS || ""),
      cityGroups: Array.from(cityMap.values()).sort((a, b) => {
        const aDate = toDateOnly(a?.OVERNIGHT_DATE);
        const bDate = toDateOnly(b?.OVERNIGHT_DATE);
        if (!aDate && !bDate) return 0;
        if (!aDate) return 1;
        if (!bDate) return -1;
        return aDate.localeCompare(bDate);
      }),
    };
  });
};

const Accommodation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const hydratedRef = useRef(false);

  const [removeOptionConfirmId, setRemoveOptionConfirmId] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [overnightsLoading, setOvernightsLoading] = useState(false);
  const [overnightsLoaded, setOvernightsLoaded] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hotelPickerOpen, setHotelPickerOpen] = useState(false);
  const [hotelSearchTerm, setHotelSearchTerm] = useState("");
  const [hotelPickerContext, setHotelPickerContext] = useState({
    optionLocalId: "",
    cityId: "",
  });
  const [lookups, setLookups] = useState({
    HOTELSTARS: [],
    CITIES: [],
    HOTELCHAINS: [],
  });

  const [filters, setFilters] = useState({
    HOTEL_STARS: "",
    HOTEL_CITY: "",
    HOTEL_CHAIN: "",
  });

  const [searchResults, setSearchResults] = useState([]);
  const [rawOvernightResponse, setRawOvernightResponse] = useState(null);
  const [searched, setSearched] = useState(false);
  const [overnightCities, setOvernightCities] = useState([]);
  const [options, setOptions] = useState([]);
  const [overnightResponse, setOvernightResponse] = useState(null);

  const quotation = useSelector(state => state.Quotations?.selected || null);
  const quotationLoading = useSelector(state => state.Quotations?.loading);
  const roles = useSelector(state => state.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);
  const readOnly = isQuotationReadOnly(quotation);
  const canEditQuotation = canMutate && !readOnly;

  const accumidationState = useSelector(state => state.QuotationAccumidation || {});
  const savedAccumidation = accumidationState?.selected || null;
  const savedAccumidationLoading = !!accumidationState?.loading;
  const savedAccumidationLoaded = !!accumidationState?.loaded;
  const savedAccumidationSaving = !!accumidationState?.saving;

  const savedForCurrentQuotation = useMemo(() => {
    if (!savedAccumidation) return null;

    const savedQuotationId = getId(savedAccumidation?.QUOTATION_ID);
    if (!savedQuotationId) return null;

    return String(savedQuotationId) === String(id) ? savedAccumidation : null;
  }, [savedAccumidation, id]);

  const arrivingDate = toDateOnly(
    quotation?.ARRAIVING_DATE || rawOvernightResponse?.QUOTATION_START_DATE
  );

  const departureDate = toDateOnly(
    quotation?.DEPARTURE_DATE || rawOvernightResponse?.QUOTATION_END_DATE
  );

  const totalNightsFromDates = diffNights(arrivingDate, departureDate);

  const totalNightsFromOvernights = Array.isArray(rawOvernightResponse?.OVERNIGHTS)
    ? rawOvernightResponse.OVERNIGHTS.reduce(
        (sum, item) => sum + toNumber(item?.TOTAL_NIGHTS),
        0
      )
    : 0;

  const totalNights =
    totalNightsFromDates > 0 ? totalNightsFromDates : totalNightsFromOvernights;

  const overnightTotalNights = useMemo(
    () => (overnightCities || []).reduce((sum, item) => sum + toNumber(item?.TOTAL_NIGHTS), 0),
    [overnightCities]
  );

  const chainNameById = useMemo(() => {
    const map = {};
    (lookups.HOTELCHAINS || []).forEach(item => {
      const itemId = getId(item?._id);
      if (itemId) {
        map[itemId] = item?.ITEM_VALUE || "-";
      }
    });
    return map;
  }, [lookups.HOTELCHAINS]);

  useEffect(() => {
    document.title = "Quotation Accumidation | Skote";
  }, []);

  useEffect(() => {
    if (id) {
      dispatch(fetchQuotation(id));
      dispatch(fetchQuotationAccumidation(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    let ignore = false;

    const loadLookups = async () => {
      setLookupLoading(true);

      try {
        const [stars, cities, chains] = await Promise.all([
          fetchListItems("HOTELSTARS"),
          fetchListItems("CITIES"),
          fetchListItems("HOTELCHAINS"),
        ]);

        if (ignore) return;

        setLookups({
          HOTELSTARS: asArray(stars),
          CITIES: asArray(cities),
          HOTELCHAINS: asArray(chains),
        });
      } catch (error) {
        if (!ignore) {
          notifyError(extractErrorMessage(error, "Failed to load lookup data."));
        }
      } finally {
        if (!ignore) {
          setLookupLoading(false);
        }
      }
    };

    loadLookups();

    return () => {
      ignore = true;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async () => {
      if (!id) return;

      setOvernightsLoading(true);
      setOvernightsLoaded(false);

      try {
        const response = await get(`/quotation-days/quotation/${id}/overnights`);
        if (!mounted) return;

        setRawOvernightResponse(response);

        const rows = normalizeOvernightCities(
          response,
          toDateOnly(response?.QUOTATION_START_DATE) || arrivingDate
        );
        const hotels = normalizeSearchResultsFromOvernights(response, chainNameById);

        setOvernightResponse(response || null);
        setOvernightCities(rows);
        setSearchResults(hotels);
        setSearched(true);
        setOvernightsLoaded(true);
      } catch (error) {
        if (!mounted) return;

        setRawOvernightResponse(null);
        setOvernightResponse(null);
        setOvernightCities([]);
        setSearchResults([]);
        setSearched(true);
        setOvernightsLoaded(true);
        notifyError(extractErrorMessage(error, "Failed to load overnight hotels."));
      } finally {
        if (mounted) {
          setOvernightsLoading(false);
        }
      }
    };

    bootstrap();

    return () => {
      mounted = false;
    };
  }, [id, arrivingDate, chainNameById]);

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!savedAccumidationLoaded) return;
    if (savedAccumidationLoading) return;
    if (!overnightsLoaded) return;

    if (savedForCurrentQuotation?.OPTIONS) {
      setOptions(mapSavedToOptions(savedForCurrentQuotation.OPTIONS, overnightCities));
      hydratedRef.current = true;
      return;
    }

    setOptions([createOption(0, overnightCities)]);
    hydratedRef.current = true;
  }, [
    savedForCurrentQuotation,
    savedAccumidationLoaded,
    savedAccumidationLoading,
    overnightsLoaded,
    overnightCities,
  ]);

  const filteredHotels = useMemo(() => {
    return (searchResults || []).filter(hotel => {
      const hotelStar = String(hotel?.HOTEL_STARS || "");
      const hotelCity = asId(hotel?.HOTEL_CITY);
      const hotelChain = asId(hotel?.HOTEL_CHAIN);

      if (filters.HOTEL_STARS && hotelStar !== String(filters.HOTEL_STARS)) return false;
      if (filters.HOTEL_CITY && hotelCity !== String(filters.HOTEL_CITY)) return false;
      if (filters.HOTEL_CHAIN && hotelChain !== String(filters.HOTEL_CHAIN)) return false;

      return true;
    });
  }, [filters, searchResults]);

  const findMatchingSeason = (hotel, overnightDate) => {
    const date = toDateOnly(overnightDate);
    const seasons = asArray(hotel?.seasons);

    return (
      seasons.find(item =>
        isDateInRange(
          date,
          item?.FROM_DATE || item?.START_DATE || item?.DATE_FROM,
          item?.TO_DATE || item?.END_DATE || item?.DATE_TO
        )
      ) || null
    );
  };

  const handleFilterChange = e => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async (silent = false) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    if (!id) {
      if (!silent) {
        notifyError("Quotation id is missing.");
      }
      return;
    }

    setSearching(true);

    try {
      const response = await get(`/quotation-days/quotation/${id}/overnights`);
      setRawOvernightResponse(response);

      const rows = normalizeOvernightCities(
        response,
        toDateOnly(response?.QUOTATION_START_DATE) || arrivingDate
      );
      const hotels = normalizeSearchResultsFromOvernights(response, chainNameById);

      setOvernightResponse(response || null);
      setOvernightCities(rows);
      setOvernightsLoaded(true);
      setSearchResults(hotels);
      setSearched(true);

      if (!silent) {
        notifySuccess(`Hotels loaded successfully. Found ${hotels.length} hotel(s).`);
      }
    } catch (error) {
      setOvernightResponse(null);
      setSearchResults([]);
      setSearched(true);

      if (!silent) {
        notifyError(extractErrorMessage(error, "Failed to load overnight hotels."));
      }
    } finally {
      setSearching(false);
    }
  };

  const addOption = () => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    if (overnightCities.length === 0) {
      notifyError("No overnight cities were found for this quotation.");
      return;
    }

    setOptions(prev => [...prev, createOption(prev.length, overnightCities)]);
    notifyInfo("New accumidation option added.");
  };

  const removeOption = optionId => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    setOptions(prev => {
      if (prev.length === 1) {
        notifyError("At least one accumidation option is required.");
        return prev;
      }
      return prev.filter(option => option.localId !== optionId);
    });
  };

  const openRemoveOptionConfirm = optionId => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    if (options.length === 1) {
      notifyError("At least one accumidation option is required.");
      return;
    }

    setRemoveOptionConfirmId(optionId);
  };

  const closeRemoveOptionConfirm = () => {
    setRemoveOptionConfirmId("");
  };

  const confirmRemoveOption = () => {
    if (!removeOptionConfirmId) return;

    removeOption(removeOptionConfirmId);
    setRemoveOptionConfirmId("");
  };

  const updateOption = (optionId, updater) => {
    setOptions(prev => prev.map(option => (option.localId === optionId ? updater(option) : option)));
  };

  const handleOptionNameChange = (optionId, value) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    updateOption(optionId, option => ({
      ...option,
      OPTION_NAME: value,
    }));
  };

  const handleOptionStarsChange = (optionId, value) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    updateOption(optionId, option => ({
      ...option,
      SELECTED_HOTEL_STARS: String(value || ""),
      cityGroups: (option.cityGroups || []).map(cityGroup => ({
        ...cityGroup,
        selectedHotelIds: [],
        stays: [],
      })),
    }));
  };

  const openHotelPicker = (optionLocalId, cityId) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    setHotelPickerContext({ optionLocalId, cityId });
    setHotelSearchTerm("");
    setHotelPickerOpen(true);
  };

  const closeHotelPicker = () => {
    setHotelPickerOpen(false);
    setHotelSearchTerm("");
    setHotelPickerContext({ optionLocalId: "", cityId: "" });
  };

  const handleOptionStarsChangeAndOpen = (optionId, value) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    handleOptionStarsChange(optionId, value);

    if (!value) return;

    const targetOption = options.find(item => item.localId === optionId);
    const firstCityGroup = targetOption?.cityGroups?.[0];

    if (firstCityGroup?.CITY_ID) {
      setTimeout(() => {
        openHotelPicker(optionId, firstCityGroup.CITY_ID);
      }, 0);
    }
  };

  const getHotelsForCityAndStars = (cityId, stars) => {
    const cityKey = asId(cityId);
    const starsKey = String(stars || "").trim();

    return (filteredHotels || []).filter(hotel => {
      const hotelCityKey = asId(hotel?.HOTEL_CITY);
      const hotelStarsKey = String(
        hotel?.HOTEL_STARS ??
          hotel?.STARS ??
          hotel?.HOTEL_STAR ??
          hotel?.STAR_RATING ??
          ""
      ).trim();

      if (!cityKey || !starsKey) return false;

      return hotelCityKey === cityKey && hotelStarsKey === starsKey;
    });
  };

  const toggleHotelSelection = (optionId, cityId, hotelId) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    const safeOptionId = String(optionId || "");
    const safeCityId = String(asId(cityId) || "");
    const safeHotelId = String(asId(hotelId) || "");

    setOptions(prev =>
      prev.map(option => {
        if (String(option.localId) !== safeOptionId) return option;

        return {
          ...option,
          cityGroups: (option.cityGroups || []).map(cityGroup => {
            const groupCityId = String(asId(cityGroup?.CITY_ID) || "");
            if (groupCityId !== safeCityId) return cityGroup;

            const selectedHotelIds = Array.isArray(cityGroup?.selectedHotelIds)
              ? cityGroup.selectedHotelIds.map(id => String(asId(id) || ""))
              : [];

            const exists = selectedHotelIds.includes(safeHotelId);

            const nextSelectedHotelIds = exists
              ? selectedHotelIds.filter(id => id !== safeHotelId)
              : [...selectedHotelIds, safeHotelId];

            return syncCityGroupStaysFromSelected(
              {
                ...cityGroup,
                selectedHotelIds: nextSelectedHotelIds,
              },
              option,
              searchResults,
              findMatchingSeason
            );
          }),
        };
      })
    );
  };

  const handleStayChange = (optionId, cityId, stayIndex, field, value) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    updateOption(optionId, option => ({
      ...option,
      cityGroups: (option.cityGroups || []).map(cityGroup => {
        if (String(asId(cityGroup?.CITY_ID) || "") !== String(asId(cityId) || "")) {
          return cityGroup;
        }

        const stays = Array.isArray(cityGroup?.stays) ? cityGroup.stays : [];

        return {
          ...cityGroup,
          stays: stays.map((stay, idx) =>
            idx === stayIndex
              ? {
                  ...stay,
                  [field]: value,
                }
              : stay
          ),
        };
      }),
    }));
  };

  const handleHotelCheckboxToggle = (optionId, cityId, hotelId) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    toggleHotelSelection(optionId, cityId, hotelId);
  };

  const optionValidation = useMemo(() => {
    return options.map(option => {
      const errors = {
        OPTION_NAME: "",
        CITY_GROUPS: "",
        TOTAL_NIGHTS: "",
        cityGroups: [],
      };

      if (!String(option?.OPTION_NAME || "").trim()) {
        errors.OPTION_NAME = "Option name is required.";
      }

      const optionTotalNights = (option.cityGroups || []).reduce((sum, cityGroup) => {
        const cityErrors = {
          STAYS: "",
          TOTAL_NIGHTS: "",
          stays: [],
        };

        const allowedCityNights = toNumber(cityGroup?.TOTAL_NIGHTS);
        const stays = Array.isArray(cityGroup.stays) ? cityGroup.stays : [];

        if (stays.length === 0) {
          cityErrors.STAYS = `Please select at least one hotel for ${cityGroup?.CITY_NAME || "this city"}.`;
        }

        const citySelectedNights = stays.reduce(
          (citySum, stay) => citySum + toNumber(stay?.NIGHTS),
          0
        );

        stays.forEach(stay => {
          const rowError = {};
          if (!asId(stay?.HOTEL_ID)) {
            rowError.HOTEL_ID = "Hotel is required.";
          }
          if (toNumber(stay?.NIGHTS) < 1) {
            rowError.NIGHTS = "Minimum 1 night is required.";
          }
          if (toNumber(stay?.NIGHTS) > allowedCityNights) {
            rowError.NIGHTS = `Cannot exceed ${allowedCityNights} night(s).`;
          }
          cityErrors.stays.push(rowError);
        });

        if (citySelectedNights !== allowedCityNights) {
          cityErrors.TOTAL_NIGHTS =
            `Total nights in ${cityGroup?.CITY_NAME || "this city"} must equal ${allowedCityNights}. ` +
            `Current total is ${citySelectedNights}.`;
        }

        errors.cityGroups.push(cityErrors);
        return sum + citySelectedNights;
      }, 0);

      if (totalNights > 0 && optionTotalNights > totalNights) {
        errors.TOTAL_NIGHTS = `Total selected nights cannot exceed quotation total nights (${totalNights}).`;
      }

      return {
        optionId: option.localId,
        errors,
      };
    });
  }, [options, totalNights]);

  const buildPayload = () => {
    const payloadOptions = options.map((option, index) => {
      const cityGroups = (option.cityGroups || []).map(cityGroup => ({
        CITY_ID: asId(cityGroup?.CITY_ID),
        CITY_NAME: cityGroup?.CITY_NAME || "",
        OVERNIGHT_DATE: cityGroup?.OVERNIGHT_DATE || "",
        TOTAL_NIGHTS: toNumber(cityGroup?.TOTAL_NIGHTS),
        STAYS: (cityGroup.stays || []).map((stay, stayIndex) => ({
          ORDER: stayIndex + 1,
          HOTEL_ID: asId(stay?.HOTEL_ID),
          HOTEL_NAME: stay?.HOTEL_NAME || "",
          HOTEL_STARS: String(stay?.HOTEL_STARS || option?.SELECTED_HOTEL_STARS || ""),
          HOTEL_CHAIN: asId(stay?.HOTEL_CHAIN),
          HOTEL_CHAIN_VALUE: stay?.HOTEL_CHAIN_VALUE || "",
          HOTEL_CITY: asId(stay?.HOTEL_CITY || cityGroup?.CITY_ID),
          HOTEL_CITY_VALUE: stay?.HOTEL_CITY_VALUE || cityGroup?.CITY_NAME || "",
          SEASON_ID: asId(stay?.SEASON_ID),
          SEASON_NAME: stay?.SEASON_NAME || "",
          NIGHTS: toNumber(stay?.NIGHTS),
          OVERNIGHT_DATE: stay?.OVERNIGHT_DATE || cityGroup?.OVERNIGHT_DATE || "",
        })),
      }));

      const optionTotalNights = cityGroups.reduce(
        (sum, group) =>
          sum +
          asArray(group?.STAYS).reduce((staySum, stay) => staySum + toNumber(stay?.NIGHTS), 0),
        0
      );

      return {
        ORDER: index + 1,
        OPTION_NAME: option?.OPTION_NAME || `Option ${index + 1}`,
        SELECTED_HOTEL_STARS: String(option?.SELECTED_HOTEL_STARS || ""),
        TOTAL_NIGHTS: optionTotalNights,
        CITY_GROUPS: cityGroups,
      };
    });

    const sortedOvernightCities = [...overnightCities].sort((a, b) => {
      const aDate = toDateOnly(a?.OVERNIGHT_DATE);
      const bDate = toDateOnly(b?.OVERNIGHT_DATE);

      if (!aDate && !bDate) return 0;
      if (!aDate) return 1;
      if (!bDate) return -1;
      return aDate.localeCompare(bDate);
    });

    const firstOvernightDate = toDateOnly(
      sortedOvernightCities[0]?.OVERNIGHT_DATE || sortedOvernightCities[0]?.CITY_DATE || ""
    );

    const lastOvernightDate = toDateOnly(
      sortedOvernightCities[sortedOvernightCities.length - 1]?.OVERNIGHT_DATE ||
        sortedOvernightCities[sortedOvernightCities.length - 1]?.CITY_DATE ||
        ""
    );

    const lastOvernightNights = toNumber(
      sortedOvernightCities[sortedOvernightCities.length - 1]?.TOTAL_NIGHTS
    );

    const payloadArrivingDate = firstOvernightDate || "";

    const payloadDepartureDate = lastOvernightDate
      ? addDays(lastOvernightDate, Math.max(lastOvernightNights, 1))
      : "";

    const payloadTotalNights =
      totalNights > 0
        ? totalNights
        : (overnightCities || []).reduce(
            (sum, city) => sum + toNumber(city?.TOTAL_NIGHTS),
            0
          );

    return {
      QUOTATION_ID: getId(quotation?._id) || id || "",
      REFERANCE_NUMBER: quotation?.REFERANCE_NUMBER || "",
      ARRAIVING_DATE: payloadArrivingDate,
      DEPARTURE_DATE: payloadDepartureDate,
      TOTAL_NIGHTS: payloadTotalNights,
      OVERNIGHTS: overnightCities.map(city => ({
        OVERNIGHT_CITY: getId(city?.OVERNIGHT_CITY || city?.CITY_ID),
        OVERNIGHT_CITY_NAME: city?.OVERNIGHT_CITY_NAME || city?.CITY_NAME || "",
        OVERNIGHT_DATE: city?.OVERNIGHT_DATE || "",
        TOTAL_NIGHTS: toNumber(city?.TOTAL_NIGHTS),
      })),
      TOTAL_OPTIONS: payloadOptions.length,
      OPTIONS: payloadOptions,
    };
  };

  const handleSave = () => {
    if (!canEditQuotation) {
      notifyError(
        readOnly ? getQuotationReadOnlyMessage(quotation) : "Permission/role mismatch"
      );
      return;
    }

    const firstInvalid = optionValidation.find(item => {
      const errors = item?.errors || {};

      if (errors.OPTION_NAME || errors.CITY_GROUPS || errors.TOTAL_NIGHTS) return true;

      return Array.isArray(errors.cityGroups)
        ? errors.cityGroups.some(groupError => {
            if (groupError?.STAYS || groupError?.TOTAL_NIGHTS) return true;
            return Array.isArray(groupError?.stays)
              ? groupError.stays.some(row => Object.keys(row || {}).length > 0)
              : false;
          })
        : false;
    });

    if (firstInvalid) {
      notifyError("Please fix validation errors before saving.");
      return;
    }

    const payload = buildPayload();
    console.log("Accommodation payload", payload);

    if (savedForCurrentQuotation?._id) {
      dispatch(
        updateQuotationAccumidation(savedForCurrentQuotation._id, payload, response => {
          const nextOptions =
            Array.isArray(response?.OPTIONS) && response.OPTIONS.length > 0
              ? response.OPTIONS
              : payload.OPTIONS;

          setOptions(mapSavedToOptions(nextOptions, overnightCities));
        })
      );
      return;
    }

    dispatch(
      createQuotationAccumidation(payload, response => {
        const nextOptions =
          Array.isArray(response?.OPTIONS) && response.OPTIONS.length > 0
            ? response.OPTIONS
            : payload.OPTIONS;

        setOptions(mapSavedToOptions(nextOptions, overnightCities));
      })
    );
  };

  const activePickerOption = options.find(
    item => item.localId === hotelPickerContext.optionLocalId
  );

  const activePickerCityGroup = activePickerOption?.cityGroups?.find(
    item => String(item.CITY_ID) === String(hotelPickerContext.cityId)
  );

  const activePickerStars = String(activePickerOption?.SELECTED_HOTEL_STARS || "");

  const hotelPickerAvailableHotels = activePickerStars
    ? getHotelsForCityAndStars(activePickerCityGroup?.CITY_ID, activePickerStars)
    : [];

  const hotelPickerFilteredHotels = hotelPickerAvailableHotels.filter(hotel =>
    getHotelLabel(hotel).toLowerCase().includes(hotelSearchTerm.toLowerCase())
  );

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Accumidation" />

          {readOnly ? (
            <Alert color="warning" className="mb-3" fade={false}>
              {getQuotationReadOnlyMessage(quotation)}
            </Alert>
          ) : null}

          {!canMutate ? (
            <Alert color="danger" className="mb-0" fade={false}>
              You do not have permission to manage quotation accumidation.
            </Alert>
          ) : (
            <>
              <Row>
                <Col lg="12">
                  <Card>
                    <CardBody>
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="card-title mb-0">Quotation Summary</h4>

                        <Button
                          color="light"
                          onClick={() => navigate(`/quotations/${id}/plan`)}
                        >
                          Back to Plan
                        </Button>
                      </div>

                      {quotationLoading && !quotation ? (
                        <div className="text-center py-4">
                          <Spinner size="sm" className="me-2" />
                          Loading...
                        </div>
                      ) : (
                        <Row className="g-3">
                          <Col md="4" sm="6">
                            <Label className="form-label text-muted mb-1">Reference Number</Label>
                            <div className="fw-semibold">{quotation?.REFERANCE_NUMBER || "-"}</div>
                          </Col>

                          <Col md="4" sm="6">
                            <Label className="form-label text-muted mb-1">
                              Overnight Total Nights
                            </Label>
                            <div className="fw-semibold">{overnightTotalNights}</div>
                          </Col>

                          <Col md="4" sm="6">
                            <Label className="form-label text-muted mb-1">Saved Record</Label>
                            <div className="fw-semibold">
                              {!savedAccumidationLoaded || savedAccumidationLoading
                                ? "Loading..."
                                : savedForCurrentQuotation?._id
                                ? "Yes"
                                : "No"}
                            </div>
                          </Col>

                          <Col md="12">
                            <Label className="form-label text-muted mb-1">Overnight Cities</Label>

                            {overnightsLoading ? (
                              <div>
                                <Spinner size="sm" className="me-2" />
                                Loading...
                              </div>
                            ) : overnightCities.length === 0 ? (
                              <div className="text-muted">No overnight cities found.</div>
                            ) : (
                              <div className="d-flex flex-wrap gap-2">
                                {overnightCities.map(city => (
                                  <Badge
                                    key={getId(city?.OVERNIGHT_CITY || city?.CITY_ID)}
                                    color="light"
                                    className="text-dark"
                                  >
                                    {city?.OVERNIGHT_CITY_NAME || city?.CITY_NAME || "-"}:{" "}
                                    {toNumber(city?.TOTAL_NIGHTS)} night(s)
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </Col>
                        </Row>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row>
                <Col xs="12">
                  <Card>
                    <CardBody>
                      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-center mb-3">
                        <div>
                          <h4 className="card-title mb-1">Accumidation Options</h4>
                          <p className="card-title-desc mb-0">
                            Each option is split by overnight city. Choose hotel stars first, then choose
                            hotels in that city with the same star rating.
                          </p>
                        </div>

                        <div className="d-flex gap-2">
                          <Button
                            color="primary"
                            onClick={addOption}
                            disabled={readOnly || overnightCities.length === 0}
                          >
                            <i className="bx bx-plus me-1" />
                            Add Option
                          </Button>
                          <Button
                            color="success"
                            onClick={handleSave}
                            disabled={readOnly || savedAccumidationSaving}
                          >
                            {savedAccumidationSaving ? (
                              <>
                                <Spinner size="sm" className="me-2" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <i className="bx bx-save me-1" />
                                Save
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {options.length === 0 ? (
                        <Alert color="warning" className="mb-0" fade={false}>
                          No options yet.
                        </Alert>
                      ) : (
                        <fieldset disabled={readOnly} style={{ minWidth: 0 }}>
                          {options.map((option, optionIndex) => {
                            const optionErrors =
                              optionValidation.find(item => item.optionId === option.localId)?.errors || {};

                            return (
                              <Card key={option.localId} className="border mb-3">
                                <CardBody>
                                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-2 mb-3">
                                    <div className="flex-grow-1">
                                      <Row className="g-3">
                                        <Col md="6">
                                          <Label className="form-label">Option Name</Label>
                                          <Input
                                            value={option?.OPTION_NAME || ""}
                                            onChange={e => handleOptionNameChange(option.localId, e.target.value)}
                                            invalid={!!optionErrors.OPTION_NAME}
                                            disabled={readOnly}
                                          />
                                          <FormFeedback>{optionErrors.OPTION_NAME}</FormFeedback>
                                        </Col>

                                        <Col md="3">
                                          <Label className="form-label">Hotel Stars</Label>
                                          <Input
                                            type="select"
                                            value={String(option?.SELECTED_HOTEL_STARS || "")}
                                            onChange={e =>
                                              handleOptionStarsChangeAndOpen(option.localId, e.target.value)
                                            }
                                            disabled={readOnly}
                                          >
                                            <option value="">Select stars</option>
                                            {(lookups.HOTELSTARS || []).map(item => (
                                              <option
                                                key={getId(item?._id)}
                                                value={String(item?.ITEM_VALUE || "")}
                                              >
                                                {item?.ITEM_VALUE || "-"}
                                              </option>
                                            ))}
                                          </Input>
                                        </Col>

                                        <Col md="3">
                                          <Label className="form-label">Option #</Label>
                                          <div className="form-control bg-light">{optionIndex + 1}</div>
                                        </Col>
                                      </Row>
                                    </div>

                                    <div className="d-flex gap-2">
                                      <Button
                                        color="danger"
                                        outline
                                        onClick={() => openRemoveOptionConfirm(option.localId)}
                                        disabled={readOnly || options.length === 1}
                                      >
                                        <i className="bx bx-trash me-1" />
                                        Remove
                                      </Button>
                                    </div>
                                  </div>

                                  {optionErrors.TOTAL_NIGHTS ? (
                                    <Alert color="danger" className="py-2" fade={false}>
                                      {optionErrors.TOTAL_NIGHTS}
                                    </Alert>
                                  ) : null}

                                  {(option.cityGroups || []).map((cityGroup, cityIndex) => {
                                    const cityErrors = optionErrors.cityGroups?.[cityIndex] || {};
                                    const stars = String(option?.SELECTED_HOTEL_STARS || "");
                                    const availableHotels = stars
                                      ? getHotelsForCityAndStars(cityGroup.CITY_ID, stars)
                                      : [];
                                    const selectedStays = Array.isArray(cityGroup?.stays)
                                      ? cityGroup.stays
                                      : [];

                                    const selectedHotels = selectedStays
                                      .map(stay => {
                                        const stayHotelId = String(asId(stay?.HOTEL_ID) || "");
                                        return availableHotels.find(
                                          hotel =>
                                            String(asId(hotel?._id || hotel?.HOTEL_ID || hotel?.id) || "") ===
                                            stayHotelId
                                        );
                                      })
                                      .filter(Boolean);

                                    return (
                                      <Card key={cityGroup.localId} className="border mb-3">
                                        <CardBody>
                                          <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                                            <div>
                                              <h5 className="mb-1">{cityGroup?.CITY_NAME || "-"}</h5>
                                              <div className="text-muted">
                                                Date: {cityGroup?.OVERNIGHT_DATE || "-"} • Allowed Nights:{" "}
                                                {toNumber(cityGroup?.TOTAL_NIGHTS)}
                                              </div>
                                            </div>

                                            <Badge color="light" className="text-dark">
                                              {stars ? getStarLabel(stars) : "No stars selected"}
                                            </Badge>
                                          </div>

                                          {!stars ? (
                                            <Alert color="warning" className="mb-2 mt-3" fade={false}>
                                              Select Hotel Stars first.
                                            </Alert>
                                          ) : availableHotels.length === 0 ? (
                                            <Alert color="warning" className="mb-2 mt-3" fade={false}>
                                              No hotels found in {cityGroup.CITY_NAME} with {getStarLabel(stars)}.
                                            </Alert>
                                          ) : (
                                            <>
                                              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3 mt-2">
                                                <Button
                                                  color="primary"
                                                  size="sm"
                                                  onClick={() => openHotelPicker(option.localId, cityGroup.CITY_ID)}
                                                  disabled={readOnly}
                                                >
                                                  <i className="bx bx-search-alt me-1" />
                                                  Choose Hotels
                                                </Button>

                                                <Badge color="light" className="text-dark">
                                                  Selected: {selectedStays.length}
                                                </Badge>
                                              </div>

                                              {selectedStays.length === 0 ? (
                                                <Alert color="info" className="mb-0" fade={false}>
                                                  No hotels selected yet.
                                                </Alert>
                                              ) : (
                                                <Row className="g-3 mb-2 mt-1">
                                                  {selectedStays.map((stay, idx) => {
                                                    const hotel = selectedHotels.find(
                                                      item =>
                                                        String(asId(item?._id || item?.HOTEL_ID || item?.id) || "") ===
                                                        String(asId(stay?.HOTEL_ID) || "")
                                                    );

                                                    const hotelId = String(asId(stay?.HOTEL_ID) || "");
                                                    const stayIndex = selectedStays.findIndex(
                                                      s => String(asId(s?.HOTEL_ID) || "") === hotelId
                                                    );

                                                    const autoSeason = hotel
                                                      ? findMatchingSeason(hotel, cityGroup?.OVERNIGHT_DATE)
                                                      : null;

                                                    const rowErrors =
                                                      stayIndex >= 0 ? cityErrors?.stays?.[stayIndex] || {} : {};

                                                    return (
                                                      <Col xl="4" md="6" sm="12" key={hotelId}>
                                                        <Card
                                                          className="h-100 border border-primary"
                                                          style={{
                                                            cursor: "default",
                                                            transition: "all 0.2s ease",
                                                            transform: "translateY(-2px)",
                                                            boxShadow: "0 0.5rem 1rem rgba(0,0,0,.08)",
                                                            backgroundColor: "#f8fbff",
                                                          }}
                                                        >
                                                          <CardBody>
                                                            <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                                              <div>
                                                                <div className="fw-bold fs-6">
                                                                  {idx + 1}. {stay?.HOTEL_NAME || getHotelLabel(hotel)}
                                                                </div>

                                                                <div className="text-muted small mt-1">
                                                                  {stay?.HOTEL_CHAIN_VALUE ||
                                                                    hotel?.HOTEL_CHAIN_VALUE ||
                                                                    hotel?.HOTEL_CHAIN_NAME ||
                                                                    "-"}{" "}
                                                                  • {getStarLabel(stay?.HOTEL_STARS || hotel?.HOTEL_STARS)}
                                                                </div>
                                                              </div>

                                                              <div className="text-end">
                                                                <Badge color="primary" pill>
                                                                  <i className="bx bx-check me-1" />
                                                                  Selected
                                                                </Badge>
                                                              </div>
                                                            </div>

                                                            <div className="mb-3">
                                                              <Label className="form-label mb-1">Season</Label>
                                                              <div className="form-control bg-light">
                                                                {stay?.SEASON_NAME || getSeasonLabel(autoSeason)}
                                                              </div>
                                                            </div>

                                                            <div className="mb-3">
                                                              <Label className="form-label mb-1">Nights</Label>
                                                              <Input
                                                                value={stay?.NIGHTS || ""}
                                                                invalid={!!rowErrors?.NIGHTS}
                                                                onChange={e =>
                                                                  handleStayChange(
                                                                    option.localId,
                                                                    cityGroup.CITY_ID,
                                                                    stayIndex,
                                                                    "NIGHTS",
                                                                    e.target.value
                                                                  )
                                                                }
                                                                disabled={readOnly}
                                                              />
                                                              <FormFeedback>{rowErrors?.NIGHTS}</FormFeedback>
                                                            </div>

                                                            <div className="d-flex justify-content-between align-items-center">
                                                              <small className="text-muted">
                                                                Max city nights: {toNumber(cityGroup?.TOTAL_NIGHTS)}
                                                              </small>

                                                              <Button
                                                                type="button"
                                                                size="sm"
                                                                color="primary"
                                                                onClick={() =>
                                                                  handleHotelCheckboxToggle(
                                                                    option.localId,
                                                                    cityGroup.CITY_ID,
                                                                    hotelId
                                                                  )
                                                                }
                                                                disabled={readOnly}
                                                              >
                                                                <i className="bx bx-check-circle me-1" />
                                                                Selected
                                                              </Button>
                                                            </div>
                                                          </CardBody>
                                                        </Card>
                                                      </Col>
                                                    );
                                                  })}
                                                </Row>
                                              )}
                                            </>
                                          )}

                                          {cityErrors.STAYS ? (
                                            <div className="text-danger mt-2">{cityErrors.STAYS}</div>
                                          ) : null}

                                          {cityErrors.TOTAL_NIGHTS ? (
                                            <div className="text-danger mt-2">{cityErrors.TOTAL_NIGHTS}</div>
                                          ) : null}
                                        </CardBody>
                                      </Card>
                                    );
                                  })}

                                  <Alert color="info" className="mb-0" fade={false}>
                                    Validation rules: each hotel row must have at least 1 night, each hotel row
                                    cannot exceed its city overnight limit, and the total nights inside each city
                                    and option cannot exceed the quotation setup.
                                  </Alert>
                                </CardBody>
                              </Card>
                            );
                          })}
                        </fieldset>
                      )}
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Container>
      </div>

      <Modal isOpen={hotelPickerOpen} toggle={closeHotelPicker} centered size="lg">
        <ModalHeader toggle={closeHotelPicker}>
          Select Hotels - {activePickerCityGroup?.CITY_NAME || "-"} -{" "}
          {getStarLabel(activePickerStars)}
        </ModalHeader>

        <ModalBody>
          <div className="mb-3">
            <Label className="form-label">Search hotel name</Label>
            <Input
              value={hotelSearchTerm}
              onChange={e => {
                if (readOnly) {
                  notifyError(getQuotationReadOnlyMessage(quotation));
                  return;
                }
                setHotelSearchTerm(e.target.value);
              }}
              placeholder="Type hotel name..."
              disabled={readOnly}
            />
          </div>

          {hotelPickerFilteredHotels.length === 0 ? (
            <Alert color="warning" className="mb-0" fade={false}>
              No hotels found.
            </Alert>
          ) : (
            <div className="d-flex flex-column gap-2">
              {hotelPickerFilteredHotels.map(hotel => {
                const hotelId = String(asId(hotel?._id || hotel?.HOTEL_ID || hotel?.id) || "");
                const checked = (activePickerCityGroup?.selectedHotelIds || []).some(
                  id => String(asId(id) || "") === hotelId
                );

                return (
                  <div
                    key={hotelId}
                    className={`border rounded p-3 d-flex justify-content-between align-items-center ${
                      checked ? "border-primary bg-light" : ""
                    }`}
                  >
                    <div>
                      <div className="fw-semibold">{getHotelLabel(hotel)}</div>
                      <div className="text-muted small">
                        {hotel?.HOTEL_CHAIN_VALUE || hotel?.HOTEL_CHAIN_NAME || "-"} •{" "}
                        {getStarLabel(hotel?.HOTEL_STARS)}
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      color={checked ? "primary" : "light"}
                      className={checked ? "" : "border"}
                      onClick={() =>
                        handleHotelCheckboxToggle(
                          hotelPickerContext.optionLocalId,
                          hotelPickerContext.cityId,
                          hotelId
                        )
                      }
                      disabled={readOnly}
                    >
                      <i className={`bx ${checked ? "bx-check-circle" : "bx-plus-circle"} me-1`} />
                      {checked ? "Selected" : "Select"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          <Button color="secondary" onClick={closeHotelPicker}>
            Done
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={!!removeOptionConfirmId} toggle={closeRemoveOptionConfirm} centered>
        <ModalHeader toggle={closeRemoveOptionConfirm}>Confirm Delete</ModalHeader>

        <ModalBody>Are you sure you want to delete this option?</ModalBody>

        <ModalFooter>
          <Button color="secondary" onClick={closeRemoveOptionConfirm}>
            Cancel
          </Button>
          <Button color="danger" onClick={confirmRemoveOption}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default Accommodation;