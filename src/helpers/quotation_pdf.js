import { jsPDF } from "jspdf";
import { get } from "./api_helper";
import { getAttachmentBlob } from "./attachments_helper";
import { getCurrentCompany } from "./coe_backend_helper";
import {
  buildPdfOptionColumns,
  buildTravcoPackageTitle,
  chunkPdfOptionColumns,
  getPdfOptionsForColumn,
  getTravcoPageDecoration,
  getUniquePdfImages,
  renderQuotationPdfSections,
  selectPdfImagePanel,
} from "./quotation_pdf_layout";
import {
  buildPackageSupplementRows,
  getPackageGuideLabel,
} from "./quotation_supplements";
import { loadQuotationSystemInformation } from "./quotation_system_information";

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

const formatDateRange = (from, to) => {
  const start = formatDate(from);
  const end = formatDate(to);
  if (start !== "-" && end !== "-") return `${start} - ${end}`;
  if (start !== "-") return start;
  if (end !== "-") return end;
  return "-";
};

const formatMoney = value => {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "-";
  return amount.toFixed(2);
};

const formatStars = value => {
  const stars = Number(value);
  if (!Number.isFinite(stars) || stars <= 0) return "-";
  return `${stars} Star${stars === 1 ? "" : "s"}`;
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

const addPageIfNeeded = (doc, y, needed = 24, pageBreak = null) => {
  if (y + needed <= PAGE.height - PAGE.margin) return y;
  doc.addPage();
  if (pageBreak?.onNewPage) pageBreak.onNewPage();
  return pageBreak?.newY || PAGE.margin;
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

const addCoverPage = (
  doc,
  quotationInfo,
  places,
  agentLogoDataUrl = "",
  systemInformation = {}
) => {
  const heroImage = places.find(place => place.imageDataUrl)?.imageDataUrl || "";
  const secondaryImages = getUniquePdfImages(
    places.flatMap(place => place.imageDataUrls || [])
  )
    .filter(image => image !== heroImage)
    .slice(0, 3);

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
  const systemLogoDataUrl = systemInformation.systemLogo || agentLogoDataUrl;
  const systemName =
    systemInformation.systemName || quotationInfo.travelAgentName || "Travel Quotation";
  const systemDetails = [
    systemInformation.systemEmail,
    systemInformation.phoneNumber,
    systemInformation.systemCountry,
  ].filter(Boolean);

  setColor(doc, COLORS.white, true);
  doc.roundedRect(logoX, logoY, logoW, logoH, 3, 3, "F");
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(logoX, logoY, logoW, logoH, 3, 3);
  if (systemLogoDataUrl) {
    addImageContain(doc, systemLogoDataUrl, logoX + 3, logoY + 3, logoW - 6, logoH - 6);
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
  doc.text(safeText(systemName), logoX + logoW + 8, 34);
  doc.text(`Reference ${safeText(quotationInfo.referenceNumber)}`, logoX + logoW + 8, 42);
  if (systemDetails.length) {
    doc.setFontSize(7.5);
    doc.text(
      doc.splitTextToSize(systemDetails.join("  |  "), 100).slice(0, 1),
      logoX + logoW + 8,
      50
    );
  }

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

  const detailY = 160;
  const detailH = 80;
  const detailW = PAGE.width - PAGE.margin * 2;
  setColor(doc, COLORS.white, true);
  doc.roundedRect(PAGE.margin, detailY, detailW, detailH, 7, 7, "F");
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(PAGE.margin, detailY, detailW, detailH, 7, 7);

  setColor(doc, COLORS.primary, true);
  doc.rect(PAGE.margin, detailY, 4, detailH, "F");
  doc.roundedRect(PAGE.margin + 9, detailY + 11, 49, 58, 6, 6, "F");
  setColor(doc, COLORS.accent, true);
  doc.roundedRect(PAGE.margin + 9, detailY + 11, 49, 9, 6, 6, "F");
  doc.rect(PAGE.margin + 9, detailY + 16, 49, 5, "F");

  setColor(doc, COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("TRAVEL AGENT COMPANY", PAGE.margin + 13, detailY + 17);

  const contactLogoX = PAGE.margin + 15;
  const contactLogoY = detailY + 27;
  const contactLogoW = 37;
  const contactLogoH = 26;
  setColor(doc, COLORS.white, true);
  doc.roundedRect(contactLogoX, contactLogoY, contactLogoW, contactLogoH, 4, 4, "F");
  doc.setDrawColor(...COLORS.line);
  doc.roundedRect(contactLogoX, contactLogoY, contactLogoW, contactLogoH, 4, 4);
  if (agentLogoDataUrl) {
    addImageContain(
      doc,
      agentLogoDataUrl,
      contactLogoX + 4,
      contactLogoY + 4,
      contactLogoW - 8,
      contactLogoH - 8
    );
  }

  setColor(doc, COLORS.white);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.2);
  doc.text("Dedicated partner details", PAGE.margin + 17, detailY + 62, {
    align: "left",
  });

  const agentInfoX = PAGE.margin + 68;
  const agentInfoW = detailW - 78;
  setColor(doc, COLORS.soft, true);
  doc.roundedRect(agentInfoX, detailY + 10, agentInfoW, 60, 6, 6, "F");
  setColor(doc, COLORS.white, true);
  doc.roundedRect(agentInfoX + 3, detailY + 13, agentInfoW - 6, 54, 5, 5, "F");

  setColor(doc, COLORS.accent, true);
  doc.roundedRect(agentInfoX + 7, detailY + 18, 22, 5, 2.5, 2.5, "F");
  setColor(doc, COLORS.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.8);
  doc.text("PARTNER", agentInfoX + 18, detailY + 21.5, { align: "center" });

  setColor(doc, COLORS.primaryDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15.5);
  doc.text(
    doc.splitTextToSize(safeText(quotationInfo.travelAgentName), 83).slice(0, 1),
    agentInfoX + 7,
    detailY + 33
  );
  setColor(doc, COLORS.primary, true);
  doc.roundedRect(agentInfoX + 7, detailY + 38, 30, 1.2, 0.6, 0.6, "F");

  const agentDetails = [
    ["Email", quotationInfo.travelAgentEmail],
    ["Phone", quotationInfo.travelAgentPhone],
    ["Country", quotationInfo.travelAgentCountry],
  ].filter(([, value]) => Boolean(value));

  agentDetails.forEach(([label, value], index) => {
    const chipX = agentInfoX + 7 + index * 32.5;
    const chipY = detailY + 44;
    setColor(doc, COLORS.soft, true);
    doc.roundedRect(chipX, chipY, 29, 14, 3, 3, "F");
    setColor(doc, COLORS.muted);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.7);
    doc.text(label.toUpperCase(), chipX + 2.5, chipY + 4.4);
    setColor(doc, COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.2);
    doc.text(doc.splitTextToSize(safeText(value), 24).slice(0, 1), chipX + 2.5, chipY + 10);
  });

  const summaryItems = [
    ["Duration", `${safeText(quotationInfo.tripDays)} days / ${safeText(quotationInfo.tripNights)} nights`],
    ["Pax", safeText(quotationInfo.paxCount)],
    ["Validity", `${safeText(quotationInfo.validityDays)} day(s)`],
  ];

  summaryItems.forEach(([label, value], index) => {
    const x = agentInfoX + 7 + index * 32.5;
    const y = detailY + 61;
    setColor(doc, COLORS.paleAccent, true);
    doc.roundedRect(x, y, 29, 12, 3, 3, "F");
    setColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.2);
    doc.text(label, x + 2.5, y + 4.5);
    setColor(doc, COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6);
    doc.text(doc.splitTextToSize(safeText(value), 24).slice(0, 1), x + 2.5, y + 9);
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

const htmlText = value =>
  String(value || "")
    .replace(/\s+/g, " ")
    .replace(/\u00a0/g, " ")
    .trim();

const readTextAlign = element => {
  const align =
    element?.style?.textAlign ||
    element?.getAttribute?.("align") ||
    "";
  const normalized = String(align).toLowerCase().trim();
  return ["center", "right"].includes(normalized) ? normalized : "left";
};

const extractTemplateBlocks = html => {
  if (typeof DOMParser === "undefined") {
    return [{ type: "paragraph", text: plainText(html) }];
  }

  const parser = new DOMParser();
  const documentHtml = parser.parseFromString(String(html || ""), "text/html");
  const blocks = [];

  const walk = element => {
    Array.from(element?.childNodes || []).forEach(node => {
      if (node.nodeType === 3) {
        const text = htmlText(node.textContent);
        if (text) blocks.push({ type: "paragraph", text });
        return;
      }

      if (node.nodeType !== 1) return;

      const tagName = String(node.tagName || "").toLowerCase();

      if (["script", "style"].includes(tagName)) return;

      if (tagName === "table") {
        const rows = Array.from(node.querySelectorAll("tr")).map(row =>
          Array.from(row.children).map(cell => htmlText(cell.textContent))
        );
        blocks.push({
          type: "table",
          rows: rows.filter(row => row.some(Boolean)),
        });
        return;
      }

      if (tagName === "ol" || tagName === "ul") {
        const items = Array.from(node.children)
          .filter(child => String(child.tagName || "").toLowerCase() === "li")
          .map(child => htmlText(child.textContent))
          .filter(Boolean);
        if (items.length) {
          blocks.push({
            type: "list",
            ordered: tagName === "ol",
            items,
          });
        }
        return;
      }

      if (["h1", "h2", "h3", "h4"].includes(tagName)) {
        const text = htmlText(node.textContent);
        if (text) {
          blocks.push({
            type: "heading",
            text,
            level: Number(tagName.slice(1)),
            align: readTextAlign(node),
          });
        }
        return;
      }

      if (["p", "div", "section", "article"].includes(tagName)) {
        const hasStructuredChildren = Boolean(
          node.querySelector?.("table,ol,ul,h1,h2,h3,h4")
        );
        const text = htmlText(node.textContent);
        if (!hasStructuredChildren && text) {
          blocks.push({
            type: "paragraph",
            text,
            align: readTextAlign(node),
            bold: Boolean(node.querySelector?.("strong,b")),
          });
          return;
        }
        walk(node);
        return;
      }

      if (tagName === "br") return;

      const text = htmlText(node.textContent);
      if (text) {
        blocks.push({
          type: "paragraph",
          text,
          align: readTextAlign(node),
          bold: ["strong", "b"].includes(tagName),
        });
      }
    });
  };

  walk(documentHtml.body);
  return blocks.filter(block => {
    if (block.type === "table") return block.rows.length > 0;
    if (block.type === "list") return block.items.length > 0;
    return Boolean(block.text);
  });
};

const addTemplateList = (doc, block, y) => {
  const contentWidth = PAGE.width - PAGE.margin * 2;
  const markerWidth = 8;

  block.items.forEach((item, index) => {
    const marker = block.ordered ? `${index + 1}.` : "-";
    const lines = doc.splitTextToSize(item, contentWidth - markerWidth - 4);
    y = addPageIfNeeded(doc, y, Math.max(8, lines.length * 5 + 3));

    setColor(doc, COLORS.ink);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(marker, PAGE.margin + 4, y);
    doc.text(lines, PAGE.margin + markerWidth + 4, y);
    y += Math.max(7, lines.length * 5);
  });

  return y + 2;
};

const addTemplateTable = (doc, block, y) => {
  const rows = asArray(block.rows).filter(row => row.some(Boolean));
  if (!rows.length) return y;

  const contentWidth = PAGE.width - PAGE.margin * 2;
  const maxColumns = Math.max(...rows.map(row => row.length), 1);
  const cellWidth = contentWidth / maxColumns;

  rows.forEach((row, rowIndex) => {
    const normalizedRow = Array.from({ length: maxColumns }).map(
      (_, index) => row[index] || ""
    );
    const cellLines = normalizedRow.map(cell =>
      doc.splitTextToSize(safeText(cell), cellWidth - 5)
    );
    const rowHeight = Math.max(
      8,
      Math.max(...cellLines.map(lines => lines.length)) * 4 + 5,
    );

    y = addPageIfNeeded(doc, y, rowHeight + 4);

    normalizedRow.forEach((_, cellIndex) => {
      const x = PAGE.margin + cellIndex * cellWidth;
      setColor(doc, rowIndex === 0 ? [239, 243, 248] : COLORS.white, true);
      doc.rect(x, y, cellWidth, rowHeight, "F");
      setColor(doc, COLORS.ink);
      doc.rect(x, y, cellWidth, rowHeight);
      doc.setFont("helvetica", rowIndex === 0 ? "bold" : "normal");
      doc.setFontSize(8);
      doc.text(cellLines[cellIndex], x + 2.5, y + 5);
    });

    y += rowHeight;
  });

  return y + 5;
};

const addTemplateBlock = (doc, block, y) => {
  if (block.type === "heading") {
    y = addPageIfNeeded(doc, y, 12);
    setColor(doc, COLORS.primaryDark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(block.level <= 2 ? 12 : 10);
    const width = PAGE.width - PAGE.margin * 2;
    const lines = doc.splitTextToSize(block.text, width);
    const x =
      block.align === "center"
        ? PAGE.width / 2
        : block.align === "right"
          ? PAGE.width - PAGE.margin
          : PAGE.margin;
    doc.text(lines, x, y, {
      align: block.align || "left",
    });
    return y + lines.length * 5 + 4;
  }

  if (block.type === "list") {
    return addTemplateList(doc, block, y);
  }

  if (block.type === "table") {
    return addTemplateTable(doc, block, y);
  }

  y = addPageIfNeeded(doc, y, 10);
  setColor(doc, COLORS.ink);
  doc.setFont("helvetica", block.bold ? "bold" : "normal");
  doc.setFontSize(9);
  const width = PAGE.width - PAGE.margin * 2;
  const lines = doc.splitTextToSize(safeText(block.text), width);
  const x =
    block.align === "center"
      ? PAGE.width / 2
      : block.align === "right"
        ? PAGE.width - PAGE.margin
        : PAGE.margin;
  doc.text(lines, x, y, {
    align: block.align || "left",
  });
  return y + lines.length * 5 + 3;
};

const addPdfTemplate = (doc, template, quotationInfo, coverImage = "") => {
  doc.addPage();
  addHeader(doc, quotationInfo, coverImage);

  let y = addSectionTitle(
    doc,
    safeText(template?.TEMPLATE_NAME || "Template"),
    "",
    76,
  );

  const blocks = extractTemplateBlocks(template?.TEMPLATE_CONTENT_HTML);
  if (!blocks.length) {
    return addBodyText(doc, "No template content.", y);
  }

  blocks.forEach(block => {
    y = addTemplateBlock(doc, block, y);
  });

  return y;
};

const fetchActivePdfTemplates = async () => {
  try {
    const templates = await get("/templates", {
      params: { status: true },
    });

    return asArray(templates)
      .filter(
        template =>
          template?.ACTIVE_STATUS !== false && template?.TEMPLATE_STATUS !== false,
      )
      .sort((a, b) => {
        const orderA = Number(a?.SORT_ORDER ?? 0);
        const orderB = Number(b?.SORT_ORDER ?? 0);
        if (orderA !== orderB) return orderA - orderB;
        return String(a?.TEMPLATE_NAME || "").localeCompare(
          String(b?.TEMPLATE_NAME || ""),
        );
      });
  } catch {
    return [];
  }
};

const addTable = (doc, headers, rows, y, widths, options = {}) => {
  const variant = options.variant || "brand";
  const headerLines = headers.map((header, index) =>
    doc.splitTextToSize(safeText(header), widths[index] - 4)
  );
  const headerHeight = Math.max(
    10,
    Math.max(...headerLines.map(lines => lines.length)) * 4 + 4
  );
  y = addPageIfNeeded(doc, y, headerHeight * 2);

  if (variant === "light") {
    setColor(doc, [239, 243, 248], true);
    doc.rect(PAGE.margin, y, PAGE.width - PAGE.margin * 2, headerHeight, "F");
  } else {
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
  }

  let x = PAGE.margin + 3;
  setColor(doc, variant === "light" ? COLORS.ink : [255, 255, 255]);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  headerLines.forEach((lines, index) => {
    doc.text(lines, x, y + 5);
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
      doc.setFont("helvetica", variant === "light" && index === 1 ? "bold" : "normal");
      doc.text(lines, x, y + 5);
      x += widths[index];
    });
    y += rowHeight;
  });

  return y + 4;
};

const buildSupplementTotalRows = (rows = [], optionName = "Option", optionStars = "") => {
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
        optionStars: formatStars(optionStars),
        supplement,
        price,
      };
    })
    .filter(row => row.price > 0);
};

