// path: src/pages/Settings/TransportationSizes/index.jsx
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
  fetchTransportationSizes,
  createTransportationSize,
  updateTransportationSize,
  deleteTransportationSize,
} from "../../../store/TransportationSizes/actions";

import { hasAnyRole } from "../../../helpers/coe_roles";
import { notifyError } from "../../../helpers/notify";

const emptyForm = {
  TRANSPORTATION_TYPE: "",
  MINIMUM_CAPACITY: "",
  MAXIMUM_CAPACITY: "",
  ACTIVE_STATUS: true,
};

const TransportationSizes = () => {
  const dispatch = useDispatch();
  const roles = useSelector((state) => state.Login?.roles || []);
  const { items, loading, error } = useSelector(
    (state) => state.TransportationSizes || {
      items: [],
      loading: false,
      error: "",
    }
  );

  const canManageTransportationSizes = hasAnyRole(roles, [
    "COMPANY_ADMIN",
    "CONTRACTING",
  ]);

  const [includeInactive, setIncludeInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formValues, setFormValues] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    dispatch(
      fetchTransportationSizes({
        includeInactive,
      })
    );
  }, [dispatch, includeInactive]);

  const modalTitle = useMemo(
    () => (editingItem ? "Edit Transportation Size" : "Add Transportation Size"),
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
    if (!canManageTransportationSizes) {
      notifyError("You do not have permission to manage transportation sizes.");
      return;
    }
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    if (!canManageTransportationSizes) {
      notifyError("You do not have permission to manage transportation sizes.");
      return;
    }

    setEditingItem(item);
    setFormValues({
      TRANSPORTATION_TYPE: item?.TRANSPORTATION_TYPE || "",
      MINIMUM_CAPACITY:
        item?.MINIMUM_CAPACITY === null || item?.MINIMUM_CAPACITY === undefined
          ? ""
          : String(item.MINIMUM_CAPACITY),
      MAXIMUM_CAPACITY:
        item?.MAXIMUM_CAPACITY === null || item?.MAXIMUM_CAPACITY === undefined
          ? ""
          : String(item.MAXIMUM_CAPACITY),
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

    if (!formValues.TRANSPORTATION_TYPE?.trim()) {
      nextErrors.TRANSPORTATION_TYPE = "Transportation type is required.";
    }

    if (
      formValues.MINIMUM_CAPACITY === "" ||
      formValues.MINIMUM_CAPACITY === null
    ) {
      nextErrors.MINIMUM_CAPACITY = "Minimum capacity is required.";
    }

    if (
      formValues.MAXIMUM_CAPACITY === "" ||
      formValues.MAXIMUM_CAPACITY === null
    ) {
      nextErrors.MAXIMUM_CAPACITY = "Maximum capacity is required.";
    }

    const minValue = Number(formValues.MINIMUM_CAPACITY);
    const maxValue = Number(formValues.MAXIMUM_CAPACITY);

    if (
      formValues.MINIMUM_CAPACITY !== "" &&
      (Number.isNaN(minValue) || minValue < 1)
    ) {
      nextErrors.MINIMUM_CAPACITY = "Minimum capacity must be 1 or greater.";
    }

    if (
      formValues.MAXIMUM_CAPACITY !== "" &&
      (Number.isNaN(maxValue) || maxValue < 1)
    ) {
      nextErrors.MAXIMUM_CAPACITY = "Maximum capacity must be 1 or greater.";
    }

    if (
      formValues.MINIMUM_CAPACITY !== "" &&
      formValues.MAXIMUM_CAPACITY !== "" &&
      !Number.isNaN(minValue) &&
      !Number.isNaN(maxValue) &&
      minValue > maxValue
    ) {
      nextErrors.MAXIMUM_CAPACITY =
        "Maximum capacity must be greater than or equal to minimum capacity.";
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

    if (!canManageTransportationSizes) {
      notifyError("You do not have permission to manage transportation sizes.");
      return;
    }

    if (!validateForm()) return;

    const payload = editingItem
      ? {
          MINIMUM_CAPACITY: Number(formValues.MINIMUM_CAPACITY),
          MAXIMUM_CAPACITY: Number(formValues.MAXIMUM_CAPACITY),
          ACTIVE_STATUS: !!formValues.ACTIVE_STATUS,
        }
      : {
          TRANSPORTATION_TYPE: formValues.TRANSPORTATION_TYPE.trim().toUpperCase(),
          MINIMUM_CAPACITY: Number(formValues.MINIMUM_CAPACITY),
          MAXIMUM_CAPACITY: Number(formValues.MAXIMUM_CAPACITY),
        };

    if (editingItem?._id) {
      dispatch(
        updateTransportationSize(editingItem._id, payload, () => {
          toggleModal();
          resetForm();
        })
      );
    } else {
      dispatch(
        createTransportationSize(payload, () => {
          toggleModal();
          resetForm();
        })
      );
    }
  };

  const handleDelete = (item) => {
    if (!canManageTransportationSizes) {
      notifyError("You do not have permission to manage transportation sizes.");
      return;
    }

    const confirmed = window.confirm(
      `Delete transportation size "${item?.TRANSPORTATION_TYPE || ""}"?`
    );

    if (!confirmed) return;

    dispatch(deleteTransportationSize(item._id));
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Row>
          <Col xs="12">
            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between">
                <div>
                  <h4 className="card-title mb-1">Transportation Sizes</h4>
                  <p className="text-muted mb-0">
                    Manage transportation type, minimum capacity, and maximum capacity.
                  </p>
                </div>

                <div className="d-flex align-items-center gap-3">
                  <div className="form-check form-switch mb-0">
                    <Input
                      id="includeInactive"
                      type="switch"
                      checked={includeInactive}
                      onChange={(e) => setIncludeInactive(e.target.checked)}
                    />
                    <Label
                      className="form-check-label ms-2"
                      for="includeInactive"
                    >
                      Include inactive
                    </Label>
                  </div>

                  <Button
                    color="primary"
                    onClick={openCreateModal}
                    disabled={!canManageTransportationSizes}
                  >
                    Add Transportation Size
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
                        <th>Transportation Type</th>
                        <th>Minimum Capacity</th>
                        <th>Maximum Capacity</th>
                        <th>Status</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            <Spinner size="sm" className="me-2" />
                            Loading transportation sizes...
                          </td>
                        </tr>
                      ) : items?.length > 0 ? (
                        items.map((item, index) => (
                          <tr key={item?._id || index}>
                            <td>{index + 1}</td>
                            <td>{item?.TRANSPORTATION_TYPE || "-"}</td>
                            <td>{item?.MINIMUM_CAPACITY ?? "-"}</td>
                            <td>{item?.MAXIMUM_CAPACITY ?? "-"}</td>
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
                                  disabled={!canManageTransportationSizes}
                                >
                                  Edit
                                </Button>
                                <Button
                                  color="danger"
                                  size="sm"
                                  onClick={() => handleDelete(item)}
                                  disabled={!canManageTransportationSizes}
                                >
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="text-center py-4">
                            No transportation sizes found.
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
                <Label htmlFor="TRANSPORTATION_TYPE" className="form-label">
                  Transportation Type
                </Label>
                <Input
                  id="TRANSPORTATION_TYPE"
                  name="TRANSPORTATION_TYPE"
                  type="text"
                  value={formValues.TRANSPORTATION_TYPE}
                  onChange={handleInputChange}
                  invalid={!!formErrors.TRANSPORTATION_TYPE}
                  disabled={!!editingItem}
                  placeholder="Example: CAR"
                />
                {formErrors.TRANSPORTATION_TYPE ? (
                  <FormFeedback>{formErrors.TRANSPORTATION_TYPE}</FormFeedback>
                ) : null}
              </div>

              <div className="mb-3">
                <Label htmlFor="MINIMUM_CAPACITY" className="form-label">
                  Minimum Capacity
                </Label>
                <Input
                  id="MINIMUM_CAPACITY"
                  name="MINIMUM_CAPACITY"
                  type="number"
                  min="1"
                  value={formValues.MINIMUM_CAPACITY}
                  onChange={handleInputChange}
                  invalid={!!formErrors.MINIMUM_CAPACITY}
                  placeholder="Example: 1"
                />
                {formErrors.MINIMUM_CAPACITY ? (
                  <FormFeedback>{formErrors.MINIMUM_CAPACITY}</FormFeedback>
                ) : null}
              </div>

              <div className="mb-3">
                <Label htmlFor="MAXIMUM_CAPACITY" className="form-label">
                  Maximum Capacity
                </Label>
                <Input
                  id="MAXIMUM_CAPACITY"
                  name="MAXIMUM_CAPACITY"
                  type="number"
                  min="1"
                  value={formValues.MAXIMUM_CAPACITY}
                  onChange={handleInputChange}
                  invalid={!!formErrors.MAXIMUM_CAPACITY}
                  placeholder="Example: 3"
                />
                {formErrors.MAXIMUM_CAPACITY ? (
                  <FormFeedback>{formErrors.MAXIMUM_CAPACITY}</FormFeedback>
                ) : null}
              </div>

              {editingItem ? (
                <div className="mb-0">
                  <Label className="form-label d-block">Active Status</Label>
                  <div className="form-check form-switch form-switch-md">
                    <Input
                      id="ACTIVE_STATUS"
                      name="ACTIVE_STATUS"
                      type="switch"
                      checked={!!formValues.ACTIVE_STATUS}
                      onChange={handleInputChange}
                    />
                    <Label className="form-check-label ms-2" for="ACTIVE_STATUS">
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

export default TransportationSizes;