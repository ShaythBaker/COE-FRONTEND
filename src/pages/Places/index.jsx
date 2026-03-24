// path: src/pages/Places/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
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
import Breadcrumbs from "../../components/Common/Breadcrumb";
import {
  fetchPlaces,
  createPlace,
  deletePlace,
  fetchPlacesLookups,
} from "../../store/Places/actions";
import { hasAnyRole } from "../../helpers/coe_roles";
import {
  getAttachmentDownloadUrl,
  openAttachment,
} from "../../helpers/attachments_helper";
import { notifyError, notifyInfo } from "../../helpers/notify";

const CREATE_ROLES = ["COMPANY_ADMIN", "CONTRACTING", "TOUR_OPERATION"];
const DELETE_ROLES = ["COMPANY_ADMIN"];

const emptyForm = () => ({
  PLACE_NAME: "",
  PLACE_CITY: "",
  PLACE_DESCRIPTION: "",
});

const getIdValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") return value._id || value.id || "";
  return "";
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.rows)) return value.rows;
  return [];
};

const cityLabel = (cityValue, cities) => {
  const id = getIdValue(cityValue);
  const match = cities.find((x) => x?._id === id);

  return (
    match?.LIST_ITEM_VALUE_EN ||
    match?.LIST_ITEM_VALUE ||
    match?.ITEM_VALUE ||
    match?.LIST_ITEM_NAME ||
    cityValue?.PLACE_CITY_NAME ||
    id ||
    "-"
  );
};

const extractPlaceImageIds = (place) => {
  const raw = Array.isArray(place?.PLACE_IMAGE_ATTACHMENT_IDS)
    ? place.PLACE_IMAGE_ATTACHMENT_IDS
    : [];
  return raw.map(getIdValue).filter(Boolean);
};