const addSeasonSummaryTable = (
  doc,
  rows = [],
  y,
  optionName = "Option",
  optionStars = ""
) => {
  const supplementRows = buildSupplementTotalRows(rows, optionName, optionStars);
  if (!supplementRows.length) return y;

  y = addSectionTitle(
    doc,
    "supplements",
    "",
    y + 2
  );

  return addTable(
    doc,
    ["Option Name", "Stars", "Supplement", "Price"],
    supplementRows.map(row => [
      row.optionName,
      row.optionStars,
      row.supplement,
      formatMoney(row.price),
    ]),
    y,
    [62, 26, 42, 40]
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
  doc.text("description", PAGE.margin, 169);

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

  const rememberPlace = place => {
    const id = unwrapId(place?.PLACE_ID || place?.placeId || place?._id || place?.id);
    const name = getStopName(place);

    if (id && !placesById.has(id)) {
      placesById.set(id, { ...place, PLACE_ID: id, PLACE_NAME: name || place?.PLACE_NAME });
    }

    if (name && !placesByName.has(normalizeKey(name))) {
      placesByName.set(normalizeKey(name), {
        ...place,
        PLACE_ID: id || place?.PLACE_ID,
        PLACE_NAME: name,
      });
    }
  };

  days.forEach(day => {
    asArray(day?.routeStops).forEach(rememberPlace);
    asArray(day?.entranceRows).forEach(rememberPlace);
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
  let y = 76;

  const cardGap = 4;
  const cardWidth = (PAGE.width - PAGE.margin * 2 - cardGap) / 2;
  const metrics = [
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
      fill: COLORS.white,
      valueColor: COLORS.ink,
      valueSize: 11,
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

const TRAVCO = {
  headerLogoX: 16,
  headerLogoY: 13,
  headerLogoW: 42,
  headerLogoH: 19,
  imageX: 90,
  imageY: 12,
  imageW: 22,
  imageH: 32,
  imageGap: 3.2,
  taglineY: 39,
  titleY: 52,
  durationY: 59,
};

const GRAY = {
  dark: [42, 42, 42],
  text: [78, 78, 78],
  muted: [118, 118, 118],
  line: [175, 175, 175],
  light: [242, 242, 242],
  mid: [216, 216, 216],
  white: [255, 255, 255],
};

const cleanPdfText = value =>
  String(value || "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isBlankPdfValue = value => {
  const text = cleanPdfText(value);
  return !text || text === "-";
};

const sanitizePdfFileName = value =>
  cleanPdfText(value || "quotation")
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "quotation";

const sentenceExcerpt = (value, maxLength = 360) => {
  const text = plainText(value)
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;

  const truncated = text.slice(0, maxLength);
  const sentenceEnd = Math.max(
    truncated.lastIndexOf("."),
    truncated.lastIndexOf("!"),
    truncated.lastIndexOf("?")
  );

  if (sentenceEnd > maxLength * 0.45) {
    return truncated.slice(0, sentenceEnd + 1).trim();
  }

  const lastSpace = truncated.lastIndexOf(" ");
  return `${truncated.slice(0, lastSpace > 0 ? lastSpace : maxLength).trim()}.`;
};

const getDurationText = quotationInfo => {
  const days = safeText(quotationInfo.tripDays);
  const nights = safeText(quotationInfo.tripNights);
  return `${days} Days - ${nights} Nights`;
};

const getQuotationTitle = quotationInfo =>
  `${safeText(quotationInfo.groupName || "Group Name")} - ${safeText(
    quotationInfo.nationalityName
  )} * Code ${safeText(quotationInfo.referenceNumber)}`;

const normalizePriceMatrixLabel = value =>
  safeText(value)
    .toLowerCase()
    .replace(/\b(pax|guests?|people)\b/g, "")
    .replace(/\s+/g, "")
    .trim();

const getOptionPaxLabel = option => {
  if (option?.paxLabel) return option.paxLabel;
  const min = Number(option?.paxMin || option?.PAX_MIN || 0);
  const max = Number(option?.paxMax || option?.PAX_MAX || min);
  if (!min) return "";
  return min === max ? String(min) : `${min}-${max}`;
};

const getPaxSortValue = value => {
  if (typeof value === "object" && value !== null) {
    const min = Number(value?.paxMin || value?.PAX_MIN);
    if (Number.isFinite(min) && min > 0) return min;

    const label = getOptionPaxLabel(value);
    const match = label.match(/\d+/);
    if (match) return Number(match[0]);

    const pax = Number(value?.pax || value?.paxMax || value?.PAX_MAX);
    return Number.isFinite(pax) && pax > 0 ? pax : Number.MAX_SAFE_INTEGER;
  }

  const match = String(value || "").match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
};

const getOptionLabels = options =>
  buildPdfOptionColumns(options).map(column => column.label);

const drawLogo = (
  doc,
  systemInformation,
  x,
  y,
  width,
  height,
  fallbackSize = 18
) => {
  const logo = systemInformation?.systemLogo || "";
  if (logo && addImageContain(doc, logo, x, y, width, height)) return;

  setColor(doc, GRAY.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(fallbackSize);
  doc.text(systemInformation?.systemName || "travco", x, y + height * 0.58);
  doc.setFontSize(Math.max(6, fallbackSize * 0.32));
  doc.text("Jordan", x + width * 0.56, y + height * 0.85);
};

const getPlaceImageList = place => {
  if (!place) return [];
  const imageList = asArray(place?.imageDataUrls).length
    ? asArray(place.imageDataUrls)
    : place?.imageDataUrl
      ? [place.imageDataUrl]
      : [];
  return getUniquePdfImages(imageList);
};

const getPlacesByName = places => {
  const map = new Map();
  asArray(places).forEach(place => {
    const name = normalizeKey(place?.PLACE_NAME || place?.placeName || "");
    if (!name) return;

    const existing = map.get(name);
    if (!existing) {
      map.set(name, place);
      return;
    }

    const existingScore =
      (getPlaceImageList(existing).length ? 2 : 0) +
      (cleanPdfText(existing?.PLACE_DESCRIPTION || existing?.description).length ? 1 : 0);
    const nextScore =
      (getPlaceImageList(place).length ? 2 : 0) +
      (cleanPdfText(place?.PLACE_DESCRIPTION || place?.description).length ? 1 : 0);

    if (nextScore > existingScore) map.set(name, place);
  });
  return map;
};

const getOrderedRouteNames = days => {
  const names = [];

  asArray(days).forEach(day => {
    getDayStops(day).forEach(name => {
      const cleaned = cleanPdfText(name);
      const key = normalizeKey(cleaned);
      if (cleaned && !names.some(item => item.key === key)) {
        names.push({ key, name: cleaned });
      }
    });
  });

  return names;
};

const getDocumentImageEntries = (days, places) => {
  const placeByName = getPlacesByName(places);
  const routeNames = getOrderedRouteNames(days);
  let entries = routeNames.map(item => {
    const place = placeByName.get(item.key);
    const imageList = asArray(place?.imageDataUrls).length
      ? asArray(place.imageDataUrls)
      : place?.imageDataUrl
        ? [place.imageDataUrl]
        : [];

    return {
      name: item.name,
      place,
      imageDataUrl: imageList[0] || "",
    };
  });

  if (!entries.length) {
    entries = asArray(places).map(place => ({
      name: cleanPdfText(place?.PLACE_NAME || place?.placeName),
      place,
      imageDataUrl: getPlaceImageList(place)[0] || "",
    }));
  }

  const fallbackImages = [
    ...entries.map(entry => entry.imageDataUrl).filter(Boolean),
    ...asArray(places).flatMap(getPlaceImageList),
  ].filter((image, index, list) => image && list.indexOf(image) === index);

  entries = entries.map((entry, index) => ({
    ...entry,
    imageDataUrl:
      entry.imageDataUrl ||
      fallbackImages[index % Math.max(fallbackImages.length, 1)] ||
      "",
  }));

  const uniqueImages = getUniquePdfImages(
    entries.map(entry => entry.imageDataUrl),
    4
  );
  return uniqueImages.map(image =>
    entries.find(entry => entry.imageDataUrl === image)
  );
};

const getHeaderImages = imageEntries =>
  getUniquePdfImages(
    asArray(imageEntries).map(entry =>
      typeof entry === "string" ? entry : entry?.imageDataUrl
    ),
    4
  );

const drawHeaderImages = (doc, images) => {
  for (let index = 0; index < 4; index += 1) {
    const x = TRAVCO.imageX + index * (TRAVCO.imageW + TRAVCO.imageGap);
    const image = images[index];

    if (image) {
      addImageCover(doc, image, x, TRAVCO.imageY, TRAVCO.imageW, TRAVCO.imageH);
    } else {
      setColor(doc, GRAY.mid, true);
      doc.rect(x, TRAVCO.imageY, TRAVCO.imageW, TRAVCO.imageH, "F");
    }

    doc.setDrawColor(...GRAY.white);
    doc.setLineWidth(0.35);
    doc.rect(x, TRAVCO.imageY, TRAVCO.imageW, TRAVCO.imageH);
  }
};

const drawTravcoHeader = (doc, quotationInfo, systemInformation, images) => {
  drawLogo(
    doc,
    systemInformation,
    TRAVCO.headerLogoX,
    TRAVCO.headerLogoY,
    TRAVCO.headerLogoW,
    TRAVCO.headerLogoH,
    12
  );
  drawHeaderImages(doc, images);

  const taglineMain = "WHERE THE JOY OF TRAVELLING";
  const taglineTail = "REALLY MATTERS";

  setColor(doc, GRAY.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(5.2);
  doc.text(taglineMain, TRAVCO.headerLogoX, TRAVCO.taglineY);
  setColor(doc, GRAY.muted);
  doc.setFont("helvetica", "normal");
  doc.text(
    taglineTail,
    TRAVCO.headerLogoX + doc.getTextWidth(taglineMain) + 1.25,
    TRAVCO.taglineY
  );

  setColor(doc, GRAY.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.6);
  doc.text(
    doc.splitTextToSize(getQuotationTitle(quotationInfo), 92).slice(0, 1),
    TRAVCO.headerLogoX,
    TRAVCO.titleY
  );
  doc.setFontSize(5.8);
  doc.text(getDurationText(quotationInfo), TRAVCO.headerLogoX, TRAVCO.durationY);
};

const addTravcoPage = (doc, quotationInfo, systemInformation, images) => {
  doc.addPage();
  setColor(doc, GRAY.white, true);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
  drawTravcoHeader(doc, quotationInfo, systemInformation, images);
};

const writeTravcoText = (doc, text, x, y, width, options = {}) => {
  const size = options.size || 7.7;
  const lineHeight = options.lineHeight || size * 0.52 + 2.1;
  const lines = doc.splitTextToSize(cleanPdfText(text), width);
  setColor(doc, options.color || GRAY.text);
  doc.setFont("helvetica", options.bold ? "bold" : "normal");
  doc.setFontSize(size);
  doc.text(lines, x, y, {
    align: options.align || "left",
  });
  return y + lines.length * lineHeight;
};

const addCoverLetterPage = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  approvedFinalOptions
) => {
  setColor(doc, GRAY.white, true);
  doc.rect(0, 0, PAGE.width, PAGE.height, "F");
  drawTravcoHeader(doc, quotationInfo, systemInformation, images);

  let y = 112;
  const x = 27;
  const width = 157;
  const optionText = getOptionLabels(approvedFinalOptions).join(", ");
  const email = systemInformation.systemEmail || quotationInfo.travelAgentEmail || "-";

  y = writeTravcoText(doc, "Dear Partner,", x, y, width, { size: 8.2 });
  y += 7;
  y = writeTravcoText(
    doc,
    "I am delighted to send you our SIC programs and rates proposal based on the requested services your good self.",
    x,
    y,
    width,
    { size: 8.2 }
  );
  y += 5;
  y = writeTravcoText(
    doc,
    `We have taken into consideration that this program should be on a different services level than APT main program in terms of hotels and rates, according to this we have based sent you option of ${optionText}.`,
    x,
    y,
    width,
    { size: 8.2 }
  );
  y += 5;
  y = writeTravcoText(
    doc,
    "I hope that our proposal will meet your requirements and please do not hesitate to contact us if you need any further assistance or help.",
    x,
    y,
    width,
    { size: 8.2 }
  );
  y += 6;
  y = writeTravcoText(
    doc,
    "For now, please accept my sincere best regards....",
    x,
    y,
    width,
    { size: 8.2 }
  );
  y += 20;
  y = writeTravcoText(
    doc,
    "For questions and assistance, please reach us at the below email address:",
    x,
    y,
    width,
    { size: 8.2 }
  );
  y += 8;
  writeTravcoText(
    doc,
    `${systemInformation.systemName || "Inbound"} ${email}`,
    x,
    y,
    width,
    { size: 8.2 }
  );

};

const stripDuplicateArrivalTitle = html =>
  String(html || "").replace(
    /^\s*<h[1-6][^>]*>\s*Arrival\s+and\s+Departure\s*<\/h[1-6]>\s*/i,
    ""
  );

const getArrivalBannerImage = (daysRoutes, places, imageEntries) => {
  const placeByName = getPlacesByName(places);
  const routeNames = getOrderedRouteNames(daysRoutes);
  const airportMatch = routeNames.find(item =>
    /airport|arrival|queen alia|qai/i.test(item.name)
  );
  const matchedPlace = airportMatch ? placeByName.get(airportMatch.key) : null;
  const matchedImage = getPlaceImageList(matchedPlace)[0];
  if (matchedImage) return matchedImage;

  return (
    asArray(imageEntries).find(entry => entry?.imageDataUrl)?.imageDataUrl ||
    asArray(places)
      .map(place => getPlaceImageList(place)[0])
      .find(Boolean) ||
    ""
  );
};

const addArrivalDeparturePage = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  html,
  places,
  daysRoutes,
  imageEntries
) => {
  addTravcoPage(doc, quotationInfo, systemInformation, images);

  const bannerImage = getArrivalBannerImage(daysRoutes, places, imageEntries);
  const bannerY = 96;
  const bannerH = 48;

  if (bannerImage) {
    addImageCover(doc, bannerImage, 0, bannerY, PAGE.width, bannerH);
  } else {
    setColor(doc, GRAY.mid, true);
    doc.rect(0, bannerY, PAGE.width, bannerH, "F");
  }

  setColor(doc, GRAY.dark, true);
  doc.rect(0, bannerY, 50, bannerH, "F");
  doc.triangle(50, bannerY, 69, bannerY, 50, bannerY + bannerH, "F");

  setColor(doc, GRAY.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.text("Arrival and Departure", 9, bannerY + 25);

  return addTravcoTemplateContent(
    doc,
    stripDuplicateArrivalTitle(html),
    160,
    {
      x: 26,
      width: 158,
      size: 6.8,
      pageBreak: {
        newY: 105,
        onNewPage: () => {
          setColor(doc, GRAY.white, true);
          doc.rect(0, 0, PAGE.width, PAGE.height, "F");
          drawTravcoHeader(doc, quotationInfo, systemInformation, images);
        },
      },
    }
  );
};

const getStopName = stop =>
  cleanPdfText(
    stop?.label ||
      stop?.placeName ||
      stop?.PLACE_NAME ||
      stop?.cityName ||
      stop?.CITY_NAME ||
      stop
  );

const getDayStops = day => {
  const orderedStops = asArray(day?.routeStops).map(getStopName).filter(Boolean);
  if (orderedStops.length) return orderedStops;

  const routeParts = String(day?.ROUTE_TEXT || "")
    .split("-")
    .map(part => cleanPdfText(part))
    .filter(Boolean);
  const entrancePlaces = asArray(day?.entranceRows)
    .map(place => cleanPdfText(place?.PLACE_NAME || place?.placeName))
    .filter(Boolean);

  const combined = [...routeParts, ...entrancePlaces];
  return combined.filter((value, index) => combined.indexOf(value) === index);
};

const getPlaceDescriptionMap = places => {
  const map = new Map();
  asArray(places).forEach(place => {
    const name = normalizeKey(place?.PLACE_NAME || place?.placeName || "");
    if (!name || map.has(name)) return;
    const description = sentenceExcerpt(
      place?.PLACE_DESCRIPTION || place?.DESCRIPTION || place?.description || ""
    );
    if (description) map.set(name, description);
  });
  return map;
};

const getDescriptionForStop = (stop, descriptionMap) => {
  const key = normalizeKey(stop);
  return descriptionMap.get(key) || "-";
};

const buildDayNarrative = (day, descriptionMap) => {
  const stops = getDayStops(day);
  if (!stops.length) {
    return day?.ROUTE_TEXT || "Route details will be confirmed.";
  }

  return stops
    .map((stop, index) => {
      const description = getDescriptionForStop(stop, descriptionMap);
      if (index === 0) {
        return `After breakfast, we head to ${stop}. ${description}`;
      }
      return `After finishing ${stops[index - 1]}, we proceed to ${stop}. ${description}`;
    })
    .join(" ");
};

const getMealSummary = day => {
  const meals = asArray(day?.mealsRows)
    .map(meal => meal?.MEAL_NAME || meal?.MEAL_TYPE || meal?.name || "")
    .filter(Boolean);
  return meals.length ? meals.join(", ") : "-";
};

const getOvernightSummary = day =>
  day?.overnight?.OVERNIGHT_CITY_NAME ||
  day?.overnight?.cityName ||
  day?.overnight?.CITY_NAME ||
  "-";

const getDayRouteHeading = day => {
  const stops = getDayStops(day);
  if (stops.length) return stops.join(" - ");
  return cleanPdfText(day?.ROUTE_TEXT || "");
};

const drawRightImagePanel = (doc, images, pageIndex = 0) => {
  const { mainImage, thumbnailImages } = selectPdfImagePanel(images, pageIndex);
  const x = 116;
  const y = 112;

  if (mainImage) addImageCover(doc, mainImage, x, y, 66, 111);
  else {
    setColor(doc, GRAY.mid, true);
    doc.rect(x, y, 66, 111, "F");
  }
  doc.setDrawColor(...GRAY.white);
  doc.rect(x, y, 66, 111);

  for (let index = 0; index < 3; index += 1) {
    const thumbX = x + index * 22;
    const thumbY = y + 113;
    const image = thumbnailImages[index];
    if (image) addImageCover(doc, image, thumbX, thumbY, 20, 20);
    else {
      setColor(doc, GRAY.mid, true);
      doc.rect(thumbX, thumbY, 20, 20, "F");
    }
    doc.setDrawColor(...GRAY.white);
    doc.rect(thumbX, thumbY, 20, 20);
  }
};

const estimateDayBlockHeight = (doc, day, descriptionMap) => {
  const title = `DAY ${safeText(day?.DAY_ORDER)} // ${getDayRouteHeading(day)}`.toUpperCase();
  const titleLines = doc.splitTextToSize(title, 87);
  const bodyLines = doc.splitTextToSize(buildDayNarrative(day, descriptionMap), 87);
  return titleLines.length * 4 + bodyLines.length * 3.2 + 13;
};

const writeDayBlock = (doc, day, descriptionMap, y) => {
  const x = 18;
  const width = 88;
  const title = `DAY ${safeText(day?.DAY_ORDER)} // ${getDayRouteHeading(day)}`.toUpperCase();
  const titleLines = doc.splitTextToSize(title, width);

  setColor(doc, GRAY.dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.4);
  doc.text(titleLines, x, y);
  y += titleLines.length * 4;

  y = writeTravcoText(doc, buildDayNarrative(day, descriptionMap), x, y, width, {
    size: 6.7,
    lineHeight: 3.35,
  });

  y += 2;
  y = writeTravcoText(doc, `Meals: ${getMealSummary(day)}`, x, y, width, {
    size: 6.7,
    lineHeight: 3.2,
  });
  y = writeTravcoText(
    doc,
    `Dinner & Overnight stay in ${getOvernightSummary(day)}`,
    x,
    y,
    width,
    { size: 6.7, lineHeight: 3.2 }
  );

  doc.setDrawColor(...GRAY.line);
  doc.setLineWidth(0.25);
  doc.line(x, y + 1.5, x + width, y + 1.5);
  return y + 6;
};

const addItineraryPages = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  daysRoutes,
  places
) => {
  const descriptionMap = getPlaceDescriptionMap(places);
  let pageIndex = 0;
  addTravcoPage(doc, quotationInfo, systemInformation, images);
  drawRightImagePanel(doc, images, pageIndex);
  let y = 104;

  asArray(daysRoutes).forEach(day => {
    const needed = estimateDayBlockHeight(doc, day, descriptionMap);
    if (y + needed > 238) {
      pageIndex += 1;
      addTravcoPage(doc, quotationInfo, systemInformation, images);
      drawRightImagePanel(doc, images, pageIndex);
      y = 104;
    }
    y = writeDayBlock(doc, day, descriptionMap, y);
  });
};

const addTravcoTemplateContent = (doc, html, y, options = {}) => {
  const x = options.x || 30;
  const width = options.width || 150;
  const size = options.size || 6.8;
  const blocks = extractTemplateBlocks(html);
  const pageBreak = options.pageBreak || null;

  blocks.forEach(block => {
    if (block.type === "heading") {
      y = addPageIfNeeded(doc, y, 10, pageBreak);
      const align = block.align || "left";
      const textX =
        align === "center" ? PAGE.width / 2 : align === "right" ? x + width : x;
      setColor(doc, GRAY.dark);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(size + 1.2);
      doc.text(doc.splitTextToSize(block.text, width), textX, y, { align });
      y += 6;
      return;
    }

    if (block.type === "list") {
      block.items.forEach((item, index) => {
        y = addPageIfNeeded(doc, y, 7, pageBreak);
        const marker = block.ordered ? `${index + 1}.` : "-";
        setColor(doc, GRAY.text);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(size);
        doc.text(marker, x, y);
        const lines = doc.splitTextToSize(item, width - 8);
        doc.text(lines, x + 8, y);
        y += Math.max(4.5, lines.length * 3.8);
      });
      y += 2;
      return;
    }

    if (block.type === "table") {
      const rows = block.rows || [];
      rows.forEach((row, rowIndex) => {
        const colCount = Math.max(row.length, 1);
        const cellW = width / colCount;
        const lines = row.map(cell => doc.splitTextToSize(cell || " ", cellW - 3));
        const height = Math.max(6, Math.max(...lines.map(line => line.length)) * 3.2 + 3);
        y = addPageIfNeeded(doc, y, height + 2, pageBreak);
        row.forEach((_, cellIndex) => {
          const cellX = x + cellIndex * cellW;
          setColor(doc, rowIndex === 0 ? GRAY.light : GRAY.white, true);
          doc.rect(cellX, y - 4, cellW, height, "F");
          doc.setDrawColor(...GRAY.dark);
          doc.rect(cellX, y - 4, cellW, height);
          setColor(doc, GRAY.dark);
          doc.setFont("helvetica", rowIndex === 0 ? "bold" : "normal");
          doc.setFontSize(size);
          doc.text(lines[cellIndex], cellX + 2, y);
        });
        y += height;
      });
      y += 4;
      return;
    }

    const lines = doc.splitTextToSize(block.text || "", width);
    y = addPageIfNeeded(doc, y, lines.length * 4 + 2, pageBreak);
    const align = block.align || "left";
    const textX =
      align === "center" ? PAGE.width / 2 : align === "right" ? x + width : x;
    setColor(doc, GRAY.text);
    doc.setFont("helvetica", block.bold ? "bold" : "normal");
    doc.setFontSize(size);
    doc.text(lines, textX, y, { align });
    y += lines.length * 3.9 + 2;
  });

  return y;
};

const addTemplatePage = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  html,
  options = {}
) => {
  addTravcoPage(doc, quotationInfo, systemInformation, images);
  const startY = options.y || 112;
  return addTravcoTemplateContent(doc, html, startY, {
    ...options,
    pageBreak: {
      newY: startY,
      onNewPage: () => {
        setColor(doc, GRAY.white, true);
        doc.rect(0, 0, PAGE.width, PAGE.height, "F");
        drawTravcoHeader(doc, quotationInfo, systemInformation, images);
      },
    },
  });
};

const decodeHtmlEntities = value => {
  const text = String(value || "");
  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = text;
    return textarea.value;
  }

  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
};

const htmlToPreservedLines = html => {
  const withBreaks = String(html || "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n")
    .replace(/<\/t[dh]>\s*<t[dh][^>]*>/gi, " ")
    .replace(/<[^>]+>/g, "");

  return decodeHtmlEntities(withBreaks)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);
};

const stripListMarker = line =>
  String(line || "")
    .replace(/^\s*(?:[\u2022*+-]|\d+[.)])\s+/, "")
    .trim();

const normalizeGeneralNotesLines = html => {
  const lines = htmlToPreservedLines(html).map(stripListMarker).filter(Boolean);
  const text = lines
    .join("\n")
    .replace(/(General Notes:)\s*(?=Validity:)/i, "$1\n")
    .replace(/(;)\s*(Blackout dates)/i, "$1\n$2")
    .replace(/(dates:\s*)\s*(?=\d{2}\.\d{2}\.\d{4})/i, "$1\n")
    .replace(/(Easter)\s*(?=\d{2}\.\d{2}\.\d{4})/i, "$1\n")
    .replace(/(Eid al Fitr)\s*(?=\d{2}\.\d{2}\.\d{4})/i, "$1\n")
    .replace(/(Eid al Adha)\s*(?=Mandatory)/i, "$1\n")
    .replace(/(person)\s*(?=Wadi Rum:)/i, "$1\n")
    .replace(/(person)\s*(?=Dead Sea:)/i, "$1\n")
    .replace(/(rates\.)\s*(?=Payment:)/i, "$1\n")
    .replace(/(booking)\s*(?=Check-in \/ out timing hotels:)/i, "$1\n")
    .replace(/(noontime)\s*(?=Triple rooms:)/i, "$1\n")
    .replace(/(triple rooms\))\s*(?=Visa:)/i, "$1\n")
    .replace(/(minimum 7 days\.)\s*(?=Cancellation fees:)/i, "$1\n")
    .replace(/(Prior arrival)\s*(?=\d+%)/gi, "$1\n")
    .replace(/(Prior arrival)\s*(?=Children Policy:)/i, "$1\n")
    .replace(/(Sharing Parents Room)\s*(?=:?\s*6-11)/i, "$1\n")
    .replace(/(using extra bed)\s*(?=Cutoff Date:)/i, "$1\n")
    .replace(/(Cutoff Date:)\s*(?=Low Season:)/i, "$1\n")
    .replace(/(arrival\.)\s*(?=High Season:)/i, "$1\n")
    .replace(/(arrival\.)\s*(?=After the cutoff)/i, "$1\n")
    .replace(/(availability\.)\s*(?=Sequence of the program)/i, "$1\n");

  return text
    .split(/\r?\n/)
    .map(line => stripListMarker(line))
    .filter(Boolean);
};

