// path: src/pages/TransportationCompanies/Details.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import Breadcrumbs from "../../components/Common/Breadcrumb";
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
import {
  deleteTransportationCompany,
  deleteTransportationRate,
  fetchTransportationCompany,
  fetchTransportationLookups,
  updateTransportationCompany,
  upsertTransportationRates,
} from "../../store/TransportationCompanies/actions";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";

const companyInitial = {
  COMPANY_NAME: "",
  COMPANY_PHONE: "",
  COMPANY_EMAIL: "",
};

const rateInitial = {
  TRANSPORTATION_TYPE_ID: "",
  TRANSPORTATION_SIZE_ID: "",
  RATE: "",
};

const unwrapId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
  }
  return "";
};

const getRateRows = (company) => {
  if (Array.isArray(company?.TRANSPORTATION_RATES)) return company.TRANSPORTATION_RATES;
  if (Array.isArray(company?.RATES)) return company.RATES;
  if (Array.isArray(company?.rates)) return company.rates;
  return [];
};

const getRateRowId = (row) => unwrapId(row?._id);

const getRateTypeId = (row) =>
  unwrapId(row?.TRANSPORTATION_TYPE_ID) ||
  unwrapId(row?.TRANSPORTATION_TYPE_ID?._id) ||
  unwrapId(row?.type?._id) ||
  unwrapId(row?.typeId);

const getRateSizeId = (row) =>
  unwrapId(row?.TRANSPORTATION_SIZE_ID) ||
  unwrapId(row?.TRANSPORTATION_SIZE_ID?._id) ||
  unwrapId(row?.size?._id) ||
  unwrapId(row?.sizeId);

const getRateValue = (row) => row?.RATE ?? row?.rate ?? "";

const buildSizeLabel = (item) => {
  if (!item) return "-";

  const vehicleType =
    item?.TRANSPORTATION_TYPE ||
    item?.NAME ||
    item?.LABEL ||
    item?.name ||
    item?.label ||
    "";

  const min = item?.MINIMUM_CAPACITY;
  const max = item?.MAXIMUM_CAPACITY;

  if (vehicleType && min != null && max != null) {
    return `${vehicleType} (${min}-${max} pax)`;
  }

  if (vehicleType && min != null) {
    return `${vehicleType} (${min}+ pax)`;
  }

  return vehicleType || "-";
};

const getTypeLookupLabel = (item) =>
  item?.TRANSPORTATION_TYPE_NAME || item?.NAME || item?.LABEL || item?.name || item?.label || "-";

const getSizeLookupLabel = (item) => buildSizeLabel(item);

