// path: src/pages/TravelAgents/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Card,
  CardBody,
  Col,
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
import { Link } from "react-router-dom";

import RoleProtected from "../../components/Common/RoleProtected";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import {
  fetchTravelAgents,
  fetchTravelAgentsLookups,
  createTravelAgent,
  updateTravelAgent,
  deleteTravelAgent,
} from "../../store/TravelAgents/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyAgent = {
  AGENT_NAME: "",
  AGENT_EMAIL: "",
  AGENT_COUNTRY: "",
  AGENT_PHONE: "",
};

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const TravelAgents = () => {
  const dispatch = useDispatch();
  const { items, loading, lookups, lookupsLoading } = useSelector(
    (s) => s.TravelAgents,
  );
  const roles = useSelector((s) => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [searchName, setSearchName] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({ ...emptyAgent });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    dispatch(fetchTravelAgentsLookups());
    dispatch(fetchTravelAgents({ q: searchName || undefined }));
  }, [dispatch, searchName]);

  const countryMap = useMemo(() => {
    const map = new Map();
    (lookups?.COUNTRIES || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.COUNTRIES]);

  const validate = (data) => {
    const errors = {};
    if (!String(data.AGENT_NAME || "").trim()) errors.AGENT_NAME = "Required";
    if (!String(data.AGENT_EMAIL || "").trim()) errors.AGENT_EMAIL = "Required";
    else if (!isEmail(data.AGENT_EMAIL)) errors.AGENT_EMAIL = "Invalid email";
    if (!String(data.AGENT_COUNTRY || "").trim())
      errors.AGENT_COUNTRY = "Required";
    if (!String(data.AGENT_PHONE || "").trim()) errors.AGENT_PHONE = "Required";
    return errors;
  };

  const errors = useMemo(() => validate(form), [form]);

  const onChange = (name, value) =>
    setForm((prev) => ({ ...prev, [name]: value }));

  const openCreate = () => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setEditing(null);
    setForm({ ...emptyAgent });
    setCreateOpen(true);
  };

  const openEdit = (row) => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setEditing(row);
    setForm({
      AGENT_NAME: row?.AGENT_NAME || "",
      AGENT_EMAIL: row?.AGENT_EMAIL || "",
      AGENT_COUNTRY: row?.AGENT_COUNTRY || "",
      AGENT_PHONE: row?.AGENT_PHONE || "",
    });
    setEditOpen(true);
  };

  const openDelete = (row) => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setDeleting(row);
    setDeleteOpen(true);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setTouched({
      AGENT_NAME: true,
      AGENT_EMAIL: true,
      AGENT_COUNTRY: true,
      AGENT_PHONE: true,
    });

    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      createTravelAgent(form, () => {
        setCreateOpen(false);
        setForm({ ...emptyAgent });
        dispatch(fetchTravelAgents({ q: searchName || undefined }));
      }),
    );
  };

  const submitEdit = (e) => {
    e.preventDefault();
    setTouched({
      AGENT_NAME: true,
      AGENT_EMAIL: true,
      AGENT_COUNTRY: true,
      AGENT_PHONE: true,
    });

    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      updateTravelAgent(editing?._id, form, () => {
        setEditOpen(false);
        setEditing(null);
        setForm({ ...emptyAgent });
        dispatch(fetchTravelAgents({ q: searchName || undefined }));
      }),
    );
  };

  const confirmDelete = () => {
    dispatch(
      deleteTravelAgent(deleting?._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
        dispatch(fetchTravelAgents({ q: searchName || undefined }));
      }),
    );
  };

  const renderFields = () => (
    <Row>
      <Col md={6} className="mb-3">
        <Label>Agent Name *</Label>
        <Input
          value={form.AGENT_NAME}
          onChange={(e) => onChange("AGENT_NAME", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, AGENT_NAME: true }))}
          invalid={!!(touched.AGENT_NAME && errors.AGENT_NAME)}
        />
        <FormFeedback>{errors.AGENT_NAME}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Agent Email *</Label>
        <Input
          type="email"
          value={form.AGENT_EMAIL}
          onChange={(e) => onChange("AGENT_EMAIL", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, AGENT_EMAIL: true }))}
          invalid={!!(touched.AGENT_EMAIL && errors.AGENT_EMAIL)}
        />
        <FormFeedback>{errors.AGENT_EMAIL}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Country *</Label>
        <Input
          type="select"
          value={form.AGENT_COUNTRY}
          onChange={(e) => onChange("AGENT_COUNTRY", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, AGENT_COUNTRY: true }))}
          invalid={!!(touched.AGENT_COUNTRY && errors.AGENT_COUNTRY)}
          disabled={lookupsLoading}
        >
          <option value="">Select...</option>
          {(lookups?.COUNTRIES || []).map((x) => (
            <option key={x._id} value={x._id}>
              {x.ITEM_VALUE}
            </option>
          ))}
        </Input>
        <FormFeedback>{errors.AGENT_COUNTRY}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Agent Phone *</Label>
        <Input
          value={form.AGENT_PHONE}
          onChange={(e) => onChange("AGENT_PHONE", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, AGENT_PHONE: true }))}
          invalid={!!(touched.AGENT_PHONE && errors.AGENT_PHONE)}
        />
        <FormFeedback>{errors.AGENT_PHONE}</FormFeedback>
      </Col>
    </Row>
  );

  return (
    <RoleProtected allowedRoles={["COMPANY_ADMIN", "CONTRACTING", "USER"]}>
      <div className="page-content">
        <div className="container-fluid">
          <Row className="mb-3">
            <Col md={6}>
              <h4 className="mb-0">Travel Agents</h4>
            </Col>
            <Col md={6} className="text-end">
              <Button
                color="primary"
                onClick={openCreate}
                disabled={!canMutate}
              >
                <i className="bx bx-plus me-1" />
                Create
              </Button>
            </Col>
          </Row>

          <Card>
            <CardBody>
              <Row className="mb-3">
                <Col md={6}>
                  <Label className="form-label">Search (name)</Label>
                  <Input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Type agent name..."
                  />
                </Col>
                <Col
                  md={6}
                  className="text-end d-flex align-items-end justify-content-end"
                >
                  <Button
                    color="secondary"
                    outline
                    onClick={() =>
                      dispatch(
                        fetchTravelAgents({ q: searchName || undefined }),
                      )
                    }
                    disabled={loading}
                  >
                    <i className="bx bx-refresh me-1" />
                    Refresh
                  </Button>
                </Col>
              </Row>

              {loading ? (
                <div className="text-center py-5">
                  <Spinner />
                </div>
              ) : (items || []).length === 0 ? (
                <div className="text-center py-5 text-muted">
                  No travel agents found.
                </div>
              ) : (
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Agent Name</th>
                        <th>Email</th>
                        <th>Country</th>
                        <th>Phone</th>
                        <th>Status</th>
                        <th style={{ width: 210 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(items || []).map((x) => (
                        <tr key={x._id}>
                          <td>{x.AGENT_NAME || "-"}</td>
                          <td>{x.AGENT_EMAIL || "-"}</td>
                          <td>{countryMap.get(x.AGENT_COUNTRY) || "-"}</td>
                          <td>{x.AGENT_PHONE || "-"}</td>
                          <td>{x.ACTIVE_STATUS ? "Active" : "Inactive"}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button
                                color="info"
                                size="sm"
                                tag={Link}
                                to={`/travel-agents/${x._id}`}
                              >
                                View
                              </Button>
                              <Button
                                color="warning"
                                size="sm"
                                onClick={() => openEdit(x)}
                                disabled={!canMutate}
                              >
                                Edit
                              </Button>
                              <Button
                                color="danger"
                                size="sm"
                                onClick={() => openDelete(x)}
                                disabled={!canMutate}
                              >
                                Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>

          <Modal
            isOpen={createOpen}
            toggle={() => setCreateOpen((v) => !v)}
            size="lg"
          >
            <ModalHeader toggle={() => setCreateOpen(false)}>
              Create Travel Agent
            </ModalHeader>
            <Form onSubmit={submitCreate}>
              <ModalBody>{renderFields()}</ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={loading}>
                  Save
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal
            isOpen={editOpen}
            toggle={() => setEditOpen((v) => !v)}
            size="lg"
          >
            <ModalHeader toggle={() => setEditOpen(false)}>
              Edit Travel Agent
            </ModalHeader>
            <Form onSubmit={submitEdit}>
              <ModalBody>{renderFields()}</ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={loading}>
                  Update
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen((v) => !v)}>
            <ModalHeader toggle={() => setDeleteOpen(false)}>
              Confirm Delete
            </ModalHeader>
            <ModalBody>
              Are you sure you want to delete <b>{deleting?.AGENT_NAME}</b>?
            </ModalBody>
            <ModalFooter>
              <Button
                color="secondary"
                type="button"
                onClick={() => setDeleteOpen(false)}
              >
                Cancel
              </Button>
              <Button color="danger" onClick={confirmDelete} disabled={loading}>
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </div>
    </RoleProtected>
  );
};

export default TravelAgents;