const buildGeneralNotesRows = html => {
  const rows = [];

  normalizeGeneralNotesLines(html).forEach(line => {
    const cleaned = line.replace(/^\s*:\s*/, "").trim();
    if (!cleaned) return;

    if (/^General Notes:?$/i.test(cleaned)) {
      rows.push({ kind: "title", text: "General Notes:" });
      return;
    }

    if (/^Sequence of the program/i.test(cleaned)) {
      rows.push({ kind: "final", text: cleaned });
      return;
    }

    const labelMatch = cleaned.match(/^([^:]{1,42}):\s*(.*)$/);
    if (labelMatch) {
      const label = `${labelMatch[1].trim()}:`;
      const rest = labelMatch[2].trim();
      if (/^General Notes:/i.test(label)) {
        rows.push({ kind: "title", text: "General Notes:" });
        if (rest) rows.push({ kind: "label", label: rest, rest: "" });
        return;
      }

      if (!rest) {
        rows.push({ kind: "heading", text: label });
        return;
      }

      rows.push({ kind: "label", label, rest });
      return;
    }

    if (
      /^\d{2}\.\d{2}\.\d{4}/.test(cleaned) ||
      /^\d+%/.test(cleaned) ||
      /^(Low Season|High Season|After the cutoff)/i.test(cleaned) ||
      /^\d\*:/.test(cleaned)
    ) {
      rows.push({ kind: "subitem", text: cleaned });
      return;
    }

    rows.push({ kind: "item", text: cleaned });
  });

  return rows.length ? rows : [{ kind: "title", text: "General Notes:" }];
};

