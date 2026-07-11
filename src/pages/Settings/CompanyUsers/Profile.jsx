import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Spinner,
} from "reactstrap";

import Breadcrumb from "../../../components/Common/Breadcrumb";
import { get } from "../../../helpers/api_helper";
import { getAttachmentDownloadUrl } from "../../../helpers/attachments_helper";
import { notifyError } from "../../../helpers/notify";
import { USER_BY_ID } from "../../../helpers/url_helper";

const formatDate = iso => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString();
};

const initialsFor = user => {
  const first = String(user?.FIRST_NAME || "").trim().charAt(0);
  const last = String(user?.LAST_NAME || "").trim().charAt(0);
  return `${first}${last}`.toUpperCase() || "U";
};

const fullNameFor = user =>
  `${user?.FIRST_NAME || ""} ${user?.LAST_NAME || ""}`.trim() ||
  user?.EMAIL ||
  "User";

const CompanyUserProfile = () => {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [loading, setLoading] = useState(true);

  const roles = useMemo(
    () => (Array.isArray(user?.ROLES) ? user.ROLES : []),
    [user],
  );

  const loadUser = useCallback(async () => {
    if (!id) return;

    try {
      setLoading(true);
      const data = await get(USER_BY_ID(id));
      setUser(data);

      if (data?.PROFILE_IMG_ATTACHMENT_ID) {
        try {
          setAvatarUrl(await getAttachmentDownloadUrl(data.PROFILE_IMG_ATTACHMENT_ID));
        } catch {
          setAvatarUrl("");
        }
      } else {
        setAvatarUrl("");
      }
    } catch (error) {
      notifyError(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to load user profile.",
      );
      setUser(null);
      setAvatarUrl("");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  document.title = `${fullNameFor(user)} | COE`;

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumb title="Company Users" breadcrumbItem="User Profile" />

        <div className="mb-3">
          <Button color="light" tag={Link} to="/settings/users">
            <i className="bx bx-arrow-back me-1" />
            Back to Users
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <Spinner color="primary" />
          </div>
        ) : null}

        {!loading && user ? (
          <Row>
            <Col lg={4}>
              <Card>
                <CardBody className="text-center">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={`${fullNameFor(user)} profile`}
                      className="avatar-xl rounded-circle img-thumbnail mb-3"
                    />
                  ) : (
                    <div className="avatar-xl mx-auto mb-3">
                      <span className="avatar-title rounded-circle bg-primary text-white font-size-24">
                        {initialsFor(user)}
                      </span>
                    </div>
                  )}
                  <h5 className="mb-1">{fullNameFor(user)}</h5>
                  <p className="text-muted mb-2">{user.EMAIL || "-"}</p>
                  <div className="d-flex flex-wrap justify-content-center gap-1">
                    {roles.length ? (
                      roles.map(role => (
                        <Badge
                          key={role}
                          color="light"
                          className="text-dark border"
                        >
                          {role}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted">No roles</span>
                    )}
                  </div>
                </CardBody>
              </Card>
            </Col>

            <Col lg={8}>
              <Card>
                <CardBody>
                  <div className="d-flex align-items-start justify-content-between mb-3">
                    <h5 className="card-title mb-0">Profile Information</h5>
                    {user.ACTIVE_STATUS ? (
                      <Badge className="text-success" color="soft-success">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="text-danger" color="soft-danger">
                        Inactive
                      </Badge>
                    )}
                  </div>

                  <Row className="mb-3">
                    <Col md={6}>
                      <div className="text-muted">First Name</div>
                      <div className="fw-semibold">{user.FIRST_NAME || "-"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted">Last Name</div>
                      <div className="fw-semibold">{user.LAST_NAME || "-"}</div>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <div className="text-muted">Email</div>
                      <div className="fw-semibold">{user.EMAIL || "-"}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted">User ID</div>
                      <div className="fw-semibold text-break">{user._id || "-"}</div>
                    </Col>
                  </Row>

                  <Row className="mb-3">
                    <Col md={6}>
                      <div className="text-muted">Created On</div>
                      <div className="fw-semibold">{formatDate(user.CREATED_ON)}</div>
                    </Col>
                    <Col md={6}>
                      <div className="text-muted">Updated On</div>
                      <div className="fw-semibold">{formatDate(user.UPDATED_ON)}</div>
                    </Col>
                  </Row>

                  <div className="border-top pt-3">
                    <div className="text-muted mb-2">Roles</div>
                    <div className="d-flex flex-wrap gap-1">
                      {roles.length ? (
                        roles.map(role => (
                          <Badge
                            key={role}
                            color="light"
                            className="text-dark border"
                          >
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            </Col>
          </Row>
        ) : null}

        {!loading && !user ? (
          <Card>
            <CardBody className="text-center py-5">
              <h5 className="mb-2">User not found</h5>
              <p className="text-muted mb-3">
                This user does not exist or is not available in your company.
              </p>
              <Button color="primary" tag={Link} to="/settings/users">
                Back to Users
              </Button>
            </CardBody>
          </Card>
        ) : null}
      </Container>
    </div>
  );
};

export default CompanyUserProfile;
