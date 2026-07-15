import test from "node:test";
import assert from "node:assert/strict";
import * as pdfLayout from "./quotation_pdf_layout.js";

import {
  buildTravcoPackageTitle,
  renderQuotationPdfSections,
} from "./quotation_pdf_layout.js";

test("quotation PDF omits the internal approved-price summary", () => {
  const rendered = [];

  renderQuotationPdfSections({
    coverLetter: () => rendered.push("coverLetter"),
    arrivalDeparture: () => rendered.push("arrivalDeparture"),
    itinerary: () => rendered.push("itinerary"),
    inclusionsExclusions: () => rendered.push("inclusionsExclusions"),
    suggestedHotels: () => rendered.push("suggestedHotels"),
    approvedPriceSummary: () => rendered.push("approvedPriceSummary"),
    packagePrice: () => rendered.push("packagePrice"),
    generalNotes: () => rendered.push("generalNotes"),
    bankAccount: () => rendered.push("bankAccount"),
  });

  assert.deepEqual(rendered, [
    "coverLetter",
    "arrivalDeparture",
    "itinerary",
    "inclusionsExclusions",
    "suggestedHotels",
    "packagePrice",
    "generalNotes",
    "bankAccount",
  ]);
});

test("package-page heading uses the quotation duration", () => {
  assert.deepEqual(
    buildTravcoPackageTitle({ tripDays: 3, tripNights: 2 }),
    {
      title: "Jordan 3 Days Package",
      duration: "03 Days / 02 Nights",
    }
  );
});

test("PDF image slots never recycle the same photo", () => {
  assert.deepEqual(
    pdfLayout.getUniquePdfImages?.([
      "airport",
      "airport",
      "amman",
      "petra",
      "amman",
    ]),
    ["airport", "amman", "petra"]
  );
});

test("itinerary thumbnails never repeat the hero photo", () => {
  assert.deepEqual(
    pdfLayout.selectPdfImagePanel?.(["airport", "airport", "amman", "petra"], 0),
    {
      mainImage: "airport",
      thumbnailImages: ["amman", "petra"],
    }
  );

  assert.deepEqual(pdfLayout.selectPdfImagePanel?.(["airport"], 0), {
    mainImage: "airport",
    thumbnailImages: [],
  });
});

test("quotation pages never show a bottom logo", () => {
  assert.equal(
    pdfLayout.getTravcoPageDecoration?.().showFooterLogo,
    false
  );
});

test("the final thank-you message is centered near the bottom of the page", () => {
  assert.deepEqual(
    pdfLayout.getTravcoPageDecoration?.({
      isFinalPage: true,
      pageWidth: 210,
      pageHeight: 297,
      bottomMargin: 18,
    }).closingText,
    {
      text: "THANK YOU",
      x: 105,
      y: 279,
      align: "center",
    }
  );
});
