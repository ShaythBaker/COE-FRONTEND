import PropTypes from "prop-types";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  CardBody,
  Col,
  Container,
  Nav,
  NavItem,
  NavLink,
  Row,
  Spinner,
  Table,
  TabContent,
  TabPane,
} from "reactstrap";
import { Chart, registerables } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import ReactEcharts from "echarts-for-react";
import { withTranslation } from "react-i18next";

import Breadcrumbs from "../../components/Common/Breadcrumb";
import { getAnalyticsOverview } from "../../helpers/coe_backend_helper";

Chart.register(...registerables);

const CHART_COLORS = [
  "#556ee6",
  "#34c38f",
  "#f1b44c",
  "#50a5f1",
  "#f46a6a",
  "#74788d",
  "#6f42c1",
  "#20c997",
];

const TABS = [
  { key: "general", label: "General", icon: "bx bx-grid-alt" },
  { key: "users", label: "Users", icon: "bx bx-user" },
  { key: "hotels", label: "Hotels", icon: "bx bx-hotel" },
  { key: "guides", label: "Guides", icon: "bx bx-map-pin" },
  { key: "restaurants", label: "Restaurants", icon: "bx bx-restaurant" },
  { key: "travelAgents", label: "Travel Agents", icon: "bx bxs-plane-alt" },
  { key: "places", label: "Places", icon: "bx bxs-map" },
  {
    key: "transportationCompanies",
    label: "Transportation Companies",
    icon: "bx bx-car",
  },
];

const RESEARCH_NOTES = {
  general: [
    {
      title: "Product analytics lens",
      body:
        "Track usage flows, cohorts, retention-style activity, and segmented behavior alongside business outcomes.",
      href: "https://amplitude.com/explore/analytics/product-analytics-guide",
      source: "Amplitude",
    },
    {
      title: "Funnel and cohort thinking",
      body:
        "Operational dashboards benefit from seeing where work moves, slows down, or drops between workflow states.",
      href: "https://mixpanel.com/blog/product-analytics-predict-retention/",
      source: "Mixpanel",
    },
  ],
  users: [
    {
      title: "Role segmentation",
      body:
        "SaaS analysis commonly segments users by properties such as role, cohort, and activity level before judging adoption.",
      href: "https://countly.com/blog/8-product-analytics-metrics-every-saas-growth-team-should-track",
      source: "Countly",
    },
  ],
  hotels: [
    {
      title: "Rate and revenue KPIs",
      body:
        "Hotel reporting commonly combines demand, ADR, RevPAR-style pricing, source mix, and guest satisfaction.",
      href: "https://www.mews.com/en/blog/hotel-industry-kpis",
      source: "Mews",
    },
    {
      title: "Hospitality metric definitions",
      body:
        "ADR, occupancy, RevPAR, guest satisfaction, and length of stay are useful benchmarks where the system has matching data.",
      href: "https://www.altexsoft.com/blog/revpar-occupancy-rate-adr-hotel-metrics/",
      source: "AltexSoft",
    },
  ],
  guides: [
    {
      title: "Service quality view",
      body:
        "For human-delivered travel services, useful signals include language coverage, utilization, customer ratings, and repeat demand.",
      href: "https://coaxsoft.com/blog/breaking-down-travel-analytics",
      source: "COAX",
    },
  ],
  restaurants: [
    {
      title: "Menu and guest feedback",
      body:
        "Restaurant KPIs often combine item popularity, average check or item price, customer satisfaction, and profitability signals.",
      href: "https://www.netsuite.com/portal/resource/articles/erp/restaurant-kpis.shtml",
      source: "NetSuite",
    },
    {
      title: "Meal mix",
      body:
        "Menu analytics can reveal the meals most often selected and whether prices differ sharply by meal type.",
      href: "https://get.apicbase.com/essential-restaurant-metrics/",
      source: "Apicbase",
    },
  ],
  travelAgents: [
    {
      title: "Agency performance",
      body:
        "Travel agency analysis usually watches booking volume, sales or revenue per trip, customer satisfaction, and repeat bookings.",
      href: "https://moguplatform.com/en/blog/essential-kpis-to-measure-the-performance-of-your-travel-agency",
      source: "MOGU",
    },
  ],
  places: [
    {
      title: "Destination demand",
      body:
        "Tourism analytics connects internal demand, destinations, seasonality, pricing, and customer experience into one view.",
      href: "https://coaxsoft.com/blog/breaking-down-travel-analytics",
      source: "COAX",
    },
  ],
  transportationCompanies: [
    {
      title: "Provider and cost control",
      body:
        "Travel management KPIs focus on cost control, preferred-provider usage, service quality, and compliance with operating rules.",
      href: "https://business.booking.com/en-us/business-travel-resources/blog/practical-guide-to-kpis-for-travel-management/",
      source: "Booking.com for Business",
    },
  ],
};

