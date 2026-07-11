import test from "node:test";
import assert from "node:assert/strict";

import {
  EVALUATION_STATUS,
  buildEvaluationReviewsPath,
  buildPublicEvaluationUrl,
  buildReviewListRows,
  canEditEvaluation,
  findReviewById,
  getEvaluationBadgeColor,
  getRatingDoughnutData,
} from "./evaluation_workflow.js";

test("buildPublicEvaluationUrl creates a front-end customer link", () => {
  assert.equal(
    buildPublicEvaluationUrl("abc123", "https://coe.example.com/app/"),
    "https://coe.example.com/public/evaluations/abc123"
  );
});

test("buildEvaluationReviewsPath creates an internal protected reviews path", () => {
  assert.equal(
    buildEvaluationReviewsPath("eval123"),
    "/evaluations/eval123/reviews"
  );
});

test("canEditEvaluation makes published evaluations read-only", () => {
  assert.equal(canEditEvaluation(EVALUATION_STATUS.PUBLISHED), false);
  assert.equal(canEditEvaluation(EVALUATION_STATUS.SAVED), true);
  assert.equal(canEditEvaluation(EVALUATION_STATUS.PENDING), true);
});

test("evaluation badge colors distinguish pending saved and published states", () => {
  assert.equal(getEvaluationBadgeColor(EVALUATION_STATUS.PENDING), "warning");
  assert.equal(getEvaluationBadgeColor(EVALUATION_STATUS.SAVED), "success");
  assert.equal(getEvaluationBadgeColor(EVALUATION_STATUS.PUBLISHED), "primary");
});

test("getRatingDoughnutData converts an average rating to filled and remaining chart values", () => {
  const data = getRatingDoughnutData(3.5);

  assert.deepEqual(data.datasets[0].data, [3.5, 1.5]);
  assert.equal(data.labels[0], "Average");
});

test("buildReviewListRows creates compact review rows for the reviews list", () => {
  const rows = buildReviewListRows([
    {
      _id: "review-1",
      CLIENT_NAME: "James Mitchell",
      PASSPORT_NO: "GBR9004413",
      AVERAGE_RATING: 4.7,
      STATUS: "Approved",
      SUBMITTED_ON: "2026-07-03T14:54:00Z",
      ANSWERS: [{ rating: 5 }, { rating: 4 }],
    },
  ]);

  assert.equal(rows[0].id, "review-1");
  assert.equal(rows[0].clientName, "James Mitchell");
  assert.equal(rows[0].averageRating, 4.7);
  assert.equal(rows[0].answerCount, 2);
});

test("findReviewById returns the matching raw review", () => {
  const reviews = [{ _id: "a" }, { _id: "b", CLIENT_NAME: "Sarah" }];

  assert.equal(findReviewById(reviews, "b").CLIENT_NAME, "Sarah");
  assert.equal(findReviewById(reviews, "missing"), null);
});
