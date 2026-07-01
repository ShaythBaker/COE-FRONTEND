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
import {
  fetchQuotation,
  fetchQuotationsLookups,
} from "../../store/Quotations/actions";
import { sendQuotationForPricing } from "../../store/QuotationPricing/actions";
import { convertQuotationToReservationFile } from "../../store/ReservationFiles/actions";
import { get, patch } from "../../helpers/api_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import { hasAnyRole } from "../../helpers/coe_roles";
import {
  canSendQuotationForPricing,
  getQuotationReadOnlyMessage,
  getQuotationStatus,
  getQuotationStatusBadgeColor,
  isQuotationReadOnly,
} from "../../helpers/quotation_pricing_helper";
import { generateQuotationPdf } from "../../helpers/quotation_pdf";
import { getAccommodationOptionKey } from "../../helpers/reservation_options";

const PRICE_VIEW_ROLES = ["ACCOUNTING", "COMPANY_ADMIN", "USER_COMPANY"];
const GENERAL_NOTES_ROLES = ["TOUR_OPERATION"];
const APPROVED_FINAL_PRICE_ROLES = ["TOUR_OPERATION"];

const unwrapId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
    if (value.id) return unwrapId(value.id);
  }
  return "";
};

const getTravelAgentLabel = item =>
  item?.AGENT_NAME ||
  item?.COMPANY_NAME ||
  item?.NAME ||
  item?.EMAIL ||
  item?.agentName ||
  item?.companyName ||
  "-";

const getListItemValue = item => unwrapId(item?._id);

const getListItemLabel = item =>
  item?.ITEM_VALUE ||
  item?.LIST_LABEL ||
  item?.LABEL ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  item?.CODE ||
  "-";

const formatDateLabel = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateRangeLabel = (from, to) => {
  const start = formatDateLabel(from);
  const end = formatDateLabel(to);
  if (start !== "-" && end !== "-") return `${start} - ${end}`;
  if (start !== "-") return start;
  if (end !== "-") return end;
  return "-";
};

const asArray = value => (Array.isArray(value) ? value : []);

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

const renderStars = count => {
  const stars = Number(count || 0);
  if (!stars) return "-";
  return "★".repeat(stars);
};

const formatMoney = value => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toFixed(2);
};

const toNumber = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const getDirectAmount = candidates => {
  for (let i = 0; i < candidates.length; i += 1) {
    const amount = Number(candidates[i]);
    if (Number.isFinite(amount)) return amount;
  }

  return 0;
};

const getHotelRate = (row, boardBasis = "BB", pax = 0) => {
  const board = String(boardBasis || "BB").toUpperCase();
  const bb = getDirectAmount([
    row?.BB_RATE_AMOUNT,
    row?.BB_AMOUNT,
    row?.BB_RATE,
    row?.BB_PRICE,
    row?.BB,
    row?.bb,
    row?.ROOM_RATE,
    row?.SEASON_PRICE,
    row?.PRICE,
    row?.RATE,
  ]);
  const hb = getDirectAmount([
    row?.HB_RATE_AMOUNT,
    row?.HB_AMOUNT,
    row?.HB_RATE,
    row?.HB_PRICE,
    row?.HB,
    row?.hb,
  ]);
  const fb = getDirectAmount([
    row?.FB_RATE_AMOUNT,
    row?.FB_AMOUNT,
    row?.FB_RATE,
    row?.FB_PRICE,
    row?.FB,
    row?.fb,
  ]);
  const ss = getDirectAmount([
    row?.SINGLE_SUPPLIMENT_AMOUNT,
    row?.SS_RATE_AMOUNT,
    row?.SS_AMOUNT,
    row?.SS_RATE,
    row?.SS_PRICE,
    row?.SS,
    row?.ss,
  ]);

  let rate = bb;
  if (board === "HB") rate += hb;
  if (board === "FB") rate += fb;
  if (Number(pax) === 1) rate += ss;

  return rate;
};

const getOptionHotelRows = (option, boardBasis, pax) => {
  const rows = [];
  const cityGroups = asArray(option?.CITY_GROUPS);

  cityGroups.forEach(cityGroup => {
    asArray(cityGroup?.STAYS).forEach(stay => {
      const seasons = asArray(stay?.SEASONS).length
        ? asArray(stay.SEASONS)
        : [stay?.SEASON_RATES || stay || {}];

      seasons.forEach((season, seasonIndex) => {
        const nights = toNumber(
          season?.NIGHTS ??
            season?.TOTAL_NIGHTS ??
            stay?.NIGHTS ??
            cityGroup?.TOTAL_NIGHTS
        );
        const rate = getHotelRate(
          { ...(stay?.SEASON_RATES || {}), ...season },
          boardBasis,
          pax
        );

        rows.push({
          cityName: cityGroup?.CITY_NAME || stay?.HOTEL_CITY_VALUE || "-",
          hotelName: stay?.HOTEL_NAME || "-",
          hotelStars: stay?.HOTEL_STARS || option?.SELECTED_HOTEL_STARS || "",
          seasonName:
            season?.SEASON_NAME ||
            season?.HOTEL_SEASON_VALUE ||
            stay?.SEASON_NAME ||
            `Season ${seasonIndex + 1}`,
          seasonStartDate:
            season?.FROM_DATE ||
            season?.START_DATE ||
            season?.DATE_FROM ||
            stay?.FROM_DATE ||
            stay?.START_DATE ||
            "",
          seasonEndDate:
            season?.TO_DATE ||
            season?.END_DATE ||
            season?.DATE_TO ||
            stay?.TO_DATE ||
            stay?.END_DATE ||
            "",
          overnightDate: stay?.OVERNIGHT_DATE || cityGroup?.OVERNIGHT_DATE || "",
          nights,
          costNights: nights,
          bb: getDirectAmount([
            season?.BB_RATE_AMOUNT,
            season?.BB_AMOUNT,
            season?.BB_RATE,
            season?.BB_PRICE,
            season?.BB,
            season?.bb,
          ]),
          hb: getDirectAmount([
            season?.HB_RATE_AMOUNT,
            season?.HB_AMOUNT,
            season?.HB_RATE,
            season?.HB_PRICE,
            season?.HB,
            season?.hb,
          ]),
          fb: getDirectAmount([
            season?.FB_RATE_AMOUNT,
            season?.FB_AMOUNT,
            season?.FB_RATE,
            season?.FB_PRICE,
            season?.FB,
            season?.fb,
          ]),
          ss: getDirectAmount([
            season?.SINGLE_SUPPLIMENT_AMOUNT,
            season?.SS_RATE_AMOUNT,
            season?.SS_AMOUNT,
            season?.SS_RATE,
            season?.SS_PRICE,
            season?.SS,
            season?.ss,
          ]),
          rate,
          total: rate * nights,
        });
      });
    });
  });

  return rows;
};

const getSupplementAmount = (row, key) =>
  toNumber(row?.[key] ?? row?.[key.toUpperCase()] ?? row?.[`${key}_RATE`]);

const getUsedSeasonRate = (row, boardBasis, pax) => {
  const board = String(boardBasis || "BB").toUpperCase();
  const bb = getSupplementAmount(row, "bb");
  const hb = getSupplementAmount(row, "hb");
  const fb = getSupplementAmount(row, "fb");
  const ss = getSupplementAmount(row, "ss");
  let amount = bb;

  if (board === "HB") amount += hb;
  if (board === "FB") amount += fb;
  if (Number(pax) === 1) amount += ss;

  return amount;
};

const buildFormulaLabel = (boardBasis, nights, pax) => {
  const parts = [String(boardBasis || "BB").toUpperCase()];
  if (Number(pax) === 1) parts.push("SS");
  return `${parts.join(" + ")} x ${nights || 0}`;
};

const buildSeasonSummaryRows = (rows, boardBasis, pax, priceFactor = 1) => {
  const factor = Number.isFinite(Number(priceFactor)) && Number(priceFactor) > 0
    ? Number(priceFactor)
    : 1;
  const normalizedRows = asArray(rows).map((row, index) => {
    const nights = toNumber(row?.costNights ?? row?.nights);
    const displayNights = nights || toNumber(row?.nights) || 0;
    const usedRate = getUsedSeasonRate(row, boardBasis, pax) * factor;
    const price = toNumber(row?.costStayPerPerson ?? row?.stayPerPerson) * factor;

    return {
      key: `${row?.cityName || row?.CITY_NAME || "city"}-${row?.hotelName || row?.HOTEL_NAME || "hotel"}-${row?.seasonName || row?.SEASON_NAME || "season"}-${index}`,
      cityName: row?.cityName || row?.CITY_NAME || "-",
      hotelName: row?.hotelName || row?.HOTEL_NAME || "-",
      hotelStars: row?.hotelStars || row?.HOTEL_STARS || row?.selectedStars || "",
      seasonName: row?.seasonName || row?.SEASON_NAME || "-",
      seasonDuration:
        row?.seasonDuration ||
        getSeasonLabel({
          SEASON_NAME: row?.seasonName || row?.SEASON_NAME,
          FROM_DATE: row?.seasonStartDate || row?.FROM_DATE,
          TO_DATE: row?.seasonEndDate || row?.TO_DATE,
        }),
      overnightDate: row?.overnightDate || row?.OVERNIGHT_DATE || "",
      nights: displayNights,
      usedRate: usedRate || toNumber(row?.perPerson ?? row?.rate),
      formula: buildFormulaLabel(boardBasis, displayNights, pax),
      price: price || usedRate * displayNights,
      bb: getSupplementAmount(row, "bb") * factor,
      hb: getSupplementAmount(row, "hb") * factor,
      fb: getSupplementAmount(row, "fb") * factor,
      ss: getSupplementAmount(row, "ss") * factor,
      isApplicable: nights > 0 || toNumber(row?.costStayPerPerson) > 0,
    };
  });

  const applicableRows = normalizedRows.filter(row => row.isApplicable);
  return applicableRows.length ? applicableRows : normalizedRows;
};

