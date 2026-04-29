import { jsPDF } from "jspdf";
import { get } from "./api_helper";
import { getAttachmentBlob } from "./attachments_helper";

const PAGE = {
  width: 210,
  height: 297,
  margin: 14,
};

const COLORS = {
  ink: [18, 31, 53],
  muted: [100, 116, 139],
  soft: [246, 248, 252],
  line: [226, 232, 240],
  primary: [64, 92, 230],
  primaryDark: [20, 38, 82],
  accent: [12, 180, 176],
  sunset: [238, 111, 30],
  success: [22, 163, 74],
  danger: [220, 38, 38],
  paleAccent: [229, 248, 247],
  white: [255, 255, 255],
};

const DEFAULT_BRAND_COLORS = {
  primary: [...COLORS.primary],
  primaryDark: [...COLORS.primaryDark],
  accent: [...COLORS.accent],
  paleAccent: [...COLORS.paleAccent],
};

const asArray = value => (Array.isArray(value) ? value : []);

const normalizeKey = value =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const safeText = value => {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
};

const plainText = value =>
  safeText(value)
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/_(.*?)_/g, "$1")
    .replace(/\[(.*?)\]\((.*?)\)/g, "$1");

const formatDate = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatMoney = value => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toFixed(2);
};

const unwrapId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    if (value.$oid) return value.$oid;
    if (value._id) return unwrapId(value._id);
    if (value.id) return unwrapId(value.id);
  }
  return "";
};

const getPlaceImageIds = place => {
  const raw = Array.isArray(place?.PLACE_IMAGE_ATTACHMENT_IDS)
    ? place.PLACE_IMAGE_ATTACHMENT_IDS
    : [];

  return raw.map(unwrapId).filter(Boolean);
};

const blobToDataUrl = blob =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const imageBlobToJpegDataUrl = blob =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const maxSize = 1600;
      const ratio = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * ratio));
      canvas.height = Math.max(1, Math.round(image.height * ratio));

      const context = canvas.getContext("2d");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };

    image.onerror = error => {
      URL.revokeObjectURL(objectUrl);
      reject(error);
    };

    image.src = objectUrl;
  });

const getImageDataUrl = async attachmentId => {
  if (!attachmentId) return "";

  try {
    const blob = await getAttachmentBlob(attachmentId);
    if (!blob) return "";
    try {
      return await imageBlobToJpegDataUrl(blob);
    } catch {
      return await blobToDataUrl(blob);
    }
  } catch {
    return "";
  }
};

const getImageDataUrls = async attachmentIds => {
  const urls = await Promise.all(
    asArray(attachmentIds)
      .slice(0, 3)
      .map(attachmentId => getImageDataUrl(attachmentId))
  );

  return urls.filter(Boolean);
};

const getImageFormat = dataUrl => {
  if (String(dataUrl).includes("image/png")) return "PNG";
  if (String(dataUrl).includes("image/webp")) return "WEBP";
  return "JPEG";
};

const clampColor = value => Math.max(0, Math.min(255, Math.round(value)));

const mixColors = (color, target, amount = 0.5) =>
  color.map((value, index) =>
    clampColor(value + (target[index] - value) * amount)
  );

const applyBrandColors = brandColors => {
  COLORS.primary = brandColors.primary;
  COLORS.primaryDark = brandColors.primaryDark;
  COLORS.accent = brandColors.accent;
  COLORS.paleAccent = brandColors.paleAccent;
};

const getLogoPalette = dataUrl =>
  new Promise(resolve => {
    if (!dataUrl) {
      resolve(DEFAULT_BRAND_COLORS);
      return;
    }

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      const buckets = new Map();

      for (let i = 0; i < pixels.length; i += 16) {
        const alpha = pixels[i + 3];
        if (alpha < 80) continue;

        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max - min;
        const brightness = (r + g + b) / 3;
        if (brightness > 238 || brightness < 18 || saturation < 18) continue;

        const key = [
          Math.round(r / 32) * 32,
          Math.round(g / 32) * 32,
          Math.round(b / 32) * 32,
        ].join(",");
        buckets.set(key, (buckets.get(key) || 0) + 1);
      }

      const ranked = Array.from(buckets.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([key]) => key.split(",").map(Number));

      const primary = ranked[0] || DEFAULT_BRAND_COLORS.primary;
      const secondary =
        ranked.find(color =>
          Math.abs(color[0] - primary[0]) +
            Math.abs(color[1] - primary[1]) +
            Math.abs(color[2] - primary[2]) >
          80
        ) || ranked[1] || DEFAULT_BRAND_COLORS.accent;

      resolve({
        primary,
        primaryDark: mixColors(primary, [0, 0, 0], 0.48),
        accent: secondary,
        paleAccent: mixColors(secondary, [255, 255, 255], 0.84),
      });
    };
    image.onerror = () => resolve(DEFAULT_BRAND_COLORS);
    image.src = dataUrl;
  });

