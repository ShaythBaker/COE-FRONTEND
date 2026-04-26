// path: src/pages/QuotationPricing/Details.jsx
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
import { get } from "../../helpers/api_helper";
import {
  approveQuotationPricing,
  fetchQuotationPricing,
  rejectQuotationPricing,
  updateQuotationPricingProfit,
} from "../../store/QuotationPricing/actions";
import { fetchQuotation } from "../../store/Quotations/actions";

const ALLOWED_ROLES = ["ACCOUNTING", "COMPANY_ADMIN"];

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

const InfoPill = ({ label, value }) => (
  <div className="border rounded px-3 py-2 bg-light">
    <div className="text-muted small">{label}</div>
    <div className="fw-semibold">{value}</div>
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

  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeData, setFinanceData] = useState(null);

  const [profitForm, setProfitForm] = useState({
    PROFIT_TYPE: "PERCENT",
    PROFIT_VALUE: "0",
  });
  const [profitTouched, setProfitTouched] = useState({});
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectTouched, setRejectTouched] = useState(false);

  useEffect(() => {
    if (!canAccess || !quotationId) return;
    dispatch(fetchQuotationPricing(quotationId));
    dispatch(fetchQuotation(quotationId));
  }, [dispatch, canAccess, quotationId]);

  useEffect(() => {
    let ignore = false;

    const loadFinance = async () => {
      if (!canAccess || !quotationId) return;
      setFinanceLoading(true);

      try {
        const response = await get(`/quotation-finances/quotation/${quotationId}`);
        if (!ignore) {
          setFinanceData(response || null);
        }
      } catch (error) {
        if (!ignore) {
          setFinanceData(null);
          notifyError(
            getErrorMessage(error, "Failed to load quotation finance details.")
          );
        }
      } finally {
        if (!ignore) {
          setFinanceLoading(false);
        }
      }
    };

    loadFinance();

    return () => {
      ignore = true;
    };
  }, [canAccess, quotationId]);

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

    const accommodationOptions = Array.isArray(accommodation?.OPTIONS)
      ? accommodation.OPTIONS
      : [];

    const accommodationRows = [];
    let accommodationTotal = 0;

    accommodationOptions.forEach(option => {
      const cityGroups = Array.isArray(option?.CITY_GROUPS) ? option.CITY_GROUPS : [];

      cityGroups.forEach(cityGroup => {
        const stays = Array.isArray(cityGroup?.STAYS) ? cityGroup.STAYS : [];

        stays.forEach(stay => {
          const nights = Number(stay?.NIGHTS || 0) || 0;
          const seasonRates = stay?.SEASON_RATES || {};
          const { bb, hb, fb, ss, perPerson } = resolveHotelBoardBase(seasonRates);

          const stayPerPerson = perPerson * nights;
          const stayTotal = stayPerPerson * pax;

          accommodationTotal += stayTotal;

          accommodationRows.push({
            optionName: option?.OPTION_NAME || "-",
            cityName: cityGroup?.CITY_NAME || stay?.HOTEL_CITY_VALUE || "-",
            overnightDate: stay?.OVERNIGHT_DATE || cityGroup?.OVERNIGHT_DATE || "",
            hotelName: stay?.HOTEL_NAME || "-",
            seasonName: stay?.SEASON_NAME || "-",
            nights,
            bb,
            hb,
            fb,
            ss,
            perPerson,
            stayPerPerson,
          });
        });
      });
    });

    const accommodationGroups = accommodationRows.reduce((acc, row) => {
      const key = row.optionName || "Option";
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(row);
      return acc;
    }, {});

    const accommodationOptionsList = Object.entries(accommodationGroups).map(
      ([optionName, rows]) => ({
        optionName,
        rows,
      })
    );

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

      const currentGuideCost = Number(day?.guide?.GUIDE_COST || 0) || 0;
      guideTotal += currentGuideCost;

      daysRows.push({
        dayOrder: Number(day?.DAY_ORDER || 0) || 0,
        dayDate: day?.DAY_DATE || "",
        routeText: day?.ROUTE_TEXT || "-",
        overnightCityName: day?.overnight?.OVERNIGHT_CITY_NAME || "-",
        guideEnabled: !!day?.guide?.enabled,
        guideTypeName: day?.guide?.GUIDE_TYPE_NAME || "-",
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

    const perPersonSummary = {
      accommodation: pax > 0 ? accommodationTotal / pax : accommodationTotal,
      transportation: pax > 0 ? transportationTotal / pax : transportationTotal,
      meals: pax > 0 ? mealsTotal / pax : mealsTotal,
      entranceFees: pax > 0 ? entranceFeesTotal / pax : entranceFeesTotal,
      guide: pax > 0 ? guideTotal / pax : guideTotal,
      extraServices: pax > 0 ? extraServicesTotal / pax : extraServicesTotal,
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
    };
  }, [financeData, boardBasis, pax, quotation?.NUMBER_OF_PAX, selected, quotation]);

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

  const handleApprove = () => {
    if (isTerminalStatus) {
      notifyError("This quotation pricing record is no longer editable.");
      return;
    }

    dispatch(
      approveQuotationPricing(quotationId, () => {
        dispatch(fetchQuotationPricing(quotationId));
        dispatch(fetchQuotation(quotationId));
      })
    );
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
    notifyError("Permission/role mismatch");
    return null;
  }

  document.title = "Quotation Pricing Details | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotation Pricing" breadcrumbItem="Details" />

          <Row className="mb-3">
            <Col xl="8">
              <Card className="border-0 shadow-sm">
                <CardBody>
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
                      <SectionHeader
                        icon="bx bx-dollar-circle"
                        title="Quotation Prices"
                        subtitle="Simple per-person pricing view for accommodation, routes and days, and extra services."
                      />

                      <div className="d-flex flex-wrap gap-2 mb-4">
                        <Badge color={getStatusColor(selected?.STATUS)} pill>
                          {selected?.STATUS || "-"}
                        </Badge>
                        <Badge color="light" className="text-dark" pill>
                          {financeData?.ACCOMMODATION?.REFERANCE_NUMBER ||
                            selected?.SNAPSHOT?.QUOTATION?.REFERANCE_NUMBER ||
                            "-"}
                        </Badge>
                        <Badge color="light" className="text-dark" pill>
                          {selected?.BOARD_BASIS || "-"}
                        </Badge>
                      </div>

                      <div className="d-flex flex-wrap gap-3">
                        <InfoPill
                          label="Reference Number"
                          value={
                            financeData?.ACCOMMODATION?.REFERANCE_NUMBER ||
                            selected?.SNAPSHOT?.QUOTATION?.REFERANCE_NUMBER ||
                            "-"
                          }
                        />
                        <InfoPill label="Pax" value={pax || "-"} />
                        <InfoPill label="Board Basis" value={selected?.BOARD_BASIS || "-"} />
                        <InfoPill label="Sent On" value={formatDateTime(selected?.SENT_ON)} />
                        <InfoPill
                          label="Quotation Status"
                          value={quotation?.STATUS || selected?.STATUS || "-"}
                        />
                      </div>

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
              <Card className="border-0 shadow-sm">
                <CardBody>
                  <h4 className="card-title mb-3">Quick Access</h4>
                  <div className="d-grid gap-2">
                    <Button
                      color="light"
                      type="button"
                      onClick={() => navigate("/quotation-pricing")}
                    >
                      Back to Queue
                    </Button>

                    <Button
                      color="primary"
                      type="button"
                      onClick={() => navigate(`/quotations/${quotationId}`)}
                    >
                      Quotation Details
                    </Button>
                  </div>
                </CardBody>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardBody>
                  <h4 className="card-title mb-3">Actions</h4>

                  {isTerminalStatus ? (
                    <Alert color="info" className="mb-0">
                      This quotation pricing record is already finalized and cannot be changed.
                    </Alert>
                  ) : (
                    <div className="d-grid gap-2">
                      <Button
                        color="success"
                        onClick={handleApprove}
                        disabled={saving || loading}
                      >
                        {saving ? <Spinner size="sm" className="me-2" /> : null}
                        Approve
                      </Button>

                      <Button
                        color="danger"
                        outline
                        onClick={() => setRejectOpen(true)}
                        disabled={saving || loading}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
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
                        title="Per Person Summary"
                        subtitle="Clean summary of the person price only."
                      />

                      <Row className="g-3">
                        <Col md="6" xl="2">
                          <PriceCard
                            title="Hotels"
                            value={pricingView.perPersonSummary.accommodation}
                          />
                        </Col>
                        <Col md="6" xl="2">
                          <PriceCard
                            title="Transportation"
                            value={pricingView.perPersonSummary.transportation}
                          />
                        </Col>
                        <Col md="6" xl="2">
                          <PriceCard
                            title="Meals"
                            value={pricingView.perPersonSummary.meals}
                          />
                        </Col>
                        <Col md="6" xl="2">
                          <PriceCard
                            title="Entrance Fees"
                            value={pricingView.perPersonSummary.entranceFees}
                          />
                        </Col>
                        <Col md="6" xl="2">
                          <PriceCard
                            title="Guide"
                            value={pricingView.perPersonSummary.guide}
                          />
                        </Col>
                        <Col md="6" xl="2">
                          <PriceCard
                            title="Extra Services"
                            value={pricingView.perPersonSummary.extraServices}
                          />
                        </Col>
                      </Row>

                      <Row className="g-3 mt-1">
                        <Col md="4">
                          <PriceCard
                            title="Base Total Per Person"
                            value={pricingView.perPersonSummary.baseTotal}
                            subtitle={`Pax: ${pax || 0}`}
                          />
                        </Col>
                        <Col md="4">
                          <PriceCard
                            title="Profit Amount"
                            value={selected?.PROFIT_AMOUNT}
                          />
                        </Col>
                        <Col md="4">
                          <PriceCard
                            title="Final Total"
                            value={selected?.FINAL_TOTAL || pricingView.baseTotal}
                          />
                        </Col>
                      </Row>
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
                        subtitle="Easy hotel view with person price only, separated by option."
                      />

                      {pricingView.accommodationOptionsList.length === 0 ? (
                        <Alert color="info" className="mb-0">
                          No accommodation pricing data found.
                        </Alert>
                      ) : (
                        <div className="d-flex flex-column gap-4">
                          {pricingView.accommodationOptionsList.map((option, optionIndex) => (
                            <div key={`${option.optionName}-${optionIndex}`}>
                              <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
                                <div>
                                  <h5 className="mb-1">{option.optionName}</h5>
                                  <div className="text-muted small">
                                    {option.rows.length} hotel
                                    {option.rows.length > 1 ? "s" : ""}
                                  </div>
                                </div>

                                <Badge color="primary" pill>
                                  Option {optionIndex + 1}
                                </Badge>
                              </div>

                              <Row className="g-3">
                                {option.rows.map((row, index) => (
                                  <Col xl="6" key={`${row.hotelName}-${index}`}>
                                    <div className="border rounded p-3 h-100">
                                      <div className="d-flex justify-content-between align-items-start gap-2 mb-3">
                                        <div>
                                          <h5 className="mb-1">{row.hotelName}</h5>
                                          <div className="text-muted small">
                                            {row.cityName} • {formatDate(row.overnightDate)}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="small text-muted mb-2">
                                        {row.seasonName}
                                      </div>

                                      <Row className="g-2">
                                        <Col sm="6">
                                          <div className="bg-light rounded p-2">
                                            <div className="text-muted small">BB</div>
                                            <div className="fw-semibold">
                                              {formatCurrency(row.bb)}
                                            </div>
                                          </div>
                                        </Col>
                                        <Col sm="6">
                                          <div className="bg-light rounded p-2">
                                            <div className="text-muted small">HB Add</div>
                                            <div className="fw-semibold">
                                              {formatCurrency(row.hb)}
                                            </div>
                                          </div>
                                        </Col>
                                        <Col sm="6">
                                          <div className="bg-light rounded p-2">
                                            <div className="text-muted small">FB Add</div>
                                            <div className="fw-semibold">
                                              {formatCurrency(row.fb)}
                                            </div>
                                          </div>
                                        </Col>
                                        <Col sm="6">
                                          <div className="bg-light rounded p-2">
                                            <div className="text-muted small">
                                              Single Supplement
                                            </div>
                                            <div className="fw-semibold">
                                              {formatCurrency(row.ss)}
                                            </div>
                                          </div>
                                        </Col>
                                        <Col sm="6">
                                          <div className="bg-light rounded p-2">
                                            <div className="text-muted small">Nights</div>
                                            <div className="fw-semibold">{row.nights}</div>
                                          </div>
                                        </Col>
                                        <Col sm="6">
                                          <div className="bg-primary-subtle rounded p-2">
                                            <div className="text-muted small">
                                              Person Price
                                            </div>
                                            <div className="fw-bold text-primary">
                                              {formatCurrency(row.stayPerPerson)}
                                            </div>
                                          </div>
                                        </Col>
                                      </Row>
                                    </div>
                                  </Col>
                                ))}
                              </Row>
                            </div>
                          ))}
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
                                    <div className="fw-bold text-primary">
                                      {formatCurrency(day.guideCostPerPerson)}
                                    </div>
                                  </div>
                                </Col>
                              </Row>
                            </div>
                          ))}
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