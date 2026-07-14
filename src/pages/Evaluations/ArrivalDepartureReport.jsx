import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  ButtonGroup,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Row,
  Spinner,
  Table,
} from "reactstrap";

import Breadcrumbs from "../../components/Common/Breadcrumb";
import { get } from "../../helpers/api_helper";
import {
  getReservationBadgeColor,
  normalizeReservationFileStatus,
} from "../../helpers/evaluation_workflow";
import { ARRIVAL_DEPARTURE_REPORT } from "../../helpers/url_helper";

const TABS = {
  ARRIVAL: "arrival",
  DEPARTURE: "departure",
};

const toDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

const ArrivalDepartureReport = () => {
  const [activeTab, setActiveTab] = useState(TABS.ARRIVAL);
  const [selectedDate, setSelectedDate] = useState(toDateInputValue());
  const [report, setReport] = useState({
    arrivals: [],
    departures: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    document.title = "Arrival and Departure Report | Skote";
  }, []);

  useEffect(() => {
    const loadReport = async () => {
      try {
        setLoading(true);
        setError("");
        const response = await get(ARRIVAL_DEPARTURE_REPORT, {
          params: { date: selectedDate },
        });
        setReport({
          arrivals: asArray(response?.arrivals),
          departures: asArray(response?.departures),
        });
      } catch (err) {
        setError(
          err?.response?.data?.message ||
            "Failed to load arrival and departure report.",
        );
        setReport({ arrivals: [], departures: [] });
      } finally {
        setLoading(false);
      }
    };

    if (selectedDate) loadReport();
  }, [selectedDate]);

  const currentRows = useMemo(
    () =>
      activeTab === TABS.ARRIVAL
        ? asArray(report.arrivals)
        : asArray(report.departures),
    [activeTab, report],
  );

  const dateColumnLabel =
    activeTab === TABS.ARRIVAL ? "Arrival Date" : "Departure Date";
  const emptyLabel =
    activeTab === TABS.ARRIVAL
      ? "No arrivals found for this date."
      : "No departures found for this date.";

  const renderTable = () => (
    <div className="table-responsive">
      <Table className="table align-middle table-nowrap mb-0">
        <thead className="table-light">
          <tr>
            <th>File No.</th>
            <th>Client / Group</th>
            <th>{dateColumnLabel}</th>
            <th>Hotel / Place</th>
            <th>Pax</th>
            <th>Travel Agent</th>
            <th>Status</th>
            <th className="text-end">Action</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan="8" className="text-center py-5">
                <Spinner size="sm" className="me-2" />
                Loading report...
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan="8" className="text-center text-danger py-5">
                {error}
              </td>
            </tr>
          ) : currentRows.length === 0 ? (
            <tr>
              <td colSpan="8" className="text-center text-muted py-5">
                {emptyLabel}
              </td>
            </tr>
          ) : (
            currentRows.map(item => (
              <tr key={item?._id}>
                <td>
                  <div className="fw-semibold">{item?.fileReference || "-"}</div>
                  <small className="text-muted">
                    {item?.quotationReference || ""}
                  </small>
                </td>
                <td>{item?.clientName || "-"}</td>
                <td>
                  {formatDateLabel(
                    activeTab === TABS.ARRIVAL
                      ? item?.arrivalDate
                      : item?.departureDate,
                  )}
                </td>
                <td>{item?.hotelOrPlace || "-"}</td>
                <td>{item?.pax || "-"}</td>
                <td>{item?.travelAgentName || "-"}</td>
                <td>
                  <Badge color={getReservationBadgeColor(item?.status)} pill>
                    {normalizeReservationFileStatus(item?.status)}
                  </Badge>
                </td>
                <td className="text-end">
                  <Button
                    tag={Link}
                    to={`/reservation-files/${item?._id}`}
                    color="primary"
                    size="sm"
                  >
                    Detail
                  </Button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </Table>
    </div>
  );

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs
            title="Evaluations"
            breadcrumbItem="Arrival and Departure Report"
          />

          <Row>
            <Col xs="12">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
                    <div>
                      <h4 className="card-title mb-1">
                        Arrival and Departure Report
                      </h4>
                      <p className="card-title-desc mb-0">
                        Approved reservation files by arrival or departure date.
                      </p>
                    </div>
                    <div style={{ minWidth: 220 }}>
                      <Input
                        type="date"
                        value={selectedDate}
                        onChange={event => setSelectedDate(event.target.value)}
                      />
                    </div>
                  </div>

                  <ButtonGroup className="mb-4">
                    <Button
                      color={activeTab === TABS.ARRIVAL ? "primary" : "light"}
                      onClick={() => setActiveTab(TABS.ARRIVAL)}
                    >
                      Arrival
                    </Button>
                    <Button
                      color={activeTab === TABS.DEPARTURE ? "primary" : "light"}
                      onClick={() => setActiveTab(TABS.DEPARTURE)}
                    >
                      Departure
                    </Button>
                  </ButtonGroup>

                  {renderTable()}
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ArrivalDepartureReport;
