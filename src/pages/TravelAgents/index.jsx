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
  ATTACHMENT_TYPES,
  getAttachmentDownloadUrl,
  uploadAttachmentAndGetId,
} from "../../helpers/attachments_helper";
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
  AGENT_LOGO_ATTACHMENT_ID: "",
};

const isEmail = (v) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const AgentLogo = ({ attachmentId, name }) => {
  const [url, setUrl] = useState("");

  useEffect(() => {
    let mounted = true;

    if (!attachmentId) {
      setUrl("");
      return () => {
        mounted = false;
      };
    }

    getAttachmentDownloadUrl(attachmentId)
      .then((downloadUrl) => {
        if (mounted) setUrl(downloadUrl || "");
      })
      .catch(() => {
        if (mounted) setUrl("");
      });

    return () => {
      mounted = false;
    };
  }, [attachmentId]);

  if (!url) {
    return (
      <div
        className="rounded bg-light border d-flex align-items-center justify-content-center"
        style={{ width: 42, height: 42 }}
        title={name || "Travel agent"}
      >
        <i className="bx bx-image text-muted" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`${name || "Travel agent"} logo`}
      className="rounded border bg-white"
      style={{ width: 42, height: 42, objectFit: "contain", padding: 4 }}
    />
  );
};

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
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [savingWithLogo, setSavingWithLogo] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    dispatch(fetchTravelAgentsLookups());
    dispatch(fetchTravelAgents({ q: searchName || undefined }));
  }, [dispatch, searchName]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

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

  const resetLogoFile = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview("");
  };

  const onLogoChange = (file) => {
    resetLogoFile();
    if (!file) return;

    if (!String(file.type || "").startsWith("image/")) {
      notifyError("Please choose an image file for the logo.");
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const buildPayloadWithLogo = async () => {
    if (!logoFile) return { ...form };

    const attachmentId = await uploadAttachmentAndGetId({
      file: logoFile,
      ATTACHMENT_TYPE: ATTACHMENT_TYPES.TRAVEL_AGENT_LOGO,
      META: { AGENT_NAME: form.AGENT_NAME },
    });

    return {
      ...form,
      AGENT_LOGO_ATTACHMENT_ID: attachmentId,
    };
  };

  const openCreate = () => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setEditing(null);
    setForm({ ...emptyAgent });
    resetLogoFile();
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
      AGENT_LOGO_ATTACHMENT_ID: row?.AGENT_LOGO_ATTACHMENT_ID || "",
    });
    resetLogoFile();
    setEditOpen(true);
  };

  const openDelete = (row) => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setDeleting(row);
    setDeleteOpen(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setTouched({
      AGENT_NAME: true,
      AGENT_EMAIL: true,
      AGENT_COUNTRY: true,
      AGENT_PHONE: true,
    });

    if (Object.keys(errors).length) return notifyError("Validation fail");

    setSavingWithLogo(true);
    try {
      const payload = await buildPayloadWithLogo();
      dispatch(
        createTravelAgent(payload, () => {
          setCreateOpen(false);
          setForm({ ...emptyAgent });
          resetLogoFile();
          dispatch(fetchTravelAgents({ q: searchName || undefined }));
        }),
      );
    } catch (error) {
      notifyError(error?.message || "Failed to upload travel agent logo.");
    } finally {
      setSavingWithLogo(false);
    }
  };

  const submitEdit = async (e) => {
    e.preventDefault();
    setTouched({
      AGENT_NAME: true,
      AGENT_EMAIL: true,
      AGENT_COUNTRY: true,
      AGENT_PHONE: true,
    });

    if (Object.keys(errors).length) return notifyError("Validation fail");

    setSavingWithLogo(true);
    try {
      const payload = await buildPayloadWithLogo();
      dispatch(
        updateTravelAgent(editing?._id, payload, () => {
          setEditOpen(false);
          setEditing(null);
          setForm({ ...emptyAgent });
          resetLogoFile();
          dispatch(fetchTravelAgents({ q: searchName || undefined }));
        }),
      );
    } catch (error) {
      notifyError(error?.message || "Failed to upload travel agent logo.");
    } finally {
      setSavingWithLogo(false);
    }
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

      <Col md={12} className="mb-3">
        <Label>Agent Logo</Label>
        <div className="d-flex align-items-center gap-3">
          {logoPreview ? (
            <img
              src={logoPreview}
              alt="Selected travel agent logo"
              className="rounded border bg-white"
              style={{ width: 72, height: 72, objectFit: "contain", padding: 6 }}
            />
          ) : (
            <AgentLogo
              attachmentId={form.AGENT_LOGO_ATTACHMENT_ID}
              name={form.AGENT_NAME}
            />
          )}
          <div className="flex-grow-1">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => onLogoChange(e.target.files?.[0])}
            />
            <div className="text-muted small mt-1">
              Upload a square or horizontal logo image.
            </div>
          </div>
        </div>
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
                        <th style={{ width: 72 }}>Logo</th>
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
                          <td>
                            <AgentLogo
                              attachmentId={x.AGENT_LOGO_ATTACHMENT_ID}
                              name={x.AGENT_NAME}
                            />
                          </td>
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
                <Button color="primary" type="submit" disabled={loading || savingWithLogo}>
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
                <Button color="primary" type="submit" disabled={loading || savingWithLogo}>
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
