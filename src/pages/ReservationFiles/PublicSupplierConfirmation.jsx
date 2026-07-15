import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Input,
  Label,
  Row,
  Spinner,
} from "reactstrap";

import { get, post } from "../../helpers/api_helper";
import { notifyError, notifySuccess } from "../../helpers/notify";
import {
  PUBLIC_RESERVATION_SUPPLIER_CONFIRMATION,
  PUBLIC_RESERVATION_SUPPLIER_CONFIRMATION_SUBMIT,
} from "../../helpers/url_helper";

const PublicSupplierConfirmation = () => {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [details, setDetails] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    code: "",
    specialRatesApproved: "",
    referenceNo: "",
    confirmationNo: "",
    notes: "",
    file: null,
  });

  useEffect(() => {
    document.title = "Reservation Confirmation | Skote";
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const response = await get(PUBLIC_RESERVATION_SUPPLIER_CONFIRMATION(token));
        setDetails(response);
        setSubmitted(!!response?.submitted);
      } catch (error) {
        notifyError(
          error?.response?.data?.message || "Confirmation link is not available."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [token]);

  const updateForm = (field, value) => {
    setForm(current => ({ ...current, [field]: value }));
  };

  const submit = async event => {
    event.preventDefault();

    if (!form.code.trim()) {
      notifyError("Code is required.");
      return;
    }
    if (!form.specialRatesApproved) {
      notifyError("Answer the Special Rates proof question.");
      return;
    }
    if (!form.referenceNo.trim()) {
      notifyError("Reference No. is required.");
      return;
    }
    if (!form.confirmationNo.trim()) {
      notifyError("Confirmation No. is required.");
      return;
    }
    if (!form.file) {
      notifyError("Invoice file is required.");
      return;
    }

    const payload = new FormData();
    payload.append("code", form.code.trim());
    payload.append("specialRatesApproved", form.specialRatesApproved);
    payload.append("referenceNo", form.referenceNo.trim());
    payload.append("confirmationNo", form.confirmationNo.trim());
    payload.append("notes", form.notes.trim());
    payload.append("file", form.file);

    try {
      setSubmitting(true);
      await post(PUBLIC_RESERVATION_SUPPLIER_CONFIRMATION_SUBMIT(token), payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setSubmitted(true);
      notifySuccess("Confirmation submitted.");
    } catch (error) {
      notifyError(error?.response?.data?.message || "Failed to submit confirmation.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner size="sm" className="me-2" />
        Loading confirmation...
      </Container>
    );
  }

  return (
    <div className="account-pages py-5">
      <Container>
        <Row className="justify-content-center">
          <Col lg="7" xl="6">
            <Card>
              <CardBody className="p-4">
                <h3 className="mb-1">Reservation Confirmation</h3>
                <div className="text-muted mb-4">
                  File {details?.FILE_REFERENCE || "-"} | {details?.sectionLabel || "-"}:{" "}
                  {details?.supplierName || "-"}
                </div>

                {submitted ? (
                  <Alert color="success" className="mb-0">
                    Thank you. Your confirmation was submitted successfully.
                  </Alert>
                ) : (
                  <form onSubmit={submit}>
                    <Label className="form-label fw-semibold">Code</Label>
                    <Input
                      value={form.code}
                      onChange={event => updateForm("code", event.target.value)}
                      className="mb-3"
                      placeholder="Enter the code from the email"
                    />

                    <Label className="form-label fw-semibold">
                      Is the Special Rates proof correct?
                    </Label>
                    <Input
                      type="select"
                      value={form.specialRatesApproved}
                      onChange={event =>
                        updateForm("specialRatesApproved", event.target.value)
                      }
                      className="mb-3"
                    >
                      <option value="">Select</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </Input>

                    <Row>
                      <Col md="6">
                        <Label className="form-label fw-semibold">Reference No.</Label>
                        <Input
                          value={form.referenceNo}
                          onChange={event => updateForm("referenceNo", event.target.value)}
                          className="mb-3"
                        />
                      </Col>
                      <Col md="6">
                        <Label className="form-label fw-semibold">Confirmation No.</Label>
                        <Input
                          value={form.confirmationNo}
                          onChange={event =>
                            updateForm("confirmationNo", event.target.value)
                          }
                          className="mb-3"
                        />
                      </Col>
                    </Row>

                    <Label className="form-label fw-semibold">Invoice File</Label>
                    <Input
                      type="file"
                      onChange={event =>
                        updateForm("file", event.target.files?.[0] || null)
                      }
                      className="mb-3"
                    />

                    <Label className="form-label fw-semibold">Notes</Label>
                    <Input
                      type="textarea"
                      rows={3}
                      value={form.notes}
                      onChange={event => updateForm("notes", event.target.value)}
                      className="mb-4"
                    />

                    <Button color="primary" type="submit" disabled={submitting}>
                      {submitting ? <Spinner size="sm" className="me-2" /> : null}
                      Submit
                    </Button>
                  </form>
                )}
              </CardBody>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default PublicSupplierConfirmation;
