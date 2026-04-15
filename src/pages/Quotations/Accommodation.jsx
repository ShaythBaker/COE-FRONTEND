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
  Row,
  Spinner,
  Table,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError, notifyInfo, notifySuccess } from "../../helpers/notify";
import { get, post } from "../../helpers/api_helper";
import { fetchListItems } from "../../helpers/list_items_helper";
import { fetchQuotation } from "../../store/Quotations/actions";
import {
  createQuotationAccumidation,
  fetchQuotationAccumidation,
  updateQuotationAccumidation,
} from "../../store/QuotationAccumidation/actions";

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

const diffNights = (start, end) => {
  if (!start || !end) return 0;

  const [startYear, startMonth, startDay] = String(start).split("-").map(Number);
  const [endYear, endMonth, endDay] = String(end).split("-").map(Number);

  const s = new Date(startYear, startMonth - 1, startDay);
  const e = new Date(endYear, endMonth - 1, endDay);

  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
};

const getId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return getId(value._id);
  }
  return "";
};

const toNumber = value => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = value => toNumber(value).toFixed(2);

const formatDateLabel = value => {
  const normalized = toDateOnly(value);
  return normalized || "-";
};

const getHotelLabel = hotel =>
  hotel?.HOTEL_NAME ||
  hotel?.NAME ||
  hotel?.TITLE ||
  hotel?.HOTEL_WEBSITE ||
  "-";

const getStarLabel = value => {
  if (value === null || value === undefined || value === "") return "-";
  return `${value} Star${Number(value) === 1 ? "" : "s"}`;
};

const getSeasonLabel = season => {
  if (!season) return "-";
  const seasonName = season?.SEASON_NAME_VALUE || season?.SEASON_NAME || "Season";
  return `${seasonName} (${formatDateLabel(season?.START_DATE)} → ${formatDateLabel(season?.END_DATE)})`;
};

const createStay = () => ({
  HOTEL_STARS: "",
  HOTEL_ID: "",
  SEASON_ID: "",
  NIGHTS: "",
  BB_RATE_AMOUNT: "",
  HB_RATE_AMOUNT: "",
  FB_RATE_AMOUNT: "",
  SINGLE_SUPPLIMENT_AMOUNT: "",
});

const createCityGroup = overnight => ({
  CITY_ID: getId(overnight?.OVERNIGHT_CITY || overnight?.CITY_ID),
  CITY_NAME: overnight?.OVERNIGHT_CITY_NAME || overnight?.CITY_NAME || "-",
  TOTAL_NIGHTS: toNumber(overnight?.TOTAL_NIGHTS),
  stays: [createStay()],
});

const createOption = (index, overnightCities = []) => ({
  localId: `option-${Date.now()}-${index}`,
  OPTION_NAME: `Option ${index + 1}`,
  cityGroups: overnightCities.map(createCityGroup),
  touched: {},
});

const extractErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

const getStayRates = stay => ({
  BB_RATE_AMOUNT: toNumber(stay?.BB_RATE_AMOUNT),
  HB_RATE_AMOUNT: toNumber(stay?.HB_RATE_AMOUNT),
  FB_RATE_AMOUNT: toNumber(stay?.FB_RATE_AMOUNT),
  SINGLE_SUPPLIMENT_AMOUNT: toNumber(stay?.SINGLE_SUPPLIMENT_AMOUNT),
});

const getOriginalSeasonRates = season => ({
  BB_RATE_AMOUNT: toNumber(season?.BB_RATE_AMOUNT),
  HB_RATE_AMOUNT: toNumber(season?.HB_RATE_AMOUNT),
  FB_RATE_AMOUNT: toNumber(season?.FB_RATE_AMOUNT),
  SINGLE_SUPPLIMENT_AMOUNT: toNumber(season?.SINGLE_SUPPLIMENT_AMOUNT),
});

const hasRateChange = (stay, season) => {
  if (!season) return false;

  const current = getStayRates(stay);
  const original = getOriginalSeasonRates(season);

  return (
    current.BB_RATE_AMOUNT !== original.BB_RATE_AMOUNT ||
    current.HB_RATE_AMOUNT !== original.HB_RATE_AMOUNT ||
    current.FB_RATE_AMOUNT !== original.FB_RATE_AMOUNT ||
    current.SINGLE_SUPPLIMENT_AMOUNT !== original.SINGLE_SUPPLIMENT_AMOUNT
  );
};

const getSeasonTotals = (stay, nightsValue) => {
  const nights = toNumber(nightsValue);
  const rates = getStayRates(stay);

  return {
    BB: rates.BB_RATE_AMOUNT * nights,
    HB: rates.HB_RATE_AMOUNT * nights,
    FB: rates.FB_RATE_AMOUNT * nights,
    SS: rates.SINGLE_SUPPLIMENT_AMOUNT * nights,
  };
};

const normalizeOvernightCities = response => {
  const rows = Array.isArray(response?.OVERNIGHTS)
    ? response.OVERNIGHTS
    : Array.isArray(response)
      ? response
      : [];

  const grouped = new Map();

  rows.forEach(item => {
    const cityId = getId(item?.OVERNIGHT_CITY || item?.CITY_ID);
    if (!cityId) return;

    const prev = grouped.get(cityId);
    grouped.set(cityId, {
      OVERNIGHT_CITY: cityId,
      OVERNIGHT_CITY_NAME:
        item?.OVERNIGHT_CITY_NAME || item?.CITY_NAME || prev?.OVERNIGHT_CITY_NAME || "-",
      TOTAL_NIGHTS: toNumber(prev?.TOTAL_NIGHTS) + toNumber(item?.TOTAL_NIGHTS),
    });
  });

  return Array.from(grouped.values());
};

const mapStayFromSaved = stay => ({
  HOTEL_STARS: String(stay?.HOTEL_STARS ?? ""),
  HOTEL_ID: stay?.HOTEL_ID || "",
  SEASON_ID: stay?.SEASON_ID || "",
  NIGHTS: stay?.NIGHTS === 0 ? "" : String(stay?.NIGHTS ?? ""),
  BB_RATE_AMOUNT: stay?.RATES?.BB_RATE_AMOUNT ?? stay?.BB_RATE_AMOUNT ?? "",
  HB_RATE_AMOUNT: stay?.RATES?.HB_RATE_AMOUNT ?? stay?.HB_RATE_AMOUNT ?? "",
  FB_RATE_AMOUNT: stay?.RATES?.FB_RATE_AMOUNT ?? stay?.FB_RATE_AMOUNT ?? "",
  SINGLE_SUPPLIMENT_AMOUNT:
    stay?.RATES?.SINGLE_SUPPLIMENT_AMOUNT ?? stay?.SINGLE_SUPPLIMENT_AMOUNT ?? "",
});

