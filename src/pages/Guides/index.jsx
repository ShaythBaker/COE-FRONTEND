// path: src/pages/Guides/index.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
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
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";
import { buildGuideReservationUsageMap } from "../../helpers/reservation_options";
import {
  deleteGuide,
  fetchGuideLanguages,
  fetchGuides,
  createGuide,
  updateGuide,
} from "../../store/Guides/actions";
import { fetchReservationFiles } from "../../store/ReservationFiles/actions";
import {
  ATTACHMENT_TYPES,
  getAttachmentDownloadUrl,
  uploadAttachmentAndGetId,
} from "../../helpers/attachments_helper";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "TOUR_OPERATION", "OPERATION"];
const PAGE_SIZE_OPTIONS = [10, 20, 50];

const emptyForm = {
  GUIDE_NAME: "",
  GUIDE_PHONE: "",
  GUIDE_EMAIL: "",
  GUIDE_LANGUAGES: [],
  GUIDE_IMAGE_ID: "",
  ACTIVE_STATUS: true,
  GUIDE_ADDRESS: "",
  GUIDE_CITY: "",
  GUIDE_COUNTRY: "",
  GUIDE_GENDER: "",
  GUIDE_DATE_OF_BIRTH: "",
  GUIDE_LICENSE_NO: "",
  GUIDE_NOTES: "",
  GUIDE_NATIONALITY: "",
  GUIDE_EXPERIENCE: "",
};

const GUIDE_TYPE_LABELS = new Set([
  "local guide",
  "group guide",
  "guide type",
  "local",
  "group",
]);

const GENDER_OPTIONS = ["Male", "Female"];

const normalizeBooleanFilter = value => {
  if (value === "" || value === null || value === undefined) return undefined;
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return undefined;
};

const formatDateTime = value => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("en-GB");
};

const toCleanString = value => String(value || "").trim();

const normalizeLanguageToken = value => {
  const cleaned = toCleanString(value);
  if (!cleaned) return "";
  return cleaned.replace(/\s+/g, " ");
};

const isGuideTypeLikeValue = value => {
  const normalized = normalizeLanguageToken(value).toLowerCase();
  return GUIDE_TYPE_LABELS.has(normalized);
};

const getLanguageLabel = lang => {
  if (typeof lang === "string") return normalizeLanguageToken(lang);
  if (!lang || typeof lang !== "object") return "";

  return normalizeLanguageToken(
    lang.label ||
      lang.name ||
      lang.NAME ||
      lang.LABEL ||
      lang.VALUE ||
      lang.value ||
      lang.TEXT ||
      lang.TITLE ||
      lang.LIST_VALUE ||
      lang.LIST_ITEM_VALUE ||
      lang.ITEM_VALUE ||
      lang.DISPLAY_VALUE ||
      lang.GUIDE_TYPE_NAME ||
      lang.TYPE_NAME ||
      lang.KEY ||
      lang._id ||
      ""
  );
};

const getLanguageValue = lang => {
  if (typeof lang === "string") return normalizeLanguageToken(lang);
  if (!lang || typeof lang !== "object") return "";

  return normalizeLanguageToken(
    lang.value ||
      lang.VALUE ||
      lang.CODE ||
      lang.KEY ||
      lang.LIST_VALUE ||
      lang.LIST_ITEM_VALUE ||
      lang.ITEM_VALUE ||
      lang.DISPLAY_VALUE ||
      lang.label ||
      lang.name ||
      lang.NAME ||
      lang._id ||
      ""
  );
};

