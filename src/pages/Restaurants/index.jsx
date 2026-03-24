// path: src/pages/Restaurants/index.jsx
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
  fetchRestaurants,
  fetchRestaurantsLookups,
  createRestaurant,
  updateRestaurant,
  deleteRestaurant,
} from "../../store/Restaurants/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyRestaurant = {
  REATAURANT_NAME: "",
  RESERVATION_EMAIL: "",
  REATAURANT_CITY: "",
  REATAURANT_WEBSITE: "",
  REATAURANT_PHONE: "",
};

const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());

const Restaurants = () => {
  const dispatch = useDispatch();
  const { items, loading, lookups, lookupsLoading } = useSelector((s) => s.Restaurants);
  const roles = useSelector((s) => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [searchName, setSearchName] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyRestaurant });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    dispatch(fetchRestaurantsLookups());
    dispatch(fetchRestaurants());
  }, [dispatch]);

  const cityMap = useMemo(() => {
    const map = new Map();
    (lookups?.CITIES || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.CITIES]);

  const filtered = useMemo(() => {
    const q = String(searchName || "").trim().toLowerCase();
    if (!q) return items || [];
    return (items || []).filter((x) =>
      String(x?.REATAURANT_NAME || "").toLowerCase().includes(q)
    );
  }, [items, searchName]);

  const validate = (data) => {
    const errors = {};
    if (!String(data.REATAURANT_NAME || "").trim()) errors.REATAURANT_NAME = "Required";
    if (!String(data.RESERVATION_EMAIL || "").trim()) errors.RESERVATION_EMAIL = "Required";
    else if (!isEmail(data.RESERVATION_EMAIL)) errors.RESERVATION_EMAIL = "Invalid email";
    if (!String(data.REATAURANT_CITY || "").trim()) errors.REATAURANT_CITY = "Required";
    return errors;
  };

  const errors = useMemo(() => validate(form), [form]);

  const openCreate = () => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setForm({ ...emptyRestaurant });
    setCreateOpen(true);
  };

  const openEdit = (row) => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setEditing(row);
    setForm({
      REATAURANT_NAME: row?.REATAURANT_NAME || "",
      RESERVATION_EMAIL: row?.RESERVATION_EMAIL || "",
      REATAURANT_CITY: row?.REATAURANT_CITY || "",
      REATAURANT_WEBSITE: row?.REATAURANT_WEBSITE || "",
      REATAURANT_PHONE: row?.REATAURANT_PHONE || "",
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
      REATAURANT_NAME: true,
      RESERVATION_EMAIL: true,
      REATAURANT_CITY: true,
    });
    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      createRestaurant(form, () => {
        setCreateOpen(false);
        setForm({ ...emptyRestaurant });
      })
    );
  };

  const submitEdit = (e) => {
    e.preventDefault();
    setTouched({
      REATAURANT_NAME: true,
      RESERVATION_EMAIL: true,
      REATAURANT_CITY: true,
    });
    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      updateRestaurant(editing?._id, form, () => {
        setEditOpen(false);
        setEditing(null);
        setForm({ ...emptyRestaurant });
      })
    );
  };

  const confirmDelete = () => {
    dispatch(
      deleteRestaurant(deleting?._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
      })
    );
  };

  const onChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  const renderFields = () => (
    <Row>
      <Col md={6} className="mb-3">
        <Label>Restaurant Name *</Label>
        <Input
          value={form.REATAURANT_NAME}
          onChange={(e) => onChange("REATAURANT_NAME", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, REATAURANT_NAME: true }))}
          invalid={!!(touched.REATAURANT_NAME && errors.REATAURANT_NAME)}
        />
        <FormFeedback>{errors.REATAURANT_NAME}</FormFeedback>
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
        <Label>City *</Label>
        <Input
          type="select"
          value={form.REATAURANT_CITY}
          onChange={(e) => onChange("REATAURANT_CITY", e.target.value)}
          onBlur={() => setTouched((t) => ({ ...t, REATAURANT_CITY: true }))}
          invalid={!!(touched.REATAURANT_CITY && errors.REATAURANT_CITY)}
          disabled={lookupsLoading}
        >
          <option value="">Select...</option>
          {(lookups?.CITIES || []).map((x) => (
            <option key={x._id} value={x._id}>
              {x.ITEM_VALUE}
            </option>
          ))}
        </Input>
        <FormFeedback>{errors.REATAURANT_CITY}</FormFeedback>
      </Col>

      <Col md={6} className="mb-3">
        <Label>Phone</Label>
        <Input
          value={form.REATAURANT_PHONE}
          onChange={(e) => onChange("REATAURANT_PHONE", e.target.value)}
        />
      </Col>

      <Col md={12} className="mb-3">
        <Label>Website</Label>
        <Input
          type="url"
          value={form.REATAURANT_WEBSITE}
          onChange={(e) => onChange("REATAURANT_WEBSITE", e.target.value)}
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
              <h4 className="mb-0">Restaurants</h4>
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
                    placeholder="Type restaurant name..."
                  />
                </Col>
                <Col md={8} className="text-end d-flex align-items-end justify-content-end">
                  <Button
                    color="secondary"
                    outline
                    onClick={() => dispatch(fetchRestaurants())}
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
                <div className="text-center py-5 text-muted">No restaurants found.</div>
              ) : (
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Restaurant Name</th>
                        <th>City</th>
                        <th>Reservation Email</th>
                        <th>Phone</th>
                        <th>Website</th>
                        <th style={{ width: 160 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((x) => (
                        <tr key={x._id}>
                          <td>{x.REATAURANT_NAME || "-"}</td>
                          <td>{cityMap.get(x.REATAURANT_CITY) || "-"}</td>
                          <td>{x.RESERVATION_EMAIL || "-"}</td>
                          <td>{x.REATAURANT_PHONE || "-"}</td>
                          <td>{x.REATAURANT_WEBSITE || "-"}</td>
                          <td>
                            <div className="d-flex gap-2">
                              <Button color="info" size="sm" tag={Link} to={`/restaurants/${x._id}`}>
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

          <Modal isOpen={createOpen} toggle={() => setCreateOpen((v) => !v)} size="lg">
            <ModalHeader toggle={() => setCreateOpen(false)}>Create Restaurant</ModalHeader>
            <Form onSubmit={submitCreate}>
              <ModalBody>{renderFields()}</ModalBody>
              <ModalFooter>
                <Button color="secondary" type="button" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={loading}>
                  Save
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal isOpen={editOpen} toggle={() => setEditOpen((v) => !v)} size="lg">
            <ModalHeader toggle={() => setEditOpen(false)}>Edit Restaurant</ModalHeader>
            <Form onSubmit={submitEdit}>
              <ModalBody>{renderFields()}</ModalBody>
              <ModalFooter>
                <Button color="secondary" type="button" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={loading}>
                  Update
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen((v) => !v)}>
            <ModalHeader toggle={() => setDeleteOpen(false)}>Confirm Delete</ModalHeader>
            <ModalBody>
              Are you sure you want to delete <b>{deleting?.REATAURANT_NAME}</b>?
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" type="button" onClick={() => setDeleteOpen(false)}>
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

export default Restaurants;