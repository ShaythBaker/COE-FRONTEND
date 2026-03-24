// path: src/pages/Settings/CompanyUsers/index.jsx

import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Table,
  Badge,
  Form,
  FormFeedback,
  Spinner,
} from "reactstrap";

import {
  fetchUsers,
  createUser,
  updateUser,
  deleteUser,
  fetchUser,
} from "../../../store/companyUsers/actions";
import { notifyError, notifyInfo } from "../../../helpers/notify";

const REQUIRED_ROLE = "COMPANY_ADMIN";

const SYSTEM_ROLES = [
  "COMPANY_ADMIN",
  "ACCOUNTING",
  "OPERATION",
  "TOUR_OPERATION",
  "CONTRACTING",
  "QUALITY",
  "USER",
];

const columns = [
  { key: "FIRST_NAME", label: "First Name" },
  { key: "LAST_NAME", label: "Last Name" },
  { key: "EMAIL", label: "Email" },
  { key: "ROLES", label: "Roles" },
  { key: "ACTIVE_STATUS", label: "Status" },
  { key: "CREATED_ON", label: "Created On" },
];

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const formatDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

const ensureArray = (v) => (Array.isArray(v) ? v : []);

const CompanyUsers = () => {
  const dispatch = useDispatch();

  const { items, selected, loading } = useSelector((s) => s.CompanyUsers || {});
  const authRoles = useSelector((s) => s.Login?.roles || []);

  const allowed = authRoles.includes(REQUIRED_ROLE);

  const [q, setQ] = useState("");

  // modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [activeRow, setActiveRow] = useState(null);

  // forms
  const [createForm, setCreateForm] = useState({
    FIRST_NAME: "",
    LAST_NAME: "",
    EMAIL: "",
    PASSWORD: "",
    CONFIRM_PASSWORD: "",
    ROLES: ["USER"],
    PROFILE_IMG_ATTACHMENT_ID: "",
  });

  const [editForm, setEditForm] = useState({
    FIRST_NAME: "",
    LAST_NAME: "",
    EMAIL: "",
    ACTIVE_STATUS: true,
    ROLES: ["USER"],
    PROFILE_IMG_ATTACHMENT_ID: "",
  });

  const [touched, setTouched] = useState({});

  useEffect(() => {
    if (!allowed) {
      notifyError("Permission/role mismatch");
      return;
    }
    dispatch(fetchUsers());
  }, [allowed, dispatch]);

  const filtered = useMemo(() => {
    const query = String(q || "")
      .trim()
      .toLowerCase();
    if (!query) return items || [];
    return (items || []).filter((u) => {
      const name = `${u?.FIRST_NAME || ""} ${u?.LAST_NAME || ""}`.toLowerCase();
      const email = String(u?.EMAIL || "").toLowerCase();
      return name.includes(query) || email.includes(query);
    });
  }, [items, q]);

  const resetTouched = () => setTouched({});

  const openCreate = () => {
    resetTouched();
    setCreateForm({
      FIRST_NAME: "",
      LAST_NAME: "",
      EMAIL: "",
      PASSWORD: "",
      CONFIRM_PASSWORD: "",
      ROLES: ["USER"], // default
      PROFILE_IMG_ATTACHMENT_ID: "",
    });
    setCreateOpen(true);
  };

  const openEdit = (row) => {
    resetTouched();
    setActiveRow(row);
    setEditForm({
      FIRST_NAME: row?.FIRST_NAME || "",
      LAST_NAME: row?.LAST_NAME || "",
      EMAIL: row?.EMAIL || "",
      ACTIVE_STATUS: row?.ACTIVE_STATUS ?? true,
      ROLES: ensureArray(row?.ROLES).length
        ? ensureArray(row?.ROLES)
        : ["USER"],
      PROFILE_IMG_ATTACHMENT_ID: row?.PROFILE_IMG_ATTACHMENT_ID || "",
    });
    setEditOpen(true);
  };

  const openDetails = (row) => {
    setActiveRow(row);
    if (row?._id) dispatch(fetchUser(row._id));
    setDetailsOpen(true);
  };

  const openDelete = (row) => {
    setActiveRow(row);
    setDeleteOpen(true);
  };

  const toggleRole = (currentRoles, role) => {
    const rolesArr = ensureArray(currentRoles);
    if (rolesArr.includes(role)) {
      const next = rolesArr.filter((r) => r !== role);
      return next.length ? next : []; // allow empty in UI, but validation will prevent submit
    }
    return [...rolesArr, role];
  };

  const validateCreate = () => {
    const errs = {};
    const fn = String(createForm.FIRST_NAME || "").trim();
    const ln = String(createForm.LAST_NAME || "").trim();
    const em = String(createForm.EMAIL || "").trim();
    const pw = String(createForm.PASSWORD || "");
    const cpw = String(createForm.CONFIRM_PASSWORD || "");
    const roles = ensureArray(createForm.ROLES);

    if (!fn) errs.FIRST_NAME = "First name is required";
    else if (fn.length < 2) errs.FIRST_NAME = "Minimum 2 characters";

    if (!ln) errs.LAST_NAME = "Last name is required";
    else if (ln.length < 2) errs.LAST_NAME = "Minimum 2 characters";

    if (!em) errs.EMAIL = "Email is required";
    else if (!isEmail(em)) errs.EMAIL = "Invalid email";

    if (!pw) errs.PASSWORD = "Password is required";
    else if (pw.length < 6) errs.PASSWORD = "Minimum 6 characters";

    if (!cpw) errs.CONFIRM_PASSWORD = "Please retype password";
    else if (cpw !== pw) errs.CONFIRM_PASSWORD = "Passwords do not match";

    if (!roles.length) errs.ROLES = "At least one role is required";

    return errs;
  };

  const validateEdit = () => {
    const errs = {};
    const fn = String(editForm.FIRST_NAME || "").trim();
    const ln = String(editForm.LAST_NAME || "").trim();
    const roles = ensureArray(editForm.ROLES);

    if (!fn) errs.FIRST_NAME = "First name is required";
    else if (fn.length < 2) errs.FIRST_NAME = "Minimum 2 characters";

    if (!ln) errs.LAST_NAME = "Last name is required";
    else if (ln.length < 2) errs.LAST_NAME = "Minimum 2 characters";

    if (!roles.length) errs.ROLES = "At least one role is required";

    return errs;
  };

  const createErrors = useMemo(() => validateCreate(), [createForm]);
  const editErrors = useMemo(() => validateEdit(), [editForm]);

  const markAllTouched = (fields) => {
    const t = {};
    fields.forEach((f) => (t[f] = true));
    setTouched(t);
  };

  const onSubmitCreate = (e) => {
    e.preventDefault();
    const errs = validateCreate();
    const hasErr = Object.keys(errs).length > 0;

    markAllTouched([
      "FIRST_NAME",
      "LAST_NAME",
      "EMAIL",
      "PASSWORD",
      "CONFIRM_PASSWORD",
      "ROLES",
    ]);

    if (hasErr) {
      notifyError("Validation fail");
      return;
    }

    dispatch(
      createUser({
        EMAIL: String(createForm.EMAIL).trim(),
        FIRST_NAME: String(createForm.FIRST_NAME).trim(),
        LAST_NAME: String(createForm.LAST_NAME).trim(),
        PASSWORD: String(createForm.PASSWORD),
        ROLES: ensureArray(createForm.ROLES),
        PROFILE_IMG_ATTACHMENT_ID: createForm.PROFILE_IMG_ATTACHMENT_ID
          ? String(createForm.PROFILE_IMG_ATTACHMENT_ID).trim()
          : null,
      }),
    );

    setCreateOpen(false);
    notifyInfo("Request submitted");
  };

  const onSubmitEdit = (e) => {
    e.preventDefault();
    if (!activeRow?._id) return;

    const errs = validateEdit();
    const hasErr = Object.keys(errs).length > 0;

    markAllTouched(["FIRST_NAME", "LAST_NAME", "ROLES"]);

    if (hasErr) {
      notifyError("Validation fail");
      return;
    }

    // PATCH contract: send only fields you want to change.
    // We’ll send the editable set; (EMAIL is NOT updatable per spec).
    dispatch(
      updateUser(activeRow._id, {
        FIRST_NAME: String(editForm.FIRST_NAME).trim(),
        LAST_NAME: String(editForm.LAST_NAME).trim(),
        ROLES: ensureArray(editForm.ROLES),
        PROFILE_IMG_ATTACHMENT_ID: editForm.PROFILE_IMG_ATTACHMENT_ID
          ? String(editForm.PROFILE_IMG_ATTACHMENT_ID).trim()
          : null,
        ACTIVE_STATUS: !!editForm.ACTIVE_STATUS,
      }),
    );

    setEditOpen(false);
    notifyInfo("Request submitted");
  };

  const onConfirmDelete = () => {
    if (!activeRow?._id) return;
    dispatch(deleteUser(activeRow._id));
    setDeleteOpen(false);
  };

  if (!allowed) {
    return (
      <Container fluid className="page-content">
        <Row>
          <Col>
            <Card>
              <CardBody>
                <h5 className="mb-2">Company Users</h5>
                <p className="text-muted mb-0">
                  You don’t have permission to view this page.
                </p>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <Row className="align-items-center">
          <Col>
            <div className="page-title-box">
              <h4 className="mb-0">Company Users</h4>
            </div>
          </Col>
          <Col className="text-end">
            <Button color="primary" onClick={openCreate}>
              <i className="bx bx-plus me-1" />
              New User
            </Button>
          </Col>
        </Row>

        <Row>
          <Col lg={12}>
            <Card>
              <CardBody>
                <Row className="mb-3 align-items-center">
                  <Col md={6}>
                    <Label className="form-label mb-1">Search</Label>
                    <Input
                      value={q}
                      onChange={(e) => setQ(e.target.value)}
                      placeholder="Search by name or email"
                    />
                  </Col>
                  <Col md={6} className="text-end">
                    {loading ? (
                      <span className="text-muted">
                        <Spinner size="sm" className="me-2" />
                        Loading...
                      </span>
                    ) : (
                      <span className="text-muted">
                        {filtered.length} users
                      </span>
                    )}
                  </Col>
                </Row>

                {filtered.length === 0 && !loading ? (
                  <div className="text-center py-5">
                    <i className="bx bx-user-circle display-4 text-muted" />
                    <h5 className="mt-3">No users found</h5>
                    <p className="text-muted mb-3">
                      No users found. Click 'New User' to create one.
                    </p>
                    <Button color="primary" onClick={openCreate}>
                      <i className="bx bx-plus me-1" />
                      New User
                    </Button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <Table className="table align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          {columns.map((c) => (
                            <th key={c.key}>{c.label}</th>
                          ))}
                          <th className="text-end">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(filtered || []).map((u) => (
                          <tr key={u?._id}>
                            <td>{u?.FIRST_NAME || "-"}</td>
                            <td>{u?.LAST_NAME || "-"}</td>
                            <td>{u?.EMAIL || "-"}</td>
                            <td>
                              {(u?.ROLES || []).length ? (
                                (u.ROLES || []).map((r) => (
                                  // FIX #1: ensure readable text on table
                                  <Badge
                                    key={r}
                                    color="light"
                                    className="text-dark border me-1"
                                  >
                                    {r}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-muted">-</span>
                              )}
                            </td>
                            <td>
                              {u?.ACTIVE_STATUS ? (
                                <Badge
                                  className="text-success"
                                  color="soft-success"
                                >
                                  Active
                                </Badge>
                              ) : (
                                <Badge
                                  className="text-danger"
                                  color="soft-danger"
                                >
                                  Inactive
                                </Badge>
                              )}
                            </td>
                            <td>{formatDate(u?.CREATED_ON)}</td>
                            <td className="text-end">
                              <Button
                                color="link"
                                className="text-primary p-0 me-3"
                                onClick={() => openDetails(u)}
                              >
                                View
                              </Button>
                              <Button
                                color="link"
                                className="text-success p-0 me-3"
                                onClick={() => openEdit(u)}
                              >
                                Edit
                              </Button>
                              <Button
                                color="link"
                                className="text-danger p-0"
                                onClick={() => openDelete(u)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </Table>
                  </div>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        toggle={() => setCreateOpen(!createOpen)}
        centered
      >
        <ModalHeader toggle={() => setCreateOpen(!createOpen)}>
          Create User
        </ModalHeader>
        <Form onSubmit={onSubmitCreate}>
          <ModalBody>
            <Row>
              <Col md={6} className="mb-3">
                <Label className="form-label">First Name *</Label>
                <Input
                  value={createForm.FIRST_NAME}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, FIRST_NAME: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, FIRST_NAME: true }))}
                  invalid={!!touched.FIRST_NAME && !!createErrors.FIRST_NAME}
                />
                <FormFeedback>{createErrors.FIRST_NAME}</FormFeedback>
              </Col>

              <Col md={6} className="mb-3">
                <Label className="form-label">Last Name *</Label>
                <Input
                  value={createForm.LAST_NAME}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, LAST_NAME: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, LAST_NAME: true }))}
                  invalid={!!touched.LAST_NAME && !!createErrors.LAST_NAME}
                />
                <FormFeedback>{createErrors.LAST_NAME}</FormFeedback>
              </Col>

              <Col md={12} className="mb-3">
                <Label className="form-label">Email *</Label>
                <Input
                  type="email"
                  value={createForm.EMAIL}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, EMAIL: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, EMAIL: true }))}
                  invalid={!!touched.EMAIL && !!createErrors.EMAIL}
                />
                <FormFeedback>{createErrors.EMAIL}</FormFeedback>
              </Col>

              <Col md={6} className="mb-3">
                <Label className="form-label">Password *</Label>
                <Input
                  type="password"
                  value={createForm.PASSWORD}
                  onChange={(e) =>
                    setCreateForm((p) => ({ ...p, PASSWORD: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, PASSWORD: true }))}
                  invalid={!!touched.PASSWORD && !!createErrors.PASSWORD}
                />
                <FormFeedback>{createErrors.PASSWORD}</FormFeedback>
              </Col>

              {/* FIX #2: Confirm password */}
              <Col md={6} className="mb-3">
                <Label className="form-label">Retype Password *</Label>
                <Input
                  type="password"
                  value={createForm.CONFIRM_PASSWORD}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      CONFIRM_PASSWORD: e.target.value,
                    }))
                  }
                  onBlur={() =>
                    setTouched((t) => ({ ...t, CONFIRM_PASSWORD: true }))
                  }
                  invalid={
                    !!touched.CONFIRM_PASSWORD &&
                    !!createErrors.CONFIRM_PASSWORD
                  }
                />
                <FormFeedback>{createErrors.CONFIRM_PASSWORD}</FormFeedback>
              </Col>

              {/* FIX #3: Roles required */}
              <Col md={12} className="mb-3">
                <Label className="form-label">Roles *</Label>
                <div
                  className={`p-2 border rounded ${touched.ROLES && createErrors.ROLES ? "border-danger" : ""}`}
                >
                  <Row>
                    {SYSTEM_ROLES.map((role) => (
                      <Col md={6} key={role} className="mb-1">
                        <div className="form-check">
                          <Input
                            type="checkbox"
                            className="form-check-input"
                            id={`create-role-${role}`}
                            checked={ensureArray(createForm.ROLES).includes(
                              role,
                            )}
                            onChange={() =>
                              setCreateForm((p) => ({
                                ...p,
                                ROLES: toggleRole(p.ROLES, role),
                              }))
                            }
                            onBlur={() =>
                              setTouched((t) => ({ ...t, ROLES: true }))
                            }
                          />
                          <Label
                            className="form-check-label"
                            htmlFor={`create-role-${role}`}
                          >
                            {role}
                          </Label>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
                {touched.ROLES && createErrors.ROLES ? (
                  <div className="text-danger mt-1">{createErrors.ROLES}</div>
                ) : null}
                <div className="text-muted mt-1">Default role is USER.</div>
              </Col>

              <Col md={12} className="mb-0">
                <Label className="form-label">
                  Profile Image Attachment ID (optional)
                </Label>
                <Input
                  value={createForm.PROFILE_IMG_ATTACHMENT_ID}
                  onChange={(e) =>
                    setCreateForm((p) => ({
                      ...p,
                      PROFILE_IMG_ATTACHMENT_ID: e.target.value,
                    }))
                  }
                  placeholder="e.g. 69b2d9c0f1a23abc123"
                />
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button
              color="light"
              type="button"
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button color="primary" type="submit">
              Create
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={editOpen} toggle={() => setEditOpen(!editOpen)} centered>
        <ModalHeader toggle={() => setEditOpen(!editOpen)}>
          Edit User
        </ModalHeader>
        <Form onSubmit={onSubmitEdit}>
          <ModalBody>
            <Row>
              <Col md={6} className="mb-3">
                <Label className="form-label">First Name *</Label>
                <Input
                  value={editForm.FIRST_NAME}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, FIRST_NAME: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, FIRST_NAME: true }))}
                  invalid={!!touched.FIRST_NAME && !!editErrors.FIRST_NAME}
                />
                <FormFeedback>{editErrors.FIRST_NAME}</FormFeedback>
              </Col>

              <Col md={6} className="mb-3">
                <Label className="form-label">Last Name *</Label>
                <Input
                  value={editForm.LAST_NAME}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, LAST_NAME: e.target.value }))
                  }
                  onBlur={() => setTouched((t) => ({ ...t, LAST_NAME: true }))}
                  invalid={!!touched.LAST_NAME && !!editErrors.LAST_NAME}
                />
                <FormFeedback>{editErrors.LAST_NAME}</FormFeedback>
              </Col>

              {/* EMAIL not updatable per spec; keep read-only */}
              <Col md={12} className="mb-3">
                <Label className="form-label">Email</Label>
                <Input type="email" value={editForm.EMAIL} readOnly />
              </Col>

              <Col md={12} className="mb-3">
                <Label className="form-label">Roles *</Label>
                <div
                  className={`p-2 border rounded ${touched.ROLES && editErrors.ROLES ? "border-danger" : ""}`}
                >
                  <Row>
                    {SYSTEM_ROLES.map((role) => (
                      <Col md={6} key={role} className="mb-1">
                        <div className="form-check">
                          <Input
                            type="checkbox"
                            className="form-check-input"
                            id={`edit-role-${role}`}
                            checked={ensureArray(editForm.ROLES).includes(role)}
                            onChange={() =>
                              setEditForm((p) => ({
                                ...p,
                                ROLES: toggleRole(p.ROLES, role),
                              }))
                            }
                            onBlur={() =>
                              setTouched((t) => ({ ...t, ROLES: true }))
                            }
                          />
                          <Label
                            className="form-check-label"
                            htmlFor={`edit-role-${role}`}
                          >
                            {role}
                          </Label>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
                {touched.ROLES && editErrors.ROLES ? (
                  <div className="text-danger mt-1">{editErrors.ROLES}</div>
                ) : null}
              </Col>

              <Col md={12} className="mb-3">
                <Label className="form-label">
                  Profile Image Attachment ID (optional)
                </Label>
                <Input
                  value={editForm.PROFILE_IMG_ATTACHMENT_ID}
                  onChange={(e) =>
                    setEditForm((p) => ({
                      ...p,
                      PROFILE_IMG_ATTACHMENT_ID: e.target.value,
                    }))
                  }
                  placeholder="e.g. 69b2d9c0f1a23abc123"
                />
              </Col>

              <Col md={12} className="mb-0">
                <div className="form-check form-switch">
                  <Input
                    type="switch"
                    className="form-check-input"
                    checked={!!editForm.ACTIVE_STATUS}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        ACTIVE_STATUS: e.target.checked,
                      }))
                    }
                  />
                  <Label className="form-check-label">Active</Label>
                </div>
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button
              color="light"
              type="button"
              onClick={() => setEditOpen(false)}
            >
              Cancel
            </Button>
            <Button color="primary" type="submit">
              Update
            </Button>
          </ModalFooter>
        </Form>
      </Modal>

      {/* Details Modal */}
      <Modal
        isOpen={detailsOpen}
        toggle={() => setDetailsOpen(!detailsOpen)}
        centered
      >
        <ModalHeader toggle={() => setDetailsOpen(!detailsOpen)}>
          User Details
        </ModalHeader>
        <ModalBody>
          {selected && selected?._id === activeRow?._id ? (
            <div>
              <Row className="mb-2">
                <Col sm={4} className="text-muted">
                  Name
                </Col>
                <Col sm={8}>
                  {`${selected.FIRST_NAME || ""} ${selected.LAST_NAME || ""}`.trim() ||
                    "-"}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col sm={4} className="text-muted">
                  Email
                </Col>
                <Col sm={8}>{selected.EMAIL || "-"}</Col>
              </Row>
              <Row className="mb-2">
                <Col sm={4} className="text-muted">
                  Roles
                </Col>
                <Col sm={8}>
                  {(selected.ROLES || []).length
                    ? (selected.ROLES || []).map((r) => (
                        <Badge
                          key={r}
                          color="light"
                          className="text-dark border me-1"
                        >
                          {r}
                        </Badge>
                      ))
                    : "-"}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col sm={4} className="text-muted">
                  Status
                </Col>
                <Col sm={8}>
                  {selected.ACTIVE_STATUS ? (
                    <Badge className="text-success" color="soft-success">Active</Badge>
                  ) : (
                    <Badge className="text-danger" color="soft-danger">Inactive</Badge>
                  )}
                </Col>
              </Row>
              <Row className="mb-2">
                <Col sm={4} className="text-muted">
                  Created
                </Col>
                <Col sm={8}>{formatDate(selected.CREATED_ON)}</Col>
              </Row>
              <Row className="mb-0">
                <Col sm={4} className="text-muted">
                  Updated
                </Col>
                <Col sm={8}>{formatDate(selected.UPDATED_ON)}</Col>
              </Row>
            </div>
          ) : (
            <div className="text-muted">
              <Spinner size="sm" className="me-2" />
              Loading details...
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setDetailsOpen(false)}>
            Close
          </Button>
        </ModalFooter>
      </Modal>

      {/* Delete Confirm */}
      <Modal
        isOpen={deleteOpen}
        toggle={() => setDeleteOpen(!deleteOpen)}
        centered
      >
        <ModalHeader toggle={() => setDeleteOpen(!deleteOpen)}>
          Confirm Delete
        </ModalHeader>
        <ModalBody>
          Are you sure you want to delete{" "}
          <strong>
            {activeRow
              ? `${activeRow.FIRST_NAME || ""} ${activeRow.LAST_NAME || ""}`.trim()
              : "this user"}
          </strong>
          ?
        </ModalBody>
        <ModalFooter>
          <Button color="light" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button color="danger" onClick={onConfirmDelete}>
            Delete
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default CompanyUsers;
