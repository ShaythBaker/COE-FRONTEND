const mapCompanyToQuotationSystemInformation = (company, systemLogo) => ({
  systemName: company?.COMPANY_NAME || "",
  systemLogo: systemLogo || "",
  systemEmail: company?.SYSTEM_EMAIL || "",
  systemCountry: company?.SYSTEM_COUNTRY || "",
  phoneNumber: company?.PHONE_NUMBER || "",
});

export const loadQuotationSystemInformation = async ({
  loadCurrentCompany,
  loadLogoDataUrl,
}) => {
  const company = await loadCurrentCompany();
  const logoAttachmentId = company?.LOGO_ATTACHMENT_ID || "";
  const systemLogo = logoAttachmentId
    ? await loadLogoDataUrl(logoAttachmentId)
    : "";

  return mapCompanyToQuotationSystemInformation(company, systemLogo);
};
