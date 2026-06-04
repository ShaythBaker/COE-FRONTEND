/* eslint-disable react/prop-types */
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { get, patch } from "../../helpers/api_helper";
import { decodeJwt } from "../../helpers/coe_jwt";
import { getAccessToken } from "../../helpers/coe_token_storage";
import {
  ATTACHMENT_TYPES,
  extractAttachmentErrorMessage,
  getAttachmentDownloadUrl,
  openAttachment,
  uploadAttachment,
} from "../../helpers/attachments_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import {
  RESERVATION_STATUS_OPTIONS,
  buildGuideLanguageOptions,
  buildGuideNameOptions,
  buildHotelNameOptions,
  buildRouteOptions,
  buildVehicleSizeOptions,
  getFirstGuideLanguage,
  withCurrentOption,
} from "../../helpers/reservation_options";
import { RESERVATION_FILE_BY_ID, USER_BY_ID } from "../../helpers/url_helper";
import { fetchGuideLanguages, fetchGuides } from "../../store/Guides/actions";
import { fetchReservationFile } from "../../store/ReservationFiles/actions";
import {
  fetchTransportationCompanies,
  fetchTransportationLookups,
} from "../../store/TransportationCompanies/actions";

const RESERVATION_SECTIONS = [
  "RES Details",
  "General",
  "Arr/Dep",
  "Hotels",
  "Transportation",
  "Guides",
  "Entrance",
  "Restaurants",
  "Extras",
  "Inclusions",
  "Clients",
  "Attach",
  "Reminder",
  "Log",
];

const asArray = value => (Array.isArray(value) ? value : []);

const getId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return getId(value._id);
  if (value?.$oid) return value.$oid;
  return String(value || "");
};