const getGeneralNoteRowLines = (doc, row, layout) => {
  const textWidth = layout.width - row.indent;
  doc.setFont("helvetica", row.bold ? "bold" : "normal");
  doc.setFontSize(layout.size);

  if (row.kind === "label" && row.rest) {
    doc.setFont("helvetica", "bold");
    const labelWidth = doc.getTextWidth(row.label) + 1;
    doc.setFont("helvetica", "normal");
    const firstWidth = Math.max(18, textWidth - labelWidth);
    const restLines = doc.splitTextToSize(row.rest, firstWidth);
    if (restLines.length <= 1) return [row.label + " " + row.rest];
    const remaining = doc.splitTextToSize(
      restLines.slice(1).join(" "),
      textWidth
    );
    return [row.label + " " + restLines[0], ...remaining];
  }

  return doc.splitTextToSize(row.text || `${row.label || ""} ${row.rest || ""}`, textWidth);
};

const getGeneralNoteLayoutRows = rows =>
  rows.map((row, index) => {
    const previous = rows[index - 1];
    const isFirst = index === 0;
    const isSubitem = row.kind === "subitem";
    const isBullet = ["item", "label", "subitem"].includes(row.kind);
    const gapBefore =
      isFirst || previous?.kind === "title"
        ? 0
        : row.kind === "heading"
          ? 0.7
          : 0.12;

    return {
      ...row,
      bullet: isBullet,
      bold: ["title", "heading", "final"].includes(row.kind),
      underline: ["heading", "final"].includes(row.kind),
      indent: row.kind === "title" ? 0 : isSubitem ? 13 : 6,
      bulletOffset: isSubitem ? 8 : 1.2,
      gapBefore,
      gapAfter: row.kind === "heading" ? 0.08 : 0,
    };
  });

