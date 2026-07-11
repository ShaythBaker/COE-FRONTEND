import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
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
import { fetchReservationFiles } from "../../store/ReservationFiles/actions";
import {
  getReservationBadgeColor,
  normalizeReservationFileStatus,
} from "../../helpers/evaluation_workflow";

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

const ReservationFilesList = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector(s => s.ReservationFiles || {});
  const [search, setSearch] = useState("");

  useEffect(() => {
    dispatch(fetchReservationFiles());
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return items || [];

    return (items || []).filter(item => {
      const fileReference = String(item?.FILE_REFERENCE || "").toLowerCase();
      const quotationReference = String(item?.QUOTATION_REFERENCE || "").toLowerCase();
      const travelAgent = String(item?.TRAVEL_AGENT_NAME || "").toLowerCase();
      const status = String(item?.STATUS || "").toLowerCase();

      return (
        fileReference.includes(q) ||
        quotationReference.includes(q) ||
        travelAgent.includes(q) ||
        status.includes(q)
      );
    });
  }, [items, search]);

  document.title = "Reservation Files | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Reservations File" breadcrumbItem="List" />

          <Row>
            <Col xs="12">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
                    <div>
                      <h4 className="card-title mb-0">Reservations File</h4>
                    </div>
                    <Input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search..."
                      style={{ maxWidth: 260 }}
                    />
                  </div>

                  <div className="table-responsive">
                    <Table className="table align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Reference</th>
                          <th>Quotation</th>
                          <th>Travel Agent</th>
                          <th>Status</th>
                          <th>Created</th>
                          <th className="text-end">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="6" className="text-center py-5">
                              <Spinner size="sm" className="me-2" />
                              Loading reservation files...
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center text-muted py-5">
                              No reservation files found.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map(item => (
                            <tr key={item?._id}>
                              <td className="fw-semibold">
                                {item?.FILE_REFERENCE || "-"}
                              </td>
                              <td>{item?.QUOTATION_REFERENCE || "-"}</td>
                              <td>{item?.TRAVEL_AGENT_NAME || "-"}</td>
                              <td>
                                <Badge
                                  color={getReservationBadgeColor(item?.STATUS)}
                                  pill
                                >
                                  {normalizeReservationFileStatus(item?.STATUS)}
                                </Badge>
                              </td>
                              <td>{formatDateLabel(item?.CREATED_ON)}</td>
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
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ReservationFilesList;