const text = value => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const toDateInput = value => {
  if (!value) return "";
  const str = String(value);
  const direct = str.match(/^(\d{4}-\d{2}-\d{2})/);
  if (direct) return direct[1];

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (dateValue, daysToAdd) => {
  const dateStr = toDateInput(dateValue);
  if (!dateStr) return "";

  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + toNumber(daysToAdd));

  const nextYear = d.getFullYear();
  const nextMonth = String(d.getMonth() + 1).padStart(2, "0");
  const nextDay = String(d.getDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const dateToUtcMs = value => {
  const dateStr = toDateInput(value);
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split("-").map(Number);
  return Date.UTC(year, month - 1, day);
};

const diffDaysInclusive = (startValue, endValue) => {
  const startMs = dateToUtcMs(startValue);
  const endMs = dateToUtcMs(endValue);
  if (startMs === null || endMs === null) return null;
  return Math.floor((endMs - startMs) / 86400000) + 1;
};

const formatDateLabel = value => {
  const dateStr = toDateInput(value);
  if (!dateStr) return "-";

  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(year, month - 1, day);

  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTimeLabel = value => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const dayName = value => {
  const dateStr = toDateInput(value);
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-GB", {
    weekday: "long",
  });
};

const getQuotationPax = quotation =>
  toNumber(
    quotation?.NUMBER_OF_PAX ??
      quotation?.PAX ??
      quotation?.NO_OF_PAX ??
      quotation?.TOTAL_PAX
  );

const normalizeDay = day => {
  const basic = day?.basic || day || {};
  const route = day?.route || {};
  const transportation = day?.transportation || {};
  const mealsNode = day?.meals || {};
  const entranceNode = day?.entranceFees || {};

  return {
    _id: getId(day?._id || basic?._id),
    dayOrder: basic?.DAY_ORDER ?? day?.DAY_ORDER ?? null,
    dayDate: basic?.DAY_DATE || day?.DAY_DATE || "",
    routeText: route?.text || basic?.ROUTE_TEXT || day?.ROUTE_TEXT || "",
    routeCities: asArray(route?.cities),
    transportationRows: asArray(
      transportation?.TRANSPORTATION_RESOLVED || day?.TRANSPORTATION_RESOLVED
    ),
    guide: day?.guide || {},
    mealsRows: asArray(mealsNode?.rows || day?.MEALS),
    entranceRows: asArray(
      entranceNode?.selectedPlaces || day?.NTRANCE_FEES || day?.PLACES
    ),
    overnight: day?.overnight || {},
  };
};

const getAccommodationEntries = file => {
  const entries = asArray(file?.QUOTATION_ACCUMIDATIONS);
  if (entries.length) return entries;
  return file?.QUOTATION_ACCUMIDATION ? [file.QUOTATION_ACCUMIDATION] : [];
};

const getBoardBasis = entry =>
  entry?.BOARD_BASIS ||
  entry?.PAYLOAD_SNAPSHOT?.BOARD_BASIS ||
  entry?.PAYLOAD_SNAPSHOT?.boardBasis ||
  "";

const buildHotelRows = (file, quotation) => {
  const pax = getQuotationPax(quotation);

  return getAccommodationEntries(file).flatMap(entry =>
    asArray(entry?.OPTIONS).flatMap((option, optionIndex) =>
      asArray(option?.CITY_GROUPS).flatMap((cityGroup, cityIndex) =>
        asArray(cityGroup?.STAYS).map((stay, stayIndex) => {
          const checkIn = toDateInput(
            stay?.OVERNIGHT_DATE ||
              cityGroup?.OVERNIGHT_DATE ||
              entry?.ARRAIVING_DATE
          );
          const nights =
            toNumber(stay?.NIGHTS) ||
            toNumber(cityGroup?.TOTAL_NIGHTS) ||
            1;

          return {
            _sourceKey: `hotel-${getId(entry?._id)}-${optionIndex}-${cityIndex}-${stayIndex}`,
            hotelName: stay?.HOTEL_NAME || "",
            checkIn,
            checkOut: addDays(checkIn, nights),
            invoiceReceived: false,
            nights,
            notes: "",
            specialRates: "",
            additionalNotes: "",
            roomType: "",
            meal: getBoardBasis(entry),
            status: "",
            bookedBy: "",
            cancelDate: "",
            pax: pax || "",
            sgl: "",
            dbl: "",
            trp: "",
            other: "",
            confirmationNo: "",
            ref: "",
          };
        })
      )
    )
  );
};

const buildDraftDefaults = file => {
  const quotation = file?.QUOTATION || {};
  const days = asArray(file?.QUOTATION_DAYS)
    .map(normalizeDay)
    .sort((a, b) => toNumber(a.dayOrder) - toNumber(b.dayOrder));
  const pax = getQuotationPax(quotation);
  const arrivalDate = toDateInput(quotation?.QUOTATION_START_DATE);
  const departureDate = toDateInput(quotation?.QUOTATION_END_DATE);
  const hotelRows = buildHotelRows(file, quotation);

  const arrDep = [
    {
      _sourceKey: "arrival",
      arr: true,
      dep: false,
      date: arrivalDate,
      from: "",
      to: "",
      border: "",
      flight: "",
      time: "",
      pax: pax || "",
      meetBy: "",
      driverName: "",
      notes: "",
    },
    {
      _sourceKey: "departure",
      arr: false,
      dep: true,
      date: departureDate,
      from: "",
      to: "",
      border: "",
      flight: "",
      time: "",
      pax: pax || "",
      meetBy: "",
      driverName: "",
      notes: "",
    },
  ];

  const transportation = days.flatMap(day =>
    day.transportationRows.map((row, index) => ({
      _sourceKey: `transport-${day._id || day.dayOrder}-${index}`,
      companyName: row?.TRANSPORTATION_COMPANY_NAME || "",
      vehicleType:
        row?.TRANSPORTATION_TYPE_NAME ||
        row?.TRANSPORTATION_BY ||
        row?.TRANSPORTATION_SIZE_LABEL ||
        "",
      driverName: "",
      notes: "",
      specialRates: "",
      fromDate: toDateInput(day.dayDate),
      toDate: toDateInput(day.dayDate),
      status: "",
      pax: pax || "",
      confirmationNo: "",
      pickup: "",
      dropOff: "",
      invoiceReceived: false,
      reservationNo: "",
    }))
  );

  const guides = days
    .filter(
      day =>
        day?.guide?.enabled ||
        day?.guide?.GUIDE_TYPE_NAME ||
        day?.guide?.GUIDE_TYPE
    )
    .map(day => ({
      _sourceKey: `guide-${day._id || day.dayOrder}`,
      guideName: "",
      language: "",
      notes: "",
      specialRates: "",
      fromDate: toDateInput(day.dayDate),
      toDate: toDateInput(day.dayDate),
      status: "",
      days: 1,
      overnight: "",
      invoiceReceived: false,
    }));

  const entrance = days.flatMap(day =>
    day.entranceRows.map((place, index) => ({
      _sourceKey: `entrance-${day._id || day.dayOrder}-${index}`,
      date: toDateInput(day.dayDate),
      day: dayName(day.dayDate),
      time: "",
      notes: "",
      entrance: place?.PLACE_NAME || "",
      location: place?.PLACE_CITY_NAME || "",
      pax: pax || "",
      invoiceReceived: false,
    }))
  );

  const restaurants = days.flatMap(day =>
    day.mealsRows.map((meal, index) => ({
      _sourceKey: `restaurant-${day._id || day.dayOrder}-${index}`,
      region: meal?.CITY_NAME || "",
      restaurantName: meal?.RESTAURANT_NAME || "",
      meal: meal?.MEAL_NAME || meal?.MEAL_TYPE || "",
      typeOfMeal: meal?.MEAL_NAME || meal?.MEAL_TYPE || "",
      price: meal?.MEAL_PRICE_PER_PERSON ?? "",
      notes: "",
      specialRates: "",
      itinerary: day.dayOrder ? `Day ${day.dayOrder}` : "",
      date: toDateInput(day.dayDate),
      day: dayName(day.dayDate),
      time: "",
      status: "",
      bookedBy: "",
      pax: pax || "",
      confirmationNo: "",
      invoiceReceived: false,
    }))
  );

  const extras = asArray(file?.QUOTATION_EXTRA_SERVICES).map(
    (service, index) => ({
      _sourceKey: `extra-${getId(service?._id) || index}`,
      serviceName: service?.SERVICE_NAME || "",
      supplier: "",
      notes: "",
      specialRates: "",
      itinerary: "",
      classification: "",
      date: "",
      day: "",
      time: "",
      status: "",
      pax: pax || "",
      pickup: "",
      dropOff: "",
      invoiceReceived: false,
    })
  );

  const itineraries = days.map(day => {
    const mealNames = day.mealsRows
      .map(row => `${row?.MEAL_NAME || row?.MEAL_TYPE || ""}`.toLowerCase())
      .join(" ");

    return {
      _sourceKey: `itinerary-${day._id || day.dayOrder}`,
      date: toDateInput(day.dayDate),
      day: dayName(day.dayDate),
      itinerary: `Day ${day.dayOrder}: ${day.routeText}`,
      typeOfService:
        day.transportationRows?.[0]?.TRANSPORTATION_TYPE_NAME || "",
      guideName: day?.guide?.GUIDE_TYPE_NAME || "",
      accNights: !!day?.overnight?.OVERNIGHT_CITY,
      lunchIncluded: mealNames.includes("lunch"),
      dinnerIncluded: mealNames.includes("dinner"),
    };
  });

  const inclusions = buildInclusions({
    hotelRows,
    transportation,
    guides,
    entrance,
    restaurants,
    extras,
  });

  const clients = Array.from(
    { length: Math.max(1, Math.min(pax || 1, 50)) },
    (_, index) => ({
      _sourceKey: `client-${index + 1}`,
      type: "Mr.",
      countryCode: "",
      passportNo: "",
      name: "",
      dateOfBirth: "",
      sex: "",
      dateOfIssue: "",
      dateOfExpiry: "",
      nationalNo: "",
      placeOfBirth: "",
      authority: "",
    })
  );

  return {
    general: {
      groupName:
        quotation?.GROUP_NAME ||
        quotation?.GROUP ||
        file?.GROUP_NAME ||
        file?.GROUP ||
        "",
      agentName: quotation?.TRAVEL_AGENT_NAME || file?.TRAVEL_AGENT_NAME || "",
      reservationCode: file?.FILE_REFERENCE || "",
      nationality: quotation?.NATIONALITY_VALUE || "",
      pax: pax || "",
      depTax: "",
      visa: "",
      entries: "",
      tips: "",
    },
    arrDep,
    hotels: hotelRows,
    transportation,
    guides,
    entrance,
    restaurants,
    extras,
    itineraries,
    inclusions,
    clients,
    reminders: [],
    logs: [
      {
        _sourceKey: "created",
        timestamp: file?.CREATED_ON || "",
        date: toDateInput(file?.CREATED_ON),
        time: formatTimeLabel(file?.CREATED_ON),
        user: "System",
        event: "Reservation File Created",
        section: "System",
        action: "Created reservation file",
      },
      ...(file?.UPDATED_ON
        ? [
            {
              _sourceKey: "updated",
              timestamp: file?.UPDATED_ON || "",
              date: toDateInput(file.UPDATED_ON),
              time: formatTimeLabel(file.UPDATED_ON),
              user: "System",
              event: "Reservation File Updated",
              section: "System",
              action: "Updated reservation file",
            },
          ]
        : []),
    ],
  };
};

const buildInclusions = ({
  hotelRows,
  transportation,
  guides,
  entrance,
  restaurants,
  extras,
}) => {
  const rows = [];

  if (transportation.length) {
    rows.push(
      "Transportation as per the mentioned program in an A/C modern vehicle"
    );
  }

  if (hotelRows.length) {
    rows.push(
      `Accommodation as per selected quotation hotel option${
        hotelRows.length === 1 ? "" : "s"
      }`
    );
  }

  if (guides.length) {
    rows.push("Guide service as per the quoted itinerary days");
  }

  if (entrance.length) {
    rows.push(
      `Entrance fees to: ${entrance
        .map(item => item.entrance)
        .filter(Boolean)
        .join(", ")}`
    );
  }

  if (restaurants.length) {
    rows.push("Meals and restaurant arrangements as quoted");
  }

  if (extras.length) {
    rows.push(
      `Extra services: ${extras
        .map(item => item.serviceName)
        .filter(Boolean)
        .join(", ")}`
    );
  }

  rows.push("All applicable taxes");

  return rows.map((inclusion, index) => ({
    _sourceKey: `inclusion-${index}`,
    yes: true,
    no: false,
    inclusion,
  }));
};

const buildLogEntry = ({ user, event, section, action, timestamp = new Date() }) => ({
  _sourceKey: newKey("log"),
  timestamp: new Date(timestamp).toISOString(),
  date: formatDateForInput(timestamp),
  time: formatTimeLabel(timestamp),
  user,
  event,
  section,
  action,
});

const getRowLabel = (section, row, index) => {
  if (section === "arrDep") return getArrDepLabel(row, index);
  if (section === "guides") return row?.guideName || `Row ${index + 1}`;
  if (section === "hotels") return row?.hotelName || `Row ${index + 1}`;
  if (section === "transportation") return row?.companyName || `Row ${index + 1}`;
  if (section === "entrance") return row?.entrance || `Row ${index + 1}`;
  if (section === "restaurants") return row?.restaurantName || `Row ${index + 1}`;
  if (section === "extras") return row?.serviceName || `Row ${index + 1}`;
  if (section === "clients") return row?.name || row?.passportNo || `Client ${index + 1}`;
  if (section === "reminders") return `Reminder ${index + 1}`;
  if (section === "inclusions") return row?.inclusion || `Row ${index + 1}`;
  return `Row ${index + 1}`;
};

const buildReservationChangeLogs = ({ beforeDraft, afterDraft, userName }) => {
  if (!beforeDraft || !afterDraft) return [];

  const logs = [];
  const timestamp = new Date();
  const sections = [
    "general",
    "arrDep",
    "hotels",
    "transportation",
    "guides",
    "entrance",
    "restaurants",
    "extras",
    "inclusions",
    "clients",
  ];

  sections.forEach(section => {
    const beforeValue = beforeDraft?.[section];
    const afterValue = afterDraft?.[section];

    if (Array.isArray(afterValue) || Array.isArray(beforeValue)) {
      const beforeRows = Array.isArray(beforeValue) ? beforeValue : [];
      const afterRows = Array.isArray(afterValue) ? afterValue : [];
      const beforeMap = new Map(beforeRows.map((row, index) => [row?._sourceKey || `${section}-before-${index}`, { row, index }]));
      const afterMap = new Map(afterRows.map((row, index) => [row?._sourceKey || `${section}-after-${index}`, { row, index }]));
      const rowKeys = Array.from(new Set([...beforeMap.keys(), ...afterMap.keys()]));

      rowKeys.forEach(key => {
        const beforeEntry = beforeMap.get(key);
        const afterEntry = afterMap.get(key);

        if (!beforeEntry && afterEntry) {
          const rowLabel = getRowLabel(section, afterEntry.row, afterEntry.index);
          logs.push(
            buildLogEntry({
              user: userName,
              event: `${humanizeFieldName(section)} Row Added`,
              section: humanizeFieldName(section),
              action: `${userName} added a new row in ${humanizeFieldName(section)} (${rowLabel}).`,
              timestamp,
            })
          );
          return;
        }

        if (beforeEntry && !afterEntry) {
          const rowLabel = getRowLabel(section, beforeEntry.row, beforeEntry.index);
          logs.push(
            buildLogEntry({
              user: userName,
              event: `${humanizeFieldName(section)} Row Removed`,
              section: humanizeFieldName(section),
              action: `${userName} removed a row from ${humanizeFieldName(section)} (${rowLabel}).`,
              timestamp,
            })
          );
          return;
        }

        const rowLabel = getRowLabel(section, afterEntry.row, afterEntry.index);
        const fieldKeys = Array.from(
          new Set([
            ...Object.keys(beforeEntry?.row || {}),
            ...Object.keys(afterEntry?.row || {}),
          ])
        ).filter(field => field !== "_sourceKey");

        fieldKeys.forEach(field => {
          const beforeField = beforeEntry?.row?.[field];
          const afterField = afterEntry?.row?.[field];
          if (normalizeComparableValue(beforeField) === normalizeComparableValue(afterField)) {
            return;
          }

          const fieldLabel = humanizeFieldName(field);
          logs.push(
            buildLogEntry({
              user: userName,
              event: fieldLabel,
              section: humanizeFieldName(section),
              action: `${userName} changed ${fieldLabel} in ${humanizeFieldName(section)} (${rowLabel}) from "${formatLogValue(beforeField)}" to "${formatLogValue(afterField)}".`,
              timestamp,
            })
          );
        });
      });

      return;
    }

    const fieldKeys = Array.from(
      new Set([
        ...Object.keys(beforeValue || {}),
        ...Object.keys(afterValue || {}),
      ])
    );

    fieldKeys.forEach(field => {
      const beforeField = beforeValue?.[field];
      const afterField = afterValue?.[field];
      if (normalizeComparableValue(beforeField) === normalizeComparableValue(afterField)) {
        return;
      }

      const fieldLabel = humanizeFieldName(field);
      logs.push(
        buildLogEntry({
          user: userName,
          event: fieldLabel,
          section: humanizeFieldName(section),
          action: `${userName} changed ${fieldLabel} in ${humanizeFieldName(section)} from "${formatLogValue(beforeField)}" to "${formatLogValue(afterField)}".`,
          timestamp,
        })
      );
    });
  });

  return logs;
};

const mergeRows = (defaults, savedRows) => {
  const saved = asArray(savedRows);
  const savedByKey = new Map(
    saved
      .filter(row => row?._sourceKey)
      .map(row => [row._sourceKey, row])
  );
  const defaultKeys = new Set(defaults.map(row => row._sourceKey));

  return [
    ...defaults.map(row => ({
      ...row,
      ...(savedByKey.get(row._sourceKey) || {}),
      _sourceKey: row._sourceKey,
    })),
    ...saved.filter(row => !row?._sourceKey || !defaultKeys.has(row._sourceKey)),
  ];
};

const mergeDraft = (defaults, saved = {}) => ({
  general: { ...defaults.general, ...(saved?.general || {}) },
  arrDep: mergeRows(defaults.arrDep, saved?.arrDep),
  hotels: mergeRows(defaults.hotels, saved?.hotels),
  transportation: mergeRows(defaults.transportation, saved?.transportation),
  guides: mergeRows(defaults.guides, saved?.guides),
  entrance: mergeRows(defaults.entrance, saved?.entrance),
  restaurants: mergeRows(defaults.restaurants, saved?.restaurants),
  extras: mergeRows(defaults.extras, saved?.extras),
  itineraries: mergeRows(defaults.itineraries, saved?.itineraries),
  inclusions: mergeRows(defaults.inclusions, saved?.inclusions),
  clients: mergeRows(defaults.clients, saved?.clients),
  reminders: mergeRows(defaults.reminders, saved?.reminders),
  logs: mergeRows(defaults.logs, saved?.logs),
  attach: {
    offerFiles: asArray(saved?.attach?.offerFiles),
    emailFiles: asArray(saved?.attach?.emailFiles),
  },
});

const newKey = prefix => `${prefix}-manual-${Date.now()}-${Math.random()}`;

const emptyRow = {
  arrDep: () => ({
    _sourceKey: newKey("arrdep"),
    arr: false,
    dep: false,
    date: "",
    from: "",
    to: "",
    border: "",
    flight: "",
    time: "",
    pax: "",
    meetBy: "",
    driverName: "",
    notes: "",
  }),
  hotels: () => ({
    _sourceKey: newKey("hotel"),
    hotelName: "",
    checkIn: "",
    checkOut: "",
    invoiceReceived: false,
    nights: "",
    notes: "",
    specialRates: "",
    additionalNotes: "",
    roomType: "",
    meal: "",
    status: "",
    bookedBy: "",
    cancelDate: "",
    pax: "",
    sgl: "",
    dbl: "",
    trp: "",
    other: "",
    confirmationNo: "",
    ref: "",
  }),
  transportation: () => ({
    _sourceKey: newKey("transport"),
    companyName: "",
    vehicleType: "",
    driverName: "",
    notes: "",
    specialRates: "",
    fromDate: "",
    toDate: "",
    status: "",
    pax: "",
    confirmationNo: "",
    pickup: "",
    dropOff: "",
    invoiceReceived: false,
    reservationNo: "",
  }),
  guides: () => ({
    _sourceKey: newKey("guide"),
    guideName: "",
    language: "",
    notes: "",
    specialRates: "",
    fromDate: "",
    toDate: "",
    status: "",
    days: "",
    overnight: "",
    invoiceReceived: false,
  }),
  entrance: () => ({
    _sourceKey: newKey("entrance"),
    date: "",
    day: "",
    time: "",
    notes: "",
    entrance: "",
    location: "",
    pax: "",
    invoiceReceived: false,
  }),
  restaurants: () => ({
    _sourceKey: newKey("restaurant"),
    region: "",
    restaurantName: "",
    meal: "",
    typeOfMeal: "",
    price: "",
    notes: "",
    specialRates: "",
    itinerary: "",
    date: "",
    day: "",
    time: "",
    status: "",
    bookedBy: "",
    pax: "",
    confirmationNo: "",
    invoiceReceived: false,
  }),
  extras: () => ({
    _sourceKey: newKey("extra"),
    serviceName: "",
    supplier: "",
    notes: "",
    specialRates: "",
    itinerary: "",
    classification: "",
    date: "",
    day: "",
    time: "",
    status: "",
    pax: "",
    pickup: "",
    dropOff: "",
    invoiceReceived: false,
  }),
  clients: () => ({
    _sourceKey: newKey("client"),
    type: "Mr.",
    countryCode: "",
    passportNo: "",
    name: "",
    dateOfBirth: "",
    sex: "",
    dateOfIssue: "",
    dateOfExpiry: "",
    nationalNo: "",
    placeOfBirth: "",
    authority: "",
  }),
  reminders: () => ({
    _sourceKey: newKey("reminder"),
    note: "",
    createdOn: new Date().toISOString(),
  }),
  inclusions: () => ({
    _sourceKey: newKey("inclusion"),
    yes: true,
    no: false,
    inclusion: "",
  }),
};

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  options = null,
  readOnly = false,
  rows = 2,
}) => (
  <div className="mb-3">
    <Label className="form-label fw-semibold">{label}</Label>
    {type === "checkbox" ? (
      <div className="mt-2">
        <CheckButton
          checked={!!value}
          disabled={readOnly}
          onChange={onChange}
        />
      </div>
    ) : options ? (
      <Input
        type="select"
        value={text(value)}
        disabled={readOnly}
        onChange={e => onChange?.(e.target.value)}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Input>
    ) : (
      <Input
        type={type === "textarea" ? "textarea" : type}
        rows={type === "textarea" ? rows : undefined}
        value={text(value)}
        readOnly={readOnly}
        onChange={e => onChange?.(e.target.value)}
      />
    )}
  </div>
);

