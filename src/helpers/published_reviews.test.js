import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPublishedReviewIndex,
  getPublishedReviewSummary,
} from "./published_reviews.js";

test("indexes published review summaries by normalized source name", () => {
  const index = buildPublishedReviewIndex({
    sources: [
      {
        sourceName: "InterContinental Amman",
        averageRating: 4.5,
        reviewCount: 2,
        reviews: [
          { reviewerName: "Lina", rating: 5, comment: "Excellent" },
          { reviewerName: "Omar", rating: 4, comment: "" },
        ],
      },
    ],
  });

  assert.equal(
    getPublishedReviewSummary(index, " intercontinental amman ").averageRating,
    4.5,
  );
  assert.equal(getPublishedReviewSummary(index, "Unknown").reviewCount, 0);
});
