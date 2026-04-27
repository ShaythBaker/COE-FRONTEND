import PropTypes from "prop-types";
import React, { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Col,
  Container,
  Row,
} from "reactstrap";
import { Chart, registerables } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ReactEcharts from "echarts-for-react";

import Breadcrumbs from "../../components/Common/Breadcrumb";
import { withTranslation } from "react-i18next";
import { ADMIN_ROLE, dashboardAnalyticsMock } from "./mockAnalytics";

Chart.register(...registerables);

const ECHART_COLORS = ["#556ee6", "#34c38f", "#f1b44c", "#50a5f1", "#f46a6a", "#74788d"];
const CHARTJS_COLORS = ["#556ee6", "#34c38f", "#f1b44c", "#f46a6a", "#50a5f1", "#6f42c1", "#adb5bd"];

const HOTEL_MODES = [
  { key: "city", label: "By City", type: "pie" },
  { key: "chain", label: "By Chain", type: "doughnut" },
  { key: "stars", label: "By Stars", type: "doughnut" },
];

const QUOTATION_VIEWS = [
  { key: "volume", label: "Volume Focus" },
  { key: "status", label: "Status Focus" },
];

const formatNumber = (value) => new Intl.NumberFormat().format(value || 0);

const buildSparklinePoints = (data) => {
  if (!Array.isArray(data) || !data.length) return "";

  const width = 100;
  const height = 36;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return data
    .map((value, index) => {
      const x = (index / Math.max(data.length - 1, 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");
};

const StatCard = ({ icon, label, value, trend, accentClass, footer }) => (
  <Card className="dashboard-stat-card h-100">
    <CardBody>
      <div className="dashboard-stat-card__top">
        <div>
          <span className="dashboard-stat-card__label">{label}</span>
          <h3 className="dashboard-stat-card__value mb-1">{formatNumber(value)}</h3>
          <p className="dashboard-stat-card__footer mb-0">{footer}</p>
        </div>
        <div className={`dashboard-stat-card__icon ${accentClass}`}>
          <i className={icon} />
        </div>
      </div>

      <div className="dashboard-stat-card__sparkline">
        <svg viewBox="0 0 100 36" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={buildSparklinePoints(trend)} />
        </svg>
      </div>
    </CardBody>
  </Card>
);

StatCard.propTypes = {
  accentClass: PropTypes.string.isRequired,
  footer: PropTypes.string.isRequired,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  trend: PropTypes.arrayOf(PropTypes.number).isRequired,
  value: PropTypes.number.isRequired,
};

const CardHeaderBlock = ({ title, subtitle, badge }) => (
  <div className="dashboard-card__header">
    <div>
      <h4 className="dashboard-card__title">{title}</h4>
      <p className="dashboard-card__subtitle mb-0">{subtitle}</p>
    </div>
    <Badge color="light" className="dashboard-card__badge">
      {badge}
    </Badge>
  </div>
);

CardHeaderBlock.propTypes = {
  badge: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

const HotelBreakdownCard = ({ hotels, mode, onModeChange }) => {
  const modeConfig = HOTEL_MODES.find((item) => item.key === mode) || HOTEL_MODES[0];
  const dataset = hotels.breakdowns[mode];
  const total = dataset.reduce((sum, item) => sum + item.value, 0);
  const topItem = dataset.reduce((top, item) => (item.value > top.value ? item : top), dataset[0]);

  const option = useMemo(
    () => ({
      tooltip: {
        trigger: "item",
        backgroundColor: "rgba(16,24,40,0.92)",
        borderWidth: 0,
        textStyle: { color: "#fff" },
        formatter: ({ name, value, percent }) =>
          `${name}<br/>Count: ${formatNumber(value)}<br/>Share: ${percent}%`,
      },
      legend: {
        orient: "vertical",
        right: 0,
        top: "middle",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: {
          color: "#6c757d",
          fontSize: 12,
        },
      },
      color: ECHART_COLORS,
      series: [
        {
          name: "Hotels",
          type: "pie",
          radius: modeConfig.type === "doughnut" ? ["48%", "72%"] : "72%",
          center: ["36%", "50%"],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: "#fff",
            borderWidth: 4,
            borderRadius: 10,
          },
          label: {
            show: true,
            formatter: "{d}%",
            color: "#495057",
            fontWeight: 600,
          },
          emphasis: {
            scale: true,
            scaleSize: 8,
            itemStyle: {
              shadowBlur: 18,
              shadowColor: "rgba(85, 110, 230, 0.25)",
            },
          },
          data: dataset,
        },
      ],
    }),
    [dataset, modeConfig.type]
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock
          title="Hotel Distribution"
          subtitle={hotels.subtitle}
          badge={`${formatNumber(hotels.total)} hotels`}
        />

        <div className="dashboard-toolbar">
          <ButtonGroup className="dashboard-segmented">
            {HOTEL_MODES.map((item) => (
              <Button
                key={item.key}
                color={item.key === mode ? "primary" : "light"}
                onClick={() => onModeChange(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </ButtonGroup>

          <div className="dashboard-toolbar__meta">
            <span className="dashboard-toolbar__meta-label">Top segment</span>
            <strong>{topItem.name}</strong>
          </div>
        </div>

        <div className="dashboard-chart-grid">
          <div className="dashboard-chart-grid__main">
            <ReactEcharts option={option} style={{ height: 360 }} />
          </div>

          <div className="dashboard-chart-grid__side">
            <div className="dashboard-insight-card">
              <span className="dashboard-insight-card__label">Current view</span>
              <strong>{modeConfig.label}</strong>
              <p className="mb-0">
                Total represented: {formatNumber(total)} hotels
              </p>
            </div>

            <div className="dashboard-ranking-list">
              {dataset.map((item, index) => (
                <div key={item.name} className="dashboard-ranking-list__item">
                  <div className="dashboard-ranking-list__head">
                    <div className="dashboard-ranking-list__title">
                      <span
                        className="dashboard-ranking-list__swatch"
                        style={{ backgroundColor: ECHART_COLORS[index % ECHART_COLORS.length] }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <strong>{formatNumber(item.value)}</strong>
                  </div>
                  <div className="dashboard-progress">
                    <span
                      className="dashboard-progress__fill"
                      style={{
                        width: `${(item.value / topItem.value) * 100}%`,
                        backgroundColor: ECHART_COLORS[index % ECHART_COLORS.length],
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="dashboard-card__hint mb-0">Expected payload: {hotels.payloadHint}</p>
      </CardBody>
    </Card>
  );
};

HotelBreakdownCard.propTypes = {
  hotels: PropTypes.object.isRequired,
  mode: PropTypes.string.isRequired,
  onModeChange: PropTypes.func.isRequired,
};

const RestaurantsCard = ({ restaurants }) => {
  const chartData = useMemo(
    () => ({
      labels: restaurants.byCity.map((item) => item.name),
      datasets: [
        {
          data: restaurants.byCity.map((item) => item.value),
          backgroundColor: CHARTJS_COLORS,
          borderColor: "#fff",
          borderWidth: 4,
          hoverOffset: 12,
        },
      ],
    }),
    [restaurants.byCity]
  );

  const options = useMemo(
    () => ({
      cutout: "58%",
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            color: "#6c757d",
            padding: 18,
          },
        },
        tooltip: {
          backgroundColor: "rgba(16,24,40,0.92)",
          titleColor: "#fff",
          bodyColor: "#fff",
          displayColors: true,
          callbacks: {
            label: (context) => `${context.label}: ${formatNumber(context.raw)}`,
          },
        },
      },
    }),
    []
  );

  const topCity = restaurants.byCity.reduce(
    (top, item) => (item.value > top.value ? item : top),
    restaurants.byCity[0]
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock
          title="Restaurants by City"
          subtitle={restaurants.subtitle}
          badge={`${formatNumber(restaurants.total)} restaurants`}
        />

        <div className="dashboard-doughnut-panel">
          <div className="dashboard-doughnut-panel__chart">
            <Doughnut data={chartData} options={options} />
          </div>

          <div className="dashboard-insight-stack">
            <div className="dashboard-insight-card success">
              <span className="dashboard-insight-card__label">Top city</span>
              <strong>{topCity.name}</strong>
              <p className="mb-0">{formatNumber(topCity.value)} restaurants</p>
            </div>
            <div className="dashboard-insight-card">
              <span className="dashboard-insight-card__label">Chart style</span>
              <strong>Chart.js Doughnut</strong>
              <p className="mb-0">Same UI family as the sample chart page.</p>
            </div>
          </div>
        </div>

        <p className="dashboard-card__hint mb-0">
          Expected payload: {restaurants.payloadHint}
        </p>
      </CardBody>
    </Card>
  );
};

RestaurantsCard.propTypes = {
  restaurants: PropTypes.object.isRequired,
};

const QuotationsLineCard = ({ quotations, view, onViewChange }) => {
  const option = useMemo(() => {
    const isVolumeView = view === "volume";

    return {
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
        textStyle: {
          color: "#6c757d",
        },
      },
      grid: {
        left: 18,
        right: 18,
        bottom: 10,
        top: 52,
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: quotations.months,
        axisLine: {
          lineStyle: { color: "rgba(166,176,207,0.35)" },
        },
        axisTick: { show: false },
        axisLabel: { color: "#6c757d" },
      },
      yAxis: {
        type: "value",
        splitLine: {
          lineStyle: { color: "rgba(166,176,207,0.12)" },
        },
        axisLine: { show: false },
        axisLabel: { color: "#6c757d" },
      },
      color: ["#556ee6", "#34c38f", "#f1b44c", "#f46a6a"],
      series: [
        {
          name: "Generated",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 8,
          lineStyle: { width: 3 },
          areaStyle: isVolumeView
            ? {
                color: "rgba(85,110,230,0.12)",
              }
            : undefined,
          data: quotations.generated,
        },
        {
          name: "Approved",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: isVolumeView ? 2 : 3 },
          areaStyle: !isVolumeView
            ? {
                color: "rgba(52,195,143,0.10)",
              }
            : undefined,
          data: quotations.approved,
        },
        {
          name: "Pending",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2 },
          data: quotations.pending,
        },
        {
          name: "Cancelled",
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 7,
          lineStyle: { width: 2, type: "dashed" },
          data: quotations.cancelled,
        },
      ],
    };
  }, [quotations, view]);

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock
          title="Quotation Activity by Month"
          subtitle={quotations.subtitle}
          badge={`${formatNumber(quotations.total)} quotations`}
        />

        <div className="dashboard-toolbar">
          <ButtonGroup className="dashboard-segmented">
            {QUOTATION_VIEWS.map((item) => (
              <Button
                key={item.key}
                color={item.key === view ? "primary" : "light"}
                onClick={() => onViewChange(item.key)}
              >
                {item.label}
              </Button>
            ))}
          </ButtonGroup>

          <div className="dashboard-toolbar__meta">
            <span className="dashboard-toolbar__meta-label">Peak month</span>
            <strong>Aug</strong>
          </div>
        </div>

        <ReactEcharts option={option} style={{ height: 360 }} />

        <p className="dashboard-card__hint mb-0">
          Expected payload: {quotations.payloadHint}
        </p>
      </CardBody>
    </Card>
  );
};

QuotationsLineCard.propTypes = {
  onViewChange: PropTypes.func.isRequired,
  quotations: PropTypes.object.isRequired,
  view: PropTypes.string.isRequired,
};

const TravelAgentsCard = ({ travelAgents, selectedCountry, onCountryChange }) => {
  const countryOptions = travelAgents.countries;
  const selected = countryOptions.find((item) => item.country === selectedCountry) || countryOptions[0];
  const topAgent = selected.agents.reduce(
    (top, item) => (item.quotations > top.quotations ? item : top),
    selected.agents[0]
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock
          title="Travel Agents by Country"
          subtitle={travelAgents.subtitle}
          badge={`${formatNumber(travelAgents.total)} agents`}
        />

        <div className="dashboard-toolbar">
          <div className="dashboard-chip-list">
            {countryOptions.map((country) => (
              <button
                key={country.country}
                type="button"
                className={`dashboard-chip ${
                  country.country === selected.country ? "active" : ""
                }`}
                onClick={() => onCountryChange(country.country)}
              >
                {country.country}
              </button>
            ))}
          </div>
        </div>

        <div className="dashboard-country-focus">
          <div className="dashboard-country-focus__stats">
            <div className="dashboard-insight-card info">
              <span className="dashboard-insight-card__label">Country total</span>
              <strong>{formatNumber(selected.totalQuotations)}</strong>
              <p className="mb-0">Generated quotations</p>
            </div>
            <div className="dashboard-insight-card">
              <span className="dashboard-insight-card__label">Top agent</span>
              <strong>{topAgent.name}</strong>
              <p className="mb-0">{formatNumber(topAgent.quotations)} quotations</p>
            </div>
          </div>

          <div className="dashboard-ranking-list">
            {selected.agents.map((agent, index) => (
              <div key={agent.name} className="dashboard-ranking-list__item">
                <div className="dashboard-ranking-list__head">
                  <div className="dashboard-ranking-list__title">
                    <span
                      className="dashboard-ranking-list__swatch"
                      style={{ backgroundColor: ECHART_COLORS[index % ECHART_COLORS.length] }}
                    />
                    <span>{agent.name}</span>
                  </div>
                  <strong>{formatNumber(agent.quotations)}</strong>
                </div>
                <div className="dashboard-progress mb-2">
                  <span
                    className="dashboard-progress__fill"
                    style={{
                      width: `${(agent.quotations / topAgent.quotations) * 100}%`,
                      backgroundColor: ECHART_COLORS[index % ECHART_COLORS.length],
                    }}
                  />
                </div>
                <div className="dashboard-status-line">
                  <span>{agent.status}</span>
                  <span>{selected.country}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="dashboard-card__hint mb-0">
          Expected payload: {travelAgents.payloadHint}
        </p>
      </CardBody>
    </Card>
  );
};

TravelAgentsCard.propTypes = {
  onCountryChange: PropTypes.func.isRequired,
  selectedCountry: PropTypes.string.isRequired,
  travelAgents: PropTypes.object.isRequired,
};

const UsersRolesCard = ({ users }) => {
  const chartData = useMemo(
    () => ({
      labels: users.byRole.map((item) => item.name),
      datasets: [
        {
          data: users.byRole.map((item) => item.value),
          backgroundColor: CHARTJS_COLORS,
          borderColor: "#fff",
          borderWidth: 4,
          hoverOffset: 10,
        },
      ],
    }),
    [users.byRole]
  );

  const options = useMemo(
    () => ({
      cutout: "68%",
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          backgroundColor: "rgba(16,24,40,0.92)",
          titleColor: "#fff",
          bodyColor: "#fff",
        },
      },
    }),
    []
  );

  const topRole = users.byRole.reduce(
    (top, role) => (role.value > top.value ? role : top),
    users.byRole[0]
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock
          title="Users and Roles"
          subtitle={users.subtitle}
          badge={`${formatNumber(users.active)} active`}
        />

        <div className="dashboard-doughnut-panel">
          <div className="dashboard-doughnut-panel__chart dashboard-doughnut-panel__chart--compact">
            <Doughnut data={chartData} options={options} />
            <div className="dashboard-doughnut-center">
              <strong>{formatNumber(users.total)}</strong>
              <span>Total Users</span>
            </div>
          </div>

          <div className="dashboard-ranking-list">
            {users.byRole.map((role, index) => (
              <div key={role.name} className="dashboard-ranking-list__item compact">
                <div className="dashboard-ranking-list__head">
                  <div className="dashboard-ranking-list__title">
                    <span
                      className="dashboard-ranking-list__swatch"
                      style={{ backgroundColor: CHARTJS_COLORS[index % CHARTJS_COLORS.length] }}
                    />
                    <span>{role.name}</span>
                  </div>
                  <strong>{formatNumber(role.value)}</strong>
                </div>
                <div className="dashboard-progress">
                  <span
                    className="dashboard-progress__fill"
                    style={{
                      width: `${(role.value / topRole.value) * 100}%`,
                      backgroundColor: CHARTJS_COLORS[index % CHARTJS_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="dashboard-card__hint mb-0">Expected payload: {users.payloadHint}</p>
      </CardBody>
    </Card>
  );
};

UsersRolesCard.propTypes = {
  users: PropTypes.object.isRequired,
};

const Dashboard = ({ t }) => {
  document.title = "Dashboard | COE Frontend";

  const roles = useSelector((state) => state.Login?.roles || []);
  const analytics = dashboardAnalyticsMock;
  const isAdmin = roles.includes(ADMIN_ROLE);
  const previewMode = roles.length === 0;
  const canSeeAnalytics = previewMode || isAdmin;

  const [hotelMode, setHotelMode] = useState("city");
  const [quotationView, setQuotationView] = useState("volume");
  const [selectedCountry, setSelectedCountry] = useState(
    analytics.travelAgents.countries[0].country
  );

  return (
    <React.Fragment>
      <div className="page-content dashboard-page">
        <Container fluid>
          <Breadcrumbs title={t("Dashboards")} breadcrumbItem={t("Dashboard")} />

          {!canSeeAnalytics ? (
            <Alert color="warning" className="mb-0">
              These analytics widgets are available only for users with the{" "}
              <strong>{ADMIN_ROLE}</strong> role.
            </Alert>
          ) : (
            <>
              <Row className="mb-4">
                <Col xs={12}>
                  <Card className="dashboard-hero-card">
                    <CardBody>
                      <div className="dashboard-hero-card__content">
                        <div>
                          <span className="dashboard-hero-card__eyebrow">
                            Admin Analytics Workspace
                          </span>
                          <h2 className="dashboard-hero-card__title mb-2">
                            Professional chart-driven system overview using the
                            sample ECharts and Chart.js patterns
                          </h2>
                          <p className="dashboard-hero-card__text mb-0">
                            The UI is fully interactive from the frontend side
                            today, with mock payloads structured so the backend
                            team can wire the analytics endpoints next.
                          </p>
                        </div>

                        <div className="dashboard-hero-card__status">
                          <Badge color="warning" className="dashboard-hero-card__pill">
                            Mock data mode
                          </Badge>
                          <Badge color="light" className="dashboard-hero-card__pill">
                            Role: {previewMode ? "Preview" : ADMIN_ROLE}
                          </Badge>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              <Row className="g-4 mb-4">
                <Col xl={3} md={6}>
                  <StatCard
                    icon="bx bx-building-house"
                    label="Hotels"
                    value={analytics.hotels.total}
                    trend={analytics.hotels.monthlyTrend}
                    accentClass="primary"
                    footer="City, chain, and stars"
                  />
                </Col>
                <Col xl={3} md={6}>
                  <StatCard
                    icon="bx bx-restaurant"
                    label="Restaurants"
                    value={analytics.restaurants.total}
                    trend={analytics.restaurants.monthlyTrend}
                    accentClass="success"
                    footer="By city coverage"
                  />
                </Col>
                <Col xl={3} md={6}>
                  <StatCard
                    icon="bx bx-line-chart"
                    label="Generated Quotations"
                    value={analytics.quotations.total}
                    trend={analytics.quotations.generated}
                    accentClass="info"
                    footer="Monthly status tracking"
                  />
                </Col>
                <Col xl={3} md={6}>
                  <StatCard
                    icon="bx bx-user-circle"
                    label="Active Users"
                    value={analytics.users.active}
                    trend={analytics.quotations.approved}
                    accentClass="warning"
                    footer="Role distribution ready"
                  />
                </Col>
              </Row>

              <Row className="g-4 mb-4">
                <Col xl={7}>
                  <HotelBreakdownCard
                    hotels={analytics.hotels}
                    mode={hotelMode}
                    onModeChange={setHotelMode}
                  />
                </Col>
                <Col xl={5}>
                  <RestaurantsCard restaurants={analytics.restaurants} />
                </Col>
              </Row>

              <Row className="g-4">
                <Col xl={7}>
                  <QuotationsLineCard
                    quotations={analytics.quotations}
                    view={quotationView}
                    onViewChange={setQuotationView}
                  />
                </Col>
                <Col xl={5}>
                  <UsersRolesCard users={analytics.users} />
                </Col>
              </Row>

              <Row className="g-4 mt-1">
                <Col xl={12}>
                  <TravelAgentsCard
                    travelAgents={analytics.travelAgents}
                    selectedCountry={selectedCountry}
                    onCountryChange={setSelectedCountry}
                  />
                </Col>
              </Row>
            </>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

Dashboard.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation()(Dashboard);
