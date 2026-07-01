import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAccommodationOptionChoices,
  buildManifestDisplayRows,
  filterFileByAccommodationOption,
  mergeReservationMetadata,
} from "./reservation_options.js";

test("filterFileByAccommodationOption keeps only the selected accommodation option", () => {
  const file = {
    QUOTATION_ACCUMIDATIONS: [
      {
        _id: "acc-1",
        OPTIONS: [
          {
            CITY_GROUPS: [
              { STAYS: [{ HOTEL_NAME: "First Hotel" }] },
            ],
          },
          {
            CITY_GROUPS: [
              { STAYS: [{ HOTEL_NAME: "Second Hotel" }] },
            ],
          },
        ],
      },
    ],
  };

  const choices = buildAccommodationOptionChoices(file);
  const scopedFile = filterFileByAccommodationOption(file, choices[1].value);

  assert.equal(scopedFile.QUOTATION_ACCUMIDATIONS[0].OPTIONS.length, 1);
  assert.equal(
    scopedFile.QUOTATION_ACCUMIDATIONS[0].OPTIONS[0].CITY_GROUPS[0].STAYS[0]
      .HOTEL_NAME,
    "Second Hotel"
  );
});

test("mergeReservationMetadata preserves saved accommodation selection", () => {
  const merged = mergeReservationMetadata(
    { general: { groupName: "Group A" } },
    {
      accommodationSelection: {
        optionKey: "acc-1::1",
        label: "Option 2",
      },
    }
  );

  assert.equal(merged.accommodationSelection.optionKey, "acc-1::1");
});

test("buildManifestDisplayRows exposes every manifest field for page display", () => {
  const rows = buildManifestDisplayRows([
    {
      type: "Mrs.",
      countryCode: "JO",
      passportNo: "P123",
      name: "Lina Saleh",
      dateOfBirth: "1991-05-10",
      sex: "Female",
      dateOfIssue: "2024-01-01",
      dateOfExpiry: "2034-01-01",
      nationalNo: "98765",
      placeOfBirth: "Amman",
      authority: "Civil Status",
    },
  ]);

  assert.equal(rows[0].name, "Lina Saleh");
  assert.deepEqual(
    rows[0].fields.map(field => field.label),
    [
      "Type",
      "Country Code",
      "Passport No",
      "Name",
      "Date of Birth",
      "Sex",
      "Date of Issue",
      "Date of Expiry",
      "National No",
      "Place of Birth",
      "Authority",
    ]
  );
  assert.equal(rows[0].fields.find(field => field.label === "Passport No").value, "P123");
});
