import test from "node:test";
import assert from "node:assert/strict";

import { buildReservationSaveValidationPlan } from "./reservation_save_validation.js";

test("a tab save validates only the active reservation tab", () => {
  const hotelsPlan = buildReservationSaveValidationPlan({
    activeSection: "Hotels",
  });

  assert.deepEqual(hotelsPlan.dateSections, ["hotels"]);
  assert.deepEqual(hotelsPlan.specialRatesSections, ["hotels"]);
  assert.equal(hotelsPlan.validateRoomingList, false);
  assert.deepEqual(hotelsPlan.validationScope, {
    mode: "tab",
    sections: ["hotels"],
  });
});

test("the General tab tells the API not to validate other tabs", () => {
  const generalPlan = buildReservationSaveValidationPlan({
    activeSection: "General",
  });

  assert.deepEqual(generalPlan.validationScope, {
    mode: "tab",
    sections: [],
  });
});

test("the full reservation save validates every reservation tab", () => {
  const fullPlan = buildReservationSaveValidationPlan({
    fullReservation: true,
  });

  assert.deepEqual(fullPlan.dateSections, [
    "arrDep",
    "hotels",
    "transportation",
    "guides",
    "entrance",
    "restaurants",
    "extras",
  ]);
  assert.deepEqual(fullPlan.specialRatesSections, [
    "hotels",
    "transportation",
    "guides",
    "restaurants",
    "extras",
  ]);
  assert.equal(fullPlan.validateRoomingList, true);
  assert.deepEqual(fullPlan.validationScope, {
    mode: "full",
    sections: [
      "arrDep",
      "hotels",
      "transportation",
      "guides",
      "entrance",
      "restaurants",
      "extras",
      "roomingList",
    ],
  });
});

test("the Clients tab validates only its visible internal tab", () => {
  const manifestPlan = buildReservationSaveValidationPlan({
    activeSection: "Clients",
    activeClientsTab: "manifest",
  });
  const roomingListPlan = buildReservationSaveValidationPlan({
    activeSection: "Clients",
    activeClientsTab: "roomingList",
  });

  assert.equal(manifestPlan.validateRoomingList, false);
  assert.equal(roomingListPlan.validateRoomingList, true);
});
