// path: src/pages/TravelAgents/TravelAgentDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Col,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import ReactEcharts from "echarts-for-react";

import RoleProtected from "../../components/Common/RoleProtected";
import {
  fetchTravelAgent,
  fetchTravelAgentQuotations,
  fetchTravelAgentsLookups,
} from "../../store/TravelAgents/actions";

const FREQUENCY_VIEWS = [
  { key: "daily", label: "Daily" },
  { key: "monthly", label: "Monthly" },
];

const unwrapId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
  }
  return "";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const formatShortDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    month: "short",
    day: "numeric",
  });
};

const formatNumber = (value) =>
  new Intl.NumberFormat().format(Number(value) || 0);

const daysBetween = (start, end) => {
  const startDate = new Date(start);
  const endDate = new Date(end);
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime()))
    return "-";
  return Math.max(0, Math.round((endDate - startDate) / 86400000));
};

const TravelAgentDetails = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();

  const {
    selected,
    loading,
    lookups,
    relatedQuotationsLoading,
    relatedQuotationsError,
    quotationsByAgent,
    quotationsAnalyticsByAgent,
  } = useSelector((s) => s.TravelAgents);

  const [frequencyView, setFrequencyView] = useState("daily");

  useEffect(() => {
    dispatch(fetchTravelAgentsLookups());
    dispatch(fetchTravelAgent(id));
    dispatch(fetchTravelAgentQuotations(id));
  }, [dispatch, id]);

  const countryMap = useMemo(() => {
    const map = new Map();
    (lookups?.COUNTRIES || []).forEach((x) =>
      map.set(unwrapId(x?._id), x.ITEM_VALUE),
    );
    return map;
  }, [lookups?.COUNTRIES]);

  const quotationTypeMap = useMemo(() => {
    const map = new Map();
    (lookups?.QUOTATION_TYPE || []).forEach((x) => {
      map.set(unwrapId(x?._id), x.ITEM_VALUE || x.LIST_LABEL || x.NAME || "-");
    });
    return map;
  }, [lookups?.QUOTATION_TYPE]);

  const quotations = quotationsByAgent[id] || [];
  const analytics = quotationsAnalyticsByAgent[id] || null;

  const derivedAnalytics = useMemo(() => {
    if (!quotations.length) {
      return {
        totalPax: 0,
        averagePax: 0,
        averageDuration: 0,
        activeCount: 0,
      };
    }

    const totalPax = quotations.reduce(
      (sum, item) => sum + Number(item?.NUMBER_OF_PAX || 0),
      0,
    );
    const totalDuration = quotations.reduce(
      (sum, item) =>
        sum +
        Number(item?.DURATION_IN_DAYS || item?.QUOTATION_DURATION_DAYS || 0),
      0,
    );
    const activeCount = quotations.filter((item) => item?.ACTIVE_STATUS).length;

    return {
      totalPax,
      averagePax: totalPax / quotations.length,
      averageDuration: totalDuration / quotations.length,
      activeCount,
    };
  }, [quotations]);

  const frequencySeries = useMemo(() => {
    const rows = analytics?.createdFrequency?.[frequencyView];
    return Array.isArray(rows) ? rows : [];
  }, [analytics, frequencyView]);

  const frequencyChartOption = useMemo(() => {
    if (!frequencySeries.length) return null;

    return {
      color: ["#556ee6"],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(16,24,40,0.92)",
        borderWidth: 0,
        textStyle: { color: "#fff" },
      },
      grid: {
        left: 18,
        right: 18,
        top: 54,
        bottom: 18,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: frequencySeries.map((item) => item.date || item.month || "-"),
        axisLine: {
          lineStyle: { color: "rgba(166,176,207,0.35)" },
        },
        axisLabel: {
          color: "#6c757d",
        },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: {
          lineStyle: { color: "rgba(166,176,207,0.12)" },
        },
        axisLine: { show: false },
        axisLabel: {
          color: "#6c757d",
        },
      },
      series: [
        {
          name: frequencyView === "daily" ? "Daily Created" : "Monthly Created",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 3 },
          areaStyle: { color: "rgba(85,110,230,0.12)" },
          data: frequencySeries.map((item) => Number(item?.count || 0)),
        },
      ],
    };
  }, [frequencySeries, frequencyView]);

  const quotationMixChartOption = useMemo(() => {
    if (!quotations.length) return null;

    return {
      color: ["#34c38f", "#50a5f1"],
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(16,24,40,0.92)",
        borderWidth: 0,
        textStyle: { color: "#fff" },
      },
      legend: {
        top: 0,
        right: 0,
        icon: "circle",
        textStyle: { color: "#6c757d" },
      },
      grid: {
        left: 18,
        right: 18,
        top: 54,
        bottom: 18,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        data: quotations.map((item) => item?.REFERANCE_NUMBER || "-"),
        axisLine: {
          lineStyle: { color: "rgba(166,176,207,0.35)" },
        },
        axisLabel: {
          color: "#6c757d",
          interval: 0,
          rotate: quotations.length > 4 ? 18 : 0,
        },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: {
          lineStyle: { color: "rgba(166,176,207,0.12)" },
        },
        axisLine: { show: false },
        axisLabel: { color: "#6c757d" },
      },
      series: [
        {
          name: "PAX",
          type: "bar",
          barMaxWidth: 28,
          borderRadius: [8, 8, 0, 0],
          data: quotations.map((item) => Number(item?.NUMBER_OF_PAX || 0)),
        },
        {
          name: "Duration",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 3 },
          data: quotations.map((item) =>
            Number(
              item?.DURATION_IN_DAYS || item?.QUOTATION_DURATION_DAYS || 0,
            ),
          ),
        },
      ],
    };
  }, [quotations]);

  return (
    <RoleProtected allowedRoles={["COMPANY_ADMIN", "CONTRACTING", "USER"]}>
      <div className="page-content travel-agent-details-page">
        <div className="container-fluid">
          <Row className="mb-3">
            <Col md={6}>
              <h4 className="mb-0">Travel Agent Details</h4>
              <div className="text-muted">{selected?._id}</div>
            </Col>
            <Col md={6} className="text-end">
              <Button
                color="secondary"
                outline
                className="me-2"
                onClick={() => nav("/travel-agents")}
              >
                Back
              </Button>
              <Button
                color="secondary"
                outline
                onClick={() => {
                  dispatch(fetchTravelAgent(id));
                  dispatch(fetchTravelAgentQuotations(id));
                }}
                disabled={relatedQuotationsLoading}
              >
                Refresh
              </Button>
            </Col>
          </Row>

          {loading && !selected ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <>
              <Card className="mb-4">
                <CardBody>
                  <Row>
                    <Col md={6} className="mb-3">
                      <b>Agent Name:</b> {selected?.AGENT_NAME || "-"}
                    </Col>
                    <Col md={6} className="mb-3">
                      <b>Agent Email:</b> {selected?.AGENT_EMAIL || "-"}
                    </Col>
                    <Col md={6} className="mb-3">
                      <b>Country:</b>{" "}
                      {countryMap.get(unwrapId(selected?.AGENT_COUNTRY)) || "-"}
                    </Col>
                    <Col md={6} className="mb-3">
                      <b>Phone:</b> {selected?.AGENT_PHONE || "-"}
                    </Col>
                    <Col md={6} className="mb-3">
                      <b>Status:</b>{" "}
                      {selected?.ACTIVE_STATUS ? "Active" : "Inactive"}
                    </Col>
                    <Col md={6} className="mb-3">
                      <b>Created On:</b> {formatDate(selected?.CREATED_ON)}
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              {relatedQuotationsError ? (
                <Alert color="danger" className="mb-4">
                  {relatedQuotationsError}
                </Alert>
              ) : null}

              {relatedQuotationsLoading && !quotations.length ? (
                <div className="text-center py-5">
                  <Spinner />
                </div>
              ) : (
                <>
                  <Row className="g-4 mb-4">
                    <Col xl={3} md={6}>
                      <Card className="travel-agent-stat-card h-100">
                        <CardBody>
                          <span className="travel-agent-stat-card__label">
                            Total Quotations
                          </span>
                          <h3 className="travel-agent-stat-card__value">
                            {formatNumber(
                              analytics?.totalQuotations || quotations.length,
                            )}
                          </h3>
                          <p className="mb-0 text-muted">
                            Since {formatShortDate(analytics?.firstCreatedOn)}
                          </p>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col xl={3} md={6}>
                      <Card className="travel-agent-stat-card h-100">
                        <CardBody>
                          <span className="travel-agent-stat-card__label">
                            Total PAX
                          </span>
                          <h3 className="travel-agent-stat-card__value">
                            {formatNumber(derivedAnalytics.totalPax)}
                          </h3>
                          <p className="mb-0 text-muted">
                            Avg. {derivedAnalytics.averagePax.toFixed(1)} pax
                            per quotation
                          </p>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col xl={3} md={6}>
                      <Card className="travel-agent-stat-card h-100">
                        <CardBody>
                          <span className="travel-agent-stat-card__label">
                            Average Duration
                          </span>
                          <h3 className="travel-agent-stat-card__value">
                            {derivedAnalytics.averageDuration.toFixed(1)}
                          </h3>
                          <p className="mb-0 text-muted">
                            Days across listed quotations
                          </p>
                        </CardBody>
                      </Card>
                    </Col>
                    <Col xl={3} md={6}>
                      <Card className="travel-agent-stat-card h-100">
                        <CardBody>
                          <span className="travel-agent-stat-card__label">
                            Last Activity
                          </span>
                          <h3 className="travel-agent-stat-card__value">
                            {formatShortDate(analytics?.lastCreatedOn)}
                          </h3>
                          <p className="mb-0 text-muted">
                            {formatNumber(derivedAnalytics.activeCount)} active
                            quotations
                          </p>
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>

                  <Row className="g-4 mb-4">
                    <Col xl={7}>
                      <Card className="travel-agent-chart-card h-100">
                        <CardBody>
                          <div className="travel-agent-chart-card__header">
                            <div>
                              <h5 className="mb-1">
                                Quotation Creation Frequency
                              </h5>
                            </div>
                            <ButtonGroup className="travel-agent-chart-card__switch">
                              {FREQUENCY_VIEWS.map((view) => (
                                <Button
                                  key={view.key}
                                  color={
                                    frequencyView === view.key
                                      ? "primary"
                                      : "light"
                                  }
                                  onClick={() => setFrequencyView(view.key)}
                                >
                                  {view.label}
                                </Button>
                              ))}
                            </ButtonGroup>
                          </div>

                          {frequencyChartOption ? (
                            <ReactEcharts
                              option={frequencyChartOption}
                              style={{ height: 340 }}
                            />
                          ) : (
                            <div className="text-center py-5 text-muted">
                              No frequency analytics available.
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </Col>

                    <Col xl={5}>
                      <Card className="travel-agent-chart-card h-100">
                        <CardBody>
                          <div className="travel-agent-chart-card__header">
                            <div>
                              <h5 className="mb-1">Quotation Mix</h5>
                              <p className="text-muted mb-0">
                                PAX and duration per quotation reference.
                              </p>
                            </div>
                            <Badge
                              color="light"
                              className="travel-agent-chart-card__badge"
                            >
                              {formatNumber(quotations.length)} rows
                            </Badge>
                          </div>

                          {quotationMixChartOption ? (
                            <ReactEcharts
                              option={quotationMixChartOption}
                              style={{ height: 340 }}
                            />
                          ) : (
                            <div className="text-center py-5 text-muted">
                              No quotation mix data available.
                            </div>
                          )}
                        </CardBody>
                      </Card>
                    </Col>
                  </Row>

                  <Card>
                    <CardBody>
                      <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mb-3">
                        <div>
                          <h5 className="mb-1">Related Quotations</h5>
                        </div>
                        <Badge color="light">
                          {formatNumber(quotations.length)} quotations
                        </Badge>
                      </div>

                      {quotations.length === 0 ? (
                        <div className="text-center py-5 text-muted">
                          No quotations found for this travel agent.
                        </div>
                      ) : (
                        <div className="table-responsive">
                          <Table className="table align-middle table-nowrap mb-0">
                            <thead className="table-light">
                              <tr>
                                <th>Reference</th>
                                <th>Quotation Type</th>
                                <th>Nationality</th>
                                <th>Start</th>
                                <th>End</th>
                                <th>Duration</th>
                                <th>PAX</th>
                                <th>Status</th>
                                <th style={{ width: 120 }}>Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quotations.map((row) => (
                                <tr key={row._id}>
                                  <td>
                                    <strong>
                                      {row?.REFERANCE_NUMBER || "-"}
                                    </strong>
                                  </td>
                                  <td>
                                    {quotationTypeMap.get(
                                      unwrapId(row?.QUOTATION_TYPE),
                                    ) || "-"}
                                  </td>
                                  <td>
                                    {countryMap.get(
                                      unwrapId(row?.NATIONALITY),
                                    ) || "-"}
                                  </td>
                                  <td>
                                    {formatDate(row?.QUOTATION_START_DATE)}
                                  </td>
                                  <td>{formatDate(row?.QUOTATION_END_DATE)}</td>
                                  <td>
                                    {formatNumber(
                                      row?.DURATION_IN_DAYS ||
                                        row?.QUOTATION_DURATION_DAYS ||
                                        0,
                                    )}{" "}
                                    days
                                  </td>
                                  <td>{formatNumber(row?.NUMBER_OF_PAX)}</td>
                                  <td>
                                    <Badge
                                      color={
                                        row?.ACTIVE_STATUS
                                          ? "success"
                                          : "secondary"
                                      }
                                    >
                                      {row?.ACTIVE_STATUS
                                        ? "Active"
                                        : "Inactive"}
                                    </Badge>
                                  </td>
                                  <td>
                                    <Button
                                      tag={Link}
                                      to={`/quotations/${row?._id}`}
                                      color="primary"
                                      size="sm"
                                    >
                                      View
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                        </div>
                      )}
                    </CardBody>
                  </Card>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </RoleProtected>
  );
};

export default TravelAgentDetails;
