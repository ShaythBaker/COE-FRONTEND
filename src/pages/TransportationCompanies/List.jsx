// path: src/pages/TransportationCompanies/List.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import Breadcrumbs from "../../components/Common/Breadcrumb";
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
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import {
  createTransportationCompany,
  fetchTransportationCompanies,
} from "../../store/TransportationCompanies/actions";
import { hasAnyRole } from "../../helpers/coe_roles";
import { notifyError } from "../../helpers/notify";

const initialForm = {
  COMPANY_NAME: "",
  COMPANY_PHONE: "",
  COMPANY_EMAIL: "",
};

const List = () => {
  const dispatch = useDispatch();

  const { items, loading } = useSelector((state) => state.TransportationCompanies || {});
  const roles = useSelector((state) => state.Login?.roles || []);
  const canManageTransportation = hasAnyRole(roles, ["COMPANY_ADMIN", "CONTRACTING"]);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [query, setQuery] = useState("");

  useEffect(() => {
    dispatch(fetchTransportationCompanies());
  }, [dispatch]);

  const filteredItems = useMemo(() => {
    const rows = Array.isArray(items) ? items : [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((item) =>
      [item?.COMPANY_NAME, item?.COMPANY_PHONE, item?.COMPANY_EMAIL]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [items, query]);

  const toggleModal = () => {
    setModalOpen((prev) => !prev);
    setForm(initialForm);
    setErrors({});
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const next = {};

    if (!form.COMPANY_NAME.trim()) {
      next.COMPANY_NAME = "Company name is required.";
    }

    if (!form.COMPANY_PHONE.trim()) {
      next.COMPANY_PHONE = "Company phone is required.";
    }

    if (!form.COMPANY_EMAIL.trim()) {
      next.COMPANY_EMAIL = "Company email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.COMPANY_EMAIL)) {
      next.COMPANY_EMAIL = "Please enter a valid email address.";
    }

    setErrors(next);

    if (Object.keys(next).length > 0) {
      notifyError("Please fix the highlighted fields.");
      return false;
    }

    return true;
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (!canManageTransportation) {
      notifyError("You do not have permission to create transportation companies.");
      return;
    }

    if (!validate()) return;

    dispatch(
      createTransportationCompany(
        {
          COMPANY_NAME: form.COMPANY_NAME.trim(),
          COMPANY_PHONE: form.COMPANY_PHONE.trim(),
          COMPANY_EMAIL: form.COMPANY_EMAIL.trim(),
        },
        () => {
          toggleModal();
          dispatch(fetchTransportationCompanies());
        }
      )
    );
  };

  document.title = "Transportation Companies | Skote";

  return (
    <React.Fragment>
      <div className="page-content">
        <Container fluid>
          <Breadcrumbs title="Transportation" breadcrumbItem="Transportation Companies" />

          <Row>
            <Col xs="12">
              <Card>
                <CardBody>
                  <div className="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-3">
                    <div>
                      <h4 className="card-title mb-1">Transportation Companies</h4>
                      <p className="card-title-desc mb-0">
                        List transportation companies and create a new company from the modal.
                      </p>
                    </div>

                    <div className="d-flex gap-2">
                      <Input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search company..."
                        style={{ minWidth: 240 }}
                      />
                      <Button
                        color="primary"
                        onClick={toggleModal}
                        disabled={!canManageTransportation}
                      >
                        <i className="bx bx-plus me-1" />
                        Add Company
                      </Button>
                    </div>
                  </div>

                  <div className="table-responsive">
                    <Table className="table align-middle table-nowrap mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: "70px" }}>#</th>
                          <th>Company Name</th>
                          <th>Phone</th>
                          <th>Email</th>
                          <th>Rates</th>
                          <th style={{ width: "150px" }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="6" className="text-center py-4">
                              <Spinner size="sm" className="me-2" />
                              Loading...
                            </td>
                          </tr>
                        ) : filteredItems.length === 0 ? (
                          <tr>
                            <td colSpan="6" className="text-center text-muted py-4">
                              No transportation companies found.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((item, index) => {
                            const rates = Array.isArray(item?.RATES)
                              ? item.RATES
                              : Array.isArray(item?.rates)
                              ? item.rates
                              : [];

                            return (
                              <tr key={item?._id || index}>
                                <td>{index + 1}</td>
                                <td className="fw-semibold">{item?.COMPANY_NAME || "-"}</td>
                                <td>{item?.COMPANY_PHONE || "-"}</td>
                                <td>{item?.COMPANY_EMAIL || "-"}</td>
                                <td>{rates.length}</td>
                                <td>
                                  <Link
                                    to={`/transportation-companies/${item?._id}`}
                                    className="btn btn-sm btn-primary"
                                  >
                                    Details
                                  </Link>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </Table>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        </Container>
      </div>

      <Modal isOpen={modalOpen} toggle={toggleModal} centered>
        <Form onSubmit={onSubmit}>
          <ModalHeader toggle={toggleModal}>Add Transportation Company</ModalHeader>
          <ModalBody>
            <div className="mb-3">
              <Label className="form-label">Company Name</Label>
              <Input
                name="COMPANY_NAME"
                value={form.COMPANY_NAME}
                onChange={onChange}
                invalid={!!errors.COMPANY_NAME}
                required
              />
              <FormFeedback>{errors.COMPANY_NAME}</FormFeedback>
            </div>

            <div className="mb-3">
              <Label className="form-label">Phone</Label>
              <Input
                name="COMPANY_PHONE"
                value={form.COMPANY_PHONE}
                onChange={onChange}
                invalid={!!errors.COMPANY_PHONE}
                required
              />
              <FormFeedback>{errors.COMPANY_PHONE}</FormFeedback>
            </div>

            <div className="mb-0">
              <Label className="form-label">Email</Label>
              <Input
                name="COMPANY_EMAIL"
                value={form.COMPANY_EMAIL}
                onChange={onChange}
                invalid={!!errors.COMPANY_EMAIL}
                required
              />
              <FormFeedback>{errors.COMPANY_EMAIL}</FormFeedback>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button type="button" color="light" onClick={toggleModal}>
              Cancel
            </Button>
            <Button type="submit" color="primary">
              Save
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </React.Fragment>
  );
};

export default List;