const asArray = value => (Array.isArray(value) ? value : []);
const toNumber = value => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const formatNumber = value => new Intl.NumberFormat().format(toNumber(value));
const formatDecimal = value =>
  new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(toNumber(value));
const formatMoney = value =>
  new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 0,
    style: "currency",
    currency: "USD",
  }).format(toNumber(value));
const formatDate = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString();
};

const formatMetric = (value, type) => {
  if (type === "text") return value || "-";
  if (type === "money") return formatMoney(value);
  if (type === "decimal") return formatDecimal(value);
  return formatNumber(value);
};

const getTopName = rows => asArray(rows)[0]?.name || "-";
const getAverageRating = rows => asArray(rows)[0]?.averageRating || 0;

const EmptyState = ({ label }) => (
  <div className="analytics-empty-state">
    <i className="bx bx-bar-chart-square" />
    <span>{label}</span>
  </div>
);

EmptyState.propTypes = {
  label: PropTypes.string.isRequired,
};

const CardHeaderBlock = ({ title, subtitle, badge }) => (
  <div className="dashboard-card__header">
    <div>
      <h4 className="dashboard-card__title">{title}</h4>
      <p className="dashboard-card__subtitle mb-0">{subtitle}</p>
    </div>
    {badge ? (
      <Badge color="light" className="dashboard-card__badge">
        {badge}
      </Badge>
    ) : null}
  </div>
);