const getAmount = value => {
  const candidates = [
    value?.PRICE,
    value?.RATE,
    value?.AMOUNT,
    value?.TOTAL,
    value?.FINAL_TOTAL,
    value?.ENTRANCE_FEE_AMOUNT,
    value?.MEAL_PRICE_PER_PERSON,
    value?.SERVICE_PRICE,
    value?.SELLING_PRICE,
    value?.COST,
    value?.ROOM_RATE,
    value?.SEASON_PRICE,
    value?.BB_RATE,
    value?.HB_RATE,
    value?.FB_RATE,
    value?.SGL_RATE,
    value?.DBL_RATE,
    value?.TPL_RATE,
  ];

  for (let i = 0; i < candidates.length; i += 1) {
    const n = Number(candidates[i]);
    if (Number.isFinite(n)) return n;
  }

  return null;
};

const getSeasonLabel = season => {
  if (!season) return "-";

  const name =
    season?.SEASON_NAME ||
    season?.HOTEL_SEASON_VALUE ||
    season?.HOTELSEASON_VALUE ||
    season?.ITEM_VALUE ||
    "";

  const from =
    season?.FROM_DATE ||
    season?.START_DATE ||
    season?.DATE_FROM ||
    "";
  const to =
    season?.TO_DATE ||
    season?.END_DATE ||
    season?.DATE_TO ||
    "";

  if (name && from && to) return `${name} (${from} → ${to})`;
  if (name) return name;
  if (from && to) return `${from} → ${to}`;
  return "-";
};

const normalizeDay = day => {
  const basic = day?.basic || day || {};
  const route = day?.route || {};
  const transportation = day?.transportation || {};
  const mealsNode = day?.meals || {};
  const entranceFeesNode = day?.entranceFees || {};
  const mealsRows = asArray(mealsNode?.rows || day?.MEALS);
  const entranceRows = asArray(
    entranceFeesNode?.selectedPlaces || day?.ENTRANCE_FEES || day?.NTRANCE_FEES || day?.PLACES
  );
  const transportationRows = asArray(
    transportation?.TRANSPORTATION_RESOLVED || day?.TRANSPORTATION_RESOLVED
  );
  const routeCities = asArray(route?.cities)
    .map(city => city?.CITY_NAME)
    .filter(Boolean);

  return {
    _id: basic?._id || day?._id || "",
    DAY_ORDER: basic?.DAY_ORDER ?? day?.DAY_ORDER ?? null,
    DAY_DATE: basic?.DAY_DATE || day?.DAY_DATE || "",
    ROUTE_TEXT: route?.text || basic?.ROUTE_TEXT || day?.ROUTE_TEXT || "",
    routeCities,
    transportationRows,
    guide: day?.guide || {},
    mealsRows,
    entranceRows,
    overnight: day?.overnight || {},
  };
};

const normalizeAccommodationOptions = response => {
  const allEntries = asArray(response);

  return allEntries.flatMap(entry =>
    asArray(entry?.OPTIONS).map((option, index) => {
      const cityGroups = asArray(option?.CITY_GROUPS).map((cityGroup, cgIndex) => ({
        key: `${option?.OPTION_NAME || "option"}-${cityGroup?.CITY_NAME || "city"}-${cgIndex}`,
        cityName: cityGroup?.CITY_NAME || cityGroup?.HOTEL_CITY_VALUE || "-",
        overnightDate: cityGroup?.OVERNIGHT_DATE || "",
        totalNights: cityGroup?.TOTAL_NIGHTS || 0,
        stays: asArray(cityGroup?.STAYS).sort(
          (a, b) => (a?.ORDER || 0) - (b?.ORDER || 0)
        ),
      }));

      const flattenedStays = cityGroups.flatMap(group =>
        group.stays.map(stay => ({
          ...stay,
          SEASONS: asArray(stay?.SEASONS),
        }))
      );

      return {
        key: getAccommodationOptionKey(entry, index),
        optionName: option?.OPTION_NAME || `Option ${index + 1}`,
        selectedStars: option?.SELECTED_HOTEL_STARS || "",
        totalNights: option?.TOTAL_NIGHTS || 0,
        arrivingDate:
          entry?.ARRAIVING_DATE || entry?.PAYLOAD_SNAPSHOT?.ARRAIVING_DATE || "",
        departureDate:
          entry?.DEPARTURE_DATE || entry?.PAYLOAD_SNAPSHOT?.DEPARTURE_DATE || "",
        cityGroups,
        stays: flattenedStays,
      };
    })
  );
};

const SummaryHeader = ({ icon, title, subtitle, children }) => (
  <div className="d-flex align-items-start justify-content-between flex-wrap gap-3 mb-4">
    <div className="d-flex align-items-center gap-3">
      <div
        className="rounded-circle d-flex align-items-center justify-content-center bg-light"
        style={{ width: 48, height: 48 }}
      >
        <i className={`${icon} font-size-22 text-primary`} />
      </div>
      <div>
        <h4 className="card-title mb-1">{title}</h4>
        {subtitle ? <p className="text-muted mb-0">{subtitle}</p> : null}
      </div>
    </div>
    {children ? <div>{children}</div> : null}
  </div>
);

const SummaryField = ({ icon, label, value }) => (
  <div className="d-flex align-items-start gap-3 h-100 rounded border bg-white p-3">
    <div
      className="rounded bg-light d-flex align-items-center justify-content-center"
      style={{ width: 38, height: 38, minWidth: 38 }}
    >
      <i className={`${icon} text-primary font-size-18`} />
    </div>
    <div className="min-w-0">
      <div className="text-muted small mb-1">{label}</div>
      <div className="fw-semibold text-dark text-break">{value || "-"}</div>
    </div>
  </div>
);

const SummaryMetric = ({ icon, label, value }) => (
  <div className="rounded border bg-light px-3 py-2 h-100">
    <div className="d-flex align-items-center gap-2 text-muted small mb-1">
      <i className={icon} />
      <span>{label}</span>
    </div>
    <div className="fw-bold font-size-18 text-dark">{value || "-"}</div>
  </div>
);

const StatCard = ({ icon, label, value, subtitle }) => (
  <Card className="border-0 shadow-sm h-100 mb-0">
    <CardBody>
      <div className="d-flex align-items-center gap-3">
        <div
          className="rounded-circle bg-light d-flex align-items-center justify-content-center"
          style={{ width: 46, height: 46, minWidth: 46 }}
        >
          <i className={`${icon} font-size-20 text-primary`} />
        </div>
        <div>
          <div className="text-muted mb-1">{label}</div>
          <h4 className="mb-0">{value}</h4>
          {subtitle ? <div className="text-muted small mt-1">{subtitle}</div> : null}
        </div>
      </div>
    </CardBody>
  </Card>
);

const EmptyState = ({ text }) => (
  <div className="text-center py-5 text-muted">
    <i className="bx bx-info-circle font-size-24 d-block mb-2" />
    {text}
  </div>
);

const LoadingState = ({ text = "Loading..." }) => (
  <div className="text-center py-5">
    <Spinner size="sm" className="me-2" />
    {text}
  </div>
);

const Pill = ({ icon, text, color = "light" }) => (
  <Badge color={color} className="rounded-pill px-3 py-2 fw-normal">
    {icon ? <i className={`${icon} me-1`} /> : null}
    {text}
  </Badge>
);

const FinalOptionMetric = ({ label, value, subtitle, tone = "light", icon }) => {
  const toneClass =
    tone === "primary"
      ? "bg-primary bg-opacity-10 border-primary border-opacity-25"
      : tone === "success"
      ? "bg-success bg-opacity-10 border-success border-opacity-25"
      : "bg-white";

  return (
    <div className={`rounded border p-3 h-100 ${toneClass}`}>
      <div className="d-flex align-items-start justify-content-between gap-2 mb-2">
        <div className="text-muted small">{label}</div>
        {icon ? <i className={`${icon} text-primary font-size-18`} /> : null}
      </div>
      <div className="h4 mb-1 text-dark">{formatMoney(value)}</div>
      <div className="text-muted small">{subtitle}</div>
    </div>
  );
};

