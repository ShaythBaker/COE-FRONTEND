// path: src/pages/Quotations/List.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import {
  createQuotation,
  deleteQuotation,
  fetchQuotation,
  fetchQuotations,
  fetchQuotationsLookups,
} from "../../store/Quotations/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyForm = {
  TRAVEL_AGENT_ID: "",
  TRANSPORTATION_COMPANY_ID: "",
  ARRAIVING_DATE: "",
  DEPARTURE_DATE: "",
};

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

const getTransportationCompanyLabel = item =>
  item?.COMPANY_NAME ||
  item?.NAME ||
  item?.companyName ||
  "-";

const formatDateInput = value => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const QuotationsList = () => {
  const dispatch = useDispatch();
  const { items, loading, lookups, lookupsLoading } = useSelector(s => s.Quotations || {});
  const roles = useSelector(s => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [touched, setTouched] = useState({});
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    dispatch(fetchQuotationsLookups());
    dispatch(fetchQuotations());
  }, [dispatch]);

  const travelAgentMap = useMemo(() => {
    const map = new Map();
    (lookups?.travelAgents || []).forEach(item => {
      map.set(unwrapId(item?._id), getTravelAgentLabel(item));
    });
    return map;
  }, [lookups]);

  const transportationCompanyMap = useMemo(() => {
    const map = new Map();
    (lookups?.transportationCompanies || []).forEach(item => {
      map.set(unwrapId(item?._id), getTransportationCompanyLabel(item));
    });
    return map;
  }, [lookups]);

  const filteredItems = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return items || [];

    return (items || []).filter(item => {
      const ref = String(item?.REFERANCE_NUMBER || "").toLowerCase();
      const agent = String(travelAgentMap.get(item?.TRAVEL_AGENT_ID) || "").toLowerCase();
      const company = String(
        transportationCompanyMap.get(item?.TRANSPORTATION_COMPANY_ID) || ""
      ).toLowerCase();

      return ref.includes(q) || agent.includes(q) || company.includes(q);
    });
  }, [items, search, travelAgentMap, transportationCompanyMap]);

  const errors = useMemo(() => {
    const next = {};

    if (!String(form.TRAVEL_AGENT_ID || "").trim()) {
      next.TRAVEL_AGENT_ID = "Required";
    }
    if (!String(form.TRANSPORTATION_COMPANY_ID || "").trim()) {
      next.TRANSPORTATION_COMPANY_ID = "Required";
    }
    if (!String(form.ARRAIVING_DATE || "").trim()) {
      next.ARRAIVING_DATE = "Required";
    }
    if (!String(form.DEPARTURE_DATE || "").trim()) {
      next.DEPARTURE_DATE = "Required";
    }
    if (
      form.ARRAIVING_DATE &&
      form.DEPARTURE_DATE &&
      new Date(form.DEPARTURE_DATE) < new Date(form.ARRAIVING_DATE)
    ) {
      next.DEPARTURE_DATE = "Departure date must be on or after arriving date";
    }

    return next;
  }, [form]);

  const openCreate = () => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }
    setTouched({});
    setForm({ ...emptyForm });
    setCreateOpen(true);
  };

  const openDelete = row => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }
    setDeleting(row);
    setDeleteOpen(true);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleCreate = e => {
    e.preventDefault();

    const nextTouched = {
      TRAVEL_AGENT_ID: true,
      TRANSPORTATION_COMPANY_ID: true,
      ARRAIVING_DATE: true,
      DEPARTURE_DATE: true,
    };
    setTouched(nextTouched);

    if (Object.keys(errors).length > 0) {
      notifyError("Please fix validation errors before saving.");
      return;
    }

    dispatch(
      createQuotation(
        {
          TRAVEL_AGENT_ID: form.TRAVEL_AGENT_ID,
          TRANSPORTATION_COMPANY_ID: form.TRANSPORTATION_COMPANY_ID,
          ARRAIVING_DATE: form.ARRAIVING_DATE,
          DEPARTURE_DATE: form.DEPARTURE_DATE,
        },
        created => {
          setCreateOpen(false);
          setForm({ ...emptyForm });
          dispatch(fetchQuotations());
          if (created?._id) {
            dispatch(fetchQuotation(created._id));
          }
        }
      )
    );
  };

  const handleDelete = () => {
    if (!deleting?._id) {
      notifyError("Quotation id is missing.");
      return;
    }

    dispatch(
      deleteQuotation(deleting._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
        dispatch(fetchQuotations());
      })
    );
  };

  document.title = "Quotations | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Quotations" />

          <Row>
            <Col xs="12">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                    <div>
                      <h4 className="card-title mb-1">Quotations</h4>
                      <p className="card-title-desc mb-0">
                        List quotations and create a new quotation from the modal.
                      </p>
                    </div>

                    <div className="d-flex gap-2">
                      <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search quotation..."
                        style={{ minWidth: 260 }}
                      />
                      <Button
                        color="primary"
                        onClick={openCreate}
                        disabled={!canMutate || lookupsLoading}
                      >
                        <i className="bx bx-plus me-1" />
                        Create
                      </Button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <Table className="table align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: 70 }}>#</th>
                          <th>Reference Number</th>
                          <th>Travel Agent</th>
                          <th>Transportation Company</th>
                          <th>Arriving Date</th>
                          <th>Departure Date</th>
                          <th style={{ width: 180 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="7" className="text-center py-4">
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center text-muted py-4">
                              No quotations found.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((row, index) => (
                            <tr key={row?._id || index}>
                              <td>{index + 1}</td>
                              <td className="fw-semibold">{row?.REFERANCE_NUMBER || "-"}</td>
                              <td>{travelAgentMap.get(row?.TRAVEL_AGENT_ID) || "-"}</td>
                              <td>
                                {transportationCompanyMap.get(row?.TRANSPORTATION_COMPANY_ID) || "-"}
                              </td>
                              <td>{formatDateInput(row?.ARRAIVING_DATE) || "-"}</td>
                              <td>{formatDateInput(row?.DEPARTURE_DATE) || "-"}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Link
                                    to={`/quotations/${row?._id}`}
                                    className="btn btn-sm btn-primary"
                                  >
                                    Details
                                  </Link>
                                  <Button
                                    size="sm"
                                    color="danger"
                                    outline
                                    onClick={() => openDelete(row)}
                                    disabled={!canMutate}
                                  >
                                    Delete
                                  </Button>
                                </div>
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

      <Modal isOpen={createOpen} toggle={() => setCreateOpen(v => !v)} centered>
        <Form onSubmit={handleCreate}>
          <ModalHeader toggle={() => setCreateOpen(false)}>Add Quotation</ModalHeader>
          <ModalBody>
            <div className="mb-3">
              <Label className="form-label">Travel Agent</Label>
              <Input
                type="select"
                name="TRAVEL_AGENT_ID"
                value={form.TRAVEL_AGENT_ID}
                onChange={handleChange}
                invalid={!!(touched.TRAVEL_AGENT_ID && errors.TRAVEL_AGENT_ID)}
                required
              >
                <option value="">Select Travel Agent</option>
                {(lookups?.travelAgents || []).map(item => (
                  <option key={unwrapId(item?._id)} value={unwrapId(item?._id)}>
                    {getTravelAgentLabel(item)}
                  </option>
                ))}
              </Input>
              <FormFeedback>{errors.TRAVEL_AGENT_ID}</FormFeedback>
            </div>

            <div className="mb-3">
              <Label className="form-label">Transportation Company</Label>
              <Input
                type="select"
                name="TRANSPORTATION_COMPANY_ID"
                value={form.TRANSPORTATION_COMPANY_ID}
                onChange={handleChange}
                invalid={
                  !!(
                    touched.TRANSPORTATION_COMPANY_ID &&
                    errors.TRANSPORTATION_COMPANY_ID
                  )
                }
                required
              >
                <option value="">Select Transportation Company</option>
                {(lookups?.transportationCompanies || []).map(item => (
                  <option key={unwrapId(item?._id)} value={unwrapId(item?._id)}>
                    {getTransportationCompanyLabel(item)}
                  </option>
                ))}
              </Input>
              <FormFeedback>{errors.TRANSPORTATION_COMPANY_ID}</FormFeedback>
            </div>

            <div className="mb-3">
              <Label className="form-label">Arriving Date</Label>
              <Input
                type="date"
                name="ARRAIVING_DATE"
                value={form.ARRAIVING_DATE}
                onChange={handleChange}
                invalid={!!(touched.ARRAIVING_DATE && errors.ARRAIVING_DATE)}
                required
              />
              <FormFeedback>{errors.ARRAIVING_DATE}</FormFeedback>
            </div>

            <div className="mb-0">
              <Label className="form-label">Departure Date</Label>
              <Input
                type="date"
                name="DEPARTURE_DATE"
                value={form.DEPARTURE_DATE}
                onChange={handleChange}
                invalid={!!(touched.DEPARTURE_DATE && errors.DEPARTURE_DATE)}
                required
              />
              <FormFeedback>{errors.DEPARTURE_DATE}</FormFeedback>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button color="light" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={loading}>
              Save
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen(v => !v)} centered>
        <ModalHeader toggle={() => setDeleteOpen(false)}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete quotation{" "}
          <b>{deleting?.REFERANCE_NUMBER || "-"}</b>?
        </ModalBody>
        <ModalFooter>
          <Button color="light" type="button" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button color="danger" type="button" onClick={handleDelete} disabled={loading}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default QuotationsList;