CardHeaderBlock.propTypes = {
  badge: PropTypes.string,
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

CardHeaderBlock.defaultProps = {
  badge: "",
};

const StatCard = ({ icon, label, value, footer, accentClass, valueType }) => (
  <Card className="dashboard-stat-card h-100">
    <CardBody>
      <div className="dashboard-stat-card__top">
        <div>
          <span className="dashboard-stat-card__label">{label}</span>
          <h3 className="dashboard-stat-card__value mb-1">
            {formatMetric(value, valueType)}
          </h3>
          <p className="dashboard-stat-card__footer mb-0">{footer}</p>
        </div>
        <div className={`dashboard-stat-card__icon ${accentClass}`}>
          <i className={icon} />
        </div>
      </div>
    </CardBody>
  </Card>
);

StatCard.propTypes = {
  accentClass: PropTypes.string,
  footer: PropTypes.string,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  valueType: PropTypes.string,
};

StatCard.defaultProps = {
  accentClass: "primary",
  footer: "",
  valueType: "number",
};

const SummaryCards = ({ cards }) => (
  <Row className="g-4 mb-4">
    {asArray(cards).map((card, index) => (
      <Col xl={3} md={6} key={`${card.label}-${index}`}>
        <StatCard
          icon={card.icon || "bx bx-bar-chart"}
          label={card.label}
          value={card.value}
          footer={card.footer || ""}
          accentClass={card.accentClass || "primary"}
          valueType={card.valueType || (String(card.label).toLowerCase().includes("total") ? "money" : "number")}
        />
      </Col>
    ))}
  </Row>
);

SummaryCards.propTypes = {
  cards: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const buildBarOption = ({ rows, valueField, nameField, valueType, horizontal }) => {
  const labels = rows.map(row => row[nameField] || row.name || "Unspecified");
  const values = rows.map(row => toNumber(row[valueField]));

  return {
    color: CHART_COLORS,
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(16,24,40,0.92)",
      borderWidth: 0,
      textStyle: { color: "#fff" },
      formatter: params => {
        const item = Array.isArray(params) ? params[0] : params;
        return `${item.name}<br/>${formatMetric(item.value, valueType)}`;
      },
    },
    grid: {
      left: horizontal ? 118 : 28,
      right: 20,
      top: 28,
      bottom: horizontal ? 18 : 58,
      containLabel: true,
    },
    xAxis: horizontal
      ? {
          type: "value",
          axisLine: { show: false },
          splitLine: { lineStyle: { color: "rgba(166,176,207,0.16)" } },
          axisLabel: { color: "#6c757d" },
        }
      : {
          type: "category",
          data: labels,
          axisTick: { show: false },
          axisLabel: { color: "#6c757d", interval: 0, rotate: labels.length > 5 ? 28 : 0 },
          axisLine: { lineStyle: { color: "rgba(166,176,207,0.35)" } },
        },
    yAxis: horizontal
      ? {
          type: "category",
          data: labels,
          axisTick: { show: false },
          axisLabel: { color: "#6c757d" },
          axisLine: { lineStyle: { color: "rgba(166,176,207,0.35)" } },
        }
      : {
          type: "value",
          axisLine: { show: false },
          axisLabel: { color: "#6c757d" },
          splitLine: { lineStyle: { color: "rgba(166,176,207,0.16)" } },
        },
    series: [
      {
        type: "bar",
        barMaxWidth: 34,
        data: values,
        itemStyle: { borderRadius: horizontal ? [0, 8, 8, 0] : [8, 8, 0, 0] },
      },
    ],
  };
};

const buildLineOption = ({ rows, fields, nameField }) => ({
  color: CHART_COLORS,
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
  grid: { left: 28, right: 20, top: 52, bottom: 24, containLabel: true },
  xAxis: {
    type: "category",
    boundaryGap: false,
    data: rows.map(row => row[nameField] || row.name),
    axisLine: { lineStyle: { color: "rgba(166,176,207,0.35)" } },
    axisTick: { show: false },
    axisLabel: { color: "#6c757d" },
  },
  yAxis: {
    type: "value",
    splitLine: { lineStyle: { color: "rgba(166,176,207,0.16)" } },
    axisLine: { show: false },
    axisLabel: { color: "#6c757d" },
  },
  series: fields.map((field, index) => ({
    name: field.label,
    type: "line",
    smooth: true,
    symbol: "circle",
    symbolSize: 7,
    lineStyle: { width: 3, type: field.dashed ? "dashed" : "solid" },
    areaStyle:
      index === 0
        ? {
            color: "rgba(85,110,230,0.10)",
          }
        : undefined,
    data: rows.map(row => toNumber(row[field.key])),
  })),
});

const BarChartCard = ({
  title,
  subtitle,
  badge,
  rows,
  valueField,
  nameField,
  valueType,
  horizontal,
}) => {
  const cleanRows = asArray(rows).filter(row => row && row[nameField || "name"] !== "");
  const option = useMemo(
    () =>
      buildBarOption({
        rows: cleanRows,
        valueField,
        nameField,
        valueType,
        horizontal,
      }),
    [cleanRows, horizontal, nameField, valueField, valueType],
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
        {cleanRows.length ? (
          <ReactEcharts option={option} style={{ height: horizontal ? 350 : 320 }} />
        ) : (
          <EmptyState label="No rows available yet" />
        )}
      </CardBody>
    </Card>
  );
};

BarChartCard.propTypes = {
  badge: PropTypes.string,
  horizontal: PropTypes.bool,
  nameField: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  valueField: PropTypes.string,
  valueType: PropTypes.string,
};

BarChartCard.defaultProps = {
  badge: "",
  horizontal: false,
  nameField: "name",
  rows: [],
  valueField: "value",
  valueType: "number",
};

const LineChartCard = ({ title, subtitle, badge, rows, fields, nameField }) => {
  const cleanRows = asArray(rows);
  const option = useMemo(
    () => buildLineOption({ rows: cleanRows, fields, nameField }),
    [cleanRows, fields, nameField],
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
        {cleanRows.length ? (
          <ReactEcharts option={option} style={{ height: 340 }} />
        ) : (
          <EmptyState label="No timeline rows available yet" />
        )}
      </CardBody>
    </Card>
  );
};

LineChartCard.propTypes = {
  badge: PropTypes.string,
  fields: PropTypes.arrayOf(PropTypes.object).isRequired,
  nameField: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

LineChartCard.defaultProps = {
  badge: "",
  nameField: "month",
  rows: [],
};

const DoughnutCard = ({ title, subtitle, badge, rows, centerLabel, centerValue }) => {
  const cleanRows = asArray(rows).filter(row => toNumber(row.value) > 0);
  const data = useMemo(
    () => ({
      labels: cleanRows.map(row => row.name),
      datasets: [
        {
          data: cleanRows.map(row => row.value),
          backgroundColor: CHART_COLORS,
          borderColor: "#fff",
          borderWidth: 4,
          hoverOffset: 10,
        },
      ],
    }),
    [cleanRows],
  );
  const options = useMemo(
    () => ({
      cutout: "64%",
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            usePointStyle: true,
            boxWidth: 10,
            color: "#6c757d",
            padding: 16,
          },
        },
      },
    }),
    [],
  );

  return (
    <Card className="dashboard-card h-100">
      <CardBody>
        <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
        {cleanRows.length ? (
          <div className="dashboard-doughnut-panel__chart dashboard-doughnut-panel__chart--compact">
            <Doughnut data={data} options={options} />
            {centerLabel ? (
              <div className="dashboard-doughnut-center">
                <strong>{formatNumber(centerValue)}</strong>
                <span>{centerLabel}</span>
              </div>
            ) : null}
          </div>
        ) : (
          <EmptyState label="No distribution rows available yet" />
        )}
      </CardBody>
    </Card>
  );
};

DoughnutCard.propTypes = {
  badge: PropTypes.string,
  centerLabel: PropTypes.string,
  centerValue: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  rows: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
};

DoughnutCard.defaultProps = {
  badge: "",
  centerLabel: "",
  centerValue: 0,
  rows: [],
};