const FinalOptionPriceSummary = ({ option }) => {
  const sourceRows = [
    { label: "Accommodation", value: option.hotelsDisplayPrice },
    { label: "Shared services", value: option.sharedDisplayPrice },
  ].filter(row => toNumber(row.value) > 0);

  return (
    <div className="rounded overflow-hidden border bg-white mb-3">
      <div className="bg-light px-3 py-3 border-bottom">
        <div className="d-flex flex-wrap align-items-start justify-content-between gap-3">
          <div>
            <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
              <Badge color="primary" pill>
                Option {option.optionIndex + 1}
              </Badge>
              <h5 className="mb-0">{option.optionName}</h5>
              {option.optionStars ? (
                <Badge color="light" className="text-dark border" pill>
                  {option.optionStars} Stars
                </Badge>
              ) : null}
            </div>
            <div className="text-muted small">
              Full price source: hotel seasons, board basis, shared daily costs,
              and final person total.
            </div>
          </div>
          <div className="text-end">
            <div className="text-muted small">Final Total / Person</div>
            <div className="display-6 mb-0 fw-bold text-primary">
              {formatMoney(option.finalPerPerson)}
            </div>
          </div>
        </div>
      </div>

      <div className="p-3">
        <Row className="g-3 mb-3">
          <Col md="6">
            <FinalOptionMetric
              icon="bx bx-hotel"
              label="Hotels / Person"
              value={option.hotelsDisplayPrice}
              subtitle="Selected hotel seasons and board basis"
            />
          </Col>
          <Col md="6">
            <FinalOptionMetric
              icon="bx bx-trip"
              label="Shared / Person"
              value={option.sharedDisplayPrice}
              subtitle="Transport, meals, fees, guide, services"
            />
          </Col>
        </Row>

        <div className="d-flex flex-wrap gap-2">
          {sourceRows.map(row => (
            <Badge
              key={row.label}
              color="light"
              className="text-dark border rounded-pill px-3 py-2 fw-normal"
            >
              <span className="text-muted">{row.label}</span>{" "}
              <span className="fw-semibold">{formatMoney(row.value)}</span>
            </Badge>
          ))}
          <Badge color="primary" className="rounded-pill px-3 py-2 fw-normal">
            Final {formatMoney(option.finalPerPerson)}
          </Badge>
        </div>
      </div>
    </div>
  );
};

