// path: src/pages/Quotations/Details.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
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
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import {
  deleteQuotation,
  fetchQuotation,
  fetchQuotationsLookups,
  updateQuotation,
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

const QuotationsDetails = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selected, loading, lookups } = useSelector(s => s.Quotations || {});
  const roles = useSelector(s => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [form, setForm] = useState({ ...emptyForm });
  const [touched, setTouched] = useState({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    if (id) {
      dispatch(fetchQuotationsLookups());
      dispatch(fetchQuotation(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (selected?._id) {
      setForm({
        TRAVEL_AGENT_ID: selected?.TRAVEL_AGENT_ID || "",
        TRANSPORTATION_COMPANY_ID: selected?.TRANSPORTATION_COMPANY_ID || "",
        ARRAIVING_DATE: formatDateInput(selected?.ARRAIVING_DATE),
        DEPARTURE_DATE: formatDateInput(selected?.DEPARTURE_DATE),
      });
      setTouched({});
    }
  }, [selected]);

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

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    setTouched(prev => ({ ...prev, [name]: true }));
  };

  const handleUpdate = e => {
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
      updateQuotation(id, { ...form }, () => {
        dispatch(fetchQuotation(id));
      })
    );
  };

  const handleDelete = () => {
    dispatch(
      deleteQuotation(id, () => {
        setDeleteOpen(false);
        navigate("/quotations");
      })
    );
  };

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
                        Data is loaded from the quotation by id endpoint.
                      </p>
                    </div>

                    <Button
                      color="danger"
                      outline
                      type="button"
                      onClick={() => setDeleteOpen(true)}
                      disabled={!canMutate}
                    >
                      Delete Quotation
                    </Button>
                  </div>

                  {loading && !selected ? (
                    <div className="text-center py-4">
                      <Spinner size="sm" className="me-2" />
                      Loading...
                    </div>
                  ) : (
                    <Form onSubmit={handleUpdate}>
                      <Row>
                        <Col md="6">
                          <div className="mb-3">
                            <Label className="form-label">Reference Number</Label>
                            <Input value={selected?.REFERANCE_NUMBER || ""} disabled />
                          </div>
                        </Col>

                        <Col md="6">
                          <div className="mb-3">
                            <Label className="form-label">Status</Label>
                            <Input
                              value={selected?.ACTIVE_STATUS ? "Active" : "Inactive"}
                              disabled
                            />
                          </div>
                        </Col>
                      </Row>

                      <Row>
                        <Col md="6">
                          <div className="mb-3">
                            <Label className="form-label">Travel Agent</Label>
                            <Input
                              type="select"
                              name="TRAVEL_AGENT_ID"
                              value={form.TRAVEL_AGENT_ID}
                              onChange={handleChange}
                              invalid={!!(touched.TRAVEL_AGENT_ID && errors.TRAVEL_AGENT_ID)}
                              disabled={!canMutate}
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
                        </Col>

                        <Col md="6">
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
                              disabled={!canMutate}
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
                        </Col>
                      </Row>

                      <Row>
                        <Col md="6">
                          <div className="mb-3">
                            <Label className="form-label">Arriving Date</Label>
                            <Input
                              type="date"
                              name="ARRAIVING_DATE"
                              value={form.ARRAIVING_DATE}
                              onChange={handleChange}
                              invalid={!!(touched.ARRAIVING_DATE && errors.ARRAIVING_DATE)}
                              disabled={!canMutate}
                              required
                            />
                            <FormFeedback>{errors.ARRAIVING_DATE}</FormFeedback>
                          </div>
                        </Col>

                        <Col md="6">
                          <div className="mb-3">
                            <Label className="form-label">Departure Date</Label>
                            <Input
                              type="date"
                              name="DEPARTURE_DATE"
                              value={form.DEPARTURE_DATE}
                              onChange={handleChange}
                              invalid={!!(touched.DEPARTURE_DATE && errors.DEPARTURE_DATE)}
                              disabled={!canMutate}
                              required
                            />
                            <FormFeedback>{errors.DEPARTURE_DATE}</FormFeedback>
                          </div>
                        </Col>
                      </Row>

                      <div className="d-flex gap-2">
                        <Button color="primary" type="submit" disabled={!canMutate || loading}>
                          Save Changes
                        </Button>
                        <Button
                          color="light"
                          type="button"
                          onClick={() => navigate("/quotations")}
                        >
                          Back
                        </Button>
                      </div>
                    </Form>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col xl="4">
              <Card>
                <CardBody>
                  <h4 className="card-title mb-3">Summary</h4>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">Reference Number</Label>
                    <div className="fw-semibold">{selected?.REFERANCE_NUMBER || "-"}</div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">Travel Agent</Label>
                    <div>{travelAgentMap.get(selected?.TRAVEL_AGENT_ID) || "-"}</div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">Transportation Company</Label>
                    <div>
                      {transportationCompanyMap.get(selected?.TRANSPORTATION_COMPANY_ID) || "-"}
                    </div>
                  </div>

                  <div className="mb-3">
                    <Label className="form-label text-muted mb-1">Arriving Date</Label>
                    <div>{formatDateInput(selected?.ARRAIVING_DATE) || "-"}</div>
                  </div>

                  <div className="mb-0">
                    <Label className="form-label text-muted mb-1">Departure Date</Label>
                    <div>{formatDateInput(selected?.DEPARTURE_DATE) || "-"}</div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen(v => !v)} centered>
        <ModalHeader toggle={() => setDeleteOpen(false)}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete quotation{" "}
          <b>{selected?.REFERANCE_NUMBER || "-"}</b>?
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

export default QuotationsDetails;