const mapSavedCityGroups = (option, overnightCities) => {
  const baseGroups = overnightCities.map(overnight => ({
    CITY_ID: getId(overnight?.OVERNIGHT_CITY || overnight?.CITY_ID),
    CITY_NAME: overnight?.OVERNIGHT_CITY_NAME || overnight?.CITY_NAME || "-",
    TOTAL_NIGHTS: toNumber(overnight?.TOTAL_NIGHTS),
    stays: [],
  }));

  const groupsMap = new Map(baseGroups.map(group => [group.CITY_ID, group]));
  const hasGroupedStays = (Array.isArray(option?.CITY_GROUPS) ? option.CITY_GROUPS : []).some(
    cityGroup => Array.isArray(cityGroup?.STAYS) && cityGroup.STAYS.length > 0
  );

  (Array.isArray(option?.CITY_GROUPS) ? option.CITY_GROUPS : []).forEach(cityGroup => {
    const cityId = getId(cityGroup?.CITY_ID || cityGroup?.OVERNIGHT_CITY);
    if (!cityId) return;

    const existing = groupsMap.get(cityId);
    groupsMap.set(cityId, {
      CITY_ID: cityId,
      CITY_NAME:
        cityGroup?.CITY_NAME || cityGroup?.OVERNIGHT_CITY_NAME || existing?.CITY_NAME || "-",
      TOTAL_NIGHTS: toNumber(
        existing?.TOTAL_NIGHTS ||
          cityGroup?.CITY_TOTAL_NIGHTS_LIMIT ||
          cityGroup?.ALLOWED_NIGHTS ||
          cityGroup?.EXPECTED_TOTAL_NIGHTS ||
          cityGroup?.TOTAL_NIGHTS
      ),
      stays:
        Array.isArray(cityGroup?.STAYS) && cityGroup.STAYS.length > 0
          ? cityGroup.STAYS.map(mapStayFromSaved)
          : existing?.stays || [],
    });
  });

  if (!hasGroupedStays) {
    (Array.isArray(option?.STAYS) ? option.STAYS : []).forEach(stay => {
      const cityId = getId(
        stay?.OVERNIGHT_CITY ||
          stay?.OVERNIGHT_CITY_ID ||
          stay?.HOTEL_CITY_ID ||
          stay?.CITY_ID
      );
      if (!cityId) return;

      const existing = groupsMap.get(cityId) || {
        CITY_ID: cityId,
        CITY_NAME:
          stay?.OVERNIGHT_CITY_NAME || stay?.HOTEL_CITY_VALUE || stay?.CITY_NAME || "-",
        TOTAL_NIGHTS: toNumber(stay?.CITY_TOTAL_NIGHTS_LIMIT || stay?.NIGHTS),
        stays: [],
      };

      existing.stays = [...(existing.stays || []), mapStayFromSaved(stay)];
      groupsMap.set(cityId, existing);
    });
  }

  return Array.from(groupsMap.values()).map(group => ({
    ...group,
    TOTAL_NIGHTS: toNumber(group.TOTAL_NIGHTS),
    stays: Array.isArray(group.stays) && group.stays.length > 0 ? group.stays : [createStay()],
  }));
};

const mapSavedToOptions = (savedOptions, overnightCities) => {
  if (!Array.isArray(savedOptions) || savedOptions.length === 0) {
    return [createOption(0, overnightCities)];
  }

  return savedOptions.map((option, optionIndex) => ({
    localId: option?.OPTION_LOCAL_ID || `option-${Date.now()}-${optionIndex}`,
    OPTION_NAME: option?.OPTION_NAME || `Option ${optionIndex + 1}`,
    touched: {},
    cityGroups: mapSavedCityGroups(option, overnightCities),
  }));
};

