import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Badge,
  Button,
  Card,
  CardBody,
  Col,
  Modal,
  ModalBody,
  ModalHeader,
  Row,
  Spinner,
} from "reactstrap";
import { Chart, registerables } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { get } from "../../helpers/api_helper";
import { EVALUATION_SOURCE_REVIEWS } from "../../helpers/url_helper";
import {
  buildPublishedReviewIndex,
  getPublishedReviewSummary,
} from "../../helpers/published_reviews";
import { getRatingDoughnutData } from "../../helpers/evaluation_workflow";

Chart.register(...registerables);

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: "68%",
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: context => `${context.label}: ${context.parsed}`,
      },
    },
  },
};

const Stars = ({ rating }) => {
  const filled = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span className="text-warning text-nowrap" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map(star => (
        <i key={star} className={`bx ${star <= filled ? "bxs-star" : "bx-star"}`} />
      ))}
    </span>
  );
};

Stars.propTypes = { rating: PropTypes.number.isRequired };

export const usePublishedReviews = sourceType => {
  const [payload, setPayload] = useState({ sources: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setPayload(await get(EVALUATION_SOURCE_REVIEWS(sourceType)));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message ||
          requestError?.message ||
          "Failed to load published reviews.",
      );
    } finally {
      setLoading(false);
    }
  }, [sourceType]);

  useEffect(() => {
    reload();
  }, [reload]);

  const index = useMemo(() => buildPublishedReviewIndex(payload), [payload]);
  return { index, loading, error, reload };
};

export const PublishedReviewsCell = ({ sourceName, reviewState }) => {
  const [open, setOpen] = useState(false);
  const summary = getPublishedReviewSummary(reviewState.index, sourceName);
  const chartData = useMemo(
    () => getRatingDoughnutData(summary.averageRating),
    [summary.averageRating],
  );

  if (reviewState.loading) return <Spinner size="sm" />;
  if (reviewState.error) return <span className="text-danger small">Unavailable</span>;

  return (
    <>
      <Button color="link" className="p-0 text-start text-decoration-none" onClick={() => setOpen(true)}>
        <div className="d-flex align-items-center gap-2">
          <Stars rating={summary.averageRating} />
          <strong>{summary.averageRating.toFixed(1)}</strong>
          <Badge color="light" className="text-dark border">
            {summary.reviewCount}
          </Badge>
        </div>
      </Button>

      <Modal isOpen={open} toggle={() => setOpen(value => !value)} size="xl" centered scrollable>
        <ModalHeader toggle={() => setOpen(false)}>
          Published Reviews — {sourceName}
        </ModalHeader>
        <ModalBody>
          <Card className="mb-4 border shadow-none">
            <CardBody>
              <Row className="align-items-center g-3">
                <Col md="8">
                  <h4 className="card-title mb-1">Overall Average</h4>
                  <p className="text-muted mb-2">
                    Average score for {sourceName} across all approved customer submissions.
                  </p>
                  <div className="d-flex align-items-center gap-2">
                    <Stars rating={summary.averageRating} />
                    <span className="text-muted">
                      {summary.reviewCount} review{summary.reviewCount === 1 ? "" : "s"}
                    </span>
                  </div>
                </Col>
                <Col md="4">
                  <div style={{ height: 180, position: "relative" }}>
                    <Doughnut data={chartData} options={chartOptions} />
                    <div className="position-absolute top-50 start-50 translate-middle text-center">
                      <div className="h3 mb-0">{summary.averageRating.toFixed(1)}</div>
                      <div className="text-muted small">of 5</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </CardBody>
          </Card>

          <h5 className="mb-3">Customer Reviews</h5>
          {summary.reviewCount ? (
            <div className="d-grid gap-3">
              {summary.reviews.map((review, index) => (
                <div key={`${review.reviewerName}-${review.submittedOn || index}`} className="border rounded p-3">
                  <div className="d-flex flex-wrap justify-content-between gap-2 mb-2">
                    <strong>{review.reviewerName || "Guest"}</strong>
                    <div className="d-flex align-items-center gap-2">
                      <Stars rating={Number(review.rating) || 0} />
                      <span>{review.rating} / 5</span>
                    </div>
                  </div>
                  {review.comment ? <p className="mb-0">{review.comment}</p> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted py-4">
              There are no published reviews for {sourceName} yet.
            </div>
          )}
        </ModalBody>
      </Modal>
    </>
  );
};

PublishedReviewsCell.propTypes = {
  sourceName: PropTypes.string.isRequired,
  reviewState: PropTypes.shape({
    index: PropTypes.instanceOf(Map).isRequired,
    loading: PropTypes.bool.isRequired,
    error: PropTypes.string.isRequired,
  }).isRequired,
};
