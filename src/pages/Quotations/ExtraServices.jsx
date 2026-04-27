import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Spinner,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError, notifyInfo } from "../../helpers/notify";
import { fetchQuotation } from "../../store/Quotations/actions";
import {
  fetchExtraServices,
  fetchQuotationExtraServices,
  saveQuotationExtraServices,
} from "../../store/QuotationExtraServices/actions";
import {
  isQuotationReadOnly,
  getQuotationReadOnlyMessage,
  canViewQuotationPrices,
} from "../../helpers/quotation_pricing_helper";

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const normalizeName = value => String(value || "").trim().toLowerCase();

const getQuotationDisplayName = quotation =>
  quotation?.QUOTATION_NAME ||
  quotation?.TITLE ||
  quotation?.SUBJECT ||
  quotation?.GROUP_NAME ||
  quotation?.CLIENT_NAME ||
  quotation?._id ||
  "-";

const ExtraServicesQuotation = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const quotationState = useSelector(state => state.Quotations || {});
  const quotation = quotationState?.selected;

  const {
    availableItems = [],
    quotationItems = [],
    loading,
    saving,
  } = useSelector(state => state.QuotationExtraServices || {});

  const roles = useSelector(state => state.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);
  const canViewPrices = canViewQuotationPrices(roles);
  const readOnly = isQuotationReadOnly(quotation);
  const canEditQuotation = canMutate && !readOnly;

  const [selections, setSelections] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const selectedMap = useMemo(() => {
    const map = new Map();
    quotationItems.forEach(item => {
      map.set(normalizeName(item?.SERVICE_NAME), item);
    });
    return map;
  }, [quotationItems]);

  useEffect(() => {
    if (!id) return;
    dispatch(fetchQuotation(id));
    dispatch(fetchExtraServices());
    dispatch(fetchQuotationExtraServices(id));
  }, [dispatch, id]);

  useEffect(() => {
    const next = {};
    availableItems.forEach(item => {
      const key = normalizeName(item?.SERVICE_NAME);
      next[key] = selectedMap.has(key);
    });
    setSelections(next);
    setIsDirty(false);
  }, [availableItems, selectedMap]);

  const selectedCount = Object.values(selections).filter(Boolean).length;

  const formatMoney = value => {
    const number = Number(value);
    if (!Number.isFinite(number)) return "-";
    return number.toFixed(2);
  };

  const selectedServicesPayload = useMemo(() => {
    return availableItems
      .filter(item => selections[normalizeName(item?.SERVICE_NAME)])
      .map(item => ({
        SERVICE_NAME: item?.SERVICE_NAME || "",
        SERVICE_DESCRIPTION: item?.SERVICE_DESCRIPTION || "",
        SERVICE_COST_PP: Number(item?.SERVICE_COST_PP || 0),
      }));
  }, [availableItems, selections]);

  const handleToggle = (serviceName, nextValue) => {
    if (!canEditQuotation) {
      notifyError(
        readOnly
          ? getQuotationReadOnlyMessage(quotation)
          : "Permission/role mismatch"
      );
      return;
    }

    const key = normalizeName(serviceName);
    setSelections(prev => ({
      ...prev,
      [key]: nextValue,
    }));
    setIsDirty(true);
  };

  const handleSave = () => {
    if (!canEditQuotation) {
      notifyError(
        readOnly
          ? getQuotationReadOnlyMessage(quotation)
          : "Permission/role mismatch"
      );
      return;
    }

    if (!id) {
      notifyError("Quotation id is missing.");
      return;
    }

    dispatch(
      saveQuotationExtraServices(id, selectedServicesPayload, () => {
        notifyInfo("Extra services saved successfully.");
        setIsDirty(false);
      })
    );
  };

  document.title = "Quotation Extra Services | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs
            title="Quotations"
            breadcrumbItem="Quotation Extra Services"
          />

          <Row className="mb-4">
            <Col lg="12">
              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                    <div>
                      <h4 className="card-title mb-1">
                        {getQuotationDisplayName(quotation)}
                      </h4>
                      <p className="text-muted mb-0">
                        Reference: {quotation?.REFERANCE_NUMBER || "-"}
                      </p>
                    </div>

                    <div className="d-flex flex-wrap gap-2">
                      <Button
                        color="primary"
                        type="button"
                        onClick={() => navigate(`/quotations/${id}/plan`)}
                      >
                        Plan
                      </Button>

                      <Button
                        color="primary"
                        type="button"
                        onClick={() =>
                          navigate(`/quotations/${id}/accommodation`)
                        }
                      >
                        Accommodation
                      </Button>

                      <Button color="dark" type="button" disabled>
                        Extra Services
                      </Button>

                      <Button
                        color="light"
                        type="button"
                        onClick={() => navigate(`/quotations/${id}`)}
                      >
                        Summary
                      </Button>
                    </div>
                  </div>

                  {readOnly ? (
                    <Alert color="warning" className="mt-4 mb-0">
                      {getQuotationReadOnlyMessage(quotation)}
                    </Alert>
                  ) : null}
                </CardBody>
              </Card>
            </Col>
          </Row>

          {!quotation?._id ? null : loading ? (
            <div className="text-center py-5">
              <Spinner color="primary" />
            </div>
          ) : availableItems.length === 0 ? (
            <Alert color="info">
              No extra services are available in the system.
            </Alert>
          ) : (
            <>
              <Card className="border-0 shadow-sm overflow-hidden">
                <CardBody className="p-4">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                    <div>
                      <h4 className="card-title mb-1">Available Extra Services</h4>
                      <p className="text-muted mb-0">
                        Modern selection cards with clearer status and faster
                        editing.
                      </p>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      <Badge color="light" className="rounded-pill px-3 py-2">
                        Selected: {selectedCount}
                      </Badge>
                      {!canViewPrices ? (
                        <Badge color="warning" className="rounded-pill px-3 py-2">
                          Prices hidden for your role
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <fieldset disabled={saving}>
                    <Row className="g-3">
                      {availableItems.map(item => {
                        const key = normalizeName(item?.SERVICE_NAME);
                        const isSelected = !!selections[key];

                        return (
                          <Col lg="6" xl="4" key={item?._id || key}>
                            <div
                              className={`border rounded p-3 h-100 ${
                                isSelected ? "border-primary bg-light" : ""
                              }`}
                            >
                              <div className="d-flex justify-content-between align-items-start gap-3">
                                <div className="flex-grow-1">
                                  <div className="d-flex align-items-center flex-wrap gap-2 mb-2">
                                    <h5 className="mb-0">
                                      {item?.SERVICE_NAME || "-"}
                                    </h5>
                                    {isSelected ? (
                                      <Badge color="primary" pill>
                                        Selected
                                      </Badge>
                                    ) : (
                                      <Badge color="secondary" pill>
                                        Not Selected
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="text-muted mb-3">
                                    {item?.SERVICE_DESCRIPTION ||
                                      "No description provided."}
                                  </div>

                                  {canViewPrices ? (
                                    <div className="small fw-semibold text-primary">
                                      Cost per person:{" "}
                                      {formatMoney(item?.SERVICE_COST_PP)}
                                    </div>
                                  ) : (
                                    <div className="small text-muted">
                                      Price hidden
                                    </div>
                                  )}
                                </div>

                                <div className="d-flex flex-column gap-2">
                                  <Button
                                    type="button"
                                    color={isSelected ? "primary" : "light"}
                                    onClick={() =>
                                      handleToggle(item?.SERVICE_NAME, true)
                                    }
                                    disabled={!canEditQuotation || saving}
                                  >
                                    <i className="bx bx-check me-1" />
                                    Yes
                                  </Button>

                                  <Button
                                    type="button"
                                    color={!isSelected ? "danger" : "light"}
                                    onClick={() =>
                                      handleToggle(item?.SERVICE_NAME, false)
                                    }
                                    disabled={!canEditQuotation || saving}
                                  >
                                    <i className="bx bx-x me-1" />
                                    No
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Col>
                        );
                      })}
                    </Row>
                  </fieldset>
                </CardBody>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardBody className="p-4">
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-3 mb-4">
                    <div>
                      <h4 className="card-title mb-1">
                        Saved On This Quotation
                      </h4>
                      <p className="text-muted mb-0">
                        A simple clean summary of the currently attached extra
                        services.
                      </p>
                    </div>
                    <Badge color="success" className="rounded-pill px-3 py-2">
                      {quotationItems.length} active service(s)
                    </Badge>
                  </div>

                  {quotationItems.length === 0 ? (
                    <div className="text-muted">
                      No extra services have been added to this quotation yet.
                    </div>
                  ) : (
                    <Row className="g-3">
                      {quotationItems.map(item => (
                        <Col lg="6" key={item?._id || item?.SERVICE_NAME}>
                          <div className="border rounded p-3 h-100">
                            <div className="d-flex justify-content-between align-items-start gap-3">
                              <div>
                                <div className="fw-semibold fs-6 mb-1">
                                  {item?.SERVICE_NAME || "-"}
                                </div>
                                <div className="text-muted">
                                  {item?.SERVICE_DESCRIPTION ||
                                    "No description provided."}
                                </div>
                              </div>

                              {canViewPrices ? (
                                <Badge color="primary" className="rounded-pill px-3 py-2">
                                  {formatMoney(item?.SERVICE_COST_PP)}
                                </Badge>
                              ) : (
                                <Badge color="light" className="rounded-pill px-3 py-2">
                                  Hidden
                                </Badge>
                              )}
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </CardBody>
              </Card>

              <div className="d-flex justify-content-between align-items-center flex-wrap gap-3 mt-4">
                <Button
                  color="light"
                  type="button"
                  onClick={() => navigate(`/quotations/${id}/accommodation`)}
                >
                  <i className="bx bx-left-arrow-alt me-1" />
                  Back
                </Button>

                <div className="d-flex gap-2">
                  <Button
                    color="primary"
                    type="button"
                    onClick={handleSave}
                    disabled={!canEditQuotation || !isDirty || saving}
                  >
                    {saving ? (
                      <>
                        <Spinner size="sm" className="me-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bx bx-save me-1" />
                        Save Changes
                      </>
                    )}
                  </Button>

                  <Button
                    color="success"
                    type="button"
                    onClick={() => navigate(`/quotations/${id}`)}
                  >
                    <i className="bx bx-check-circle me-1" />
                    Finish
                  </Button>
                </div>
              </div>
            </>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ExtraServicesQuotation;