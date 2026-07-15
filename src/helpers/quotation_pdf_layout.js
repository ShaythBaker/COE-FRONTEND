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
