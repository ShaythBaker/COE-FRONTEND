import { useCallback, useEffect, useMemo, useState } from "react";
import PropTypes from "prop-types";
import {
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalHeader,
  Spinner,
} from "reactstrap";
import { get } from "../../helpers/api_helper";
import { EVALUATION_SOURCE_REVIEWS } from "../../helpers/url_helper";
import {
  buildPublishedReviewIndex,
  getPublishedReviewSummary,
} from "../../helpers/published_reviews";

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

  if (reviewState.loading) return <Spinner size="sm" />;
  if (reviewState.error) return <span className="text-danger small">Unavailable</span>;
  if (!summary.reviewCount) return <span className="text-muted">No reviews</span>;

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

      <Modal isOpen={open} toggle={() => setOpen(value => !value)} size="lg" centered>
        <ModalHeader toggle={() => setOpen(false)}>
          Published Reviews — {sourceName}
        </ModalHeader>
        <ModalBody>
          <div className="d-flex align-items-center gap-2 mb-3">
            <Stars rating={summary.averageRating} />
            <strong>{summary.averageRating.toFixed(1)} / 5</strong>
            <span className="text-muted">({summary.reviewCount} reviews)</span>
          </div>
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