const normalizeDateInput = value => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const GuidesPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const guidesState = useSelector(state => state.Guides || {});
  const {
    loading,
    error,
    items,
    page,
    total,
    pages,
    languages,
    guideLanguages,
    languagesLoading,
  } = guidesState;

  const roles = useSelector(state => state.Login?.roles || []);
  const authUser = useSelector(state => state.Login || {});
  const reservationFiles = useSelector(
    state => state.ReservationFiles?.items || []
  );

  const canManageGuides = hasAnyRole(roles, ALLOWED_ROLES);

  const [queryInput, setQueryInput] = useState("");
  const [filters, setFilters] = useState({
    q: "",
    ACTIVE_STATUS: "",
    sortBy: "CREATED_ON",
    sortDir: "desc",
  });

  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [currentId, setCurrentId] = useState("");

  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const [languagesDropdownOpen, setLanguagesDropdownOpen] = useState(false);
  const [languageSearch, setLanguageSearch] = useState("");

  const appliedParams = useMemo(() => {
    const params = {
      page,
      limit: pageSize,
      sortBy: filters.sortBy,
      sortDir: filters.sortDir,
    };

    if (String(filters.q || "").trim()) {
      params.q = String(filters.q).trim();
    }

    const activeStatus = normalizeBooleanFilter(filters.ACTIVE_STATUS);
    if (activeStatus !== undefined) {
      params.ACTIVE_STATUS = activeStatus;
    }

    return params;
  }, [filters, page, pageSize]);

  const languageOptions = useMemo(() => {
    const map = new Map();

    const addOption = (rawValue, rawLabel) => {
      const value = normalizeLanguageToken(rawValue);
      const label = normalizeLanguageToken(rawLabel || rawValue);

      if (!value && !label) return;

      const finalValue = value || label;
      const finalLabel = label || value;

      if (!finalValue || !finalLabel) return;
      if (isGuideTypeLikeValue(finalValue) || isGuideTypeLikeValue(finalLabel)) return;

      const key = finalValue.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          value: finalValue,
          label: finalLabel,
        });
      }
    };

    const backendRaw =
      Array.isArray(guideLanguages) && guideLanguages.length > 0
        ? guideLanguages
        : Array.isArray(languages)
        ? languages
        : [];

    backendRaw.forEach(lang => {
      addOption(getLanguageValue(lang), getLanguageLabel(lang));
    });

    (Array.isArray(items) ? items : []).forEach(guide => {
      const arr = Array.isArray(guide?.GUIDE_LANGUAGES) ? guide.GUIDE_LANGUAGES : [];
      arr.forEach(lang => addOption(lang, lang));
    });

    const selectedArr = Array.isArray(form.GUIDE_LANGUAGES) ? form.GUIDE_LANGUAGES : [];
    selectedArr.forEach(lang => addOption(lang, lang));

    return Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );
  }, [guideLanguages, languages, items, form.GUIDE_LANGUAGES]);

  const filteredLanguages = useMemo(() => {
    const q = String(languageSearch || "").trim().toLowerCase();

    if (!q) return languageOptions;

    return languageOptions.filter(lang =>
      String(lang.label || "").toLowerCase().includes(q)
    );
  }, [languageOptions, languageSearch]);

  const guideReservationUsage = useMemo(
    () => buildGuideReservationUsageMap(reservationFiles),
    [reservationFiles]
  );

  useEffect(() => {
    document.title = "Guides | Skote";
  }, []);

  useEffect(() => {
    dispatch(fetchGuideLanguages());
  }, [dispatch]);

  useEffect(() => {
    dispatch(fetchGuides(appliedParams));
  }, [dispatch, appliedParams]);

  useEffect(() => {
    dispatch(fetchReservationFiles());
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      notifyError(error);
    }
  }, [error]);

  const resetModalState = () => {
    setModalOpen(false);
    setIsEdit(false);
    setCurrentId("");
    setForm(emptyForm);
    setTouched({});
    setImageFile(null);
    setImagePreview("");
    setSubmitting(false);
    setLanguagesDropdownOpen(false);
    setLanguageSearch("");
  };

  const toggleModal = () => {
    if (submitting) return;

    if (modalOpen) {
      resetModalState();
    } else {
      setModalOpen(true);
    }
  };

  const openCreateModal = () => {
    setIsEdit(false);
    setCurrentId("");
    setForm(emptyForm);
    setTouched({});
    setImageFile(null);
    setImagePreview("");
    setLanguageSearch("");
    setLanguagesDropdownOpen(false);
    setModalOpen(true);
  };

  const openEditModal = async guide => {
    setIsEdit(true);
    setCurrentId(guide?._id || "");
    setForm({
      GUIDE_NAME: guide?.GUIDE_NAME || "",
      GUIDE_PHONE: guide?.GUIDE_PHONE || "",
      GUIDE_EMAIL: guide?.GUIDE_EMAIL || "",
      GUIDE_LANGUAGES: Array.isArray(guide?.GUIDE_LANGUAGES)
        ? guide.GUIDE_LANGUAGES.map(x => normalizeLanguageToken(x)).filter(Boolean)
        : [],
      GUIDE_IMAGE_ID: guide?.GUIDE_IMAGE_ID || "",
      ACTIVE_STATUS:
        typeof guide?.ACTIVE_STATUS === "boolean" ? guide.ACTIVE_STATUS : true,
      GUIDE_ADDRESS: guide?.GUIDE_ADDRESS || "",
      GUIDE_CITY: guide?.GUIDE_CITY || "",
      GUIDE_COUNTRY: guide?.GUIDE_COUNTRY || "",
      GUIDE_GENDER: guide?.GUIDE_GENDER || "",
      GUIDE_DATE_OF_BIRTH: normalizeDateInput(guide?.GUIDE_DATE_OF_BIRTH),
      GUIDE_LICENSE_NO: guide?.GUIDE_LICENSE_NO || "",
      GUIDE_NOTES: guide?.GUIDE_NOTES || "",
      GUIDE_NATIONALITY: guide?.GUIDE_NATIONALITY || "",
      GUIDE_EXPERIENCE: guide?.GUIDE_EXPERIENCE || "",
    });
    setTouched({});
    setImageFile(null);
    setImagePreview("");
    setLanguageSearch("");
    setLanguagesDropdownOpen(false);

    if (guide?.GUIDE_IMAGE_ID) {
      try {
        const url = await getAttachmentDownloadUrl(guide.GUIDE_IMAGE_ID);
        setImagePreview(url || "");
      } catch {
        setImagePreview("");
      }
    }

    setModalOpen(true);
  };

  const validate = () => {
    const errors = {};

    if (!String(form.GUIDE_NAME || "").trim()) {
      errors.GUIDE_NAME = "Guide name is required.";
    }

    if (!String(form.GUIDE_PHONE || "").trim()) {
      errors.GUIDE_PHONE = "Guide phone is required.";
    } else {
      const phone = String(form.GUIDE_PHONE).trim();
      const phoneRegex = /^[0-9+\-().\s]{6,30}$/;
      if (!phoneRegex.test(phone)) {
        errors.GUIDE_PHONE =
          "Guide phone is invalid (allowed: digits, spaces, +, -, (), .; length 6-30).";
      }
    }

    if (!String(form.GUIDE_EMAIL || "").trim()) {
      errors.GUIDE_EMAIL = "Guide email is required.";
    } else {
      const email = String(form.GUIDE_EMAIL).trim();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        errors.GUIDE_EMAIL = "Guide email is invalid.";
      }
    }

    if (form.GUIDE_LANGUAGES && !Array.isArray(form.GUIDE_LANGUAGES)) {
      errors.GUIDE_LANGUAGES = "Guide languages must be a list.";
    }

    if (
      form.GUIDE_DATE_OF_BIRTH &&
      Number.isNaN(new Date(form.GUIDE_DATE_OF_BIRTH).getTime())
    ) {
      errors.GUIDE_DATE_OF_BIRTH = "Date of birth is invalid.";
    }

    return errors;
  };

  const currentErrors = validate();

  const handleInputChange = event => {
    const { name, value, type, checked } = event.target;

    if (type === "checkbox") {
      setForm(prev => ({
        ...prev,
        [name]: checked,
      }));
      return;
    }

    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleLanguageSelection = languageValue => {
    const normalizedValue = normalizeLanguageToken(languageValue);
    if (!normalizedValue) return;

    setForm(prev => {
      const current = Array.isArray(prev.GUIDE_LANGUAGES)
        ? prev.GUIDE_LANGUAGES.map(x => normalizeLanguageToken(x)).filter(Boolean)
        : [];

      const exists = current.includes(normalizedValue);

      return {
        ...prev,
        GUIDE_LANGUAGES: exists
          ? current.filter(item => item !== normalizedValue)
          : [...current, normalizedValue],
      };
    });
  };

  const removeSelectedLanguage = language => {
    const normalizedValue = normalizeLanguageToken(language);

    setForm(prev => ({
      ...prev,
      GUIDE_LANGUAGES: (prev.GUIDE_LANGUAGES || []).filter(
        item => normalizeLanguageToken(item) !== normalizedValue
      ),
    }));
  };

  const clearSelectedLanguages = () => {
    setForm(prev => ({
      ...prev,
      GUIDE_LANGUAGES: [],
    }));
  };

  const handleImageChange = event => {
    const file = event.target.files?.[0];
    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSearch = () => {
    setFilters(prev => ({
      ...prev,
      q: queryInput,
    }));
    dispatch(
      fetchGuides({
        ...appliedParams,
        page: 1,
        limit: pageSize,
        q: queryInput,
      })
    );
  };

  const handleClearSearch = () => {
    setQueryInput("");
    setFilters(prev => ({
      ...prev,
      q: "",
    }));
    dispatch(
      fetchGuides({
        page: 1,
        limit: pageSize,
        sortBy: filters.sortBy,
        sortDir: filters.sortDir,
        ACTIVE_STATUS: normalizeBooleanFilter(filters.ACTIVE_STATUS),
      })
    );
  };

  const handleDelete = guide => {
    if (!canManageGuides) {
      notifyError("Forbidden: insufficient role");
      return;
    }

    const ok = window.confirm(
      `Are you sure you want to delete guide "${guide?.GUIDE_NAME || ""}"?`
    );

    if (!ok) return;

    dispatch(
      deleteGuide(guide?._id, () => {
        dispatch(fetchGuides({ ...appliedParams }));
      })
    );
  };

  const handleSubmit = async () => {
    const errors = validate();
    setTouched({
      GUIDE_NAME: true,
      GUIDE_PHONE: true,
      GUIDE_EMAIL: true,
      GUIDE_LANGUAGES: true,
      GUIDE_IMAGE_ID: true,
      GUIDE_DATE_OF_BIRTH: true,
    });

    if (Object.keys(errors).length > 0) {
      notifyError("Please fix the validation errors before saving.");
      return;
    }

    if (!canManageGuides) {
      notifyError("Forbidden: insufficient role");
      return;
    }

    try {
      setSubmitting(true);

      let guideImageId = form.GUIDE_IMAGE_ID || "";

      if (imageFile) {
        guideImageId = await uploadAttachmentAndGetId({
          file: imageFile,
          ATTACHMENT_TYPE: ATTACHMENT_TYPES.GUIDE_IMAGE,
          OWNER_USER_ID: authUser?.sub || undefined,
          META: {
            module: "GUIDES",
            guideId: currentId || null,
            fileName: imageFile.name,
          },
        });
      }

      const payload = {
        GUIDE_NAME: String(form.GUIDE_NAME || "").trim(),
        GUIDE_PHONE: String(form.GUIDE_PHONE || "").trim(),
        GUIDE_EMAIL: String(form.GUIDE_EMAIL || "").trim(),
        GUIDE_LANGUAGES: Array.isArray(form.GUIDE_LANGUAGES)
          ? form.GUIDE_LANGUAGES.map(x => normalizeLanguageToken(x)).filter(Boolean)
          : [],
        GUIDE_IMAGE_ID: guideImageId || null,
        ACTIVE_STATUS: !!form.ACTIVE_STATUS,
        GUIDE_ADDRESS: String(form.GUIDE_ADDRESS || "").trim(),
        GUIDE_CITY: String(form.GUIDE_CITY || "").trim(),
        GUIDE_COUNTRY: String(form.GUIDE_COUNTRY || "").trim(),
        GUIDE_GENDER: String(form.GUIDE_GENDER || "").trim(),
        GUIDE_DATE_OF_BIRTH: form.GUIDE_DATE_OF_BIRTH || null,
        GUIDE_LICENSE_NO: String(form.GUIDE_LICENSE_NO || "").trim(),
        GUIDE_NOTES: String(form.GUIDE_NOTES || "").trim(),
        GUIDE_NATIONALITY: String(form.GUIDE_NATIONALITY || "").trim(),
        GUIDE_EXPERIENCE: String(form.GUIDE_EXPERIENCE || "").trim(),
      };

      if (isEdit && currentId) {
        dispatch(
          updateGuide(currentId, payload, () => {
            resetModalState();
            dispatch(fetchGuides({ ...appliedParams }));
          })
        );
      } else {
        dispatch(
          createGuide(payload, () => {
            resetModalState();
            dispatch(
              fetchGuides({
                ...appliedParams,
                page: 1,
                limit: pageSize,
              })
            );
          })
        );
      }
    } catch (submitError) {
      notifyError(
        submitError?.message || "Failed while uploading guide image."
      );
      setSubmitting(false);
    }
  };

  const handlePageChange = nextPage => {
    if (nextPage < 1 || nextPage > Number(pages || 1)) return;
    dispatch(
      fetchGuides({
        ...appliedParams,
        page: nextPage,
        limit: pageSize,
      })
    );
  };

  const visibleCount = Array.isArray(items) ? items.length : 0;
  const selectedLanguages = Array.isArray(form.GUIDE_LANGUAGES)
    ? form.GUIDE_LANGUAGES.map(x => normalizeLanguageToken(x)).filter(Boolean)
    : [];

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Operations" breadcrumbItem="Guides" />

          <Row>
            <Col xs="12">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-4">
                    <div>
                      <h4 className="card-title mb-1">Guides</h4>
                      <p className="card-title-desc mb-0">
                        Manage guide name, phone, email, languages, image, and
                        active status.
                      </p>
                    </div>

                    <Button
                      color="primary"
                      onClick={openCreateModal}
                      disabled={!canManageGuides}
                    >
                      <i className="bx bx-plus me-1" />
                      Add Guide
                    </Button>
                  </div>

                  {!canManageGuides ? (
                    <Alert color="warning">
                      You can view guides, but your role does not allow create,
                      update, or delete.
                    </Alert>
                  ) : null}

                  <Row className="g-3 mb-3">
                    <Col md="4">
                      <Label className="form-label">Search by guide name</Label>
                      <div className="d-flex gap-2">
                        <Input
                          value={queryInput}
                          onChange={e => setQueryInput(e.target.value)}
                          placeholder="Type guide name"
                        />
                        <Button color="primary" onClick={handleSearch}>
                          Search
                        </Button>
                        <Button color="light" onClick={handleClearSearch}>
                          Clear
                        </Button>
                      </div>
                    </Col>

                    <Col md="2">
                      <Label className="form-label">Status</Label>
                      <Input
                        type="select"
                        value={filters.ACTIVE_STATUS}
                        onChange={e => {
                          const value = e.target.value;
                          setFilters(prev => ({
                            ...prev,
                            ACTIVE_STATUS: value,
                          }));
                          dispatch(
                            fetchGuides({
                              ...appliedParams,
                              page: 1,
                              limit: pageSize,
                              ACTIVE_STATUS: normalizeBooleanFilter(value),
                            })
                          );
                        }}
                      >
                        <option value="">All</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </Input>
                    </Col>

                    <Col md="2">
                      <Label className="form-label">Sort By</Label>
                      <Input
                        type="select"
                        value={filters.sortBy}
                        onChange={e => {
                          const value = e.target.value;
                          setFilters(prev => ({
                            ...prev,
                            sortBy: value,
                          }));
                          dispatch(
                            fetchGuides({
                              ...appliedParams,
                              page: 1,
                              limit: pageSize,
                              sortBy: value,
                            })
                          );
                        }}
                      >
                        <option value="CREATED_ON">Created On</option>
                        <option value="GUIDE_NAME">Guide Name</option>
                        <option value="UPDATED_ON">Updated On</option>
                      </Input>
                    </Col>

                    <Col md="2">
                      <Label className="form-label">Sort Direction</Label>
                      <Input
                        type="select"
                        value={filters.sortDir}
                        onChange={e => {
                          const value = e.target.value;
                          setFilters(prev => ({
                            ...prev,
                            sortDir: value,
                          }));
                          dispatch(
                            fetchGuides({
                              ...appliedParams,
                              page: 1,
                              limit: pageSize,
                              sortDir: value,
                            })
                          );
                        }}
                      >
                        <option value="desc">Descending</option>
                        <option value="asc">Ascending</option>
                      </Input>
                    </Col>

                    <Col md="2">
                      <Label className="form-label">Page Size</Label>
                      <Input
                        type="select"
                        value={pageSize}
                        onChange={e => {
                          const value = Number(e.target.value || 10);
                          setPageSize(value);
                          dispatch(
                            fetchGuides({
                              ...appliedParams,
                              page: 1,
                              limit: value,
                            })
                          );
                        }}
                      >
                        {PAGE_SIZE_OPTIONS.map(size => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </Input>
                    </Col>
                  </Row>

                  <div className="text-muted mb-3">
                    Showing <b>{visibleCount}</b> of <b>{total || 0}</b> guide(s)
                  </div>

                  {loading ? (
                    <div className="text-center py-5">
                      <Spinner color="primary" />
                    </div>
                  ) : !Array.isArray(items) || items.length === 0 ? (
                    <Alert color="info" fade={false} className="mb-0">
                      No guides found.
                    </Alert>
                  ) : (
                    <div className="table-responsive">
                      <Table className="table align-middle table-nowrap mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>Guide</th>
                            <th>Phone</th>
                            <th>Email</th>
                            <th>Languages</th>
                            <th>Image</th>
                            <th>Status</th>
                            <th>Updated On</th>
                            <th style={{ width: 220 }}>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(guide => {
                            const usageRefs =
                              guideReservationUsage.get(
                                String(guide?.GUIDE_NAME || "").trim().toLowerCase()
                              ) || [];

                            return (
                            <tr key={guide?._id}>
                              <td>
                                <div className="fw-semibold">
                                  {guide?.GUIDE_NAME || "-"}
                                </div>
                                {usageRefs.length ? (
                                  <div className="d-flex flex-wrap gap-1 mt-1">
                                    {usageRefs.slice(0, 3).map(reference => (
                                      <Badge
                                        key={`${guide?._id}-${reference}`}
                                        color="info"
                                        className="fw-normal"
                                      >
                                        Chosen in reservation file {reference}
                                      </Badge>
                                    ))}
                                    {usageRefs.length > 3 ? (
                                      <Badge color="secondary">
                                        +{usageRefs.length - 3}
                                      </Badge>
                                    ) : null}
                                  </div>
                                ) : null}
                                <div className="text-muted small">
                                  {guide?._id || "-"}
                                </div>
                              </td>
                              <td>{guide?.GUIDE_PHONE || "-"}</td>
                              <td>{guide?.GUIDE_EMAIL || "-"}</td>
                              <td>
                                {Array.isArray(guide?.GUIDE_LANGUAGES) &&
                                guide.GUIDE_LANGUAGES.length > 0 ? (
                                  <div className="d-flex flex-wrap gap-1">
                                    {guide.GUIDE_LANGUAGES.slice(0, 4).map(lang => (
                                      <Badge
                                        key={`${guide?._id}-${lang}`}
                                        color="light"
                                        className="text-dark border"
                                      >
                                        {lang}
                                      </Badge>
                                    ))}
                                    {guide.GUIDE_LANGUAGES.length > 4 ? (
                                      <Badge color="secondary">
                                        +{guide.GUIDE_LANGUAGES.length - 4}
                                      </Badge>
                                    ) : null}
                                  </div>
                                ) : (
                                  "-"
                                )}
                              </td>
                              <td>
                                {guide?.GUIDE_IMAGE_ID ? (
                                  <Badge color="success">Uploaded</Badge>
                                ) : (
                                  <Badge
                                    color="light"
                                    className="text-dark border"
                                  >
                                    No Image
                                  </Badge>
                                )}
                              </td>
                              <td>
                                <Badge
                                  color={
                                    guide?.ACTIVE_STATUS
                                      ? "success"
                                      : "secondary"
                                  }
                                  pill
                                >
                                  {guide?.ACTIVE_STATUS
                                    ? "Active"
                                    : "Inactive"}
                                </Badge>
                              </td>
                              <td>
                                {formatDateTime(
                                  guide?.UPDATED_ON || guide?.CREATED_ON
                                )}
                              </td>
                              <td>
                                <div className="d-flex gap-2 flex-wrap">
                                  <Button
                                    size="sm"
                                    color="primary"
                                    onClick={() => navigate(`/guides/${guide?._id}`)}
                                  >
                                    View
                                  </Button>
                                  <Button
                                    size="sm"
                                    color="light"
                                    className="border"
                                    onClick={() => openEditModal(guide)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    color="danger"
                                    onClick={() => handleDelete(guide)}
                                    disabled={!canManageGuides || !guide?.ACTIVE_STATUS}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              </td>
                            </tr>
                            );
                          })}
                        </tbody>
                      </Table>
                    </div>
                  )}

                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-4">
                    <div className="text-muted">
                      Page <b>{page || 1}</b> of <b>{pages || 1}</b>
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        color="light"
                        className="border"
                        onClick={() => handlePageChange(Number(page || 1) - 1)}
                        disabled={Number(page || 1) <= 1 || loading}
                      >
                        Previous
                      </Button>
                      <Button
                        color="light"
                        className="border"
                        onClick={() => handlePageChange(Number(page || 1) + 1)}
                        disabled={Number(page || 1) >= Number(pages || 1) || loading}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={modalOpen} toggle={toggleModal} size="lg" centered>
        <ModalHeader toggle={toggleModal}>
          {isEdit ? "Edit Guide" : "Add Guide"}
        </ModalHeader>

        <ModalBody>
          <Row className="g-3">
            <Col md="6">
              <Label className="form-label">Guide Name</Label>
              <Input
                name="GUIDE_NAME"
                value={form.GUIDE_NAME}
                onChange={handleInputChange}
                invalid={!!(touched.GUIDE_NAME && currentErrors.GUIDE_NAME)}
              />
              <FormFeedback>{currentErrors.GUIDE_NAME}</FormFeedback>
            </Col>

            <Col md="6">
              <Label className="form-label">Guide Phone</Label>
              <Input
                name="GUIDE_PHONE"
                value={form.GUIDE_PHONE}
                onChange={handleInputChange}
                invalid={!!(touched.GUIDE_PHONE && currentErrors.GUIDE_PHONE)}
                placeholder="+962 79 999 9999"
              />
              <FormFeedback>{currentErrors.GUIDE_PHONE}</FormFeedback>
            </Col>

            <Col md="6">
              <Label className="form-label">Guide Email</Label>
              <Input
                name="GUIDE_EMAIL"
                type="email"
                value={form.GUIDE_EMAIL}
                onChange={handleInputChange}
                invalid={!!(touched.GUIDE_EMAIL && currentErrors.GUIDE_EMAIL)}
              />
              <FormFeedback>{currentErrors.GUIDE_EMAIL}</FormFeedback>
            </Col>

            <Col md="6">
              <Label className="form-label">Status</Label>
              <div className="d-flex align-items-center gap-2 pt-2">
                <Input
                  id="guide-active-status"
                  name="ACTIVE_STATUS"
                  type="checkbox"
                  checked={!!form.ACTIVE_STATUS}
                  onChange={handleInputChange}
                />
                <Label for="guide-active-status" className="mb-0">
                  Active
                </Label>
              </div>
            </Col>

            <Col md="6">
              <Label className="form-label">Nationality</Label>
              <Input
                name="GUIDE_NATIONALITY"
                value={form.GUIDE_NATIONALITY}
                onChange={handleInputChange}
              />
            </Col>

            <Col md="6">
              <Label className="form-label">Experience</Label>
              <Input
                name="GUIDE_EXPERIENCE"
                value={form.GUIDE_EXPERIENCE}
                onChange={handleInputChange}
                placeholder="e.g. 5 years"
              />
            </Col>

            <Col md="6">
              <Label className="form-label">Gender</Label>
              <Input
                type="select"
                name="GUIDE_GENDER"
                value={form.GUIDE_GENDER}
                onChange={handleInputChange}
              >
                <option value="">Select gender</option>
                {GENDER_OPTIONS.map(option => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Input>
            </Col>

            <Col md="6">
              <Label className="form-label">Date of Birth</Label>
              <Input
                type="date"
                name="GUIDE_DATE_OF_BIRTH"
                value={form.GUIDE_DATE_OF_BIRTH}
                onChange={handleInputChange}
                invalid={
                  !!(
                    touched.GUIDE_DATE_OF_BIRTH &&
                    currentErrors.GUIDE_DATE_OF_BIRTH
                  )
                }
              />
              <FormFeedback>{currentErrors.GUIDE_DATE_OF_BIRTH}</FormFeedback>
            </Col>

            <Col md="6">
              <Label className="form-label">City</Label>
              <Input
                name="GUIDE_CITY"
                value={form.GUIDE_CITY}
                onChange={handleInputChange}
              />
            </Col>

            <Col md="6">
              <Label className="form-label">Country</Label>
              <Input
                name="GUIDE_COUNTRY"
                value={form.GUIDE_COUNTRY}
                onChange={handleInputChange}
              />
            </Col>

            <Col md="12">
              <Label className="form-label">Address</Label>
              <Input
                name="GUIDE_ADDRESS"
                value={form.GUIDE_ADDRESS}
                onChange={handleInputChange}
              />
            </Col>

            <Col md="6">
              <Label className="form-label">License No.</Label>
              <Input
                name="GUIDE_LICENSE_NO"
                value={form.GUIDE_LICENSE_NO}
                onChange={handleInputChange}
              />
            </Col>

            <Col md="12">
              <Label className="form-label">Languages</Label>

              <Dropdown
                isOpen={languagesDropdownOpen}
                toggle={() => setLanguagesDropdownOpen(prev => !prev)}
              >
                <DropdownToggle
                  color="light"
                  className={`w-100 text-start d-flex justify-content-between align-items-center border ${
                    touched.GUIDE_LANGUAGES && currentErrors.GUIDE_LANGUAGES
                      ? "is-invalid"
                      : ""
                  }`}
                  caret
                >
                  <div className="d-flex flex-wrap gap-1">
                    {selectedLanguages.length > 0 ? (
                      selectedLanguages.slice(0, 4).map(language => (
                        <Badge
                          key={language}
                          color="primary"
                          pill
                          className="me-1"
                        >
                          {language}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted">
                        Select one or more languages
                      </span>
                    )}

                    {selectedLanguages.length > 4 ? (
                      <Badge color="secondary" pill>
                        +{selectedLanguages.length - 4}
                      </Badge>
                    ) : null}
                  </div>
                </DropdownToggle>

                <DropdownMenu
                  className="w-100 p-2"
                  style={{ maxHeight: 320, overflowY: "auto" }}
                >
                  <div className="mb-2" onClick={e => e.stopPropagation()}>
                    <Input
                      value={languageSearch}
                      onChange={e => setLanguageSearch(e.target.value)}
                      placeholder="Search language..."
                    />
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-2 px-1">
                    <small className="text-muted">
                      {selectedLanguages.length} selected
                    </small>
                    {selectedLanguages.length > 0 ? (
                      <Button
                        type="button"
                        color="link"
                        className="p-0 text-decoration-none"
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          clearSelectedLanguages();
                        }}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>

                  {languagesLoading ? (
                    <div className="text-center py-2">
                      <Spinner size="sm" />
                    </div>
                  ) : filteredLanguages.length > 0 ? (
                    filteredLanguages.map(language => {
                      const checked = selectedLanguages.includes(language.value);

                      return (
                        <DropdownItem
                          key={language.value || language.label}
                          toggle={false}
                          className="px-2 py-2"
                          onClick={e => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLanguageSelection(language.value);
                          }}
                        >
                          <div className="form-check mb-0">
                            <Input
                              type="checkbox"
                              checked={checked}
                              readOnly
                              className="form-check-input"
                            />
                            <Label className="form-check-label mb-0 ms-2">
                              {language.label}
                            </Label>
                          </div>
                        </DropdownItem>
                      );
                    })
                  ) : (
                    <div className="text-muted px-2 py-2">
                      No languages found.
                    </div>
                  )}
                </DropdownMenu>
              </Dropdown>

              {selectedLanguages.length > 0 ? (
                <div className="d-flex flex-wrap gap-1 mt-2">
                  {selectedLanguages.map(language => (
                    <Badge
                      key={language}
                      color="light"
                      className="text-dark border d-inline-flex align-items-center"
                      style={{ gap: 6 }}
                    >
                      {language}
                      <button
                        type="button"
                        onClick={() => removeSelectedLanguage(language)}
                        style={{
                          border: "none",
                          background: "transparent",
                          padding: 0,
                          lineHeight: 1,
                          cursor: "pointer",
                        }}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              ) : null}

              {touched.GUIDE_LANGUAGES && currentErrors.GUIDE_LANGUAGES ? (
                <div className="invalid-feedback d-block">
                  {currentErrors.GUIDE_LANGUAGES}
                </div>
              ) : null}

              <small className="text-muted d-block mt-2">
                You can search and select multiple languages.
              </small>
            </Col>

            <Col md="12">
              <Label className="form-label">Notes</Label>
              <Input
                type="textarea"
                rows="4"
                name="GUIDE_NOTES"
                value={form.GUIDE_NOTES}
                onChange={handleInputChange}
              />
            </Col>

            <Col md="12">
              <Label className="form-label">Guide Image</Label>
              <Input type="file" accept="image/*" onChange={handleImageChange} />
              <div className="mt-2 text-muted small">
                Upload image first, then the attachment id will be saved into
                GUIDE_IMAGE_ID.
              </div>

              {imagePreview ? (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt="Guide Preview"
                    style={{
                      width: 120,
                      height: 120,
                      objectFit: "cover",
                      borderRadius: 12,
                      border: "1px solid #e9e9ef",
                    }}
                  />
                </div>
              ) : form.GUIDE_IMAGE_ID ? (
                <div className="mt-2">
                  <Badge color="success">Existing image linked</Badge>
                </div>
              ) : null}
            </Col>
          </Row>
        </ModalBody>

        <ModalFooter>
          <Button color="light" onClick={toggleModal} disabled={submitting}>
            Cancel
          </Button>
          <Button color="primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Spinner size="sm" className="me-2" />
                Saving...
              </>
            ) : isEdit ? (
              "Update Guide"
            ) : (
              "Create Guide"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </React.Fragment>
  );
};

export default GuidesPage;
