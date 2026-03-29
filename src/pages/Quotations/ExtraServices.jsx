// path: src/pages/Quotations/ExtraServices.jsx
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

const ALLOWED_ROLES = ["COMPANY_ADMIN", "CONTRACTING"];

const normalizeName = (value) => String(value || "").trim().toLowerCase();

const getQuotationDisplayName = (quotation) =>
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

  const quotationState = useSelector((state) => state.Quotations || {});
  const quotation = quotationState?.selected;

  const {
    availableItems = [],
    quotationItems = [],
    loading,
    saving,
  } = useSelector((state) => state.QuotationExtraServices || {});

  const roles = useSelector((state) => state.Login?.roles || []);
  const canMutate = hasAnyRole(roles, ALLOWED_ROLES);

  const [selections, setSelections] = useState({});
  const [isDirty, setIsDirty] = useState(false);

  const selectedMap = useMemo(() => {
    const map = new Map();
    quotationItems.forEach((item) => {
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
    availableItems.forEach((item) => {
      const key = normalizeName(item?.SERVICE_NAME);
      next[key] = selectedMap.has(key);
    });
    setSelections(next);
    setIsDirty(false);
  }, [availableItems, selectedMap]);

  const selectedCount = Object.values(selections).filter(Boolean).length;

  const selectedServicesPayload = useMemo(() => {
    return availableItems
      .filter((item) => selections[normalizeName(item?.SERVICE_NAME)])
      .map((item) => ({
        SERVICE_NAME: item?.SERVICE_NAME || "",
        SERVICE_DESCRIPTION: item?.SERVICE_DESCRIPTION || "",
        SERVICE_COST_PP: Number(item?.SERVICE_COST_PP || 0),
      }));
  }, [availableItems, selections]);

  const handleToggle = (serviceName, nextValue) => {
    const key = normalizeName(serviceName);
    setSelections((prev) => ({
      ...prev,
      [key]: nextValue,
    }));
    setIsDirty(true);
  };

  const handleReset = () => {
    const next = {};
    availableItems.forEach((item) => {
      const key = normalizeName(item?.SERVICE_NAME);
      next[key] = selectedMap.has(key);
    });
    setSelections(next);
    setIsDirty(false);
    notifyInfo("Extra services restored from backend.");
  };

  const handleSave = () => {
    if (!canMutate) {
      notifyError("Permission/role mismatch");
      return;
    }

    dispatch(
      saveQuotationExtraServices(id, selectedServicesPayload, () => {
        setIsDirty(false);
      })
    );
  };

  document.title = "Quotation Extra Services | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Quotations" breadcrumbItem="Extra Services" />

          <Row className="mb-3">
            <Col xl="8">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2">
                    <div>
                      <h4 className="card-title mb-1">Quotation Extra Services</h4>
                      <p className="card-title-desc mb-0">
                        Select which extra services should be added to this quotation.
                      </p>
                    </div>

                    <div className="d-flex align-items-center gap-2">
                      <Badge color="primary" pill>
                        {selectedCount} selected
                      </Badge>
                      <Badge color="light" className="text-dark" pill>
                        {availableItems.length} available
                      </Badge>
                    </div>
                  </div>

              

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
                      onClick={() => navigate(`/quotations/${id}/plan`)}
                    >
                      Plan
                    </Button>

                    <Button
                      color="primary"
                      type="button"
                      onClick={() => navigate(`/quotations/${id}/accommodation`)}
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
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                    <div>
                      <h4 className="card-title mb-1">Available Services</h4>
                      <p className="card-title-desc mb-0">
                        Use Yes or No to include each service in this quotation.
                      </p>
                    </div>

                    <div className="d-flex gap-2">
                      <Button
                        color="light"
                        type="button"
                        onClick={handleReset}
                        disabled={saving}
                      >
                        Reset
                      </Button>
                      <Button
                        color="primary"
                        type="button"
                        onClick={handleSave}
                        disabled={saving || !canMutate || !isDirty}
                      >
                        {saving ? <Spinner size="sm" className="me-2" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>

                  <Row className="g-3">
                    {availableItems.map((item, index) => {
                      const key = normalizeName(item?.SERVICE_NAME);
                      const isSelected = !!selections[key];
                      const existingItem = selectedMap.get(key);

                      return (
                        <Col lg="12" key={item?._id || `${item?.SERVICE_NAME}-${index}`}>
                          <div className="border rounded p-3 h-100">
                            <div className="d-flex flex-wrap justify-content-between align-items-start gap-3">
                              <div>
                                <div className="d-flex align-items-center flex-wrap gap-2 mb-1">
                                  <h5 className="mb-0">{item?.SERVICE_NAME || "-"}</h5>

                                  {existingItem ? (
                                    <Badge color="success" pill>
                                      Added
                                    </Badge>
                                  ) : (
                                    <Badge color="light" className="text-dark" pill>
                                      Not Added
                                    </Badge>
                                  )}
                                </div>

                                <div className="text-muted mb-2">
                                  {item?.SERVICE_DESCRIPTION || "No description."}
                                </div>

                                <div className="small fw-semibold">
                                  Cost per person: {Number(item?.SERVICE_COST_PP || 0)}
                                </div>
                              </div>

                              <div className="d-flex flex-wrap gap-2">
                                <Button
                                  type="button"
                                  color={isSelected ? "primary" : "light"}
                                  onClick={() => handleToggle(item?.SERVICE_NAME, true)}
                                  disabled={!canMutate || saving}
                                >
                                  <i className="bx bx-check me-1" />
                                  Yes
                                </Button>

                                <Button
                                  type="button"
                                  color={!isSelected ? "danger" : "light"}
                                  onClick={() => handleToggle(item?.SERVICE_NAME, false)}
                                  disabled={!canMutate || saving}
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
                </CardBody>
              </Card>

              <Card>
                <CardBody>
                  <h4 className="card-title mb-3">Already Added To Quotation</h4>

                  {quotationItems.length === 0 ? (
                    <div className="text-muted">
                      No extra services have been added to this quotation yet.
                    </div>
                  ) : (
                    <Row className="g-3">
                      {quotationItems.map((item) => (
                        <Col lg="6" key={item?._id}>
                          <div className="border rounded p-3 h-100">
                            <div className="d-flex align-items-center gap-2 mb-2">
                              <h5 className="mb-0">{item?.SERVICE_NAME || "-"}</h5>
                              <Badge color="success" pill>
                                Active
                              </Badge>
                            </div>

                            <div className="text-muted mb-2">
                              {item?.SERVICE_DESCRIPTION || "No description."}
                            </div>

                            <div className="small fw-semibold">
                              Cost per person: {Number(item?.SERVICE_COST_PP || 0)}
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </CardBody>
              </Card>
            </>
          )}
        </Container>
      </div>
    </React.Fragment>
  );
};

export default ExtraServicesQuotation;