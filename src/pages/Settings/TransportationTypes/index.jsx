// path: src/pages/Settings/TransportationTypes/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
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
  fetchTransportationTypes,
  createTransportationType,
  updateTransportationType,
  deleteTransportationType,
} from "../../../store/TransportationTypes/actions";

import { hasAnyRole } from "../../../helpers/coe_roles";
import { notifyError } from "../../../helpers/notify";

const emptyForm = {
  TRANSPORTATION_TYPE_NAME: "",
  TRANSPORTATION_TYPE_STATUS: true,
  ACTIVE_STATUS: true,
};

const TransportationTypes = () => {
  const dispatch = useDispatch();
  const roles = useSelector((state) => state.Login?.roles || []);
  const { items, loading, error } = useSelector(
    (state) => state.TransportationTypes || {
      items: [],
      loading: false,
      error: "",
    }
  );

  const canManageTransportationTypes = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);

  const [includeInactive, setIncludeInactive] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    const params = {
      includeInactive,
    };

    if (statusFilter !== "all") {
      params.status = statusFilter === "true";
    }

    dispatch(fetchTransportationTypes(params));
  }, [dispatch, includeInactive, statusFilter]);

  const modalTitle = useMemo(
    () => (editingItem ? "Edit Transportation Type" : "Add Transportation Type"),
    [editingItem]
  );

  const resetForm = () => {
    setEditingItem(null);
    setFormValues(emptyForm);
    setFormErrors({});
  };

  const toggleModal = () => {
    if (!isModalOpen) {
      setFormErrors({});
    }
    setIsModalOpen(!isModalOpen);
  };

  const openCreateModal = () => {
    if (!canManageTransportationTypes) {
      notifyError("You do not have permission to manage transportation types.");
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    if (!canManageTransportationTypes) {
      notifyError("You do not have permission to manage transportation types.");
      return;
    }

    setEditingItem(item);
    setFormValues({
      TRANSPORTATION_TYPE_NAME: item?.TRANSPORTATION_TYPE_NAME || "",
      TRANSPORTATION_TYPE_STATUS:
        typeof item?.TRANSPORTATION_TYPE_STATUS === "boolean"
          ? item.TRANSPORTATION_TYPE_STATUS
          : true,
      ACTIVE_STATUS:
        typeof item?.ACTIVE_STATUS === "boolean" ? item.ACTIVE_STATUS : true,
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFormValues((prev) => ({
      ...prev,
      [name]: type === "checkbox" || type === "switch" ? checked : value,
    }));

    setFormErrors((prev) => ({
      ...prev,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!formValues.TRANSPORTATION_TYPE_NAME?.trim()) {
      nextErrors.TRANSPORTATION_TYPE_NAME =
        "Transportation type name is required.";
    }

    setFormErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      notifyError("Please fix the validation errors before saving.");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!canManageTransportationTypes) {
      notifyError("You do not have permission to manage transportation types.");
      return;
    }

    if (!validateForm()) return;

    const payload = {
      TRANSPORTATION_TYPE_NAME: formValues.TRANSPORTATION_TYPE_NAME
        .trim()
        .toUpperCase(),
      TRANSPORTATION_TYPE_STATUS: !!formValues.TRANSPORTATION_TYPE_STATUS,
    };

    if (editingItem) {
      payload.ACTIVE_STATUS = !!formValues.ACTIVE_STATUS;
    }

    if (editingItem?._id) {
      dispatch(
        updateTransportationType(editingItem._id, payload, () => {
          toggleModal();
          resetForm();
        })
      );
    } else {
      dispatch(
        createTransportationType(payload, () => {
          toggleModal();
          resetForm();
        })
      );
    }
  };

  const handleDelete = (item) => {
    if (!canManageTransportationTypes) {
      notifyError("You do not have permission to manage transportation types.");
      return;
    }

    const confirmed = window.confirm(
      `Delete transportation type "${item?.TRANSPORTATION_TYPE_NAME || ""}"?`
    );

    if (!confirmed) return;

    dispatch(deleteTransportationType(item._id));
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                <div>
                  <h4 className="card-title mb-1">Transportation Types</h4>
                  <p className="text-muted mb-0">
                    Manage transportation type names, enabled status, and active status.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-3 flex-wrap">
                  <div className="form-check form-switch mb-0">
                    <Input
                      id="includeInactiveTransportationTypes"
                      type="switch"
                      checked={includeInactive}
                      onChange={(e) => setIncludeInactive(e.target.checked)}
                    />
                    <Label
                      className="form-check-label ms-2"
                      for="includeInactiveTransportationTypes"
                    >
                      Include inactive
                    </Label>
                  </div>

                  <div>
                    <Input
                      type="select"
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                    >
                      <option value="all">All status</option>
                      <option value="true">Enabled only</option>
                      <option value="false">Disabled only</option>
                    </Input>
                  </div>

                  <Button
                    color="primary"
                    onClick={openCreateModal}
                    disabled={!canManageTransportationTypes}
                  >
                    Add Transportation Type
                  </Button>
                </div>
              </CardHeader>

              <CardBody>
                {!!error && (
                  <div className="alert alert-danger mb-3">{error}</div>
                )}

                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: "80px" }}>#</th>
                        <th>Transportation Type Name</th>
                        <th>Type Status</th>
                        <th>Record Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="5" className="text-center py-4">
                            <Spinner size="sm" className="me-2" />
                            Loading transportation types...
                          </td>
                        </tr>
                      ) : items?.length > 0 ? (
                        items.map((item, index) => (
                          <tr key={item?._id || index}>
                            <td>{index + 1}</td>
                            <td>{item?.TRANSPORTATION_TYPE_NAME || "-"}</td>
                            <td>
                              {item?.TRANSPORTATION_TYPE_STATUS ? (
                                <span className="badge bg-success">Enabled</span>
                              ) : (
                                <span className="badge bg-warning text-dark">
                                  Disabled
                                </span>
                              )}
                            </td>
                            <td>
                              {item?.ACTIVE_STATUS ? (
                                <span className="badge bg-success">Active</span>
                              ) : (
                                <span className="badge bg-secondary">Inactive</span>
                              )}
                            </td>
                            <td className="text-end">
                              <div className="d-flex justify-content-end gap-2">
                                <Button
                                  color="secondary"
                                  size="sm"
                                  onClick={() => openEditModal(item)}
                                  disabled={!canManageTransportationTypes}
                                >
                                  Edit
                                </Button>
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={() => handleDelete(item)}
                                  disabled={!canManageTransportationTypes}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="text-center py-4">
                            No transportation types found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <Modal isOpen={isModalOpen} toggle={toggleModal} centered>
          <ModalHeader toggle={toggleModal}>{modalTitle}</ModalHeader>
          <Form onSubmit={handleSubmit}>
            <ModalBody>
              <div className="mb-3">
                <Label htmlFor="TRANSPORTATION_TYPE_NAME" className="form-label">
                  Transportation Type Name
                </Label>
                <Input
                  id="TRANSPORTATION_TYPE_NAME"
                  name="TRANSPORTATION_TYPE_NAME"
                  type="text"
                  value={formValues.TRANSPORTATION_TYPE_NAME}
                  onChange={handleInputChange}
                  invalid={!!formErrors.TRANSPORTATION_TYPE_NAME}
                  placeholder="Example: CAR"
                />
                {formErrors.TRANSPORTATION_TYPE_NAME ? (
                  <FormFeedback>{formErrors.TRANSPORTATION_TYPE_NAME}</FormFeedback>
                ) : null}
              </div>

              <div className="mb-3">
                <Label className="form-label d-block">
                  Transportation Type Status
                </Label>
                <div className="form-check form-switch form-switch-md">
                  <Input
                    id="TRANSPORTATION_TYPE_STATUS"
                    name="TRANSPORTATION_TYPE_STATUS"
                    type="switch"
                    checked={!!formValues.TRANSPORTATION_TYPE_STATUS}
                    onChange={handleInputChange}
                  />
                  <Label
                    className="form-check-label ms-2"
                    for="TRANSPORTATION_TYPE_STATUS"
                  >
                    {formValues.TRANSPORTATION_TYPE_STATUS ? "Enabled" : "Disabled"}
                  </Label>
                </div>
              </div>

              {editingItem ? (
                <div className="mb-0">
                  <Label className="form-label d-block">Active Status</Label>
                  <div className="form-check form-switch form-switch-md">
                    <Input
                      id="ACTIVE_STATUS_TRANSPORTATION_TYPE"
                      name="ACTIVE_STATUS"
                      type="switch"
                      checked={!!formValues.ACTIVE_STATUS}
                      onChange={handleInputChange}
                    />
                    <Label
                      className="form-check-label ms-2"
                      for="ACTIVE_STATUS_TRANSPORTATION_TYPE"
                    >
                      {formValues.ACTIVE_STATUS ? "Active" : "Inactive"}
                    </Label>
                  </div>
                </div>
              ) : null}
            </ModalBody>

            <ModalFooter>
              <Button color="light" type="button" onClick={toggleModal}>
                Cancel
              </Button>
              <Button color="primary" type="submit">
                {editingItem ? "Update" : "Create"}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>
      </Container>
    </div>
  );
};

export default TransportationTypes;