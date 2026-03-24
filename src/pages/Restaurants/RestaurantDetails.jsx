// path: src/pages/Restaurants/RestaurantDetails.jsx
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
  fetchRestaurant,
  fetchRestaurantsLookups,
  fetchMeals,
  createMeal,
  updateMeal,
  deleteMeal,
} from "../../store/Restaurants/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const emptyMeal = {
  MEAL_TYPE: "",
  MEAL_PRICE_PER_PERSON: "",
};

const RestaurantDetails = () => {
  const { id } = useParams();
  const nav = useNavigate();
  const dispatch = useDispatch();

  const { selected, loading, lookups, mealsByRestaurant, mealsLoading } = useSelector(
    (s) => s.Restaurants
  );
  const roles = useSelector((s) => s.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);
  const meals = mealsByRestaurant[id] || [];

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyMeal });
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    dispatch(fetchRestaurantsLookups());
    dispatch(fetchRestaurant(id));
    dispatch(fetchMeals(id));
  }, [dispatch, id]);

  const cityMap = useMemo(() => {
    const map = new Map();
    (lookups?.CITIES || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.CITIES]);

  const mealMap = useMemo(() => {
    const map = new Map();
    (lookups?.RESTAURANTS_MEALS || []).forEach((x) => map.set(x._id, x.ITEM_VALUE));
    return map;
  }, [lookups?.RESTAURANTS_MEALS]);

  const validateMeal = (data) => {
    const e = {};
    if (!data.MEAL_TYPE) e.MEAL_TYPE = "Required";
    if (
      data.MEAL_PRICE_PER_PERSON === "" ||
      data.MEAL_PRICE_PER_PERSON === null ||
      data.MEAL_PRICE_PER_PERSON === undefined
    ) {
      e.MEAL_PRICE_PER_PERSON = "Required";
    } else if (Number(data.MEAL_PRICE_PER_PERSON) < 0) {
      e.MEAL_PRICE_PER_PERSON = "Must be 0 or more";
    }
    return e;
  };

  const errors = useMemo(() => validateMeal(form), [form]);

  const openCreate = () => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setEditing(null);
    setForm({ ...emptyMeal });
    setCreateOpen(true);
  };

  const openEdit = (meal) => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setTouched({});
    setEditing(meal);
    setForm({
      MEAL_TYPE: meal?.MEAL_TYPE || "",
      MEAL_PRICE_PER_PERSON: meal?.MEAL_PRICE_PER_PERSON ?? "",
    });
    setEditOpen(true);
  };

  const openDelete = (meal) => {
    if (!canMutate) return notifyError("Permission/role mismatch");
    setDeleting(meal);
    setDeleteOpen(true);
  };

  const submitCreate = (e) => {
    e.preventDefault();
    setTouched({ MEAL_TYPE: true, MEAL_PRICE_PER_PERSON: true });
    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      createMeal(
        id,
        { ...form, MEAL_PRICE_PER_PERSON: Number(form.MEAL_PRICE_PER_PERSON) },
        () => {
          setCreateOpen(false);
          setForm({ ...emptyMeal });
        }
      )
    );
  };

  const submitEdit = (e) => {
    e.preventDefault();
    setTouched({ MEAL_TYPE: true, MEAL_PRICE_PER_PERSON: true });
    if (Object.keys(errors).length) return notifyError("Validation fail");

    dispatch(
      updateMeal(
        id,
        editing?._id,
        { ...form, MEAL_PRICE_PER_PERSON: Number(form.MEAL_PRICE_PER_PERSON) },
        () => {
          setEditOpen(false);
          setEditing(null);
          setForm({ ...emptyMeal });
        }
      )
    );
  };

  const confirmDelete = () => {
    dispatch(
      deleteMeal(id, deleting?._id, () => {
        setDeleteOpen(false);
        setDeleting(null);
      })
    );
  };

  const onChange = (name, value) => setForm((prev) => ({ ...prev, [name]: value }));

  return (
    <RoleProtected allowedRoles={ALLOWED_ROLES}>
      <div className="page-content">
        <div className="container-fluid">
          <Row className="mb-3">
            <Col md={6}>
              <h4 className="mb-0">Restaurant Details</h4>
              <div className="text-muted">{selected?._id}</div>
            </Col>
            <Col md={6} className="text-end">
              <Button color="secondary" outline className="me-2" onClick={() => nav("/restaurants")}>
                Back
              </Button>
              <Button
                color="secondary"
                outline
                onClick={() => dispatch(fetchMeals(id))}
                disabled={mealsLoading}
              >
                Refresh Meals
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
                      <b>Name:</b> {selected?.REATAURANT_NAME || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Reservation Email:</b> {selected?.RESERVATION_EMAIL || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>City:</b> {cityMap.get(selected?.REATAURANT_CITY) || "-"}
                    </Col>
                    <Col md={6} className="mb-2">
                      <b>Phone:</b> {selected?.REATAURANT_PHONE || "-"}
                    </Col>
                    <Col md={12} className="mb-2">
                      <b>Website:</b>{" "}
                      {selected?.REATAURANT_WEBSITE ? (
                        <a href={selected.REATAURANT_WEBSITE} target="_blank" rel="noreferrer">
                          {selected.REATAURANT_WEBSITE}
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
                      <h5 className="mb-0">Meals</h5>
                    </Col>
                    <Col md={6} className="text-end">
                      <Button color="primary" onClick={openCreate} disabled={!canMutate}>
                        <i className="bx bx-plus me-1" />
                        Add Meal
                      </Button>
                    </Col>
                  </Row>

                  {mealsLoading ? (
                    <div className="text-center py-4">
                      <Spinner />
                    </div>
                  ) : meals.length === 0 ? (
                    <div className="text-center py-5 text-muted">No meals found.</div>
                  ) : (
                    <div className="table-responsive">
                      <Table className="table align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Meal Type</th>
                            <th>Price Per Person</th>
                            <th style={{ width: 160 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {meals.map((meal) => (
                            <tr key={meal._id}>
                              <td>{mealMap.get(meal.MEAL_TYPE) || "-"}</td>
                              <td>{meal.MEAL_PRICE_PER_PERSON ?? "-"}</td>
                              <td>
                                <div className="d-flex gap-2">
                                  <Button
                                    color="warning"
                                    size="sm"
                                    onClick={() => openEdit(meal)}
                                    disabled={!canMutate}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    color="danger"
                                    size="sm"
                                    onClick={() => openDelete(meal)}
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

          <Modal isOpen={createOpen} toggle={() => setCreateOpen((v) => !v)}>
            <ModalHeader toggle={() => setCreateOpen(false)}>Create Meal</ModalHeader>
            <Form onSubmit={submitCreate}>
              <ModalBody>
                <Row>
                  <Col md={7} className="mb-3">
                    <Label>Meal Type *</Label>
                    <Input
                      type="select"
                      value={form.MEAL_TYPE}
                      onChange={(e) => onChange("MEAL_TYPE", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, MEAL_TYPE: true }))}
                      invalid={!!(touched.MEAL_TYPE && errors.MEAL_TYPE)}
                    >
                      <option value="">Select...</option>
                      {(lookups?.RESTAURANTS_MEALS || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.MEAL_TYPE}</FormFeedback>
                  </Col>

                  <Col md={5} className="mb-3">
                    <Label>Price Per Person *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.MEAL_PRICE_PER_PERSON}
                      onChange={(e) => onChange("MEAL_PRICE_PER_PERSON", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, MEAL_PRICE_PER_PERSON: true }))}
                      invalid={!!(touched.MEAL_PRICE_PER_PERSON && errors.MEAL_PRICE_PER_PERSON)}
                    />
                    <FormFeedback>{errors.MEAL_PRICE_PER_PERSON}</FormFeedback>
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" type="button" onClick={() => setCreateOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={mealsLoading}>
                  Save
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal isOpen={editOpen} toggle={() => setEditOpen((v) => !v)}>
            <ModalHeader toggle={() => setEditOpen(false)}>Edit Meal</ModalHeader>
            <Form onSubmit={submitEdit}>
              <ModalBody>
                <Row>
                  <Col md={7} className="mb-3">
                    <Label>Meal Type *</Label>
                    <Input
                      type="select"
                      value={form.MEAL_TYPE}
                      onChange={(e) => onChange("MEAL_TYPE", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, MEAL_TYPE: true }))}
                      invalid={!!(touched.MEAL_TYPE && errors.MEAL_TYPE)}
                    >
                      <option value="">Select...</option>
                      {(lookups?.RESTAURANTS_MEALS || []).map((x) => (
                        <option key={x._id} value={x._id}>
                          {x.ITEM_VALUE}
                        </option>
                      ))}
                    </Input>
                    <FormFeedback>{errors.MEAL_TYPE}</FormFeedback>
                  </Col>

                  <Col md={5} className="mb-3">
                    <Label>Price Per Person *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.MEAL_PRICE_PER_PERSON}
                      onChange={(e) => onChange("MEAL_PRICE_PER_PERSON", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, MEAL_PRICE_PER_PERSON: true }))}
                      invalid={!!(touched.MEAL_PRICE_PER_PERSON && errors.MEAL_PRICE_PER_PERSON)}
                    />
                    <FormFeedback>{errors.MEAL_PRICE_PER_PERSON}</FormFeedback>
                  </Col>
                </Row>
              </ModalBody>
              <ModalFooter>
                <Button color="secondary" type="button" onClick={() => setEditOpen(false)}>
                  Cancel
                </Button>
                <Button color="primary" type="submit" disabled={mealsLoading}>
                  Update
                </Button>
              </ModalFooter>
            </Form>
          </Modal>

          <Modal isOpen={deleteOpen} toggle={() => setDeleteOpen((v) => !v)}>
            <ModalHeader toggle={() => setDeleteOpen(false)}>Confirm Delete</ModalHeader>
            <ModalBody>
              Are you sure you want to delete this meal{" "}
              <b>{mealMap.get(deleting?.MEAL_TYPE) || "Meal"}</b>?
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" type="button" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button color="danger" onClick={confirmDelete} disabled={mealsLoading}>
                Delete
              </Button>
            </ModalFooter>
          </Modal>
        </div>
      </div>
    </RoleProtected>
  );
};

export default RestaurantDetails;