// path: src/pages/Quotations/List.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
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
  fetchQuotations,
  fetchQuotationsLookups,
  updateQuotation,
} from "../../store/Quotations/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyForm = {
  TRAVEL_AGENT_ID: "",
  NATIONALITY: "",
  QUOTATION_TYPE: "",
  QUOTATION_START_DATE: "",
  QUOTATION_END_DATE: "",
  QUOTATION_DURATION_DAYS: "",
  NUMBER_OF_PAX: "",
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

const getListItemValue = item => unwrapId(item?._id);

const getListItemLabel = item =>
  item?.ITEM_VALUE ||
  item?.LIST_LABEL ||
  item?.LABEL ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  item?.CODE ||
  "-";

const formatDateInput = value => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const QuotationsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, loading, lookups, lookupsLoading } = useSelector(
    s => s.Quotations || {}
  );
  const roles = useSelector(s => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [touched, setTouched] = useState({});
  const [editing, setEditing] = useState(null);
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

  const nationalityMap = useMemo(() => {
    const map = new Map();
    (lookups?.COUNTRIES || []).forEach(item => {
      map.set(getListItemValue(item), getListItemLabel(item));
    });
    return map;
  }, [lookups]);

  const quotationTypeMap = useMemo(() => {
    const map = new Map();
    (lookups?.QUOTATION_TYPE || []).forEach(item => {
      map.set(getListItemValue(item), getListItemLabel(item));
    });
    return map;
  }, [lookups]);

  const nationalityOptions = useMemo(() => {
    const rows = Array.isArray(lookups?.COUNTRIES) ? [...lookups.COUNTRIES] : [];
    return rows.sort((a, b) => Number(a?.SORT_ORDER || 0) - Number(b?.SORT_ORDER || 0));
  }, [lookups]);

  const quotationTypeOptions = useMemo(() => {
    const rows = Array.isArray(lookups?.QUOTATION_TYPE)
      ? [...lookups.QUOTATION_TYPE]
      : [];
    return rows.sort((a, b) => Number(a?.SORT_ORDER || 0) - Number(b?.SORT_ORDER || 0));
  }, [lookups]);

  const filteredItems = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();
    if (!q) return items || [];

    return (items || []).filter(item => {
      const ref = String(item?.REFERANCE_NUMBER || "").toLowerCase();
      const agent = String(
        travelAgentMap.get(item?.TRAVEL_AGENT_ID) || ""
      ).toLowerCase();
      const nationality = String(
        nationalityMap.get(item?.NATIONALITY) || ""
      ).toLowerCase();
      const quotationType = String(
        quotationTypeMap.get(item?.QUOTATION_TYPE) || ""
      ).toLowerCase();

      return (
        ref.includes(q) ||
        agent.includes(q) ||
        nationality.includes(q) ||
        quotationType.includes(q)
      );
    });
  }, [items, search, travelAgentMap, nationalityMap, quotationTypeMap]);

  const errors = useMemo(() => {
    const next = {};

    if (!String(form.TRAVEL_AGENT_ID || "").trim()) {
      next.TRAVEL_AGENT_ID = "Required";
    }
    if (!String(form.NATIONALITY || "").trim()) {
      next.NATIONALITY = "Required";
    }
    if (!String(form.QUOTATION_TYPE || "").trim()) {
      next.QUOTATION_TYPE = "Required";
    }
    if (!String(form.QUOTATION_START_DATE || "").trim()) {
      next.QUOTATION_START_DATE = "Required";
    }
    if (!String(form.QUOTATION_END_DATE || "").trim()) {
      next.QUOTATION_END_DATE = "Required";
    }
    if (!String(form.QUOTATION_DURATION_DAYS || "").trim()) {
      next.QUOTATION_DURATION_DAYS = "Required";
    } else if (Number(form.QUOTATION_DURATION_DAYS) <= 0) {
      next.QUOTATION_DURATION_DAYS = "Duration must be greater than 0";
    }
    if (!String(form.NUMBER_OF_PAX || "").trim()) {
      next.NUMBER_OF_PAX = "Required";
    } else if (Number(form.NUMBER_OF_PAX) <= 0) {
      next.NUMBER_OF_PAX = "Number of Pax must be greater than 0";
    }

    if (
      form.QUOTATION_START_DATE &&
      form.QUOTATION_END_DATE &&
      new Date(form.QUOTATION_END_DATE) < new Date(form.QUOTATION_START_DATE)
    ) {
      next.QUOTATION_END_DATE = "End date must be on or after start date";
    }

    return next;
  }, [form]);

  const resetFormState = () => {
    setForm({ ...emptyForm });
    setTouched({});
  };

  const openCreate = () => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }
    setEditing(null);
    resetFormState();
    setCreateOpen(true);
  };

  const openEdit = row => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    if (!row?._id) {
      notifyError("Quotation id is missing.");
      return;
    }

    setEditing(row);
    setTouched({});
    setForm({
      ...emptyForm,
      TRAVEL_AGENT_ID: row?.TRAVEL_AGENT_ID || "",
      NATIONALITY: row?.NATIONALITY || "",
      QUOTATION_TYPE: row?.QUOTATION_TYPE || "",
      QUOTATION_START_DATE: formatDateInput(row?.QUOTATION_START_DATE),
      QUOTATION_END_DATE: formatDateInput(row?.QUOTATION_END_DATE),
      QUOTATION_DURATION_DAYS:
        row?.QUOTATION_DURATION_DAYS !== undefined &&
        row?.QUOTATION_DURATION_DAYS !== null
          ? String(row.QUOTATION_DURATION_DAYS)
          : row?.DURATION_IN_DAYS !== undefined && row?.DURATION_IN_DAYS !== null
          ? String(row.DURATION_IN_DAYS)
          : "",
      NUMBER_OF_PAX:
        row?.NUMBER_OF_PAX !== undefined && row?.NUMBER_OF_PAX !== null
          ? String(row.NUMBER_OF_PAX)
          : "",
    });
    setEditOpen(true);
  };

  const openDelete = row => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    if (!row?._id) {
      notifyError("Quotation id is missing.");
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

  const touchAll = () => {
    setTouched({
      TRAVEL_AGENT_ID: true,
      NATIONALITY: true,
      QUOTATION_TYPE: true,
      QUOTATION_START_DATE: true,
      QUOTATION_END_DATE: true,
      QUOTATION_DURATION_DAYS: true,
      NUMBER_OF_PAX: true,
    });
  };

  const buildPayload = () => ({
    TRAVEL_AGENT_ID: form.TRAVEL_AGENT_ID,
    NATIONALITY: form.NATIONALITY,
    QUOTATION_TYPE: form.QUOTATION_TYPE,
    QUOTATION_START_DATE: form.QUOTATION_START_DATE,
    QUOTATION_END_DATE: form.QUOTATION_END_DATE,
    QUOTATION_DURATION_DAYS: Number(form.QUOTATION_DURATION_DAYS),
    NUMBER_OF_PAX: Number(form.NUMBER_OF_PAX),
  });

  const handleCreate = e => {
    e.preventDefault();
    touchAll();

    if (Object.keys(errors).length > 0) {
      notifyError("Please fix validation errors before saving.");
      return;
    }

    dispatch(
      createQuotation(buildPayload(), created => {
        setCreateOpen(false);
        resetFormState();
        if (created?._id) {
          navigate(`/quotations/${created._id}`);
          return;
        }
        dispatch(fetchQuotations());
      })
    );
  };

  const handleEdit = e => {
    e.preventDefault();
    touchAll();

    if (!editing?._id) {
      notifyError("Quotation id is missing.");
      return;
    }

    if (Object.keys(errors).length > 0) {
      notifyError("Please fix validation errors before saving.");
      return;
    }

    dispatch(
      updateQuotation(editing._id, buildPayload(), updated => {
        setEditOpen(false);
        setEditing(null);
        resetFormState();
        if (!updated?._id) {
          dispatch(fetchQuotations());
        }
      })
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
                        List quotations, create, edit, delete, and plan days.
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
                          <th>Nationality</th>
                          <th>Quotation Type</th>
                          <th>Start Date</th>
                          <th>End Date</th>
                          <th>Duration</th>
                          <th>Number of Pax</th>
                          <th style={{ width: 330 }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="10" className="text-center py-4">
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan="10" className="text-center text-muted py-4">
                              No quotations found.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((row, index) => (
                            <tr key={row?._id || index}>
                              <td>{index + 1}</td>
                              <td className="fw-semibold">
                                {row?.REFERANCE_NUMBER || "-"}
                              </td>
                              <td>{travelAgentMap.get(row?.TRAVEL_AGENT_ID) || "-"}</td>
                              <td>{nationalityMap.get(row?.NATIONALITY) || "-"}</td>
                              <td>{quotationTypeMap.get(row?.QUOTATION_TYPE) || "-"}</td>
                              <td>{formatDateInput(row?.QUOTATION_START_DATE) || "-"}</td>
                              <td>{formatDateInput(row?.QUOTATION_END_DATE) || "-"}</td>
                              <td>
                                {row?.QUOTATION_DURATION_DAYS ??
                                  row?.DURATION_IN_DAYS ??
                                  "-"}
                              </td>
                              <td>{row?.NUMBER_OF_PAX ?? "-"}</td>
                              <td>
                                <div className="d-flex gap-2 flex-wrap">
                                  <Link
                                    to={`/quotations/${row?._id}`}
                                    className="btn btn-sm btn-primary"
                                  >
                                    Details
                                  </Link>

                                  <Link
                                    to={`/quotations/${row?._id}/plan`}
                                    className="btn btn-sm btn-info"
                                  >
                                    Plan
                                  </Link>

                                  <Button
                                    size="sm"
                                    color="warning"
                                    outline
                                    onClick={() => openEdit(row)}
                                    disabled={!canMutate}
                                  >
                                    Edit
                                  </Button>

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

      <Modal isOpen={createOpen} toggle={() => setCreateOpen(false)} centered>
        <Form onSubmit={handleCreate}>
          <ModalHeader toggle={() => setCreateOpen(false)}>
            Add Quotation
          </ModalHeader>
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

            <Row>
              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Nationality</Label>
                  <Input
                    type="select"
                    name="NATIONALITY"
                    value={form.NATIONALITY}
                    onChange={handleChange}
                    invalid={!!(touched.NATIONALITY && errors.NATIONALITY)}
                  >
                    <option value="">Select Nationality</option>
                    {nationalityOptions.map((item, index) => {
                      const value = getListItemValue(item);
                      const label = getListItemLabel(item);
                      return (
                        <option key={`${value || "country"}-${index}`} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </Input>
                  <FormFeedback>{errors.NATIONALITY}</FormFeedback>
                </div>
              </Col>

              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Quotation Type</Label>
                  <Input
                    type="select"
                    name="QUOTATION_TYPE"
                    value={form.QUOTATION_TYPE}
                    onChange={handleChange}
                    invalid={!!(touched.QUOTATION_TYPE && errors.QUOTATION_TYPE)}
                  >
                    <option value="">Select Quotation Type</option>
                    {quotationTypeOptions.map((item, index) => {
                      const value = getListItemValue(item);
                      const label = getListItemLabel(item);
                      return (
                        <option key={`${value || "quotation-type"}-${index}`} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </Input>
                  <FormFeedback>{errors.QUOTATION_TYPE}</FormFeedback>
                </div>
              </Col>
            </Row>

            <div className="mb-3">
              <Label className="form-label d-block">Quotation Range</Label>
              <Row>
                <Col md="6">
                  <div className="mb-3 mb-md-0">
                    <Label className="form-label">Start Date</Label>
                    <Input
                      type="date"
                      name="QUOTATION_START_DATE"
                      value={form.QUOTATION_START_DATE}
                      onChange={handleChange}
                      invalid={
                        !!(
                          touched.QUOTATION_START_DATE &&
                          errors.QUOTATION_START_DATE
                        )
                      }
                    />
                    <FormFeedback>{errors.QUOTATION_START_DATE}</FormFeedback>
                  </div>
                </Col>

                <Col md="6">
                  <div>
                    <Label className="form-label">End Date</Label>
                    <Input
                      type="date"
                      name="QUOTATION_END_DATE"
                      value={form.QUOTATION_END_DATE}
                      onChange={handleChange}
                      invalid={
                        !!(
                          touched.QUOTATION_END_DATE &&
                          errors.QUOTATION_END_DATE
                        )
                      }
                    />
                    <FormFeedback>{errors.QUOTATION_END_DATE}</FormFeedback>
                  </div>
                </Col>
              </Row>
            </div>

            <Row>
              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Quotation Duration on Days</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    name="QUOTATION_DURATION_DAYS"
                    value={form.QUOTATION_DURATION_DAYS}
                    onChange={handleChange}
                    placeholder="Enter duration in days"
                    invalid={
                      !!(
                        touched.QUOTATION_DURATION_DAYS &&
                        errors.QUOTATION_DURATION_DAYS
                      )
                    }
                  />
                  <FormFeedback>{errors.QUOTATION_DURATION_DAYS}</FormFeedback>
                </div>
              </Col>

              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Number of Pax</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    name="NUMBER_OF_PAX"
                    value={form.NUMBER_OF_PAX}
                    onChange={handleChange}
                    placeholder="Enter number of pax"
                    invalid={!!(touched.NUMBER_OF_PAX && errors.NUMBER_OF_PAX)}
                  />
                  <FormFeedback>{errors.NUMBER_OF_PAX}</FormFeedback>
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button
              color="light"
              type="button"
              onClick={() => {
                setCreateOpen(false);
                resetFormState();
              }}
            >
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={loading}>
              Save
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={editOpen} toggle={() => setEditOpen(false)} centered size="lg">
        <Form onSubmit={handleEdit}>
          <ModalHeader toggle={() => setEditOpen(false)}>
            Edit Quotation
          </ModalHeader>
          <ModalBody>
            <div className="mb-3">
              <Label className="form-label">Reference Number</Label>
              <Input value={editing?.REFERANCE_NUMBER || ""} disabled />
            </div>

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

            <Row>
              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Nationality</Label>
                  <Input
                    type="select"
                    name="NATIONALITY"
                    value={form.NATIONALITY}
                    onChange={handleChange}
                    invalid={!!(touched.NATIONALITY && errors.NATIONALITY)}
                  >
                    <option value="">Select Nationality</option>
                    {nationalityOptions.map((item, index) => {
                      const value = getListItemValue(item);
                      const label = getListItemLabel(item);
                      return (
                        <option key={`${value || "country"}-${index}`} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </Input>
                  <FormFeedback>{errors.NATIONALITY}</FormFeedback>
                </div>
              </Col>

              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Quotation Type</Label>
                  <Input
                    type="select"
                    name="QUOTATION_TYPE"
                    value={form.QUOTATION_TYPE}
                    onChange={handleChange}
                    invalid={!!(touched.QUOTATION_TYPE && errors.QUOTATION_TYPE)}
                  >
                    <option value="">Select Quotation Type</option>
                    {quotationTypeOptions.map((item, index) => {
                      const value = getListItemValue(item);
                      const label = getListItemLabel(item);
                      return (
                        <option key={`${value || "quotation-type"}-${index}`} value={value}>
                          {label}
                        </option>
                      );
                    })}
                  </Input>
                  <FormFeedback>{errors.QUOTATION_TYPE}</FormFeedback>
                </div>
              </Col>
            </Row>

            <div className="mb-3">
              <Label className="form-label d-block">Quotation Range</Label>
              <Row>
                <Col md="6">
                  <div className="mb-3 mb-md-0">
                    <Label className="form-label">Start Date</Label>
                    <Input
                      type="date"
                      name="QUOTATION_START_DATE"
                      value={form.QUOTATION_START_DATE}
                      onChange={handleChange}
                      invalid={
                        !!(
                          touched.QUOTATION_START_DATE &&
                          errors.QUOTATION_START_DATE
                        )
                      }
                    />
                    <FormFeedback>{errors.QUOTATION_START_DATE}</FormFeedback>
                  </div>
                </Col>

                <Col md="6">
                  <div>
                    <Label className="form-label">End Date</Label>
                    <Input
                      type="date"
                      name="QUOTATION_END_DATE"
                      value={form.QUOTATION_END_DATE}
                      onChange={handleChange}
                      invalid={
                        !!(
                          touched.QUOTATION_END_DATE &&
                          errors.QUOTATION_END_DATE
                        )
                      }
                    />
                    <FormFeedback>{errors.QUOTATION_END_DATE}</FormFeedback>
                  </div>
                </Col>
              </Row>
            </div>

            <Row>
              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Quotation Duration on Days</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    name="QUOTATION_DURATION_DAYS"
                    value={form.QUOTATION_DURATION_DAYS}
                    onChange={handleChange}
                    placeholder="Enter duration in days"
                    invalid={
                      !!(
                        touched.QUOTATION_DURATION_DAYS &&
                        errors.QUOTATION_DURATION_DAYS
                      )
                    }
                  />
                  <FormFeedback>{errors.QUOTATION_DURATION_DAYS}</FormFeedback>
                </div>
              </Col>

              <Col md="6">
                <div className="mb-0">
                  <Label className="form-label">Number of Pax</Label>
                  <Input
                    type="number"
                    min="1"
                    step="1"
                    name="NUMBER_OF_PAX"
                    value={form.NUMBER_OF_PAX}
                    onChange={handleChange}
                    placeholder="Enter number of pax"
                    invalid={!!(touched.NUMBER_OF_PAX && errors.NUMBER_OF_PAX)}
                  />
                  <FormFeedback>{errors.NUMBER_OF_PAX}</FormFeedback>
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button
              color="light"
              type="button"
              onClick={() => {
                setEditOpen(false);
                setEditing(null);
                resetFormState();
              }}
            >
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={loading}>
              Save Changes
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen(false)} centered>
        <ModalHeader toggle={() => setDeleteOpen(false)}>
          Confirm Delete
        </ModalHeader>
        <ModalBody>
          Are you sure you want to delete quotation{" "}
          <b>{deleting?.REFERANCE_NUMBER || "-"}</b>?
          <div className="text-muted mt-2">
            This action will permanently delete the quotation.
          </div>

          <div className="mt-3 border rounded p-3 bg-light">
            <div className="mb-2">
              <span className="fw-semibold">Travel Agent:</span>{" "}
              {travelAgentMap.get(deleting?.TRAVEL_AGENT_ID) || "-"}
            </div>
            <div className="mb-2">
              <span className="fw-semibold">Nationality:</span>{" "}
              {nationalityMap.get(deleting?.NATIONALITY) || "-"}
            </div>
            <div className="mb-2">
              <span className="fw-semibold">Quotation Type:</span>{" "}
              {quotationTypeMap.get(deleting?.QUOTATION_TYPE) || "-"}
            </div>
            <div className="mb-2">
              <span className="fw-semibold">Start Date:</span>{" "}
              {formatDateInput(deleting?.QUOTATION_START_DATE) || "-"}
            </div>
            <div className="mb-2">
              <span className="fw-semibold">End Date:</span>{" "}
              {formatDateInput(deleting?.QUOTATION_END_DATE) || "-"}
            </div>
            <div className="mb-0">
              <span className="fw-semibold">Duration:</span>{" "}
              {deleting?.QUOTATION_DURATION_DAYS ??
                deleting?.DURATION_IN_DAYS ??
                "-"}
            </div>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button
            color="light"
            type="button"
            onClick={() => {
              setDeleteOpen(false);
              setDeleting(null);
            }}
          >
            Cancel
          </Button>
          <Button
            color="danger"
            type="button"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default QuotationsList;