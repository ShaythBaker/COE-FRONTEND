// path: src/pages/Guides/GuideDetails.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  Card,
  CardBody,
  Col,
  Container,
  Row,
  Badge,
  Spinner,
  Table,
} from "reactstrap";
import Breadcrumbs from "../../components/Common/Breadcrumb";
import {
  PublishedReviewsPanel,
  usePublishedReviews,
} from "../../components/Common/PublishedReviews";
import { fetchGuide } from "../../store/Guides/actions";
import { fetchReservationFiles } from "../../store/ReservationFiles/actions";
import { getAttachmentDownloadUrl } from "../../helpers/attachments_helper";

const ViewField = ({ label, value }) => (
  <div className="mb-4">
    <div className="text-muted mb-1">{label}</div>
    <div className="fw-semibold">{value || "-"}</div>
  </div>
);

const normalizeDateTime = value => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "-";
  return d.toLocaleString("en-GB");
};

const normalizeDateOnly = value => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value || "-";
  return d.toLocaleDateString("en-GB");
};

const asArray = value => (Array.isArray(value) ? value : []);

const normalizeText = value => String(value || "").trim().toLowerCase();

const GuideDetails = () => {
  const publishedReviews = usePublishedReviews("GUIDE");
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();

  const { selected, loading, error } = useSelector(state => state.Guides || {});
  const {
    items: reservationFiles = [],
    loading: reservationFilesLoading,
    error: reservationFilesError,
  } = useSelector(state => state.ReservationFiles || {});
  const [imageUrl, setImageUrl] = useState("");

  useEffect(() => {
    if (id) {
      dispatch(fetchGuide(id));
      dispatch(fetchReservationFiles());
    }
  }, [dispatch, id]);

  const guide = useMemo(() => {
    if (selected && typeof selected === "object" && !Array.isArray(selected)) {
      return selected;
    }
    return {};
  }, [selected]);

  useEffect(() => {
    let mounted = true;

    const loadImage = async () => {
      const imageId = guide?.GUIDE_IMAGE_ID;
      if (!imageId) {
        if (mounted) setImageUrl("");
        return;
      }

      try {
        const url = await getAttachmentDownloadUrl(imageId);
        if (mounted) {
          setImageUrl(url || "");
        }
      } catch {
        if (mounted) {
          setImageUrl("");
        }
      }
    };

    loadImage();

    return () => {
      mounted = false;
    };
  }, [guide?.GUIDE_IMAGE_ID]);

  const fullName =
    guide?.GUIDE_NAME ||
    guide?.FULL_NAME ||
    guide?.NAME ||
    guide?.name ||
    "-";

  const guideCode =
    guide?.GUIDE_CODE ||
    guide?.CODE ||
    guide?._id ||
    "-";

  const phone = guide?.GUIDE_PHONE || guide?.PHONE || guide?.phone || "-";
  const email = guide?.GUIDE_EMAIL || guide?.EMAIL || guide?.email || "-";

  const languages = Array.isArray(guide?.GUIDE_LANGUAGES)
    ? guide.GUIDE_LANGUAGES.join(", ")
    : guide?.LANGUAGE || guide?.language || "-";

  const nationality =
    guide?.GUIDE_NATIONALITY ||
    guide?.NATIONALITY ||
    guide?.nationality ||
    "-";

  const experience =
    guide?.GUIDE_EXPERIENCE ||
    guide?.EXPERIENCE ||
    guide?.experience ||
    "-";

  const city = guide?.GUIDE_CITY || guide?.CITY || guide?.city || "-";
  const country = guide?.GUIDE_COUNTRY || guide?.COUNTRY || guide?.country || "-";
  const address = guide?.GUIDE_ADDRESS || guide?.ADDRESS || guide?.address || "-";
  const gender = guide?.GUIDE_GENDER || guide?.GENDER || guide?.gender || "-";
  const licenseNo =
    guide?.GUIDE_LICENSE_NO ||
    guide?.LICENSE_NO ||
    guide?.licenseNo ||
    "-";
  const notes = guide?.GUIDE_NOTES || guide?.NOTES || guide?.notes || "-";
  const dateOfBirth = normalizeDateOnly(
    guide?.GUIDE_DATE_OF_BIRTH || guide?.DATE_OF_BIRTH || guide?.dateOfBirth
  );

  const status =
    typeof guide?.ACTIVE_STATUS === "boolean"
      ? guide.ACTIVE_STATUS
        ? "Active"
        : "Inactive"
      : guide?.STATUS || guide?.status || "Active";

  const createdAt = normalizeDateTime(guide?.CREATED_ON || guide?.createdAt);
  const updatedAt = normalizeDateTime(guide?.UPDATED_ON || guide?.updatedAt);

  const assignmentHistory = useMemo(() => {
    const candidateNames = [
      guide?.GUIDE_NAME,
      guide?.FULL_NAME,
      guide?.NAME,
      guide?.name,
      fullName,
    ]
      .map(normalizeText)
      .filter(Boolean);

    if (!candidateNames.length) return [];

    return reservationFiles
      .flatMap(file => {
        const savedGuides = asArray(file?.RESERVATION_DATA?.guides);
        const matches = savedGuides.filter(row =>
          candidateNames.includes(normalizeText(row?.guideName))
        );

        if (!matches.length) return [];

        const dates = matches
          .flatMap(row => [row?.fromDate, row?.toDate])
          .filter(Boolean)
          .map(normalizeDateOnly)
          .filter(value => value && value !== "-");

        const uniqueDates = Array.from(new Set(dates));

        return [
          {
            id: file?._id || file?.FILE_REFERENCE,
            reservationId: file?._id,
            fileReference: file?.FILE_REFERENCE || "-",
            groupName:
              file?.RESERVATION_DATA?.general?.groupName ||
              file?.QUOTATION?.GROUP_NAME ||
              file?.GROUP_NAME ||
              "-",
            agentName:
              file?.RESERVATION_DATA?.general?.agentName ||
              file?.TRAVEL_AGENT_NAME ||
              file?.QUOTATION?.TRAVEL_AGENT_NAME ||
              "-",
            assignedRows: matches.length,
            datesLabel: uniqueDates.join(", ") || "-",
            updatedOn: file?.UPDATED_ON || file?.CREATED_ON || "",
          },
        ];
      })
      .sort((a, b) => new Date(b.updatedOn || 0) - new Date(a.updatedOn || 0));
  }, [reservationFiles, guide, fullName]);

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Operations" breadcrumbItem="Guide Details" />

        <Row className="mb-3">
          <Col xs="12" className="d-flex justify-content-end">
            <button
              type="button"
              className="btn btn-light"
              onClick={() => navigate("/guides")}
            >
              Back
            </button>
          </Col>
        </Row>

        {loading ? (
          <Row>
            <Col xs="12">
              <Card>
                <CardBody className="text-center py-5">
                  <Spinner />
                </CardBody>
              </Card>
            </Col>
          </Row>
        ) : (
          <>
            <Row>
              <Col xl="12">
                <Card>
                  <CardBody>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-3">
                      <div className="d-flex align-items-center">
                        <div
                          className="me-3 d-flex align-items-center justify-content-center overflow-hidden"
                          style={{
                            width: 84,
                            height: 84,
                            borderRadius: "50%",
                            background: "#eff2f7",
                            border: "1px solid #e9e9ef",
                            flexShrink: 0,
                          }}
                        >
                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={fullName}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <i className="bx bx-user text-primary font-size-24" />
                          )}
                        </div>

                        <div>
                          <h3 className="mb-1">{fullName}</h3>
                          <p className="text-muted mb-2">{guideCode}</p>
                          <Badge color={status === "Active" ? "success" : "secondary"}>
                            {status}
                          </Badge>
                        </div>
                      </div>

                      <Row className="g-3 flex-grow-1 justify-content-end">
                        <Col md="3" sm="4" xs="6">
                          <div className="border rounded p-3 h-100">
                            <div className="text-muted text-uppercase fw-semibold font-size-12 mb-2">
                              Language
                            </div>
                            <div className="fw-bold">{languages}</div>
                          </div>
                        </Col>
                        <Col md="3" sm="4" xs="6">
                          <div className="border rounded p-3 h-100">
                            <div className="text-muted text-uppercase fw-semibold font-size-12 mb-2">
                              Nationality
                            </div>
                            <div className="fw-bold">{nationality}</div>
                          </div>
                        </Col>
                        <Col md="3" sm="4" xs="6">
                          <div className="border rounded p-3 h-100">
                            <div className="text-muted text-uppercase fw-semibold font-size-12 mb-2">
                              Experience
                            </div>
                            <div className="fw-bold">{experience}</div>
                          </div>
                        </Col>
                      </Row>
                    </div>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col xl="12">
                <Card>
                  <CardBody>
                    <h4 className="card-title mb-4">Guide Information</h4>
                    <Row>
                      <Col md="6">
                        <ViewField label="Full Name" value={fullName} />
                        <ViewField label="Guide Code" value={guideCode} />
                        <ViewField label="Phone" value={phone} />
                        <ViewField label="Email" value={email} />
                        <ViewField label="Gender" value={gender} />
                        <ViewField label="Date of Birth" value={dateOfBirth} />
                      </Col>

                      <Col md="6">
                        <ViewField label="Languages" value={languages} />
                        <ViewField label="City" value={city} />
                        <ViewField label="Country" value={country} />
                        <ViewField label="Address" value={address} />
                        <ViewField label="License No." value={licenseNo} />
                        <ViewField label="Status" value={status} />
                      </Col>
                    </Row>
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col xl="12">
                <Card>
                  <CardBody>
                    <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-4">
                      <h4 className="card-title mb-0">Reservation Assignment History</h4>
                      <Badge color="info" pill>
                        {assignmentHistory.length} file{assignmentHistory.length === 1 ? "" : "s"}
                      </Badge>
                    </div>

                    {reservationFilesLoading ? (
                      <div className="text-center py-4">
                        <Spinner size="sm" className="me-2" />
                        Loading assigned reservation files...
                      </div>
                    ) : assignmentHistory.length ? (
                      <div className="table-responsive mb-4">
                        <Table bordered hover className="align-middle mb-0">
                          <thead>
                            <tr>
                              <th>Reservation File</th>
                              <th>Group</th>
                              <th>Agent</th>
                              <th>Assigned Rows</th>
                              <th>Guide Dates</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignmentHistory.map(item => (
                              <tr key={item.id}>
                                <td>
                                  {item.reservationId ? (
                                    <Link to={`/reservation-files/${item.reservationId}`}>
                                      {item.fileReference}
                                    </Link>
                                  ) : (
                                    item.fileReference
                                  )}
                                </td>
                                <td>{item.groupName}</td>
                                <td>{item.agentName}</td>
                                <td>{item.assignedRows}</td>
                                <td>{item.datesLabel}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </div>
                    ) : (
                      <div className="rounded border bg-light p-3 text-muted mb-4">
                        No reservation files currently assign this guide.
                      </div>
                    )}

                    <h4 className="card-title mb-4">Additional Information</h4>
                    <Row>
                      <Col md="6">
                        <ViewField label="Notes" value={notes} />
                      </Col>
                      <Col md="6">
                        <ViewField label="Created At" value={createdAt} />
                        <ViewField label="Updated At" value={updatedAt} />
                      </Col>
                    </Row>

                    {error ? (
                      <div className="alert alert-danger mt-2 mb-0">{error}</div>
                    ) : null}
                    {!error && reservationFilesError ? (
                      <div className="alert alert-warning mt-2 mb-0">
                        {reservationFilesError}
                      </div>
                    ) : null}
                  </CardBody>
                </Card>
              </Col>
            </Row>

            <Row>
              <Col xl="12">
                <PublishedReviewsPanel
                  sourceName={selected?.GUIDE_NAME || ""}
                  reviewState={publishedReviews}
                />
              </Col>
            </Row>
          </>
        )}
      </Container>
    </div>
  );
};

export default GuideDetails;