const CheckButton = ({ checked, onChange, disabled = false }) => (
  <Input
    type="checkbox"
    className="m-0"
    style={{ width: 18, height: 18, borderColor: "#556ee6", cursor: disabled ? "not-allowed" : "pointer" }}
    checked={!!checked}
    disabled={disabled}
    onChange={event => onChange?.(event.target.checked)}
  />
);

const SourceBadge = ({ row }) =>
  row?._sourceKey && !String(row._sourceKey).includes("-manual-") ? (
    <Badge color="info" pill className="fw-normal">
      From quotation
    </Badge>
  ) : null;

const SectionHeader = ({ title, fileReference, children }) => (
  <div className="d-flex align-items-center justify-content-between flex-wrap gap-3 mb-4">
    <h4 className="mb-0">
      {title} - File: {fileReference || "-"}
    </h4>
    {children ? <div className="d-flex gap-2">{children}</div> : null}
  </div>
);

const RowPanel = ({ row, children, onRemove, removeLabel }) => (
  <div className="rounded border bg-light p-3 p-lg-4 mb-4">
    <div className="d-flex justify-content-end mb-2">
      <SourceBadge row={row} />
    </div>
    {children}
    {onRemove ? (
      <Button color="danger" className="mt-2" type="button" onClick={onRemove}>
        {removeLabel}
      </Button>
    ) : null}
  </div>
);

const EmptySection = ({ label }) => (
  <div className="rounded border bg-light p-5 text-center text-muted">
    <i className="bx bx-folder-open font-size-24 d-block mb-2" />
    No {label} rows were found in the quotation yet.
  </div>
);

const TableCheckbox = ({ checked, onChange }) => (
  <CheckButton checked={checked} onChange={onChange} />
);

const getArrDepLabel = (row, index) => {
  if (row?._sourceKey === "arrival" || row?.arr) return "Arrival";
  if (row?._sourceKey === "departure" || row?.dep) return "Departure";
  return index === 0 ? "Arrival" : index === 1 ? "Departure" : `Row ${index + 1}`;
};

const formatDateForInput = value => {
  const dateStr = toDateInput(value);
  return dateStr || "";
};

const humanizeFieldName = value =>
  String(value || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim();

const normalizeComparableValue = value => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
};

const formatLogValue = value => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const roleLikeUserLabels = new Set([
  "ACCOUNTING",
  "ADMIN",
  "COMPANY_ADMIN",
  "CONTRACTING",
  "OPERATION",
  "QUALITY",
  "TOUR_OPERATION",
  "USER",
  "USER_COMPANY",
]);

const isPlaceholderUserName = value => {
  const normalized = String(value || "").trim();
  if (!normalized) return true;
  const upperValue = normalized.toUpperCase();
  return (
    upperValue === "UNKNOWN USER" ||
    upperValue === "UNKNOWN" ||
    roleLikeUserLabels.has(upperValue)
  );
};

const buildPreferredUserName = user => {
  if (!user) return "";
  const combinedName = `${
    user?.firstName || user?.FIRST_NAME || user?.given_name || ""
  } ${
    user?.lastName || user?.LAST_NAME || user?.family_name || ""
  }`.trim();
  const roles = Array.isArray(user?.ROLES)
    ? user.ROLES
    : Array.isArray(user?.roles)
      ? user.roles
      : [];
  const emailValue = String(user?.email || user?.EMAIL || "").trim();
  const emailPrefix = emailValue ? emailValue.split("@")[0] : "";
  const userName =
    user?.username && !isPlaceholderUserName(user.username)
      ? user.username
      : user?.USERNAME && !isPlaceholderUserName(user.USERNAME)
        ? user.USERNAME
        : "";

  return (
    combinedName ||
    user?.fullName ||
    user?.FULL_NAME ||
    user?.name ||
    userName ||
    emailPrefix ||
    user?.primaryRole ||
    user?.PRIMARY_ROLE ||
    roles.find(Boolean) ||
    ""
  );
};

const getCurrentUserName = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const user = JSON.parse(raw);
      const preferredName = buildPreferredUserName(user);
      if (preferredName) return preferredName;
    }

    const decoded = decodeJwt(getAccessToken() || "");
    const tokenName = buildPreferredUserName(decoded);
    if (tokenName) return tokenName;
  } catch {
    return "Unknown User";
  }

  return "Unknown User";
};

const getCurrentUserEmail = () => {
  try {
    const raw = localStorage.getItem("authUser");
    if (raw) {
      const user = JSON.parse(raw);
      if (user?.email) return String(user.email).trim().toLowerCase();
    }

    const decoded = decodeJwt(getAccessToken() || "");
    if (decoded?.EMAIL) return String(decoded.EMAIL).trim().toLowerCase();
  } catch {
    return "";
  }

  return "";
};

const getQuotationAllowedTripDays = quotation => {
  const directTripDays = toNumber(
    quotation?.NUMBER_OF_DAYS ??
      quotation?.TRIP_DAYS ??
      quotation?.QUOTATION_DURATION_DAYS ??
      quotation?.DURATION_IN_DAYS
  );

  if (directTripDays > 0) return directTripDays;

  const startDate = toDateInput(quotation?.QUOTATION_START_DATE);
  const endDate = toDateInput(quotation?.QUOTATION_END_DATE);
  return diffDaysInclusive(startDate, endDate) || 0;
};

const validateReservationDates = ({ draft, quotation }) => {
  if (!draft) return null;

  const quotationStartDate = toDateInput(quotation?.QUOTATION_START_DATE);
  const quotationEndDate = toDateInput(quotation?.QUOTATION_END_DATE);
  const quotationTripDays = getQuotationAllowedTripDays(quotation);
  const arrivalRow = asArray(draft?.arrDep).find(
    row => getArrDepLabel(row).toLowerCase() === "arrival"
  );
  const departureRow = asArray(draft?.arrDep).find(
    row => getArrDepLabel(row).toLowerCase() === "departure"
  );
  const arrivalDate = toDateInput(arrivalRow?.date);
  const departureDate = toDateInput(departureRow?.date);

  if (!quotationStartDate || !quotationEndDate) {
    return "Quotation dates are missing or invalid.";
  }

  if (!arrivalDate) {
    return "Arrival date is required.";
  }

  if (!departureDate) {
    return "Departure date is required.";
  }

  if (dateToUtcMs(departureDate) < dateToUtcMs(arrivalDate)) {
    return "Departure date cannot be before arrival date.";
  }

  if (
    dateToUtcMs(arrivalDate) < dateToUtcMs(quotationStartDate) ||
    dateToUtcMs(arrivalDate) > dateToUtcMs(quotationEndDate)
  ) {
    return "Arrival date is not within the quotation period.";
  }

  if (
    dateToUtcMs(departureDate) < dateToUtcMs(quotationStartDate) ||
    dateToUtcMs(departureDate) > dateToUtcMs(quotationEndDate)
  ) {
    return "Departure date is not within the quotation period.";
  }

  const selectedTripDays = diffDaysInclusive(arrivalDate, departureDate);
  if (quotationTripDays > 0 && selectedTripDays > quotationTripDays) {
    return `Arrival and departure dates cannot exceed the quotation trip length (${quotationTripDays} day${quotationTripDays === 1 ? "" : "s"}).`;
  }

  const validateSingleDate = (sectionLabel, rowLabel, fieldLabel, value) => {
    const dateStr = toDateInput(value);
    if (!dateStr) return null;

    if (
      dateToUtcMs(dateStr) < dateToUtcMs(arrivalDate) ||
      dateToUtcMs(dateStr) > dateToUtcMs(departureDate)
    ) {
      return `${fieldLabel} in ${sectionLabel} (${rowLabel}) is not within the arrival/departure period.`;
    }

    return null;
  };

  const validateDateRange = (
    sectionLabel,
    rowLabel,
    startLabel,
    startValue,
    endLabel,
    endValue
  ) => {
    const startDateStr = toDateInput(startValue);
    const endDateStr = toDateInput(endValue);

    if (startDateStr && endDateStr && dateToUtcMs(endDateStr) < dateToUtcMs(startDateStr)) {
      return `${endLabel} cannot be before ${startLabel} in ${sectionLabel} (${rowLabel}).`;
    }

    const startRangeError = validateSingleDate(
      sectionLabel,
      rowLabel,
      startLabel,
      startDateStr
    );
    if (startRangeError) return startRangeError;

    const endRangeError = validateSingleDate(
      sectionLabel,
      rowLabel,
      endLabel,
      endDateStr
    );
    if (endRangeError) return endRangeError;

    return null;
  };

  for (const [index, row] of asArray(draft?.arrDep).entries()) {
    const rowLabel = getArrDepLabel(row, index);
    const rangeError = validateSingleDate("Arrival / Departure", rowLabel, "Date", row?.date);
    if (rangeError) return rangeError;
  }

  for (const [index, row] of asArray(draft?.hotels).entries()) {
    const rowLabel = row?.hotelName || `Hotel ${index + 1}`;
    const rangeError = validateDateRange(
      "Hotels",
      rowLabel,
      "Check In",
      row?.checkIn,
      "Check Out",
      row?.checkOut
    );
    if (rangeError) return rangeError;

    const checkIn = toDateInput(row?.checkIn);
    const checkOut = toDateInput(row?.checkOut);
    const nights = String(row?.nights || "").trim();
    if (checkIn && checkOut && nights) {
      const actualNights = Math.max(
        0,
        Math.floor((dateToUtcMs(checkOut) - dateToUtcMs(checkIn)) / 86400000)
      );
      if (toNumber(nights) !== actualNights) {
        return `Nights in Hotels (${rowLabel}) must match the difference between Check In and Check Out.`;
      }
    }
  }

  for (const [index, row] of asArray(draft?.transportation).entries()) {
    const rowLabel = row?.companyName || `Transportation ${index + 1}`;
    const rangeError = validateDateRange(
      "Transportation",
      rowLabel,
      "From Date",
      row?.fromDate,
      "To Date",
      row?.toDate
    );
    if (rangeError) return rangeError;
  }

  for (const [index, row] of asArray(draft?.guides).entries()) {
    const rowLabel = row?.guideName || `Guide ${index + 1}`;
    const rangeError = validateDateRange(
      "Guides",
      rowLabel,
      "From Date",
      row?.fromDate,
      "To Date",
      row?.toDate
    );
    if (rangeError) return rangeError;

    const fromDate = toDateInput(row?.fromDate);
    const toDate = toDateInput(row?.toDate);
    const days = String(row?.days || "").trim();
    if (fromDate && toDate && days) {
      const actualDays = diffDaysInclusive(fromDate, toDate);
      if (actualDays !== null && toNumber(days) !== actualDays) {
        return `Days in Guides (${rowLabel}) must match the number of days between From Date and To Date.`;
      }
    }
  }

  for (const [index, row] of asArray(draft?.entrance).entries()) {
    const rowLabel = row?.entrance || `Entrance ${index + 1}`;
    const rangeError = validateSingleDate("Entrance", rowLabel, "Date", row?.date);
    if (rangeError) return rangeError;
  }

  for (const [index, row] of asArray(draft?.restaurants).entries()) {
    const rowLabel = row?.restaurantName || row?.meal || `Restaurant ${index + 1}`;
    const rangeError = validateSingleDate("Restaurants", rowLabel, "Date", row?.date);
    if (rangeError) return rangeError;
  }

  for (const [index, row] of asArray(draft?.extras).entries()) {
    const rowLabel = row?.serviceName || `Extra ${index + 1}`;
    const rangeError = validateSingleDate("Extras", rowLabel, "Date", row?.date);
    if (rangeError) return rangeError;
  }

  return null;
};

