// path: src/pages/Quotations/Details.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
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

const unwrapId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
  }
  return "";
};

const getTravelAgentLabel = (item) =>
  item?.AGENT_NAME ||
  item?.COMPANY_NAME ||
  item?.NAME ||
  item?.EMAIL ||
  item?.agentName ||
  item?.companyName ||
  "-";

const getTransportationCompanyLabel = (item) =>
  item?.COMPANY_NAME || item?.NAME || item?.companyName || "-";

const formatDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDateLabel = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const asArray = (value) => (Array.isArray(value) ? value : []);

const getErrorMessage = (error, fallback) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.response?.data?.msg ||
  (typeof error?.response?.data === "string" ? error.response.data : null) ||
  error?.message ||
  fallback;

const formatCurrency = (value) => {
  const amount = Number(value || 0);
  if (Number.isNaN(amount)) return "-";
  return amount.toLocaleString("en-US");
};

const renderStars = (count) => {
  const stars = Number(count || 0);
  if (!stars) return "-";
  return "★".repeat(stars);
};

const SectionTitle = ({ icon, title, subtitle }) => (
  <div className="d-flex align-items-start justify-content-between flex-wrap gap-2 mb-4">
    <div className="d-flex align-items-center gap-3">
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
  </div>
);

const EmptyState = ({ text }) => (
  <div className="text-center py-4 text-muted">
    <i className="bx bx-info-circle font-size-24 d-block mb-2" />
    {text}
  </div>
);

const LoadingState = ({ text = "Loading..." }) => (
  <div className="text-center py-4">
    <Spinner size="sm" className="me-2" />
    {text}
  </div>
);

const QuotationsDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selected, loading, lookups } = useSelector((s) => s.Quotations || {});

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [daysRoutes, setDaysRoutes] = useState([]);
  const [accommodationOptions, setAccommodationOptions] = useState([]);
  const [extraServices, setExtraServices] = useState([]);

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

        setDaysRoutes(asArray(daysRes).sort((a, b) => (a?.DAY_ORDER || 0) - (b?.DAY_ORDER || 0)));

        const allAccommodation = asArray(accommodationRes);
        const normalizedOptions = allAccommodation.flatMap((entry) =>
          asArray(entry?.OPTIONS).map((option) => ({
            optionName: option?.OPTION_NAME || "Option",
            totalNights: option?.TOTAL_NIGHTS || 0,
            totals: option?.TOTALS || {},
            hotels: asArray(option?.HOTELS),
            stays: asArray(option?.STAYS).sort((a, b) => (a?.ORDER || 0) - (b?.ORDER || 0)),
            arrivingDate: entry?.ARRAIVING_DATE,
            departureDate: entry?.DEPARTURE_DATE,
            totalOptions: entry?.TOTAL_OPTIONS || 0,
          })),
        );

        setAccommodationOptions(normalizedOptions);
        setExtraServices(asArray(extrasRes));
      } catch (error) {
        if (!ignore) {
          notifyError(getErrorMessage(error, "Failed to load quotation summary."));
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

  const travelAgentMap = useMemo(() => {
    const map = new Map();
    (lookups?.travelAgents || []).forEach((item) => {
      map.set(unwrapId(item?._id), getTravelAgentLabel(item));
    });
    return map;
  }, [lookups]);

  const transportationCompanyMap = useMemo(() => {
    const map = new Map();
    (lookups?.transportationCompanies || []).forEach((item) => {
      map.set(unwrapId(item?._id), getTransportationCompanyLabel(item));
    });
    return map;
  }, [lookups]);

  document.title = "Quotation Details | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Quotation Details" />

          <Row>
            <Col xl="8">
              <Card>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h4 className="card-title mb-1">Quotation Details</h4>
                      <p className="card-title-desc mb-0">
                        Main quotation information with a readable trip summary.
                      </p>
                    </div>

                    <Button
                      color="light"
                      type="button"
                      onClick={() => navigate("/quotations")}
                    >
                      Exit
                    </Button>
                  </div>

                  {loading && !selected ? (
                    <LoadingState />
                  ) : (
                    <Row>
                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">Reference Number</Label>
                          <Input
                            value={selected?.REFERANCE_NUMBER || ""}
                            disabled
                          />
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">Quotation Status</Label>
                          <Input
                            value={selected?.QUOTATION_STATUS || "-"}
                            disabled
                          />
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">Travel Agent</Label>
                          <Input
                            value={
                              travelAgentMap.get(selected?.TRAVEL_AGENT_ID) || "-"
                            }
                            disabled
                          />
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">
                            Transportation Company
                          </Label>
                          <Input
                            value={
                              transportationCompanyMap.get(
                                selected?.TRANSPORTATION_COMPANY_ID,
                              ) || "-"
                            }
                            disabled
                          />
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">Arriving Date</Label>
                          <Input
                            value={
                              formatDateInput(selected?.ARRAIVING_DATE) || ""
                            }
                            disabled
                          />
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">Departure Date</Label>
                          <Input
                            value={
                              formatDateInput(selected?.DEPARTURE_DATE) || ""
                            }
                            disabled
                          />
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">Created On</Label>
                          <Input
                            value={formatDateInput(selected?.CREATED_ON) || ""}
                            disabled
                          />
                        </div>
                      </Col>

                      <Col md="6">
                        <div className="mb-3">
                          <Label className="form-label">Updated On</Label>
                          <Input
                            value={formatDateInput(selected?.UPDATED_ON) || ""}
                            disabled
                          />
                        </div>
                      </Col>
                    </Row>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col xl="4">
              <Card>
                <CardBody>
                  <h4 className="card-title mb-3">Quick Summary</h4>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">
                      Reference Number
                    </Label>
                    <div className="fw-semibold">
                      {selected?.REFERANCE_NUMBER || "-"}
                    </div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">
                      Quotation Status
                    </Label>
                    <div>{selected?.QUOTATION_STATUS || "-"}</div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">
                      Travel Agent
                    </Label>
                    <div>
                      {travelAgentMap.get(selected?.TRAVEL_AGENT_ID) || "-"}
                    </div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">
                      Transportation Company
                    </Label>
                    <div>
                      {transportationCompanyMap.get(
                        selected?.TRANSPORTATION_COMPANY_ID,
                      ) || "-"}
                    </div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">
                      Arriving Date
                    </Label>
                    <div>
                      {formatDateInput(selected?.ARRAIVING_DATE) || "-"}
                    </div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">
                      Departure Date
                    </Label>
                    <div>
                      {formatDateInput(selected?.DEPARTURE_DATE) || "-"}
                    </div>
                  </div>

                  <div className="row g-3 pt-2">
                    <div className="col-6">
                      <div className="border rounded p-3 text-center h-100">
                        <div className="text-muted mb-1">Days</div>
                        <h4 className="mb-0">{daysRoutes.length}</h4>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="border rounded p-3 text-center h-100">
                        <div className="text-muted mb-1">Hotel Options</div>
                        <h4 className="mb-0">{accommodationOptions.length}</h4>
                      </div>
                    </div>
                    <div className="col-12">
                      <div className="border rounded p-3 text-center h-100">
                        <div className="text-muted mb-1">Extra Services</div>
                        <h4 className="mb-0">{extraServices.length}</h4>
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          <Row>
            <Col xl="12">
              <Card>
                <CardBody>
                  <SectionTitle
                    icon="bx bx-map-alt"
                    title="Days and Routes"
                    subtitle="A day-by-day view of transportation, places, guide service, and meals."
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading days and routes..." />
                  ) : daysRoutes.length === 0 ? (
                    <EmptyState text="No days and routes were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {daysRoutes.map((day) => {
                        const transportLabel =
                          day?.TRANSPORTATION_RESOLVED?.[0]?.TRANSPORTATION_TYPE_NAME ||
                          "-";
                        const places = asArray(day?.PLACES)
                          .map((place) => place?.PLACE_NAME)
                          .filter(Boolean);
                        const meals = asArray(day?.MEALS)
                          .map((meal) => meal?.MEAL_NAME)
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

                                  <Badge color="soft-primary" className="font-size-12">
                                    {transportLabel}
                                  </Badge>
                                </div>

                                <div className="mb-3">
                                  <div className="text-muted mb-1">
                                    <i className="bx bx-car me-1" />
                                    Transportation Type
                                  </div>
                                  <div className="fw-medium">{transportLabel}</div>
                                </div>

                                <div className="mb-3">
                                  <div className="text-muted mb-1">
                                    <i className="bx bx-map-pin me-1" />
                                    Places
                                  </div>
                                  {places.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                      {places.map((placeName, index) => (
                                        <Badge
                                          key={`${placeName}-${index}`}
                                          color="light"
                                          className="font-size-12 p-2"
                                        >
                                          {placeName}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="fw-medium">No places added</div>
                                  )}
                                </div>

                                <div className="mb-3">
                                  <div className="text-muted mb-1">
                                    <i className="bx bx-user-voice me-1" />
                                    Guide
                                  </div>
                                  <div className="fw-medium">
                                    {day?.GUIDE_TYPE_NAME || "No guide selected"}
                                  </div>
                                </div>

                                <div className="mb-0">
                                  <div className="text-muted mb-1">
                                    <i className="bx bx-dish me-1" />
                                    Meals
                                  </div>
                                  {meals.length > 0 ? (
                                    <div className="d-flex flex-wrap gap-2">
                                      {meals.map((mealName, index) => (
                                        <Badge
                                          key={`${mealName}-${index}`}
                                          color="light"
                                          className="font-size-12 p-2"
                                        >
                                          {mealName}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="fw-medium">No meals added</div>
                                  )}
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

          <Row>
            <Col xl="12">
              <Card>
                <CardBody>
                  <SectionTitle
                    icon="bx bx-hotel"
                    title="Accommodation Options"
                    subtitle="Readable hotel options grouped by option name, with stays and meal-plan totals."
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading accommodation options..." />
                  ) : accommodationOptions.length === 0 ? (
                    <EmptyState text="No accommodation options were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {accommodationOptions.map((option, index) => (
                        <Col xl="12" key={`${option?.optionName || "option"}-${index}`}>
                          <Card className="border shadow-none mb-0">
                            <CardBody>
                              <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                                <div>
                                  <h5 className="mb-1">
                                    <i className="bx bx-door-open me-1 text-primary" />
                                    {option?.optionName || `Option ${index + 1}`}
                                  </h5>
                                  <p className="text-muted mb-0">
                                    {formatDateLabel(option?.arrivingDate)} to{" "}
                                    {formatDateLabel(option?.departureDate)} •{" "}
                                    {option?.totalNights || 0} night(s)
                                  </p>
                                </div>

                                <div className="d-flex flex-wrap gap-2">
                                  <Badge color="light" className="p-2">
                                    BB: {formatCurrency(option?.totals?.BB)}
                                  </Badge>
                                  <Badge color="light" className="p-2">
                                    HB: {formatCurrency(option?.totals?.HB)}
                                  </Badge>
                                  <Badge color="light" className="p-2">
                                    FB: {formatCurrency(option?.totals?.FB)}
                                  </Badge>
                                  <Badge color="light" className="p-2">
                                    SS: {formatCurrency(option?.totals?.SS)}
                                  </Badge>
                                </div>
                              </div>

                              <Row className="g-3">
                                <Col lg="6">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">
                                      <i className="bx bx-building-house me-1 text-primary" />
                                      Hotels in this option
                                    </h6>

                                    {option.hotels.length === 0 ? (
                                      <div className="text-muted">No hotels added</div>
                                    ) : (
                                      option.hotels.map((hotel, hotelIndex) => (
                                        <div
                                          key={`${hotel?.HOTEL_NAME || "hotel"}-${hotelIndex}`}
                                          className={
                                            hotelIndex === option.hotels.length - 1
                                              ? ""
                                              : "border-bottom pb-3 mb-3"
                                          }
                                        >
                                          <div className="fw-semibold mb-1">
                                            {hotel?.HOTEL_NAME || "-"}
                                          </div>
                                          <div className="text-muted mb-1">
                                            <i className="bx bx-map me-1" />
                                            {hotel?.HOTEL_CITY_VALUE || "-"}
                                          </div>
                                          <div className="text-muted mb-1">
                                            <i className="bx bx-star me-1" />
                                            {renderStars(hotel?.HOTEL_STARS)}
                                          </div>
                                          <div className="text-muted mb-2">
                                            <i className="bx bx-moon me-1" />
                                            {hotel?.TOTAL_NIGHTS || 0} night(s)
                                          </div>

                                          <div className="d-flex flex-wrap gap-2">
                                            <Badge color="light" className="p-2">
                                              BB: {formatCurrency(hotel?.TOTALS?.BB)}
                                            </Badge>
                                            <Badge color="light" className="p-2">
                                              HB: {formatCurrency(hotel?.TOTALS?.HB)}
                                            </Badge>
                                            <Badge color="light" className="p-2">
                                              FB: {formatCurrency(hotel?.TOTALS?.FB)}
                                            </Badge>
                                            <Badge color="light" className="p-2">
                                              SS: {formatCurrency(hotel?.TOTALS?.SS)}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </Col>

                                <Col lg="6">
                                  <div className="border rounded p-3 h-100">
                                    <h6 className="mb-3">
                                      <i className="bx bx-bed me-1 text-primary" />
                                      Stay breakdown
                                    </h6>

                                    {option.stays.length === 0 ? (
                                      <div className="text-muted">No stay breakdown found</div>
                                    ) : (
                                      option.stays.map((stay, stayIndex) => (
                                        <div
                                          key={`${stay?.HOTEL_NAME || "stay"}-${stayIndex}`}
                                          className={
                                            stayIndex === option.stays.length - 1
                                              ? ""
                                              : "border-bottom pb-3 mb-3"
                                          }
                                        >
                                          <div className="fw-semibold mb-1">
                                            Stop {stay?.ORDER || stayIndex + 1}:{" "}
                                            {stay?.HOTEL_NAME || "-"}
                                          </div>
                                          <div className="text-muted mb-1">
                                            <i className="bx bx-map-pin me-1" />
                                            {stay?.HOTEL_CITY_VALUE || "-"}
                                          </div>
                                          <div className="text-muted mb-1">
                                            <i className="bx bx-calendar me-1" />
                                            {stay?.SEASON_LABEL ||
                                              `${formatDateLabel(stay?.START_DATE)} to ${formatDateLabel(
                                                stay?.END_DATE,
                                              )}`}
                                          </div>
                                          <div className="text-muted mb-2">
                                            <i className="bx bx-moon me-1" />
                                            {stay?.NIGHTS || 0} night(s)
                                          </div>

                                          <div className="d-flex flex-wrap gap-2">
                                            <Badge color="light" className="p-2">
                                              BB: {formatCurrency(stay?.TOTALS?.BB)}
                                            </Badge>
                                            <Badge color="light" className="p-2">
                                              HB: {formatCurrency(stay?.TOTALS?.HB)}
                                            </Badge>
                                            <Badge color="light" className="p-2">
                                              FB: {formatCurrency(stay?.TOTALS?.FB)}
                                            </Badge>
                                            <Badge color="light" className="p-2">
                                              SS: {formatCurrency(stay?.TOTALS?.SS)}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))
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

          <Row>
            <Col xl="12">
              <Card>
                <CardBody>
                  <SectionTitle
                    icon="bx bx-gift"
                    title="Extra Services"
                    subtitle="Additional services included in the quotation."
                  />

                  {summaryLoading ? (
                    <LoadingState text="Loading extra services..." />
                  ) : extraServices.length === 0 ? (
                    <EmptyState text="No extra services were found for this quotation." />
                  ) : (
                    <Row className="g-3">
                      {extraServices.map((service, index) => (
                        <Col md="6" xl="4" key={service?._id || `service-${index}`}>
                          <Card className="border shadow-none h-100 mb-0">
                            <CardBody>
                              <div className="d-flex align-items-start justify-content-between gap-2 mb-3">
                                <div className="avatar-sm rounded-circle bg-light d-flex align-items-center justify-content-center">
                                  <i className="bx bx-plus-medical font-size-20 text-primary" />
                                </div>
                                {service?.SERVICE_COST_PP !== undefined &&
                                service?.SERVICE_COST_PP !== null ? (
                                  <Badge color="soft-success" className="font-size-12">
                                    {formatCurrency(service?.SERVICE_COST_PP)} pp
                                  </Badge>
                                ) : null}
                              </div>

                              <h5 className="mb-2">{service?.SERVICE_NAME || "-"}</h5>
                              <p className="text-muted mb-0">
                                {service?.SERVICE_DESCRIPTION || "No description provided."}
                              </p>
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