const RankingList = ({ rows, valueField, valueType, secondary }) => {
  const cleanRows = asArray(rows);
  const max = Math.max(...cleanRows.map(row => toNumber(row[valueField])), 1);

  if (!cleanRows.length) return <EmptyState label="No ranked rows available yet" />;

  return (
    <div className="dashboard-ranking-list">
      {cleanRows.map((row, index) => (
        <div key={`${row.name}-${index}`} className="dashboard-ranking-list__item">
          <div className="dashboard-ranking-list__head">
            <div className="dashboard-ranking-list__title">
              <span
                className="dashboard-ranking-list__swatch"
                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
              />
              <span>{row.name}</span>
            </div>
            <strong>{formatMetric(row[valueField], valueType)}</strong>
          </div>
          <div className="dashboard-progress mt-2">
            <span
              className="dashboard-progress__fill"
              style={{
                backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                width: `${Math.max(6, (toNumber(row[valueField]) / max) * 100)}%`,
              }}
            />
          </div>
          {secondary ? (
            <div className="dashboard-status-line">
              {secondary.map(item => (
                <span key={item.label}>
                  {item.label}: {formatMetric(row[item.field], item.type)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
};

RankingList.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
  secondary: PropTypes.arrayOf(PropTypes.object),
  valueField: PropTypes.string,
  valueType: PropTypes.string,
};

RankingList.defaultProps = {
  rows: [],
  secondary: null,
  valueField: "value",
  valueType: "number",
};

const RankingCard = ({ title, subtitle, badge, rows, valueField, valueType, secondary }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock title={title} subtitle={subtitle} badge={badge} />
      <RankingList
        rows={rows}
        valueField={valueField}
        valueType={valueType}
        secondary={secondary}
      />
    </CardBody>
  </Card>
);

RankingCard.propTypes = {
  badge: PropTypes.string,
  rows: PropTypes.arrayOf(PropTypes.object),
  secondary: PropTypes.arrayOf(PropTypes.object),
  subtitle: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  valueField: PropTypes.string,
  valueType: PropTypes.string,
};

RankingCard.defaultProps = {
  badge: "",
  rows: [],
  secondary: null,
  valueField: "value",
  valueType: "number",
};

const InsightGrid = ({ items }) => (
  <Row className="g-4 mb-4">
    {items.map((item, index) => (
      <Col xl={3} md={6} key={`${item.label}-${index}`}>
        <div className={`dashboard-insight-card h-100 ${item.className || ""}`}>
          <span className="dashboard-insight-card__label">{item.label}</span>
          <strong>{formatMetric(item.value, item.type)}</strong>
          <p className="mb-0">{item.footer}</p>
        </div>
      </Col>
    ))}
  </Row>
);

InsightGrid.propTypes = {
  items: PropTypes.arrayOf(PropTypes.object).isRequired,
};

const ResearchPanel = ({ tabKey }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Internet-informed analysis"
        subtitle="External KPI patterns mapped to the data this system already stores."
        badge="Research"
      />
      <div className="analytics-research-list">
        {asArray(RESEARCH_NOTES[tabKey]).map(item => (
          <div key={item.title} className="dashboard-ranking-list__item">
            <div className="dashboard-ranking-list__head">
              <strong>{item.title}</strong>
              <a href={item.href} target="_blank" rel="noreferrer">
                {item.source}
              </a>
            </div>
            <p className="mb-0 mt-2 text-muted">{item.body}</p>
          </div>
        ))}
      </div>
    </CardBody>
  </Card>
);

ResearchPanel.propTypes = {
  tabKey: PropTypes.string.isRequired,
};

const DataQualityPanel = ({ dataQuality }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Data Quality"
        subtitle="Completeness, uniqueness, coverage, and freshness checks for the dashboard grain."
        badge={`${asArray(dataQuality?.checks).length} checks`}
      />
      <div className="dashboard-ranking-list">
        {asArray(dataQuality?.checks).map(check => (
          <div key={check.label} className="dashboard-ranking-list__item">
            <div className="dashboard-ranking-list__head">
              <div>
                <strong>{check.label}</strong>
                <p className="mb-0 text-muted">{check.detail}</p>
              </div>
              <Badge color={check.status === "ok" ? "success" : "warning"}>
                {check.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </CardBody>
  </Card>
);

DataQualityPanel.propTypes = {
  dataQuality: PropTypes.object,
};

DataQualityPanel.defaultProps = {
  dataQuality: {},
};

const ProfileTable = ({ rows }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Collection Profile"
        subtitle="Rows and latest observed changes by source collection."
        badge={`${asArray(rows).length} collections`}
      />
      <div className="table-responsive">
        <Table className="table-nowrap align-middle mb-0">
          <thead>
            <tr>
              <th>Collection</th>
              <th className="text-end">Rows</th>
              <th>Latest change</th>
            </tr>
          </thead>
          <tbody>
            {asArray(rows).map(row => (
              <tr key={row.name}>
                <td className="fw-semibold">{row.name}</td>
                <td className="text-end">{formatNumber(row.value)}</td>
                <td>{formatDate(row.latestChange)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);

ProfileTable.propTypes = {
  rows: PropTypes.arrayOf(PropTypes.object),
};

ProfileTable.defaultProps = {
  rows: [],
};

const RecentUsersTable = ({ users }) => (
  <Card className="dashboard-card h-100">
    <CardBody>
      <CardHeaderBlock
        title="Recent Users"
        subtitle="Latest active user records captured in the company account."
        badge={`${asArray(users).length} shown`}
      />
      <div className="table-responsive">
        <Table className="table-nowrap align-middle mb-0">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Roles</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {asArray(users).map(user => (
              <tr key={`${user.email}-${user.createdOn}`}>
                <td className="fw-semibold">{user.name || "-"}</td>
                <td>{user.email || "-"}</td>
                <td>{asArray(user.roles).join(", ") || "-"}</td>
                <td>{formatDate(user.createdOn)}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    </CardBody>
  </Card>
);

RecentUsersTable.propTypes = {
  users: PropTypes.arrayOf(PropTypes.object),
};

RecentUsersTable.defaultProps = {
  users: [],
};

const GeneralTab = ({ analytics }) => {
  const general = analytics.general || {};
  return (
    <>
      <SummaryCards cards={general.summaryCards || []} />
      <Row className="g-4 mb-4">
        <Col xl={7}>
          <LineChartCard
            title="Quotation Activity"
            subtitle="Monthly quotation volume and pricing progress."
            badge={`${formatNumber(asArray(general.monthlyQuotations).length)} months`}
            rows={general.monthlyQuotations}
            fields={[
              { key: "total", label: "Total" },
              { key: "APPROVED", label: "Approved" },
              { key: "SEND_FOR_PRICING", label: "Sent for pricing" },
              { key: "CANCELLED", label: "Cancelled", dashed: true },
            ]}
          />
        </Col>
        <Col xl={5}>
          <DoughnutCard
            title="Quotation Status"
            subtitle="Active quotation split by workflow state."
            badge={`${formatNumber(asArray(general.quotationStatus).length)} statuses`}
            rows={general.quotationStatus}
            centerLabel="Quotes"
            centerValue={asArray(general.quotationStatus).reduce(
              (sum, row) => sum + toNumber(row.value),
              0,
            )}
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={6}>
          <BarChartCard
            title="System Entity Counts"
            subtitle="Inventory and supplier records available for analysis."
            badge="Counts"
            rows={general.entityCounts}
            horizontal
          />
        </Col>
        <Col xl={6}>
          <BarChartCard
            title="Pricing Breakdown"
            subtitle="Saved quotation pricing snapshot totals."
            badge={formatMoney(general.priceSummary?.finalTotal)}
            rows={general.pricingBreakdown}
            valueType="money"
            horizontal
          />
        </Col>
      </Row>
      <InsightGrid
        items={[
          {
            label: "Base total",
            value: general.priceSummary?.baseTotal,
            type: "money",
            footer: "Before profit",
          },
          {
            label: "Profit total",
            value: general.priceSummary?.profitTotal,
            type: "money",
            footer: "Saved pricing rows",
            className: "success",
          },
          {
            label: "Average meal",
            value: general.priceSummary?.averageMealPrice,
            type: "money",
            footer: "From restaurant meals and itinerary rows",
          },
          {
            label: "Average transport",
            value: general.priceSummary?.averageTransportRate,
            type: "money",
            footer: "From resolved quotation-day rates",
          },
        ]}
      />
      <Row className="g-4">
        <Col xl={6}>
          <DataQualityPanel dataQuality={analytics.dataQuality} />
        </Col>
        <Col xl={6}>
          <ResearchPanel tabKey="general" />
        </Col>
      </Row>
    </>
  );
};

GeneralTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const UsersTab = ({ analytics }) => {
  const users = analytics.users || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Total users", value: users.total, footer: "All company users" },
          { label: "Active users", value: users.active, footer: "Can use the system", className: "success" },
          { label: "Inactive users", value: users.inactive, footer: "Soft-disabled accounts" },
          { label: "Role assignments", value: users.roleAssignments, footer: "Total roles assigned" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={5}>
          <DoughnutCard
            title="Roles"
            subtitle="Most common operational roles among active users."
            badge={`${formatNumber(users.active)} active`}
            rows={users.byRole}
            centerLabel="Users"
            centerValue={users.total}
          />
        </Col>
        <Col xl={7}>
          <LineChartCard
            title="User Creation"
            subtitle="New user records by month."
            badge={`${formatNumber(asArray(users.createdByMonth).length)} months`}
            rows={users.createdByMonth}
            fields={[{ key: "value", label: "Users" }]}
            nameField="name"
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="User Status"
            subtitle="Active and inactive account split."
            rows={users.byStatus}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Most Roles"
            subtitle="Role assignment counts across active users."
            rows={users.byRole}
          />
        </Col>
        <Col xl={4}>
          <ResearchPanel tabKey="users" />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={8}>
          <RecentUsersTable users={users.recentUsers} />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="User Data Gaps"
            subtitle="Quality issues found in user records."
            rows={[
              { name: "Missing email", value: users.quality?.missingEmail },
              { name: "Missing name", value: users.quality?.missingName },
              { name: "Missing roles", value: users.quality?.missingRoles },
              { name: "Duplicate emails", value: users.quality?.duplicateEmails },
            ]}
          />
        </Col>
      </Row>
    </>
  );
};

UsersTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const HotelsTab = ({ analytics }) => {
  const hotels = analytics.hotels || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Hotels", value: hotels.total, footer: "Active hotel records" },
          { label: "Average rate", value: hotels.priceSummary?.averageRate, type: "money", footer: "Season rate rows" },
          { label: "Most used", value: getTopName(hotels.topUsed), type: "text", footer: "From accommodation selections" },
          { label: "Top rating", value: getAverageRating(hotels.topRated), type: "decimal", footer: "Approved evaluation answers" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="Hotels by City"
            subtitle="Hotel inventory by destination."
            rows={hotels.byCity}
          />
        </Col>
        <Col xl={4}>
          <DoughnutCard
            title="Hotels by Chain"
            subtitle="Chain and independent inventory mix."
            rows={hotels.byChain}
          />
        </Col>
        <Col xl={4}>
          <DoughnutCard
            title="Hotels by Stars"
            subtitle="Star-rating distribution."
            rows={hotels.byStars}
          />
        </Col>
      </Row>
      <Row className="g-4 mb-4">
        <Col xl={6}>
          <BarChartCard
            title="Most Used Hotels"
            subtitle="Hotel selections found in saved accommodation options."
            rows={hotels.topUsed}
            horizontal
            secondary={[{ label: "Nights", field: "totalNights" }]}
          />
        </Col>
        <Col xl={6}>
          <BarChartCard
            title="Rate by Board"
            subtitle="Average saved hotel rates by board basis."
            rows={hotels.ratesByBoard}
            valueField="averageAmount"
            valueType="money"
            horizontal
          />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={4}>
          <RankingCard
            title="Top Rated Hotels"
            subtitle="Average ratings from evaluation answers."
            rows={hotels.topRated}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Reviews", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Hotel Quality Gaps"
            subtitle="Completeness checks for hotel analysis fields."
            rows={[
              { name: "Missing city", value: hotels.quality?.missingCity },
              { name: "Missing chain", value: hotels.quality?.missingChain },
              { name: "Missing stars", value: hotels.quality?.missingStars },
              { name: "Without rates", value: hotels.quality?.hotelsWithoutRates },
            ]}
          />
        </Col>
        <Col xl={4}>
          <ResearchPanel tabKey="hotels" />
        </Col>
      </Row>
    </>
  );
};

HotelsTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const GuidesTab = ({ analytics }) => {
  const guides = analytics.guides || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Guides", value: guides.total, footer: "Active guide records" },
          { label: "Multilingual", value: guides.multilingual, footer: "More than one language", className: "success" },
          { label: "Average guide cost", value: guides.priceSummary?.averageGuideCost, type: "money", footer: "Quotation-day guide costs" },
          { label: "Top rating", value: getAverageRating(guides.topRated), type: "decimal", footer: "Approved guide reviews" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={6}>
          <BarChartCard
            title="Guide Languages"
            subtitle="Most common languages guides can speak."
            rows={guides.languages}
            horizontal
          />
        </Col>
        <Col xl={6}>
          <BarChartCard
            title="Guide Types Used"
            subtitle="Guide type utilization from quotation-day plans."
            rows={guides.guideTypes}
            horizontal
          />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={4}>
          <RankingCard
            title="Most Rated Guides"
            subtitle="Guide ratings from traveler evaluations."
            rows={guides.topRated}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Reviews", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Guide Data Gaps"
            subtitle="Completeness checks for guide records."
            rows={[
              { name: "Missing languages", value: guides.quality?.missingLanguages },
              { name: "Missing email", value: guides.quality?.missingEmail },
              { name: "Missing phone", value: guides.quality?.missingPhone },
            ]}
          />
        </Col>
        <Col xl={4}>
          <ResearchPanel tabKey="guides" />
        </Col>
      </Row>
    </>
  );
};

GuidesTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const RestaurantsTab = ({ analytics }) => {
  const restaurants = analytics.restaurants || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Restaurants", value: restaurants.total, footer: "Active restaurant records" },
          { label: "Average meal", value: restaurants.priceSummary?.averageMealPrice, type: "money", footer: "Meal price rows" },
          { label: "Most used", value: getTopName(restaurants.mostUsed), type: "text", footer: "Quotation-day meal selections" },
          { label: "Top rating", value: getAverageRating(restaurants.topRated), type: "decimal", footer: "Restaurant reviews" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="Restaurants by City"
            subtitle="Restaurant inventory by destination."
            rows={restaurants.byCity}
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Meal Price by Type"
            subtitle="Average meal price from restaurant meal rows."
            rows={restaurants.mealTypes}
            valueField="averagePrice"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Most Ordered Meals"
            subtitle="Meal type selections from quotation days."
            rows={restaurants.mostOrderedMeals}
            horizontal
          />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={4}>
          <RankingCard
            title="Most Used Restaurants"
            subtitle="Restaurant selections in quotation-day meal plans."
            rows={restaurants.mostUsed}
            secondary={[{ label: "Avg meal", field: "averageMealPrice", type: "money" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Top Rated Restaurants"
            subtitle="Average ratings from evaluation answers."
            rows={restaurants.topRated}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Reviews", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <ResearchPanel tabKey="restaurants" />
        </Col>
      </Row>
    </>
  );
};

RestaurantsTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const TravelAgentsTab = ({ analytics }) => {
  const agents = analytics.travelAgents || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Travel agents", value: agents.total, footer: "Active agent records" },
          { label: "Top agent", value: getTopName(agents.topByQuotations), type: "text", footer: "By quotation count", className: "success" },
          { label: "Countries", value: asArray(agents.byCountry).length, footer: "Agent country coverage" },
          { label: "Without quotations", value: agents.quality?.agentsWithoutQuotations, footer: "No active quotation linkage" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={5}>
          <DoughnutCard
            title="Agents by Country"
            subtitle="Travel agent distribution by country."
            rows={agents.byCountry}
          />
        </Col>
        <Col xl={7}>
          <BarChartCard
            title="Top Travel Agents"
            subtitle="Quotation volume by travel agent."
            rows={agents.topByQuotations}
            horizontal
            secondary={[
              { label: "Pax", field: "totalPax" },
              { label: "Final", field: "finalTotal", type: "money" },
            ]}
          />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={7}>
          <LineChartCard
            title="Agent Quotations Over Time"
            subtitle="Quotation activity and approved files by month."
            rows={agents.quotationsByMonth}
            fields={[
              { key: "total", label: "Total" },
              { key: "APPROVED", label: "Approved" },
              { key: "CANCELLED", label: "Cancelled", dashed: true },
            ]}
          />
        </Col>
        <Col xl={5}>
          <ResearchPanel tabKey="travelAgents" />
        </Col>
      </Row>
    </>
  );
};

TravelAgentsTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const PlacesTab = ({ analytics }) => {
  const places = analytics.places || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Places", value: places.total, footer: "Active destination records" },
          { label: "Average entrance", value: places.priceSummary?.averageEntranceFee, type: "money", footer: "Saved entrance fee rows" },
          { label: "Most visited", value: getTopName(places.mostVisited), type: "text", footer: "Quotation-day entrance selections" },
          { label: "Top rating", value: getAverageRating(places.topRated), type: "decimal", footer: "Entrance/place reviews" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <DoughnutCard
            title="Places by City"
            subtitle="Place inventory by destination city."
            rows={places.byCity}
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Most Visited Places"
            subtitle="Place selections from quotation-day entrance fees."
            rows={places.mostVisited}
            horizontal
            secondary={[{ label: "Avg fee", field: "averageFee", type: "money" }]}
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Entrance Fees"
            subtitle="Average entrance fee by nationality list item."
            rows={places.feesByNationality}
            valueField="averageAmount"
            valueType="money"
            horizontal
          />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={4}>
          <RankingCard
            title="Top Rated Places"
            subtitle="Ratings for entrance/place evaluation sources."
            rows={places.topRated}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Reviews", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Place Data Gaps"
            subtitle="Completeness checks for place records."
            rows={[
              { name: "Missing city", value: places.quality?.missingCity },
              { name: "Without fees", value: places.quality?.placesWithoutFees },
            ]}
          />
        </Col>
        <Col xl={4}>
          <ResearchPanel tabKey="places" />
        </Col>
      </Row>
    </>
  );
};

PlacesTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const TransportationCompaniesTab = ({ analytics }) => {
  const transportation = analytics.transportationCompanies || {};
  return (
    <>
      <InsightGrid
        items={[
          { label: "Companies", value: transportation.total, footer: "Active transportation providers" },
          { label: "Average rate", value: transportation.priceSummary?.averageRate, type: "money", footer: "Active rate rows" },
          { label: "Most used", value: getTopName(transportation.mostUsed), type: "text", footer: "Quotation-day transport selections" },
          { label: "Top rating", value: getAverageRating(transportation.topRated), type: "decimal", footer: "Transportation reviews" },
        ]}
      />
      <Row className="g-4 mb-4">
        <Col xl={4}>
          <BarChartCard
            title="Rates by Company"
            subtitle="Average saved transportation rates per company."
            rows={transportation.byRateCount}
            valueField="averageRate"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Rates by Type"
            subtitle="Average rate by transportation type."
            rows={transportation.ratesByType}
            valueField="averageRate"
            valueType="money"
            horizontal
          />
        </Col>
        <Col xl={4}>
          <BarChartCard
            title="Most Used Providers"
            subtitle="Resolved transportation companies from quotation days."
            rows={transportation.mostUsed}
            horizontal
            secondary={[{ label: "Avg rate", field: "averageRate", type: "money" }]}
          />
        </Col>
      </Row>
      <Row className="g-4">
        <Col xl={4}>
          <RankingCard
            title="Top Rated Providers"
            subtitle="Transportation company ratings from evaluations."
            rows={transportation.topRated}
            valueField="averageRating"
            valueType="decimal"
            secondary={[{ label: "Reviews", field: "ratingCount" }]}
          />
        </Col>
        <Col xl={4}>
          <RankingCard
            title="Used Types"
            subtitle="Transportation types selected in quotation days."
            rows={transportation.usedTypes}
          />
        </Col>
        <Col xl={4}>
          <ResearchPanel tabKey="transportationCompanies" />
        </Col>
      </Row>
    </>
  );
};

TransportationCompaniesTab.propTypes = {
  analytics: PropTypes.object.isRequired,
};

const Analytics = ({ t }) => {
  document.title = "Analytics | COE Frontend";

  const [activeTab, setActiveTab] = useState("general");
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      try {
        const data = await getAnalyticsOverview();
        if (mounted) setAnalytics(data);
      } catch (err) {
        if (mounted) {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Unable to load analytics.",
          );
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAnalytics();

    return () => {
      mounted = false;
    };
  }, []);

  const tabContent = () => {
    if (!analytics) return null;
    switch (activeTab) {
      case "users":
        return <UsersTab analytics={analytics} />;
      case "hotels":
        return <HotelsTab analytics={analytics} />;
      case "guides":
        return <GuidesTab analytics={analytics} />;
      case "restaurants":
        return <RestaurantsTab analytics={analytics} />;
      case "travelAgents":
        return <TravelAgentsTab analytics={analytics} />;
      case "places":
        return <PlacesTab analytics={analytics} />;
      case "transportationCompanies":
        return <TransportationCompaniesTab analytics={analytics} />;
      case "general":
      default:
        return <GeneralTab analytics={analytics} />;
    }
  };

  return (
    <div className="page-content dashboard-page analytics-page">
      <Container fluid>
        <Breadcrumbs title={t("Dashboards")} breadcrumbItem="Analytics" />

        <Row className="mb-4">
          <Col xs={12}>
            <Card className="dashboard-hero-card">
              <CardBody>
                <div className="dashboard-hero-card__content">
                  <div>
                    <span className="dashboard-hero-card__eyebrow">
                      Company Analytics Workspace
                    </span>
                    <h2 className="dashboard-hero-card__title mb-2">
                      Real system analytics across users, suppliers, pricing,
                      quotations, and traveler feedback
                    </h2>
                    <p className="dashboard-hero-card__text mb-0">
                      The dashboard reads from tenant-scoped backend collections
                      and pairs those results with practical SaaS and travel
                      KPI patterns.
                    </p>
                  </div>
                  <div className="dashboard-hero-card__status">
                    <Badge color="success" className="dashboard-hero-card__pill">
                      Real data mode
                    </Badge>
                    {analytics?.generatedAt ? (
                      <Badge color="light" className="dashboard-hero-card__pill">
                        Updated {formatDate(analytics.generatedAt)}
                      </Badge>
                    ) : null}
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Card className="dashboard-card analytics-tabs-card mb-4">
          <CardBody>
            <Nav pills className="analytics-tab-nav">
              {TABS.map(tab => (
                <NavItem key={tab.key}>
                  <NavLink
                    href="#"
                    className={activeTab === tab.key ? "active" : ""}
                    onClick={event => {
                      event.preventDefault();
                      setActiveTab(tab.key);
                    }}
                  >
                    <i className={tab.icon} />
                    <span>{tab.label}</span>
                  </NavLink>
                </NavItem>
              ))}
            </Nav>
          </CardBody>
        </Card>

        {loading ? (
          <div className="analytics-loading">
            <Spinner color="primary" />
            <span>Loading analytics</span>
          </div>
        ) : null}

        {!loading && error ? (
          <Alert color="danger" className="mb-4">
            {error}
          </Alert>
        ) : null}

        {!loading && !error && analytics ? (
          <TabContent activeTab={activeTab}>
            <TabPane tabId={activeTab}>{tabContent()}</TabPane>
          </TabContent>
        ) : null}

        {!loading && !error && analytics?.dataQuality ? (
          <Row className="g-4 mt-1">
            <Col xl={12}>
              <ProfileTable rows={analytics.dataQuality.collectionProfile} />
            </Col>
          </Row>
        ) : null}
      </Container>
    </div>
  );
};

Analytics.propTypes = {
  t: PropTypes.func.isRequired,
};

export default withTranslation()(Analytics);
