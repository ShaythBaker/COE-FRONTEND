import test from "node:test";
import assert from "node:assert/strict";

import {
  buildPackageSupplementRows,
  calculateOptionSupplementTotals,
  getPackageGuideLabel,
} from "./quotation_supplements.js";

test("sums SS, HB, and FB for every applicable hotel night in one option", () => {
  const totals = calculateOptionSupplementTotals([
    { hotelName: "Amman Hotel", costNights: 2, ss: 100, hb: 20, fb: 30 },
    { hotelName: "Petra Hotel", costNights: 1, ss: 50, hb: 10, fb: 15 },
  ]);

  assert.deepEqual(totals, {
    ss: 250,
    hb: 50,
    fb: 75,
  });
});

test("uses cost nights for split seasons and does not count an inapplicable season", () => {
  const totals = calculateOptionSupplementTotals([
    { nights: 4, costNights: 3, ss: 25, hb: 10, fb: 20 },
    { nights: 4, costNights: 1, ss: 40, hb: 15, fb: 30 },
    { nights: 4, costNights: 0, ss: 999, hb: 999, fb: 999 },
  ]);

  assert.deepEqual(totals, {
    ss: 115,
    hb: 45,
    fb: 90,
  });
});

test("package supplement rows use saved option totals and the requested descriptions", () => {
  const rows = buildPackageSupplementRows(
    [
      {
        optionName: "Option 1",
        optionStars: "5*",
        supplementTotals: { ss: 557, hb: 272, fb: 410 },
      },
      {
        optionName: "Option 2",
        optionStars: "4*",
        supplementTotals: { ss: 273, hb: 71, fb: 160 },
      },
    ],
    ["5*", "4*"]
  );

  assert.deepEqual(rows, [
    {
      label: "Single Room Supplement",
      prices: ["USD 557.00", "USD 273.00"],
      description: "Single Supplement to stay in a single room",
    },
    {
      label: "Half Board Supplement",
      prices: ["USD 272.00", "USD 71.00"],
      description: "Open International Buffet at the hotels",
    },
    {
      label: "Full Board Supplement",
      prices: ["USD 410.00", "USD 160.00"],
      description: "Full Board Supplement at the hotels",
    },
  ]);
});

test("recalculates one option from its hotel rows when saved totals are empty", () => {
  const rows = buildPackageSupplementRows(
    [
      {
        optionName: "5*",
        supplementTotals: { ss: 160, hb: 100, fb: 180 },
      },
      {
        optionName: "4*",
        supplementTotals: { ss: 0, hb: 0, fb: 0 },
        seasonSummaryRows: [
          { nights: 2, ss: 35, hb: 20, fb: 30 },
          { nights: 1, ss: 20, hb: 10, fb: 15 },
        ],
      },
    ],
    ["5*", "4*"]
  );

  assert.deepEqual(
    rows.map(row => row.prices),
    [
      ["USD 160.00", "USD 90.00"],
      ["USD 100.00", "USD 50.00"],
      ["USD 180.00", "USD 75.00"],
    ]
  );
});

test("guide column shows a dash when the pax bracket has no selected guide", () => {
  const days = [
    {
      guide: {
        rows: [
          { PAX_LABEL: "1 Pax", enabled: false, GUIDE_TYPE_NAME: "Local Guide" },
          { PAX_LABEL: "6-7 Pax", enabled: true, GUIDE_TYPE_NAME: "Local Guide" },
        ],
      },
    },
  ];

  assert.equal(getPackageGuideLabel(days, "1 Pax"), "-");
  assert.equal(getPackageGuideLabel(days, "6-7 Pax"), "Local Guide");
});
