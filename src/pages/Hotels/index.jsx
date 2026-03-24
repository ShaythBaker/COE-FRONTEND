// path: src/pages/Hotels/index.jsx
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
  Table,
  Spinner,
} from "reactstrap";
import { Link } from "react-router-dom";

import RoleProtected from "../../components/Common/RoleProtected"; // ✅ your guard :contentReference[oaicite:5]{index=5}
import { hasAnyRole } from "../../helpers/coe_roles"; // ✅ your helper :contentReference[oaicite:6]{index=6}
import { notifyError } from "../../helpers/notify";

import {
  fetchHotels,
  fetchHotelsLookups,
  createHotel,
  updateHotel,
  deleteHotel,
} from "../../store/Hotels/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyHotel = {
  HOTEL_NAME: "",
  RESERVATION_EMAIL: "",
  HOTEL_CHAIN: "",
  HOTEL_CITY: "",
  HOTEL_WEBSITE: "",
  HOTEL_PHONE: "",
  HOTEL_STARS: "",
};

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const Hotels = () => {
  const dispatch = useDispatch();
  const { items, loading, lookups, lookupsLoading } = useSelector((s) => s.Hotels);
  const roles = useSelector((s) => s.Login?.roles || []);

  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [searchName, setSearchName] = useState("");

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({ ...emptyHotel });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const [touched, setTouched] = useState({});

  useEffect(() => {
    dispatch(fetchHotelsLookups());
    dispatch(fetchHotels());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cityMap = useMemo(() => {
    const map = new Map();
    (lookups.CITIES || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups.CITIES]);

  const chainMap = useMemo(() => {
    const map = new Map();
    (lookups.HOTELCHAINS || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups.HOTELCHAINS]);

  const filtered = useMemo(() => {
    const q = String(searchName || "").trim().toLowerCase();
    if (!q) return items || [];
    return (items || []).filter((x) => String(x?.HOTEL_NAME || "").toLowerCase().includes(q));
  }, [items, searchName]);

  const validate = (data) => {
    const errors = {};
    if (!String(data.HOTEL_NAME || "").trim()) errors.HOTEL_NAME = "Required";
    if (!String(data.RESERVATION_EMAIL || "").trim()) errors.RESERVATION_EMAIL = "Required";
    else if (!isEmail(data.RESERVATION_EMAIL)) errors.RESERVATION_EMAIL = "Invalid email";

    if (!String(data.HOTEL_CHAIN || "").trim()) errors.HOTEL_CHAIN = "Required";
    if (!String(data.HOTEL_CITY || "").trim()) errors.HOTEL_CITY = "Required";
    if (!String(data.HOTEL_STARS || "").trim()) errors.HOTEL_STARS = "Required";

    return errors;
  };

  const errors = useMemo(() => validate(form), [form]);

  const openCreate = () => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setForm({ ...emptyHotel });
    setCreateOpen(true);
  };

  const openEdit = (row) => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setEditing(row);
    setForm({
      HOTEL_NAME: row?.HOTEL_NAME || "",
      RESERVATION_EMAIL: row?.RESERVATION_EMAIL || "",
      HOTEL_CHAIN: row?.HOTEL_CHAIN || "",
      HOTEL_CITY: row?.HOTEL_CITY || "",
      HOTEL_WEBSITE: row?.HOTEL_WEBSITE || "",
      HOTEL_PHONE: row?.HOTEL_PHONE || "",
      HOTEL_STARS: row?.HOTEL_STARS || "",
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
      HOTEL_NAME: true,
      RESERVATION_EMAIL: true,
      HOTEL_CHAIN: true,
      HOTEL_CITY: true,
      HOTEL_STARS: true,
    });

    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      createHotel(form, () => {
        setCreateOpen(false);
      })
    );
  };

  const submitEdit = (e) => {
    e.preventDefault();
    setTouched({
      HOTEL_NAME: true,
      RESERVATION_EMAIL: true,
      HOTEL_CHAIN: true,
      HOTEL_CITY: true,
      HOTEL_STARS: true,
    });

    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      updateHotel(editing?._id, form, () => {
        setEditOpen(false);
        setEditing(null);
      })
    );
  };

  const confirmDelete = () => {
    dispatch(
      deleteHotel(deleting?._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
      })
    );
  };

  const onChange = (name, value) => setForm((p) => ({ ...p, [name]: value }));

  const renderFormFields = () => (
    <Row>
      <Col md={6} className="mb-3">
        <Label>Hotel Name *</Label>
        <Input
          value={form.HOTEL_NAME}
          onChange={(e) => onChange("HOTEL_NAME", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, HOTEL_NAME: true }))}
          invalid={!!(touched.HOTEL_NAME && errors.HOTEL_NAME)}
        />
        <FormFeedback>{errors.HOTEL_NAME}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Reservation Email *</Label>
        <Input
          type="email"
          value={form.RESERVATION_EMAIL}
          onChange={(e) => onChange("RESERVATION_EMAIL", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, RESERVATION_EMAIL: true }))}
          invalid={!!(touched.RESERVATION_EMAIL && errors.RESERVATION_EMAIL)}
        />
        <FormFeedback>{errors.RESERVATION_EMAIL}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Hotel Chain *</Label>
        <Input
          type="select"
          value={form.HOTEL_CHAIN}
          onChange={(e) => onChange("HOTEL_CHAIN", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, HOTEL_CHAIN: true }))}
          invalid={!!(touched.HOTEL_CHAIN && errors.HOTEL_CHAIN)}
          disabled={lookupsLoading}
        >
          <option value="">Select...</option>
          {(lookups.HOTELCHAINS || []).map((x) => (
            <option key={x._id} value={x._id}>
              {x.ITEM_VALUE}
            </option>
          ))}
        </Input>
        <FormFeedback>{errors.HOTEL_CHAIN}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>City *</Label>
        <Input
          type="select"
          value={form.HOTEL_CITY}
          onChange={(e) => onChange("HOTEL_CITY", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, HOTEL_CITY: true }))}
          invalid={!!(touched.HOTEL_CITY && errors.HOTEL_CITY)}
          disabled={lookupsLoading}
        >
          <option value="">Select...</option>
          {(lookups.CITIES || []).map((x) => (
            <option key={x._id} value={x._id}>
              {x.ITEM_VALUE}
            </option>
          ))}
        </Input>
        <FormFeedback>{errors.HOTEL_CITY}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Stars *</Label>
        <Input
          type="select"
          value={form.HOTEL_STARS}
          onChange={(e) => onChange("HOTEL_STARS", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, HOTEL_STARS: true }))}
          invalid={!!(touched.HOTEL_STARS && errors.HOTEL_STARS)}
          disabled={lookupsLoading}
        >
          <option value="">Select...</option>
          {(lookups.HOTELSTARS || []).map((x) => (
            <option key={x._id} value={x.ITEM_VALUE}>
              {x.ITEM_VALUE}
            </option>
          ))}
        </Input>
        <FormFeedback>{errors.HOTEL_STARS}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Hotel Phone</Label>
        <Input value={form.HOTEL_PHONE} onChange={(e) => onChange("HOTEL_PHONE", e.target.value)} />
      </Col>

      <Col md={12} className="mb-3">
        <Label>Website</Label>
        <Input
          type="url"
          value={form.HOTEL_WEBSITE}
          onChange={(e) => onChange("HOTEL_WEBSITE", e.target.value)}
          placeholder="https://..."
        />
      </Col>
    </Row>
  );

  return (
    <RoleProtected allowedRoles={ALLOWED_ROLES}>
      <div className="page-content">
        <div className="container-fluid">
          <Row className="mb-3">
            <Col md={6}>
              <h4 className="mb-0">Hotels</h4>
            </Col>
            <Col md={6} className="text-end">
              <Button color="primary" onClick={openCreate} disabled={!canMutate}>
                <i className="bx bx-plus me-1" />
                Create
              </Button>
            </Col>
          </Row>

          <Card>
            <CardBody>
              <Row className="mb-3">
                <Col md={4}>
                  <Label className="form-label">Search (name)</Label>
                  <Input
                    value={searchName}
                    onChange={(e) => setSearchName(e.target.value)}
                    placeholder="Type hotel name..."
                  />
                </Col>
                <Col md={8} className="text-end d-flex align-items-end justify-content-end">
                  <Button
                    color="secondary"
                    outline
                    className="me-2"
                    onClick={() => dispatch(fetchHotels())}
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
              ) : filtered.length === 0 ? (
                <div className="text-center py-5 text-muted">No hotels found.</div>
              ) : (
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Hotel Name</th>
                        <th>City</th>
                        <th>Chain</th>
                        <th>Stars</th>
                        <th>Reservation Email</th>
                        <th>Phone</th>
                        <th style={{ width: 160 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((x) => (
                        <tr key={x._id}>
                          <td>{x.HOTEL_NAME}</td>
                          <td>{cityMap.get(x.HOTEL_CITY) || "-"}</td>
                          <td>{chainMap.get(x.HOTEL_CHAIN) || "-"}</td>
                          <td>{String(x.HOTEL_STARS ?? "-")}</td>
                          <td>{x.RESERVATION_EMAIL || "-"}</td>
                          <td>{x.HOTEL_PHONE || "-"}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button color="info" size="sm" tag={Link} to={`/hotels/${x._id}`}>
                                View
                              </Button>
                              <Button color="warning" size="sm" onClick={() => openEdit(x)} disabled={!canMutate}>
                                Edit
                              </Button>
                              <Button color="danger" size="sm" onClick={() => openDelete(x)} disabled={!canMutate}>
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

          {/* Create Modal */}
          <Modal isOpen={createOpen} toggle={() => setCreateOpen((v) => !v)} size="lg">
            <ModalHeader toggle={() => setCreateOpen(false)}>Create Hotel</ModalHeader>
            <Form onSubmit={submitCreate}>
              <ModalBody>{renderFormFields()}</ModalBody>
              <ModalFooter>
                <Button color="secondary" onClick={() => setCreateOpen(false)} type="button">
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={loading}>
                  Save
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          {/* Edit Modal */}
          <Modal isOpen={editOpen} toggle={() => setEditOpen((v) => !v)} size="lg">
            <ModalHeader toggle={() => setEditOpen(false)}>Edit Hotel</ModalHeader>
            <Form onSubmit={submitEdit}>
              <ModalBody>{renderFormFields()}</ModalBody>
              <ModalFooter>
                <Button color="secondary" onClick={() => setEditOpen(false)} type="button">
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={loading}>
                  Update
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          {/* Delete Confirm */}
          <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen((v) => !v)}>
            <ModalHeader toggle={() => setDeleteOpen(false)}>Confirm Delete</ModalHeader>
            <ModalBody>
              Are you sure you want to delete <b>{deleting?.HOTEL_NAME}</b>?
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={() => setDeleteOpen(false)} type="button">
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

export default Hotels;