const cleanName = value => String(value || "").trim().toLowerCase();

export const EMPTY_PUBLISHED_REVIEW_SUMMARY = {
  sourceName: "",
  averageRating: 0,
  reviewCount: 0,
  reviews: [],
};

export const buildPublishedReviewIndex = payload => {
  const index = new Map();
  const sources = Array.isArray(payload?.sources) ? payload.sources : [];
  sources.forEach(source => {
    const key = cleanName(source?.sourceName);
    if (key) index.set(key, source);
  });
  return index;
};

export const getPublishedReviewSummary = (index, sourceName) =>
  index instanceof Map
    ? index.get(cleanName(sourceName)) || EMPTY_PUBLISHED_REVIEW_SUMMARY
    : EMPTY_PUBLISHED_REVIEW_SUMMARY;