const addPageIfNeeded = (doc, y, needed = 24) => {
  if (y + needed <= PAGE.height - PAGE.margin) return y;
  doc.addPage();
  return PAGE.margin;
};

const setColor = (doc, color, fill = false) => {
  if (fill) doc.setFillColor(...color);
  else doc.setTextColor(...color);
};

const addImageCover = (doc, imageDataUrl, x, y, width, height) => {
  if (!imageDataUrl) return false;

  try {
    doc.addImage(imageDataUrl, getImageFormat(imageDataUrl), x, y, width, height);
    return true;
  } catch {
    return false;
  }
};

const addImageContain = (doc, imageDataUrl, x, y, width, height) => {
  if (!imageDataUrl) return false;

  try {
    const properties = doc.getImageProperties(imageDataUrl);
    const imageRatio = properties.width / properties.height;
    const boxRatio = width / height;
    let drawWidth = width;
    let drawHeight = height;

    if (imageRatio > boxRatio) {
      drawHeight = width / imageRatio;
    } else {
      drawWidth = height * imageRatio;
    }

    doc.addImage(
      imageDataUrl,
      getImageFormat(imageDataUrl),
      x + (width - drawWidth) / 2,
      y + (height - drawHeight) / 2,
      drawWidth,
      drawHeight
    );
    return true;
  } catch {
    return false;
  }
};