const FinalSeasonSummaryTable = ({ rows }) => {
  if (!rows?.length) return null;

  return (
    <div className="rounded overflow-hidden border bg-white mb-3">
      <div className="bg-light px-3 py-2 border-bottom">
        <div className="fw-semibold">Hotel Season Price Summary</div>
        <div className="text-muted small">
          Applicable hotel seasons, dates, supplements, used rate, and selected
          season price.
        </div>
      </div>
      <div className="table-responsive">
        <table className="table table-sm align-middle mb-0">
          <thead className="table-light">
            <tr>
              <th>City</th>
              <th>Hotel</th>
              <th>Season</th>
              <th>Dates</th>
              <th className="text-end">Nights</th>
              <th>Supplements</th>
              <th className="text-end">Used Rate</th>
              <th>Formula</th>
              <th className="text-end">Price</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.key}>
                <td className="fw-semibold">{row.cityName}</td>
                <td>{row.hotelName}</td>
                <td>
                  <div className="fw-semibold text-primary">{row.seasonName}</div>
                  {row.overnightDate ? (
                    <div className="text-muted small">
                      Overnight: {formatDateLabel(row.overnightDate)}
                    </div>
                  ) : null}
                </td>
                <td>{row.seasonDuration}</td>
                <td className="text-end">{row.nights}</td>
                <td style={{ minWidth: 180 }}>
                  <div className="d-flex flex-wrap gap-1">
                    {[
                      ["BB", row.bb],
                      ["HB", row.hb],
                      ["FB", row.fb],
                      ["SS", row.ss],
                    ].map(([label, value]) => (
                      <Badge
                        key={label}
                        color={value > 0 ? "light" : "secondary"}
                        className={`border fw-normal ${
                          value > 0 ? "text-dark" : "bg-opacity-10"
                        }`}
                      >
                        {label} {formatMoney(value)}
                      </Badge>
                    ))}
                  </div>
                </td>
                <td className="text-end fw-semibold">{formatMoney(row.usedRate)}</td>
                <td>{row.formula}</td>
                <td className="text-end fw-bold text-primary">
                  {formatMoney(row.price)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const buildFinalSupplementRows = (rows, optionName, optionStars) =>
  ["BB", "HB", "FB", "SS"]
    .map(label => {
      const key = label.toLowerCase();
      const price = asArray(rows)
        .filter(row => Number(row?.nights) > 0)
        .reduce((sum, row) => sum + toNumber(row?.[key]), 0);

      return {
        key: `${optionName}-${label}`,
        optionName,
        optionStars,
        supplement: label,
        price,
      };
    })
    .filter(row => row.price > 0);

const FinalSupplementPriceTable = ({ option }) => {
  const rows = buildFinalSupplementRows(
    option.seasonSummaryRows,
    option.optionName,
    option.optionStars
  );

  if (!rows.length) return null;

  return (
    <div className="table-responsive bg-white border rounded mb-3">
      <table className="table table-sm align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>Option Name</th>
            <th>Stars</th>
            <th>Supplement</th>
            <th className="text-end">Price</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.key}>
              <td>{row.optionName}</td>
              <td>{row.optionStars ? `${row.optionStars} Stars` : "-"}</td>
              <td className="fw-semibold">{row.supplement}</td>
              <td className="text-end fw-semibold">{formatMoney(row.price)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const FinalHotelSeasonTable = ({ rows }) => {
  const visibleRows = asArray(rows).filter(row => Number(row?.nights) > 0);

  if (!visibleRows.length) return null;

  return (
    <div className="table-responsive bg-white border rounded mb-3">
      <table className="table table-sm align-middle mb-0">
        <thead className="table-light">
          <tr>
            <th>City</th>
            <th>Hotel</th>
            <th>Season</th>
            <th>Season Dates</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row, rowIndex) => (
            <tr key={`${row.hotelName}-${row.seasonName}-${rowIndex}`}>
              <td>{row.cityName}</td>
              <td className="fw-semibold">{row.hotelName}</td>
              <td>{row.seasonName}</td>
              <td>
                {formatDateRangeLabel(row.seasonStartDate, row.seasonEndDate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const QuotationsDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selected, loading, lookups } = useSelector(s => s.Quotations || {});
  const pricingSaving = useSelector(s => s.QuotationPricing?.saving || false);
  const reservationSaving = useSelector(s => s.ReservationFiles?.saving || false);
  const roles = useSelector(s => s.Login?.roles || []);
  const canViewPrices = hasAnyRole(roles, PRICE_VIEW_ROLES);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [daysRoutes, setDaysRoutes] = useState([]);
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [finalPricing, setFinalPricing] = useState(null);
  const [finalPricingLoading, setFinalPricingLoading] = useState(false);
  const [expandedFinalOptionKey, setExpandedFinalOptionKey] = useState("");
  const [generalNotesOpen, setGeneralNotesOpen] = useState(false);
  const [generalNotes, setGeneralNotes] = useState("");
  const [generalNotesTouched, setGeneralNotesTouched] = useState(false);
  const [generalNotesSaving, setGeneralNotesSaving] = useState(false);
  const [pdfGenerating, setPdfGenerating] = useState(false);
  const [reservationOptionModalOpen, setReservationOptionModalOpen] =
    useState(false);
  const [reservationAccommodationOptionKey, setReservationAccommodationOptionKey] =
    useState("");

  useEffect(() => {
    if (id) {
      dispatch(fetchQuotationsLookups());
      dispatch(fetchQuotation(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    setGeneralNotes(selected?.GENERAL_NOTES || "");
    setGeneralNotesTouched(false);
  }, [selected?.GENERAL_NOTES]);

  useEffect(() => {
    let ignore = false;

    const loadSummary = async () => {
      if (!id) return;

      setSummaryLoading(true);

      try {
        const [daysRes, accommodationRes, extrasRes] = await Promise.all([
          get(`/quotation-days/quotation/${id}`),
          get(`/quotation-accumidation?QUOTATION_ID=${encodeURIComponent(id)}`),
          get(`/quotation_extra_services?QUOTATION_ID=${encodeURIComponent(id)}`),
        ]);

        if (ignore) return;

        const normalizedDays = asArray(daysRes)
          .map(normalizeDay)
          .sort((a, b) => (a?.DAY_ORDER || 0) - (b?.DAY_ORDER || 0));

        setDaysRoutes(normalizedDays);
        setAccommodationOptions(normalizeAccommodationOptions(accommodationRes));
        setExtraServices(asArray(extrasRes));
      } catch (error) {
        if (!ignore) {
          notifyError(
            getErrorMessage(error, "Failed to load quotation summary.")
          );
        }
      } finally {
        if (!ignore) {
          setSummaryLoading(false);
        }
      }
    };

    loadSummary();

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let ignore = false;

    const loadFinalPricing = async () => {
      if (!id) return;

      setFinalPricingLoading(true);
      try {
        const res = await get(`/quotation-pricing/quotation/${id}/final`);
        if (!ignore) {
          setFinalPricing(res || null);
        }
      } catch (error) {
        if (!ignore) {
          setFinalPricing(null);
        }
      } finally {
        if (!ignore) {
          setFinalPricingLoading(false);
        }
      }
    };

    loadFinalPricing();

    return () => {
      ignore = true;
    };
  }, [id]);

  const travelAgentMap = useMemo(() => {
    const map = new Map();
    (lookups?.travelAgents || []).forEach(item => {
      map.set(unwrapId(item?._id), getTravelAgentLabel(item));
    });
    return map;
  }, [lookups]);

  const selectedTravelAgent = useMemo(() => {
    const travelAgentId = unwrapId(selected?.TRAVEL_AGENT_ID);
    return (
      (lookups?.travelAgents || []).find(
        item => unwrapId(item?._id) === travelAgentId
      ) || null
    );
  }, [lookups?.travelAgents, selected?.TRAVEL_AGENT_ID]);

  const nationalityMap = useMemo(() => {
    const map = new Map();
    (lookups?.COUNTRIES || []).forEach(item => {
      map.set(getListItemValue(item), getListItemLabel(item));
    });
    return map;
  }, [lookups]);

  const quotationTypeMap = useMemo(() => {
    const map = new Map();
    (lookups?.QUOTATION_TYPE || []).forEach(item => {
      map.set(getListItemValue(item), getListItemLabel(item));
    });
    return map;
  }, [lookups]);

  const overnightCities = useMemo(() => {
    const set = new Set();

    daysRoutes.forEach(day => {
      if (day?.overnight?.OVERNIGHT_CITY_NAME) {
        set.add(day.overnight.OVERNIGHT_CITY_NAME);
      }
    });

    return Array.from(set);
  }, [daysRoutes]);

  const allMeals = useMemo(() => {
    const set = new Set();

    daysRoutes.forEach(day => {
      day.mealsRows.forEach(meal => {
        if (meal?.MEAL_NAME || meal?.MEAL_TYPE) {
          set.add(meal?.MEAL_NAME || meal?.MEAL_TYPE);
        }
      });
    });

    return Array.from(set);
  }, [daysRoutes]);

  const allPlaces = useMemo(() => {
    const set = new Set();

    daysRoutes.forEach(day => {
      day.entranceRows.forEach(place => {
        if (place?.PLACE_NAME) set.add(place.PLACE_NAME);
      });
    });

    return Array.from(set);
  }, [daysRoutes]);

  const quotationStatus = getQuotationStatus(selected);
  const readOnly = isQuotationReadOnly(selected);
  const readOnlyMessage = getQuotationReadOnlyMessage(selected);
  const isApprovedQuotation = quotationStatus === "APPROVED";
  const canSendForPricing = canSendQuotationForPricing(selected);
  const canEditGeneralNotes =
    isApprovedQuotation && hasAnyRole(roles, GENERAL_NOTES_ROLES);
  const generalNotesError =
    generalNotes.length > 5000 ? "General notes must be 5000 characters or fewer." : "";
  const referenceNumber = selected?.REFERANCE_NUMBER || "-";
  const travelAgentName =
    selected?.TRAVEL_AGENT_NAME ||
    travelAgentMap.get(selected?.TRAVEL_AGENT_ID) ||
    "-";
  const nationalityName =
    selected?.NATIONALITY_VALUE ||
    nationalityMap.get(selected?.NATIONALITY) ||
    "-";
  const quotationTypeName =
    selected?.QUOTATION_TYPE_VALUE ||
    quotationTypeMap.get(selected?.QUOTATION_TYPE) ||
    "-";
  const validityDays =
    selected?.QUOTATION_DURATION_DAYS ??
    selected?.DURATION_IN_DAYS ??
    "-";
  const tripDays = selected?.NUMBER_OF_DAYS ?? selected?.TRIP_DAYS ?? "-";
  const tripNights =
    selected?.NUMBER_OF_NIGHTS ??
    (tripDays === "-" ? "-" : Math.max(0, Number(tripDays) - 1));
  const paxCount = selected?.NUMBER_OF_PAX ?? "-";
  const hasGeneralNotes = String(selected?.GENERAL_NOTES || "").trim().length > 0;

  const handleSaveGeneralNotes = async () => {
    setGeneralNotesTouched(true);

    if (!canEditGeneralNotes) {
      notifyError("Only TOUR_OPERATION can update general notes for approved quotations.");
      return;
    }

    if (generalNotesError) {
      notifyError(generalNotesError);
      return;
    }

    setGeneralNotesSaving(true);

    try {
      await patch(`/quotations/${selected?._id || id}`, {
        GENERAL_NOTES: generalNotes,
      });
      notifySuccess("General notes saved successfully.");
      setGeneralNotesOpen(false);
      dispatch(fetchQuotation(id));
    } catch (error) {
      notifyError(getErrorMessage(error, "Failed to save general notes."));
    } finally {
      setGeneralNotesSaving(false);
    }
  };

  const handleSendForPricing = () => {
    if (!selected?._id && !id) {
      notifyError("Quotation id is missing.");
      return;
    }

    if (!canSendForPricing) {
      notifyError("This quotation cannot be sent for pricing.");
      return;
    }

    dispatch(sendQuotationForPricing(selected?._id || id, {}));
  };

  const handleConvertToReservationFile = () => {
    const quotationId = selected?._id || id;

    if (!quotationId) {
      notifyError("Quotation id is missing.");
      return;
    }

    if (!isApprovedQuotation) {
      notifyError("Only approved quotations can be converted to reservation files.");
      return;
    }

    if (accommodationOptions.length > 1 && !reservationAccommodationOptionKey) {
      setReservationAccommodationOptionKey(accommodationOptions[0]?.key || "");
      setReservationOptionModalOpen(true);
      return;
    }

    const selectedOption = accommodationOptions.find(
      option => option.key === reservationAccommodationOptionKey
    );

    dispatch(
      convertQuotationToReservationFile(
        quotationId,
        selectedOption
          ? {
              accommodationSelection: {
                optionKey: selectedOption.key,
                label: selectedOption.optionName || "Selected accommodation option",
              },
            }
          : {},
        reservationFile => {
          if (reservationFile?._id) {
            navigate(`/reservation-files/${reservationFile._id}`);
          }
        }
      )
    );
  };

  const handleCloseReservationOptionModal = () => {
    setReservationOptionModalOpen(false);
    setReservationAccommodationOptionKey("");
  };

  const isApprovedFinalPricing =
    String(finalPricing?.STATUS || "").toUpperCase().trim() === "APPROVED";
  const canViewApprovedFinalPrice =
    isApprovedQuotation && hasAnyRole(roles, APPROVED_FINAL_PRICE_ROLES);

  const approvedFinalOptions = useMemo(() => {
    if (!isApprovedFinalPricing) return [];

    const directOptionSummaries =
      finalPricing?.OPTION_SUMMARIES ||
      finalPricing?.FINAL_OPTIONS ||
      finalPricing?.PRICING_VIEW?.optionSummaries ||
      finalPricing?.SNAPSHOT?.OPTION_SUMMARIES ||
      finalPricing?.SNAPSHOT?.FINAL_OPTIONS ||
      finalPricing?.SNAPSHOT?.PRICING_VIEW?.optionSummaries ||
      [];

    if (Array.isArray(directOptionSummaries) && directOptionSummaries.length > 0) {
      return directOptionSummaries.map((option, index) => {
        const sharedRows = [
          { name: "Transportation", amount: option?.transportation },
          { name: "Meals", amount: option?.meals },
          { name: "Entrance Fees", amount: option?.entranceFees },
          { name: "Guide", amount: option?.guide },
          { name: "Extra Services", amount: option?.extraServices },
        ].filter(row => toNumber(row.amount) > 0);

        const otherRows = asArray(option?.otherPerPersonRows).map(row => ({
          name: row?.name || "Other Service",
          amount: toNumber(row?.pricePerPerson ?? row?.amount),
        }));

        const detailRows = [
          { name: "Accommodation", amount: toNumber(option?.hotelsPerPerson) },
          ...(otherRows.length ? otherRows : sharedRows),
        ]
          .filter(row => toNumber(row.amount) > 0)
          .map(row => ({ ...row, afterProfit: toNumber(row.amount) }));

        const hotelRows = asArray(option?.rows).map(row => ({
          cityName: row?.cityName || row?.CITY_NAME || "-",
          hotelName: row?.hotelName || row?.HOTEL_NAME || "-",
          hotelStars:
            row?.hotelStars ||
            row?.HOTEL_STARS ||
            row?.selectedStars ||
            option?.optionStars ||
            option?.selectedStars ||
            option?.hotelStars ||
            "",
          seasonName: row?.seasonName || row?.SEASON_NAME || "-",
          seasonStartDate:
            row?.seasonStartDate ||
            row?.FROM_DATE ||
            row?.START_DATE ||
            row?.DATE_FROM ||
            "",
          seasonEndDate:
            row?.seasonEndDate ||
            row?.TO_DATE ||
            row?.END_DATE ||
            row?.DATE_TO ||
            "",
          nights: toNumber(row?.costNights ?? row?.nights),
          rateAfterProfit: toNumber(row?.perPerson ?? row?.rate),
          afterProfit: toNumber(row?.costStayPerPerson ?? row?.stayPerPerson ?? row?.total),
        }));

        const hotelsPerPerson = toNumber(option?.hotelsPerPerson);
        const sharedPerPerson = toNumber(option?.sharedPerPersonTotal ?? option?.sharedPerPerson);
        const finalPerPerson = toNumber(option?.finalTotal ?? option?.finalPerPerson);
        const hotelsDisplayPrice =
          toNumber(option?.hotelsDisplayPrice ?? option?.hotelsPerPerson) ||
          hotelsPerPerson;
        const sharedDisplayPrice =
          toNumber(
            option?.sharedDisplayPrice ??
              option?.sharedPerPersonTotal ??
              option?.sharedPerPerson
          ) || sharedPerPerson;
        const basePerPerson =
          toNumber(option?.basePerPerson) ||
          hotelsDisplayPrice + sharedDisplayPrice;
        const profitPerPerson =
          toNumber(option?.profitPerPerson) ||
          Math.max(0, finalPerPerson - basePerPerson);
        const priceFactor = basePerPerson > 0 ? finalPerPerson / basePerPerson : 1;
        const finalHotelsDisplayPrice = hotelsPerPerson * priceFactor;
        const finalSharedDisplayPrice = sharedPerPerson * priceFactor;
        const detailRowsAfterAdjustment = detailRows.map(row => ({
          ...row,
          afterProfit: toNumber(row.afterProfit) * priceFactor,
        }));
        const hotelRowsAfterAdjustment = hotelRows.map(row => ({
          ...row,
          rateAfterProfit: toNumber(row.rateAfterProfit) * priceFactor,
          afterProfit: toNumber(row.afterProfit) * priceFactor,
        }));
        const seasonSummaryRows = buildSeasonSummaryRows(
          option?.rows,
          finalPricing?.BOARD_BASIS || option?.boardBasis || "BB",
          selected?.NUMBER_OF_PAX || 1
        );

        return {
          key: option?.optionKey || `${option?.optionName || "option"}-${index}`,
          optionIndex: Number.isFinite(Number(option?.optionIndex))
            ? Number(option.optionIndex)
            : index,
          optionName: option?.optionName || `Option ${index + 1}`,
          optionStars:
            option?.optionStars ||
            option?.selectedStars ||
            option?.hotelStars ||
            "",
          boardBasis: String(finalPricing?.BOARD_BASIS || option?.boardBasis || "BB").toUpperCase(),
          profitType: String(
            option?.profitType || finalPricing?.PROFIT_TYPE || "PERCENT"
          ).toUpperCase(),
          profitValue: toNumber(option?.profitValue ?? finalPricing?.PROFIT_VALUE),
          hotelsPerPerson,
          sharedPerPerson,
          hotelsDisplayPrice: finalHotelsDisplayPrice || hotelsDisplayPrice,
          sharedDisplayPrice: finalSharedDisplayPrice || sharedDisplayPrice,
          basePerPerson,
          profitPerPerson,
          finalAdjustmentPerPerson: profitPerPerson,
          finalPerPerson,
          detailRows: detailRowsAfterAdjustment,
          hotelRows: hotelRowsAfterAdjustment,
          seasonSummaryRows,
        };
      });
    }

    const snapshot = finalPricing?.SNAPSHOT || {};
    const accommodation = snapshot?.ACCOMMODATION || {};
    const options = asArray(accommodation?.OPTIONS);
    const boardBasis = String(finalPricing?.BOARD_BASIS || snapshot?.BASE_BREAKDOWN?.BOARD_BASIS || "BB").toUpperCase();
    const pax = toNumber(snapshot?.QUOTATION?.NUMBER_OF_PAX || selected?.NUMBER_OF_PAX || 1) || 1;
    const breakdown = snapshot?.BASE_BREAKDOWN || {};
    const sharedCostTotal =
      toNumber(breakdown.TRANSPORTATION) +
      toNumber(breakdown.MEALS) +
      toNumber(breakdown.ENTRANCE_FEES) +
      toNumber(breakdown.GUIDE) +
      toNumber(breakdown.EXTRA_SERVICES);
    const sharedPerPerson = sharedCostTotal / pax;
    const profitType = String(finalPricing?.PROFIT_TYPE || "PERCENT").toUpperCase();
    const profitValue = toNumber(finalPricing?.PROFIT_VALUE);
    const addProportionalProfit = (amount, baseTotal) => {
      if (profitType === "PERCENT") return amount + amount * (profitValue / 100);
      if (!baseTotal) return amount;
      return amount + (amount / baseTotal) * profitValue;
    };

    const fallbackHotelPerPerson =
      options.length <= 1 ? toNumber(breakdown.HOTELS) / pax : 0;

    return options.map((option, index) => {
      const hotelRows = getOptionHotelRows(option, boardBasis, pax);
      const hotelsPerPerson =
        hotelRows.reduce((sum, row) => sum + row.total, 0) || fallbackHotelPerPerson;
      const basePerPerson = hotelsPerPerson + sharedPerPerson;
      const profitPerPerson =
        profitType === "PERCENT" ? basePerPerson * (profitValue / 100) : profitValue;
      const finalPerPerson = basePerPerson + profitPerPerson;
      const priceFactor = basePerPerson > 0 ? finalPerPerson / basePerPerson : 1;

      const detailRows = [
        { name: "Accommodation", amount: hotelsPerPerson },
        { name: "Transportation", amount: toNumber(breakdown.TRANSPORTATION) / pax },
        { name: "Meals", amount: toNumber(breakdown.MEALS) / pax },
        { name: "Entrance Fees", amount: toNumber(breakdown.ENTRANCE_FEES) / pax },
        { name: "Guide", amount: toNumber(breakdown.GUIDE) / pax },
        { name: "Extra Services", amount: toNumber(breakdown.EXTRA_SERVICES) / pax },
      ]
        .filter(row => row.amount > 0)
        .map(row => ({ ...row, afterProfit: addProportionalProfit(row.amount, basePerPerson) }));

      const hotelRowsAfterProfit = hotelRows.map(row => {
        const afterProfit = addProportionalProfit(row.total, basePerPerson);
        return {
          ...row,
          rateAfterProfit: row.nights > 0 ? afterProfit / row.nights : afterProfit,
          afterProfit,
        };
      });

      return {
        key: `${option?.OPTION_NAME || "option"}-${index}`,
        optionIndex: index,
        optionName: option?.OPTION_NAME || `Option ${index + 1}`,
        optionStars: option?.SELECTED_HOTEL_STARS || "",
        boardBasis,
        profitType,
        profitValue,
        hotelsPerPerson,
        sharedPerPerson,
        hotelsDisplayPrice: hotelsPerPerson * priceFactor,
        sharedDisplayPrice: sharedPerPerson * priceFactor,
        basePerPerson,
        profitPerPerson,
        finalAdjustmentPerPerson: profitPerPerson,
        finalPerPerson,
        detailRows,
        hotelRows: hotelRowsAfterProfit,
        seasonSummaryRows: buildSeasonSummaryRows(hotelRows, boardBasis, pax),
      };
    });
  }, [finalPricing, isApprovedFinalPricing, selected?.NUMBER_OF_PAX]);

  const handleDownloadPdf = async () => {
    if (!selected) {
      notifyError("Quotation details are still loading.");
      return;
    }

    if (!isApprovedFinalPricing || approvedFinalOptions.length === 0) {
      notifyError("Approved final price is not available yet.");
      return;
    }

    setPdfGenerating(true);

    try {
      await generateQuotationPdf({
        quotation: selected,
        quotationInfo: {
          referenceNumber,
          travelAgentName,
          travelAgentEmail: selectedTravelAgent?.AGENT_EMAIL || "",
          travelAgentPhone: selectedTravelAgent?.AGENT_PHONE || "",
          travelAgentCountry:
            nationalityMap.get(unwrapId(selectedTravelAgent?.AGENT_COUNTRY)) || "",
          travelAgentLogoAttachmentId:
            unwrapId(selectedTravelAgent?.AGENT_LOGO_ATTACHMENT_ID) || "",
          quotationTypeName,
          nationalityName,
          validityDays,
          tripDays,
          tripNights,
          paxCount,
          quotationStatus,
        },
        approvedFinalOptions,
        daysRoutes,
      });
      notifySuccess("PDF downloaded successfully.");
    } catch (error) {
      notifyError(getErrorMessage(error, "Failed to download quotation PDF."));
    } finally {
      setPdfGenerating(false);
    }
  };

  document.title = "Quotation Details | Skote";

  return (
    <React.Fragment>
      <Modal
        isOpen={reservationOptionModalOpen}
        toggle={handleCloseReservationOptionModal}
        backdrop="static"
      >
        <ModalHeader toggle={handleCloseReservationOptionModal}>
          Choose Accommodation Option
        </ModalHeader>
        <ModalBody>
          <Label className="form-label fw-semibold">Accommodation Option</Label>
          <Input
            type="select"
            value={reservationAccommodationOptionKey}
            onChange={event =>
              setReservationAccommodationOptionKey(event.target.value)
            }
          >
            {accommodationOptions.map(option => (
              <option key={option.key} value={option.key}>
                {option.optionName}
              </option>
            ))}
          </Input>
          <div className="text-muted mt-2">
            The reservation file will use the hotels from this option.
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="light"
            className="border"
            type="button"
            onClick={handleCloseReservationOptionModal}
          >
            Cancel
          </Button>
          <Button
            color="primary"
            type="button"
            disabled={reservationSaving || !reservationAccommodationOptionKey}
            onClick={() => {
              setReservationOptionModalOpen(false);
              handleConvertToReservationFile();
            }}
          >
            {reservationSaving ? <Spinner size="sm" className="me-2" /> : null}
            Convert
          </Button>
        </ModalFooter>
      </Modal>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Quotation Details" />

          {readOnly ? (
            <Alert color="warning" className="mb-4">
              {readOnlyMessage}
            </Alert>
          ) : null}

          {!canViewPrices ? (
            <Alert color="info" className="mb-4">
              Prices are hidden. Only roles ACCOUNTING and USER_COMPANY can view quotation prices.
            </Alert>
          ) : null}

          <Row className="g-3 mb-4">
            <Col xl="8">
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardBody className="p-4">
                  {loading ? (
                    <LoadingState text="Loading quotation details..." />
                  ) : (
                    <>
                      <SummaryHeader
                        icon="bx bx-file"
                        title="Quotation Summary"
                        subtitle="Key quotation information and next steps."
                      >
                        <div className="d-flex flex-wrap gap-2 justify-content-end">
                          {quotationStatus ? (
                            <Badge color={getQuotationStatusBadgeColor(quotationStatus)} pill>
                              {quotationStatus}
                            </Badge>
                          ) : null}
                        </div>
                      </SummaryHeader>

                      <div className="rounded border bg-light p-3 p-md-4 mb-3">
                        <div className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
                          <div>
                            <div className="text-muted small mb-1">Reference Number</div>
                            <h3 className="mb-1 text-dark">{referenceNumber}</h3>
                            <div className="text-muted">
                              {travelAgentName} | {quotationTypeName}
                            </div>
                          </div>

                          <div className="d-flex flex-wrap gap-2 justify-content-md-end">
                            {canSendForPricing ? (
                              <Button
                                color="success"
                                type="button"
                                onClick={handleSendForPricing}
                                disabled={pricingSaving}
                              >
                                {pricingSaving ? (
                                  <Spinner size="sm" className="me-2" />
                                ) : (
                                  <i className="bx bx-send me-1" />
                                )}
                                Send for Pricing
                              </Button>
                            ) : null}

                            {isApprovedQuotation ? (
                              <Button
                                color="success"
                                type="button"
                                onClick={handleConvertToReservationFile}
                                disabled={reservationSaving}
                              >
                                {reservationSaving ? (
                                  <Spinner size="sm" className="me-2" />
                                ) : (
                                  <i className="bx bx-transfer me-1" />
                                )}
                                Convert to Reservation File
                              </Button>
                            ) : null}

                            {isApprovedQuotation ? (
                              <Button
                                color="light"
                                className="border d-flex align-items-center gap-2 px-3 py-2 text-start"
                                type="button"
                                onClick={() => {
                                  setGeneralNotes(selected?.GENERAL_NOTES || "");
                                  setGeneralNotesTouched(false);
                                  setGeneralNotesOpen(true);
                                }}
                              >
                                <span
                                  className="rounded-2 bg-primary-subtle d-flex align-items-center justify-content-center"
                                  style={{ width: 34, height: 34, minWidth: 34 }}
                                >
                                  <i className="bx bx-message-square-detail text-primary font-size-18" />
                                </span>
                                <span>
                                  <span className="d-block fw-semibold text-dark">
                                    General Notes
                                  </span>
                                  <span className="d-block text-muted small">
                                    {hasGeneralNotes ? "View or edit" : "Add note"}
                                  </span>
                                </span>
                              </Button>
                            ) : null}

                            <Link
                              to={`/quotations/${selected?._id || id}/plan`}
                              className="btn btn-info"
                            >
                              <i className="bx bx-map me-1" />
                              Routes and Days
                            </Link>

                            <Link
                              to={`/quotations/${selected?._id || id}/accommodation`}
                              className="btn btn-primary"
                            >
                              <i className="bx bx-hotel me-1" />
                              Accommodation
                            </Link>
                          </div>
                        </div>

                        <Row className="g-3">
                          <Col sm="6" lg="3">
                            <SummaryMetric
                              icon="bx bx-calendar-event"
                              label="Start Date"
                              value={formatDateLabel(selected?.QUOTATION_START_DATE)}
                            />
                          </Col>
                          <Col sm="6" lg="3">
                            <SummaryMetric
                              icon="bx bx-calendar-check"
                              label="End Date"
                              value={formatDateLabel(selected?.QUOTATION_END_DATE)}
                            />
                          </Col>
                          <Col sm="6" lg="3">
                            <SummaryMetric
                              icon="bx bx-time-five"
                              label="Validity"
                              value={
                                validityDays === "-"
                                  ? "-"
                                  : `${validityDays} day${Number(validityDays) === 1 ? "" : "s"}`
                              }
                            />
                          </Col>
                          <Col sm="6" lg="3">
                            <SummaryMetric
                              icon="bx bx-calendar"
                              label="Trip"
                              value={
                                tripDays === "-"
                                  ? "-"
                                  : `${tripDays} day${Number(tripDays) === 1 ? "" : "s"} / ${tripNights} night${Number(tripNights) === 1 ? "" : "s"}`
                              }
                            />
                          </Col>
                          <Col sm="6" lg="3">
                            <SummaryMetric
                              icon="bx bx-group"
                              label="Pax"
                              value={paxCount}
                            />
                          </Col>
                        </Row>
                      </div>

                      <Row className="g-3">
                        <Col md="6">
                          <SummaryField
                            icon="bx bx-buildings"
                            label="Travel Agent"
                            value={travelAgentName}
                          />
                        </Col>
                        <Col md="6">
                          <SummaryField
                            icon="bx bx-id-card"
                            label="Quotation Type"
                            value={quotationTypeName}
                          />
                        </Col>
                        <Col md="6">
                          <SummaryField
                            icon="bx bx-flag"
                            label="Nationality"
                            value={nationalityName}
                          />
                        </Col>
                        <Col md="6">
                          <SummaryField
                            icon="bx bx-calendar-plus"
                            label="Created"
                            value={formatDateLabel(selected?.CREATED_ON)}
                          />
                        </Col>
                        <Col md="6">
                          <SummaryField
                            icon="bx bx-refresh"
                            label="Last Updated"
                            value={formatDateLabel(selected?.UPDATED_ON)}
                          />
                        </Col>
                      </Row>
                    </>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col xl="4">
              <Row className="g-3">
                <Col md="6" xl="12">
                  <StatCard
                    icon="bx bx-calendar"
                    label="Days"
                    value={daysRoutes.length}
                    subtitle="Planned quotation days"
                  />
                </Col>
                <Col md="6" xl="12">
                  <StatCard
                    icon="bx bx-hotel"
                    label="Accommodation Options"
                    value={accommodationOptions.length}
                    subtitle="Available hotel options"
                  />
                </Col>
                <Col md="6" xl="12">
                  <StatCard
                    icon="bx bx-gift"
                    label="Extra Services"
                    value={extraServices.length}
                    subtitle="Additional included services"
                  />
                </Col>
                <Col md="6" xl="12">
                  <StatCard
                    icon="bx bx-moon"
                    label="Overnight Cities"
                    value={overnightCities.length}
                    subtitle={overnightCities.join(" • ") || "No overnight cities"}
                  />
                </Col>
              </Row>
            </Col>
          </Row>

          {canViewApprovedFinalPrice ? (
            <Row className="mb-4">
              <Col xl="12">
                <Card className="border-0 shadow-sm">
                  <CardBody className="p-4">
                    <SummaryHeader
                      icon="bx bx-badge-dollar"
                      title="Final Price"
                      subtitle="Approved option prices."
                    >
                      {isApprovedFinalPricing && approvedFinalOptions.length > 0 ? (
                        <Button
                          color="primary"
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={pdfGenerating || summaryLoading}
                        >
                          {pdfGenerating ? (
                            <Spinner size="sm" className="me-2" />
                          ) : (
                            <i className="bx bx-download me-1" />
                          )}
                          Download as PDF file
                        </Button>
                      ) : null}
                    </SummaryHeader>
                    {finalPricingLoading ? (
                      <LoadingState text="Loading approved final price..." />
                    ) : !isApprovedFinalPricing ? (
                      <EmptyState text="The final approved price is not available yet." />
                    ) : approvedFinalOptions.length === 0 ? (
                      <EmptyState text="No approved option prices were found." />
                    ) : (
                      <div className="border rounded overflow-hidden">
                        {approvedFinalOptions.map((option, index) => {
                          const isOpen = expandedFinalOptionKey === option.key;

                          return (
                            <div
                              key={option.key}
                              className={index === 0 ? "" : "border-top"}
                            >
                              <button
                                type="button"
                                className="btn btn-link w-100 text-start text-decoration-none p-3 bg-white"
                                onClick={() =>
                                  setExpandedFinalOptionKey(isOpen ? "" : option.key)
                                }
                              >
                                <div className="d-flex align-items-center justify-content-between gap-3 flex-wrap">
                                  <div className="d-flex align-items-center gap-2">
                                    <i
                                      className={`bx ${
                                        isOpen ? "bx-chevron-down" : "bx-chevron-right"
                                      } font-size-18 text-primary`}
                                    />
                                    <div>
                                      <div className="fw-semibold text-dark">
                                        {option.optionName}
                                      </div>
                                      <div className="text-muted small">
                                        Board basis {option.boardBasis} | price
                                      </div>
                                    </div>
                                  </div>
                                  <div className="text-end">
                                    <div className="text-muted small">Final Total</div>
                                    <div className="h4 mb-0 text-primary">
                                      {formatMoney(option.finalPerPerson)}
                                    </div>
                                  </div>
                                </div>
                              </button>

                              {isOpen ? (
                                <div className="bg-light border-top p-3">
                                  <FinalHotelSeasonTable rows={option.hotelRows} />
                                  <FinalSupplementPriceTable option={option} />
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardBody>
                </Card>
              </Col>
            </Row>
          ) : null}

          <Row className="g-3 mb-4">
            <Col xl="12">
              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <SummaryHeader
                    icon="bx bx-list-ul"
                    title="At a Glance"
                    subtitle="Important itinerary highlights."
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading highlights..." />
                  ) : (
                    <Row className="g-3">
                      <Col md="4">
                        <div className="border rounded p-3 h-100">
                          <div className="text-muted mb-2">Meals Included</div>
                          <div className="d-flex flex-wrap gap-2">
                            {allMeals.length ? (
                              allMeals.map(mealName => (
                                <Pill
                                  key={mealName}
                                  icon="bx bx-dish"
                                  text={mealName}
                                />
                              ))
                            ) : (
                              <span className="text-muted">No meals added</span>
                            )}
                          </div>
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="border rounded p-3 h-100">
                          <div className="text-muted mb-2">Entrance Fee Places</div>
                          <div className="d-flex flex-wrap gap-2">
                            {allPlaces.length ? (
                              allPlaces.map(placeName => (
                                <Pill
                                  key={placeName}
                                  icon="bx bx-map-pin"
                                  text={placeName}
                                />
                              ))
                            ) : (
                              <span className="text-muted">No places added</span>
                            )}
                          </div>
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="border rounded p-3 h-100">
                          <div className="text-muted mb-2">Overnight Cities</div>
                          <div className="d-flex flex-wrap gap-2">
                            {overnightCities.length ? (
                              overnightCities.map(cityName => (
                                <Pill
                                  key={cityName}
                                  icon="bx bx-moon"
                                  text={cityName}
                                />
                              ))
                            ) : (
                              <span className="text-muted">No overnight cities</span>
                            )}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col xl="12">
              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <SummaryHeader
                    icon="bx bx-map"
                    title="Daily Itinerary"
                    subtitle="Each saved day with route, transportation, guide, meals, entrance fees, and overnight city."
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading itinerary..." />
                  ) : daysRoutes.length === 0 ? (
                    <EmptyState text="No days were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {daysRoutes.map(day => (
                        <Col xl="12" key={day?._id || `day-${day?.DAY_ORDER}`}>
                          <Card className="border shadow-none mb-0">
                            <CardBody>
                              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                                <div>
                                  <h5 className="mb-1">
                                    <i className="bx bx-calendar-event me-1 text-primary" />
                                    Day {day?.DAY_ORDER || "-"}
                                  </h5>
                                  <p className="text-muted mb-0">
                                    {formatDateLabel(day?.DAY_DATE)}
                                  </p>
                                </div>

                                {day?.overnight?.OVERNIGHT_CITY_NAME ? (
                                  <Pill
                                    icon="bx bx-moon"
                                    text={`Overnight: ${day.overnight.OVERNIGHT_CITY_NAME}`}
                                  />
                                ) : null}
                              </div>

                              <Row className="g-3">
                                <Col lg="6">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">
                                      <i className="bx bx-map me-1 text-primary" />
                                      Route
                                    </h6>
                                    <div className="fw-medium mb-2">
                                      {day?.ROUTE_TEXT || "-"}
                                    </div>

                                    {day?.routeCities?.length ? (
                                      <div className="d-flex flex-wrap gap-2">
                                        {day.routeCities.map(city => (
                                          <Pill
                                            key={`${day._id}-${city}`}
                                            icon="bx bx-map-alt"
                                            text={city}
                                          />
                                        ))}
                                      </div>
                                    ) : null}
                                  </div>
                                </Col>

                                <Col lg="6">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">
                                      <i className="bx bx-car me-1 text-primary" />
                                      Transportation
                                    </h6>

                                    {day.transportationRows.length === 0 ? (
                                      <div className="text-muted">
                                        No transportation details
                                      </div>
                                    ) : (
                                      day.transportationRows.map((row, index) => (
                                        <div
                                          key={`${day._id}-transport-${index}`}
                                          className={
                                            index === day.transportationRows.length - 1
                                              ? ""
                                              : "border-bottom pb-3 mb-3"
                                          }
                                        >
                                          <div className="fw-semibold mb-1">
                                            {row?.TRANSPORTATION_COMPANY_NAME || "-"}
                                          </div>
                                          <div className="text-muted small">
                                            {row?.TRANSPORTATION_TYPE_NAME || "-"} •{" "}
                                            {row?.TRANSPORTATION_BY || "-"} • Capacity{" "}
                                            {row?.MINIMUM_CAPACITY ?? "-"} -{" "}
                                            {row?.MAXIMUM_CAPACITY ?? "-"}
                                          </div>

                                          {canViewPrices && getAmount(row) !== null ? (
                                            <div className="mt-2">
                                              <Badge color="primary" pill>
                                                Rate: {formatMoney(getAmount(row))}
                                              </Badge>
                                            </div>
                                          ) : null}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </Col>

                                <Col lg="4">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">
                                      <i className="bx bx-user me-1 text-primary" />
                                      Guide
                                    </h6>
                                    <div className="fw-medium">
                                      {day?.guide?.enabled || day?.guide?.GUIDE_TYPE_NAME
                                        ? day?.guide?.GUIDE_TYPE_NAME || "Guide included"
                                        : "No guide"}
                                    </div>
                                  </div>
                                </Col>

                                <Col lg="4">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">
                                      <i className="bx bx-dish me-1 text-primary" />
                                      Meals
                                    </h6>

                                    {day.mealsRows.length ? (
                                      <>
                                        <div className="d-flex flex-wrap gap-2">
                                          {day.mealsRows.map((meal, index) => (
                                            <Pill
                                              key={`${day._id}-meal-${index}`}
                                              icon="bx bx-bowl-hot"
                                              text={meal?.MEAL_NAME || meal?.MEAL_TYPE || "-"}
                                            />
                                          ))}
                                        </div>

                                        {canViewPrices ? (
                                          <div className="mt-3 d-flex flex-column gap-2">
                                            {day.mealsRows.map((meal, index) => {
                                              const amount = getAmount(meal);
                                              if (amount === null) return null;

                                              return (
                                                <Badge
                                                  key={`${day._id}-meal-price-${index}`}
                                                  color="primary"
                                                  className="rounded-pill px-3 py-2 align-self-start"
                                                >
                                                  {(meal?.MEAL_NAME || meal?.MEAL_TYPE || "Meal")}:{" "}
                                                  {formatMoney(amount)}
                                                </Badge>
                                              );
                                            })}
                                          </div>
                                        ) : null}
                                      </>
                                    ) : (
                                      <div className="text-muted">No meals added</div>
                                    )}
                                  </div>
                                </Col>

                                <Col lg="4">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">
                                      <i className="bx bx-receipt me-1 text-primary" />
                                      Entrance Fees
                                    </h6>

                                    {day.entranceRows.length ? (
                                      <>
                                        <div className="d-flex flex-wrap gap-2">
                                          {day.entranceRows.map((place, index) => (
                                            <Pill
                                              key={`${day._id}-place-${index}`}
                                              icon="bx bx-map-pin"
                                              text={place?.PLACE_NAME || "-"}
                                            />
                                          ))}
                                        </div>

                                        {canViewPrices ? (
                                          <div className="mt-3 d-flex flex-column gap-2">
                                            {day.entranceRows.map((place, index) => {
                                              const amount = getAmount(place);
                                              if (amount === null) return null;

                                              return (
                                                <Badge
                                                  key={`${day._id}-place-price-${index}`}
                                                  color="primary"
                                                  className="rounded-pill px-3 py-2 align-self-start"
                                                >
                                                  {(place?.PLACE_NAME || "Place")}: {formatMoney(amount)}
                                                </Badge>
                                              );
                                            })}
                                          </div>
                                        ) : null}
                                      </>
                                    ) : (
                                      <div className="text-muted">No places added</div>
                                    )}
                                  </div>
                                </Col>
                              </Row>
                            </CardBody>
                          </Card>
                        </Col>
                      ))}
                    </Row>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row className="mb-4">
            <Col xl="12">
              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <SummaryHeader
                    icon="bx bx-hotel"
                    title="Accommodation Options"
                    subtitle={
                      canViewPrices
                        ? "Hotels, chains, stars, seasons, and season prices."
                        : "Hotels, chains, stars, and seasons."
                    }
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading accommodation options..." />
                  ) : accommodationOptions.length === 0 ? (
                    <EmptyState text="No accommodation options were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {accommodationOptions.map((option, index) => (
                        <Col xl="12" key={option.key || `option-${index}`}>
                          <Card className="border shadow-none mb-0">
                            <CardBody>
                              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                                <div>
                                  <h5 className="mb-1">
                                    <i className="bx bx-door-open me-1 text-primary" />
                                    {option?.optionName || `Option ${index + 1}`}
                                  </h5>
                                  <p className="text-muted mb-2">
                                    {formatDateLabel(option?.arrivingDate)} to{" "}
                                    {formatDateLabel(option?.departureDate)} •{" "}
                                    {option?.totalNights || 0} night(s)
                                  </p>

                                  <div className="d-flex flex-wrap gap-2">
                                    {option?.selectedStars ? (
                                      <Pill
                                        icon="bx bx-star"
                                        text={`${renderStars(option.selectedStars)} Hotel Category`}
                                      />
                                    ) : null}

                                    <Pill
                                      icon="bx bx-buildings"
                                      text={`${option?.cityGroups?.length || 0} city group(s)`}
                                    />
                                  </div>
                                </div>
                              </div>

                              <Row className="g-3">
                                {option.cityGroups.map(cityGroup => (
                                  <Col lg="6" key={cityGroup.key}>
                                    <div className="border rounded p-3 h-100">
                                      <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                                        <div>
                                          <h6 className="mb-1">
                                            <i className="bx bx-map me-1 text-primary" />
                                            {cityGroup.cityName}
                                          </h6>
                                          <div className="text-muted small">
                                            Overnight: {formatDateLabel(cityGroup.overnightDate)} •{" "}
                                            {cityGroup.totalNights || 0} night(s)
                                          </div>
                                        </div>
                                      </div>

                                      {cityGroup.stays.length === 0 ? (
                                        <div className="text-muted">No stays added</div>
                                      ) : (
                                        cityGroup.stays.map((stay, stayIndex) => {
                                          const staySeasons = asArray(stay?.SEASONS);
                                          const stayAmount = getAmount(stay);

                                          return (
                                            <div
                                              key={`${cityGroup.key}-stay-${stayIndex}`}
                                              className={
                                                stayIndex === cityGroup.stays.length - 1
                                                  ? ""
                                                  : "border-bottom pb-3 mb-3"
                                              }
                                            >
                                              <div className="fw-semibold mb-1">
                                                {stay?.HOTEL_NAME || "-"}
                                              </div>

                                              <div className="text-muted small mb-2">
                                                {stay?.HOTEL_CHAIN_VALUE || "-"} •{" "}
                                                {stay?.HOTEL_CITY_VALUE || cityGroup.cityName || "-"} •{" "}
                                                {renderStars(stay?.HOTEL_STARS)}
                                              </div>

                                              <div className="d-flex flex-wrap gap-2 mb-2">
                                                {staySeasons.length > 0 ? (
                                                  staySeasons.map((season, seasonIndex) => {
                                                    const seasonAmount = getAmount(season);

                                                    return (
                                                      <Badge
                                                        key={`${cityGroup.key}-stay-${stayIndex}-season-${seasonIndex}`}
                                                        color={canViewPrices && seasonAmount !== null ? "primary" : "light"}
                                                        className="rounded-pill px-3 py-2 fw-normal"
                                                      >
                                                        <i className="bx bx-calendar me-1" />
                                                        {getSeasonLabel(season)}
                                                        {canViewPrices && seasonAmount !== null
                                                          ? `: ${formatMoney(seasonAmount)}`
                                                          : ""}
                                                      </Badge>
                                                    );
                                                  })
                                                ) : stay?.SEASON_NAME ? (
                                                  <Pill
                                                    icon="bx bx-calendar"
                                                    text={stay.SEASON_NAME}
                                                    color="light"
                                                  />
                                                ) : null}

                                                <Pill
                                                  icon="bx bx-moon"
                                                  text={`${stay?.NIGHTS || 0} night(s)`}
                                                />
                                              </div>

                                              {canViewPrices &&
                                              staySeasons.length === 0 &&
                                              stayAmount !== null ? (
                                                <Badge
                                                  color="primary"
                                                  className="rounded-pill px-3 py-2 fw-normal"
                                                >
                                                  Price: {formatMoney(stayAmount)}
                                                </Badge>
                                              ) : null}
                                            </div>
                                          );
                                        })
                                      )}
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            </CardBody>
                          </Card>
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
                <CardBody className="p-4">
                  <SummaryHeader
                    icon="bx bx-gift"
                    title="Extra Services"
                    subtitle={
                      canViewPrices
                        ? "Additional services with prices."
                        : "Additional services without prices."
                    }
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading extra services..." />
                  ) : extraServices.length === 0 ? (
                    <EmptyState text="No extra services were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {extraServices.map((service, index) => {
                        const amount = getAmount(service);

                        return (
                          <Col
                            md="6"
                            xl="4"
                            key={service?._id || `service-${index}`}
                          >
                            <Card className="border shadow-none h-100 mb-0">
                              <CardBody>
                                <div className="d-flex align-items-start gap-3">
                                  <div
                                    className="rounded-circle bg-light d-flex align-items-center justify-content-center"
                                    style={{ width: 46, height: 46, minWidth: 46 }}
                                  >
                                    <i className="bx bx-plus-medical font-size-20 text-primary" />
                                  </div>

                                  <div className="w-100">
                                    <h5 className="mb-2">
                                      {service?.SERVICE_NAME || "-"}
                                    </h5>
                                    <p className="text-muted mb-2">
                                      {service?.SERVICE_DESCRIPTION ||
                                        "No description provided."}
                                    </p>

                                    {canViewPrices && amount !== null ? (
                                      <Badge color="primary" className="rounded-pill px-3 py-2 fw-normal">
                                        Price: {formatMoney(amount)}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </CardBody>
                            </Card>
                          </Col>
                        );
                      })}
                    </Row>
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Modal
            isOpen={generalNotesOpen}
            toggle={() => !generalNotesSaving && setGeneralNotesOpen(false)}
            centered
          >
            <ModalHeader toggle={() => !generalNotesSaving && setGeneralNotesOpen(false)}>
              <div className="d-flex align-items-center gap-2">
                <span
                  className="rounded-circle bg-primary-subtle d-flex align-items-center justify-content-center"
                  style={{ width: 36, height: 36, minWidth: 36 }}
                >
                  <i className="bx bx-note text-primary font-size-18" />
                </span>
                <span>
                  <span className="d-block">General Notes</span>
                  <span className="d-block text-muted small fw-normal">
                    {referenceNumber}
                  </span>
                </span>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="rounded border bg-light p-3">
                <div className="d-flex justify-content-between align-items-center gap-3 mb-2">
                  <Label className="form-label mb-0">Notes</Label>
                  <Badge color={generalNotesError ? "danger" : "light"} className="text-dark">
                    {generalNotes.length}/5000
                  </Badge>
                </div>
                <Input
                  type="textarea"
                  rows="8"
                  value={generalNotes}
                  onChange={e => {
                    setGeneralNotes(e.target.value);
                    setGeneralNotesTouched(true);
                  }}
                  invalid={!!(generalNotesTouched && generalNotesError)}
                  disabled={!canEditGeneralNotes || generalNotesSaving}
                  placeholder={
                    canEditGeneralNotes
                      ? "Write the approved quotation notes here."
                      : "Only TOUR_OPERATION can update notes."
                  }
                  className="bg-white"
                />
                <FormFeedback>{generalNotesError}</FormFeedback>
                <div className="text-muted small mt-2">
                  Visible from the approved quotation summary.
                </div>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="light"
                type="button"
                onClick={() => setGeneralNotesOpen(false)}
                disabled={generalNotesSaving}
              >
                Close
              </Button>
              {canEditGeneralNotes ? (
                <Button
                  color="primary"
                  type="button"
                  onClick={handleSaveGeneralNotes}
                  disabled={generalNotesSaving}
                >
                  {generalNotesSaving ? <Spinner size="sm" className="me-2" /> : null}
                  Save
                </Button>
              ) : null}
            </ModalFooter>
          </Modal>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default QuotationsDetails;