const formatLogUser = (userValue, currentUserName, currentUserEmail) => {
  const rawValue = String(userValue || "").trim();
  if (!rawValue) return "-";
  const safeCurrentUserName = !isPlaceholderUserName(currentUserName)
    ? currentUserName
    : "";

  if (isPlaceholderUserName(rawValue) && safeCurrentUserName) {
    return safeCurrentUserName;
  }

  const normalizedValue = rawValue.toLowerCase();
  if (
    safeCurrentUserName &&
    currentUserEmail &&
    normalizedValue === currentUserEmail.toLowerCase()
  ) {
    return safeCurrentUserName;
  }

  if (rawValue.includes("@")) {
    return safeCurrentUserName && normalizedValue === currentUserEmail
      ? safeCurrentUserName
      : rawValue;
  }

  return rawValue;
};

const formatLogAction = (actionValue, currentUserName) => {
  const rawAction = String(actionValue || "").trim();
  if (!rawAction) return "-";
  if (isPlaceholderUserName(currentUserName)) return rawAction;

  return rawAction.replace(
    /^(Unknown User|Unknown|USER|ADMIN|COMPANY_ADMIN|TOUR_OPERATION|OPERATION|CONTRACTING|ACCOUNTING|QUALITY|USER_COMPANY)(\s+)/i,
    `${currentUserName}$2`
  );
};

const YES_NO_OPTIONS = [
  { value: "", label: "Select" },
  { value: "Yes", label: "Yes" },
  { value: "No", label: "No" },
];

const normalizeYesNoValue = value => {
  if (value === true) return "Yes";
  if (value === false) return "No";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "yes") return "Yes";
    if (normalized === "no") return "No";
  }
  return "";
};

const MANIFEST_SEX_OPTIONS = ["Male", "Female"];

const FileButton = ({ label, accept, onChange }) => (
  <Button tag="label" color="secondary" size="sm" className="mb-0">
    {label}
    <Input type="file" accept={accept} className="d-none" onChange={onChange} />
  </Button>
);

const DropZone = ({ children, onDrop }) => (
  <div
    className="border rounded bg-white p-4 text-center text-muted"
    style={{ borderStyle: "dashed" }}
    onDragOver={event => {
      event.preventDefault();
      event.stopPropagation();
    }}
    onDrop={event => {
      event.preventDefault();
      event.stopPropagation();
      onDrop?.(event);
    }}
  >
    {children}
  </div>
);

const DocumentGenerationPanel = ({
  title,
  saveLabel,
  generateLabel = "Generate from Reservation",
}) => (
  <div className="rounded border bg-light p-3 mb-3">
    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
      <div>
        <h5 className="mb-2">{title}</h5>
        <div className="text-muted">Not generated yet.</div>
      </div>
      <div className="d-flex gap-2">
        <Button color="success" size="sm" type="button">
          {generateLabel}
        </Button>
        <Button color="primary" size="sm" type="button">
          {saveLabel}
        </Button>
      </div>
    </div>
  </div>
);

const ReservationFileDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const { selected, loading } = useSelector(s => s.ReservationFiles || {});
  const guideDirectory = useSelector(s => s.Guides?.items || []);
  const guideLanguageDirectory = useSelector(
    s => s.Guides?.guideLanguages || s.Guides?.languages || []
  );
  const transportationCompanies = useSelector(
    s => s.TransportationCompanies?.items || []
  );
  const transportationLookups = useSelector(
    s => s.TransportationCompanies?.lookups || {}
  );
  const [activeSection, setActiveSection] = useState("RES Details");
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [manifestOpen, setManifestOpen] = useState(false);
  const [offerUploadFile, setOfferUploadFile] = useState(null);
  const [offerUploadSaving, setOfferUploadSaving] = useState(false);
  const [emailUploadFile, setEmailUploadFile] = useState(null);
  const [emailUploadSaving, setEmailUploadSaving] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reminderNote, setReminderNote] = useState("");
  const [logFilterDateFrom, setLogFilterDateFrom] = useState("");
  const [logFilterDateTo, setLogFilterDateTo] = useState("");
  const [logFilterEvent, setLogFilterEvent] = useState("");

  const defaults = useMemo(
    () => (selected ? buildDraftDefaults(selected) : null),
    [selected]
  );
  const savedDraft = useMemo(
    () => (defaults ? mergeDraft(defaults, selected?.RESERVATION_DATA || {}) : null),
    [defaults, selected?.RESERVATION_DATA]
  );
  const initialCurrentUserName = useMemo(() => getCurrentUserName(), []);
  const [currentUserName, setCurrentUserName] = useState(initialCurrentUserName);
  const currentUserEmail = useMemo(() => getCurrentUserEmail(), []);

  useEffect(() => {
    if (id) dispatch(fetchReservationFile(id));
  }, [dispatch, id]);

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUserName = async () => {
      const decoded = decodeJwt(getAccessToken() || "");
      const userId = decoded?.sub;
      if (!userId) return;

      try {
        const user = await get(USER_BY_ID(userId));
        const preferredName = buildPreferredUserName(user);
        if (!preferredName || isPlaceholderUserName(preferredName)) return;

        if (isMounted) {
          setCurrentUserName(preferredName);
        }

        const rawAuthUser = localStorage.getItem("authUser");
        if (rawAuthUser) {
          const authUser = JSON.parse(rawAuthUser);
          const nextAuthUser = {
            ...authUser,
            firstName: user?.FIRST_NAME || authUser?.firstName || null,
            lastName: user?.LAST_NAME || authUser?.lastName || null,
            fullName: preferredName,
            username: preferredName,
          };
          localStorage.setItem("authUser", JSON.stringify(nextAuthUser));
          localStorage.setItem("user", JSON.stringify(nextAuthUser));
        }
      } catch {
        // Keep the token/localStorage fallback if the user lookup is unavailable.
      }
    };

    loadCurrentUserName();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    dispatch(
      fetchGuides({
        page: 1,
        limit: 100,
        ACTIVE_STATUS: true,
        sortBy: "GUIDE_NAME",
        sortDir: "asc",
      })
    );
    dispatch(fetchGuideLanguages());
    dispatch(fetchTransportationCompanies());
    dispatch(fetchTransportationLookups());
  }, [dispatch]);

  useEffect(() => {
    if (!defaults) {
      setDraft(null);
      return;
    }
    setDraft(savedDraft);
  }, [defaults, savedDraft]);

  useEffect(() => {
    const preventBrowserDrop = event => {
      event.preventDefault();
    };

    window.addEventListener("dragover", preventBrowserDrop);
    window.addEventListener("drop", preventBrowserDrop);

    return () => {
      window.removeEventListener("dragover", preventBrowserDrop);
      window.removeEventListener("drop", preventBrowserDrop);
    };
  }, []);

  const quotation = selected?.QUOTATION || {};
  const referenceTitle = selected?.FILE_REFERENCE || "-";
  const pax = getQuotationPax(quotation);
  const hotelNameOptions = useMemo(
    () => buildHotelNameOptions(selected),
    [selected]
  );
  const routeOptions = useMemo(() => buildRouteOptions(selected), [selected]);
  const guideNameOptions = useMemo(
    () => buildGuideNameOptions(guideDirectory),
    [guideDirectory]
  );

  document.title = "Reservation File Details | Skote";

  const updateGeneral = (field, value) => {
    setDraft(prev => ({
      ...prev,
      general: { ...(prev?.general || {}), [field]: value },
    }));
  };

  const updateRow = (section, index, field, value) => {
    setDraft(prev => ({
      ...prev,
      [section]: asArray(prev?.[section]).map((row, rowIndex) =>
        rowIndex === index ? { ...row, [field]: value } : row
      ),
    }));
  };

  const updateRowFields = (section, index, patchValues) => {
    setDraft(prev => ({
      ...prev,
      [section]: asArray(prev?.[section]).map((row, rowIndex) =>
        rowIndex === index ? { ...row, ...patchValues } : row
      ),
    }));
  };

  const handleGuideNameChange = (index, guideName) => {
    const firstLanguage = getFirstGuideLanguage(guideDirectory, guideName);

    setDraft(prev => ({
      ...prev,
      guides: asArray(prev?.guides).map((row, rowIndex) => {
        if (rowIndex !== index) return row;

        const languageOptions = buildGuideLanguageOptions(
          guideDirectory,
          guideName,
          guideLanguageDirectory
        );
        const currentLanguageExists = languageOptions.some(
          option =>
            text(option.value).toLowerCase() ===
            text(row?.language).toLowerCase()
        );

        return {
          ...row,
          guideName,
          language:
            currentLanguageExists && row?.language
              ? row.language
              : firstLanguage,
        };
      }),
    }));
  };

  const addRow = section => {
    setDraft(prev => ({
      ...prev,
      [section]: [...asArray(prev?.[section]), emptyRow[section]()],
    }));
  };

  const removeRow = (section, index) => {
    setDraft(prev => ({
      ...prev,
      [section]: asArray(prev?.[section]).filter((_, rowIndex) => rowIndex !== index),
    }));
  };

  const handleSave = async () => {
    if (!draft || !id) return;

    const reservationDateError = validateReservationDates({
      draft,
      quotation,
    });
    if (reservationDateError) {
      notifyError(reservationDateError);
      return;
    }

    setSaving(true);
    try {
      const changeLogs = buildReservationChangeLogs({
        beforeDraft: savedDraft,
        afterDraft: draft,
        userName: currentUserName,
      });
      const nextDraft = {
        ...draft,
        logs: [...asArray(draft?.logs), ...changeLogs],
      };

      await patch(RESERVATION_FILE_BY_ID(id), {
        RESERVATION_DATA: nextDraft,
      });
      setDraft(nextDraft);
      notifySuccess(
        changeLogs.length
          ? `Reservation file saved with ${changeLogs.length} logged change${changeLogs.length === 1 ? "" : "s"}.`
          : "Reservation file saved."
      );
      dispatch(fetchReservationFile(id));
    } catch (error) {
      notifyError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save reservation file."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleOfferFileSelect = event => {
    const file = event?.target?.files?.[0] || null;
    setOfferUploadFile(file);
    if (event?.target) {
      event.target.value = "";
    }
  };

  const handleEmailFileSelect = event => {
    const file = event?.target?.files?.[0] || null;
    setEmailUploadFile(file);
    if (event?.target) {
      event.target.value = "";
    }
  };

  const handleOfferFileDrop = event => {
    const file = event?.dataTransfer?.files?.[0] || null;
    setOfferUploadFile(file);
  };

  const handleEmailFileDrop = event => {
    const file = event?.dataTransfer?.files?.[0] || null;
    setEmailUploadFile(file);
  };

  const handleSaveOfferAttachment = async () => {
    if (!offerUploadFile || !draft || !id) {
      notifyError("Please choose a file first.");
      return;
    }

    setOfferUploadSaving(true);
    try {
      const attachment = await uploadAttachment({
        file: offerUploadFile,
        ATTACHMENT_TYPE: ATTACHMENT_TYPES.DOCUMENT,
        META: {
          category: "RESERVATION_OFFER_FILE",
          reservationFileId: id,
          reservationReference: referenceTitle,
        },
      });

      const nextDraft = {
        ...draft,
        attach: {
          ...(draft.attach || {}),
          offerFiles: [
            ...asArray(draft?.attach?.offerFiles),
            {
              _sourceKey: newKey("offer-file"),
              attachmentId: attachment?._id || "",
              fileName: attachment?.FILE_NAME || offerUploadFile.name,
              mimeType: attachment?.MIME_TYPE || offerUploadFile.type || "application/octet-stream",
              fileSize: attachment?.FILE_SIZE || offerUploadFile.size || 0,
              createdOn: attachment?.CREATED_ON || new Date().toISOString(),
            },
          ],
          emailFiles: asArray(draft?.attach?.emailFiles),
        },
        logs: [
          ...asArray(draft?.logs),
          buildLogEntry({
            user: currentUserName,
            event: "Offer File Uploaded",
            section: "Attach",
            action: `${currentUserName} uploaded an offer attachment (${attachment?.FILE_NAME || offerUploadFile.name}).`,
          }),
        ],
      };

      await patch(RESERVATION_FILE_BY_ID(id), {
        RESERVATION_DATA: nextDraft,
      });

      setDraft(nextDraft);
      setOfferUploadFile(null);
      notifySuccess("Offer file uploaded and saved.");
      dispatch(fetchReservationFile(id));
    } catch (error) {
      notifyError(
        extractAttachmentErrorMessage(error, "Failed to upload and save the offer file.")
      );
    } finally {
      setOfferUploadSaving(false);
    }
  };

  const handleSaveEmailAttachment = async () => {
    if (!emailUploadFile || !draft || !id) {
      notifyError("Please choose an .eml file first.");
      return;
    }

    setEmailUploadSaving(true);
    try {
      const attachment = await uploadAttachment({
        file: emailUploadFile,
        ATTACHMENT_TYPE: ATTACHMENT_TYPES.DOCUMENT,
        META: {
          category: "RESERVATION_EMAIL_FILE",
          reservationFileId: id,
          reservationReference: referenceTitle,
        },
      });

      const nextDraft = {
        ...draft,
        attach: {
          ...(draft.attach || {}),
          offerFiles: asArray(draft?.attach?.offerFiles),
          emailFiles: [
            ...asArray(draft?.attach?.emailFiles),
            {
              _sourceKey: newKey("email-file"),
              attachmentId: attachment?._id || "",
              fileName: attachment?.FILE_NAME || emailUploadFile.name,
              mimeType: attachment?.MIME_TYPE || emailUploadFile.type || "message/rfc822",
              fileSize: attachment?.FILE_SIZE || emailUploadFile.size || 0,
              createdOn: attachment?.CREATED_ON || new Date().toISOString(),
            },
          ],
        },
        logs: [
          ...asArray(draft?.logs),
          buildLogEntry({
            user: currentUserName,
            event: "Email File Uploaded",
            section: "Attach",
            action: `${currentUserName} uploaded an email attachment (${attachment?.FILE_NAME || emailUploadFile.name}).`,
          }),
        ],
      };

      await patch(RESERVATION_FILE_BY_ID(id), {
        RESERVATION_DATA: nextDraft,
      });

      setDraft(nextDraft);
      setEmailUploadFile(null);
      notifySuccess("Email file uploaded and saved.");
      dispatch(fetchReservationFile(id));
    } catch (error) {
      notifyError(
        extractAttachmentErrorMessage(error, "Failed to upload and save the email file.")
      );
    } finally {
      setEmailUploadSaving(false);
    }
  };

  const handlePreviewAttachment = async attachmentId => {
    if (!attachmentId) {
      notifyError("Attachment preview is not available.");
      return;
    }

    try {
      await openAttachment(attachmentId);
    } catch (error) {
      notifyError(
        extractAttachmentErrorMessage(error, "Failed to preview the attachment.")
      );
    }
  };

  const handleDownloadAttachment = async (attachmentId, fileName) => {
    if (!attachmentId) {
      notifyError("Attachment download is not available.");
      return;
    }

    try {
      const downloadUrl = await getAttachmentDownloadUrl(attachmentId);
      if (!downloadUrl) {
        throw new Error("Download URL is not available.");
      }

      const anchor = document.createElement("a");
      anchor.href = downloadUrl;
      anchor.target = "_blank";
      anchor.rel = "noopener noreferrer";
      anchor.download = fileName || "attachment";
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
    } catch (error) {
      notifyError(
        extractAttachmentErrorMessage(error, "Failed to download the attachment.")
      );
    }
  };

  const handleOpenReminder = () => {
    setReminderNote("");
    setReminderOpen(true);
  };

  const handleSaveReminder = async () => {
    if (!String(reminderNote || "").trim()) {
      notifyError("Please enter reminder notes first.");
      return;
    }

    if (!draft || !id) {
      notifyError("Unable to save the reminder right now.");
      return;
    }

    setSaving(true);

    const nextDraft = {
      ...draft,
      reminders: [
        ...asArray(draft?.reminders),
        {
          ...emptyRow.reminders(),
          note: reminderNote.trim(),
          createdOn: new Date().toISOString(),
        },
      ],
      logs: [
        ...asArray(draft?.logs),
        buildLogEntry({
          user: currentUserName,
          event: "Reminder Added",
          section: "Reminder",
          action: `${currentUserName} added a reminder note.`,
        }),
      ],
    };

    try {
      await patch(RESERVATION_FILE_BY_ID(id), {
        RESERVATION_DATA: nextDraft,
      });

      setDraft(nextDraft);
      setReminderOpen(false);
      setReminderNote("");
      notifySuccess("Reminder added.");
      dispatch(fetchReservationFile(id));
    } catch (error) {
      notifyError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save the reminder."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSectionChange = section => {
    setActiveSection(section);
    if (section === "Clients") {
      setManifestOpen(true);
    }
  };

  const renderResDetails = () => (
    <>
      <div className="rounded border bg-light p-3 p-lg-4 mb-4">
        <h4 className="mb-3">Reservation Details</h4>
        <Row className="g-3">
          <Col md="4">
            <div>File No.</div>
            <div className="fw-semibold">{referenceTitle}</div>
            <div className="mt-2">Group</div>
            <div className="fw-semibold">{draft?.general?.groupName || "-"}</div>
            <div className="mt-2">Agent</div>
            <div className="fw-semibold">{draft?.general?.agentName || "-"}</div>
            <div className="mt-2">Nationality</div>
            <div className="fw-semibold">{draft?.general?.nationality || "-"}</div>
          </Col>
          <Col md="4">
            <div>Arrival Date</div>
            <div className="fw-semibold">
              {formatDateLabel(quotation?.QUOTATION_START_DATE)}
            </div>
            <div className="mt-2">Departure Date</div>
            <div className="fw-semibold">
              {formatDateLabel(quotation?.QUOTATION_END_DATE)}
            </div>
            <div className="mt-2">Pax</div>
            <div className="fw-semibold">{pax || "-"}</div>
          </Col>
          <Col md="4">
            <div>Quotation ID</div>
            <div className="fw-semibold text-break">{getId(selected?.QUOTATION_ID)}</div>
            <div className="mt-2">Quotation Ref.</div>
            <div className="fw-semibold">{selected?.QUOTATION_REFERENCE || "-"}</div>
            <div className="mt-2">Status</div>
            <Badge color="success" pill>
              {quotation?.STATUS || "-"}
            </Badge>
            <div className="mt-3">
              <Button
                tag={Link}
                to={`/quotations/${getId(selected?.QUOTATION_ID)}`}
                target="_blank"
                rel="noopener noreferrer"
                color="warning"
                size="sm"
                type="button"
              >
                Open Quotation
              </Button>
            </div>
          </Col>
        </Row>
      </div>

      <DocumentGenerationPanel title="Cover Page" saveLabel="Save Cover Page" />
      <DocumentGenerationPanel
        title="Confirmation Letter"
        saveLabel="Save Confirmation Letter"
      />
    </>
  );

  const renderGeneral = () => (
    <>
      <SectionHeader title="General" fileReference={referenceTitle} />
      <div className="rounded border bg-light p-3 p-lg-4" style={{ maxWidth: 760 }}>
        <Field label="Group Name" value={draft?.general?.groupName} onChange={v => updateGeneral("groupName", v)} />
        <Field label="Agent Name" value={draft?.general?.agentName} readOnly />
        <Field label="Reservation Code" value={draft?.general?.reservationCode} readOnly />
        <Field label="Nationality" value={draft?.general?.nationality} onChange={v => updateGeneral("nationality", v)} />
        <Field label="Pax" type="number" value={draft?.general?.pax} onChange={v => updateGeneral("pax", v)} />
        <Row>
          <Col md="4">
            <Field
              label="Dep. Tax"
              type="number"
              value={draft?.general?.depTax}
              onChange={v => updateGeneral("depTax", v)}
            />
          </Col>
          <Col md="4">
            <Field
              label="Visa"
              value={draft?.general?.visa}
              options={[
                { value: "", label: "Select" },
                { value: "Included", label: "Included" },
                { value: "Not Included", label: "Not Included" },
                { value: "On Arrival", label: "On Arrival" },
              ]}
              onChange={v => updateGeneral("visa", v)}
            />
          </Col>
          <Col md="4">
            <Field
              label="Entries"
              value={draft?.general?.entries}
              options={[
                { value: "", label: "Select" },
                { value: "Yes", label: "Yes" },
                { value: "No", label: "No" },
              ]}
              onChange={v => updateGeneral("entries", v)}
            />
          </Col>
        </Row>
        <Field
          label="Tips"
          type="number"
          value={draft?.general?.tips}
          onChange={v => updateGeneral("tips", v)}
        />
        <div className="d-flex gap-2">
          <Button color="primary" onClick={handleSave} disabled={saving}>
            Save General Data
          </Button>
          <Button color="success" onClick={() => updateGeneral("groupName", draft?.general?.groupName || referenceTitle)}>
            Set Group Name
          </Button>
        </div>
      </div>
    </>
  );

  const renderArrDep = () => (
    <>
      <SectionHeader title="Arrival / Departure" fileReference={referenceTitle}>
        <Button color="primary" onClick={handleSave} disabled={saving}>
          Save Changes
        </Button>
      </SectionHeader>
      <div className="table-responsive">
        <Table bordered className="align-middle bg-light">
          <thead>
            <tr>
              {["Type", "Date", "From", "To", "Border", "Flight", "Time", "Pax", "Meet By", "Driver Name", "Notes"].map(head => (
                <th key={head}>{head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {asArray(draft?.arrDep).map((row, index) => (
              <tr key={row._sourceKey || index}>
                <td className="fw-semibold">{getArrDepLabel(row, index)}</td>
                <td><Input type="date" value={text(row.date)} onChange={e => updateRow("arrDep", index, "date", e.target.value)} /></td>
                <td><Input value={text(row.from)} onChange={e => updateRow("arrDep", index, "from", e.target.value)} /></td>
                <td><Input value={text(row.to)} onChange={e => updateRow("arrDep", index, "to", e.target.value)} /></td>
                <td><Input value={text(row.border)} onChange={e => updateRow("arrDep", index, "border", e.target.value)} /></td>
                <td><Input value={text(row.flight)} onChange={e => updateRow("arrDep", index, "flight", e.target.value)} /></td>
                <td><Input type="time" value={text(row.time)} onChange={e => updateRow("arrDep", index, "time", e.target.value)} /></td>
                <td><Input type="number" value={text(row.pax)} onChange={e => updateRow("arrDep", index, "pax", e.target.value)} /></td>
                <td><Input value={text(row.meetBy)} onChange={e => updateRow("arrDep", index, "meetBy", e.target.value)} /></td>
                <td><Input value={text(row.driverName)} onChange={e => updateRow("arrDep", index, "driverName", e.target.value)} /></td>
                <td><Input type="textarea" value={text(row.notes)} onChange={e => updateRow("arrDep", index, "notes", e.target.value)} /></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </>
  );

  const renderHotels = () => (
    <>
      <SectionHeader title="Hotels" fileReference={referenceTitle} />
      {!draft?.hotels?.length ? <EmptySection label="hotel" /> : null}
      {asArray(draft?.hotels).map((row, index) => (
        <RowPanel key={row._sourceKey || index} row={row} removeLabel="Remove Hotel" onRemove={() => removeRow("hotels", index)}>
          <Row>
            <Col md="2"><Field label="Hotel Name" value={row.hotelName} options={withCurrentOption(hotelNameOptions, row.hotelName)} onChange={v => updateRow("hotels", index, "hotelName", v)} /></Col>
            <Col md="2"><Field label="Check In" type="date" value={row.checkIn} onChange={v => updateRow("hotels", index, "checkIn", v)} /></Col>
            <Col md="2"><Field label="Check Out" type="date" value={row.checkOut} onChange={v => updateRow("hotels", index, "checkOut", v)} /></Col>
            <Col md="2"><Field label="Invoice Received" value={normalizeYesNoValue(row.invoiceReceived)} options={YES_NO_OPTIONS} onChange={v => updateRow("hotels", index, "invoiceReceived", v)} /></Col>
            <Col md="2"><Field label="Nights" type="number" value={row.nights} onChange={v => updateRow("hotels", index, "nights", v)} /></Col>
            <Col md="2"><Field label="Notes" value={row.notes} onChange={v => updateRow("hotels", index, "notes", v)} /></Col>
            <Col md="2"><Field label="Special Rates" value={row.specialRates} onChange={v => updateRow("hotels", index, "specialRates", v)} /></Col>
            <Col md="2"><Field label="Additional Notes" value={row.additionalNotes} onChange={v => updateRow("hotels", index, "additionalNotes", v)} /></Col>
            <Col md="2"><Field label="Room Type" value={row.roomType} onChange={v => updateRow("hotels", index, "roomType", v)} /></Col>
            <Col md="2"><Field label="Status" value={row.status} onChange={v => updateRow("hotels", index, "status", v)} /></Col>
            <Col md="2"><Field label="Booked By" value={row.bookedBy} onChange={v => updateRow("hotels", index, "bookedBy", v)} /></Col>
            <Col md="2"><Field label="Cancel Date" type="date" value={row.cancelDate} onChange={v => updateRow("hotels", index, "cancelDate", v)} /></Col>
          </Row>
          <hr />
          <Row>
            <Col md="2"><Field label="Pax" type="number" value={row.pax} onChange={v => updateRow("hotels", index, "pax", v)} /></Col>
            <Col md="2"><Field label="SGL" value={row.sgl} onChange={v => updateRow("hotels", index, "sgl", v)} /></Col>
            <Col md="2"><Field label="DBL" value={row.dbl} onChange={v => updateRow("hotels", index, "dbl", v)} /></Col>
            <Col md="2"><Field label="TRP" value={row.trp} onChange={v => updateRow("hotels", index, "trp", v)} /></Col>
            <Col md="2"><Field label="Other" value={row.other} onChange={v => updateRow("hotels", index, "other", v)} /></Col>
            <Col md="2"><Field label="Conf. No." value={row.confirmationNo} onChange={v => updateRow("hotels", index, "confirmationNo", v)} /></Col>
            <Col md="2"><Field label="Ref" value={row.ref} onChange={v => updateRow("hotels", index, "ref", v)} /></Col>
          </Row>
        </RowPanel>
      ))}
      <Button color="success" onClick={() => addRow("hotels")}>Add Another Hotel</Button>
    </>
  );

  const renderTransportation = () => (
    <>
      <SectionHeader title="Transportation" fileReference={referenceTitle}>
        <Button color="primary" onClick={handleSave} disabled={saving}>Save Changes</Button>
      </SectionHeader>
      {!draft?.transportation?.length ? <EmptySection label="transportation" /> : null}
      {asArray(draft?.transportation).map((row, index) => (
        <RowPanel key={row._sourceKey || index} row={row} removeLabel="Remove Transportation" onRemove={() => removeRow("transportation", index)}>
          <Row>
            <Col md="3"><Field label="Transport Co. Name" value={row.companyName} onChange={v => updateRow("transportation", index, "companyName", v)} /></Col>
            <Col md="3"><Field label="Type of Vehicle" value={row.vehicleType} options={withCurrentOption(buildVehicleSizeOptions(transportationCompanies, transportationLookups, row.companyName), row.vehicleType)} onChange={v => updateRow("transportation", index, "vehicleType", v)} /></Col>
            <Col md="3"><Field label="Driver Name" value={row.driverName} onChange={v => updateRow("transportation", index, "driverName", v)} /></Col>
            <Col md="3"><Field label="Notes" value={row.notes} onChange={v => updateRow("transportation", index, "notes", v)} /></Col>
            <Col md="3"><Field label="From Date" type="date" value={row.fromDate} onChange={v => updateRow("transportation", index, "fromDate", v)} /></Col>
            <Col md="3"><Field label="To Date" type="date" value={row.toDate} onChange={v => updateRow("transportation", index, "toDate", v)} /></Col>
            <Col md="3"><Field label="Status" value={row.status} options={withCurrentOption(RESERVATION_STATUS_OPTIONS, row.status)} onChange={v => updateRow("transportation", index, "status", v)} /></Col>
            <Col md="2"><Field label="Pax" type="number" value={row.pax} onChange={v => updateRow("transportation", index, "pax", v)} /></Col>
            <Col md="2"><Field label="Conf. No." value={row.confirmationNo} onChange={v => updateRow("transportation", index, "confirmationNo", v)} /></Col>
            <Col md="2"><Field label="Pickup" value={row.pickup} options={withCurrentOption(routeOptions, row.pickup)} onChange={v => updateRow("transportation", index, "pickup", v)} /></Col>
            <Col md="2"><Field label="Drop Off" value={row.dropOff} options={withCurrentOption(routeOptions, row.dropOff)} onChange={v => updateRow("transportation", index, "dropOff", v)} /></Col>
            <Col md="2"><Field label="Invoice Received" value={normalizeYesNoValue(row.invoiceReceived)} options={YES_NO_OPTIONS} onChange={v => updateRow("transportation", index, "invoiceReceived", v)} /></Col>
            <Col md="2"><Field label="Resv. No." value={row.reservationNo} onChange={v => updateRow("transportation", index, "reservationNo", v)} /></Col>
          </Row>
        </RowPanel>
      ))}
      <Button color="success" onClick={() => addRow("transportation")}>Add Another Transportation</Button>
    </>
  );

  const renderGuides = () => (
    <>
      <SectionHeader title="Guides" fileReference={referenceTitle} />
      {!draft?.guides?.length ? <EmptySection label="guide" /> : null}
      {asArray(draft?.guides).map((row, index) => (
        <RowPanel key={row._sourceKey || index} row={row} removeLabel="Remove Guide" onRemove={() => removeRow("guides", index)}>
          <Row>
            <Col md="3"><Field label="Guide Name" value={row.guideName} options={withCurrentOption(guideNameOptions, row.guideName)} onChange={v => handleGuideNameChange(index, v)} /></Col>
            <Col md="3"><Field label="Language" value={row.language} options={withCurrentOption(buildGuideLanguageOptions(guideDirectory, row.guideName, guideLanguageDirectory), row.language)} onChange={v => updateRow("guides", index, "language", v)} /></Col>
            <Col md="3"><Field label="Notes" value={row.notes} onChange={v => updateRow("guides", index, "notes", v)} /></Col>
            <Col md="3"><Field label="Special Rates" value={row.specialRates} onChange={v => updateRow("guides", index, "specialRates", v)} /></Col>
            <Col md="2"><Field label="From Date" type="date" value={row.fromDate} onChange={v => updateRow("guides", index, "fromDate", v)} /></Col>
            <Col md="2"><Field label="To Date" type="date" value={row.toDate} onChange={v => updateRow("guides", index, "toDate", v)} /></Col>
            <Col md="2"><Field label="Status" value={row.status} options={withCurrentOption(RESERVATION_STATUS_OPTIONS, row.status)} onChange={v => updateRow("guides", index, "status", v)} /></Col>
            <Col md="2"><Field label="Days" type="number" value={row.days} onChange={v => updateRow("guides", index, "days", v)} /></Col>
            <Col md="2">
              <Field
                label="Overnight"
                value={row.overnight}
                options={[
                  { value: "", label: "Select" },
                  { value: "Yes", label: "Yes" },
                  { value: "No", label: "No" },
                ]}
                onChange={v => updateRow("guides", index, "overnight", v)}
              />
            </Col>
            <Col md="2"><Field label="Invoice Received" value={normalizeYesNoValue(row.invoiceReceived)} options={YES_NO_OPTIONS} onChange={v => updateRow("guides", index, "invoiceReceived", v)} /></Col>
          </Row>
        </RowPanel>
      ))}
      <Button color="success" onClick={() => addRow("guides")}>Add Another Guide</Button>
    </>
  );

  const renderEntrance = () => (
    <>
      <SectionHeader title="Entrance" fileReference={referenceTitle} />
      {!draft?.entrance?.length ? <EmptySection label="entrance" /> : null}
      {asArray(draft?.entrance).map((row, index) => (
        <RowPanel key={row._sourceKey || index} row={row} removeLabel="Remove Entrance" onRemove={() => removeRow("entrance", index)}>
          <Row>
            <Col md="2"><Field label="Date" type="date" value={row.date} onChange={v => updateRow("entrance", index, "date", v)} /></Col>
            <Col md="2"><Field label="Day" value={row.day} onChange={v => updateRow("entrance", index, "day", v)} /></Col>
            <Col md="2"><Field label="Time" type="time" value={row.time} onChange={v => updateRow("entrance", index, "time", v)} /></Col>
            <Col md="2"><Field label="Notes" value={row.notes} onChange={v => updateRow("entrance", index, "notes", v)} /></Col>
            <Col md="2"><Field label="Entrance" value={row.entrance} onChange={v => updateRow("entrance", index, "entrance", v)} /></Col>
            <Col md="1"><Field label="Location" value={row.location} onChange={v => updateRow("entrance", index, "location", v)} /></Col>
            <Col md="1"><Field label="Pax" type="number" value={row.pax} onChange={v => updateRow("entrance", index, "pax", v)} /></Col>
            <Col md="2"><Field label="Invoice Received" value={normalizeYesNoValue(row.invoiceReceived)} options={YES_NO_OPTIONS} onChange={v => updateRow("entrance", index, "invoiceReceived", v)} /></Col>
          </Row>
        </RowPanel>
      ))}
      <Button color="success" onClick={() => addRow("entrance")}>Add Another Entrance</Button>
      <Button color="primary" className="ms-2" onClick={handleSave} disabled={saving}>Save Entrance Data</Button>
    </>
  );

  const renderRestaurants = () => (
    <>
      <SectionHeader title="Restaurants" fileReference={referenceTitle}>
        <Button color="primary" onClick={handleSave} disabled={saving}>Save Changes</Button>
      </SectionHeader>
      {!draft?.restaurants?.length ? <EmptySection label="restaurant/meal" /> : null}
      {asArray(draft?.restaurants).map((row, index) => (
        <RowPanel key={row._sourceKey || index} row={row} removeLabel="Remove Restaurant" onRemove={() => removeRow("restaurants", index)}>
          <Row>
            <Col md="2"><Field label="Region" value={row.region} onChange={v => updateRow("restaurants", index, "region", v)} /></Col>
            <Col md="2"><Field label="Restaurant Name" value={row.restaurantName} onChange={v => updateRow("restaurants", index, "restaurantName", v)} /></Col>
            <Col md="2"><Field label="Meal" value={row.meal} onChange={v => updateRow("restaurants", index, "meal", v)} /></Col>
            <Col md="2"><Field label="Type of Meal" value={row.typeOfMeal} onChange={v => updateRow("restaurants", index, "typeOfMeal", v)} /></Col>
            <Col md="2"><Field label="Price" value={row.price} onChange={v => updateRow("restaurants", index, "price", v)} /></Col>
            <Col md="2"><Field label="Notes" value={row.notes} onChange={v => updateRow("restaurants", index, "notes", v)} /></Col>
            <Col md="2"><Field label="Special Rates" value={row.specialRates} onChange={v => updateRow("restaurants", index, "specialRates", v)} /></Col>
            <Col md="2"><Field label="Itinerary" value={row.itinerary} onChange={v => updateRow("restaurants", index, "itinerary", v)} /></Col>
            <Col md="2"><Field label="Date" type="date" value={row.date} onChange={v => updateRow("restaurants", index, "date", v)} /></Col>
            <Col md="2"><Field label="Day" value={row.day} onChange={v => updateRow("restaurants", index, "day", v)} /></Col>
            <Col md="2"><Field label="Time" type="time" value={row.time} onChange={v => updateRow("restaurants", index, "time", v)} /></Col>
            <Col md="2"><Field label="Status" value={row.status} onChange={v => updateRow("restaurants", index, "status", v)} /></Col>
            <Col md="2"><Field label="Booked By" value={row.bookedBy} onChange={v => updateRow("restaurants", index, "bookedBy", v)} /></Col>
            <Col md="2"><Field label="Pax" type="number" value={row.pax} onChange={v => updateRow("restaurants", index, "pax", v)} /></Col>
            <Col md="2"><Field label="Conf. No." value={row.confirmationNo} onChange={v => updateRow("restaurants", index, "confirmationNo", v)} /></Col>
            <Col md="2"><Field label="Invoice Received" value={normalizeYesNoValue(row.invoiceReceived)} options={YES_NO_OPTIONS} onChange={v => updateRow("restaurants", index, "invoiceReceived", v)} /></Col>
          </Row>
        </RowPanel>
      ))}
      <Button color="success" onClick={() => addRow("restaurants")}>Add Another Restaurant</Button>
    </>
  );

  const renderExtras = () => (
    <>
      <SectionHeader title="Extras" fileReference={referenceTitle} />
      {!draft?.extras?.length ? <EmptySection label="extra service" /> : null}
      {asArray(draft?.extras).map((row, index) => (
        <RowPanel key={row._sourceKey || index} row={row} removeLabel="Remove Extra" onRemove={() => removeRow("extras", index)}>
          <Row>
            <Col md="2"><Field label="Service Name" value={row.serviceName} onChange={v => updateRow("extras", index, "serviceName", v)} /></Col>
            <Col md="2"><Field label="Supplier" value={row.supplier} onChange={v => updateRow("extras", index, "supplier", v)} /></Col>
            <Col md="2"><Field label="Notes" value={row.notes} onChange={v => updateRow("extras", index, "notes", v)} /></Col>
            <Col md="2"><Field label="Special Rates" value={row.specialRates} onChange={v => updateRow("extras", index, "specialRates", v)} /></Col>
            <Col md="2"><Field label="Itinerary" value={row.itinerary} onChange={v => updateRow("extras", index, "itinerary", v)} /></Col>
            <Col md="2"><Field label="Classification" value={row.classification} onChange={v => updateRow("extras", index, "classification", v)} /></Col>
            <Col md="2"><Field label="Date" type="date" value={row.date} onChange={v => updateRow("extras", index, "date", v)} /></Col>
            <Col md="2"><Field label="Day" value={row.day} onChange={v => updateRow("extras", index, "day", v)} /></Col>
            <Col md="2"><Field label="Time" type="time" value={row.time} onChange={v => updateRow("extras", index, "time", v)} /></Col>
            <Col md="2"><Field label="Status" value={row.status} options={withCurrentOption(RESERVATION_STATUS_OPTIONS, row.status)} onChange={v => updateRow("extras", index, "status", v)} /></Col>
            <Col md="2"><Field label="Pax" type="number" value={row.pax} onChange={v => updateRow("extras", index, "pax", v)} /></Col>
            <Col md="2"><Field label="Pickup" value={row.pickup} options={withCurrentOption(routeOptions, row.pickup)} onChange={v => updateRow("extras", index, "pickup", v)} /></Col>
            <Col md="2"><Field label="Drop Off" value={row.dropOff} options={withCurrentOption(routeOptions, row.dropOff)} onChange={v => updateRow("extras", index, "dropOff", v)} /></Col>
            <Col md="2"><Field label="Invoice Received" value={normalizeYesNoValue(row.invoiceReceived)} options={YES_NO_OPTIONS} onChange={v => updateRow("extras", index, "invoiceReceived", v)} /></Col>
          </Row>
        </RowPanel>
      ))}
      <Button color="success" onClick={() => addRow("extras")}>Add Another Extra</Button>
    </>
  );

  const renderInclusions = () => (
    <>
      <SectionHeader title="Inclusions" fileReference={referenceTitle}>
        <Button color="primary" onClick={handleSave} disabled={saving}>Save Changes</Button>
      </SectionHeader>
      <div className="table-responsive">
        <Table bordered className="align-middle bg-light">
          <thead>
            <tr>
              <th style={{ width: 80 }}>Yes</th>
              <th style={{ width: 80 }}>No</th>
              <th>Inclusion</th>
              <th style={{ width: 130 }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {asArray(draft?.inclusions).map((row, index) => (
              <tr key={row._sourceKey || index}>
                <td><TableCheckbox checked={row.yes} onChange={v => updateRowFields("inclusions", index, { yes: v, no: v ? false : row.no })} /></td>
                <td><TableCheckbox checked={row.no} onChange={v => updateRowFields("inclusions", index, { no: v, yes: v ? false : row.yes })} /></td>
                <td><Input value={text(row.inclusion)} onChange={e => updateRow("inclusions", index, "inclusion", e.target.value)} /></td>
                <td><Button color="danger" size="sm" onClick={() => removeRow("inclusions", index)}>Remove</Button></td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
      <Button color="success" onClick={() => addRow("inclusions")}>Add Inclusion</Button>
    </>
  );

  const renderClients = () => (
    <>
      <SectionHeader title="Clients" fileReference={referenceTitle} />
      <div className="rounded border bg-light p-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div>
            <h5 className="mb-1">Manifest</h5>
            <div className="text-muted">
              Enter passport information for the clients from the manifest popup.
            </div>
          </div>
          <div className="d-flex gap-2 align-items-center">
            <Badge color="info" pill>
              {asArray(draft?.clients).length} client{asArray(draft?.clients).length === 1 ? "" : "s"}
            </Badge>
            <Button color="primary" onClick={() => setManifestOpen(true)}>
              Open Manifest
            </Button>
          </div>
        </div>
      </div>
      <Modal isOpen={manifestOpen} toggle={() => setManifestOpen(false)} size="xl" scrollable>
        <ModalHeader toggle={() => setManifestOpen(false)}>
          Manifest - Client Passport Information
        </ModalHeader>
        <ModalBody>
          <div className="table-responsive">
            <Table bordered className="align-middle bg-light">
              <thead>
                <tr>
                  {[
                    "Type",
                    "Country Code",
                    "Passport No",
                    "Name",
                    "Date of Birth",
                    "Sex",
                    "Date of Issue",
                    "Date of Expiry",
                    "National No",
                    "Place of Birth",
                    "Authority",
                    "Remove",
                  ].map(head => (
                    <th key={head}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {asArray(draft?.clients).map((row, index) => (
                  <tr key={row._sourceKey || index}>
                    <td>
                      <Input value={text(row.type)} onChange={e => updateRow("clients", index, "type", e.target.value)} />
                    </td>
                    <td><Input value={text(row.countryCode)} onChange={e => updateRow("clients", index, "countryCode", e.target.value)} /></td>
                    <td><Input value={text(row.passportNo)} onChange={e => updateRow("clients", index, "passportNo", e.target.value)} /></td>
                    <td><Input value={text(row.name)} onChange={e => updateRow("clients", index, "name", e.target.value)} /></td>
                    <td><Input type="date" value={text(row.dateOfBirth)} onChange={e => updateRow("clients", index, "dateOfBirth", e.target.value)} /></td>
                    <td>
                      <Input
                        type="select"
                        value={row.sex || ""}
                        onChange={e => updateRow("clients", index, "sex", e.target.value)}
                      >
                        <option value="">Select</option>
                        {MANIFEST_SEX_OPTIONS.map(option => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </Input>
                    </td>
                    <td><Input type="date" value={text(row.dateOfIssue)} onChange={e => updateRow("clients", index, "dateOfIssue", e.target.value)} /></td>
                    <td><Input type="date" value={text(row.dateOfExpiry)} onChange={e => updateRow("clients", index, "dateOfExpiry", e.target.value)} /></td>
                    <td><Input value={text(row.nationalNo)} onChange={e => updateRow("clients", index, "nationalNo", e.target.value)} /></td>
                    <td><Input value={text(row.placeOfBirth)} onChange={e => updateRow("clients", index, "placeOfBirth", e.target.value)} /></td>
                    <td><Input value={text(row.authority)} onChange={e => updateRow("clients", index, "authority", e.target.value)} /></td>
                    <td>
                      <Button color="danger" size="sm" onClick={() => removeRow("clients", index)}>
                        X
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </ModalBody>
        <ModalFooter className="justify-content-between">
          <Button color="success" onClick={() => addRow("clients")}>
            Add Another Client
          </Button>
          <div className="d-flex gap-2">
            <Button color="light" className="border" onClick={() => setManifestOpen(false)}>
              Close
            </Button>
            <Button color="primary" onClick={handleSave} disabled={saving}>
              {saving ? <Spinner size="sm" className="me-2" /> : null}
              Save Manifest
            </Button>
          </div>
        </ModalFooter>
      </Modal>
    </>
  );

  const renderAttach = () => (
    <>
      <SectionHeader title="Attach" fileReference={referenceTitle} />
      <div className="rounded border bg-light p-3 mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h5 className="mb-0">Updated/Attached Offers</h5>
          <div className="d-flex gap-2">
            <Button
              color="primary"
              size="sm"
              type="button"
              onClick={handleSaveOfferAttachment}
              disabled={offerUploadSaving || !offerUploadFile}
            >
              {offerUploadSaving ? <Spinner size="sm" className="me-2" /> : null}
              Save Attached Offers
            </Button>
          </div>
        </div>
        <Input type="file" onChange={handleOfferFileSelect} className="mb-2" />
        <div className="text-muted mb-2">
          {offerUploadFile ? `Selected file: ${offerUploadFile.name}` : "No file selected."}
        </div>
        <DropZone onDrop={handleOfferFileDrop}>
          Upload and save any file format here
        </DropZone>
        {asArray(draft?.attach?.offerFiles).length ? (
          <div className="mt-3">
            <div className="fw-semibold mb-2">Saved offer files</div>
            {asArray(draft?.attach?.offerFiles).map((file, index) => (
              <div
                key={file._sourceKey || file.attachmentId || index}
                className="d-flex justify-content-between align-items-center flex-wrap gap-2 border rounded bg-white px-3 py-2 mb-2"
              >
                <div className="text-muted small">
                  {file.fileName || `Offer file ${index + 1}`}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    color="info"
                    size="sm"
                    type="button"
                    onClick={() => handlePreviewAttachment(file.attachmentId)}
                  >
                    Preview
                  </Button>
                  <Button
                    color="secondary"
                    size="sm"
                    type="button"
                    onClick={() => handleDownloadAttachment(file.attachmentId, file.fileName)}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted mt-2">No updated offers attached.</div>
        )}
      </div>
      <div className="rounded border bg-light p-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2">
          <h5 className="mb-0">Email History</h5>
          <div className="d-flex gap-2">
            <Button
              color="primary"
              size="sm"
              type="button"
              onClick={handleSaveEmailAttachment}
              disabled={emailUploadSaving || !emailUploadFile}
            >
              {emailUploadSaving ? <Spinner size="sm" className="me-2" /> : null}
              Save Email History
            </Button>
          </div>
        </div>
        <Input
          type="file"
          accept=".eml,message/rfc822"
          onChange={handleEmailFileSelect}
          className="mb-2"
        />
        <div className="text-muted mb-2">
          {emailUploadFile ? `Selected file: ${emailUploadFile.name}` : "No file selected."}
        </div>
        <DropZone onDrop={handleEmailFileDrop}>
          Drag & drop .eml files here
        </DropZone>
        {asArray(draft?.attach?.emailFiles).length ? (
          <div className="mt-3">
            <div className="fw-semibold mb-2">Saved email files</div>
            {asArray(draft?.attach?.emailFiles).map((file, index) => (
              <div
                key={file._sourceKey || file.attachmentId || index}
                className="d-flex justify-content-between align-items-center flex-wrap gap-2 border rounded bg-white px-3 py-2 mb-2"
              >
                <div className="text-muted small">
                  {file.fileName || `Email file ${index + 1}`}
                </div>
                <div className="d-flex gap-2">
                  <Button
                    color="info"
                    size="sm"
                    type="button"
                    onClick={() => handlePreviewAttachment(file.attachmentId)}
                  >
                    Preview
                  </Button>
                  <Button
                    color="secondary"
                    size="sm"
                    type="button"
                    onClick={() => handleDownloadAttachment(file.attachmentId, file.fileName)}
                  >
                    Download
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted mt-2">No emails uploaded.</div>
        )}
      </div>
    </>
  );

  const renderReminder = () => (
    <>
      <SectionHeader title="Reminder" fileReference={referenceTitle} />
      <div className="rounded border bg-light p-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="text-muted">
            {asArray(draft?.reminders).length
              ? `${asArray(draft?.reminders).length} reminder${asArray(draft?.reminders).length === 1 ? "" : "s"} added.`
              : "No reminders have been added."}
          </div>
          <Button color="primary" type="button" onClick={handleOpenReminder}>
            Add Reminder
          </Button>
        </div>

        {asArray(draft?.reminders).length ? (
          <div className="mt-3">
            {asArray(draft?.reminders).map((row, index) => (
              <div
                key={row._sourceKey || index}
                className="border rounded bg-white px-3 py-2 mb-2"
              >
                <div className="small text-muted mb-1">
                  {row.createdOn ? new Date(row.createdOn).toLocaleString("en-GB") : "-"}
                </div>
                <div>{row.note || "-"}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <Modal isOpen={reminderOpen} toggle={() => setReminderOpen(false)}>
        <ModalHeader toggle={() => setReminderOpen(false)}>Add Reminder</ModalHeader>
        <ModalBody>
          <Label className="form-label fw-semibold">Notes</Label>
          <Input
            type="textarea"
            rows={5}
            value={reminderNote}
            onChange={e => setReminderNote(e.target.value)}
            placeholder="Enter reminder notes"
          />
        </ModalBody>
        <ModalFooter>
          <Button color="light" className="border" onClick={() => setReminderOpen(false)}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSaveReminder}>
            Save Reminder
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );

  const renderLog = () => {
    const logs = asArray(draft?.logs);
    const eventOptions = Array.from(
      new Set(logs.map(row => row?.event || row?.action).filter(Boolean))
    );
    const filteredLogs = logs
      .filter(row => {
        const rowDate = row?.date || "";
        const matchesDateFrom =
          !logFilterDateFrom || (rowDate && rowDate >= logFilterDateFrom);
        const matchesDateTo =
          !logFilterDateTo || (rowDate && rowDate <= logFilterDateTo);
        const matchesEvent =
          !logFilterEvent || (row?.event || row?.action) === logFilterEvent;
        return matchesDateFrom && matchesDateTo && matchesEvent;
      })
      .sort((a, b) => {
        const first = new Date(
          b?.timestamp || `${b?.date || ""}T${b?.time || "00:00"}`
        ).getTime();
        const second = new Date(
          a?.timestamp || `${a?.date || ""}T${a?.time || "00:00"}`
        ).getTime();
        return first - second;
      });

    return (
      <>
        <SectionHeader title="Activity Log" fileReference={referenceTitle} />
        <div className="rounded border bg-light p-3">
          <Row className="g-3 mb-3">
            <Col md="3">
              <Label className="form-label fw-semibold">From Date</Label>
              <Input
                type="date"
                value={logFilterDateFrom}
                onChange={e => setLogFilterDateFrom(e.target.value)}
              />
            </Col>
            <Col md="3">
              <Label className="form-label fw-semibold">To Date</Label>
              <Input
                type="date"
                value={logFilterDateTo}
                onChange={e => setLogFilterDateTo(e.target.value)}
              />
            </Col>
            <Col md="4">
              <Label className="form-label fw-semibold">Filter by Event</Label>
              <Input
                type="select"
                value={logFilterEvent}
                onChange={e => setLogFilterEvent(e.target.value)}
              >
                <option value="">All Events</option>
                {eventOptions.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Input>
            </Col>
            <Col md="3" className="d-flex align-items-end">
              <Button
                color="light"
                className="border"
                onClick={() => {
                  setLogFilterDateFrom("");
                  setLogFilterDateTo("");
                  setLogFilterEvent("");
                }}
              >
                Clear Filters
              </Button>
            </Col>
          </Row>

          <Table className="mb-0">
            <thead>
              <tr>
                <th>Date</th>
                <th>Time</th>
                <th>User</th>
                <th>Event</th>
                <th>Section</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.length ? (
                filteredLogs.map((row, index) => (
                  <tr key={row._sourceKey || index}>
                    <td>{row.date || "-"}</td>
                    <td>{row.time || "-"}</td>
                    <td>
                      {formatLogUser(
                        row.user,
                        currentUserName,
                        currentUserEmail
                      )}
                    </td>
                    <td>{row.event || "-"}</td>
                    <td>{row.section || "-"}</td>
                    <td>{formatLogAction(row.action, currentUserName)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-muted py-4">
                    No log entries match the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </Table>
        </div>
      </>
    );
  };

  const renderActiveSection = () => {
    if (!draft) return null;

    switch (activeSection) {
      case "RES Details":
        return renderResDetails();
      case "General":
        return renderGeneral();
      case "Arr/Dep":
        return renderArrDep();
      case "Hotels":
        return renderHotels();
      case "Transportation":
        return renderTransportation();
      case "Guides":
        return renderGuides();
      case "Entrance":
        return renderEntrance();
      case "Restaurants":
        return renderRestaurants();
      case "Extras":
        return renderExtras();
      case "Inclusions":
        return renderInclusions();
      case "Clients":
        return renderClients();
      case "Attach":
        return renderAttach();
      case "Reminder":
        return renderReminder();
      case "Log":
        return renderLog();
      default:
        return null;
    }
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Reservations File" breadcrumbItem="Details" />

          <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
            <div>
              <h2 className="mb-1">Reservation: {referenceTitle}</h2>
              <div className="text-muted">
                {draft?.general?.groupName || "-"} | {draft?.general?.agentName || "-"}
              </div>
            </div>
            <div className="d-flex flex-wrap gap-2">
              <Button color="success" onClick={handleSave} disabled={saving || loading || !draft}>
                {saving ? <Spinner size="sm" className="me-2" /> : null}
                Save Full Reservation
              </Button>
              <Button tag={Link} to="/reservation-files" color="danger">
                Cancel Reservation
              </Button>
            </div>
          </div>

          <Card className="mb-3">
            <CardBody className="py-2">
              <div className="d-flex flex-nowrap gap-2 overflow-auto">
                {RESERVATION_SECTIONS.map(section => (
                  <Button
                    key={section}
                    type="button"
                    color={activeSection === section ? "primary" : "light"}
                    className={activeSection === section ? "" : "border"}
                    onClick={() => handleSectionChange(section)}
                  >
                    {section}
                  </Button>
                ))}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody>
              {loading || !draft ? (
                <div className="text-center py-5">
                  <Spinner size="sm" className="me-2" />
                  Loading reservation file...
                </div>
              ) : (
                renderActiveSection()
              )}
            </CardBody>
          </Card>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ReservationFileDetails;