const PlaceCreateModal = ({
  isOpen,
  toggle,
  onSubmit,
  loading,
  form,
  setForm,
  errors,
  cities,
  canCreate,
}) => {
  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Create Place</ModalHeader>
      <ModalBody>
        <Form>
          <Row>
            <Col md={6}>
              <div className="mb-3">
                <Label className="form-label">Place Name</Label>
                <Input
                  value={form.PLACE_NAME}
                  onChange={(e) => setField("PLACE_NAME", e.target.value)}
                  invalid={Boolean(errors.PLACE_NAME)}
                  disabled={!canCreate || loading}
                />
                {errors.PLACE_NAME ? (
                  <div className="invalid-feedback d-block">
                    {errors.PLACE_NAME}
                  </div>
                ) : null}
              </div>
            </Col>

            <Col md={6}>
              <div className="mb-3">
                <Label className="form-label">City</Label>
                <Input
                  type="select"
                  value={form.PLACE_CITY}
                  onChange={(e) => setField("PLACE_CITY", e.target.value)}
                  invalid={Boolean(errors.PLACE_CITY)}
                  disabled={!canCreate || loading}
                >
                  <option value="">Select city</option>
                  {cities.map((city) => (
                    <option key={city?._id} value={city?._id}>
                      {city?.LIST_ITEM_VALUE_EN ||
                        city?.LIST_ITEM_VALUE ||
                        city?.ITEM_VALUE ||
                        city?.LIST_ITEM_NAME ||
                        city?._id}
                    </option>
                  ))}
                </Input>
                {errors.PLACE_CITY ? (
                  <div className="invalid-feedback d-block">
                    {errors.PLACE_CITY}
                  </div>
                ) : null}
              </div>
            </Col>
          </Row>

          <div className="mb-0">
            <Label className="form-label">Description</Label>
            <Input
              type="textarea"
              rows="4"
              value={form.PLACE_DESCRIPTION}
              onChange={(e) => setField("PLACE_DESCRIPTION", e.target.value)}
              invalid={Boolean(errors.PLACE_DESCRIPTION)}
              disabled={!canCreate || loading}
            />
            {errors.PLACE_DESCRIPTION ? (
              <div className="invalid-feedback d-block">
                {errors.PLACE_DESCRIPTION}
              </div>
            ) : null}
          </div>
        </Form>
      </ModalBody>

      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={loading}>
          Cancel
        </Button>
        <Button color="primary" onClick={onSubmit} disabled={!canCreate || loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            "Create Place"
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const PlacesPage = () => {
  document.title = "Places | COE Skote";

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const roles = useSelector((state) => state.Login?.roles || []);
  const placesState = useSelector((state) => state.Places || {});

  const items = normalizeList(placesState.items);
  const loading = Boolean(placesState.loading);
  const error = placesState.error || "";
  const lookups = placesState.lookups || {};
  const cities = normalizeList(lookups.CITIES);

  const canCreate = hasAnyRole(roles, CREATE_ROLES);
  const canDelete = hasAnyRole(roles, DELETE_ROLES);

  const [selectedCity, setSelectedCity] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [imageUrlsByPlace, setImageUrlsByPlace] = useState({});

  useEffect(() => {
    dispatch(fetchPlacesLookups());
  }, [dispatch]);

  useEffect(() => {
    const params = {};
    if (selectedCity) {
      params.PLACE_CITY = selectedCity;
    }
    dispatch(fetchPlaces(params));
  }, [dispatch, selectedCity]);

  useEffect(() => {
    let cancelled = false;

    const loadImageUrls = async () => {
      const next = {};

      for (const place of items) {
        const imageIds = extractPlaceImageIds(place);
        if (!imageIds.length) {
          next[place?._id] = "";
          continue;
        }

        try {
          const url = await getAttachmentDownloadUrl(imageIds[0]);
          next[place?._id] = url || "";
        } catch (e) {
          next[place?._id] = "";
        }
      }

      if (!cancelled) {
        setImageUrlsByPlace(next);
      }
    };

    loadImageUrls();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const openCreate = () => {
    if (!canCreate) {
      notifyError("Permission mismatch: you are not allowed to create places.");
      return;
    }

    setErrors({});
    setForm(emptyForm());
    setModalOpen(true);
  };

  const validateForm = () => {
    const nextErrors = {};

    if (!String(form.PLACE_NAME || "").trim()) {
      nextErrors.PLACE_NAME = "Place name is required.";
    }

    if (!String(form.PLACE_CITY || "").trim()) {
      nextErrors.PLACE_CITY = "City is required.";
    }

    if (!String(form.PLACE_DESCRIPTION || "").trim()) {
      nextErrors.PLACE_DESCRIPTION = "Description is required.";
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      notifyError("Validation failed. Please fix the highlighted fields.");
      return false;
    }

    return true;
  };

  const handleCreate = () => {
    if (!canCreate) {
      notifyError("Permission mismatch: you are not allowed to create places.");
      return;
    }

    if (!validateForm()) return;

    setSubmitting(true);

    const payload = {
      PLACE_NAME: String(form.PLACE_NAME || "").trim(),
      PLACE_CITY: form.PLACE_CITY,
      PLACE_DESCRIPTION: String(form.PLACE_DESCRIPTION || "").trim(),
    };

    dispatch(
      createPlace(payload, (created) => {
        setSubmitting(false);
        setModalOpen(false);
        setForm(emptyForm());
        setErrors({});

        if (created?._id) {
          navigate(`/places/${created._id}`);
          return;
        }

        dispatch(fetchPlaces(selectedCity ? { PLACE_CITY: selectedCity } : {}));
      }),
    );
  };

  const handleDelete = (place) => {
    if (!canDelete) {
      notifyError("Permission mismatch: only COMPANY_ADMIN can delete places.");
      return;
    }

    const yes = window.confirm(
      `Delete place "${place?.PLACE_NAME || "this place"}"? This will soft delete it.`,
    );
    if (!yes) return;

    dispatch(
      deletePlace(place?._id, () => {
        dispatch(fetchPlaces(selectedCity ? { PLACE_CITY: selectedCity } : {}));
      }),
    );
  };

  const handleView = (place) => {
    navigate(`/places/${place?._id}`);
  };

  const handleOpenFirstImage = async (place) => {
    const imageIds = extractPlaceImageIds(place);

    if (!imageIds.length) {
      notifyInfo("No image available for this place.");
      return;
    }

    try {
      await openAttachment(imageIds[0]);
    } catch (e) {
      notifyError("Failed to open the place image.");
    }
  };

  const rows = useMemo(() => items || [], [items]);

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Operations" breadcrumbItem="Places" />

        <Row>
          <Col xs="12">
            <Card>
              <CardBody>
                <div className="d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4">
                  <div>
                    <h4 className="card-title mb-1">Places</h4>
                    <p className="text-muted mb-0">
                      Create places from the list page, then manage images and entrance fees from
                      the details page.
                    </p>
                  </div>

                  <div className="d-flex flex-wrap align-items-end gap-2">
                    <div style={{ minWidth: 240 }}>
                      <Label className="form-label">Filter by city</Label>
                      <Input
                        type="select"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                      >
                        <option value="">All cities</option>
                        {cities.map((city) => (
                          <option key={city?._id} value={city?._id}>
                            {city?.LIST_ITEM_VALUE_EN ||
                              city?.LIST_ITEM_VALUE ||
                              city?.ITEM_VALUE ||
                              city?.LIST_ITEM_NAME ||
                              city?._id}
                          </option>
                        ))}
                      </Input>
                    </div>

                    <Button color="primary" onClick={openCreate} disabled={!canCreate}>
                      Create Place
                    </Button>
                  </div>
                </div>

                {error ? <div className="alert alert-danger">{error}</div> : null}

                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead>
                      <tr>
                        <th style={{ width: 90 }}>Image</th>
                        <th>Name</th>
                        <th>City</th>
                        <th style={{ width: 220 }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="text-center py-5">
                            <Spinner color="primary" />
                          </td>
                        </tr>
                      ) : rows.length ? (
                        rows.map((place) => {
                          const firstImageUrl = imageUrlsByPlace[place?._id] || "";

                          return (
                            <tr key={place?._id}>
                              <td>
                                {firstImageUrl ? (
                                  <img
                                    src={firstImageUrl}
                                    alt={place?.PLACE_NAME || "place"}
                                    style={{
                                      width: 56,
                                      height: 56,
                                      objectFit: "cover",
                                      borderRadius: 10,
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleOpenFirstImage(place)}
                                  />
                                ) : (
                                  <div
                                    className="bg-light d-flex align-items-center justify-content-center"
                                    style={{
                                      width: 56,
                                      height: 56,
                                      borderRadius: 10,
                                    }}
                                  >
                                    <i className="bx bx-image fs-3 text-muted" />
                                  </div>
                                )}
                              </td>
                              <td>{place?.PLACE_NAME || "-"}</td>
                              <td>{cityLabel(place?.PLACE_CITY, cities)}</td>
                              <td>
                                <div className="d-flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    color="primary"
                                    outline
                                    onClick={() => handleView(place)}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    color="danger"
                                    outline
                                    onClick={() => handleDelete(place)}
                                    disabled={!canDelete}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-5 text-muted">
                            No places found.
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

        <PlaceCreateModal
          isOpen={modalOpen}
          toggle={() => {
            if (submitting) return;
            setModalOpen(false);
            setErrors({});
            setForm(emptyForm());
          }}
          onSubmit={handleCreate}
          loading={submitting}
          form={form}
          setForm={setForm}
          errors={errors}
          cities={cities}
          canCreate={canCreate}
        />
      </Container>
    </div>
  );
};

export default PlacesPage;