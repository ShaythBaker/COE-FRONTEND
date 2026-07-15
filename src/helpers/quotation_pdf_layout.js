export const QUOTATION_PDF_SECTIONS = [
  "coverLetter",
  "arrivalDeparture",
  "itinerary",
  "inclusionsExclusions",
  "suggestedHotels",
  "packagePrice",
  "generalNotes",
  "bankAccount",
];

export const renderQuotationPdfSections = renderers => {
  QUOTATION_PDF_SECTIONS.forEach(section => {
    renderers?.[section]?.();
  });
};

const twoDigits = value => String(Math.max(0, Number(value) || 0)).padStart(2, "0");

export const buildTravcoPackageTitle = quotationInfo => {
  const days = Math.max(0, Number(quotationInfo?.tripDays) || 0);
  const nights = Math.max(0, Number(quotationInfo?.tripNights) || 0);

  return {
    title: `Jordan ${days} Days Package`,
    duration: `${twoDigits(days)} Days / ${twoDigits(nights)} Nights`,
  };
};

export const getUniquePdfImages = (images, limit = Number.POSITIVE_INFINITY) => {
  const unique = [];
  const seen = new Set();

  (Array.isArray(images) ? images : []).forEach(value => {
    const image = String(value || "").trim();
    if (!image || seen.has(image) || unique.length >= limit) return;
    seen.add(image);
    unique.push(image);
  });

  return unique;
};

export const selectPdfImagePanel = (images, pageIndex = 0) => {
  const unique = getUniquePdfImages(images);
  if (!unique.length) return { mainImage: "", thumbnailImages: [] };

  const start = ((Number(pageIndex) || 0) % unique.length + unique.length) % unique.length;
  const rotated = [...unique.slice(start), ...unique.slice(0, start)];

  return {
    mainImage: rotated[0],
    thumbnailImages: rotated.slice(1, 4),
  };
};

export const getTravcoPageDecoration = ({
  isFinalPage = false,
  pageWidth = 210,
  pageHeight = 297,
  bottomMargin = 18,
} = {}) => ({
  showFooterLogo: false,
  closingText: isFinalPage
    ? {
        text: "THANK YOU",
        x: pageWidth / 2,
        y: pageHeight - bottomMargin,
        align: "center",
      }
    : null,
});

const normalizeOptionText = value =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const getPdfOptionStars = option => {
  const match = String(option?.optionStars ?? option?.stars ?? "").match(/\d+/);
  return match ? `${match[0]}*` : "";
};

export const getPdfOptionKey = (option, index = 0) => {
  const baseKey = String(option?.optionBaseKey || "").trim();
  if (baseKey) return `base:${baseKey}`;

  const optionName = String(option?.optionName || option?.name || "Option").trim();
  const optionIndex = Number(option?.optionIndex);
  if (Number.isFinite(optionIndex)) {
    return `index:${optionIndex}:${normalizeOptionText(optionName)}`;
  }

  const nameKey = normalizeOptionText(optionName);
  return nameKey
    ? `name:${nameKey}:${normalizeOptionText(getPdfOptionStars(option))}`
    : `fallback:${index}`;
};

export const getPdfOptionsForColumn = (options, column) => {
  const list = Array.isArray(options) ? options : [];

  if (column && typeof column === "object" && column.key) {
    return list.filter(
      (option, index) => getPdfOptionKey(option, index) === column.key
    );
  }

  const wanted = normalizeOptionText(column?.label || column);
  return list.filter(option => {
    const name = normalizeOptionText(option?.optionName || option?.name);
    const stars = normalizeOptionText(getPdfOptionStars(option));
    return wanted && (wanted === name || wanted === stars);
  });
};

export const buildPdfOptionColumns = options => {
  const columnsByKey = new Map();

  (Array.isArray(options) ? options : []).forEach((option, index) => {
    const key = getPdfOptionKey(option, index);
    if (columnsByKey.has(key)) return;

    columnsByKey.set(key, {
      key,
      optionName: String(option?.optionName || option?.name || `Option ${index + 1}`).trim(),
      stars: getPdfOptionStars(option),
    });
  });

  const columns = Array.from(columnsByKey.values());
  const starCounts = columns.reduce((counts, column) => {
    if (column.stars) counts.set(column.stars, (counts.get(column.stars) || 0) + 1);
    return counts;
  }, new Map());

  return columns.map(column => ({
    ...column,
    label:
      column.stars && starCounts.get(column.stars) > 1
        ? `${column.optionName} - ${column.stars}`
        : column.stars || column.optionName,
  }));
};

export const chunkPdfOptionColumns = (columns, maximumPerPage = 4) => {
  const list = Array.isArray(columns) ? columns : [];
  const size = Math.max(1, Math.floor(Number(maximumPerPage) || 4));
  const batches = [];

  for (let index = 0; index < list.length; index += size) {
    batches.push(list.slice(index, index + size));
  }

  return batches;
};
