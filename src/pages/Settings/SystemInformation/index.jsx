import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Form,
  FormFeedback,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";

import Breadcrumbs from "../../../components/Common/Breadcrumb";
import { notifyError, notifySuccess } from "../../../helpers/notify";
import {
  getCurrentCompany,
  updateCurrentCompany,
} from "../../../helpers/coe_backend_helper";
import {
  ATTACHMENT_TYPES,
  getAttachmentDownloadUrl,
  uploadAttachmentAndGetId,
} from "../../../helpers/attachments_helper";

const emptyForm = {
  systemName: "",
  systemLogoAttachmentId: "",
  systemEmail: "",
  systemCountry: "",
  phoneNumber: "",
};

const toForm = data => ({
  systemName: data?.COMPANY_NAME || "",
  systemLogoAttachmentId: data?.LOGO_ATTACHMENT_ID || "",
  systemEmail: data?.SYSTEM_EMAIL || "",
  systemCountry: data?.SYSTEM_COUNTRY || "",
  phoneNumber: data?.PHONE_NUMBER || "",
});

const SystemInformation = () => {
  document.title = "System Information | COE";

  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    getCurrentCompany()
      .then(data => {
        if (mounted) setForm(toForm(data));
      })
      .catch(error => {
        if (mounted) {
          notifyError(
            error?.response?.data?.message ||
              error?.message ||
              "Failed to load system information.",
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    if (!form.systemLogoAttachmentId || logoPreview) {
      setLogoUrl("");
      return () => {
        mounted = false;
      };
    }

    getAttachmentDownloadUrl(form.systemLogoAttachmentId)
      .then(downloadUrl => {
        if (mounted) setLogoUrl(downloadUrl || "");
      })
      .catch(() => {
        if (mounted) setLogoUrl("");
      });

    return () => {
      mounted = false;
    };
  }, [form.systemLogoAttachmentId, logoPreview]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const displayedLogo = logoPreview || logoUrl;

  const resetLogoPreview = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview("");
    setLogoFile(null);
  };

  const errors = useMemo(() => {
    const next = {};
    if (!String(form.systemName || "").trim()) {
      next.systemName = "System name is required.";
    }
    if (!String(form.systemEmail || "").trim()) {
      next.systemEmail = "System email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.systemEmail)) {
      next.systemEmail = "Enter a valid email address.";
    }
    if (!String(form.systemCountry || "").trim()) {
      next.systemCountry = "System country is required.";
    }
    if (!String(form.phoneNumber || "").trim()) {
      next.phoneNumber = "Phone number is required.";
    }
    return next;
  }, [form]);

  const setField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const touchField = field => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleLogoChange = async event => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!String(file.type || "").startsWith("image/")) {
      notifyError("Please choose an image file for the system logo.");
      return;
    }

    resetLogoPreview();
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = () => {
    resetLogoPreview();
    setField("systemLogoAttachmentId", "");
    setLogoUrl("");
  };

  const handleSubmit = async event => {
    event.preventDefault();
    setTouched({
      systemName: true,
      systemEmail: true,
      systemCountry: true,
      phoneNumber: true,
    });

    if (Object.keys(errors).length > 0) {
      notifyError("Please fix the highlighted fields before saving.");
      return;
    }

    setSaving(true);
    try {
      let logoAttachmentId = form.systemLogoAttachmentId;

      if (logoFile) {
        logoAttachmentId = await uploadAttachmentAndGetId({
          file: logoFile,
          ATTACHMENT_TYPE: ATTACHMENT_TYPES.COMPANY_LOGO,
          META: { COMPANY_NAME: form.systemName },
        });
      }

      const saved = await updateCurrentCompany({
        COMPANY_NAME: form.systemName,
        SYSTEM_EMAIL: form.systemEmail,
        SYSTEM_COUNTRY: form.systemCountry,
        PHONE_NUMBER: form.phoneNumber,
        LOGO_ATTACHMENT_ID: logoAttachmentId || null,
      });

      resetLogoPreview();
      setForm(toForm(saved));
      notifySuccess("System information saved successfully.");
    } catch (error) {
      notifyError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save system information.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Settings" breadcrumbItem="System Information" />

        <Row>
          <Col xl="8">
            <Card>
              <CardBody>
                {loading ? (
                  <div className="text-center py-5">
                    <Spinner />
                  </div>
                ) : (
                  <Form onSubmit={handleSubmit}>
                  <Row>
                    <Col md="6">
                      <div className="mb-3">
                        <Label className="form-label">System Name</Label>
                        <Input
                          value={form.systemName}
                          invalid={!!(touched.systemName && errors.systemName)}
                          onBlur={() => touchField("systemName")}
                          onChange={event =>
                            setField("systemName", event.target.value)
                          }
                          placeholder="Enter system name"
                        />
                        <FormFeedback>{errors.systemName}</FormFeedback>
                      </div>
                    </Col>

                    <Col md="6">
                      <div className="mb-3">
                        <Label className="form-label">System Email Address</Label>
                        <Input
                          type="email"
                          value={form.systemEmail}
                          invalid={!!(touched.systemEmail && errors.systemEmail)}
                          onBlur={() => touchField("systemEmail")}
                          onChange={event =>
                            setField("systemEmail", event.target.value)
                          }
                          placeholder="name@example.com"
                        />
                        <FormFeedback>{errors.systemEmail}</FormFeedback>
                      </div>
                    </Col>

                    <Col md="6">
                      <div className="mb-3">
                        <Label className="form-label">System Country</Label>
                        <Input
                          value={form.systemCountry}
                          invalid={
                            !!(touched.systemCountry && errors.systemCountry)
                          }
                          onBlur={() => touchField("systemCountry")}
                          onChange={event =>
                            setField("systemCountry", event.target.value)
                          }
                          placeholder="Enter country"
                        />
                        <FormFeedback>{errors.systemCountry}</FormFeedback>
                      </div>
                    </Col>

                    <Col md="6">
                      <div className="mb-3">
                        <Label className="form-label">Phone Number</Label>
                        <Input
                          value={form.phoneNumber}
                          invalid={!!(touched.phoneNumber && errors.phoneNumber)}
                          onBlur={() => touchField("phoneNumber")}
                          onChange={event =>
                            setField("phoneNumber", event.target.value)
                          }
                          placeholder="Enter phone number"
                        />
                        <FormFeedback>{errors.phoneNumber}</FormFeedback>
                      </div>
                    </Col>

                    <Col md="12">
                      <div className="mb-3">
                        <Label className="form-label">System Logo</Label>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                        />
                      </div>
                    </Col>
                  </Row>

                  <div className="d-flex justify-content-end gap-2">
                    {displayedLogo ? (
                      <Button
                        color="light"
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={saving}
                      >
                        Remove Logo
                      </Button>
                    ) : null}
                    <Button color="primary" type="submit" disabled={saving}>
                      Save
                    </Button>
                  </div>
                  </Form>
                )}
              </CardBody>
            </Card>
          </Col>

          <Col xl="4">
            <Card>
              <CardBody>
                <div className="d-flex align-items-center gap-3 mb-4">
                  {displayedLogo ? (
                    <img
                      src={displayedLogo}
                      alt="System Logo"
                      className="rounded border"
                      style={{
                        width: 72,
                        height: 72,
                        objectFit: "contain",
                      }}
                    />
                  ) : (
                    <div
                      className="rounded border bg-light d-flex align-items-center justify-content-center"
                      style={{ width: 72, height: 72 }}
                    >
                      <i className="bx bx-image font-size-24 text-muted" />
                    </div>
                  )}
                  <div>
                    <h5 className="mb-1">{form.systemName || "System Name"}</h5>
                    <div className="text-muted">
                      {form.systemCountry || "Country"}
                    </div>
                  </div>
                </div>

                <div className="border-top pt-3">
                  <div className="mb-3">
                    <div className="text-muted">Email</div>
                    <div className="fw-semibold">
                      {form.systemEmail || "name@example.com"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted">Phone</div>
                    <div className="fw-semibold">
                      {form.phoneNumber || "Phone number"}
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default SystemInformation;