const measureGeneralNotesRows = (doc, rows, layout) =>
  rows.reduce((height, row) => {
    const lines = getGeneralNoteRowLines(doc, row, layout);
    return height + row.gapBefore + Math.max(layout.lineHeight, lines.length * layout.lineHeight) + row.gapAfter;
  }, 0);

const getGeneralNotesLayout = (doc, rows) => {
  const base = {
    x: 19,
    y: 76,
    width: 172,
    maxY: 251,
  };

  for (let size = 5.65; size >= 3.6; size -= 0.05) {
    const layout = {
      ...base,
      size,
      lineHeight: Math.max(1.78, size * 0.46),
    };

    if (measureGeneralNotesRows(doc, rows, layout) <= base.maxY - base.y) {
      return layout;
    }
  }

  return { ...base, size: 3.6, lineHeight: 1.78 };
};

const drawGeneralNotesRows = (doc, rows, layout) => {
  let y = layout.y;

  rows.forEach(row => {
    y += row.gapBefore;
    const textX = layout.x + row.indent;
    const textWidth = layout.width - row.indent;

    if (row.bullet) {
      setColor(doc, GRAY.text, true);
      doc.circle(layout.x + row.bulletOffset, y - 1.05, 0.38, "F");
    }

    setColor(doc, GRAY.text);
    doc.setFont("helvetica", row.bold ? "bold" : "normal");
    doc.setFontSize(layout.size);

    if (row.kind === "label" && row.rest) {
      doc.setFont("helvetica", "bold");
      doc.text(row.label, textX, y);
      const labelWidth = doc.getTextWidth(row.label) + 1;
      doc.setFont("helvetica", "normal");
      const firstWidth = Math.max(18, textWidth - labelWidth);
      const restLines = doc.splitTextToSize(row.rest, firstWidth);
      doc.text(restLines.slice(0, 1), textX + labelWidth, y);
      if (restLines.length > 1) {
        const remaining = doc.splitTextToSize(
          restLines.slice(1).join(" "),
          textWidth
        );
        doc.text(remaining, textX, y + layout.lineHeight);
        y += remaining.length * layout.lineHeight;
      }
      y += layout.lineHeight;
    } else {
      const lines = getGeneralNoteRowLines(doc, row, layout);
      doc.text(lines, textX, y);
      if (row.underline) {
        const underlineWidth = Math.min(doc.getTextWidth(lines[0] || ""), textWidth);
        doc.setDrawColor(...GRAY.text);
        doc.setLineWidth(0.18);
        doc.line(textX, y + 0.55, textX + underlineWidth, y + 0.55);
      }
      y += Math.max(layout.lineHeight, lines.length * layout.lineHeight);
    }

    y += row.gapAfter;
  });

  return y;
};

