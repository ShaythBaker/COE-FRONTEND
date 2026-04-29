import { hasAnyRole } from "./coe_roles";

export const QUOTATION_PRICING_STATUS = Object.freeze({
  DRAFT: "DRAFT",
  SEND_FOR_PRICING: "SEND_FOR_PRICING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
  CANCELLED: "CANCELLED",
});

export const QUOTATION_PRICE_VIEW_ROLES = Object.freeze([
  "ACCOUNTING",
  "COMPANY_ADMIN",
  "USER_COMPANY",
]);

export const normalizeQuotationStatus = value =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

export const getQuotationStatus = quotation =>
  normalizeQuotationStatus(
    quotation?.STATUS ??
      quotation?.status ??
      quotation?.statusLabel ??
      quotation?.QUOTATION_STATUS
  );

export const isQuotationReadOnly = quotation => {
  const status = getQuotationStatus(quotation);
  return (
    status === QUOTATION_PRICING_STATUS.SEND_FOR_PRICING ||
    status === QUOTATION_PRICING_STATUS.APPROVED
  );
};

export const canSendQuotationForPricing = quotation => {
  const status = getQuotationStatus(quotation);
  return (
    status === QUOTATION_PRICING_STATUS.DRAFT ||
    status === QUOTATION_PRICING_STATUS.REJECTED ||
    !status
  );
};

export const canViewQuotationPrices = roles =>
  hasAnyRole(roles, QUOTATION_PRICE_VIEW_ROLES);

export const getQuotationStatusBadgeColor = status => {
  switch (normalizeQuotationStatus(status)) {
    case QUOTATION_PRICING_STATUS.APPROVED:
      return "success";
    case QUOTATION_PRICING_STATUS.SEND_FOR_PRICING:
      return "info";
    case QUOTATION_PRICING_STATUS.REJECTED:
    case QUOTATION_PRICING_STATUS.CANCELLED:
    case "CANCEL":
      return "danger";
    case QUOTATION_PRICING_STATUS.DRAFT:
      return "warning";
    default:
      return "secondary";
  }
};

export const getQuotationReadOnlyMessage = quotation => {
  const status = getQuotationStatus(quotation);

  if (status === QUOTATION_PRICING_STATUS.SEND_FOR_PRICING) {
    return "This quotation was sent for pricing and is now read-only.";
  }

  if (status === QUOTATION_PRICING_STATUS.APPROVED) {
    return "This quotation is approved and is now read-only.";
  }

  return "";
};
