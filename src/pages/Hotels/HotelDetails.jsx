// path: src/pages/Hotels/HotelDetails.jsx
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Col,
  Form,
  FormFeedback,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import ReactEcharts from "echarts-for-react";

import RoleProtected from "../../components/Common/RoleProtected";
import {
  PublishedReviewsPanel,
  usePublishedReviews,
} from "../../components/Common/PublishedReviews";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import SpecialRatesTab from "./SpecialRatesTab";

import {
  fetchHotel,
  fetchHotelsLookups,
  fetchSeasonRates,
  createSeasonRate,
  updateSeasonRate,
  deleteSeasonRate,
} from "../../store/Hotels/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];
const RATE_CHART_VIEWS = [
  { key: "all", label: "All Rates" },
  { key: "boards", label: "Meal Plans" },
  { key: "supplement", label: "Supplement" },
];
const RATE_SERIES_META = [
  { key: "BB_RATE_AMOUNT", label: "BB", color: "#556ee6" },
  { key: "HB_RATE_AMOUNT", label: "HB", color: "#34c38f" },
  { key: "FB_RATE_AMOUNT", label: "FB", color: "#f1b44c" },
  {
    key: "SINGLE_SUPPLIMENT_AMOUNT",
    label: "Single Supplement",
    color: "#f46a6a",
  },
];

const emptyRate = {
  SEASON_NAME: "",
  ROOM_TYPE_ID: "",
  BB_RATE_AMOUNT: "",
  HB_RATE_AMOUNT: "",
  FB_RATE_AMOUNT: "",
  SINGLE_SUPPLIMENT_AMOUNT: "",
  START_DATE: "",
  END_DATE: "",
};

const idOf = (value) => String(value?._id || value || "");

const toRateNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toDateValue = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const formatChartDate = (value) => {
  const parsed = toDateValue(value);
  if (!parsed) return "-";
  return parsed.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatMoney = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return "-";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(parsed);
};