const addGeneralNotesPage = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  html
) => {
  addTravcoPage(doc, quotationInfo, systemInformation, images);

  const rows = getGeneralNoteLayoutRows(buildGeneralNotesRows(html));
  const layout = getGeneralNotesLayout(doc, rows);
  drawGeneralNotesRows(doc, rows, layout);
};

const getWebsite = row =>
  row?.website ||
  row?.hotelWebsite ||
  row?.HOTEL_WEBSITE ||
  row?.WEBSITE ||
  row?.URL ||
  "-";

const getRoomCategory = row =>
  row?.roomCategory ||
  row?.category ||
  row?.ROOM_CATEGORY ||
  row?.CATEGORY ||
  row?.ROOM_TYPE ||
  "Standard Room";

const getHotelName = row =>
  cleanPdfText(row?.hotelName || row?.HOTEL_NAME || row?.name || "");

const loadHotelWebsiteMap = async () => {
  try {
    const hotels = asArray(await get("/hotels"));
    return new Map(
      hotels
        .filter(hotel => hotel?.HOTEL_NAME)
        .map(hotel => [
          normalizeKey(hotel.HOTEL_NAME),
          cleanPdfText(hotel.HOTEL_WEBSITE || ""),
        ])
        .filter(([, website]) => Boolean(website))
    );
  } catch {
    return new Map();
  }
};

const enrichHotelWebsites = async options => {
  const websiteByHotelName = await loadHotelWebsiteMap();

  return asArray(options).map(option => ({
    ...option,
    hotelRows: asArray(option?.hotelRows).map(row => {
      const existingWebsite = getWebsite(row);
      if (existingWebsite && existingWebsite !== "-") {
        return { ...row, website: existingWebsite };
      }

      const hotelWebsite = websiteByHotelName.get(normalizeKey(getHotelName(row)));
      return {
        ...row,
        website: hotelWebsite || "",
      };
    }),
  }));
};

const rowMatchesPaxLabel = (row, paxLabel) => {
  const wanted = normalizePriceMatrixLabel(paxLabel);
  if (!wanted) return true;
  const rowLabel = row?.PAX_LABEL || row?.paxLabel || row?.label || "";
  return normalizePriceMatrixLabel(rowLabel) === wanted;
};

const findCoachLabel = (daysRoutes, paxLabel = "") => {
  const rows = asArray(daysRoutes).flatMap(day => asArray(day.transportationRows));
  const first = rows.find(
    row => rowMatchesPaxLabel(row, paxLabel) && (row?.TRANSPORTATION_BY || row?.SIZE_NAME)
  );
  return first?.TRANSPORTATION_BY || first?.SIZE_NAME || "";
};

const getFilledTemplateText = value => cleanPdfText(plainText(value));

