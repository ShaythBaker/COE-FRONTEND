// path: src/pages/Places/PlaceDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Col,
  Container,
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
import { fetchPlace, fetchPlacesLookups, updatePlace } from "../../store/Places/actions";
import { hasAnyRole } from "../../helpers/coe_roles";
import {
  ATTACHMENT_TYPES,
  extractAttachmentErrorMessage,
  getAttachmentDownloadUrl,
  openAttachment,
  uploadAttachmentAndGetId,
} from "../../helpers/attachments_helper";
import { notifyError, notifyInfo } from "../../helpers/notify";

const EDIT_ROLES = ["COMPANY_ADMIN", "CONTRACTING", "TOUR_OPERATION"];

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

const nationalityLabel = (nationalityValue, nationalities) => {
  const id = getIdValue(nationalityValue);
  const match = nationalities.find((x) => x?._id === id);

  return (
    match?.LIST_ITEM_VALUE_EN ||
    match?.LIST_ITEM_VALUE ||
    match?.ITEM_VALUE ||
    match?.LIST_ITEM_NAME ||
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

const emptyFee = () => ({
  ENTRANCE_FEE_NATIONALATY: "",
  ENTRANCE_FEE_AMOUNT: "",
});

const BasicInfoModal = ({
  isOpen,
  toggle,
  form,
  setForm,
  onSubmit,
  loading,
  cities,
  errors,
  canEdit,
}) => {
  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <Modal isOpen={isOpen} toggle={toggle} size="lg">
      <ModalHeader toggle={toggle}>Edit Place Info</ModalHeader>
      <ModalBody>
        <Row>
          <Col md={6}>
            <div className="mb-3">
              <Label className="form-label">Place Name</Label>
              <Input
                value={form.PLACE_NAME}
                onChange={(e) => setField("PLACE_NAME", e.target.value)}
                invalid={Boolean(errors.PLACE_NAME)}
                disabled={!canEdit || loading}
              />
              {errors.PLACE_NAME ? (
                <div className="invalid-feedback d-block">{errors.PLACE_NAME}</div>
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
                disabled={!canEdit || loading}
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
                <div className="invalid-feedback d-block">{errors.PLACE_CITY}</div>
              ) : null}
            </div>
          </Col>

          <Col xs="12">
            <div className="mb-0">
              <Label className="form-label">Description</Label>
              <Input
                type="textarea"
                rows="4"
                value={form.PLACE_DESCRIPTION}
                onChange={(e) => setField("PLACE_DESCRIPTION", e.target.value)}
                invalid={Boolean(errors.PLACE_DESCRIPTION)}
                disabled={!canEdit || loading}
              />
              {errors.PLACE_DESCRIPTION ? (
                <div className="invalid-feedback d-block">{errors.PLACE_DESCRIPTION}</div>
              ) : null}
            </div>
          </Col>
        </Row>
      </ModalBody>
      <ModalFooter>
        <Button color="secondary" onClick={toggle} disabled={loading}>
          Cancel
        </Button>
        <Button color="primary" onClick={onSubmit} disabled={!canEdit || loading}>
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            "Update Info"
          )}
        </Button>
      </ModalFooter>
    </Modal>
  );
};

