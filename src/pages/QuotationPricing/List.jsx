// path: src/pages/QuotationPricing/List.jsx
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
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import {
  fetchQuotationPricingQueue,
  setQuotationPricingFilter,
} from "../../store/QuotationPricing/actions";

const ALLOWED_ROLES = ["ACCOUNTING", "COMPANY_ADMIN"];
const STATUS_OPTIONS = [
  "SEND_FOR_PRICING",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
];

const formatDateTime = value => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB");
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

const QuotationPricingList = () => {
  const dispatch = useDispatch();
  const roles = useSelector(state => state.Login?.roles || []);
  const canAccess = hasAnyRole(roles, ALLOWED_ROLES);

  const {
    items = [],
    queueLoading,
    filterStatus,
  } = useSelector(state => state.QuotationPricing || {});

  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!canAccess) return;
    dispatch(fetchQuotationPricingQueue(filterStatus || "SEND_FOR_PRICING"));
  }, [dispatch, canAccess, filterStatus]);

  const filteredItems = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return items;

    return (items || []).filter(item => {
      const ref = String(item?.REFERANCE_NUMBER || "").toLowerCase();
      const status = String(item?.STATUS || "").toLowerCase();
      const board = String(item?.BOARD_BASIS || "").toLowerCase();
      return ref.includes(q) || status.includes(q) || board.includes(q);
    });
  }, [items, search]);

  const handleStatusChange = e => {
    const nextStatus = e.target.value || "SEND_FOR_PRICING";
    dispatch(setQuotationPricingFilter(nextStatus));
  };

  if (!canAccess) {
    notifyError("Permission/role mismatch");
    return null;
  }

  document.title = "Quotation Prices | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotation Pricing" breadcrumbItem="Quotation Prices" />

          <Row>
            <Col xs="12">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                    <div>
                      <h4 className="card-title mb-1">Quotation Prices</h4>
                      <p className="card-title-desc mb-0">
                        Accounting queue for quotation pricing review, profit, approval, and rejection.
                      </p>
                    </div>

                    <div className="d-flex gap-2">
                      <Input
                        type="select"
                        value={filterStatus || "SEND_FOR_PRICING"}
                        onChange={handleStatusChange}
                        style={{ minWidth: 220 }}
                      >
                        {STATUS_OPTIONS.map(status => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </Input>

                      <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search reference..."
                        style={{ minWidth: 260 }}
                      />

                      <Button
                        color="primary"
                        type="button"
                        onClick={() =>
                          dispatch(fetchQuotationPricingQueue(filterStatus || "SEND_FOR_PRICING"))
                        }
                      >
                        Refresh
                      </Button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <Table className="table align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 70 }}>#</th>
                          <th>Reference Number</th>
                          <th>Status</th>
                          <th>Board Basis</th>
                          <th>Pax</th>
                          <th>Sent On</th>
                          <th style={{ width: 140 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {queueLoading ? (
                          <tr>
                            <td colSpan="7" className="text-center py-4">
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center text-muted py-4">
                              No quotation pricing records found.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((row, index) => (
                            <tr key={row?._id || row?.QUOTATION_ID || index}>
                              <td>{index + 1}</td>
                              <td className="fw-semibold">
                                {row?.REFERANCE_NUMBER || "-"}
                              </td>
                              <td>
                                <Badge color={getStatusColor(row?.STATUS)}>
                                  {row?.STATUS || "-"}
                                </Badge>
                              </td>
                              <td>{row?.BOARD_BASIS || "-"}</td>
                              <td>{row?.NUMBER_OF_PAX ?? "-"}</td>
                              <td>{formatDateTime(row?.SENT_ON)}</td>
                              <td>
                                <Link
                                  to={`/quotation-pricing/${row?.QUOTATION_ID}`}
                                  className="btn btn-sm btn-primary"
                                >
                                  Details
                                </Link>
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

export default QuotationPricingList;
