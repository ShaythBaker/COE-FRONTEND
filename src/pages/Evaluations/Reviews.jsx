import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Container,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Row,
  Spinner,
  Table,
} from "reactstrap";
import { Chart, registerables } from "chart.js";
import { Doughnut } from "react-chartjs-2";

import Breadcrumbs from "../../components/Common/Breadcrumb";
import { get } from "../../helpers/api_helper";
import { EVALUATION_REVIEWS } from "../../helpers/url_helper";
import { notifyError } from "../../helpers/notify";
import {
  buildReviewListRows,
  findReviewById,
  getEvaluationBadgeColor,
  getRatingDoughnutData,
  normalizeEvaluationStatus,
} from "../../helpers/evaluation_workflow";

Chart.register(...registerables);

const asArray = value => (Array.isArray(value) ? value : []);

const formatDateTime = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: context => `${context.label}: ${context.parsed}`,
      },
    },
  },
};

const EvaluationReviewsPage = () => {
  const { evaluationId } = useParams();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedReviewId, setSelectedReviewId] = useState("");

  useEffect(() => {
    document.title = "Evaluation Reviews | Skote";
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setLoading(true);
        const response = await get(EVALUATION_REVIEWS(evaluationId));
        setData(response);
      } catch (error) {
        notifyError(
          error?.response?.data?.message || "Failed to load evaluation reviews."
        );
      } finally {
        setLoading(false);
      }
    };

    loadReviews();
  }, [evaluationId]);

  const reviews = asArray(data?.reviews);
  const reviewRows = useMemo(() => buildReviewListRows(reviews), [reviews]);
  const selectedReview = useMemo(
    () => findReviewById(reviews, selectedReviewId),
    [reviews, selectedReviewId]
  );
  const evaluationStatus = normalizeEvaluationStatus(data?.evaluation?.STATUS);
  const summaryChart = useMemo(
    () => getRatingDoughnutData(data?.summary?.overallAverage || 0),
    [data?.summary?.overallAverage]
  );
  const selectedReviewChart = useMemo(
    () => getRatingDoughnutData(selectedReview?.AVERAGE_RATING || 0),
    [selectedReview?.AVERAGE_RATING]
  );

  return (
    <div className="page-content">
      <Container fluid>
        <Breadcrumbs title="Evaluations" breadcrumbItem="Reviews" />

        <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-3">
          <div>
            <h2 className="mb-1">
              Reviews: {data?.evaluation?.FILE_REFERENCE || "-"}
            </h2>
            <div className="d-flex flex-wrap align-items-center gap-2">
              <Badge color={getEvaluationBadgeColor(evaluationStatus)} pill>
                {evaluationStatus}
              </Badge>
              <span className="text-muted">
                {Number(data?.summary?.reviewCount || 0)} review
                {Number(data?.summary?.reviewCount || 0) === 1 ? "" : "s"}
              </span>
            </div>
          </div>
          <Button tag={Link} to="/evaluations" color="light" className="border">
            Back to Evaluations
          </Button>
        </div>

        {loading ? (
          <Card>
            <CardBody>
              <div className="text-center py-5">
                <Spinner size="sm" className="me-2" />
                Loading reviews...
              </div>
            </CardBody>
          </Card>
        ) : !reviews.length ? (
          <Card>
            <CardBody>
              <div className="text-center text-muted py-5">
                There are no evaluations yet
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            <Card className="mb-4">
              <CardBody>
                <Row className="align-items-center g-3">
                  <Col md="8">
                    <h4 className="card-title mb-1">Overall Average</h4>
                    <p className="text-muted mb-0">
                      Average score across all approved customer submissions.
                    </p>
                  </Col>
                  <Col md="4">
                    <div style={{ height: 180, position: "relative" }}>
                      <Doughnut data={summaryChart} options={chartOptions} />
                      <div className="position-absolute top-50 start-50 translate-middle text-center">
                        <div className="h3 mb-0">
                          {Number(data?.summary?.overallAverage || 0).toFixed(1)}
                        </div>
                        <div className="text-muted small">of 5</div>
                      </div>
                    </div>
                  </Col>
                </Row>
              </CardBody>
            </Card>

            <Card>
              <CardBody>
                <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
                  <div>
                    <h4 className="card-title mb-1">Customer Reviews</h4>
                    <p className="text-muted mb-0">
                      Select a review to see all question ratings and notes.
                    </p>
                  </div>
                </div>

                <div className="table-responsive">
                  <Table className="table align-middle table-nowrap mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Name</th>
                        <th>Passport No</th>
                        <th>Average Rate</th>
                        <th>Questions</th>
                        <th>Status</th>
                        <th>Submitted</th>
                        <th className="text-end">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviewRows.map(row => (
                        <tr key={row.id}>
                          <td className="fw-semibold">{row.clientName}</td>
                          <td>{row.passportNo || "-"}</td>
                          <td>{row.averageRating.toFixed(1)} / 5</td>
                          <td>{row.answerCount}</td>
                          <td>
                            <Badge color="success" pill>
                              {row.status}
                            </Badge>
                          </td>
                          <td>{formatDateTime(row.submittedOn)}</td>
                          <td className="text-end">
                            <Button
                              color="primary"
                              size="sm"
                              onClick={() => setSelectedReviewId(row.id)}
                            >
                              Detail
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              </CardBody>
            </Card>
          </>
        )}
      </Container>

      <Modal
        isOpen={!!selectedReview}
        toggle={() => setSelectedReviewId("")}
        size="xl"
        scrollable
      >
        <ModalHeader toggle={() => setSelectedReviewId("")}>
          Review Detail - {selectedReview?.CLIENT_NAME || "Guest"}
        </ModalHeader>
        <ModalBody>
          <Row className="g-4">
            <Col lg="8">
              <div className="mb-3">
                <div className="fw-semibold">
                  {selectedReview?.CLIENT_NAME || "Guest"}
                </div>
                <div className="text-muted">
                  Submitted {formatDateTime(selectedReview?.SUBMITTED_ON)}
                </div>
              </div>

              <div className="table-responsive">
                <Table className="table align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Question</th>
                      <th>Rating</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {asArray(selectedReview?.ANSWERS).map((answer, index) => (
                      <tr
                        key={`${selectedReview?._id}-${answer?.questionId || index}`}
                      >
                        <td>{answer?.questionText || "-"}</td>
                        <td>{answer?.rating || "-"} / 5</td>
                        <td>{answer?.comment || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            </Col>
            <Col lg="4">
              <div style={{ height: 220, position: "relative" }}>
                <Doughnut data={selectedReviewChart} options={chartOptions} />
                <div className="position-absolute top-50 start-50 translate-middle text-center">
                  <div className="h3 mb-0">
                    {Number(selectedReview?.AVERAGE_RATING || 0).toFixed(1)}
                  </div>
                  <div className="text-muted small">of 5</div>
                </div>
              </div>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button
            color="light"
            className="border"
            onClick={() => setSelectedReviewId("")}
          >
            Close
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default EvaluationReviewsPage;