const validateTravcoPdfData = ({
  quotationInfo,
  systemInformation,
  filledTemplates,
  daysRoutes,
  approvedFinalOptions,
}) => {
  const errors = [];

  if (!systemInformation.systemLogo) errors.push("System logo is missing from System Information.");
  if (!systemInformation.systemEmail) errors.push("System email is missing from System Information.");
  if (isBlankPdfValue(quotationInfo.groupName)) errors.push("Group name is required.");
  if (isBlankPdfValue(quotationInfo.nationalityName)) errors.push("Nationality is required.");
  if (isBlankPdfValue(quotationInfo.referenceNumber)) errors.push("Quotation reference number is required.");
  if (isBlankPdfValue(quotationInfo.tripDays) || isBlankPdfValue(quotationInfo.tripNights)) {
    errors.push("Quotation days and nights are required.");
  }
  if (isBlankPdfValue(quotationInfo.paxCount)) errors.push("PAX is required.");
  if (!asArray(daysRoutes).length) errors.push("Route days are required.");

  [
    ["arrivalDepartureHtml", "Arrival and Departure Template"],
    ["inclusionsExclusionsHtml", "Inclusions and Exclusions Template"],
    ["generalNotesHtml", "General Notes Template"],
    ["bankAccountHtml", "Bank Account Detail Template"],
  ].forEach(([field, label]) => {
    if (!getFilledTemplateText(filledTemplates?.[field])) {
      errors.push(`${label} is required.`);
    }
  });

  if (!getOptionLabels(approvedFinalOptions).length) {
    errors.push("Accommodation options are required.");
  }

  asArray(daysRoutes).forEach(day => {
    const dayLabel = `Day ${safeText(day?.DAY_ORDER)}`;
    if (!getDayStops(day).length) errors.push(`${dayLabel} route locations are missing.`);
  });

  buildPdfOptionColumns(approvedFinalOptions).forEach(column => {
    const hasRows = getPdfOptionsForColumn(approvedFinalOptions, column).some(
      option => asArray(option?.hotelRows).some(row => Number(row?.nights) > 0)
    );
    if (!hasRows) {
      errors.push(`Selected hotels are missing for ${column.label}.`);
    }
  });

  if (errors.length) {
    const uniqueErrors = Array.from(new Set(errors));
    throw new Error(uniqueErrors.slice(0, 12).join(" "));
  }
};

const addSmallTable = (doc, rows, x, y, widths, options = {}) => {
  const size = options.size || 5.5;
  rows.forEach((row, rowIndex) => {
    const cellLines = row.map((cell, index) =>
      doc.splitTextToSize(cleanPdfText(cell), widths[index] - 2)
    );
    const height = Math.max(
      options.minHeight || 5.4,
      Math.max(...cellLines.map(lines => lines.length)) * 2.8 + 2.5
    );
    if (options.pageBreak) {
      y = addPageIfNeeded(doc, y, height + 2, options.pageBreak);
    }
    let cellX = x;
    cellLines.forEach((lines, index) => {
      setColor(doc, rowIndex === 0 || options.headerRows?.includes(rowIndex) ? GRAY.light : GRAY.white, true);
      doc.rect(cellX, y, widths[index], height, "F");
      doc.setDrawColor(...GRAY.line);
      doc.rect(cellX, y, widths[index], height);
      setColor(doc, GRAY.text);
      doc.setFont(
        "helvetica",
        rowIndex === 0 || options.headerRows?.includes(rowIndex) ? "bold" : "normal"
      );
      doc.setFontSize(size);
      doc.text(lines, cellX + 1.3, y + 3.7);
      cellX += widths[index];
    });
    y += height;
  });
  return y + 4;
};

const addSuggestedHotelsPage = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  approvedFinalOptions,
  finalPricing
) => {
  addTravcoPage(doc, quotationInfo, systemInformation, images);

  const drawTitle = () => {
    setColor(doc, GRAY.dark);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Suggested Hotels", 33, 101);
  };
  const pageBreak = {
    newY: 111,
    onNewPage: () => {
      setColor(doc, GRAY.white, true);
      doc.rect(0, 0, PAGE.width, PAGE.height, "F");
      drawTravcoHeader(doc, quotationInfo, systemInformation, images);
      drawTitle();
    },
  };

  drawTitle();

  let y = 111;
  const widths = [58, 27, 17, 43, 14, 28];
  const board = String(finalPricing?.BOARD_BASIS || "HB").toUpperCase();

  buildPdfOptionColumns(approvedFinalOptions).forEach(column => {
    const option = getPdfOptionsForColumn(approvedFinalOptions, column).find(item =>
      asArray(item?.hotelRows).some(row => Number(row?.nights) > 0)
    );
    const rows = asArray(option?.hotelRows).filter(row => Number(row?.nights) > 0);
    if (!rows.length) return;

    y = addPageIfNeeded(doc, y, 22, pageBreak);
    const title = `${column.label} Property`;
    y = addSmallTable(
      doc,
      [
        [title, "City", "Nights", "Website", "Meals", "Category"],
        ...rows.map(row => [
          `${row.hotelName || "-"} or similar`,
          row.cityName || "-",
          String(row.nights || "-"),
          getWebsite(row),
          board,
          getRoomCategory(row),
        ]),
      ],
      18,
      y,
      widths,
      { size: 5.4, pageBreak }
    );
  });
};

const parsePaxLabels = value => {
  const text = String(value || "").trim();
  if (!text) return ["-"];
  return text
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      if (/^\d+$/.test(part)) return `${part} Guest${Number(part) === 1 ? "" : "s"}`;
      return `${part} guests`;
    })
    .sort((a, b) => getPaxSortValue(a) - getPaxSortValue(b));
};

const getPriceMatrixPaxRows = (quotationInfo, approvedFinalOptions) => {
  const optionPaxRows = Array.from(
    new Map(
      asArray(approvedFinalOptions)
        .map(option => {
          const label = getOptionPaxLabel(option);
          const key = normalizePriceMatrixLabel(label);
          const sortValue = getPaxSortValue(option);
          return label && key ? [key, { label, sortValue }] : null;
        })
        .filter(Boolean)
    ).values()
  ).sort((a, b) => {
    if (a.sortValue !== b.sortValue) return a.sortValue - b.sortValue;
    return a.label.localeCompare(b.label);
  });

  if (optionPaxRows.length) {
    return optionPaxRows.map(row => row.label);
  }

  return parsePaxLabels(quotationInfo.paxCount);
};

const getCoachLabel = (daysRoutes, paxLabel = "") => {
  return findCoachLabel(daysRoutes, paxLabel) || "-";
};

const findPriceMatrixOption = (options, optionColumn, paxLabel) => {
  const sameOption = getPdfOptionsForColumn(options, optionColumn);
  const wantedPax = normalizePriceMatrixLabel(paxLabel);
  return (
    sameOption.find(option => normalizePriceMatrixLabel(getOptionPaxLabel(option)) === wantedPax) ||
    sameOption[0] ||
    null
  );
};

const formatPackageDate = value => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return cleanPdfText(value) || "-";
  return date.toLocaleDateString("en-GB").replace(/\//g, ".");
};

const getPackageSeasonRows = approvedFinalOptions => {
  const rows = asArray(approvedFinalOptions).flatMap(option =>
    asArray(option?.hotelRows).map(row => ({
      name: cleanPdfText(row?.seasonName || row?.SEASON_NAME || "Rate period"),
      from: row?.seasonStartDate || row?.SEASON_START_DATE || row?.START_DATE,
      to: row?.seasonEndDate || row?.SEASON_END_DATE || row?.END_DATE,
    }))
  );

  return Array.from(
    new Map(
      rows
        .filter(row => row.from || row.to)
        .map(row => [
          `${normalizeKey(row.name)}|${formatPackageDate(row.from)}|${formatPackageDate(row.to)}`,
          [row.name || "Rate period", formatPackageDate(row.from), formatPackageDate(row.to)],
        ])
    ).values()
  );
};

const getPackageSeasonLabel = approvedFinalOptions => {
  const labels = Array.from(
    new Set(
      asArray(approvedFinalOptions)
        .flatMap(option => asArray(option?.hotelRows))
        .map(row => cleanPdfText(row?.seasonName || row?.SEASON_NAME))
        .filter(label => label && label !== "-")
    )
  );

  return labels.length === 1 ? labels[0] : "Quotation Rates";
};

const drawPackagePriceHeading = (doc, quotationInfo) => {
  const heading = buildTravcoPackageTitle(quotationInfo);
  const drawLabel = (text, y, size, height) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    const width = Math.min(82, Math.max(36, doc.getTextWidth(text) + 5));
    setColor(doc, GRAY.text, true);
    doc.rect(33, y, width, height, "F");
    setColor(doc, GRAY.white);
    doc.text(text, 34.5, y + height - 1.5);
  };

  drawLabel(heading.title, 70, 8, 6.5);
  drawLabel(heading.duration, 78, 6.2, 5.5);
};

