// path: src/pages/Quotations/Details.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import {
  fetchQuotation,
  fetchQuotationsLookups,
} from "../../store/Quotations/actions";
import { get } from "../../helpers/api_helper";
import { notifyError } from "../../helpers/notify";
import {
  getQuotationReadOnlyMessage,
  getQuotationStatus,
  getQuotationStatusBadgeColor,
  isQuotationReadOnly,
} from "../../helpers/quotation_pricing_helper";

const unwrapId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
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

const normalizeDay = day => {
  const basic = day?.basic || day || {};
  const route = day?.route || {};
  const mealsNode = day?.meals || {};
  const mealsRows = asArray(mealsNode?.rows || day?.MEALS);
  const entranceRows = asArray(day?.NTRANCE_FEES || day?.PLACES);
  const transportationRows = asArray(day?.TRANSPORTATION_RESOLVED);
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

      const flattenedStays = cityGroups.flatMap(group => group.stays);

      return {
        key: `${entry?._id || "entry"}-${option?.OPTION_NAME || index}`,
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

const InfoItem = ({ label, value }) => (
  <div className="mb-3">
    <Label className="form-label text-muted mb-1">{label}</Label>
    <div className="fw-medium">{value || "-"}</div>
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

const QuotationsDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();

  const { selected, loading, lookups } = useSelector(s => s.Quotations || {});

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [daysRoutes, setDaysRoutes] = useState([]);
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [extraServices, setExtraServices] = useState([]);
  const [finalPricing, setFinalPricing] = useState(null);
  const [finalPricingLoading, setFinalPricingLoading] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchQuotationsLookups());
      dispatch(fetchQuotation(id));
    }
  }, [dispatch, id]);

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
        if (meal?.MEAL_NAME) set.add(meal.MEAL_NAME);
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

  const approvedFinalTotal =
    String(finalPricing?.STATUS || "").toUpperCase().trim() === "APPROVED"
      ? finalPricing?.FINAL_TOTAL
      : null;

  document.title = "Quotation Details | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Quotation Details" />

          {readOnly ? (
            <Alert color="warning" className="mb-4">
              {readOnlyMessage}
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
                        subtitle="Clean, modern overview of the quotation, routes, hotels, and included services."
                      >
                        {quotationStatus ? (
                          <Badge color={getQuotationStatusBadgeColor(quotationStatus)} pill>
                            {quotationStatus}
                          </Badge>
                        ) : null}
                      </SummaryHeader>

                      <Row className="g-3">
                        <Col md="6">
                          <InfoItem
                            label="Reference Number"
                            value={selected?.REFERANCE_NUMBER || "-"}
                          />
                        </Col>
                        <Col md="6">
                          <InfoItem
                            label="Travel Agent"
                            value={
                              selected?.TRAVEL_AGENT_NAME ||
                              travelAgentMap.get(selected?.TRAVEL_AGENT_ID) ||
                              "-"
                            }
                          />
                        </Col>
                        <Col md="6">
                          <InfoItem
                            label="Nationality"
                            value={
                              selected?.NATIONALITY_VALUE ||
                              nationalityMap.get(selected?.NATIONALITY) ||
                              "-"
                            }
                          />
                        </Col>
                        <Col md="6">
                          <InfoItem
                            label="Quotation Type"
                            value={
                              selected?.QUOTATION_TYPE_VALUE ||
                              quotationTypeMap.get(selected?.QUOTATION_TYPE) ||
                              "-"
                            }
                          />
                        </Col>
                        <Col md="4">
                          <InfoItem
                            label="Start Date"
                            value={formatDateLabel(selected?.QUOTATION_START_DATE)}
                          />
                        </Col>
                        <Col md="4">
                          <InfoItem
                            label="End Date"
                            value={formatDateLabel(selected?.QUOTATION_END_DATE)}
                          />
                        </Col>
                        <Col md="4">
                          <InfoItem
                            label="Duration"
                            value={
                              selected?.QUOTATION_DURATION_DAYS ??
                              selected?.DURATION_IN_DAYS ??
                              "-"
                            }
                          />
                        </Col>
                        <Col md="4">
                          <InfoItem
                            label="Number of Pax"
                            value={selected?.NUMBER_OF_PAX ?? "-"}
                          />
                        </Col>
                        <Col md="4">
                          <InfoItem
                            label="Created On"
                            value={formatDateLabel(selected?.CREATED_ON)}
                          />
                        </Col>
                        <Col md="4">
                          <InfoItem
                            label="Updated On"
                            value={formatDateLabel(selected?.UPDATED_ON)}
                          />
                        </Col>
                      </Row>

                      <div className="d-flex flex-wrap gap-2 mt-2">
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

          <Row className="mb-4">
            <Col xl="12">
              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <SummaryHeader
                    icon="bx bx-badge-dollar"
                    title="Approved Final Price"
                    subtitle="Shown only after quotation pricing is approved."
                  />
                  {finalPricingLoading ? (
                    <LoadingState text="Loading approved final price..." />
                  ) : approvedFinalTotal !== null && approvedFinalTotal !== undefined ? (
                    <div className="text-center py-4">
                      <div className="text-muted mb-2">Final Total After Profit</div>
                      <h1 className="mb-1">{Number(approvedFinalTotal).toFixed(2)}</h1>
                      <div className="text-success fw-medium">
                        Approved quotation final amount
                      </div>
                    </div>
                  ) : (
                    <EmptyState text="The final approved price is not available yet." />
                  )}
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row className="g-3 mb-4">
            <Col xl="12">
              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <SummaryHeader
                    icon="bx bx-list-ul"
                    title="At a Glance"
                    subtitle="Important itinerary highlights without any pricing."
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
                              allMeals.map(meal => (
                                <Pill key={meal} icon="bx bx-restaurant" text={meal} />
                              ))
                            ) : (
                              <span className="text-muted">No meals added</span>
                            )}
                          </div>
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="border rounded p-3 h-100">
                          <div className="text-muted mb-2">Places Included</div>
                          <div className="d-flex flex-wrap gap-2">
                            {allPlaces.length ? (
                              allPlaces.map(place => (
                                <Pill key={place} icon="bx bx-map-pin" text={place} />
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
                              overnightCities.map(city => (
                                <Pill key={city} icon="bx bx-bed" text={city} />
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
                    icon="bx bx-map-alt"
                    title="Days and Routes"
                    subtitle="A simple, elegant day-by-day view of route, transportation, guide, meals, places, and overnight city."
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading days and routes..." />
                  ) : daysRoutes.length === 0 ? (
                    <EmptyState text="No days and routes were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {daysRoutes.map(day => {
                        const transportNames = day.transportationRows
                          .map(row => {
                            const parts = [
                              row?.TRANSPORTATION_TYPE_NAME,
                              row?.TRANSPORTATION_COMPANY_NAME,
                              row?.TRANSPORTATION_BY,
                            ].filter(Boolean);
                            return parts.join(" • ");
                          })
                          .filter(Boolean);

                        const placeNames = day.entranceRows
                          .map(place => place?.PLACE_NAME)
                          .filter(Boolean);

                        const mealNames = day.mealsRows
                          .map(meal => meal?.MEAL_NAME)
                          .filter(Boolean);

                        const restaurants = day.mealsRows
                          .map(meal => meal?.RESTAURANT_NAME)
                          .filter(Boolean);

                        return (
                          <Col xl="6" key={day?._id || `day-${day?.DAY_ORDER}`}>
                            <Card className="border shadow-none h-100 mb-0">
                              <CardBody>
                                <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-3">
                                  <div>
                                    <h5 className="mb-1">
                                      <i className="bx bx-calendar me-1 text-primary" />
                                      Day {day?.DAY_ORDER || "-"}
                                    </h5>
                                    <div className="text-muted">
                                      {formatDateLabel(day?.DAY_DATE)}
                                    </div>
                                  </div>

                                  <Badge color="light" className="px-3 py-2">
                                    {day?.overnight?.OVERNIGHT_CITY_NAME || "No overnight"}
                                  </Badge>
                                </div>

                                <div className="mb-3">
                                  <div className="text-muted small mb-1">Route</div>
                                  <div className="fw-semibold">
                                    {day?.ROUTE_TEXT || "-"}
                                  </div>
                                  {day.routeCities.length ? (
                                    <div className="d-flex flex-wrap gap-2 mt-2">
                                      {day.routeCities.map(city => (
                                        <Pill key={`${day._id}-${city}`} text={city} />
                                      ))}
                                    </div>
                                  ) : null}
                                </div>

                                <Row className="g-3">
                                  <Col md="12">
                                    <div className="border rounded p-3 h-100">
                                      <div className="text-muted small mb-2">
                                        Transportation
                                      </div>
                                      {transportNames.length ? (
                                        <div className="d-flex flex-column gap-2">
                                          {transportNames.map((label, index) => (
                                            <div key={`${day._id}-transport-${index}`}>
                                              <i className="bx bx-bus me-2 text-primary" />
                                              {label}
                                            </div>
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-muted">No transportation added</div>
                                      )}
                                    </div>
                                  </Col>

                                  <Col md="6">
                                    <div className="border rounded p-3 h-100">
                                      <div className="text-muted small mb-2">Guide</div>
                                      {day?.guide?.enabled ? (
                                        <div>
                                          <i className="bx bx-user-voice me-2 text-primary" />
                                          {day?.guide?.GUIDE_TYPE_NAME || "Guide enabled"}
                                        </div>
                                      ) : (
                                        <div className="text-muted">No guide</div>
                                      )}
                                    </div>
                                  </Col>

                                  <Col md="6">
                                    <div className="border rounded p-3 h-100">
                                      <div className="text-muted small mb-2">Overnight</div>
                                      <div>
                                        <i className="bx bx-moon me-2 text-primary" />
                                        {day?.overnight?.OVERNIGHT_CITY_NAME || "No overnight city"}
                                      </div>
                                    </div>
                                  </Col>

                                  <Col md="6">
                                    <div className="border rounded p-3 h-100">
                                      <div className="text-muted small mb-2">Meals</div>
                                      {mealNames.length ? (
                                        <div className="d-flex flex-wrap gap-2">
                                          {mealNames.map((meal, index) => (
                                            <Pill
                                              key={`${day._id}-meal-${meal}-${index}`}
                                              icon="bx bx-restaurant"
                                              text={meal}
                                            />
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-muted">No meals added</div>
                                      )}

                                      {restaurants.length ? (
                                        <div className="mt-2 text-muted small">
                                          Restaurants: {restaurants.join(" • ")}
                                        </div>
                                      ) : null}
                                    </div>
                                  </Col>

                                  <Col md="6">
                                    <div className="border rounded p-3 h-100">
                                      <div className="text-muted small mb-2">Places</div>
                                      {placeNames.length ? (
                                        <div className="d-flex flex-wrap gap-2">
                                          {placeNames.map((place, index) => (
                                            <Pill
                                              key={`${day._id}-place-${place}-${index}`}
                                              icon="bx bx-map-pin"
                                              text={place}
                                            />
                                          ))}
                                        </div>
                                      ) : (
                                        <div className="text-muted">No places added</div>
                                      )}
                                    </div>
                                  </Col>
                                </Row>
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

          <Row className="mb-4">
            <Col xl="12">
              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <SummaryHeader
                    icon="bx bx-hotel"
                    title="Accommodation Options"
                    subtitle="Hotels, chains, stars, cities, seasons, and stays — without showing any prices."
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
                                        cityGroup.stays.map((stay, stayIndex) => (
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
                                              {stay?.SEASON_NAME || stay?.SEASON_LABEL ? (
                                                <Pill
                                                  icon="bx bx-calendar-event"
                                                  text={stay?.SEASON_LABEL || stay?.SEASON_NAME}
                                                />
                                              ) : null}

                                              {stay?.NIGHTS ? (
                                                <Pill
                                                  icon="bx bx-moon"
                                                  text={`${stay.NIGHTS} night(s)`}
                                                />
                                              ) : null}
                                            </div>

                                            {stay?.HOTEL_WEBSITE ? (
                                              <a
                                                href={stay.HOTEL_WEBSITE}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="small"
                                              >
                                                Visit hotel website
                                              </a>
                                            ) : null}
                                          </div>
                                        ))
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
                    subtitle="Additional services included in the quotation, shown without prices."
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading extra services..." />
                  ) : extraServices.length === 0 ? (
                    <EmptyState text="No extra services were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {extraServices.map((service, index) => (
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

                                <div>
                                  <h5 className="mb-2">
                                    {service?.SERVICE_NAME || "-"}
                                  </h5>
                                  <p className="text-muted mb-0">
                                    {service?.SERVICE_DESCRIPTION ||
                                      "No description provided."}
                                  </p>
                                </div>
                              </div>
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
        </Container>
      </div>
    </React.Fragment>
  );
};

export default QuotationsDetails;