const Details = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { selected, loading, ratesLoading, lookups } = useSelector(
    (state) => state.TransportationCompanies || {}
  );
  const roles = useSelector((state) => state.Login?.roles || []);
  const canManageTransportation = hasAnyRole(roles, ["COMPANY_ADMIN", "CONTRACTING"]);

  const [companyForm, setCompanyForm] = useState(companyInitial);
  const [companyErrors, setCompanyErrors] = useState({});
  const [rateForm, setRateForm] = useState(rateInitial);
  const [rateErrors, setRateErrors] = useState({});
  const [editingRateId, setEditingRateId] = useState("");

  const [deleteCompanyOpen, setDeleteCompanyOpen] = useState(false);
  const [deleteRateOpen, setDeleteRateOpen] = useState(false);
  const [deletingRate, setDeletingRate] = useState(null);

  const rates = useMemo(() => getRateRows(selected), [selected]);

  const typeMap = useMemo(() => {
    const map = new Map();
    (lookups?.transportationTypes || []).forEach((item) => {
      map.set(unwrapId(item?._id), getTypeLookupLabel(item));
    });
    return map;
  }, [lookups]);

  const sizeMap = useMemo(() => {
    const map = new Map();
    (lookups?.transportationSizes || []).forEach((item) => {
      map.set(unwrapId(item?._id), getSizeLookupLabel(item));
    });
    return map;
  }, [lookups]);

  useEffect(() => {
    if (id) {
      dispatch(fetchTransportationCompany(id));
      dispatch(fetchTransportationLookups());
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (selected) {
      setCompanyForm({
        COMPANY_NAME: selected?.COMPANY_NAME || "",
        COMPANY_PHONE: selected?.COMPANY_PHONE || "",
        COMPANY_EMAIL: selected?.COMPANY_EMAIL || "",
      });
    }
  }, [selected]);

  const resetRateForm = () => {
    setRateForm(rateInitial);
    setRateErrors({});
    setEditingRateId("");
  };

  const onCompanyChange = (e) => {
    const { name, value } = e.target;
    setCompanyForm((prev) => ({ ...prev, [name]: value }));
    setCompanyErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const onRateChange = (e) => {
    const { name, value } = e.target;
    setRateForm((prev) => ({ ...prev, [name]: value }));
    setRateErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validateCompany = () => {
    const next = {};

    if (!companyForm.COMPANY_NAME.trim()) {
      next.COMPANY_NAME = "Company name is required.";
    }

    if (!companyForm.COMPANY_PHONE.trim()) {
      next.COMPANY_PHONE = "Company phone is required.";
    }

    if (!companyForm.COMPANY_EMAIL.trim()) {
      next.COMPANY_EMAIL = "Company email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(companyForm.COMPANY_EMAIL)) {
      next.COMPANY_EMAIL = "Please enter a valid email address.";
    }

    setCompanyErrors(next);

    if (Object.keys(next).length) {
      notifyError("Please fix the company form errors.");
      return false;
    }

    return true;
  };

  const validateRate = () => {
    const next = {};

    if (!rateForm.TRANSPORTATION_TYPE_ID) {
      next.TRANSPORTATION_TYPE_ID = "Transportation type is required.";
    }

    if (!rateForm.TRANSPORTATION_SIZE_ID) {
      next.TRANSPORTATION_SIZE_ID = "Transportation size is required.";
    }

    if (rateForm.RATE === "" || Number(rateForm.RATE) < 0) {
      next.RATE = "Rate is required and must be 0 or greater.";
    }

    const duplicate = rates.find((row) => {
      const sameType = getRateTypeId(row) === rateForm.TRANSPORTATION_TYPE_ID;
      const sameSize = getRateSizeId(row) === rateForm.TRANSPORTATION_SIZE_ID;
      const sameLine = getRateRowId(row) === editingRateId;
      return sameType && sameSize && !sameLine;
    });

    if (duplicate) {
      next.TRANSPORTATION_TYPE_ID = "This type + size combination already exists.";
      next.TRANSPORTATION_SIZE_ID = "This type + size combination already exists.";
    }

    setRateErrors(next);

    if (Object.keys(next).length) {
      notifyError("Please fix the rate form errors.");
      return false;
    }

    return true;
  };

  const submitCompany = (e) => {
    e.preventDefault();

    if (!canManageTransportation) {
      notifyError("You do not have permission to update transportation companies.");
      return;
    }

    if (!validateCompany()) return;

    dispatch(
      updateTransportationCompany(
        id,
        {
          COMPANY_NAME: companyForm.COMPANY_NAME.trim(),
          COMPANY_PHONE: companyForm.COMPANY_PHONE.trim(),
          COMPANY_EMAIL: companyForm.COMPANY_EMAIL.trim(),
        },
        () => {
          dispatch(fetchTransportationCompany(id));
        }
      )
    );
  };

  const submitRate = (e) => {
    e.preventDefault();

    if (!canManageTransportation) {
      notifyError("You do not have permission to update transportation rates.");
      return;
    }

    if (!validateRate()) return;

    dispatch(
      upsertTransportationRates(
        id,
        {
          RATES: [
            {
              TRANSPORTATION_SIZE_ID: rateForm.TRANSPORTATION_SIZE_ID,
              TRANSPORTATION_TYPE_ID: rateForm.TRANSPORTATION_TYPE_ID,
              RATE: Number(rateForm.RATE),
            },
          ],
        },
        () => {
          dispatch(fetchTransportationCompany(id));
          resetRateForm();
        }
      )
    );
  };

  const onEditRate = (row) => {
    setEditingRateId(getRateRowId(row));
    setRateForm({
      TRANSPORTATION_TYPE_ID: getRateTypeId(row),
      TRANSPORTATION_SIZE_ID: getRateSizeId(row),
      RATE: String(getRateValue(row)),
    });
    setRateErrors({});
  };

  const openDeleteRate = (row) => {
    if (!canManageTransportation) {
      notifyError("You do not have permission to delete transportation rates.");
      return;
    }

    if (!getRateRowId(row)) {
      notifyError("Rate id is missing.");
      return;
    }

    setDeletingRate(row);
    setDeleteRateOpen(true);
  };

  const confirmDeleteRate = () => {
    const rateId = getRateRowId(deletingRate);
    if (!rateId) {
      notifyError("Rate id is missing.");
      return;
    }

    dispatch(
      deleteTransportationRate(id, rateId, () => {
        setDeleteRateOpen(false);
        setDeletingRate(null);
        dispatch(fetchTransportationCompany(id));
        if (editingRateId === rateId) {
          resetRateForm();
        }
      })
    );
  };

  const openDeleteCompany = () => {
    if (!canManageTransportation) {
      notifyError("You do not have permission to delete transportation companies.");
      return;
    }

    setDeleteCompanyOpen(true);
  };

  const confirmDeleteCompany = () => {
    dispatch(
      deleteTransportationCompany(id, () => {
        setDeleteCompanyOpen(false);
        navigate("/transportation-companies");
      })
    );
  };

  document.title = "Transportation Company Details | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Transportation" breadcrumbItem="Transportation Company Details" />

          <Row>
            <Col xl="5">
              <Card>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h4 className="card-title mb-0">Company Info</h4>
                    <Button
                      color="danger"
                      outline
                      onClick={openDeleteCompany}
                      disabled={!canManageTransportation}
                    >
                      Delete Company
                    </Button>
                  </div>

                  {loading && !selected ? (
                    <div className="text-center py-4">
                      <Spinner size="sm" className="me-2" />
                      Loading...
                    </div>
                  ) : (
                    <Form onSubmit={submitCompany}>
                      <div className="mb-3">
                        <Label className="form-label">Company Name</Label>
                        <Input
                          name="COMPANY_NAME"
                          value={companyForm.COMPANY_NAME}
                          onChange={onCompanyChange}
                          invalid={!!companyErrors.COMPANY_NAME}
                          disabled={!canManageTransportation}
                          required
                        />
                        <FormFeedback>{companyErrors.COMPANY_NAME}</FormFeedback>
                      </div>

                      <div className="mb-3">
                        <Label className="form-label">Phone</Label>
                        <Input
                          name="COMPANY_PHONE"
                          value={companyForm.COMPANY_PHONE}
                          onChange={onCompanyChange}
                          invalid={!!companyErrors.COMPANY_PHONE}
                          disabled={!canManageTransportation}
                          required
                        />
                        <FormFeedback>{companyErrors.COMPANY_PHONE}</FormFeedback>
                      </div>

                      <div className="mb-3">
                        <Label className="form-label">Email</Label>
                        <Input
                          name="COMPANY_EMAIL"
                          value={companyForm.COMPANY_EMAIL}
                          onChange={onCompanyChange}
                          invalid={!!companyErrors.COMPANY_EMAIL}
                          disabled={!canManageTransportation}
                          required
                        />
                        <FormFeedback>{companyErrors.COMPANY_EMAIL}</FormFeedback>
                      </div>

                      <Button color="primary" type="submit" disabled={!canManageTransportation}>
                        Save Company
                      </Button>
                    </Form>
                  )}
                </CardBody>
              </Card>
            </Col>

            <Col xl="7">
              <Card>
                <CardBody>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <h4 className="card-title mb-1">Rates</h4>
                      <p className="card-title-desc mb-0">
                        Add or update one rate using transportation type + size.
                      </p>
                    </div>
                    {ratesLoading ? (
                      <div className="text-muted">
                        <Spinner size="sm" className="me-2" />
                        Saving...
                      </div>
                    ) : null}
                  </div>

                  <Form onSubmit={submitRate}>
                    <Row>
                      <Col md="4">
                        <div className="mb-3">
                          <Label className="form-label">Type</Label>
                          <Input
                            type="select"
                            name="TRANSPORTATION_TYPE_ID"
                            value={rateForm.TRANSPORTATION_TYPE_ID}
                            onChange={onRateChange}
                            invalid={!!rateErrors.TRANSPORTATION_TYPE_ID}
                            disabled={!canManageTransportation}
                            required
                          >
                            <option value="">Select Type</option>
                            {(lookups?.transportationTypes || []).map((item) => (
                              <option key={unwrapId(item?._id)} value={unwrapId(item?._id)}>
                                {getTypeLookupLabel(item)}
                              </option>
                            ))}
                          </Input>
                          <FormFeedback>{rateErrors.TRANSPORTATION_TYPE_ID}</FormFeedback>
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="mb-3">
                          <Label className="form-label">Size</Label>
                          <Input
                            type="select"
                            name="TRANSPORTATION_SIZE_ID"
                            value={rateForm.TRANSPORTATION_SIZE_ID}
                            onChange={onRateChange}
                            invalid={!!rateErrors.TRANSPORTATION_SIZE_ID}
                            disabled={!canManageTransportation}
                            required
                          >
                            <option value="">Select Size</option>
                            {(lookups?.transportationSizes || []).map((item) => (
                              <option key={unwrapId(item?._id)} value={unwrapId(item?._id)}>
                                {getSizeLookupLabel(item)}
                              </option>
                            ))}
                          </Input>
                          <FormFeedback>{rateErrors.TRANSPORTATION_SIZE_ID}</FormFeedback>
                        </div>
                      </Col>

                      <Col md="4">
                        <div className="mb-3">
                          <Label className="form-label">Rate</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            name="RATE"
                            value={rateForm.RATE}
                            onChange={onRateChange}
                            invalid={!!rateErrors.RATE}
                            disabled={!canManageTransportation}
                            required
                          />
                          <FormFeedback>{rateErrors.RATE}</FormFeedback>
                        </div>
                      </Col>
                    </Row>

                    <div className="d-flex gap-2 mb-4">
                      <Button color="primary" type="submit" disabled={!canManageTransportation}>
                        {editingRateId ? "Update Rate" : "Add Rate"}
                      </Button>
                      {editingRateId ? (
                        <Button type="button" color="light" onClick={resetRateForm}>
                          Cancel Edit
                        </Button>
                      ) : null}
                    </div>
                  </Form>

                  <div className="table-responsive">
                    <Table className="table align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Type</th>
                          <th>Size</th>
                          <th>Rate</th>
                          <th style={{ width: "160px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rates.length === 0 ? (
                          <tr>
                            <td colSpan="4" className="text-center text-muted py-4">
                              No rates added yet.
                            </td>
                          </tr>
                        ) : (
                          rates.map((row, index) => {
                            const rowId = getRateRowId(row);
                            const typeId = getRateTypeId(row);
                            const sizeId = getRateSizeId(row);

                            return (
                              <tr key={rowId || `${typeId}-${sizeId}-${index}`}>
                                <td>{typeMap.get(typeId) || "-"}</td>
                                <td>{sizeMap.get(sizeId) || "-"}</td>
                                <td>{getRateValue(row)}</td>
                                <td>
                                  <div className="d-flex gap-2">
                                    <Button
                                      size="sm"
                                      color="primary"
                                      outline
                                      onClick={() => onEditRate(row)}
                                      disabled={!canManageTransportation}
                                    >
                                      Edit
                                    </Button>
                                    <Button
                                      size="sm"
                                      color="danger"
                                      outline
                                      onClick={() => openDeleteRate(row)}
                                      disabled={!canManageTransportation}
                                    >
                                      Delete
                                    </Button>
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

      <Modal isOpen={deleteCompanyOpen} toggle={() => setDeleteCompanyOpen((v) => !v)}>
        <ModalHeader toggle={() => setDeleteCompanyOpen(false)}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete <b>{companyForm.COMPANY_NAME || "-"}</b>?
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDeleteCompanyOpen(false)} type="button">
            Cancel
          </Button>
          <Button color="danger" onClick={confirmDeleteCompany} disabled={loading}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      <Modal isOpen={deleteRateOpen} toggle={() => setDeleteRateOpen((v) => !v)}>
        <ModalHeader toggle={() => setDeleteRateOpen(false)}>Confirm Delete</ModalHeader>
        <ModalBody>
          Are you sure you want to delete this rate
          <b>
            {" "}
            {deletingRate ? `${typeMap.get(getRateTypeId(deletingRate)) || "-"} / ${sizeMap.get(getRateSizeId(deletingRate)) || "-"}` : ""}
          </b>
          ?
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={() => setDeleteRateOpen(false)} type="button">
            Cancel
          </Button>
          <Button color="danger" onClick={confirmDeleteRate} disabled={ratesLoading}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default Details;