const PlaceDetailsPage = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const roles = useSelector((state) => state.Login?.roles || []);
  const placesState = useSelector((state) => state.Places || {});
  const selected = placesState.selected || null;
  const loading = Boolean(placesState.loading);
  const lookups = placesState.lookups || {};
  const cities = normalizeList(lookups.CITIES);
  const nationalities = normalizeList(lookups.NATIONALITIES);

  const canEdit = hasAnyRole(roles, EDIT_ROLES);

  const [basicInfoModal, setBasicInfoModal] = useState(false);
  const [basicInfoForm, setBasicInfoForm] = useState({
    PLACE_NAME: "",
    PLACE_CITY: "",
    PLACE_DESCRIPTION: "",
  });
  const [basicInfoErrors, setBasicInfoErrors] = useState({});
  const [savingInfo, setSavingInfo] = useState(false);

  const [imageUrls, setImageUrls] = useState([]);
  const [newFiles, setNewFiles] = useState([]);
  const [savingImages, setSavingImages] = useState(false);

  const [fees, setFees] = useState([emptyFee()]);
  const [savingFees, setSavingFees] = useState(false);

  useEffect(() => {
    dispatch(fetchPlacesLookups());
  }, [dispatch]);

  useEffect(() => {
    if (id) {
      dispatch(fetchPlace(id));
    }
  }, [dispatch, id]);

  useEffect(() => {
    if (!selected?._id) return;

    document.title = `${selected?.PLACE_NAME || "Place"} | COE Skote`;

    setBasicInfoForm({
      PLACE_NAME: selected?.PLACE_NAME || "",
      PLACE_CITY: getIdValue(selected?.PLACE_CITY),
      PLACE_DESCRIPTION: selected?.PLACE_DESCRIPTION || "",
    });

    setFees(
      Array.isArray(selected?.ENTRANCE_FEES) && selected.ENTRANCE_FEES.length
        ? selected.ENTRANCE_FEES.map((fee) => ({
            ENTRANCE_FEE_NATIONALATY: getIdValue(fee?.ENTRANCE_FEE_NATIONALATY),
            ENTRANCE_FEE_AMOUNT:
              fee?.ENTRANCE_FEE_AMOUNT === 0 || fee?.ENTRANCE_FEE_AMOUNT
                ? String(fee.ENTRANCE_FEE_AMOUNT)
                : "",
          }))
        : [emptyFee()],
    );
  }, [selected]);

  useEffect(() => {
    let cancelled = false;

    const loadImages = async () => {
      const ids = extractPlaceImageIds(selected);
      const next = [];

      for (const attachmentId of ids) {
        try {
          const url = await getAttachmentDownloadUrl(attachmentId);
          next.push({ id: attachmentId, url });
        } catch (e) {
          next.push({ id: attachmentId, url: "" });
        }
      }

      if (!cancelled) {
        setImageUrls(next);
      }
    };

    if (selected?._id) {
      loadImages();
    }

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const onDrop = (acceptedFiles) => {
    if (!canEdit) {
      notifyError("Permission mismatch: you are not allowed to update place images.");
      return;
    }

    setNewFiles((prev) => [...prev, ...acceptedFiles]);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
    },
    disabled: !canEdit || savingImages,
  });

  const stackedPreviewImages = useMemo(() => imageUrls.slice(0, 3), [imageUrls]);

  const validateBasicInfo = () => {
    const nextErrors = {};

    if (!String(basicInfoForm.PLACE_NAME || "").trim()) {
      nextErrors.PLACE_NAME = "Place name is required.";
    }

    if (!String(basicInfoForm.PLACE_CITY || "").trim()) {
      nextErrors.PLACE_CITY = "City is required.";
    }

    if (!String(basicInfoForm.PLACE_DESCRIPTION || "").trim()) {
      nextErrors.PLACE_DESCRIPTION = "Description is required.";
    }

    setBasicInfoErrors(nextErrors);

    if (Object.keys(nextErrors).length) {
      notifyError("Validation failed. Please fix the highlighted fields.");
      return false;
    }

    return true;
  };

  const saveBasicInfo = () => {
    if (!canEdit) {
      notifyError("Permission mismatch: you are not allowed to update this place.");
      return;
    }

    if (!validateBasicInfo()) return;

    setSavingInfo(true);

    dispatch(
      updatePlace(
        id,
        {
          PLACE_NAME: String(basicInfoForm.PLACE_NAME || "").trim(),
          PLACE_CITY: basicInfoForm.PLACE_CITY,
          PLACE_DESCRIPTION: String(basicInfoForm.PLACE_DESCRIPTION || "").trim(),
        },
        () => {
          setSavingInfo(false);
          setBasicInfoModal(false);
          dispatch(fetchPlace(id));
        },
      ),
    );
  };

  const removeCurrentImage = (attachmentId) => {
    if (!canEdit) {
      notifyError("Permission mismatch: you are not allowed to update place images.");
      return;
    }

    setImageUrls((prev) => prev.filter((item) => item.id !== attachmentId));
  };

  const removeNewFile = (index) => {
    setNewFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const saveImages = async () => {
    if (!canEdit) {
      notifyError("Permission mismatch: you are not allowed to update place images.");
      return;
    }

    setSavingImages(true);

    try {
      const uploadedIds = [];

      for (const file of newFiles) {
        const attachmentId = await uploadAttachmentAndGetId({
          file,
          ATTACHMENT_TYPE: ATTACHMENT_TYPES.PLACE_IMAGE,
          META: {
            module: "PLACE",
            fileName: file?.name || "",
            placeId: id,
          },
        });

        if (attachmentId) {
          uploadedIds.push(attachmentId);
        }
      }

      const currentIds = imageUrls.map((item) => item.id).filter(Boolean);

      dispatch(
        updatePlace(
          id,
          {
            PLACE_IMAGE_ATTACHMENT_IDS: [...currentIds, ...uploadedIds],
          },
          () => {
            setSavingImages(false);
            setNewFiles([]);
            dispatch(fetchPlace(id));
          },
        ),
      );
    } catch (error) {
      setSavingImages(false);
      notifyError(
        extractAttachmentErrorMessage(error, "Failed to upload place images."),
      );
    }
  };

  const addFeeRow = () => {
    if (!canEdit) {
      notifyError("Permission mismatch: you are not allowed to update entrance fees.");
      return;
    }

    setFees((prev) => [...prev, emptyFee()]);
  };

  const removeFeeRow = (index) => {
    if (!canEdit) {
      notifyError("Permission mismatch: you are not allowed to update entrance fees.");
      return;
    }

    setFees((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length ? next : [emptyFee()];
    });
  };

  const setFeeField = (index, name, value) => {
    setFees((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [name]: value,
      };
      return next;
    });
  };

  const validateFees = () => {
    const cleaned = fees.filter(
      (fee) =>
        String(fee?.ENTRANCE_FEE_NATIONALATY || "").trim() ||
        String(fee?.ENTRANCE_FEE_AMOUNT || "").trim(),
    );

    if (!cleaned.length) {
      notifyError("Validation failed. At least one entrance fee is required.");
      return null;
    }

    const invalidRow = cleaned.find(
      (fee) =>
        !String(fee?.ENTRANCE_FEE_NATIONALATY || "").trim() ||
        String(fee?.ENTRANCE_FEE_AMOUNT || "").trim() === "" ||
        Number(fee?.ENTRANCE_FEE_AMOUNT) < 0,
    );

    if (invalidRow) {
      notifyError("Validation failed. Every entrance fee row needs nationality and a valid amount.");
      return null;
    }

    return cleaned.map((fee) => ({
      ENTRANCE_FEE_NATIONALATY: fee.ENTRANCE_FEE_NATIONALATY,
      ENTRANCE_FEE_AMOUNT: Number(fee.ENTRANCE_FEE_AMOUNT),
    }));
  };

  const saveFees = () => {
    if (!canEdit) {
      notifyError("Permission mismatch: you are not allowed to update entrance fees.");
      return;
    }

    const cleanedPayload = validateFees();
    if (!cleanedPayload) return;

    setSavingFees(true);

    dispatch(
      updatePlace(
        id,
        {
          ENTRANCE_FEES: cleanedPayload,
        },
        () => {
          setSavingFees(false);
          dispatch(fetchPlace(id));
        },
      ),
    );
  };

  const openImage = async (attachmentId) => {
    try {
      await openAttachment(attachmentId);
    } catch (e) {
      notifyError("Failed to open the image.");
    }
  };

  if (loading && !selected?._id) {
    return (
      <div className="page-content">
        <Container fluid>
          <div className="text-center py-5">
            <Spinner color="primary" />
          </div>
        </Container>
      </div>
    );
  }

  if (!selected?._id && !loading) {
    return (
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Operations" breadcrumbItem="Place Details" />
          <Card>
            <CardBody className="text-center py-5">
              <h5 className="mb-3">Place not found</h5>
              <Link to="/places" className="btn btn-primary">
                Back to Places
              </Link>
            </CardBody>
          </Card>
        </Container>
      </div>
    );
  }

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Operations" breadcrumbItem="Place Details" />

        <Row className="mb-3">
          <Col xs="12">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
              <div>
                <Link to="/places" className="btn btn-light">
                  <i className="bx bx-arrow-back me-1" />
                  Back to Places
                </Link>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <Button color="primary" outline onClick={() => setBasicInfoModal(true)} disabled={!canEdit}>
                  Edit Info
                </Button>
                <Button color="light" onClick={() => navigate("/places")}>
                  Go to List
                </Button>
              </div>
            </div>
          </Col>
        </Row>

        <Row>
          <Col xl="4">
            <Card className="overflow-hidden">
              <div className="bg-primary bg-soft p-4">
                <div className="d-flex align-items-start justify-content-between">
                  <div>
                    <p className="text-primary fw-medium mb-2">Place Summary</p>
                    <h4 className="mb-1">{selected?.PLACE_NAME || "-"}</h4>
                    <p className="text-muted mb-0">{cityLabel(selected?.PLACE_CITY, cities)}</p>
                  </div>

                  <div className="position-relative" style={{ minWidth: 120, height: 64 }}>
                    {stackedPreviewImages.length ? (
                      stackedPreviewImages.map((image, index) => (
                        <img
                          key={image.id}
                          src={image.url}
                          alt={`place-${index + 1}`}
                          className={`rounded position-absolute top-0 border border-white shadow-sm ${
                            index === 0 ? "z-3" : index === 1 ? "z-2" : "z-1"
                          }`}
                          style={{
                            width: 56,
                            height: 56,
                            objectFit: "cover",
                            right: `${index * 26}px`,
                          }}
                        />
                      ))
                    ) : (
                      <div
                        className="rounded bg-light d-flex align-items-center justify-content-center position-absolute top-0 end-0 z-1"
                        style={{ width: 56, height: 56 }}
                      >
                        <i className="bx bx-image fs-3 text-muted" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <CardBody>
                <div className="mb-4">
                  <Label className="text-muted d-block mb-1">Name</Label>
                  <h5 className="mb-0">{selected?.PLACE_NAME || "-"}</h5>
                </div>

                <div className="mb-4">
                  <Label className="text-muted d-block mb-1">City</Label>
                  <h6 className="mb-0">{cityLabel(selected?.PLACE_CITY, cities)}</h6>
                </div>

                <div>
                  <Label className="text-muted d-block mb-1">Description</Label>
                  <p className="mb-0">{selected?.PLACE_DESCRIPTION || "-"}</p>
                </div>
              </CardBody>
            </Card>
          </Col>

          <Col xl="8">
            <Card>
              <CardHeader>
                <h4 className="card-title mb-0">Images</h4>
              </CardHeader>
              <CardBody>
                <div
                  {...getRootProps()}
                  className={`dropzone border rounded p-4 text-center mb-4 ${
                    isDragActive ? "bg-light" : ""
                  }`}
                  style={{ cursor: canEdit ? "pointer" : "not-allowed" }}
                >
                  <input {...getInputProps()} />
                  <div className="mb-2">
                    <i className="display-5 text-primary bx bxs-cloud-upload" />
                  </div>
                  <h5 className="mb-2">Drop images here or click to upload</h5>
                  <p className="text-muted mb-0">
                    Skote Dropzone style for place images with preview and update flow.
                  </p>
                </div>

                {!!newFiles.length && (
                  <div className="mb-4">
                    <h6 className="mb-3">New Upload Queue</h6>
                    <div className="d-flex flex-wrap gap-3">
                      {newFiles.map((file, index) => {
                        const preview = URL.createObjectURL(file);

                        return (
                          <div
                            key={`${file.name}-${index}`}
                            className="position-relative border rounded overflow-hidden"
                            style={{ width: 120, height: 120 }}
                          >
                            <img
                              src={preview}
                              alt={file.name}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 z-3"
                              onClick={() => removeNewFile(index)}
                            >
                              <i className="bx bx-x" />
                            </button>
                            <div className="position-absolute bottom-0 start-0 end-0 p-1 bg-dark bg-opacity-50 text-white small z-2">
                              {file.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="mb-4">
                  <h6 className="mb-3">Current Images</h6>
                  {imageUrls.length ? (
                    <div className="d-flex flex-wrap gap-3">
                      {imageUrls.map((image) => (
                        <div
                          key={image.id}
                          className="position-relative border rounded overflow-hidden"
                          style={{ width: 160, height: 160 }}
                        >
                          {image.url ? (
                            <img
                              src={image.url}
                              alt={image.id}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                cursor: "pointer",
                              }}
                              onClick={() => openImage(image.id)}
                            />
                          ) : (
                            <div className="w-100 h-100 bg-light d-flex align-items-center justify-content-center">
                              <i className="bx bx-image fs-1 text-muted" />
                            </div>
                          )}

                          <div className="position-absolute top-0 start-0 m-2 z-2">
                            <Badge color="dark">Image</Badge>
                          </div>

                          {canEdit ? (
                            <button
                              type="button"
                              className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2 z-3"
                              onClick={() => removeCurrentImage(image.id)}
                            >
                              <i className="bx bx-trash" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted">No images saved yet.</div>
                  )}
                </div>

                <div className="d-flex flex-wrap gap-2">
                  <Button color="primary" onClick={saveImages} disabled={!canEdit || savingImages}>
                    {savingImages ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Saving Images...
                      </>
                    ) : (
                      "Save Images"
                    )}
                  </Button>
                  <Button
                    color="light"
                    onClick={() => {
                      setNewFiles([]);
                      dispatch(fetchPlace(id));
                    }}
                    disabled={savingImages}
                  >
                    Reset Images
                  </Button>
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader className="d-flex align-items-center justify-content-between">
                <h4 className="card-title mb-0">Entrance Fees</h4>
                <Button color="primary" size="sm" onClick={addFeeRow} disabled={!canEdit}>
                  Add Fee
                </Button>
              </CardHeader>
              <CardBody>
                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap">
                    <thead>
                      <tr>
                        <th>Nationality</th>
                        <th>Amount</th>
                        <th style={{ width: 90 }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fees.map((fee, index) => (
                        <tr key={`fee-${index}`}>
                          <td>
                            <Input
                              type="select"
                              value={fee.ENTRANCE_FEE_NATIONALATY}
                              onChange={(e) =>
                                setFeeField(index, "ENTRANCE_FEE_NATIONALATY", e.target.value)
                              }
                              disabled={!canEdit || savingFees}
                            >
                              <option value="">Select nationality</option>
                              {nationalities.map((item) => (
                                <option key={item?._id} value={item?._id}>
                                  {item?.LIST_ITEM_VALUE_EN ||
                                    item?.LIST_ITEM_VALUE ||
                                    item?.ITEM_VALUE ||
                                    item?.LIST_ITEM_NAME ||
                                    item?._id}
                                </option>
                              ))}
                            </Input>
                          </td>
                          <td>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={fee.ENTRANCE_FEE_AMOUNT}
                              onChange={(e) =>
                                setFeeField(index, "ENTRANCE_FEE_AMOUNT", e.target.value)
                              }
                              disabled={!canEdit || savingFees}
                            />
                          </td>
                          <td>
                            <Button
                              color="danger"
                              outline
                              size="sm"
                              onClick={() => removeFeeRow(index)}
                              disabled={!canEdit || savingFees}
                            >
                              Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>

                {selected?.ENTRANCE_FEES?.length ? (
                  <div className="mt-3">
                    <h6 className="mb-2">Current Saved Fees</h6>
                    {selected.ENTRANCE_FEES.map((fee, index) => (
                      <div key={`saved-fee-${index}`} className="text-muted mb-1">
                        {nationalityLabel(fee?.ENTRANCE_FEE_NATIONALATY, nationalities)} -{" "}
                        {fee?.ENTRANCE_FEE_AMOUNT}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted mt-3">No entrance fees saved yet.</div>
                )}

                <div className="mt-4">
                  <Button color="primary" onClick={saveFees} disabled={!canEdit || savingFees}>
                    {savingFees ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Saving Fees...
                      </>
                    ) : (
                      "Save Entrance Fees"
                    )}
                  </Button>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>

        <BasicInfoModal
          isOpen={basicInfoModal}
          toggle={() => {
            if (savingInfo) return;
            setBasicInfoModal(false);
            setBasicInfoErrors({});
            setBasicInfoForm({
              PLACE_NAME: selected?.PLACE_NAME || "",
              PLACE_CITY: getIdValue(selected?.PLACE_CITY),
              PLACE_DESCRIPTION: selected?.PLACE_DESCRIPTION || "",
            });
          }}
          form={basicInfoForm}
          setForm={setBasicInfoForm}
          onSubmit={saveBasicInfo}
          loading={savingInfo}
          cities={cities}
          errors={basicInfoErrors}
          canEdit={canEdit}
        />
      </Container>
    </div>
  );
};

export default PlaceDetailsPage;