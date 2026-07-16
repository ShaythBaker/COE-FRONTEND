import test from "node:test";
import assert from "node:assert/strict";

import { loadQuotationSystemInformation } from "./quotation_system_information.js";

test("loads quotation PDF branding from the saved current company", async () => {
  const logoDataUrl = "data:image/png;base64,c3lzdGVtLWxvZ28=";
  let requestedLogoId = "";

  const result = await loadQuotationSystemInformation({
    loadCurrentCompany: async () => ({
      COMPANY_NAME: "TRAVCO JORDAN",
      SYSTEM_EMAIL: "info@travco.example",
      SYSTEM_COUNTRY: "Jordan",
      PHONE_NUMBER: "+962 6 555 5555",
      LOGO_ATTACHMENT_ID: "company-logo-1",
    }),
    loadLogoDataUrl: async attachmentId => {
      requestedLogoId = attachmentId;
      return logoDataUrl;
    },
  });

  assert.equal(requestedLogoId, "company-logo-1");
  assert.deepEqual(result, {
    systemName: "TRAVCO JORDAN",
    systemLogo: logoDataUrl,
    systemEmail: "info@travco.example",
    systemCountry: "Jordan",
    phoneNumber: "+962 6 555 5555",
  });
});
