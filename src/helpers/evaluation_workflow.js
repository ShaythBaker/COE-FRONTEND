export const RESERVATION_FILE_STATUS = {
  DRAFT: "Draft",
  APPROVED: "Approved",
};

export const EVALUATION_STATUS = {
  PENDING: "Pending",
  SAVED: "Saved",
  PUBLISHED: "Published",
};

const cleanText = value => String(value || "").trim();

const asArray = value => (Array.isArray(value) ? value : []);

const idToString = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?.$oid) return String(value.$oid);
  if (value?._id && value._id !== value) return idToString(value._id);
  return String(value || "");
};

export const normalizeEvaluationStatus = value => {
  const normalized = cleanText(value).toLowerCase();
  return (
    Object.values(EVALUATION_STATUS).find(
      status => status.toLowerCase() === normalized
    ) || EVALUATION_STATUS.PENDING
  );
};

export const normalizeReservationFileStatus = value => {
  const normalized = cleanText(value).toLowerCase();
  return (
    Object.values(RESERVATION_FILE_STATUS).find(
      status => status.toLowerCase() === normalized
    ) || RESERVATION_FILE_STATUS.DRAFT
  );
};

export const getEvaluationBadgeColor = status => {
  const normalized = normalizeEvaluationStatus(status);
  if (normalized === EVALUATION_STATUS.PUBLISHED) return "primary";
  if (normalized === EVALUATION_STATUS.SAVED) return "success";
  return "warning";
};

export const getReservationBadgeColor = status =>
  normalizeReservationFileStatus(status) === RESERVATION_FILE_STATUS.APPROVED
    ? "success"
    : "warning";

export const canEditEvaluation = status => {
  const normalized = normalizeEvaluationStatus(status);
  return [
    EVALUATION_STATUS.PENDING,
    EVALUATION_STATUS.SAVED,
  ].includes(normalized);
};

export const buildEvaluationReviewsPath = evaluationId =>
  `/evaluations/${encodeURIComponent(cleanText(evaluationId))}/reviews`;

export const buildPublicEvaluationUrl = (token, origin) => {
  const safeToken = encodeURIComponent(cleanText(token));
  const rawBase = cleanText(origin).replace(/\/+$/, "");
  const base = rawBase
    ? (() => {
        try {
          return new URL(rawBase).origin;
        } catch {
          return rawBase;
        }
      })()
    : "";
  return `${base}/public/evaluations/${safeToken}`;
};

export const getRatingDoughnutData = averageRating => {
  const average = Math.min(5, Math.max(0, Number(averageRating) || 0));
  const rounded = Math.round(average * 10) / 10;

  return {
    labels: ["Average", "Remaining"],
    datasets: [
      {
        data: [rounded, Math.round((5 - rounded) * 10) / 10],
        backgroundColor: ["#34c38f", "#eff2f7"],
        borderWidth: 0,
      },
    ],
  };
};

export const buildReviewListRows = reviews =>
  asArray(reviews).map((review, index) => {
    const average = Number(review?.AVERAGE_RATING || 0);

    return {
      id: idToString(review?._id) || `review-${index + 1}`,
      clientName: cleanText(review?.CLIENT_NAME) || "Guest",
      passportNo: cleanText(review?.PASSPORT_NO),
      averageRating: Number.isFinite(average)
        ? Math.round(average * 10) / 10
        : 0,
      status: cleanText(review?.STATUS) || "Approved",
      submittedOn: review?.SUBMITTED_ON || "",
      answerCount: asArray(review?.ANSWERS).length,
      raw: review,
    };
  });

export const findReviewById = (reviews, reviewId) => {
  const targetId = cleanText(reviewId);
  if (!targetId) return null;

  return (
    asArray(reviews).find(review => idToString(review?._id) === targetId) ||
    null
  );
};