const addCoverPage = (doc, quotationInfo, places, agentLogoDataUrl = "") => {
  const heroImage = places.find(place => place.imageDataUrl)?.imageDataUrl || "";
  const secondaryImages = places
    .flatMap(place => place.imageDataUrls || [])
    .filter(Boolean)
    .slice(1, 4);

  setColor(doc, COLORS.white, true);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");

  setColor(doc, COLORS.primaryDark, true);
  doc.rect(0, 0, PAGE.width, 72, "F");
  setColor(doc, COLORS.primary, true);
  doc.rect(0, 66, PAGE.width, 6, "F");
  setColor(doc, COLORS.accent, true);
  doc.triangle(138, 0, PAGE.width, 0, PAGE.width, 72, "F");

  const logoX = PAGE.margin;
  const logoY = 16;
  const logoW = 44;
  const logoH = 28;
  setColor(doc, COLORS.white, true);
  doc.roundedRect(logoX, logoY, logoW, logoH, 3, 3, "F");
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(logoX, logoY, logoW, logoH, 3, 3);
  if (agentLogoDataUrl) {
    addImageContain(doc, agentLogoDataUrl, logoX + 3, logoY + 3, logoW - 6, logoH - 6);
  } else {
    setColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("LOGO", logoX + logoW / 2, logoY + 17, { align: "center" });
  }

  setColor(doc, COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(21);
  doc.text("Travel Quotation", logoX + logoW + 8, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(safeText(quotationInfo.travelAgentName), logoX + logoW + 8, 34);
  doc.text(`Reference ${safeText(quotationInfo.referenceNumber)}`, logoX + logoW + 8, 42);

  doc.setFontSize(8);
  doc.text(`Prepared ${formatDate(new Date())}`, PAGE.width - PAGE.margin, 26, {
    align: "right",
  });

  if (heroImage) {
    addImageCover(doc, heroImage, 0, 72, PAGE.width, 84);
    setColor(doc, [0, 0, 0], true);
    doc.setGState(new doc.GState({ opacity: 0.28 }));
    doc.rect(0, 72, PAGE.width, 84, "F");
    doc.setGState(new doc.GState({ opacity: 1 }));
  } else {
    setColor(doc, COLORS.paleAccent, true);
    doc.rect(0, 72, PAGE.width, 84, "F");
  }

  setColor(doc, COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(30);
  doc.text("TRAVEL", PAGE.margin, 108);
  doc.text("QUOTATION", PAGE.margin, 123);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Approved customer-facing quotation", PAGE.margin, 135);

  const detailY = 176;
  setColor(doc, COLORS.white, true);
  doc.roundedRect(PAGE.margin, detailY, PAGE.width - PAGE.margin * 2, 54, 4, 4, "F");
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(PAGE.margin, detailY, PAGE.width - PAGE.margin * 2, 54, 4, 4);
  setColor(doc, COLORS.primary, true);
  doc.rect(PAGE.margin, detailY, 3, 54, "F");

  const contactLogoX = PAGE.margin + 10;
  const contactLogoY = detailY + 13;
  setColor(doc, COLORS.white, true);
  doc.roundedRect(contactLogoX, contactLogoY, 34, 24, 3, 3, "F");
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(contactLogoX, contactLogoY, 34, 24, 3, 3);
  if (agentLogoDataUrl) {
    addImageContain(doc, agentLogoDataUrl, contactLogoX + 3, contactLogoY + 3, 28, 18);
  }

  const agentInfoX = PAGE.margin + 54;
  setColor(doc, COLORS.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(safeText(quotationInfo.travelAgentName), agentInfoX, detailY + 16);

  setColor(doc, COLORS.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  const agentDetails = [
    quotationInfo.travelAgentEmail,
    quotationInfo.travelAgentPhone,
    quotationInfo.travelAgentCountry,
  ].filter(Boolean);
  doc.text(doc.splitTextToSize(agentDetails.join("  |  "), 86).slice(0, 2), agentInfoX, detailY + 26);

  const summaryItems = [
    ["Duration", `${safeText(quotationInfo.tripDays)} days / ${safeText(quotationInfo.tripNights)} nights`],
    ["Pax", safeText(quotationInfo.paxCount)],
    ["Validity", `${safeText(quotationInfo.validityDays)} day(s)`],
  ];

  summaryItems.forEach(([label, value], index) => {
    const x = PAGE.margin + 54 + index * 38;
    const y = detailY + 38;
    setColor(doc, COLORS.paleAccent, true);
    doc.roundedRect(x, y, 32, 10, 2, 2, "F");
    setColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text(label, x + 2.5, y + 4);
    setColor(doc, COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.7);
    doc.text(doc.splitTextToSize(safeText(value), 27).slice(0, 1), x + 2.5, y + 8);
  });

  if (secondaryImages.length) {
    secondaryImages.forEach((image, index) => {
      const x = PAGE.margin + index * 32;
      addImageCover(doc, image, x, 246, 27, 23);
      setColor(doc, COLORS.white);
      doc.roundedRect(x, 246, 27, 23, 2, 2);
    });
  }
};

const addSectionTitle = (doc, title, subtitle, y) => {
  y = addPageIfNeeded(doc, y, 24);
  setColor(doc, COLORS.accent, true);
  doc.roundedRect(PAGE.margin, y - 5, 2.5, 12, 1, 1, "F");
  setColor(doc, COLORS.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, PAGE.margin + 6, y);

  if (subtitle) {
    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(subtitle, PAGE.margin + 6, y + 5);
    return y + 13;
  }

  return y + 9;
};

const addInfoGrid = (doc, items, y, columns = 2) => {
  const gap = 4;
  const cardWidth =
    (PAGE.width - PAGE.margin * 2 - gap * (columns - 1)) / columns;
  const cardHeight = 22;

  items.forEach((item, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = PAGE.margin + col * (cardWidth + gap);
    const top = y + row * (cardHeight + gap);

    setColor(doc, COLORS.white, true);
    doc.roundedRect(x, top, cardWidth, cardHeight, 3, 3, "F");
    setColor(doc, COLORS.line);
    doc.roundedRect(x, top, cardWidth, cardHeight, 3, 3);

    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(item.label, x + 4, top + 7);

    setColor(doc, COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const valueLines = doc.splitTextToSize(safeText(item.value), cardWidth - 8);
    doc.text(valueLines.slice(0, 2), x + 4, top + 14);
  });

  return y + Math.ceil(items.length / columns) * (cardHeight + gap) + 2;
};

const addBodyText = (doc, text, y, options = {}) => {
  const width = options.width || PAGE.width - PAGE.margin * 2;
  const x = options.x || PAGE.margin;
  const fontSize = options.fontSize || 9;
  const lineHeight = options.lineHeight || 5;
  const lines = doc.splitTextToSize(safeText(text), width);

  setColor(doc, options.color || COLORS.ink);
  doc.setFont("helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(fontSize);
  doc.text(lines, x, y);

  return y + lines.length * lineHeight;
};

const addGeneralNotesTitle = (doc, y) => {
  y = addPageIfNeeded(doc, y, 24);
  setColor(doc, COLORS.primary, true);
  doc.roundedRect(PAGE.margin, y - 6, 2.8, 15, 1.4, 1.4, "F");
  setColor(doc, COLORS.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("General Notes", PAGE.margin + 6, y);
  setColor(doc, COLORS.ink);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Important information for the traveler.", PAGE.margin + 6, y + 6);
  return y + 18;
};

const getGeneralNoteLines = (doc, text, width) => {
  const paragraphs = plainText(text)
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
  const source = paragraphs.length ? paragraphs : ["No general notes were added."];

  return source.flatMap(paragraph => {
    const wrapped = doc.splitTextToSize(paragraph, width);
    return wrapped.map((line, index) => ({
      text: line,
      hasBullet: index === 0,
    }));
  });
};

const addGeneralNotesPanel = (doc, text, y) => {
  const cardX = PAGE.margin;
  const cardWidth = PAGE.width - PAGE.margin * 2;
  const paddingX = 9;
  const paddingY = 9;
  const lineHeight = 5.4;
  const textWidth = cardWidth - paddingX * 2 - 8;
  const lines = getGeneralNoteLines(doc, text, textWidth);
  let index = 0;

  while (index < lines.length) {
    y = addPageIfNeeded(doc, y, 34);
    const availableHeight = PAGE.height - PAGE.margin - y - 14;
    const maxLines = Math.max(1, Math.floor((availableHeight - paddingY * 2) / lineHeight));
    const chunk = lines.slice(index, index + maxLines);
    const cardHeight = paddingY * 2 + chunk.length * lineHeight + 2;

    setColor(doc, COLORS.white, true);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 4, 4, "F");
    doc.setDrawColor(...COLORS.line);
    doc.roundedRect(cardX, y, cardWidth, cardHeight, 4, 4);
    setColor(doc, COLORS.primary, true);
    doc.roundedRect(cardX, y, 3, cardHeight, 1.5, 1.5, "F");

    let lineY = y + paddingY + 4;
    chunk.forEach(item => {
      if (item.hasBullet) {
        setColor(doc, COLORS.primary, true);
        doc.circle(cardX + paddingX - 1, lineY - 1.4, 1.1, "F");
      }

      const textX = cardX + paddingX + 6;
      const colonIndex = String(item.text).indexOf(":");
      if (colonIndex > 0 && colonIndex < 28) {
        const label = item.text.slice(0, colonIndex + 1);
        const value = item.text.slice(colonIndex + 1).trim();
        setColor(doc, COLORS.primaryDark);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9.2);
        doc.text(label, textX, lineY);

        setColor(doc, COLORS.ink);
        doc.setFont("helvetica", "normal");
        doc.text(value, textX + doc.getTextWidth(label) + 1.5, lineY);
      } else {
        setColor(doc, COLORS.ink);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9.2);
        doc.text(item.text, textX, lineY);
      }

      lineY += lineHeight;
    });

    index += chunk.length;
    y += cardHeight + 8;
    if (index < lines.length) {
      doc.addPage();
      y = PAGE.margin;
    }
  }

  return y;
};

const addTable = (doc, headers, rows, y, widths) => {
  const headerHeight = 10;
  y = addPageIfNeeded(doc, y, headerHeight * 2);

  setColor(doc, COLORS.primaryDark, true);
  doc.roundedRect(
    PAGE.margin,
    y,
    PAGE.width - PAGE.margin * 2,
    headerHeight,
    2,
    2,
    "F"
  );

  let x = PAGE.margin + 3;
  setColor(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  headers.forEach((header, index) => {
    doc.text(header, x, y + 6.3);
    x += widths[index];
  });

  y += headerHeight;
  rows.forEach((row, rowIndex) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const cellLines = row.map((cell, index) =>
      doc.splitTextToSize(safeText(cell), widths[index] - 4)
    );
    const rowHeight = Math.max(10, Math.max(...cellLines.map(lines => lines.length)) * 4 + 5);

    y = addPageIfNeeded(doc, y, rowHeight + 4);

    if (rowIndex % 2 === 0) {
      setColor(doc, COLORS.soft, true);
      doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, rowHeight, "F");
    }

    setColor(doc, COLORS.line);
    doc.line(PAGE.margin, y + rowHeight, PAGE.width - PAGE.margin, y + rowHeight);

    x = PAGE.margin + 3;
    setColor(doc, COLORS.ink);
    cellLines.forEach((lines, index) => {
      doc.text(lines, x, y + 5);
      x += widths[index];
    });
    y += rowHeight;
  });

  return y + 4;
};

const addOptionPricingSummary = (doc, option, y) => {
  y = addPageIfNeeded(doc, y, 58);
  setColor(doc, COLORS.paleAccent, true);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 46, 4, 4, "F");

  setColor(doc, COLORS.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Clear Price Summary", PAGE.margin + 5, y + 8);

  setColor(doc, COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    "Customer-facing per-person totals for the selected option.",
    PAGE.margin + 5,
    y + 14
  );

  const items = [
    {
      label: "Hotels / Person",
      value: formatMoney(option.hotelsDisplayPrice),
      subtitle: "Selected seasons",
    },
    {
      label: "Shared / Person",
      value: formatMoney(option.sharedDisplayPrice),
      subtitle: "Transport, meals, fees",
    },
    {
      label: "Final Total",
      value: formatMoney(option.finalPerPerson),
      subtitle: "Per person",
    },
  ];

  const gap = 3;
  const cardWidth = (PAGE.width - PAGE.margin * 2 - 10 - gap * 2) / 3;
  const top = y + 20;

  items.forEach((item, index) => {
    const x = PAGE.margin + 5 + index * (cardWidth + gap);
    setColor(doc, [255, 255, 255], true);
    doc.roundedRect(x, top, cardWidth, 22, 2, 2, "F");

    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(item.label, x + 2.5, top + 5);

    setColor(doc, index === items.length - 1 ? COLORS.primary : COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(index === items.length - 1 ? 11 : 10);
    doc.text(item.value, x + 2.5, top + 12);

    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.text(doc.splitTextToSize(item.subtitle, cardWidth - 5), x + 2.5, top + 18);
  });

  return y + 52;
};

const buildSupplementTotalRows = (rows = [], optionName = "Option") => {
  const applicableRows = asArray(rows).filter(row => Number(row?.nights) > 0);
  if (!applicableRows.length) return [];

  return ["BB", "HB", "FB", "SS"]
    .map(supplement => {
      const key = supplement.toLowerCase();
      const price = applicableRows.reduce(
        (sum, row) => sum + Number(row?.[key] || 0),
        0
      );

      return {
        optionName,
        supplement,
        price,
      };
    })
    .filter(row => row.price > 0);
};

const addSeasonSummaryTable = (doc, rows = [], y, optionName = "Option") => {
  const supplementRows = buildSupplementTotalRows(rows, optionName);
  if (!supplementRows.length) return y;

  y = addSectionTitle(
    doc,
    "Hotel Season Price Summary",
    "Supplement totals calculated from all hotels used in this option.",
    y + 2
  );

  return addTable(
    doc,
    ["Option Name", "Supplement", "Price"],
    supplementRows.map(row => [
      row.optionName,
      row.supplement,
      formatMoney(row.price),
    ]),
    y,
    [84, 44, 42]
  );
};

const getPlaceCityName = place =>
  place?.PLACE_CITY_NAME ||
  place?.CITY_NAME ||
  place?.PLACE_CITY?.LIST_ITEM_VALUE_EN ||
  place?.PLACE_CITY?.LIST_ITEM_VALUE ||
  place?.PLACE_CITY?.ITEM_VALUE ||
  "";

const addPlaceChapterPage = (doc, place, index) => {
  const images = asArray(place.imageDataUrls).length
    ? asArray(place.imageDataUrls)
    : place.imageDataUrl
    ? [place.imageDataUrl]
    : [];

  const cityName = getPlaceCityName(place);
  const description = plainText(
    place.PLACE_DESCRIPTION || "A featured stop in this itinerary."
  );

  if (images[0]) {
    addImageCover(doc, images[0], 0, 0, PAGE.width, PAGE.height);
  } else {
    setColor(doc, COLORS.primaryDark, true);
    doc.rect(0, 0, PAGE.width, PAGE.height, "F");
    setColor(doc, COLORS.accent, true);
    doc.triangle(0, 0, PAGE.width * 0.62, 0, 0, PAGE.height, "F");
  }

  setColor(doc, [0, 0, 0], true);
  doc.setGState(new doc.GState({ opacity: 0.54 }));
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
  doc.setGState(new doc.GState({ opacity: 1 }));

  setColor(doc, COLORS.sunset, true);
  doc.setGState(new doc.GState({ opacity: 0.42 }));
  doc.rect(0, 0, 72, PAGE.height, "F");
  doc.setGState(new doc.GState({ opacity: 1 }));

  setColor(doc, [255, 255, 255], true);
  doc.setGState(new doc.GState({ opacity: 0.2 }));
  doc.roundedRect(92, 36, 62, 86, 18, 18, "F");
  doc.setGState(new doc.GState({ opacity: 0.22 }));
  doc.roundedRect(116, 45, 58, 88, 16, 16, "F");
  doc.setGState(new doc.GState({ opacity: 1 }));

  setColor(doc, COLORS.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(15);
  doc.text(cityName ? String(cityName) : "Place To Visit", PAGE.margin, 118);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  const titleLines = doc.splitTextToSize(safeText(place.PLACE_NAME), 88).slice(0, 2);
  doc.text(titleLines, PAGE.margin, 134);

  setColor(doc, COLORS.white, true);
  doc.rect(PAGE.margin, 141 + (titleLines.length - 1) * 9, 37, 0.7, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("CHAPTER", PAGE.margin, 169);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const descLines = doc.splitTextToSize(description, 100).slice(0, 9);
  doc.text(descLines, PAGE.margin, 184);

  setColor(doc, [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(92);
  const stopNumber = String(index + 1).padStart(2, "0");
  doc.text(stopNumber, PAGE.width - PAGE.margin - 2, 130, { align: "right" });
};

const collectRoutePlaces = async days => {
  const placesById = new Map();
  const placesByName = new Map();

  days.forEach(day => {
    day.entranceRows.forEach(place => {
      const id = unwrapId(place?.PLACE_ID || place?._id || place?.id);
      const name = place?.PLACE_NAME || place?.placeName || "";
      if (id && !placesById.has(id)) {
        placesById.set(id, { ...place, PLACE_ID: id });
      }
      if (!id && name && !placesByName.has(normalizeKey(name))) {
        placesByName.set(normalizeKey(name), { ...place, PLACE_NAME: name });
      }
    });
  });

  let placeList = [];
  if (placesByName.size || placesById.size) {
    try {
      placeList = asArray(await get("/place"));
    } catch {
      placeList = [];
    }
  }

  const placeListByName = new Map(
    placeList
      .filter(place => place?.PLACE_NAME)
      .map(place => [normalizeKey(place.PLACE_NAME), place])
  );

  placesByName.forEach((routePlace, nameKey) => {
    const matchedPlace = placeListByName.get(nameKey);
    if (matchedPlace) {
      const matchedId = unwrapId(matchedPlace?._id);
      if (matchedId && !placesById.has(matchedId)) {
        placesById.set(matchedId, {
          ...routePlace,
          ...matchedPlace,
          PLACE_ID: matchedId,
        });
      }
    } else if (!placesById.has(nameKey)) {
      placesById.set(nameKey, routePlace);
    }
  });

  const enriched = await Promise.all(
    Array.from(placesById.values()).map(async place => {
      try {
        const placeId = unwrapId(place.PLACE_ID || place._id);
        const detail = placeId ? await get(`/place/${placeId}`) : place;
        const imageIds = getPlaceImageIds(detail);
        const imageDataUrls = await getImageDataUrls(imageIds);

        return {
          ...place,
          ...detail,
          PLACE_ID: placeId || place.PLACE_ID,
          imageDataUrls,
          imageDataUrl: imageDataUrls[0] || "",
        };
      } catch {
        return place;
      }
    })
  );

  return enriched;
};

const addHeader = (doc, quotationInfo, coverImage = "") => {
  setColor(doc, COLORS.primary, true);
  doc.rect(0, 0, PAGE.width, 62, "F");
  setColor(doc, COLORS.primaryDark, true);
  doc.rect(0, 0, 118, 62, "F");
  setColor(doc, COLORS.accent, true);
  doc.rect(0, 56, PAGE.width, 6, "F");

  if (coverImage) {
    try {
      doc.addImage(
        coverImage,
        getImageFormat(coverImage),
        128,
        8,
        66,
        42
      );
      setColor(doc, COLORS.white);
      doc.roundedRect(128, 8, 66, 42, 3, 3);
    } catch {
      // Keep the designed header even if the uploaded image cannot be embedded.
    }
  }

  setColor(doc, COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("Trip Quotation", PAGE.margin, 20);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Reference ${safeText(quotationInfo.referenceNumber)}`, PAGE.margin, 30);
  doc.text(`Prepared ${formatDate(new Date())}`, PAGE.margin, 37);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(safeText(quotationInfo.travelAgentName), PAGE.margin, 48);
};

const addFooter = doc => {
  const pages = doc.getNumberOfPages();

  for (let i = 1; i <= pages; i += 1) {
    doc.setPage(i);
    setColor(doc, COLORS.line);
    doc.line(PAGE.margin, PAGE.height - 11, PAGE.width - PAGE.margin, PAGE.height - 11);
    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("COE travel quotation", PAGE.margin, PAGE.height - 6);
    doc.text(`Page ${i} of ${pages}`, PAGE.width - PAGE.margin, PAGE.height - 6, {
      align: "right",
    });
  }
};

const addMetricCard = (doc, item, x, y, width, options = {}) => {
  const height = options.height || 27;
  setColor(doc, options.fill || COLORS.white, true);
  doc.roundedRect(x, y, width, height, 3, 3, "F");
  setColor(doc, options.border || COLORS.line);
  doc.roundedRect(x, y, width, height, 3, 3);

  setColor(doc, options.labelColor || COLORS.muted);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(item.label, x + 4, y + 7);

  setColor(doc, options.valueColor || COLORS.ink);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(options.valueSize || 14);
  doc.text(doc.splitTextToSize(safeText(item.value), width - 8).slice(0, 2), x + 4, y + 16);

  if (item.subtext) {
    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.8);
    doc.text(doc.splitTextToSize(item.subtext, width - 8).slice(0, 1), x + 4, y + height - 5);
  }
};

const addApprovedQuotationDesign = (doc, quotation, quotationInfo, options, daysRoutes, places) => {
  const approvedOptions = asArray(options);
  const primaryOption = approvedOptions[0] || {};
  let y = 76;

  const cardGap = 4;
  const cardWidth = (PAGE.width - PAGE.margin * 2 - cardGap * 2) / 3;
  const metrics = [
    {
      label: "Price / Person",
      value: formatMoney(primaryOption.finalPerPerson),
      subtext: safeText(primaryOption.optionName),
    },
    {
      label: "Pax",
      value: safeText(quotationInfo.paxCount),
      subtext: `${safeText(quotationInfo.tripDays)} days / ${safeText(quotationInfo.tripNights)} nights`,
    },
    {
      label: "Quotation Duration",
      value: formatDate(quotation?.QUOTATION_START_DATE),
      subtext: `To ${formatDate(quotation?.QUOTATION_END_DATE)}`,
    },
  ];

  metrics.forEach((item, index) => {
    addMetricCard(doc, item, PAGE.margin + index * (cardWidth + cardGap), y, cardWidth, {
      fill: index === 0 ? COLORS.paleAccent : COLORS.white,
      valueColor: index === 0 ? COLORS.primaryDark : COLORS.ink,
      valueSize: index === 0 ? 12 : 11,
    });
  });

  y += 40;
  const optionWidth = (PAGE.width - PAGE.margin * 2 - 4) / 2;
  approvedOptions.slice(0, 4).forEach((option, index) => {
    const x = PAGE.margin + (index % 2) * (optionWidth + 4);
    const top = y + Math.floor(index / 2) * 40;
    setColor(doc, index === 0 ? COLORS.primaryDark : COLORS.white, true);
    doc.roundedRect(x, top, optionWidth, 33, 3, 3, "F");
    setColor(doc, index === 0 ? COLORS.primaryDark : COLORS.line);
    doc.roundedRect(x, top, optionWidth, 33, 3, 3);

    setColor(doc, index === 0 ? COLORS.white : COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(safeText(option.optionName), optionWidth - 45).slice(0, 2), x + 5, top + 8);

    doc.setFontSize(15);
    doc.text(formatMoney(option.finalPerPerson), x + optionWidth - 5, top + 13, { align: "right" });
  });

  y += approvedOptions.length > 2 ? 82 : 42;
  y = addPageIfNeeded(doc, y, 48);

  const timelineDays = asArray(daysRoutes).slice(0, 5);
  setColor(doc, COLORS.white, true);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 43, 3, 3, "F");
  setColor(doc, COLORS.line);
  doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 43, 3, 3);
  setColor(doc, COLORS.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Route Snapshot", PAGE.margin + 5, y + 8);

  timelineDays.forEach((day, index) => {
    const x = PAGE.margin + 8 + index * 35;
    setColor(doc, COLORS.accent, true);
    doc.circle(x, y + 20, 3, "F");
    if (index < timelineDays.length - 1) {
      setColor(doc, COLORS.line);
      doc.line(x + 4, y + 20, x + 31, y + 20);
    }
    setColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text(`Day ${safeText(day.DAY_ORDER)}`, x - 3, y + 29);
    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    const route = plainText(day.ROUTE_TEXT || day?.overnight?.OVERNIGHT_CITY_NAME || "-");
    doc.text(doc.splitTextToSize(route, 28).slice(0, 2), x - 3, y + 35);
  });

  return y + 54;
};

export const generateQuotationPdf = async ({
  quotation,
  quotationInfo,
  approvedFinalOptions,
  daysRoutes,
}) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const places = await collectRoutePlaces(asArray(daysRoutes));
  const agentLogoDataUrl = await getImageDataUrl(
    quotationInfo.travelAgentLogoAttachmentId
  );
  const brandColors = await getLogoPalette(agentLogoDataUrl);
  applyBrandColors(brandColors);

  addCoverPage(doc, quotationInfo, places, agentLogoDataUrl);
  doc.addPage();
  addHeader(doc, quotationInfo, places[0]?.imageDataUrl || "");
  let y = addApprovedQuotationDesign(
    doc,
    quotation,
    quotationInfo,
    approvedFinalOptions,
    daysRoutes,
    places
  );

  y = addSectionTitle(
    doc,
    "Quotation Information",
    "Main trip details, validity, guests, and travel profile.",
    y
  );
  y = addInfoGrid(
    doc,
    [
      { label: "Validity", value: `${safeText(quotationInfo.validityDays)} day(s)` },
      {
        label: "Trip Duration",
        value: `${safeText(quotationInfo.tripDays)} day(s) / ${safeText(
          quotationInfo.tripNights
        )} night(s)`,
      },
      { label: "Pax", value: quotationInfo.paxCount },
    ],
    y,
    3
  );

  y += 6;
  asArray(approvedFinalOptions).forEach((option, index) => {
    y = addPageIfNeeded(doc, y, 36);
    setColor(doc, index === 0 ? COLORS.primaryDark : COLORS.soft, true);
    doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 20, 3, 3, "F");
    setColor(doc, index === 0 ? [255, 255, 255] : COLORS.ink);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(safeText(option.optionName), PAGE.margin + 5, y + 8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(formatMoney(option.finalPerPerson), PAGE.width - PAGE.margin - 5, y + 12, {
      align: "right",
    });
    y += 25;

    y = addOptionPricingSummary(doc, option, y);
    y = addSeasonSummaryTable(
      doc,
      option.seasonSummaryRows || [],
      y,
      safeText(option.optionName)
    );

    const visibleHotelRows = asArray(option.hotelRows).filter(
      row => Number(row?.nights) > 0
    );

    if (visibleHotelRows.length) {
      y = addTable(
        doc,
        ["City", "Hotel", "Season", "Nights", "Hotel Price"],
        visibleHotelRows.map(row => [
          row.cityName,
          row.hotelName,
          row.seasonName,
          row.nights,
          formatMoney(row.afterProfit),
        ]),
        y,
        [28, 47, 48, 22, 35]
      );
    }
  });

  y = addSectionTitle(
    doc,
    "Trip Schedule",
    "The trip follows these routes day by day, including visits and meals.",
    y + 3
  );
  asArray(daysRoutes).forEach(day => {
    y = addPageIfNeeded(doc, y, 34);
    setColor(doc, COLORS.soft, true);
    doc.roundedRect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, 28, 3, 3, "F");
    setColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Day ${safeText(day.DAY_ORDER)}`, PAGE.margin + 5, y + 7);
    y = addBodyText(doc, day.ROUTE_TEXT || "Route details will be confirmed.", y + 14, {
      x: PAGE.margin + 5,
      width: PAGE.width - PAGE.margin * 2 - 10,
      fontSize: 9,
    });

    const visits = day.entranceRows.map(place => place?.PLACE_NAME).filter(Boolean);
    const meals = day.mealsRows.map(meal => meal?.MEAL_NAME || meal?.MEAL_TYPE).filter(Boolean);

    y += 4;
    y = addInfoGrid(
      doc,
      [
        { label: "Visits", value: visits.join(", ") || "-" },
        { label: "Meals", value: meals.join(", ") || "-" },
      ],
      y,
      2
    );
  });

  if (places.length) {
    places.forEach((place, index) => {
      doc.addPage();
      addPlaceChapterPage(doc, place, index);
    });

    doc.addPage();
    addHeader(doc, quotationInfo, places[0]?.imageDataUrl || "");
    y = 76;
  }

  y = addGeneralNotesTitle(doc, y + 3);
  addGeneralNotesPanel(doc, quotation?.GENERAL_NOTES || "No general notes were added.", y);

  addFooter(doc);
  doc.save(`quotation-${safeText(quotationInfo.referenceNumber)}.pdf`);
};
