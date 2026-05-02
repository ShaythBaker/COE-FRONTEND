import React, { useEffect, useMemo, useState } from "react";
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
} from "reactstrap";

import Breadcrumbs from "../../../components/Common/Breadcrumb";
import { notifyError, notifySuccess } from "../../../helpers/notify";

const STORAGE_KEY = "coeSystemInformation";

const emptyForm = {
  systemName: "",
  systemLogo: "",
  systemEmail: "",
  systemCountry: "",
  phoneNumber: "",
};

const readSystemInformation = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    return { ...emptyForm, ...saved };
  } catch {
    return emptyForm;
  }
};

const fileToDataUrl = file =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const SystemInformation = () => {
  document.title = "System Information | COE";

  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState({});

  useEffect(() => {
    setForm(readSystemInformation());
  }, []);

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

    const dataUrl = await fileToDataUrl(file);
    setField("systemLogo", dataUrl);
  };

  const handleSubmit = event => {
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

    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    notifySuccess("System information saved successfully.");
  };

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Settings" breadcrumbItem="System Information" />

        <Row>
          <Col xl="8">
            <Card>
              <CardBody>
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
                    {form.systemLogo ? (
                      <Button
                        color="light"
                        type="button"
                        onClick={() => setField("systemLogo", "")}
                      >
                        Remove Logo
                      </Button>
                    ) : null}
                    <Button color="primary" type="submit">
                      Save
                    </Button>
                  </div>
                </Form>
              </CardBody>
            </Card>
          </Col>

          <Col xl="4">
            <Card>
              <CardBody>
                <div className="d-flex align-items-center gap-3 mb-4">
                  {form.systemLogo ? (
                    <img
                      src={form.systemLogo}
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