const HotelDetails = () => {
  const publishedReviews = usePublishedReviews("HOTEL");
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();

  const {
    selected,
    loading,
    lookups,
    seasonRatesByHotel,
    seasonRatesLoading,
  } = useSelector((s) => s.Hotels);

  const roles = useSelector((s) => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);
  const rates = useMemo(
    () => seasonRatesByHotel[id] || [],
    [id, seasonRatesByHotel]
  );

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({ ...emptyRate });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState({});
  const [rateChartView, setRateChartView] = useState("all");
  const [activeRatesTab, setActiveRatesTab] = useState("season");

  useEffect(() => {
    dispatch(fetchHotelsLookups());
    dispatch(fetchHotel(id));
    dispatch(fetchSeasonRates(id));
  }, [dispatch, id]);

  const cityMap = useMemo(() => {
    const map = new Map();
    (lookups?.CITIES || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.CITIES]);

  const chainMap = useMemo(() => {
    const map = new Map();
    (lookups?.HOTELCHAINS || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.HOTELCHAINS]);

  const seasonMap = useMemo(() => {
    const map = new Map();
    (lookups?.HOTELSEASONS || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.HOTELSEASONS]);

  const roomTypeMap = useMemo(() => {
    const map = new Map();
    (lookups?.ROOM_TYPES || []).forEach((x) => map.set(String(x._id), x.ITEM_VALUE));
    return map;
  }, [lookups?.ROOM_TYPES]);

  const roomTypeLabel = (value) =>
    value?.ITEM_VALUE || roomTypeMap.get(idOf(value)) || "Legacy (not assigned)";

  const normalizedRates = useMemo(
    () =>
      [...rates]
        .map((rate) => {
          const startDate = toDateValue(rate?.START_DATE);
          const endDate = toDateValue(rate?.END_DATE);

          return {
            ...rate,
            seasonLabel:
              seasonMap.get(idOf(rate?.SEASON_NAME)) || rate?.SEASON_NAME || "Season",
            startDate,
            endDate,
            amounts: {
              BB_RATE_AMOUNT: toRateNumber(rate?.BB_RATE_AMOUNT),
              HB_RATE_AMOUNT: toRateNumber(rate?.HB_RATE_AMOUNT),
              FB_RATE_AMOUNT: toRateNumber(rate?.FB_RATE_AMOUNT),
              SINGLE_SUPPLIMENT_AMOUNT: toRateNumber(rate?.SINGLE_SUPPLIMENT_AMOUNT),
            },
          };
        })
        .filter((rate) => rate.startDate && rate.endDate)
        .sort((a, b) => a.startDate - b.startDate),
    [rates, seasonMap]
  );

  const visibleRateKeys = useMemo(() => {
    if (rateChartView === "boards") {
      return ["BB_RATE_AMOUNT", "HB_RATE_AMOUNT", "FB_RATE_AMOUNT"];
    }
    if (rateChartView === "supplement") {
      return ["SINGLE_SUPPLIMENT_AMOUNT"];
    }
    return RATE_SERIES_META.map((item) => item.key);
  }, [rateChartView]);

  const seasonChartInsights = useMemo(() => {
    if (!normalizedRates.length) return null;

    const coverageStart = normalizedRates[0].startDate;
    const coverageEnd = normalizedRates.reduce(
      (latest, rate) => (rate.endDate > latest ? rate.endDate : latest),
      normalizedRates[0].endDate
    );

    const allEntries = normalizedRates.flatMap((rate) =>
      RATE_SERIES_META.map((series) => ({
        key: series.key,
        label: series.label,
        seasonLabel: rate.seasonLabel,
        value: rate.amounts[series.key],
      })).filter((entry) => entry.value !== null)
    );

    const highestPoint = allEntries.reduce(
      (top, entry) => (!top || entry.value > top.value ? entry : top),
      null
    );

    const widestVariance = normalizedRates.reduce((top, rate) => {
      const values = Object.values(rate.amounts).filter((value) => value !== null);
      if (!values.length) return top;
      const spread = Math.max(...values) - Math.min(...values);
      if (!top || spread > top.spread) {
        return { seasonLabel: rate.seasonLabel, spread };
      }
      return top;
    }, null);

    return {
      coverageStart,
      coverageEnd,
      highestPoint,
      widestVariance,
      seasonsCount: normalizedRates.length,
    };
  }, [normalizedRates]);

  const seasonRatesChartOption = useMemo(() => {
    if (!normalizedRates.length) return null;

    const activeSeriesMeta = RATE_SERIES_META.filter((series) =>
      visibleRateKeys.includes(series.key)
    );
    const primarySeriesKey = activeSeriesMeta[0]?.key;

    const activeSeries = activeSeriesMeta.map((series) => ({
      name: series.label,
      type: "line",
      smooth: 0.25,
      step: "end",
      symbol: "circle",
      symbolSize: 7,
      showSymbol: true,
      lineStyle: {
        width: series.key === "SINGLE_SUPPLIMENT_AMOUNT" ? 2 : 3,
        type: series.key === "SINGLE_SUPPLIMENT_AMOUNT" ? "dashed" : "solid",
      },
      emphasis: {
        focus: "series",
      },
      areaStyle:
        rateChartView === "supplement" && series.key === "SINGLE_SUPPLIMENT_AMOUNT"
          ? { color: "rgba(244,106,106,0.10)" }
          : rateChartView !== "supplement" && series.key === "BB_RATE_AMOUNT"
            ? { color: "rgba(85,110,230,0.08)" }
            : undefined,
      data: normalizedRates.flatMap((rate) => {
        const value = rate.amounts[series.key];
        if (value === null) return [];
        return [
          [
            rate.startDate.toISOString(),
            value,
            rate.seasonLabel,
            rate.endDate.toISOString(),
          ],
          [
            rate.endDate.toISOString(),
            value,
            rate.seasonLabel,
            rate.endDate.toISOString(),
          ],
        ];
      }),
      markArea:
        series.key === primarySeriesKey
          ? {
              silent: true,
              itemStyle: {
                color: "rgba(85,110,230,0.04)",
              },
              data: normalizedRates.map((rate) => [
                {
                  name: rate.seasonLabel,
                  xAxis: rate.startDate.toISOString(),
                },
                {
                  xAxis: rate.endDate.toISOString(),
                },
              ]),
            }
          : undefined,
    }));

    return {
      color: activeSeries.map((series) => {
        const meta = RATE_SERIES_META.find((item) => item.label === series.name);
        return meta?.color;
      }),
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(16,24,40,0.92)",
        borderWidth: 0,
        textStyle: { color: "#fff" },
        formatter: (params) => {
          const points = Array.isArray(params) ? params : [params];
          const seasonNames = [
            ...new Set(points.map((point) => point?.data?.[2]).filter(Boolean)),
          ];
          const title = formatChartDate(points[0]?.axisValue);
          const lines = points.map((point) => {
            const value = point?.data?.[1];
            return `${point.marker}${point.seriesName}: ${formatMoney(value)}`;
          });

          return [
            title,
            seasonNames.length ? `Season: ${seasonNames.join(", ")}` : null,
            ...lines,
          ]
            .filter(Boolean)
            .join("<br/>");
        },
      },
      legend: {
        top: 0,
        right: 0,
        icon: "circle",
        textStyle: {
          color: "#6c757d",
        },
      },
      grid: {
        left: 18,
        right: 18,
        top: 56,
        bottom: 72,
        containLabel: true,
      },
      dataZoom: [
        {
          type: "inside",
          xAxisIndex: 0,
        },
        {
          type: "slider",
          xAxisIndex: 0,
          height: 24,
          bottom: 18,
          borderColor: "transparent",
          backgroundColor: "rgba(166,176,207,0.12)",
          fillerColor: "rgba(85,110,230,0.14)",
          handleStyle: {
            color: "#556ee6",
          },
        },
      ],
      xAxis: {
        type: "time",
        axisLine: {
          lineStyle: {
            color: "rgba(166,176,207,0.35)",
          },
        },
        axisLabel: {
          color: "#6c757d",
          formatter: (value) =>
            new Date(value).toLocaleDateString("en-GB", {
              month: "short",
              day: "numeric",
            }),
        },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: {
            color: "rgba(166,176,207,0.12)",
          },
        },
        axisLine: { show: false },
        axisLabel: {
          color: "#6c757d",
          formatter: (value) => formatMoney(value),
        },
      },
      series: activeSeries,
    };
  }, [normalizedRates, rateChartView, visibleRateKeys]);

  const validateRate = (data) => {
    const e = {};

    if (!data.SEASON_NAME) e.SEASON_NAME = "Required";
    if (!data.ROOM_TYPE_ID) e.ROOM_TYPE_ID = "Required";
    if (!data.START_DATE) e.START_DATE = "Required";
    if (!data.END_DATE) e.END_DATE = "Required";

    if (
      data.START_DATE &&
      data.END_DATE &&
      new Date(data.START_DATE) > new Date(data.END_DATE)
    ) {
      e.END_DATE = "End Date must be after or equal to Start Date";
    }

    return e;
  };

  const errors = useMemo(() => validateRate(form), [form]);

  const openCreate = () => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }
    setTouched({});
    setEditing(null);
    setForm({ ...emptyRate });
    setCreateOpen(true);
  };

  const openEdit = (r) => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    const toDate = (v) => (v ? String(v).slice(0, 10) : "");

    setTouched({});
    setEditing(r);
    setForm({
      SEASON_NAME: idOf(r?.SEASON_NAME),
      ROOM_TYPE_ID: idOf(r?.ROOM_TYPE_ID),
      BB_RATE_AMOUNT: r?.BB_RATE_AMOUNT ?? "",
      HB_RATE_AMOUNT: r?.HB_RATE_AMOUNT ?? "",
      FB_RATE_AMOUNT: r?.FB_RATE_AMOUNT ?? "",
      SINGLE_SUPPLIMENT_AMOUNT: r?.SINGLE_SUPPLIMENT_AMOUNT ?? "",
      START_DATE: toDate(r?.START_DATE),
      END_DATE: toDate(r?.END_DATE),
    });
    setEditOpen(true);
  };

  const openDelete = (r) => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }
    setDeleting(r);
    setDeleteOpen(true);
  };

  const submitCreate = (e) => {
    e.preventDefault();

    setTouched({
      SEASON_NAME: true,
      ROOM_TYPE_ID: true,
      START_DATE: true,
      END_DATE: true,
    });

    if (Object.keys(errors).length) {
      notifyError("Validation fail");
      return;
    }

    dispatch(
      createSeasonRate(id, form, () => {
        setCreateOpen(false);
        setForm({ ...emptyRate });
      })
    );
  };

  const submitEdit = (e) => {
    e.preventDefault();

    setTouched({
      SEASON_NAME: true,
      ROOM_TYPE_ID: true,
      START_DATE: true,
      END_DATE: true,
    });

    if (Object.keys(errors).length) {
      notifyError("Validation fail");
      return;
    }

    dispatch(
      updateSeasonRate(id, editing?._id, form, () => {
        setEditOpen(false);
        setEditing(null);
        setForm({ ...emptyRate });
      })
    );
  };

  const confirmDelete = () => {
    dispatch(
      deleteSeasonRate(id, deleting?._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
      })
    );
  };

  const onChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <RoleProtected allowedRoles={ALLOWED_ROLES}>
      <div className="page-content hotel-details-page">
        <div className="container-fluid">
          <Row className="mb-3">
            <Col md={6}>
              <h4 className="mb-0">Hotel Details</h4>
              <div className="text-muted">{selected?._id}</div>
            </Col>
            <Col md={6} className="text-end">
              <Button
                color="secondary"
                outline
                className="me-2"
                onClick={() => nav("/hotels")}
              >
                Back
              </Button>
              <Button
                color="secondary"
                outline
                onClick={() => dispatch(fetchSeasonRates(id))}
                disabled={seasonRatesLoading}
              >
                Refresh Rates
              </Button>
            </Col>
          </Row>

          {loading && !selected ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <>
              <Card className="mb-3">
                <CardBody>
                  <Row>
                    <Col md={6} className="mb-2">
                      <b>Name:</b> {selected?.HOTEL_NAME || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Reservation Email:</b> {selected?.RESERVATION_EMAIL || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>City:</b> {cityMap.get(selected?.HOTEL_CITY) || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Chain:</b> {chainMap.get(selected?.HOTEL_CHAIN) || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Stars:</b> {selected?.HOTEL_STARS ?? "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Phone:</b> {selected?.HOTEL_PHONE || "-"}
                    </Col>
                    <Col md={12} className="mb-2">
                      <b>Website:</b>{" "}
                      {selected?.HOTEL_WEBSITE ? (
                        <a
                          href={selected.HOTEL_WEBSITE}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selected.HOTEL_WEBSITE}
                        </a>
                      ) : (
                        "-"
                      )}
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              <PublishedReviewsPanel
                sourceName={selected?.HOTEL_NAME || ""}
                reviewState={publishedReviews}
              />

              <Nav tabs className="mb-3">
                <NavItem>
                  <NavLink
                    data-testid="season-rates-tab"
                    tag="button"
                    type="button"
                    active={activeRatesTab === "season"}
                    onClick={() => setActiveRatesTab("season")}
                  >
                    Season Rates
                  </NavLink>
                </NavItem>
                <NavItem>
                  <NavLink
                    data-testid="special-rates-tab"
                    tag="button"
                    type="button"
                    active={activeRatesTab === "special"}
                    onClick={() => setActiveRatesTab("special")}
                  >
                    Special Rates
                  </NavLink>
                </NavItem>
              </Nav>

              {activeRatesTab === "season" ? (
              <Card>
                <CardBody>
                  <Row className="mb-3">
                    <Col md={6}>
                      <h5 className="mb-0">Season Rates</h5>
                    </Col>
                    <Col md={6} className="text-end">
                      <Button
                        color="primary"
                        onClick={openCreate}
                        disabled={!canMutate}
                      >
                        <i className="bx bx-plus me-1" />
                        Create Season Rate
                      </Button>
                    </Col>
                  </Row>

                  {seasonRatesLoading ? (
                    <div className="text-center py-4">
                      <Spinner />
                    </div>
                  ) : rates.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      No season rates found.
                    </div>
                  ) : (
                    <>
                      {seasonChartInsights && seasonRatesChartOption ? (
                        <div className="hotel-season-chart mb-4">
                          <div className="hotel-season-chart__toolbar">
                            <div>
                              <h6 className="hotel-season-chart__title mb-1">
                                Season Pricing Timeline
                              </h6>
                              <p className="text-muted mb-0">
                                Seasonal pricing movement across time with rate
                                variance by board basis.
                              </p>
                            </div>
                            <ButtonGroup className="hotel-season-chart__switch">
                              {RATE_CHART_VIEWS.map((view) => (
                                <Button
                                  key={view.key}
                                  color={
                                    rateChartView === view.key
                                      ? "primary"
                                      : "light"
                                  }
                                  onClick={() => setRateChartView(view.key)}
                                >
                                  {view.label}
                                </Button>
                              ))}
                            </ButtonGroup>
                          </div>

                          <Row className="g-3 mb-3">
                            <Col lg={4} md={6}>
                              <div className="hotel-season-chart__insight">
                                <span className="hotel-season-chart__label">
                                  Coverage Window
                                </span>
                                <strong>
                                  {formatChartDate(
                                    seasonChartInsights.coverageStart
                                  )}{" "}
                                  to{" "}
                                  {formatChartDate(
                                    seasonChartInsights.coverageEnd
                                  )}
                                </strong>
                                <p className="mb-0">
                                  {seasonChartInsights.seasonsCount} configured
                                  seasons
                                </p>
                              </div>
                            </Col>
                            <Col lg={4} md={6}>
                              <div className="hotel-season-chart__insight">
                                <span className="hotel-season-chart__label">
                                  Highest Published Rate
                                </span>
                                <strong>
                                  {seasonChartInsights.highestPoint
                                    ? `${seasonChartInsights.highestPoint.label}: ${formatMoney(
                                        seasonChartInsights.highestPoint.value
                                      )}`
                                    : "-"}
                                </strong>
                                <p className="mb-0">
                                  {seasonChartInsights.highestPoint?.seasonLabel ||
                                    "No season"}
                                </p>
                              </div>
                            </Col>
                            <Col lg={4} md={12}>
                              <div className="hotel-season-chart__insight">
                                <span className="hotel-season-chart__label">
                                  Widest Variance
                                </span>
                                <strong>
                                  {seasonChartInsights.widestVariance
                                    ? formatMoney(
                                        seasonChartInsights.widestVariance.spread
                                      )
                                    : "-"}
                                </strong>
                                <p className="mb-0">
                                  {seasonChartInsights.widestVariance?.seasonLabel ||
                                    "No season"}
                                </p>
                              </div>
                            </Col>
                          </Row>

                          <ReactEcharts
                            option={seasonRatesChartOption}
                            style={{ height: 420 }}
                          />

                          <div className="hotel-season-chart__legend">
                            {normalizedRates.map((rate) => (
                              <Badge
                                key={`${rate.seasonLabel}-${rate._id}`}
                                color="light"
                                className="hotel-season-chart__season-badge"
                              >
                                {rate.seasonLabel}:{" "}
                                {formatChartDate(rate.startDate)} -{" "}
                                {formatChartDate(rate.endDate)}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="table-responsive">
                      <Table className="table align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Season</th>
                            <th>Room Type</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>BB</th>
                            <th>HB</th>
                            <th>FB</th>
                            <th>Single Supp.</th>
                            <th style={{ width: 160 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rates.map((r) => (
                            <tr key={r._id}>
                              <td>{seasonMap.get(idOf(r.SEASON_NAME)) || "-"}</td>
                              <td>{roomTypeLabel(r.ROOM_TYPE_ID)}</td>
                              <td>{String(r.START_DATE || "").slice(0, 10)}</td>
                              <td>{String(r.END_DATE || "").slice(0, 10)}</td>
                              <td>{r.BB_RATE_AMOUNT ?? "-"}</td>
                              <td>{r.HB_RATE_AMOUNT ?? "-"}</td>
                              <td>{r.FB_RATE_AMOUNT ?? "-"}</td>
                              <td>{r.SINGLE_SUPPLIMENT_AMOUNT ?? "-"}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    color="warning"
                                    size="sm"
                                    onClick={() => openEdit(r)}
                                    disabled={!canMutate}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => openDelete(r)}
                                    disabled={!canMutate}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </Table>
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
              ) : (
                <SpecialRatesTab
                  hotelId={id}
                  canMutate={canMutate}
                />
              )}
            </>
          )}

          <Modal
            data-testid="create-season-rate-modal"
            isOpen={createOpen}
            toggle={() => setCreateOpen((v) => !v)}
            size="lg"
          >
            <ModalHeader toggle={() => setCreateOpen(false)}>
              Create Season Rate
            </ModalHeader>
            <Form onSubmit={submitCreate}>
              <ModalBody>
                <Row>
                  <Col md={6} className="mb-3">
                    <Label>Season *</Label>
                    <Input
                      type="select"
                      value={form.SEASON_NAME}
                      onChange={(e) => onChange("SEASON_NAME", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, SEASON_NAME: true }))
                      }
                      invalid={!!(touched.SEASON_NAME && errors.SEASON_NAME)}
                    >
                      <option value="">Select...</option>
                      {(lookups.HOTELSEASONS || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.SEASON_NAME}</FormFeedback>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Label>Room Type *</Label>
                    <Input
                      type="select"
                      value={form.ROOM_TYPE_ID}
                      onChange={(e) => onChange("ROOM_TYPE_ID", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, ROOM_TYPE_ID: true }))
                      }
                      invalid={!!(touched.ROOM_TYPE_ID && errors.ROOM_TYPE_ID)}
                    >
                      <option value="">Select...</option>
                      {(lookups.ROOM_TYPES || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.ROOM_TYPE_ID}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={form.START_DATE}
                      onChange={(e) => onChange("START_DATE", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, START_DATE: true }))
                      }
                      invalid={!!(touched.START_DATE && errors.START_DATE)}
                    />
                    <FormFeedback>{errors.START_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={form.END_DATE}
                      onChange={(e) => onChange("END_DATE", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, END_DATE: true }))}
                      invalid={!!(touched.END_DATE && errors.END_DATE)}
                    />
                    <FormFeedback>{errors.END_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>BB</Label>
                    <Input
                      type="number"
                      value={form.BB_RATE_AMOUNT}
                      onChange={(e) => onChange("BB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>HB</Label>
                    <Input
                      type="number"
                      value={form.HB_RATE_AMOUNT}
                      onChange={(e) => onChange("HB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>FB</Label>
                    <Input
                      type="number"
                      value={form.FB_RATE_AMOUNT}
                      onChange={(e) => onChange("FB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Single Supplement</Label>
                    <Input
                      type="number"
                      value={form.SINGLE_SUPPLIMENT_AMOUNT}
                      onChange={(e) =>
                        onChange("SINGLE_SUPPLIMENT_AMOUNT", e.target.value)
                      }
                    />
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={seasonRatesLoading}>
                  Save
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal
            isOpen={editOpen}
            toggle={() => setEditOpen((v) => !v)}
            size="lg"
          >
            <ModalHeader toggle={() => setEditOpen(false)}>
              Edit Season Rate
            </ModalHeader>
            <Form onSubmit={submitEdit}>
              <ModalBody>
                <Row>
                  <Col md={6} className="mb-3">
                    <Label>Season *</Label>
                    <Input
                      type="select"
                      value={form.SEASON_NAME}
                      onChange={(e) => onChange("SEASON_NAME", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, SEASON_NAME: true }))
                      }
                      invalid={!!(touched.SEASON_NAME && errors.SEASON_NAME)}
                    >
                      <option value="">Select...</option>
                      {(lookups.HOTELSEASONS || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.SEASON_NAME}</FormFeedback>
                  </Col>

                  <Col md={6} className="mb-3">
                    <Label>Room Type *</Label>
                    <Input
                      type="select"
                      value={form.ROOM_TYPE_ID}
                      onChange={(e) => onChange("ROOM_TYPE_ID", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, ROOM_TYPE_ID: true }))
                      }
                      invalid={!!(touched.ROOM_TYPE_ID && errors.ROOM_TYPE_ID)}
                    >
                      <option value="">Select...</option>
                      {(lookups.ROOM_TYPES || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.ROOM_TYPE_ID}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={form.START_DATE}
                      onChange={(e) => onChange("START_DATE", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, START_DATE: true }))
                      }
                      invalid={!!(touched.START_DATE && errors.START_DATE)}
                    />
                    <FormFeedback>{errors.START_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={form.END_DATE}
                      onChange={(e) => onChange("END_DATE", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, END_DATE: true }))}
                      invalid={!!(touched.END_DATE && errors.END_DATE)}
                    />
                    <FormFeedback>{errors.END_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>BB</Label>
                    <Input
                      type="number"
                      value={form.BB_RATE_AMOUNT}
                      onChange={(e) => onChange("BB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>HB</Label>
                    <Input
                      type="number"
                      value={form.HB_RATE_AMOUNT}
                      onChange={(e) => onChange("HB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>FB</Label>
                    <Input
                      type="number"
                      value={form.FB_RATE_AMOUNT}
                      onChange={(e) => onChange("FB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Single Supplement</Label>
                    <Input
                      type="number"
                      value={form.SINGLE_SUPPLIMENT_AMOUNT}
                      onChange={(e) =>
                        onChange("SINGLE_SUPPLIMENT_AMOUNT", e.target.value)
                      }
                    />
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={seasonRatesLoading}>
                  Update
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen((v) => !v)}>
            <ModalHeader toggle={() => setDeleteOpen(false)}>
              Confirm Delete
            </ModalHeader>
            <ModalBody>
              Are you sure you want to delete this rate for{" "}
              <b>{seasonMap.get(deleting?.SEASON_NAME) || "Season"}</b>?
            </ModalBody>
            <ModalFooter>
              <Button
                color="secondary"
                onClick={() => setDeleteOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                color="danger"
                onClick={confirmDelete}
                disabled={seasonRatesLoading}
              >
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </div>
    </RoleProtected>
  );
};

export default HotelDetails;
