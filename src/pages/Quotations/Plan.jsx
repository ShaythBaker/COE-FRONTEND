// path: src/pages/Quotations/Plan.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Collapse,
  Container,
  FormFeedback,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError, notifyInfo } from "../../helpers/notify";
import { fetchQuotation } from "../../store/Quotations/actions";
import {
  createQuotationDay,
  fetchQuotationDayLookups,
  fetchQuotationDays,
  fetchRestaurantMeals,
  updateQuotationDay,
} from "../../store/QuotationDays/actions";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const toDateOnly = (value) => {
  if (!value) return "";
  const str = String(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return str;
  }

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return "";

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const addDays = (dateStr, daysToAdd) => {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  const d = new Date(year, month - 1, day);
  d.setDate(d.getDate() + daysToAdd);

  const nextYear = d.getFullYear();
  const nextMonth = String(d.getMonth() + 1).padStart(2, "0");
  const nextDay = String(d.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
};

const diffNights = (start, end) => {
  if (!start || !end) return 0;

  const [startYear, startMonth, startDay] = String(start).split("-").map(Number);
  const [endYear, endMonth, endDay] = String(end).split("-").map(Number);

  const s = new Date(startYear, startMonth - 1, startDay);
  const e = new Date(endYear, endMonth - 1, endDay);

  const diff = Math.round((e.getTime() - s.getTime()) / 86400000);
  return diff > 0 ? diff : 0;
};

const getId = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return getId(value._id);
  if (value?.$oid) return value.$oid;
  return "";
};

const getTransportationTypeLabel = (item) =>
  item?.TRANSPORTATION_TYPE_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getGuideTypeLabel = (item) =>
  item?.ITEM_VALUE ||
  item?.LIST_ITEM_VALUE ||
  item?.LIST_ITEM_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getRestaurantLabel = (item) =>
  item?.REATAURANT_NAME ||
  item?.RESTAURANT_NAME ||
  item?.NAME ||
  item?.TITLE ||
  item?.VALUE ||
  "-";

const getMealLabel = (item) =>
  item?.MEAL_NAME || item?.NAME || item?.TITLE || item?.VALUE || "-";

const getMealValue = (item) =>
  getId(item) || item?.MEAL_TYPE || item?.MEAL_NAME || item?.NAME || "";

const getPlaceLabel = (item) =>
  item?.PLACE_NAME || item?.NAME || item?.TITLE || item?.VALUE || "-";

const buildDayState = ({ quotationId, order, date, existing }) => ({
  _id: existing?._id || "",
  ORIGINAL_QUOTATION_ID: quotationId,
  DAY_ORDER: order,
  DAY_DATE: date,
  TRANSPORTATION_TYPE: getId(existing?.TRANSPORTATION_TYPE),
  hasGuide: !!getId(existing?.GUIDE_TYPE),
  GUIDE_TYPE: getId(existing?.GUIDE_TYPE),
  hasMeals: Array.isArray(existing?.MEALS) && existing.MEALS.length > 0,
  MEALS:
    Array.isArray(existing?.MEALS) && existing.MEALS.length > 0
      ? existing.MEALS.map((m) => ({
          RESTAURANT_ID: getId(m?.RESTAURANT_ID),
          MEAL_TYPE: getId(m?.MEAL_TYPE) || getMealValue(m),
        }))
      : [{ RESTAURANT_ID: "", MEAL_TYPE: "" }],
  PLACES_TEXT:
    Array.isArray(existing?.PLACES) && existing.PLACES.length > 0
      ? existing.PLACES.map((p) => p?.PLACE_NAME).filter(Boolean).join(", ")
      : "",
  touched: {},
});

const PlanQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const quotationState = useSelector((state) => state.Quotations || {});
  const quotation = quotationState?.selected;

  const {
    items = [],
    loading,
    lookups = {},
    lookupsLoading,
    restaurantMealsByRestaurantId = {},
    mealsLoadingByRestaurantId = {},
  } = useSelector((state) => state.QuotationDays || {});

  const roles = useSelector((state) => state.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [dayForms, setDayForms] = useState([]);
  const [openDays, setOpenDays] = useState({});
  const [savingDayOrder, setSavingDayOrder] = useState(null);

  const transportationTypes = lookups?.transportationTypes || [];
  const guideTypes = lookups?.guideTypes || [];
  const restaurants = lookups?.restaurants || [];
  const places = lookups?.places || [];

  const placesMap = useMemo(() => {
    const map = new Map();
    places.forEach((item) => {
      map.set(getPlaceLabel(item).trim().toLowerCase(), item);
    });
    return map;
  }, [places]);

  useEffect(() => {
    if (id) {
      dispatch(fetchQuotation(id));
      dispatch(fetchQuotationDays(id));
      dispatch(fetchQuotationDayLookups());
    }
  }, [dispatch, id]);

  const arrivingDate = toDateOnly(quotation?.ARRAIVING_DATE);
  const departureDate = toDateOnly(quotation?.DEPARTURE_DATE);
  const nights = diffNights(arrivingDate, departureDate);
  const totalDays = nights + 1;

  useEffect(() => {
    if (!quotation?._id || !arrivingDate || !departureDate) {
      setDayForms([]);
      return;
    }

    const generated = Array.from({ length: totalDays }).map((_, index) => {
      const dayOrder = index + 1;
      const existing = items.find(
        (item) => Number(item?.DAY_ORDER) === Number(dayOrder)
      );

      return buildDayState({
        quotationId: quotation._id,
        order: dayOrder,
        date: addDays(arrivingDate, index),
        existing,
      });
    });

    setDayForms(generated);

    setOpenDays((prev) => {
      const next = {};
      generated.forEach((day) => {
        next[day.DAY_ORDER] = prev[day.DAY_ORDER] ?? true;
      });
      return next;
    });
  }, [quotation, items, arrivingDate, departureDate, totalDays]);

  const setDayValue = (dayOrder, updater) => {
    setDayForms((prev) =>
      prev.map((day) =>
        Number(day.DAY_ORDER) === Number(dayOrder) ? updater(day) : day
      )
    );
  };

  const handleFieldChange = (dayOrder, field, value) => {
    setDayValue(dayOrder, (current) => ({
      ...current,
      [field]: value,
      touched: {
        ...current.touched,
        [field]: true,
      },
    }));
  };

  const handleToggleGuide = (dayOrder, nextValue) => {
    setDayValue(dayOrder, (current) => ({
      ...current,
      hasGuide: nextValue,
      GUIDE_TYPE: nextValue ? current.GUIDE_TYPE : "",
      touched: {
        ...current.touched,
        GUIDE_TYPE: true,
      },
    }));
  };

  const handleToggleMeals = (dayOrder, nextValue) => {
    setDayValue(dayOrder, (current) => ({
      ...current,
      hasMeals: nextValue,
      MEALS: nextValue
        ? current.MEALS?.length
          ? current.MEALS
          : [{ RESTAURANT_ID: "", MEAL_TYPE: "" }]
        : [{ RESTAURANT_ID: "", MEAL_TYPE: "" }],
      touched: {
        ...current.touched,
        MEALS: true,
      },
    }));
  };

  const handleMealFieldChange = (dayOrder, index, field, value) => {
    setDayValue(dayOrder, (current) => {
      const nextMeals = [...(current.MEALS || [])];
      nextMeals[index] = {
        ...nextMeals[index],
        [field]: value,
        ...(field === "RESTAURANT_ID" ? { MEAL_TYPE: "" } : {}),
      };

      return {
        ...current,
        MEALS: nextMeals,
        touched: {
          ...current.touched,
          MEALS: true,
        },
      };
    });

    if (field === "RESTAURANT_ID" && value) {
      dispatch(fetchRestaurantMeals(value));
    }
  };

  const addMealRow = (dayOrder) => {
    setDayValue(dayOrder, (current) => ({
      ...current,
      MEALS: [...(current.MEALS || []), { RESTAURANT_ID: "", MEAL_TYPE: "" }],
      touched: {
        ...current.touched,
        MEALS: true,
      },
    }));
  };

  const removeMealRow = (dayOrder, index) => {
    setDayValue(dayOrder, (current) => {
      const nextMeals = (current.MEALS || []).filter((_, i) => i !== index);
      return {
        ...current,
        MEALS: nextMeals.length ? nextMeals : [{ RESTAURANT_ID: "", MEAL_TYPE: "" }],
        touched: {
          ...current.touched,
          MEALS: true,
        },
      };
    });
  };

  const toggleDayCollapse = (dayOrder) => {
    setOpenDays((prev) => ({
      ...prev,
      [dayOrder]: !prev[dayOrder],
    }));
  };

  const resolvePlaces = (placesText) => {
    const rawValues = String(placesText || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    const resolved = [];
    const notFound = [];

    rawValues.forEach((name) => {
      const found = placesMap.get(name.toLowerCase());
      if (found) {
        resolved.push({
          PLACE_ID: getId(found),
        });
      } else {
        notFound.push(name);
      }
    });

    return { resolved, notFound };
  };

  const validateDay = (day) => {
    const errors = {};

    if (!day.TRANSPORTATION_TYPE) {
      errors.TRANSPORTATION_TYPE = "Transportation type is required.";
    }

    if (day.hasGuide && !day.GUIDE_TYPE) {
      errors.GUIDE_TYPE = "Guide type is required.";
    }

    if (day.hasMeals) {
      const hasInvalidMeal = (day.MEALS || []).some(
        (item) => !item.RESTAURANT_ID || !item.MEAL_TYPE
      );
      if (hasInvalidMeal) {
        errors.MEALS = "Restaurant and meal type are required.";
      }
    }

    const { notFound } = resolvePlaces(day.PLACES_TEXT);
    if (notFound.length > 0) {
      errors.PLACES_TEXT = `Unknown places: ${notFound.join(", ")}`;
    }

    return errors;
  };

  const resolveMealTypeForPayload = (restaurantId, selectedValue, mealsByRestaurantId) => {
    const availableMeals = mealsByRestaurantId?.[restaurantId] || [];
    const matchedMeal = availableMeals.find((item) => {
      return (
        getId(item) === selectedValue ||
        item?.MEAL_TYPE === selectedValue ||
        getMealValue(item) === selectedValue
      );
    });

    return matchedMeal?.MEAL_TYPE || selectedValue;
  };

  const handleSaveDay = (day) => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    const errors = validateDay(day);
    if (Object.keys(errors).length > 0) {
      notifyError(Object.values(errors)[0]);
      setDayValue(day.DAY_ORDER, (current) => ({
        ...current,
        touched: {
          ...current.touched,
          TRANSPORTATION_TYPE: true,
          GUIDE_TYPE: true,
          PLACES_TEXT: true,
          MEALS: true,
        },
      }));
      return;
    }

    const { resolved } = resolvePlaces(day.PLACES_TEXT);

    const payload = {
      ORIGINAL_QUOTATION_ID: day.ORIGINAL_QUOTATION_ID,
      DAY_ORDER: day.DAY_ORDER,
      DAY_DATE: day.DAY_DATE,
      TRANSPORTATION_TYPE: day.TRANSPORTATION_TYPE,
      GUIDE_TYPE: day.hasGuide ? day.GUIDE_TYPE || null : null,
      MEALS: day.hasMeals
        ? day.MEALS.map((item) => ({
            RESTAURANT_ID: item.RESTAURANT_ID,
            MEAL_TYPE: resolveMealTypeForPayload(
              item.RESTAURANT_ID,
              item.MEAL_TYPE,
              restaurantMealsByRestaurantId
            ),
          }))
        : [],
      PLACES: resolved,
    };

    setSavingDayOrder(day.DAY_ORDER);

    const onDone = () => {
      setSavingDayOrder(null);
      dispatch(fetchQuotationDays(id));
    };

    if (day._id) {
      dispatch(updateQuotationDay(day._id, payload, onDone));
    } else {
      dispatch(createQuotationDay(payload, onDone));
    }
  };

  useEffect(() => {
    if (!loading) {
      setSavingDayOrder(null);
    }
  }, [loading]);

  document.title = "Quotation Plan | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Plan Quotation" />

          <Row className="mb-3">
            <Col xl="8">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <h4 className="card-title mb-1">Travel Quotation Plan</h4>
                      <p className="card-title-desc mb-0">
                        Each day is saved and edited individually.
                      </p>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                      <Badge color="primary" pill>
                        {nights} nights
                      </Badge>
                      <Badge color="light" className="text-dark" pill>
                        {totalDays} days
                      </Badge>
                    </div>
                  </div>

                  <Row className="mt-4 gy-3">
                    <Col md="6">
                      <div>
                        <div className="text-muted small">Arrival</div>
                        <div className="fw-semibold">{arrivingDate || "-"}</div>
                      </div>
                    </Col>
                    <Col md="6">
                      <div>
                        <div className="text-muted small">Departure</div>
                        <div className="fw-semibold">{departureDate || "-"}</div>
                      </div>
                    </Col>
                  </Row>

                  {!quotation?._id ? (
                    <Alert color="warning" className="mt-4 mb-0">
                      Quotation not found.{" "}
                      <Link to="/quotations" className="alert-link">
                        Go back
                      </Link>
                    </Alert>
                  ) : null}
                </CardBody>
              </Card>
            </Col>

            <Col xl="4">
              <Card>
                <CardBody>
                  <h4 className="card-title mb-3">Quick Access</h4>
                  <div className="d-grid gap-2">
                    <Button
                      color="primary"
                      type="button"
                      onClick={() => navigate(`/quotations/${id}/accommodation`)}
                    >
                      Accommodation
                    </Button>

                    <Button
                      color="primary"
                      type="button"
                      onClick={() => navigate(`/quotations/${id}/extra-services`)}
                    >
                      Extra Services
                    </Button>

                    <Button
                      color="light"
                      onClick={() => navigate(`/quotations/${id}`)}
                    >
                      Summary
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>

          {!quotation?._id ? null : loading && !dayForms.length ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : (
            dayForms.map((day) => {
              const dayErrors = validateDay(day);
              const isSaved = !!day._id;
              const isSavingThisDay = savingDayOrder === day.DAY_ORDER;

              return (
                <Card key={day.DAY_ORDER}>
                  <CardBody>
                    <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                      <div className="d-flex align-items-center gap-3">
                        <div>
                          <h4 className="card-title mb-0">Day {day.DAY_ORDER}</h4>
                          <p className="card-title-desc mb-0">{day.DAY_DATE}</p>
                        </div>
                        {isSaved ? (
                          <Badge color="success" pill>
                            Saved
                          </Badge>
                        ) : (
                          <Badge color="warning" pill>
                            Draft
                          </Badge>
                        )}
                      </div>

                      <div className="d-flex gap-2">
                        <Button
                          color="light"
                          type="button"
                          onClick={() => toggleDayCollapse(day.DAY_ORDER)}
                        >
                          <i
                            className={`bx ${
                              openDays[day.DAY_ORDER]
                                ? "bx-chevron-up"
                                : "bx-chevron-down"
                            } me-1`}
                          />
                          {openDays[day.DAY_ORDER] ? "Hide" : "Show"}
                        </Button>
                      </div>
                    </div>

                    <Collapse isOpen={!!openDays[day.DAY_ORDER]}>
                      <Row className="mt-4">
                        <Col lg="6">
                          <div className="border rounded p-3 mb-3">
                            <div className="mb-3">
                              <Label className="form-label">Transportation Type</Label>
                              <Input
                                type="select"
                                value={day.TRANSPORTATION_TYPE}
                                onChange={(e) =>
                                  handleFieldChange(
                                    day.DAY_ORDER,
                                    "TRANSPORTATION_TYPE",
                                    e.target.value
                                  )
                                }
                                invalid={
                                  !!(
                                    day.touched.TRANSPORTATION_TYPE &&
                                    dayErrors.TRANSPORTATION_TYPE
                                  )
                                }
                                disabled={lookupsLoading}
                              >
                                <option value="">Select Transportation Type</option>
                                {transportationTypes.map((item) => (
                                  <option key={getId(item)} value={getId(item)}>
                                    {getTransportationTypeLabel(item)}
                                  </option>
                                ))}
                              </Input>
                              <FormFeedback>{dayErrors.TRANSPORTATION_TYPE}</FormFeedback>
                            </div>
                          </div>
                        </Col>

                        <Col lg="6">
                          <div className="border rounded p-3 mb-3">
                            <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center mb-3">
                              <div>
                                <h5 className="mb-1">Guide</h5>
                                <div className="text-muted small">
                                  Enable guide for this day.
                                </div>
                              </div>

                              <div className="d-flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  color={day.hasGuide ? "primary" : "light"}
                                  onClick={() =>
                                    handleToggleGuide(day.DAY_ORDER, true)
                                  }
                                >
                                  <i className="bx bx-check me-1" />
                                  Yes
                                </Button>
                                <Button
                                  type="button"
                                  color={!day.hasGuide ? "danger" : "light"}
                                  onClick={() =>
                                    handleToggleGuide(day.DAY_ORDER, false)
                                  }
                                >
                                  <i className="bx bx-x me-1" />
                                  No
                                </Button>
                              </div>
                            </div>

                            {day.hasGuide ? (
                              <div>
                                <Label className="form-label">Guide Type</Label>
                                <Input
                                  type="select"
                                  value={day.GUIDE_TYPE}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      day.DAY_ORDER,
                                      "GUIDE_TYPE",
                                      e.target.value
                                    )
                                  }
                                  invalid={
                                    !!(day.touched.GUIDE_TYPE && dayErrors.GUIDE_TYPE)
                                  }
                                  disabled={lookupsLoading}
                                >
                                  <option value="">Select Guide Type</option>
                                  {guideTypes.map((item) => (
                                    <option key={getId(item)} value={getId(item)}>
                                      {getGuideTypeLabel(item)}
                                    </option>
                                  ))}
                                </Input>
                                <FormFeedback>{dayErrors.GUIDE_TYPE}</FormFeedback>
                              </div>
                            ) : (
                              <div className="text-muted small">
                                Guide is disabled for this day.
                              </div>
                            )}
                          </div>
                        </Col>

                        <Col lg="12">
                          <div className="border rounded p-3 mb-3">
                            <div className="d-flex flex-wrap justify-content-between gap-2 align-items-center mb-3">
                              <div>
                                <h5 className="mb-1">Meals</h5>
                                <div className="text-muted small">
                                  Select restaurant, then meal type.
                                </div>
                              </div>

                              <div className="d-flex flex-wrap mb-3">
                                <Button
                                  type="button"
                                  color={day.hasMeals ? "primary" : "light"}
                                  onClick={() =>
                                    handleToggleMeals(day.DAY_ORDER, true)
                                  }
                                >
                                  <i className="bx bx-check me-1" />
                                  Yes
                                </Button>
                                <Button
                                  type="button"
                                  color={!day.hasMeals ? "danger" : "light"}
                                  onClick={() =>
                                    handleToggleMeals(day.DAY_ORDER, false)
                                  }
                                >
                                  <i className="bx bx-x me-1" />
                                  No
                                </Button>
                              </div>
                            </div>

                            {day.hasMeals ? (
                              <>
                                {(day.MEALS || []).map((meal, index) => {
                                  const availableMeals =
                                    restaurantMealsByRestaurantId?.[
                                      meal.RESTAURANT_ID
                                    ] || [];
                                  const mealsLoading =
                                    !!mealsLoadingByRestaurantId?.[
                                      meal.RESTAURANT_ID
                                    ];

                                  return (
                                    <Row
                                      key={`${day.DAY_ORDER}-${index}`}
                                      className="align-items-end"
                                    >
                                      <Col md="5">
                                        <div className="mb-3">
                                          <Label className="form-label">
                                            Restaurant
                                          </Label>
                                          <Input
                                            type="select"
                                            value={meal.RESTAURANT_ID}
                                            onChange={(e) =>
                                              handleMealFieldChange(
                                                day.DAY_ORDER,
                                                index,
                                                "RESTAURANT_ID",
                                                e.target.value
                                              )
                                            }
                                            disabled={lookupsLoading}
                                          >
                                            <option value="">Select Restaurant</option>
                                            {restaurants.map((item) => (
                                              <option
                                                key={getId(item)}
                                                value={getId(item)}
                                              >
                                                {getRestaurantLabel(item)}
                                              </option>
                                            ))}
                                          </Input>
                                        </div>
                                      </Col>

                                      <Col md="5">
                                        <div className="mb-3">
                                          <Label className="form-label">
                                            Meal Type
                                          </Label>
                                          <Input
                                            type="select"
                                            value={meal.MEAL_TYPE}
                                            onChange={(e) =>
                                              handleMealFieldChange(
                                                day.DAY_ORDER,
                                                index,
                                                "MEAL_TYPE",
                                                e.target.value
                                              )
                                            }
                                            disabled={!meal.RESTAURANT_ID}
                                          >
                                            <option value="">
                                              {mealsLoading
                                                ? "Loading meals..."
                                                : "Select Meal Type"}
                                            </option>
                                            {availableMeals.map((item, mealIndex) => (
                                              <option
                                                key={
                                                  getId(item) ||
                                                  `${getMealValue(item)}-${mealIndex}`
                                                }
                                                value={getMealValue(item)}
                                              >
                                                {getMealLabel(item)}
                                              </option>
                                            ))}
                                          </Input>
                                        </div>
                                      </Col>

                                      <Col md="2">
                                        <div className="mb-3 d-flex gap-2">
                                          <Button
                                            color="light"
                                            type="button"
                                            onClick={() => addMealRow(day.DAY_ORDER)}
                                          >
                                            <i className="bx bx-plus" />
                                          </Button>
                                          <Button
                                            color="light"
                                            type="button"
                                            onClick={() =>
                                              removeMealRow(day.DAY_ORDER, index)
                                            }
                                          >
                                            <i className="bx bx-trash" />
                                          </Button>
                                        </div>
                                      </Col>
                                    </Row>
                                  );
                                })}
                              </>
                            ) : (
                              <div className="text-muted small">
                                Meals are disabled for this day.
                              </div>
                            )}
                          </div>
                        </Col>

                        <Col lg="12">
                          <div className="mb-3">
                            <Label className="form-label">Places</Label>
                            <Input
                              value={day.PLACES_TEXT}
                              onChange={(e) =>
                                handleFieldChange(
                                  day.DAY_ORDER,
                                  "PLACES_TEXT",
                                  e.target.value
                                )
                              }
                              placeholder="Amman, Petra, Amman"
                              invalid={
                                !!(
                                  day.touched.PLACES_TEXT && dayErrors.PLACES_TEXT
                                )
                              }
                              disabled={lookupsLoading}
                            />
                            <FormFeedback>{dayErrors.PLACES_TEXT}</FormFeedback>
                          </div>
                        </Col>

                        <Col lg="12">
                          <div className="d-flex gap-2">
                            <Button
                              color="primary"
                              type="button"
                              onClick={() => handleSaveDay(day)}
                              disabled={isSavingThisDay}
                            >
                              {isSavingThisDay ? (
                                <Spinner size="sm" className="me-2" />
                              ) : null}
                              {day._id ? "Update Day" : "Save Day"}
                            </Button>
                            <Button
                              color="light"
                              type="button"
                              onClick={() => {
                                if (day._id) {
                                  dispatch(fetchQuotationDays(id));
                                  notifyInfo(
                                    `Day ${day.DAY_ORDER} restored from backend.`
                                  );
                                } else {
                                  setDayForms((prev) =>
                                    prev.map((item) =>
                                      item.DAY_ORDER === day.DAY_ORDER
                                        ? buildDayState({
                                            quotationId: quotation._id,
                                            order: day.DAY_ORDER,
                                            date: day.DAY_DATE,
                                            existing: null,
                                          })
                                        : item
                                    )
                                  );
                                }
                              }}
                            >
                              Reset Day
                            </Button>
                          </div>
                        </Col>
                      </Row>
                    </Collapse>
                  </CardBody>
                </Card>
              );
            })
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default PlanQuotation;