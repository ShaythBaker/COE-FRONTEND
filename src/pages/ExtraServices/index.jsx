// path: src/pages/ExtraServices/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Form,
  FormFeedback,
  Input,
  InputGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
  Badge,
  Label,
} from "reactstrap";

import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import {
  fetchExtraServices,
  createExtraService,
  updateExtraService,
  deleteExtraService,
} from "../../store/ExtraServices/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyForm = {
  SERVICE_NAME: "",
  SERVICE_DESCRIPTION: "",
  SERVICE_COST_PP: "",
};

const ExtraServicesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const roles = useSelector((state) => state.Login?.roles || []);
  const { loading, items, error } = useSelector(
    (state) => state.ExtraServices || {}
  );

  const canManage = useMemo(
    () => hasAnyRole(roles, ALLOWED_ROLES),
    [roles]
  );

  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!canManage) {
      notifyError(
        "Permission mismatch. Only COMPANY_ADMIN and CONTRACTING can access Extra Services."
      );
      navigate("/dashboard");
      return;
    }
  }, [canManage, navigate]);

  useEffect(() => {
    if (canManage) {
      dispatch(fetchExtraServices(appliedSearch ? { q: appliedSearch } : {}));
    }
  }, [dispatch, canManage, appliedSearch]);

  const toggleModal = () => {
    setIsModalOpen((prev) => !prev);
    if (isModalOpen) {
      setEditingItem(null);
      setForm(emptyForm);
      setFormErrors({});
    }
  };

  const openCreateModal = () => {
    if (!canManage) {
      notifyError("Permission mismatch. You are not allowed to create Extra Services.");
      return;
    }
    setEditingItem(null);
    setForm(emptyForm);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEditModal = (item) => {
    if (!canManage) {
      notifyError("Permission mismatch. You are not allowed to update Extra Services.");
      return;
    }
    setEditingItem(item);
    setForm({
      SERVICE_NAME: item?.SERVICE_NAME || "",
      SERVICE_DESCRIPTION: item?.SERVICE_DESCRIPTION || "",
      SERVICE_COST_PP:
        item?.SERVICE_COST_PP === 0 || item?.SERVICE_COST_PP
          ? String(item.SERVICE_COST_PP)
          : "",
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openDeleteModal = (item) => {
    if (!canManage) {
      notifyError("Permission mismatch. You are not allowed to delete Extra Services.");
      return;
    }

    if (!item?._id) {
      notifyError("Extra Service id is missing.");
      return;
    }

    setDeleting(item);
    setDeleteOpen(true);
  };

  const validateForm = () => {
    const errors = {};

    if (!String(form.SERVICE_NAME || "").trim()) {
      errors.SERVICE_NAME = "Service name is required.";
    }

    if (!String(form.SERVICE_DESCRIPTION || "").trim()) {
      errors.SERVICE_DESCRIPTION = "Service description is required.";
    }

    const cost = Number(form.SERVICE_COST_PP);
    if (form.SERVICE_COST_PP === "" || Number.isNaN(cost)) {
      errors.SERVICE_COST_PP = "Service cost per person is required.";
    } else if (cost < 0) {
      errors.SERVICE_COST_PP = "Service cost per person must be 0 or more.";
    }

    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      notifyError("Validation failed. Please review the highlighted fields.");
      return false;
    }

    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!canManage) {
      notifyError("Permission mismatch. You are not allowed to save Extra Services.");
      return;
    }

    if (!validateForm()) return;

    const payload = {
      SERVICE_NAME: String(form.SERVICE_NAME).trim(),
      SERVICE_DESCRIPTION: String(form.SERVICE_DESCRIPTION).trim(),
      SERVICE_COST_PP: Number(form.SERVICE_COST_PP),
    };

    if (editingItem?._id) {
      dispatch(
        updateExtraService(editingItem._id, payload, () => {
          setIsModalOpen(false);
          setEditingItem(null);
          setForm(emptyForm);
          setFormErrors({});
        })
      );
      return;
    }

    dispatch(
      createExtraService(payload, () => {
        setIsModalOpen(false);
        setEditingItem(null);
        setForm(emptyForm);
        setFormErrors({});
      })
    );
  };

  const handleDelete = () => {
    if (!deleting?._id) {
      notifyError("Extra Service id is missing.");
      return;
    }

    dispatch(
      deleteExtraService(deleting._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
      })
    );
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setAppliedSearch(String(search || "").trim());
  };

  const handleResetSearch = () => {
    setSearch("");
    setAppliedSearch("");
  };

  const formatDate = (value) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
  };

  const formatCost = (value) => {
    const num = Number(value);
    if (Number.isNaN(num)) return "-";
    return num.toLocaleString(undefined, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        <Row className="mb-3 align-items-center">
          <Col sm="6">
            <div className="page-title-box">
              <h4 className="mb-0">Extra Services</h4>
              <ol className="breadcrumb m-0">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                <li className="breadcrumb-item active">Extra Services</li>
              </ol>
            </div>
          </Col>

          <Col sm="6">
            <div className="d-flex justify-content-sm-end gap-2 flex-wrap">
              <Button color="primary" onClick={openCreateModal} disabled={!canManage}>
                <i className="bx bx-plus me-1" />
                Add Extra Service
              </Button>
            </div>
          </Col>
        </Row>

        <Card>
          <CardHeader>
            <Row className="align-items-center g-3">
              <Col lg="8">
                <Form onSubmit={handleSearchSubmit}>
                  <InputGroup>
                    <Input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search by service name or description"
                    />
                    <Button color="primary" type="submit">
                      <i className="bx bx-search" />
                    </Button>
                    <Button color="light" type="button" onClick={handleResetSearch}>
                      Reset
                    </Button>
                  </InputGroup>
                </Form>
              </Col>

              <Col lg="4">
                <div className="text-lg-end text-muted">
                  {appliedSearch ? (
                    <>
                      Filter: <strong>{appliedSearch}</strong>
                    </>
                  ) : (
                    <>Showing all services</>
                  )}
                </div>
              </Col>
            </Row>
          </CardHeader>

          <CardBody>
            {error ? (
              <div className="alert alert-danger mb-3">{error}</div>
            ) : null}

            <div className="table-responsive">
              <Table className="table align-middle table-nowrap mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ minWidth: 220 }}>Service</th>
                    <th>Description</th>
                    <th style={{ width: 160 }}>Cost / Person</th>
                    <th style={{ width: 140 }}>Status</th>
                    <th style={{ width: 220 }}>Created On</th>
                    <th style={{ width: 170 }} className="text-end">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-5">
                        <Spinner size="sm" className="me-2" />
                        Loading extra services...
                      </td>
                    </tr>
                  ) : Array.isArray(items) && items.length > 0 ? (
                    items.map((item) => (
                      <tr key={item?._id}>
                        <td>
                          <h6 className="mb-1">{item?.SERVICE_NAME || "-"}</h6>
                          <small className="text-muted">{item?._id || ""}</small>
                        </td>
                        <td>{item?.SERVICE_DESCRIPTION || "-"}</td>
                        <td>{formatCost(item?.SERVICE_COST_PP)}</td>
                        <td>
                          {item?.ACTIVE_STATUS ? (
                            <Badge color="success" className="font-size-11">
                              Active
                            </Badge>
                          ) : (
                            <Badge color="secondary" className="font-size-11">
                              Inactive
                            </Badge>
                          )}
                        </td>
                        <td>{formatDate(item?.CREATED_ON)}</td>
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-2">
                            <Button
                              color="soft-primary"
                              className="btn btn-sm btn-light"
                              onClick={() => openEditModal(item)}
                              disabled={!canManage}
                            >
                              <i className="bx bx-edit-alt me-1" />
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              outline
                              onClick={() => openDeleteModal(item)}
                              disabled={!canManage}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-5 text-muted">
                        No extra services found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </CardBody>
        </Card>

        <Modal isOpen={isModalOpen} toggle={toggleModal} centered>
          <Form onSubmit={handleSubmit}>
            <ModalHeader toggle={toggleModal}>
              {editingItem ? "Edit Extra Service" : "Create Extra Service"}
            </ModalHeader>

            <ModalBody>
              <div className="mb-3">
                <Label className="form-label">Service Name</Label>
                <Input
                  value={form.SERVICE_NAME}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      SERVICE_NAME: e.target.value,
                    }))
                  }
                  invalid={!!formErrors.SERVICE_NAME}
                  placeholder="Enter service name"
                />
                {formErrors.SERVICE_NAME ? (
                  <FormFeedback>{formErrors.SERVICE_NAME}</FormFeedback>
                ) : null}
              </div>

              <div className="mb-3">
                <Label className="form-label">Service Description</Label>
                <Input
                  type="textarea"
                  rows="4"
                  value={form.SERVICE_DESCRIPTION}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      SERVICE_DESCRIPTION: e.target.value,
                    }))
                  }
                  invalid={!!formErrors.SERVICE_DESCRIPTION}
                  placeholder="Enter service description"
                />
                {formErrors.SERVICE_DESCRIPTION ? (
                  <FormFeedback>{formErrors.SERVICE_DESCRIPTION}</FormFeedback>
                ) : null}
              </div>

              <div className="mb-0">
                <Label className="form-label">Service Cost Per Person</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.SERVICE_COST_PP}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      SERVICE_COST_PP: e.target.value,
                    }))
                  }
                  invalid={!!formErrors.SERVICE_COST_PP}
                  placeholder="Enter service cost"
                />
                {formErrors.SERVICE_COST_PP ? (
                  <FormFeedback>{formErrors.SERVICE_COST_PP}</FormFeedback>
                ) : null}
              </div>
            </ModalBody>

            <ModalFooter>
              <Button color="light" type="button" onClick={toggleModal}>
                Cancel
              </Button>
              <Button color="primary" type="submit" disabled={loading || !canManage}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="me-2" />
                    Saving...
                  </>
                ) : editingItem ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </ModalFooter>
          </Form>
        </Modal>

        <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen(false)} centered>
          <ModalHeader
            toggle={() => {
              setDeleteOpen(false);
              setDeleting(null);
            }}
          >
            Confirm Delete
          </ModalHeader>
          <ModalBody>
            Are you sure you want to delete extra service{" "}
            <b>{deleting?.SERVICE_NAME || "-"}</b>?
            <div className="text-muted mt-2">
              This will soft delete the extra service on the Server.
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
            <Button color="danger" type="button" onClick={handleDelete} disabled={loading}>
              Delete
            </Button>
          </ModalFooter>
        </Modal>
      </div>
    </div>
  );
};

export default ExtraServicesPage;