const Accommodation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const quotation = useSelector(state => state.Quotations?.selected || null);
  const quotationLoading = useSelector(state => state.Quotations?.loading);
  const roles = useSelector(state => state.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const accumidationState = useSelector(state => state.QuotationAccumidation || {});
  const savedAccumidation = accumidationState?.selected || null;
  const savedAccumidationLoading = !!accumidationState?.loading;
  const savedAccumidationLoaded = !!accumidationState?.loaded;
  const savedAccumidationSaving = !!accumidationState?.saving;

  const [lookupLoading, setLookupLoading] = useState(false);
  const [overnightsLoading, setOvernightsLoading] = useState(false);
  const [overnightsLoaded, setOvernightsLoaded] = useState(false);
  const [searching, setSearching] = useState(false);

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
  const [searched, setSearched] = useState(false);
  const [overnightCities, setOvernightCities] = useState([]);
  const [options, setOptions] = useState([]);

  const hydratedRef = useRef(false);
  const autoSearchedRef = useRef(false);

  const savedForCurrentQuotation = useMemo(() => {
    if (!savedAccumidation) return null;

    const savedQuotationId = getId(savedAccumidation?.QUOTATION_ID);
    if (!savedQuotationId) return null;

    return String(savedQuotationId) === String(id) ? savedAccumidation : null;
  }, [savedAccumidation, id]);

  useEffect(() => {
    hydratedRef.current = false;
    autoSearchedRef.current = false;
    setOptions([]);
    setSearchResults([]);
    setSearched(false);
    setOvernightCities([]);
    setOvernightsLoaded(false);

    if (id) {
      dispatch(fetchQuotation(id));
      dispatch(fetchQuotationAccumidation(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    let mounted = true;

    const loadLookups = async () => {
      setLookupLoading(true);
      try {
        const [stars, cities, chains] = await Promise.all([
          fetchListItems("HOTELSTARS"),
          fetchListItems("CITIES"),
          fetchListItems("HOTELCHAINS"),
        ]);

        if (!mounted) return;

        setLookups({
          HOTELSTARS: Array.isArray(stars) ? stars : [],
          CITIES: Array.isArray(cities) ? cities : [],
          HOTELCHAINS: Array.isArray(chains) ? chains : [],
        });
      } catch (error) {
        notifyError(extractErrorMessage(error, "Failed to load hotel filters."));
      } finally {
        if (mounted) {
          setLookupLoading(false);
        }
      }
    };

    loadLookups();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const loadOvernights = async () => {
      if (!id) return;

      setOvernightsLoading(true);
      setOvernightsLoaded(false);

      try {
        const response = await get(`/quotation-days/quotation/${id}/overnights`);
        const rows = normalizeOvernightCities(response);

        if (!mounted) return;

        setOvernightCities(rows);
        setOvernightsLoaded(true);

        if (rows.length === 0) {
          notifyInfo("No overnight cities found for this quotation yet.");
        }
      } catch (error) {
        if (!mounted) return;

        setOvernightCities([]);
        setOvernightsLoaded(true);
        notifyError(extractErrorMessage(error, "Failed to load overnight cities."));
      } finally {
        if (mounted) {
          setOvernightsLoading(false);
        }
      }
    };

    loadOvernights();

    return () => {
      mounted = false;
    };
  }, [id]);

  const arrivingDate = toDateOnly(quotation?.ARRAIVING_DATE);
  const departureDate = toDateOnly(quotation?.DEPARTURE_DATE);
  const totalNights = diffNights(arrivingDate, departureDate);
  const overnightTotalNights = useMemo(
    () => overnightCities.reduce((sum, city) => sum + toNumber(city?.TOTAL_NIGHTS), 0),
    [overnightCities]
  );

  useEffect(() => {
    if (hydratedRef.current) return;
    if (!savedAccumidationLoaded) return;
    if (savedAccumidationLoading) return;
    if (!overnightsLoaded) return;

    if (savedForCurrentQuotation?.OPTIONS) {
      setOptions(mapSavedToOptions(savedForCurrentQuotation.OPTIONS, overnightCities));
      hydratedRef.current = true;
      notifyInfo("Saved accumidation loaded.");
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
      const hotelStar = String(hotel?.HOTEL_STARS ?? "");
      const hotelCity = String(getId(hotel?.HOTEL_CITY) || "");
      const hotelChain = String(getId(hotel?.HOTEL_CHAIN) || "");

      if (filters.HOTEL_STARS && hotelStar !== String(filters.HOTEL_STARS)) return false;
      if (filters.HOTEL_CITY && hotelCity !== String(filters.HOTEL_CITY)) return false;
      if (filters.HOTEL_CHAIN && hotelChain !== String(filters.HOTEL_CHAIN)) return false;

      return true;
    });
  }, [filters, searchResults]);

  const hotelsMap = useMemo(() => {
    const map = new Map();
    (searchResults || []).forEach(hotel => {
      map.set(getId(hotel?._id), hotel);
    });
    return map;
  }, [searchResults]);

  const handleFilterChange = e => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSearch = async (silent = false) => {
    if (!arrivingDate || !departureDate) {
      if (!silent) {
        notifyError("Quotation dates are missing.");
      }
      return;
    }

    setSearching(true);

    try {
      const payload = {
        CHECK_IN_DATE: arrivingDate,
        CHECK_OUT_DATE: departureDate,
      };

      const response = await post("/hotels/search/by-season-dates", payload);
      const rows = Array.isArray(response) ? response : [];

      setSearchResults(rows);
      setSearched(true);

      if (!silent) {
        notifySuccess(`Hotels loaded successfully. Found ${rows.length} hotel(s).`);
      }
    } catch (error) {
      setSearchResults([]);
      setSearched(true);

      if (!silent) {
        notifyError(extractErrorMessage(error, "Failed to search hotels by season dates."));
      }
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    if (autoSearchedRef.current) return;
    if (!quotation?._id) return;
    if (!savedAccumidationLoaded) return;
    if (!savedForCurrentQuotation?._id) return;
    if (!arrivingDate || !departureDate) return;

    autoSearchedRef.current = true;

    const runAutoSearch = async () => {
      setSearching(true);

      try {
        const response = await post("/hotels/search/by-season-dates", {
          CHECK_IN_DATE: arrivingDate,
          CHECK_OUT_DATE: departureDate,
        });

        setSearchResults(Array.isArray(response) ? response : []);
        setSearched(true);
      } catch {
        setSearchResults([]);
        setSearched(true);
      } finally {
        setSearching(false);
      }
    };

    runAutoSearch();
  }, [quotation, savedForCurrentQuotation, savedAccumidationLoaded, arrivingDate, departureDate]);

  const addOption = () => {
    if (overnightCities.length === 0) {
      notifyError("No overnight cities were found for this quotation.");
      return;
    }

    setOptions(prev => [...prev, createOption(prev.length, overnightCities)]);
    notifyInfo("New accumidation option added.");
  };

  const removeOption = optionId => {
    setOptions(prev => {
      if (prev.length === 1) {
        notifyError("At least one accumidation option is required.");
        return prev;
      }
      return prev.filter(option => option.localId !== optionId);
    });
  };

  const updateOption = (optionId, updater) => {
    setOptions(prev => prev.map(option => (option.localId === optionId ? updater(option) : option)));
  };

  const addStay = (optionId, cityId) => {
    updateOption(optionId, option => ({
      ...option,
      cityGroups: (option.cityGroups || []).map(cityGroup =>
        cityGroup.CITY_ID === cityId
          ? {
              ...cityGroup,
              stays: [...(cityGroup.stays || []), createStay()],
            }
          : cityGroup
      ),
    }));
  };

  const removeStay = (optionId, cityId, stayIndex) => {
    updateOption(optionId, option => ({
      ...option,
      cityGroups: (option.cityGroups || []).map(cityGroup => {
        if (cityGroup.CITY_ID !== cityId) return cityGroup;

        if ((cityGroup.stays || []).length === 1) {
          notifyError(`At least one hotel row is required inside ${cityGroup.CITY_NAME}.`);
          return cityGroup;
        }

        return {
          ...cityGroup,
          stays: cityGroup.stays.filter((_, index) => index !== stayIndex),
        };
      }),
    }));
  };

  const handleOptionNameChange = (optionId, value) => {
    updateOption(optionId, option => ({
      ...option,
      OPTION_NAME: value,
    }));
  };

  const handleStayChange = (optionId, cityId, stayIndex, field, value) => {
    updateOption(optionId, option => ({
      ...option,
      cityGroups: (option.cityGroups || []).map(cityGroup => {
        if (cityGroup.CITY_ID !== cityId) return cityGroup;

        return {
          ...cityGroup,
          stays: (cityGroup.stays || []).map((stay, index) => {
            if (index !== stayIndex) return stay;

            if (field === "HOTEL_STARS") {
              return {
                ...stay,
                HOTEL_STARS: value,
                HOTEL_ID: "",
                SEASON_ID: "",
                BB_RATE_AMOUNT: "",
                HB_RATE_AMOUNT: "",
                FB_RATE_AMOUNT: "",
                SINGLE_SUPPLIMENT_AMOUNT: "",
              };
            }

            if (field === "HOTEL_ID") {
              return {
                ...stay,
                HOTEL_ID: value,
                SEASON_ID: "",
                BB_RATE_AMOUNT: "",
                HB_RATE_AMOUNT: "",
                FB_RATE_AMOUNT: "",
                SINGLE_SUPPLIMENT_AMOUNT: "",
              };
            }

            if (field === "SEASON_ID") {
              const selectedHotel = hotelsMap.get(stay.HOTEL_ID) || null;
              const selectedSeason =
                selectedHotel?.seasons?.find(item => getId(item?._id) === String(value)) || null;
              const originalRates = getOriginalSeasonRates(selectedSeason);

              return {
                ...stay,
                SEASON_ID: value,
                BB_RATE_AMOUNT: originalRates.BB_RATE_AMOUNT,
                HB_RATE_AMOUNT: originalRates.HB_RATE_AMOUNT,
                FB_RATE_AMOUNT: originalRates.FB_RATE_AMOUNT,
                SINGLE_SUPPLIMENT_AMOUNT: originalRates.SINGLE_SUPPLIMENT_AMOUNT,
              };
            }

            return {
              ...stay,
              [field]: value,
            };
          }),
        };
      }),
    }));
  };

  const getHotelsForCityAndStars = (cityId, stars) =>
    (searchResults || []).filter(hotel => {
      const hotelCity = String(getId(hotel?.HOTEL_CITY) || "");
      const hotelStars = String(hotel?.HOTEL_STARS ?? "");

      if (!cityId || hotelCity !== String(cityId)) return false;
      if (!stars) return false;

      return hotelStars === String(stars);
    });

  const getCityTotalNights = cityGroup =>
    (cityGroup?.stays || []).reduce((sum, stay) => sum + (Number(stay?.NIGHTS) || 0), 0);

  const getOptionTotalNights = option =>
    (option?.cityGroups || []).reduce((sum, cityGroup) => sum + getCityTotalNights(cityGroup), 0);

  const getOptionStayEntries = option =>
    (option?.cityGroups || []).flatMap((cityGroup, cityIndex) =>
      (cityGroup?.stays || []).map((stay, stayIndex) => ({
        cityGroup,
        cityIndex,
        stay,
        stayIndex,
      }))
    );

  const buildHotelSummaries = stayEntries => {
    const grouped = {};

    stayEntries.forEach(({ cityGroup, stay, stayIndex }) => {
      const hotel = hotelsMap.get(stay.HOTEL_ID);
      const season =
        hotel?.seasons?.find(item => getId(item?._id) === String(stay.SEASON_ID)) || null;
      const nights = toNumber(stay?.NIGHTS);
      const totals = getSeasonTotals(stay, nights);
      const changed = hasRateChange(stay, season);

      if (!hotel) return;

      if (!grouped[stay.HOTEL_ID]) {
        grouped[stay.HOTEL_ID] = {
          HOTEL_ID: stay.HOTEL_ID,
          HOTEL_NAME: getHotelLabel(hotel),
          HOTEL_WEBSITE: hotel?.HOTEL_WEBSITE || "",
          HOTEL_CITY_ID: getId(hotel?.HOTEL_CITY),
          HOTEL_CITY_VALUE: hotel?.HOTEL_CITY_VALUE || cityGroup?.CITY_NAME || "-",
          HOTEL_CHAIN_VALUE: hotel?.HOTEL_CHAIN_VALUE || "-",
          HOTEL_STARS: hotel?.HOTEL_STARS || "",
          HAS_RATE_CHANGES: false,
          nights: 0,
          BB: 0,
          HB: 0,
          FB: 0,
          SS: 0,
          rows: [],
        };
      }

      grouped[stay.HOTEL_ID].HAS_RATE_CHANGES = grouped[stay.HOTEL_ID].HAS_RATE_CHANGES || changed;
      grouped[stay.HOTEL_ID].nights += nights;
      grouped[stay.HOTEL_ID].BB += totals.BB;
      grouped[stay.HOTEL_ID].HB += totals.HB;
      grouped[stay.HOTEL_ID].FB += totals.FB;
      grouped[stay.HOTEL_ID].SS += totals.SS;
      grouped[stay.HOTEL_ID].rows.push({
        index: stayIndex,
        cityId: cityGroup?.CITY_ID || "",
        cityName: cityGroup?.CITY_NAME || "-",
        season,
        nights,
        totals,
        HAS_RATE_CHANGES: changed,
      });
    });

    return Object.values(grouped);
  };

  const getCityHotelSummaries = cityGroup =>
    buildHotelSummaries(
      (cityGroup?.stays || []).map((stay, stayIndex) => ({
        cityGroup,
        stay,
        stayIndex,
      }))
    );

  const getOptionHotelSummaries = option => buildHotelSummaries(getOptionStayEntries(option));

  const getOptionTotals = option => {
    return getOptionHotelSummaries(option).reduce(
      (acc, hotel) => ({
        BB: acc.BB + hotel.BB,
        HB: acc.HB + hotel.HB,
        FB: acc.FB + hotel.FB,
        SS: acc.SS + hotel.SS,
      }),
      { BB: 0, HB: 0, FB: 0, SS: 0 }
    );
  };

  const getOptionErrors = option => {
    const errors = {};

    if (!String(option?.OPTION_NAME || "").trim()) {
      errors.OPTION_NAME = "Option name is required.";
    }

    if (!Array.isArray(option?.cityGroups) || option.cityGroups.length === 0) {
      errors.CITY_GROUPS = "No overnight cities were found for this quotation.";
      return errors;
    }

    const cityGroupErrors = (option?.cityGroups || []).map(cityGroup => {
      const groupErrors = {};

      if (!Array.isArray(cityGroup?.stays) || cityGroup.stays.length === 0) {
        groupErrors.STAYS = `At least one hotel row is required for ${cityGroup?.CITY_NAME || "this city"}.`;
        return groupErrors;
      }

      const stayErrors = cityGroup.stays.map(stay => {
        const rowErrors = {};

        if (!stay?.HOTEL_STARS) {
          rowErrors.HOTEL_STARS = "Hotel stars is required.";
        }

        if (!stay?.HOTEL_ID) {
          rowErrors.HOTEL_ID = "Hotel is required.";
        }

        if (!stay?.SEASON_ID) {
          rowErrors.SEASON_ID = "Season is required.";
        }

        const nightsValue = Number(stay?.NIGHTS);
        const maxCityNights = toNumber(cityGroup?.TOTAL_NIGHTS);

        if (!stay?.NIGHTS) {
          rowErrors.NIGHTS = "Nights are required.";
        } else if (!Number.isInteger(nightsValue) || nightsValue < 1) {
          rowErrors.NIGHTS = "Nights must be at least 1.";
        } else if (nightsValue > maxCityNights) {
          rowErrors.NIGHTS = `Nights cannot be greater than ${maxCityNights} for ${cityGroup?.CITY_NAME || "this city"}.`;
        }

        return rowErrors;
      });

      if (stayErrors.some(row => Object.keys(row).length > 0)) {
        groupErrors.stays = stayErrors;
      }

      const total = getCityTotalNights(cityGroup);
      if (total > toNumber(cityGroup?.TOTAL_NIGHTS)) {
        groupErrors.TOTAL_NIGHTS = `Total nights in ${cityGroup?.CITY_NAME || "this city"} cannot be greater than ${toNumber(
          cityGroup?.TOTAL_NIGHTS
        )}.`;
      }

      return groupErrors;
    });

    if (cityGroupErrors.some(group => Object.keys(group).length > 0)) {
      errors.cityGroups = cityGroupErrors;
    }

    const total = getOptionTotalNights(option);
    if (total > totalNights) {
      errors.TOTAL_NIGHTS = `Total nights cannot be greater than ${totalNights}.`;
    }

    return errors;
  };

  const optionValidation = options.map(option => ({
    optionId: option.localId,
    errors: getOptionErrors(option),
    totalNights: getOptionTotalNights(option),
  }));

  const buildPayload = () => {
    const payloadOptions = options.map(option => {
      const hotelSummaries = getOptionHotelSummaries(option);
      const optionTotals = getOptionTotals(option);

      const cityGroups = (option?.cityGroups || []).map((cityGroup, cityIndex) => {
        const cityHotelSummaries = getCityHotelSummaries(cityGroup);
        const cityTotals = cityHotelSummaries.reduce(
          (acc, hotel) => ({
            BB: acc.BB + hotel.BB,
            HB: acc.HB + hotel.HB,
            FB: acc.FB + hotel.FB,
            SS: acc.SS + hotel.SS,
          }),
          { BB: 0, HB: 0, FB: 0, SS: 0 }
        );

        const stays = (cityGroup?.stays || []).map((stay, stayIndex) => {
          const hotel = hotelsMap.get(stay.HOTEL_ID) || null;
          const season =
            hotel?.seasons?.find(item => getId(item?._id) === String(stay.SEASON_ID)) || null;
          const nights = toNumber(stay?.NIGHTS);
          const totals = getSeasonTotals(stay, nights);
          const currentRates = getStayRates(stay);
          const originalRates = getOriginalSeasonRates(season);
          const changed = hasRateChange(stay, season);

          return {
            ORDER: stayIndex + 1,
            CITY_ORDER: cityIndex + 1,
            OVERNIGHT_CITY: cityGroup?.CITY_ID || "",
            OVERNIGHT_CITY_NAME: cityGroup?.CITY_NAME || "",
            CITY_TOTAL_NIGHTS_LIMIT: toNumber(cityGroup?.TOTAL_NIGHTS),
            HOTEL_STARS: stay?.HOTEL_STARS ?? hotel?.HOTEL_STARS ?? "",
            HOTEL_ID: stay.HOTEL_ID || "",
            HOTEL_NAME: getHotelLabel(hotel),
            HOTEL_WEBSITE: hotel?.HOTEL_WEBSITE || "",
            HOTEL_CITY_ID: getId(hotel?.HOTEL_CITY) || cityGroup?.CITY_ID || "",
            HOTEL_CITY_VALUE: hotel?.HOTEL_CITY_VALUE || cityGroup?.CITY_NAME || "",
            HOTEL_CHAIN_ID: getId(hotel?.HOTEL_CHAIN),
            HOTEL_CHAIN_VALUE: hotel?.HOTEL_CHAIN_VALUE || "",
            SEASON_ID: stay.SEASON_ID || "",
            SEASON_NAME: season?.SEASON_NAME || "",
            SEASON_NAME_VALUE: season?.SEASON_NAME_VALUE || "",
            SEASON_LABEL: getSeasonLabel(season),
            START_DATE: season?.START_DATE || "",
            END_DATE: season?.END_DATE || "",
            NIGHTS: nights,
            HAS_RATE_CHANGES: changed,
            ORIGINAL_RATES: {
              BB_RATE_AMOUNT: originalRates.BB_RATE_AMOUNT,
              HB_RATE_AMOUNT: originalRates.HB_RATE_AMOUNT,
              FB_RATE_AMOUNT: originalRates.FB_RATE_AMOUNT,
              SINGLE_SUPPLIMENT_AMOUNT: originalRates.SINGLE_SUPPLIMENT_AMOUNT,
            },
            RATES: {
              BB_RATE_AMOUNT: currentRates.BB_RATE_AMOUNT,
              HB_RATE_AMOUNT: currentRates.HB_RATE_AMOUNT,
              FB_RATE_AMOUNT: currentRates.FB_RATE_AMOUNT,
              SINGLE_SUPPLIMENT_AMOUNT: currentRates.SINGLE_SUPPLIMENT_AMOUNT,
            },
            TOTALS: {
              BB: totals.BB,
              HB: totals.HB,
              FB: totals.FB,
              SS: totals.SS,
            },
          };
        });

        return {
          CITY_ORDER: cityIndex + 1,
          CITY_ID: cityGroup?.CITY_ID || "",
          CITY_NAME: cityGroup?.CITY_NAME || "",
          CITY_TOTAL_NIGHTS_LIMIT: toNumber(cityGroup?.TOTAL_NIGHTS),
          TOTAL_NIGHTS: getCityTotalNights(cityGroup),
          TOTALS: cityTotals,
          HOTELS: cityHotelSummaries.map(hotelSummary => ({
            HOTEL_ID: hotelSummary.HOTEL_ID,
            HOTEL_NAME: hotelSummary.HOTEL_NAME,
            HOTEL_WEBSITE: hotelSummary.HOTEL_WEBSITE,
            HOTEL_CITY_ID: hotelSummary.HOTEL_CITY_ID,
            HOTEL_CITY_VALUE: hotelSummary.HOTEL_CITY_VALUE,
            HOTEL_CHAIN_VALUE: hotelSummary.HOTEL_CHAIN_VALUE,
            HOTEL_STARS: hotelSummary.HOTEL_STARS,
            HAS_RATE_CHANGES: hotelSummary.HAS_RATE_CHANGES,
            TOTAL_NIGHTS: hotelSummary.nights,
            TOTALS: {
              BB: hotelSummary.BB,
              HB: hotelSummary.HB,
              FB: hotelSummary.FB,
              SS: hotelSummary.SS,
            },
            SEASONS: hotelSummary.rows.map(row => ({
              CITY_ID: row?.cityId || "",
              CITY_NAME: row?.cityName || "",
              SEASON_ID: getId(row?.season?._id),
              SEASON_NAME: row?.season?.SEASON_NAME || "",
              SEASON_NAME_VALUE: row?.season?.SEASON_NAME_VALUE || "",
              START_DATE: row?.season?.START_DATE || "",
              END_DATE: row?.season?.END_DATE || "",
              NIGHTS: row?.nights || 0,
              HAS_RATE_CHANGES: row?.HAS_RATE_CHANGES || false,
              TOTALS: {
                BB: row?.totals?.BB || 0,
                HB: row?.totals?.HB || 0,
                FB: row?.totals?.FB || 0,
                SS: row?.totals?.SS || 0,
              },
            })),
          })),
          STAYS: stays,
        };
      });

      const stays = cityGroups.flatMap(cityGroup => cityGroup.STAYS || []);

      return {
        OPTION_LOCAL_ID: option.localId,
        OPTION_NAME: option.OPTION_NAME || "",
        TOTAL_NIGHTS: getOptionTotalNights(option),
        TOTALS: optionTotals,
        CITY_GROUPS: cityGroups,
        HOTELS: hotelSummaries.map(hotelSummary => ({
          HOTEL_ID: hotelSummary.HOTEL_ID,
          HOTEL_NAME: hotelSummary.HOTEL_NAME,
          HOTEL_WEBSITE: hotelSummary.HOTEL_WEBSITE,
          HOTEL_CITY_ID: hotelSummary.HOTEL_CITY_ID,
          HOTEL_CITY_VALUE: hotelSummary.HOTEL_CITY_VALUE,
          HOTEL_CHAIN_VALUE: hotelSummary.HOTEL_CHAIN_VALUE,
          HOTEL_STARS: hotelSummary.HOTEL_STARS,
          HAS_RATE_CHANGES: hotelSummary.HAS_RATE_CHANGES,
          TOTAL_NIGHTS: hotelSummary.nights,
          TOTALS: {
            BB: hotelSummary.BB,
            HB: hotelSummary.HB,
            FB: hotelSummary.FB,
            SS: hotelSummary.SS,
          },
          SEASONS: hotelSummary.rows.map(row => ({
            CITY_ID: row?.cityId || "",
            CITY_NAME: row?.cityName || "",
            SEASON_ID: getId(row?.season?._id),
            SEASON_NAME: row?.season?.SEASON_NAME || "",
            SEASON_NAME_VALUE: row?.season?.SEASON_NAME_VALUE || "",
            START_DATE: row?.season?.START_DATE || "",
            END_DATE: row?.season?.END_DATE || "",
            NIGHTS: row?.nights || 0,
            HAS_RATE_CHANGES: row?.HAS_RATE_CHANGES || false,
            TOTALS: {
              BB: row?.totals?.BB || 0,
              HB: row?.totals?.HB || 0,
              FB: row?.totals?.FB || 0,
              SS: row?.totals?.SS || 0,
            },
          })),
        })),
        STAYS: stays,
      };
    });

    const grandTotals = payloadOptions.reduce(
      (acc, option) => ({
        BB: acc.BB + toNumber(option?.TOTALS?.BB),
        HB: acc.HB + toNumber(option?.TOTALS?.HB),
        FB: acc.FB + toNumber(option?.TOTALS?.FB),
        SS: acc.SS + toNumber(option?.TOTALS?.SS),
      }),
      { BB: 0, HB: 0, FB: 0, SS: 0 }
    );

    return {
      QUOTATION_ID: getId(quotation?._id) || id || "",
      REFERANCE_NUMBER: quotation?.REFERANCE_NUMBER || "",
      ARRAIVING_DATE: arrivingDate || "",
      DEPARTURE_DATE: departureDate || "",
      TOTAL_NIGHTS: totalNights,
      OVERNIGHTS: overnightCities.map(city => ({
        OVERNIGHT_CITY: getId(city?.OVERNIGHT_CITY),
        OVERNIGHT_CITY_NAME: city?.OVERNIGHT_CITY_NAME || "",
        TOTAL_NIGHTS: toNumber(city?.TOTAL_NIGHTS),
      })),
      TOTAL_OPTIONS: payloadOptions.length,
      GRAND_TOTALS: grandTotals,
      OPTIONS: payloadOptions,
    };
  };

  const handleSave = () => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
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
          if (response?.OPTIONS) {
            setOptions(mapSavedToOptions(response.OPTIONS, overnightCities));
          }
        })
      );
      return;
    }

    dispatch(
      createQuotationAccumidation(payload, response => {
        if (response?.OPTIONS) {
          setOptions(mapSavedToOptions(response.OPTIONS, overnightCities));
        }
      })
    );
  };

  document.title = "Quotation Accumidation | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Accumidation" />

          {!canMutate ? (
            <Alert color="danger" className="mb-0">
              You do not have permission to manage quotation accumidation.
            </Alert>
          ) : (
            <>
              <Row>
                <Col lg="8">
                  <Card>
                    <CardBody>
                      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start mb-3">
                        <div>
                          <h4 className="card-title mb-1">Accumidation</h4>
                          <p className="card-title-desc mb-0">
                            Search hotels inside the quotation season dates, then build one or more
                            accumidation options grouped by overnight city.
                          </p>
                        </div>

                        <div className="d-flex gap-2">
                          <Button color="light" onClick={() => navigate(`/quotations/${id}/plan`)}>
                            Back to Plan
                          </Button>
                          <Button
                            color="primary"
                            onClick={() => handleSearch(false)}
                            disabled={searching || quotationLoading}
                          >
                            {searching ? (
                              <>
                                <Spinner size="sm" className="me-2" />
                                Searching...
                              </>
                            ) : (
                              <>
                                <i className="bx bx-search-alt me-1" />
                                Find Hotels
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <Row>
                        <Col md="4">
                          <div className="mb-3">
                            <Label className="form-label">Hotel Stars</Label>
                            <Input
                              type="select"
                              name="HOTEL_STARS"
                              value={filters.HOTEL_STARS}
                              onChange={handleFilterChange}
                              disabled={lookupLoading}
                            >
                              <option value="">All Stars</option>
                              {(lookups.HOTELSTARS || []).map(item => (
                                <option key={getId(item?._id)} value={String(item?.ITEM_VALUE || "")}>
                                  {item?.ITEM_VALUE || "-"}
                                </option>
                              ))}
                            </Input>
                          </div>
                        </Col>

                        <Col md="4">
                          <div className="mb-3">
                            <Label className="form-label">Hotel City</Label>
                            <Input
                              type="select"
                              name="HOTEL_CITY"
                              value={filters.HOTEL_CITY}
                              onChange={handleFilterChange}
                              disabled={lookupLoading}
                            >
                              <option value="">All Cities</option>
                              {(lookups.CITIES || []).map(item => (
                                <option key={getId(item?._id)} value={getId(item?._id)}>
                                  {item?.ITEM_VALUE || "-"}
                                </option>
                              ))}
                            </Input>
                          </div>
                        </Col>

                        <Col md="4">
                          <div className="mb-3">
                            <Label className="form-label">Hotel Chain</Label>
                            <Input
                              type="select"
                              name="HOTEL_CHAIN"
                              value={filters.HOTEL_CHAIN}
                              onChange={handleFilterChange}
                              disabled={lookupLoading}
                            >
                              <option value="">All Chains</option>
                              {(lookups.HOTELCHAINS || []).map(item => (
                                <option key={getId(item?._id)} value={getId(item?._id)}>
                                  {item?.ITEM_VALUE || "-"}
                                </option>
                              ))}
                            </Input>
                          </div>
                        </Col>
                      </Row>

                      <Alert color="info" className="mb-0">
                        Hotels are not loaded automatically. Click <b>Find Hotels</b> to call all hotels
                        with active seasons depending on the quotation arrival and departure dates.
                      </Alert>
                    </CardBody>
                  </Card>
                </Col>

                <Col lg="4">
                  <Card>
                    <CardBody>
                      <h4 className="card-title mb-3">Quotation Summary</h4>

                      {quotationLoading && !quotation ? (
                        <div className="text-center py-4">
                          <Spinner size="sm" className="me-2" />
                          Loading...
                        </div>
                      ) : (
                        <>
                          <div className="mb-3">
                            <Label className="form-label text-muted mb-1">Reference Number</Label>
                            <div className="fw-semibold">{quotation?.REFERANCE_NUMBER || "-"}</div>
                          </div>

                          <div className="mb-3">
                            <Label className="form-label text-muted mb-1">Arriving Date</Label>
                            <div>{arrivingDate || "-"}</div>
                          </div>

                          <div className="mb-3">
                            <Label className="form-label text-muted mb-1">Departure Date</Label>
                            <div>{departureDate || "-"}</div>
                          </div>

                          <div className="mb-3">
                            <Label className="form-label text-muted mb-1">Quotation Total Nights</Label>
                            <div className="fw-semibold">{totalNights}</div>
                          </div>

                          <div className="mb-3">
                            <Label className="form-label text-muted mb-1">Overnight Total Nights</Label>
                            <div className="fw-semibold">{overnightTotalNights}</div>
                          </div>

                          <div className="mb-3">
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
                                  <Badge key={getId(city?.OVERNIGHT_CITY)} color="light" className="text-dark">
                                    {city?.OVERNIGHT_CITY_NAME || "-"}: {toNumber(city?.TOTAL_NIGHTS)} night(s)
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="mb-0">
                            <Label className="form-label text-muted mb-1">Saved Record</Label>
                            <div className="fw-semibold">
                              {!savedAccumidationLoaded || savedAccumidationLoading
                                ? "Loading..."
                                : savedForCurrentQuotation?._id
                                  ? "Yes"
                                  : "No"}
                            </div>
                          </div>
                        </>
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
                          <h4 className="card-title mb-1">Available Hotels</h4>
                          <p className="card-title-desc mb-0">
                            Results are filtered by stars, city, and chain after the season-date API
                            returns hotels.
                          </p>
                        </div>

                        {searched ? (
                          <div className="text-muted">
                            Showing <b>{filteredHotels.length}</b> of <b>{searchResults.length}</b> hotel(s)
                          </div>
                        ) : null}
                      </div>

                      {!searched ? (
                        <div className="text-muted">Run the hotel search first.</div>
                      ) : filteredHotels.length === 0 ? (
                        <Alert color="warning" className="mb-0">
                          No hotels matched the selected filters.
                        </Alert>
                      ) : (
                        <div className="table-responsive">
                          <Table className="table align-middle table-nowrap mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Hotel</th>
                                <th>City</th>
                                <th>Chain</th>
                                <th>Stars</th>
                                <th>Seasons Found</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredHotels.map(hotel => (
                                <tr key={getId(hotel?._id)}>
                                  <td className="fw-semibold">{getHotelLabel(hotel)}</td>
                                  <td>{hotel?.HOTEL_CITY_VALUE || "-"}</td>
                                  <td>{hotel?.HOTEL_CHAIN_VALUE || "-"}</td>
                                  <td>{getStarLabel(hotel?.HOTEL_STARS)}</td>
                                  <td>{Array.isArray(hotel?.seasons) ? hotel.seasons.length : 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
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
                          <Button color="primary" onClick={addOption} disabled={overnightCities.length === 0}>
                            <i className="bx bx-plus me-1" />
                            Add Option
                          </Button>
                          <Button color="success" onClick={handleSave} disabled={savedAccumidationSaving}>
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

                      {overnightCities.length === 0 && overnightsLoaded ? (
                        <Alert color="warning">
                          No overnight cities were returned from the quotation days API, so options cannot
                          be split by city yet.
                        </Alert>
                      ) : null}

                      {options.map(option => {
                        const validationEntry =
                          optionValidation.find(item => item.optionId === option.localId) || {};
                        const errors = validationEntry.errors || {};
                        const optionTotalNights = validationEntry.totalNights || 0;
                        const hotelSummaries = getOptionHotelSummaries(option);
                        const optionTotals = getOptionTotals(option);

                        return (
                          <Card key={option.localId} className="border mb-3">
                            <CardBody>
                              <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start mb-3">
                                <div className="flex-grow-1">
                                  <Label className="form-label">Option Name</Label>
                                  <Input
                                    value={option.OPTION_NAME}
                                    onChange={e =>
                                      handleOptionNameChange(option.localId, e.target.value)
                                    }
                                    invalid={!!errors.OPTION_NAME}
                                  />
                                  <FormFeedback>{errors.OPTION_NAME}</FormFeedback>
                                </div>

                                <div className="text-end ms-2">
                                  <div className="text-muted small mb-1">Option Total Nights</div>
                                  <div className={`fw-semibold ${optionTotalNights > totalNights ? "text-danger" : ""}`}>
                                    {optionTotalNights} / {totalNights}
                                  </div>

                                  <Button
                                    color="danger"
                                    outline
                                    size="sm"
                                    className="mt-2"
                                    onClick={() => removeOption(option.localId)}
                                  >
                                    Remove Option
                                  </Button>
                                </div>
                              </div>

                              {errors.CITY_GROUPS ? (
                                <Alert color="danger" className="py-2">
                                  {errors.CITY_GROUPS}
                                </Alert>
                              ) : null}

                              {errors.TOTAL_NIGHTS ? (
                                <Alert color="danger" className="py-2">
                                  {errors.TOTAL_NIGHTS}
                                </Alert>
                              ) : null}

                              {(option.cityGroups || []).map((cityGroup, cityIndex) => {
                                const cityErrors = errors.cityGroups?.[cityIndex] || {};
                                const cityTotalNights = getCityTotalNights(cityGroup);
                                const cityHotelSummaries = getCityHotelSummaries(cityGroup);

                                return (
                                  <Card key={`${option.localId}-${cityGroup.CITY_ID}`} className="border shadow-none mb-4">
                                    <CardBody>
                                      <div className="d-flex flex-wrap gap-2 justify-content-between align-items-start mb-3">
                                        <div>
                                          <h5 className="mb-1">{cityGroup.CITY_NAME || "-"}</h5>
                                          <div className="text-muted small">
                                            Select hotel stars first, then hotels available in this city.
                                          </div>
                                        </div>

                                        <div className="text-end">
                                          <Badge color={cityTotalNights > toNumber(cityGroup.TOTAL_NIGHTS) ? "danger" : "info"}>
                                            {cityTotalNights} / {toNumber(cityGroup.TOTAL_NIGHTS)} night(s)
                                          </Badge>
                                        </div>
                                      </div>

                                      {cityErrors.STAYS ? (
                                        <Alert color="danger" className="py-2">
                                          {cityErrors.STAYS}
                                        </Alert>
                                      ) : null}

                                      {cityErrors.TOTAL_NIGHTS ? (
                                        <Alert color="danger" className="py-2">
                                          {cityErrors.TOTAL_NIGHTS}
                                        </Alert>
                                      ) : null}

                                      <div className="table-responsive mb-4">
                                        <Table className="table align-middle table-nowrap mb-0">
                                          <thead className="table-light">
                                            <tr>
                                              <th style={{ width: 60 }}>#</th>
                                              <th style={{ width: 160 }}>Hotel Stars</th>
                                              <th>Hotel</th>
                                              <th>Season</th>
                                              <th style={{ width: 120 }}>Nights</th>
                                              <th style={{ width: 120 }}>BB Rate</th>
                                              <th style={{ width: 120 }}>HB Rate</th>
                                              <th style={{ width: 120 }}>FB Rate</th>
                                              <th style={{ width: 120 }}>SS Rate</th>
                                              <th style={{ width: 110 }}>Action</th>
                                            </tr>
                                          </thead>
                                          <tbody>
                                            {(cityGroup.stays || []).map((stay, stayIndex) => {
                                              const rowErrors = cityErrors.stays?.[stayIndex] || {};
                                              const availableHotels = getHotelsForCityAndStars(
                                                cityGroup.CITY_ID,
                                                stay.HOTEL_STARS
                                              );
                                              const selectedHotel = hotelsMap.get(stay.HOTEL_ID) || null;
                                              const seasons = Array.isArray(selectedHotel?.seasons)
                                                ? selectedHotel.seasons
                                                : [];
                                              const selectedSeason =
                                                seasons.find(
                                                  item => getId(item?._id) === String(stay.SEASON_ID)
                                                ) || null;

                                              return (
                                                <tr key={`${option.localId}-${cityGroup.CITY_ID}-${stayIndex}`}>
                                                  <td>{stayIndex + 1}</td>

                                                  <td>
                                                    <Input
                                                      type="select"
                                                      value={stay.HOTEL_STARS}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "HOTEL_STARS",
                                                          e.target.value
                                                        )
                                                      }
                                                      invalid={!!rowErrors.HOTEL_STARS}
                                                    >
                                                      <option value="">Select Stars</option>
                                                      {(lookups.HOTELSTARS || []).map(item => (
                                                        <option
                                                          key={getId(item?._id)}
                                                          value={String(item?.ITEM_VALUE || "")}
                                                        >
                                                          {item?.ITEM_VALUE || "-"}
                                                        </option>
                                                      ))}
                                                    </Input>
                                                    <FormFeedback>{rowErrors.HOTEL_STARS}</FormFeedback>
                                                  </td>

                                                  <td>
                                                    <Input
                                                      type="select"
                                                      value={stay.HOTEL_ID}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "HOTEL_ID",
                                                          e.target.value
                                                        )
                                                      }
                                                      invalid={!!rowErrors.HOTEL_ID}
                                                      disabled={!stay.HOTEL_STARS}
                                                    >
                                                      <option value="">
                                                        {stay.HOTEL_STARS ? "Select Hotel" : "Select Stars First"}
                                                      </option>
                                                      {availableHotels.map(hotel => (
                                                        <option key={getId(hotel?._id)} value={getId(hotel?._id)}>
                                                          {`${getHotelLabel(hotel)} - ${hotel?.HOTEL_CHAIN_VALUE || "-"} - ${getStarLabel(hotel?.HOTEL_STARS)}`}
                                                        </option>
                                                      ))}
                                                    </Input>
                                                    <FormFeedback>{rowErrors.HOTEL_ID}</FormFeedback>

                                                    {stay.HOTEL_STARS && availableHotels.length === 0 ? (
                                                      <div className="text-muted small mt-2">
                                                        No hotels found in {cityGroup.CITY_NAME} with{" "}
                                                        {getStarLabel(stay.HOTEL_STARS)}.
                                                      </div>
                                                    ) : null}
                                                  </td>

                                                  <td>
                                                    <Input
                                                      type="select"
                                                      value={stay.SEASON_ID}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "SEASON_ID",
                                                          e.target.value
                                                        )
                                                      }
                                                      invalid={!!rowErrors.SEASON_ID}
                                                      disabled={!stay.HOTEL_ID}
                                                    >
                                                      <option value="">Select Season</option>
                                                      {seasons.map(season => (
                                                        <option key={getId(season?._id)} value={getId(season?._id)}>
                                                          {getSeasonLabel(season)}
                                                        </option>
                                                      ))}
                                                    </Input>
                                                    <FormFeedback>{rowErrors.SEASON_ID}</FormFeedback>

                                                    {selectedSeason ? (
                                                      <div className="mt-2">
                                                        <div className="d-flex flex-wrap gap-1">
                                                          <Badge color="light" className="text-dark">
                                                            Original BB: {money(selectedSeason?.BB_RATE_AMOUNT)}
                                                          </Badge>
                                                          <Badge color="light" className="text-dark">
                                                            Original HB: {money(selectedSeason?.HB_RATE_AMOUNT)}
                                                          </Badge>
                                                          <Badge color="light" className="text-dark">
                                                            Original FB: {money(selectedSeason?.FB_RATE_AMOUNT)}
                                                          </Badge>
                                                          <Badge color="light" className="text-dark">
                                                            Original SS: {money(selectedSeason?.SINGLE_SUPPLIMENT_AMOUNT)}
                                                          </Badge>
                                                        </div>
                                                      </div>
                                                    ) : null}
                                                  </td>

                                                  <td>
                                                    <Input
                                                      type="number"
                                                      min="1"
                                                      max={toNumber(cityGroup.TOTAL_NIGHTS)}
                                                      step="1"
                                                      value={stay.NIGHTS}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "NIGHTS",
                                                          e.target.value
                                                        )
                                                      }
                                                      invalid={!!rowErrors.NIGHTS}
                                                      disabled={!stay.SEASON_ID}
                                                    />
                                                    <FormFeedback>{rowErrors.NIGHTS}</FormFeedback>
                                                  </td>

                                                  <td>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      step="0.01"
                                                      value={stay.BB_RATE_AMOUNT}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "BB_RATE_AMOUNT",
                                                          e.target.value
                                                        )
                                                      }
                                                      disabled={!stay.SEASON_ID}
                                                    />
                                                  </td>
                                                  <td>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      step="0.01"
                                                      value={stay.HB_RATE_AMOUNT}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "HB_RATE_AMOUNT",
                                                          e.target.value
                                                        )
                                                      }
                                                      disabled={!stay.SEASON_ID}
                                                    />
                                                  </td>
                                                  <td>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      step="0.01"
                                                      value={stay.FB_RATE_AMOUNT}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "FB_RATE_AMOUNT",
                                                          e.target.value
                                                        )
                                                      }
                                                      disabled={!stay.SEASON_ID}
                                                    />
                                                  </td>
                                                  <td>
                                                    <Input
                                                      type="number"
                                                      min="0"
                                                      step="0.01"
                                                      value={stay.SINGLE_SUPPLIMENT_AMOUNT}
                                                      onChange={e =>
                                                        handleStayChange(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex,
                                                          "SINGLE_SUPPLIMENT_AMOUNT",
                                                          e.target.value
                                                        )
                                                      }
                                                      disabled={!stay.SEASON_ID}
                                                    />
                                                  </td>

                                                  <td>
                                                    <Button
                                                      color="danger"
                                                      outline
                                                      size="sm"
                                                      onClick={() =>
                                                        removeStay(
                                                          option.localId,
                                                          cityGroup.CITY_ID,
                                                          stayIndex
                                                        )
                                                      }
                                                    >
                                                      Remove
                                                    </Button>
                                                  </td>
                                                </tr>
                                              );
                                            })}
                                          </tbody>
                                        </Table>
                                      </div>

                                      <Button
                                        color="light"
                                        className="mb-4"
                                        onClick={() => addStay(option.localId, cityGroup.CITY_ID)}
                                      >
                                        <i className="bx bx-plus me-1" />
                                        Add Hotel in {cityGroup.CITY_NAME}
                                      </Button>

                                      <h6 className="mb-3">City Hotel Totals</h6>

                                      {cityHotelSummaries.length === 0 ? (
                                        <Alert color="light" className="mb-0">
                                          No hotel totals yet for {cityGroup.CITY_NAME}.
                                        </Alert>
                                      ) : (
                                        <div className="table-responsive">
                                          <Table className="table align-middle table-nowrap mb-0">
                                            <thead className="table-light">
                                              <tr>
                                                <th>Hotel</th>
                                                <th>Details</th>
                                                <th style={{ width: 100 }}>Nights</th>
                                                <th style={{ width: 120 }}>Total BB</th>
                                                <th style={{ width: 120 }}>Total HB</th>
                                                <th style={{ width: 120 }}>Total FB</th>
                                                <th style={{ width: 120 }}>Total SS</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {cityHotelSummaries.map(hotelSummary => (
                                                <tr key={`${cityGroup.CITY_ID}-${hotelSummary.HOTEL_ID}`}>
                                                  <td>
                                                    <div className="fw-semibold d-flex align-items-center gap-2">
                                                      <span>{hotelSummary.HOTEL_NAME}</span>
                                                      {hotelSummary.HAS_RATE_CHANGES ? (
                                                        <Badge color="warning" className="text-dark">
                                                          Rates Changed
                                                        </Badge>
                                                      ) : null}
                                                    </div>
                                                    <div className="text-muted small">
                                                      {hotelSummary.HOTEL_CITY_VALUE} - {hotelSummary.HOTEL_CHAIN_VALUE} -{" "}
                                                      {getStarLabel(hotelSummary.HOTEL_STARS)}
                                                    </div>
                                                  </td>
                                                  <td>
                                                    <div className="d-flex flex-column gap-1">
                                                      {hotelSummary.rows.map((row, index) => (
                                                        <span
                                                          key={`${hotelSummary.HOTEL_ID}-${cityGroup.CITY_ID}-${index}`}
                                                          className="text-muted small"
                                                        >
                                                          {getSeasonLabel(row.season)} - {row.nights} night(s)
                                                          {row.HAS_RATE_CHANGES ? " - rates changed" : ""}
                                                        </span>
                                                      ))}
                                                    </div>
                                                  </td>
                                                  <td>{hotelSummary.nights}</td>
                                                  <td className="fw-semibold">{money(hotelSummary.BB)}</td>
                                                  <td className="fw-semibold">{money(hotelSummary.HB)}</td>
                                                  <td className="fw-semibold">{money(hotelSummary.FB)}</td>
                                                  <td className="fw-semibold">{money(hotelSummary.SS)}</td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </Table>
                                        </div>
                                      )}
                                    </CardBody>
                                  </Card>
                                );
                              })}

                              <h5 className="mb-3">Option Hotel Totals</h5>

                              {hotelSummaries.length === 0 ? (
                                <Alert color="light" className="mb-4">
                                  No hotel totals yet. Add hotel seasons and nights first.
                                </Alert>
                              ) : (
                                <div className="table-responsive mb-4">
                                  <Table className="table align-middle table-nowrap">
                                    <thead className="table-light">
                                      <tr>
                                        <th>Hotel</th>
                                        <th>Details</th>
                                        <th style={{ width: 100 }}>Nights</th>
                                        <th style={{ width: 120 }}>Total BB</th>
                                        <th style={{ width: 120 }}>Total HB</th>
                                        <th style={{ width: 120 }}>Total FB</th>
                                        <th style={{ width: 120 }}>Total SS</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {hotelSummaries.map(hotelSummary => (
                                        <tr key={hotelSummary.HOTEL_ID}>
                                          <td>
                                            <div className="fw-semibold d-flex align-items-center gap-2">
                                              <span>{hotelSummary.HOTEL_NAME}</span>
                                              {hotelSummary.HAS_RATE_CHANGES ? (
                                                <Badge color="warning" className="text-dark">
                                                  Rates Changed
                                                </Badge>
                                              ) : null}
                                            </div>
                                            <div className="text-muted small">
                                              {hotelSummary.HOTEL_CITY_VALUE} - {hotelSummary.HOTEL_CHAIN_VALUE} -{" "}
                                              {getStarLabel(hotelSummary.HOTEL_STARS)}
                                            </div>
                                          </td>
                                          <td>
                                            <div className="d-flex flex-column gap-1">
                                              {hotelSummary.rows.map((row, index) => (
                                                <span
                                                  key={`${hotelSummary.HOTEL_ID}-${index}`}
                                                  className="text-muted small"
                                                >
                                                  {row.cityName} - {getSeasonLabel(row.season)} - {row.nights} night(s)
                                                  {row.HAS_RATE_CHANGES ? " - rates changed" : ""}
                                                </span>
                                              ))}
                                            </div>
                                          </td>
                                          <td>{hotelSummary.nights}</td>
                                          <td className="fw-semibold">{money(hotelSummary.BB)}</td>
                                          <td className="fw-semibold">{money(hotelSummary.HB)}</td>
                                          <td className="fw-semibold">{money(hotelSummary.FB)}</td>
                                          <td className="fw-semibold">{money(hotelSummary.SS)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </div>
                              )}

                              <Row className="g-3">
                                <Col md="3" sm="6">
                                  <Card className="border shadow-none h-100 mb-0">
                                    <CardBody>
                                      <div className="text-muted small mb-1">Option Total BB</div>
                                      <div className="h5 mb-0">{money(optionTotals.BB)}</div>
                                    </CardBody>
                                  </Card>
                                </Col>
                                <Col md="3" sm="6">
                                  <Card className="border shadow-none h-100 mb-0">
                                    <CardBody>
                                      <div className="text-muted small mb-1">Option Total HB</div>
                                      <div className="h5 mb-0">{money(optionTotals.HB)}</div>
                                    </CardBody>
                                  </Card>
                                </Col>
                                <Col md="3" sm="6">
                                  <Card className="border shadow-none h-100 mb-0">
                                    <CardBody>
                                      <div className="text-muted small mb-1">Option Total FB</div>
                                      <div className="h5 mb-0">{money(optionTotals.FB)}</div>
                                    </CardBody>
                                  </Card>
                                </Col>
                                <Col md="3" sm="6">
                                  <Card className="border shadow-none h-100 mb-0">
                                    <CardBody>
                                      <div className="text-muted small mb-1">Option Total SS</div>
                                      <div className="h5 mb-0">{money(optionTotals.SS)}</div>
                                    </CardBody>
                                  </Card>
                                </Col>
                              </Row>
                            </CardBody>
                          </Card>
                        );
                      })}

                      <Alert color="info" className="mb-0">
                        Validation rules: each hotel row must have at least 1 night, each hotel row cannot
                        exceed its city overnight limit, and the total nights inside each city and option
                        cannot exceed the quotation setup.
                      </Alert>
                    </CardBody>
                  </Card>
                </Col>
              </Row>
            </>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default Accommodation;
