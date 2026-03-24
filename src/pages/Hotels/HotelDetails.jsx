// path: src/pages/Hotels/HotelDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
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

import RoleProtected from "../../components/Common/RoleProtected";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";

import {
  fetchHotel,
  fetchHotelsLookups,
  fetchSeasonRates,
  createSeasonRate,
  updateSeasonRate,
  deleteSeasonRate,
} from "../../store/Hotels/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyRate = {
  SEASON_NAME: "",
  BB_RATE_AMOUNT: "",
  HB_RATE_AMOUNT: "",
  FB_RATE_AMOUNT: "",
  SINGLE_SUPPLIMENT_AMOUNT: "",
  START_DATE: "",
  END_DATE: "",
};

const HotelDetails = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();

  const {
    selected,
    loading,
    lookups,
    seasonRatesByHotel,
    seasonRatesLoading,
  } = useSelector((s) => s.Hotels);

  const roles = useSelector((s) => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);
  const rates = seasonRatesByHotel[id] || [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [form, setForm] = useState({ ...emptyRate });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    dispatch(fetchHotelsLookups());
    dispatch(fetchHotel(id));
    dispatch(fetchSeasonRates(id));
  }, [dispatch, id]);

  const cityMap = useMemo(() => {
    const map = new Map();
    (lookups?.CITIES || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.CITIES]);

  const chainMap = useMemo(() => {
    const map = new Map();
    (lookups?.HOTELCHAINS || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.HOTELCHAINS]);

  const seasonMap = useMemo(() => {
    const map = new Map();
    (lookups?.HOTELSEASONS || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.HOTELSEASONS]);

  const validateRate = (data) => {
    const e = {};

    if (!data.SEASON_NAME) e.SEASON_NAME = "Required";
    if (!data.START_DATE) e.START_DATE = "Required";
    if (!data.END_DATE) e.END_DATE = "Required";

    if (
      data.START_DATE &&
      data.END_DATE &&
      new Date(data.START_DATE) > new Date(data.END_DATE)
    ) {
      e.END_DATE = "End Date must be after or equal to Start Date";
    }

    return e;
  };

  const errors = useMemo(() => validateRate(form), [form]);

  const openCreate = () => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }
    setTouched({});
    setEditing(null);
    setForm({ ...emptyRate });
    setCreateOpen(true);
  };

  const openEdit = (r) => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    const toDate = (v) => (v ? String(v).slice(0, 10) : "");

    setTouched({});
    setEditing(r);
    setForm({
      SEASON_NAME: r?.SEASON_NAME || "",
      BB_RATE_AMOUNT: r?.BB_RATE_AMOUNT ?? "",
      HB_RATE_AMOUNT: r?.HB_RATE_AMOUNT ?? "",
      FB_RATE_AMOUNT: r?.FB_RATE_AMOUNT ?? "",
      SINGLE_SUPPLIMENT_AMOUNT: r?.SINGLE_SUPPLIMENT_AMOUNT ?? "",
      START_DATE: toDate(r?.START_DATE),
      END_DATE: toDate(r?.END_DATE),
    });
    setEditOpen(true);
  };

  const openDelete = (r) => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }
    setDeleting(r);
    setDeleteOpen(true);
  };

  const submitCreate = (e) => {
    e.preventDefault();

    setTouched({
      SEASON_NAME: true,
      START_DATE: true,
      END_DATE: true,
    });

    if (Object.keys(errors).length) {
      notifyError("Validation fail");
      return;
    }

    dispatch(
      createSeasonRate(id, form, () => {
        setCreateOpen(false);
        setForm({ ...emptyRate });
      })
    );
  };

  const submitEdit = (e) => {
    e.preventDefault();

    setTouched({
      SEASON_NAME: true,
      START_DATE: true,
      END_DATE: true,
    });

    if (Object.keys(errors).length) {
      notifyError("Validation fail");
      return;
    }

    dispatch(
      updateSeasonRate(id, editing?._id, form, () => {
        setEditOpen(false);
        setEditing(null);
        setForm({ ...emptyRate });
      })
    );
  };

  const confirmDelete = () => {
    dispatch(
      deleteSeasonRate(id, deleting?._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
      })
    );
  };

  const onChange = (name, value) => {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <RoleProtected allowedRoles={ALLOWED_ROLES}>
      <div className="page-content">
        <div className="container-fluid">
          <Row className="mb-3">
            <Col md={6}>
              <h4 className="mb-0">Hotel Details</h4>
              <div className="text-muted">{selected?._id}</div>
            </Col>
            <Col md={6} className="text-end">
              <Button
                color="secondary"
                outline
                className="me-2"
                onClick={() => nav("/hotels")}
              >
                Back
              </Button>
              <Button
                color="secondary"
                outline
                onClick={() => dispatch(fetchSeasonRates(id))}
                disabled={seasonRatesLoading}
              >
                Refresh Rates
              </Button>
            </Col>
          </Row>

          {loading && !selected ? (
            <div className="text-center py-5">
              <Spinner />
            </div>
          ) : (
            <>
              <Card className="mb-3">
                <CardBody>
                  <Row>
                    <Col md={6} className="mb-2">
                      <b>Name:</b> {selected?.HOTEL_NAME || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Reservation Email:</b> {selected?.RESERVATION_EMAIL || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>City:</b> {cityMap.get(selected?.HOTEL_CITY) || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Chain:</b> {chainMap.get(selected?.HOTEL_CHAIN) || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Stars:</b> {selected?.HOTEL_STARS ?? "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Phone:</b> {selected?.HOTEL_PHONE || "-"}
                    </Col>
                    <Col md={12} className="mb-2">
                      <b>Website:</b>{" "}
                      {selected?.HOTEL_WEBSITE ? (
                        <a
                          href={selected.HOTEL_WEBSITE}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {selected.HOTEL_WEBSITE}
                        </a>
                      ) : (
                        "-"
                      )}
                    </Col>
                  </Row>
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <Row className="mb-3">
                    <Col md={6}>
                      <h5 className="mb-0">Season Rates</h5>
                    </Col>
                    <Col md={6} className="text-end">
                      <Button
                        color="primary"
                        onClick={openCreate}
                        disabled={!canMutate}
                      >
                        <i className="bx bx-plus me-1" />
                        Add Rate
                      </Button>
                    </Col>
                  </Row>

                  {seasonRatesLoading ? (
                    <div className="text-center py-4">
                      <Spinner />
                    </div>
                  ) : rates.length === 0 ? (
                    <div className="text-center py-5 text-muted">
                      No season rates found.
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <Table className="table align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Season</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>BB</th>
                            <th>HB</th>
                            <th>FB</th>
                            <th>Single Supp.</th>
                            <th style={{ width: 160 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {rates.map((r) => (
                            <tr key={r._id}>
                              <td>{seasonMap.get(r.SEASON_NAME) || "-"}</td>
                              <td>{String(r.START_DATE || "").slice(0, 10)}</td>
                              <td>{String(r.END_DATE || "").slice(0, 10)}</td>
                              <td>{r.BB_RATE_AMOUNT ?? "-"}</td>
                              <td>{r.HB_RATE_AMOUNT ?? "-"}</td>
                              <td>{r.FB_RATE_AMOUNT ?? "-"}</td>
                              <td>{r.SINGLE_SUPPLIMENT_AMOUNT ?? "-"}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    color="warning"
                                    size="sm"
                                    onClick={() => openEdit(r)}
                                    disabled={!canMutate}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => openDelete(r)}
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
            </>
          )}

          <Modal
            isOpen={createOpen}
            toggle={() => setCreateOpen((v) => !v)}
            size="lg"
          >
            <ModalHeader toggle={() => setCreateOpen(false)}>
              Create Season Rate
            </ModalHeader>
            <Form onSubmit={submitCreate}>
              <ModalBody>
                <Row>
                  <Col md={6} className="mb-3">
                    <Label>Season *</Label>
                    <Input
                      type="select"
                      value={form.SEASON_NAME}
                      onChange={(e) => onChange("SEASON_NAME", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, SEASON_NAME: true }))
                      }
                      invalid={!!(touched.SEASON_NAME && errors.SEASON_NAME)}
                    >
                      <option value="">Select...</option>
                      {(lookups.HOTELSEASONS || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.SEASON_NAME}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={form.START_DATE}
                      onChange={(e) => onChange("START_DATE", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, START_DATE: true }))
                      }
                      invalid={!!(touched.START_DATE && errors.START_DATE)}
                    />
                    <FormFeedback>{errors.START_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={form.END_DATE}
                      onChange={(e) => onChange("END_DATE", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, END_DATE: true }))}
                      invalid={!!(touched.END_DATE && errors.END_DATE)}
                    />
                    <FormFeedback>{errors.END_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>BB</Label>
                    <Input
                      type="number"
                      value={form.BB_RATE_AMOUNT}
                      onChange={(e) => onChange("BB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>HB</Label>
                    <Input
                      type="number"
                      value={form.HB_RATE_AMOUNT}
                      onChange={(e) => onChange("HB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>FB</Label>
                    <Input
                      type="number"
                      value={form.FB_RATE_AMOUNT}
                      onChange={(e) => onChange("FB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Single Supplement</Label>
                    <Input
                      type="number"
                      value={form.SINGLE_SUPPLIMENT_AMOUNT}
                      onChange={(e) =>
                        onChange("SINGLE_SUPPLIMENT_AMOUNT", e.target.value)
                      }
                    />
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={seasonRatesLoading}>
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
              Edit Season Rate
            </ModalHeader>
            <Form onSubmit={submitEdit}>
              <ModalBody>
                <Row>
                  <Col md={6} className="mb-3">
                    <Label>Season *</Label>
                    <Input
                      type="select"
                      value={form.SEASON_NAME}
                      onChange={(e) => onChange("SEASON_NAME", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, SEASON_NAME: true }))
                      }
                      invalid={!!(touched.SEASON_NAME && errors.SEASON_NAME)}
                    >
                      <option value="">Select...</option>
                      {(lookups.HOTELSEASONS || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.SEASON_NAME}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Start Date *</Label>
                    <Input
                      type="date"
                      value={form.START_DATE}
                      onChange={(e) => onChange("START_DATE", e.target.value)}
                      onBlur={() =>
                        setTouched((t) => ({ ...t, START_DATE: true }))
                      }
                      invalid={!!(touched.START_DATE && errors.START_DATE)}
                    />
                    <FormFeedback>{errors.START_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>End Date *</Label>
                    <Input
                      type="date"
                      value={form.END_DATE}
                      onChange={(e) => onChange("END_DATE", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, END_DATE: true }))}
                      invalid={!!(touched.END_DATE && errors.END_DATE)}
                    />
                    <FormFeedback>{errors.END_DATE}</FormFeedback>
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>BB</Label>
                    <Input
                      type="number"
                      value={form.BB_RATE_AMOUNT}
                      onChange={(e) => onChange("BB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>HB</Label>
                    <Input
                      type="number"
                      value={form.HB_RATE_AMOUNT}
                      onChange={(e) => onChange("HB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>FB</Label>
                    <Input
                      type="number"
                      value={form.FB_RATE_AMOUNT}
                      onChange={(e) => onChange("FB_RATE_AMOUNT", e.target.value)}
                    />
                  </Col>

                  <Col md={3} className="mb-3">
                    <Label>Single Supplement</Label>
                    <Input
                      type="number"
                      value={form.SINGLE_SUPPLIMENT_AMOUNT}
                      onChange={(e) =>
                        onChange("SINGLE_SUPPLIMENT_AMOUNT", e.target.value)
                      }
                    />
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button
                  color="secondary"
                  type="button"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={seasonRatesLoading}>
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
              Are you sure you want to delete this rate for{" "}
              <b>{seasonMap.get(deleting?.SEASON_NAME) || "Season"}</b>?
            </ModalBody>
            <ModalFooter>
              <Button
                color="secondary"
                onClick={() => setDeleteOpen(false)}
                type="button"
              >
                Cancel
              </Button>
              <Button
                color="danger"
                onClick={confirmDelete}
                disabled={seasonRatesLoading}
              >
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </div>
    </RoleProtected>
  );
};

export default HotelDetails;