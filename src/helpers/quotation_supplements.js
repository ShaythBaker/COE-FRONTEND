const asArray = value => (Array.isArray(value) ? value : []);

const toAmount = value => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : 0;
};

const getApplicableNights = row => {
  const value = row?.costNights ?? row?.COST_NIGHTS ?? row?.nights ?? row?.NIGHTS ?? 0;
  const nights = Number(value);
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
};

const getRowSupplement = (row, key) => {
  const aliases = {
    ss: [
      "ss",
      "SS",
      "SINGLE_SUPPLIMENT_AMOUNT",
      "SINGLE_SUPPLEMENT_AMOUNT",
      "SS_RATE_AMOUNT",
    ],
    hb: ["hb", "HB", "HB_RATE_AMOUNT"],
    fb: ["fb", "FB", "FB_RATE_AMOUNT"],
  };

  const field = aliases[key].find(name => row?.[name] !== undefined && row?.[name] !== null);
  return field ? toAmount(row[field]) : 0;
};

export const calculateOptionSupplementTotals = rows =>
  asArray(rows).reduce(
    (totals, row) => {
      const nights = getApplicableNights(row);
      totals.ss += getRowSupplement(row, "ss") * nights;
      totals.hb += getRowSupplement(row, "hb") * nights;
      totals.fb += getRowSupplement(row, "fb") * nights;
      return totals;
    },
    { ss: 0, hb: 0, fb: 0 }
  );

export const normalizeOptionSupplementTotals = (totals, fallbackRows = []) => {
  const fallback = calculateOptionSupplementTotals(fallbackRows);

  if (totals && typeof totals === "object") {
    const saved = {
      ss: toAmount(
        totals.ss ?? totals.SS ?? totals.singleRoom ?? totals.singleRoomSupplement
      ),
      hb: toAmount(totals.hb ?? totals.HB ?? totals.halfBoard ?? totals.halfBoardSupplement),
      fb: toAmount(totals.fb ?? totals.FB ?? totals.fullBoard ?? totals.fullBoardSupplement),
    };

    return {
      ss: saved.ss > 0 ? saved.ss : fallback.ss,
      hb: saved.hb > 0 ? saved.hb : fallback.hb,
      fb: saved.fb > 0 ? saved.fb : fallback.fb,
    };
  }

  return fallback;
};

const getOptionLabels = option => {
  const labels = [option?.optionName, option?.name].filter(Boolean).map(String);
  const stars = String(option?.optionStars ?? option?.stars ?? "").trim();
  const starMatch = stars.match(/\d+/);
  if (starMatch) labels.push(`${starMatch[0]}*`);
  return labels.map(label => label.trim().toLowerCase());
};

const findOptionForLabel = (options, optionLabel) => {
  const wanted = String(optionLabel || "").trim().toLowerCase();
  const matching = asArray(options).filter(option => getOptionLabels(option).includes(wanted));
  return matching.find(option => option?.supplementTotals) || matching[0] || null;
};

const formatSupplementAmount = value => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? `USD ${amount.toFixed(2)}` : "-";
};

export const buildPackageSupplementRows = (options, optionLabels) => {
  const totalsByOption = asArray(optionLabels).map(optionLabel => {
    const option = findOptionForLabel(options, optionLabel);
    return normalizeOptionSupplementTotals(
      option?.supplementTotals,
      option?.seasonSummaryRows || option?.rows || []
    );
  });

  return [
    {
      label: "Single Room Supplement",
      key: "ss",
      description: "Single Supplement to stay in a single room",
    },
    {
      label: "Half Board Supplement",
      key: "hb",
      description: "Open International Buffet at the hotels",
    },
    {
      label: "Full Board Supplement",
      key: "fb",
      description: "Full Board Supplement at the hotels",
    },
  ].map(row => ({
    label: row.label,
    prices: totalsByOption.map(totals => formatSupplementAmount(totals[row.key])),
    description: row.description,
  }));
};

const normalizePaxLabel = value =>
  String(value || "")
    .toLowerCase()
    .replace(/\b(pax|guests?|people)\b/g, "")
    .replace(/\s+/g, "")
    .trim();

const rowMatchesPaxLabel = (row, paxLabel) => {
  const wanted = normalizePaxLabel(paxLabel);
  const rowLabel = normalizePaxLabel(row?.PAX_LABEL || row?.paxLabel || row?.label);
  if (wanted && rowLabel) return wanted === rowLabel;

  const numbers = String(paxLabel || "").match(/\d+/g) || [];
  const wantedMin = Number(numbers[0] || 0);
  const wantedMax = Number(numbers[1] || numbers[0] || 0);
  const rowMin = Number(row?.PAX_MIN ?? row?.paxMin ?? 0);
  const rowMax = Number(row?.PAX_MAX ?? row?.paxMax ?? rowMin);
  return wantedMin > 0 && wantedMin === rowMin && wantedMax === rowMax;
};

export const getPackageGuideLabel = (daysRoutes, paxLabel = "") => {
  const days = asArray(daysRoutes);
  const guideRows = days.flatMap(day => asArray(day?.guide?.rows));
  const selectedRow = guideRows.find(
    row => rowMatchesPaxLabel(row, paxLabel) && (row?.enabled || row?.required)
  );

  if (selectedRow) {
    return selectedRow.GUIDE_TYPE_NAME || selectedRow.guideTypeName || "Private Guide";
  }

  if (guideRows.length === 0) {
    const selectedGuide = days
      .map(day => day?.guide)
      .find(guide => guide?.enabled || guide?.required);
    if (selectedGuide) {
      return selectedGuide.GUIDE_TYPE_NAME || selectedGuide.guideTypeName || "Private Guide";
    }
  }

  return "-";
};