const drawPackageIntroRows = (
  doc,
  x,
  y,
  width,
  approvedFinalOptions
) => {
  const drawRow = (text, height, size, fillColor) => {
    setColor(doc, fillColor, true);
    doc.rect(x, y, width, height, "F");
    doc.setDrawColor(...GRAY.line);
    doc.rect(x, y, width, height);
    setColor(doc, GRAY.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(text, width - 8);
    const lineHeight = size * 0.42;
    const textY = y + height / 2 - ((lines.length - 1) * lineHeight) / 2 + 0.8;
    doc.text(lines, x + width / 2, textY, { align: "center" });
    y += height;
  };

  drawRow(
    "Package price is based on the minimum number in each bracket in USD.\nRates are in US$, per person sharing a DBL/TWIN/TRPL room.",
    12,
    5.5,
    GRAY.light
  );
  drawRow(
    getPackageSeasonLabel(approvedFinalOptions),
    6,
    5.6,
    GRAY.mid
  );

  return y;
};

const drawPackageRateTable = (
  doc,
  x,
  y,
  widths,
  standardRows,
  supplementRows,
  pageBreak
) => {
  const size = 5.3;
  const drawCells = (cells, cellWidths, { header = false, centered = false } = {}) => {
    const linesByCell = cells.map((cell, index) =>
      doc.splitTextToSize(cleanPdfText(cell), cellWidths[index] - 2.6)
    );
    const height = Math.max(
      6,
      Math.max(...linesByCell.map(lines => lines.length)) * 2.8 + 2.5
    );
    y = addPageIfNeeded(doc, y, height + 1, pageBreak);

    let cellX = x;
    linesByCell.forEach((lines, index) => {
      setColor(doc, header ? GRAY.light : GRAY.white, true);
      doc.rect(cellX, y, cellWidths[index], height, "F");
      doc.setDrawColor(...GRAY.line);
      doc.rect(cellX, y, cellWidths[index], height);
      setColor(doc, GRAY.text);
      doc.setFont("helvetica", header || centered ? "bold" : "normal");
      doc.setFontSize(size);

      if (centered) {
        doc.text(lines, cellX + cellWidths[index] / 2, y + 3.8, {
          align: "center",
        });
      } else {
        doc.text(lines, cellX + 1.3, y + 3.8);
      }
      cellX += cellWidths[index];
    });

    y += height;
  };

  standardRows.forEach((row, rowIndex) => {
    drawCells(row, widths, { header: rowIndex === 0 });
  });

  const mergedDescriptionWidth = widths[widths.length - 2] + widths[widths.length - 1];
  supplementRows.forEach(row => {
    drawCells(
      [row.label, ...row.prices, row.description],
      [widths[0], ...widths.slice(1, -2), mergedDescriptionWidth]
    );
  });

  drawCells(
    ["One free pax for each 15 paid guest and up to 3 pax per group"],
    [widths.reduce((sum, width) => sum + width, 0)],
    { centered: true }
  );

  return y + 4;
};

const addPackagePricePage = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  approvedFinalOptions,
  daysRoutes
) => {
  addTravcoPage(doc, quotationInfo, systemInformation, images);

  const paxRows = getPriceMatrixPaxRows(quotationInfo, approvedFinalOptions);
  const optionBatches = chunkPdfOptionColumns(
    buildPdfOptionColumns(approvedFinalOptions),
    4
  );
  const tableX = 18;
  const tableW = 174;
  const descriptionW = 38;
  const coachW = 31;
  const guideW = 25;
  const seasonRows = getPackageSeasonRows(approvedFinalOptions);

  optionBatches.forEach((optionColumns, batchIndex) => {
    if (batchIndex > 0) {
      addTravcoPage(doc, quotationInfo, systemInformation, images);
    }

    const optionW =
      (tableW - descriptionW - coachW - guideW) / optionColumns.length;
    const widths = [
      descriptionW,
      ...optionColumns.map(() => optionW),
      coachW,
      guideW,
    ];
    const headers = [
      "Number of guests",
      ...optionColumns.map(column => column.label),
      "coach",
      "Guide",
    ];
    const rateRows = [
      headers,
      ...paxRows.map(paxLabel => [
        paxLabel,
        ...optionColumns.map(optionColumn => {
          const option = findPriceMatrixOption(
            approvedFinalOptions,
            optionColumn,
            paxLabel
          );
          if (!option) return "-";
          return Number.isFinite(Number(option.finalPerPerson))
            ? `USD ${Number(option.finalPerPerson).toFixed(2)}`
            : "-";
        }),
        getCoachLabel(daysRoutes, paxLabel),
        getPackageGuideLabel(daysRoutes, paxLabel),
      ]),
    ];
    const supplementRows = buildPackageSupplementRows(
      approvedFinalOptions,
      optionColumns
    );

    const drawPageChrome = () => {
      drawPackagePriceHeading(doc, quotationInfo);
      return drawPackageIntroRows(
        doc,
        tableX,
        88,
        tableW,
        approvedFinalOptions
      );
    };

    let y = drawPageChrome();
    const pageBreak = {
      newY: 106,
      onNewPage: () => {
        setColor(doc, GRAY.white, true);
        doc.rect(0, 0, PAGE.width, PAGE.height, "F");
        drawTravcoHeader(doc, quotationInfo, systemInformation, images);
        drawPageChrome();
      },
    };

    y = drawPackageRateTable(
      doc,
      tableX,
      y,
      widths,
      rateRows,
      supplementRows,
      pageBreak
    );

    if (batchIndex === optionBatches.length - 1 && seasonRows.length) {
      addSmallTable(
        doc,
        [["Seasons", "From", "To"], ...seasonRows],
        tableX,
        y + 2,
        [58, 58, 58],
        {
          size: 5.3,
          minHeight: 6,
          headerRows: [0],
          pageBreak,
        }
      );
    }
  });
};

const addBankAccountPage = (
  doc,
  quotationInfo,
  systemInformation,
  images,
  html
) => {
  addTemplatePage(doc, quotationInfo, systemInformation, images, html, {
    x: 18,
    y: 118,
    width: 112,
    size: 6.1,
  });

  const { closingText } = getTravcoPageDecoration({
    isFinalPage: true,
    pageWidth: PAGE.width,
    pageHeight: PAGE.height,
  });
  setColor(doc, GRAY.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(closingText.text, closingText.x, closingText.y, {
    align: closingText.align,
  });
};

export const generateQuotationPdf = async ({
  quotationInfo,
  approvedFinalOptions,
  daysRoutes,
  finalPricing,
  filledTemplates = {},
}) => {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const places = await collectRoutePlaces(asArray(daysRoutes));
  const agentLogoDataUrl = await getImageDataUrl(
    quotationInfo.travelAgentLogoAttachmentId
  );
  const systemInformation = await loadQuotationSystemInformation({
    loadCurrentCompany: getCurrentCompany,
    loadLogoDataUrl: getImageDataUrl,
  });
  const brandLogoDataUrl =
    systemInformation.systemLogo || agentLogoDataUrl || "";
  const brandColors = await getLogoPalette(brandLogoDataUrl);
  const pdfOptions = await enrichHotelWebsites(approvedFinalOptions);
  const imageEntries = getDocumentImageEntries(daysRoutes, places);
  const headerImages = getHeaderImages(imageEntries);
  const pdfQuotationInfo = {
    ...quotationInfo,
    groupName:
      filledTemplates.groupName ||
      quotationInfo.groupName ||
      quotationInfo.travelAgentName ||
      "Group Name",
  };
  const templateValues = {
    arrivalDepartureHtml:
      filledTemplates.arrivalDepartureHtml || "",
    inclusionsExclusionsHtml:
      filledTemplates.inclusionsExclusionsHtml || "",
    generalNotesHtml: filledTemplates.generalNotesHtml || "",
    bankAccountHtml: filledTemplates.bankAccountHtml || "",
  };
  applyBrandColors(brandColors);
  validateTravcoPdfData({
    quotationInfo: pdfQuotationInfo,
    systemInformation,
    filledTemplates: templateValues,
    daysRoutes,
    places,
    imageEntries,
    approvedFinalOptions: pdfOptions,
  });

  renderQuotationPdfSections({
    coverLetter: () =>
      addCoverLetterPage(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        pdfOptions
      ),
    arrivalDeparture: () =>
      addArrivalDeparturePage(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        templateValues.arrivalDepartureHtml,
        places,
        daysRoutes,
        imageEntries
      ),
    itinerary: () =>
      addItineraryPages(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        daysRoutes,
        places
      ),
    inclusionsExclusions: () =>
      addTemplatePage(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        templateValues.inclusionsExclusionsHtml,
        { x: 31, y: 117, width: 146, size: 6.6 }
      ),
    suggestedHotels: () =>
      addSuggestedHotelsPage(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        pdfOptions,
        finalPricing
      ),
    packagePrice: () =>
      addPackagePricePage(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        pdfOptions,
        daysRoutes
      ),
    generalNotes: () =>
      addGeneralNotesPage(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        templateValues.generalNotesHtml
      ),
    bankAccount: () =>
      addBankAccountPage(
        doc,
        pdfQuotationInfo,
        systemInformation,
        headerImages,
        templateValues.bankAccountHtml
      ),
  });

  return {
    blob: doc.output("blob"),
    fileName: `quotation-${sanitizePdfFileName(pdfQuotationInfo.referenceNumber)}.pdf`,
  };
};
