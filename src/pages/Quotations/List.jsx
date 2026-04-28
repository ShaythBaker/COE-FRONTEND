import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
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
import { notifyError, notifyInfo } from "../../helpers/notify";
import {
  createQuotation,
  fetchQuotations,
  fetchQuotationsLookups,
  updateQuotation,
} from "../../store/Quotations/actions";
import {
  sendQuotationForPricing,
  cancelQuotationPricing,
  fetchQuotationPricingQueue,
} from "../../store/QuotationPricing/actions";
import {
  canSendQuotationForPricing,
  getQuotationStatus,
  getQuotationStatusBadgeColor,
  getQuotationReadOnlyMessage,
  isQuotationReadOnly,
} from "../../helpers/quotation_pricing_helper";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const HIDDEN_AFTER_ACTION_STATUSES = new Set([
  "SEND_FOR_PRICING",
  "CANCELLED",
  "CANCEL",
]);

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

const normalizeStatus = value =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const calculateDurationDays = (startDate, endDate) => {
  if (!startDate || !endDate) return "";

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";

  const startOnly = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  );
  const endOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  const diffMs = endOnly.getTime() - startOnly.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  return diffDays >= 1 ? String(diffDays) : "";
};

const QuotationsList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { items, loading, lookups, lookupsLoading } = useSelector(
    s => s.Quotations || {}
  );
  const pricingSaving = useSelector(
    s => s.QuotationPricing?.saving || false
  );
  const rejectedPricingItems = useSelector(
    s => s.QuotationPricing?.items || []
  );
  const roles = useSelector(s => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [touched, setTouched] = useState({});
  const [editing, setEditing] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [rejectReasonView, setRejectReasonView] = useState(null);

  const [statusOverrides, setStatusOverrides] = useState({});
  const [hiddenQuotationIds, setHiddenQuotationIds] = useState({});

  useEffect(() => {
    dispatch(fetchQuotationsLookups());
    dispatch(fetchQuotations());
    dispatch(fetchQuotationPricingQueue("REJECTED"));
  }, [dispatch]);

  useEffect(() => {
    const nextHidden = {};
    const itemIds = new Set((items || []).map(item => item?._id).filter(Boolean));

    Object.entries(hiddenQuotationIds).forEach(([id, hidden]) => {
      if (hidden && itemIds.has(id)) {
        nextHidden[id] = true;
      }
    });

    if (Object.keys(nextHidden).length !== Object.keys(hiddenQuotationIds).length) {
      setHiddenQuotationIds(nextHidden);
    }
  }, [items, hiddenQuotationIds]);

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

  const rejectReasonMap = useMemo(() => {
    const map = new Map();

    (rejectedPricingItems || []).forEach(item => {
      const quotationId = unwrapId(item?.QUOTATION_ID);
      const reason = String(item?.REJECT_REASON || "").trim();
      if (quotationId && reason) {
        map.set(quotationId, reason);
      }
    });

    return map;
  }, [rejectedPricingItems]);

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

  const getEffectiveStatus = row => {
    if (row?._id && statusOverrides[row._id]) {
      return statusOverrides[row._id];
    }
    return getQuotationStatus(row);
  };

  const withEffectiveStatus = row => {
    const effectiveStatus = getEffectiveStatus(row);
    return {
      ...row,
      STATUS: effectiveStatus,
    };
  };

  const isDraftQuotation = row => {
    const status = normalizeStatus(getEffectiveStatus(row));
    return status === "DRAFT" || status === "DRAFT_QUOTATION";
  };

  const isRejectedQuotation = row => {
    const status = normalizeStatus(getEffectiveStatus(row));
    return status === "REJECTED";
  };

  const canShowCancelButton = row => {
    return isDraftQuotation(row) || isRejectedQuotation(row);
  };

  const canShowSendForPricingButton = row => {
    return canSendQuotationForPricing(withEffectiveStatus(row));
  };

  const shouldHideQuotationRow = row => {
    if (row?._id && hiddenQuotationIds[row._id]) return true;
    return HIDDEN_AFTER_ACTION_STATUSES.has(normalizeStatus(getEffectiveStatus(row)));
  };

  const filteredItems = useMemo(() => {
    const q = String(search || "").trim().toLowerCase();

    return (items || [])
      .filter(item => !shouldHideQuotationRow(item))
      .filter(item => {
        const rejectReason = String(rejectReasonMap.get(item?._id) || "").toLowerCase();

        if (!q) return true;

        const ref = String(item?.REFERANCE_NUMBER || "").toLowerCase();
        const agent = String(travelAgentMap.get(item?.TRAVEL_AGENT_ID) || "").toLowerCase();
        const nationality = String(nationalityMap.get(item?.NATIONALITY) || "").toLowerCase();
        const quotationType = String(
          quotationTypeMap.get(item?.QUOTATION_TYPE) || ""
        ).toLowerCase();
        const status = String(getEffectiveStatus(item) || "").toLowerCase();

        return (
          ref.includes(q) ||
          agent.includes(q) ||
          nationality.includes(q) ||
          quotationType.includes(q) ||
          status.includes(q) ||
          rejectReason.includes(q)
        );
      });
  }, [
    items,
    search,
    travelAgentMap,
    nationalityMap,
    quotationTypeMap,
    rejectReasonMap,
    hiddenQuotationIds,
    statusOverrides,
  ]);

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

    const calculatedDuration = calculateDurationDays(
      form.QUOTATION_START_DATE,
      form.QUOTATION_END_DATE
    );

    if (!String(form.QUOTATION_DURATION_DAYS || "").trim()) {
      next.QUOTATION_DURATION_DAYS = "Required";
    } else if (Number(form.QUOTATION_DURATION_DAYS) <= 0) {
      next.QUOTATION_DURATION_DAYS = "Duration must be greater than 0";
    } else if (
      calculatedDuration &&
      Number(form.QUOTATION_DURATION_DAYS) !== Number(calculatedDuration)
    ) {
      next.QUOTATION_DURATION_DAYS =
        "Duration must match start date and end date";
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

    if (isQuotationReadOnly(withEffectiveStatus(row))) {
      notifyError(getQuotationReadOnlyMessage(withEffectiveStatus(row)));
      return;
    }

    if (!row?._id) {
      notifyError("Quotation id is missing.");
      return;
    }

    setEditing(row);
    setForm({
      TRAVEL_AGENT_ID: row?.TRAVEL_AGENT_ID || "",
      NATIONALITY: row?.NATIONALITY || "",
      QUOTATION_TYPE: row?.QUOTATION_TYPE || "",
      QUOTATION_START_DATE: formatDateInput(row?.QUOTATION_START_DATE),
      QUOTATION_END_DATE: formatDateInput(row?.QUOTATION_END_DATE),
      QUOTATION_DURATION_DAYS: String(
        row?.DURATION_IN_DAYS ?? row?.QUOTATION_DURATION_DAYS ?? ""
      ),
      NUMBER_OF_PAX: String(row?.NUMBER_OF_PAX ?? ""),
    });
    setTouched({});
    setEditOpen(true);
  };

  const openCancel = row => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    if (!row?._id) {
      notifyError("Quotation id is missing.");
      return;
    }

    if (isQuotationReadOnly(withEffectiveStatus(row))) {
      notifyError(getQuotationReadOnlyMessage(withEffectiveStatus(row)));
      return;
    }

    if (!canShowCancelButton(row)) {
      notifyError("Cancel is allowed only for Draft or Rejected quotations.");
      return;
    }

    setCancelling(row);
    setCancelOpen(true);
  };

  const openRejectReason = (row, reason) => {
    setRejectReasonView({
      referenceNumber: row?.REFERANCE_NUMBER || "-",
      reason,
    });
  };

  const handleChange = e => {
    const { name, value } = e.target;

    setForm(prev => {
      const next = { ...prev, [name]: value };

      if (name === "QUOTATION_START_DATE" || name === "QUOTATION_END_DATE") {
        next.QUOTATION_DURATION_DAYS = calculateDurationDays(
          name === "QUOTATION_START_DATE" ? value : next.QUOTATION_START_DATE,
          name === "QUOTATION_END_DATE" ? value : next.QUOTATION_END_DATE
        );
      }

      return next;
    });

    setTouched(prev => ({
      ...prev,
      [name]: true,
      ...(name === "QUOTATION_START_DATE" || name === "QUOTATION_END_DATE"
        ? { QUOTATION_DURATION_DAYS: true }
        : {}),
    }));
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
    DURATION_IN_DAYS: Number(form.QUOTATION_DURATION_DAYS),
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

    if (isQuotationReadOnly(withEffectiveStatus(editing))) {
      notifyError(getQuotationReadOnlyMessage(withEffectiveStatus(editing)));
      return;
    }

    if (Object.keys(errors).length > 0) {
      notifyError("Please fix validation errors before saving.");
      return;
    }

    dispatch(
      updateQuotation(editing._id, buildPayload(), () => {
        setEditOpen(false);
        setEditing(null);
        resetFormState();
        dispatch(fetchQuotations());
      })
    );
  };

  const handleSendForPricing = row => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    if (!row?._id) {
      notifyError("Quotation id is missing.");
      return;
    }

    if (isQuotationReadOnly(withEffectiveStatus(row))) {
      notifyError(getQuotationReadOnlyMessage(withEffectiveStatus(row)));
      return;
    }

    if (!canShowSendForPricingButton(row)) {
      notifyError("This quotation cannot be sent for pricing.");
      return;
    }

    dispatch(
      sendQuotationForPricing(row._id, {}, () => {
        setStatusOverrides(prev => ({
          ...prev,
          [row._id]: "SEND_FOR_PRICING",
        }));
        setHiddenQuotationIds(prev => ({
          ...prev,
          [row._id]: true,
        }));
        notifyInfo("Quotation sent for pricing.");
      })
    );
  };

  const handleConfirmCancel = () => {
    if (!cancelling?._id) {
      notifyError("Quotation id is missing.");
      return;
    }

    dispatch(
      cancelQuotationPricing(cancelling._id, {}, () => {
        setStatusOverrides(prev => ({
          ...prev,
          [cancelling._id]: "CANCELLED",
        }));
        setHiddenQuotationIds(prev => ({
          ...prev,
          [cancelling._id]: true,
        }));
        setCancelOpen(false);
        setCancelling(null);
        notifyInfo("Quotation cancelled.");
      })
    );
  };

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="List" />

          <Row>
            <Col xs="12">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
                    <div>
                      <h4 className="card-title mb-0">Quotations</h4>
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                      <Input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search..."
                        style={{ minWidth: 220 }}
                      />
                      <Button color="primary" onClick={openCreate} disabled={!canMutate}>
                        <i className="bx bx-plus me-1" />
                        Create
                      </Button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <Table className="table align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>#</th>
                          <th>Reference Number</th>
                          <th>Travel Agent</th>
                          <th>Nationality</th>
                          <th>Quotation Type</th>
                          <th>Status</th>
                          <th>Reject Reason</th>
                          <th style={{ width: 320 }}>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="8" className="text-center py-4">
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan="8" className="text-center text-muted py-4">
                              No quotations found.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((row, index) => {
                            const readOnly = isQuotationReadOnly(withEffectiveStatus(row));
                            const effectiveStatus = getEffectiveStatus(row);
                            const showSendForPricing = canShowSendForPricingButton(row);
                            const showCancel = canShowCancelButton(row);
                            const rejectReason = String(
                              rejectReasonMap.get(row?._id) || row?.REJECT_REASON || ""
                            ).trim();

                            return (
                              <tr key={row?._id || index}>
                                <td>{index + 1}</td>
                                <td>{row?.REFERANCE_NUMBER || "-"}</td>
                                <td>{travelAgentMap.get(row?.TRAVEL_AGENT_ID) || "-"}</td>
                                <td>{nationalityMap.get(row?.NATIONALITY) || "-"}</td>
                                <td>{quotationTypeMap.get(row?.QUOTATION_TYPE) || "-"}</td>
                                <td>
                                  <Badge color={getQuotationStatusBadgeColor(effectiveStatus)}>
                                    {effectiveStatus || "-"}
                                  </Badge>
                                </td>
                                <td>
                                  {rejectReason ? (
                                    <Button
                                      size="sm"
                                      color="danger"
                                      outline
                                      type="button"
                                      onClick={() => openRejectReason(row, rejectReason)}
                                    >
                                      <i className="bx bx-message-square-detail me-1" />
                                      View
                                    </Button>
                                  ) : (
                                    "-"
                                  )}
                                </td>
                                <td>
                                  <div className="d-flex flex-wrap gap-2">
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

                                    {showSendForPricing ? (
                                      <Button
                                        size="sm"
                                        color="secondary"
                                        outline
                                        onClick={() => handleSendForPricing(row)}
                                        disabled={!canMutate || pricingSaving}
                                      >
                                        Send for Pricing
                                      </Button>
                                    ) : null}

                                    <Button
                                      size="sm"
                                      color="warning"
                                      outline
                                      onClick={() => openEdit(row)}
                                      disabled={!canMutate || readOnly}
                                    >
                                      Edit
                                    </Button>

                                    {showCancel ? (
                                      <Button
                                        size="sm"
                                        color="danger"
                                        outline
                                        onClick={() => openCancel(row)}
                                        disabled={!canMutate || readOnly || pricingSaving}
                                      >
                                        Cancel
                                      </Button>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            );
                          })
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

      <Modal isOpen={createOpen} toggle={() => setCreateOpen(false)} centered size="lg">
        <ModalHeader toggle={() => setCreateOpen(false)}>
          Create Quotation
        </ModalHeader>

        <Form onSubmit={handleCreate}>
          <ModalBody>
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
                  >
                    <option value="">Select travel agent</option>
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
                  <Label className="form-label">Nationality</Label>
                  <Input
                    type="select"
                    name="NATIONALITY"
                    value={form.NATIONALITY}
                    onChange={handleChange}
                    invalid={!!(touched.NATIONALITY && errors.NATIONALITY)}
                  >
                    <option value="">Select nationality</option>
                    {nationalityOptions.map(item => (
                      <option
                        key={getListItemValue(item)}
                        value={getListItemValue(item)}
                      >
                        {getListItemLabel(item)}
                      </option>
                    ))}
                  </Input>
                  <FormFeedback>{errors.NATIONALITY}</FormFeedback>
                </div>
              </Col>
            </Row>

            <Row>
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
                    <option value="">Select quotation type</option>
                    {quotationTypeOptions.map(item => (
                      <option
                        key={getListItemValue(item)}
                        value={getListItemValue(item)}
                      >
                        {getListItemLabel(item)}
                      </option>
                    ))}
                  </Input>
                  <FormFeedback>{errors.QUOTATION_TYPE}</FormFeedback>
                </div>
              </Col>

              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Start Date</Label>
                  <Input
                    type="date"
                    name="QUOTATION_START_DATE"
                    value={form.QUOTATION_START_DATE}
                    onChange={handleChange}
                    invalid={!!(touched.QUOTATION_START_DATE && errors.QUOTATION_START_DATE)}
                  />
                  <FormFeedback>{errors.QUOTATION_START_DATE}</FormFeedback>
                </div>
              </Col>
            </Row>

            <Row>
              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">End Date</Label>
                  <Input
                    type="date"
                    name="QUOTATION_END_DATE"
                    value={form.QUOTATION_END_DATE}
                    onChange={handleChange}
                    invalid={!!(touched.QUOTATION_END_DATE && errors.QUOTATION_END_DATE)}
                  />
                  <FormFeedback>{errors.QUOTATION_END_DATE}</FormFeedback>
                </div>
              </Col>

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
                    invalid={!!(touched.QUOTATION_DURATION_DAYS && errors.QUOTATION_DURATION_DAYS)}
                  />
                  <FormFeedback>{errors.QUOTATION_DURATION_DAYS}</FormFeedback>
                </div>
              </Col>
            </Row>

            <Row>
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
                    invalid={!!(touched.NUMBER_OF_PAX && errors.NUMBER_OF_PAX)}
                  />
                  <FormFeedback>{errors.NUMBER_OF_PAX}</FormFeedback>
                </div>
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button color="light" type="button" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={loading}>
              Create
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={editOpen} toggle={() => setEditOpen(false)} centered size="lg">
        <ModalHeader toggle={() => setEditOpen(false)}>
          Edit Quotation
        </ModalHeader>

        <Form onSubmit={handleEdit}>
          <ModalBody>
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
                  >
                    <option value="">Select travel agent</option>
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
                  <Label className="form-label">Nationality</Label>
                  <Input
                    type="select"
                    name="NATIONALITY"
                    value={form.NATIONALITY}
                    onChange={handleChange}
                    invalid={!!(touched.NATIONALITY && errors.NATIONALITY)}
                  >
                    <option value="">Select nationality</option>
                    {nationalityOptions.map(item => (
                      <option
                        key={getListItemValue(item)}
                        value={getListItemValue(item)}
                      >
                        {getListItemLabel(item)}
                      </option>
                    ))}
                  </Input>
                  <FormFeedback>{errors.NATIONALITY}</FormFeedback>
                </div>
              </Col>
            </Row>

            <Row>
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
                    <option value="">Select quotation type</option>
                    {quotationTypeOptions.map(item => (
                      <option
                        key={getListItemValue(item)}
                        value={getListItemValue(item)}
                      >
                        {getListItemLabel(item)}
                      </option>
                    ))}
                  </Input>
                  <FormFeedback>{errors.QUOTATION_TYPE}</FormFeedback>
                </div>
              </Col>

              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">Start Date</Label>
                  <Input
                    type="date"
                    name="QUOTATION_START_DATE"
                    value={form.QUOTATION_START_DATE}
                    onChange={handleChange}
                    invalid={!!(touched.QUOTATION_START_DATE && errors.QUOTATION_START_DATE)}
                  />
                  <FormFeedback>{errors.QUOTATION_START_DATE}</FormFeedback>
                </div>
              </Col>
            </Row>

            <Row>
              <Col md="6">
                <div className="mb-3">
                  <Label className="form-label">End Date</Label>
                  <Input
                    type="date"
                    name="QUOTATION_END_DATE"
                    value={form.QUOTATION_END_DATE}
                    onChange={handleChange}
                    invalid={!!(touched.QUOTATION_END_DATE && errors.QUOTATION_END_DATE)}
                  />
                  <FormFeedback>{errors.QUOTATION_END_DATE}</FormFeedback>
                </div>
              </Col>

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
                    invalid={!!(touched.QUOTATION_DURATION_DAYS && errors.QUOTATION_DURATION_DAYS)}
                  />
                  <FormFeedback>{errors.QUOTATION_DURATION_DAYS}</FormFeedback>
                </div>
              </Col>
            </Row>

            <Row>
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
                    invalid={!!(touched.NUMBER_OF_PAX && errors.NUMBER_OF_PAX)}
                  />
                  <FormFeedback>{errors.NUMBER_OF_PAX}</FormFeedback>
                </div>
              </Col>
            </Row>
          </ModalBody>

          <ModalFooter>
            <Button color="light" type="button" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button color="primary" type="submit" disabled={loading}>
              Save
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      <Modal isOpen={cancelOpen} toggle={() => setCancelOpen(false)} centered>
        <ModalHeader toggle={() => setCancelOpen(false)}>
          Cancel Quotation
        </ModalHeader>
        <ModalBody>
          Are you sure you want to cancel quotation{" "}
          <strong>{cancelling?.REFERANCE_NUMBER || "-"}</strong>?
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setCancelOpen(false)}>
            Close
          </Button>
          <Button color="danger" onClick={handleConfirmCancel} disabled={pricingSaving}>
            Confirm Cancel
          </Button>
        </ModalFooter>
      </Modal>

      <Modal
        isOpen={!!rejectReasonView}
        toggle={() => setRejectReasonView(null)}
        centered
      >
        <ModalHeader toggle={() => setRejectReasonView(null)}>
          Reject Reason
        </ModalHeader>
        <ModalBody>
          <div className="mb-2 text-muted small">Reference Number</div>
          <div className="fw-semibold mb-3">
            {rejectReasonView?.referenceNumber || "-"}
          </div>
          <div className="mb-2 text-muted small">Reason</div>
          <div className="border rounded p-3 bg-light text-break">
            {rejectReasonView?.reason || "-"}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setRejectReasonView(null)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default QuotationsList;
