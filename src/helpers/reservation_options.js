const asArray = value => (Array.isArray(value) ? value : []);

const getId = value => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (value?._id) return getId(value._id);
  if (value?.$oid) return value.$oid;
  return String(value || "");
};

const cleanText = value => String(value || "").trim();

const addUnique = (map, value, label = value) => {
  const optionValue = cleanText(value);
  const optionLabel = cleanText(label || value);

  if (!optionValue || !optionLabel) return;

  const key = optionValue.toLowerCase();
  if (!map.has(key)) {
    map.set(key, { value: optionValue, label: optionLabel });
  }
};

const toOptions = (values, placeholder) => {
  const map = new Map();
  values.forEach(value => addUnique(map, value));

  return [
    { value: "", label: placeholder },
    ...Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    ),
  ];
};

export const withCurrentOption = (options, currentValue) => {
  const current = cleanText(currentValue);
  if (!current) return options;

  const exists = asArray(options).some(
    option => cleanText(option?.value).toLowerCase() === current.toLowerCase()
  );

  return exists ? options : [...options, { value: current, label: current }];
};

export const RESERVATION_STATUS_OPTIONS = [
  { value: "", label: "Select Status" },
  { value: "Pending", label: "Pending" },
  { value: "Requested", label: "Requested" },
  { value: "Confirmed", label: "Confirmed" },
  { value: "Booked", label: "Booked" },
  { value: "Cancelled", label: "Cancelled" },
  { value: "Invoiced", label: "Invoiced" },
];

export const buildContractingUserOptions = users => {
  const options = asArray(users)
    .filter(user => user?.ACTIVE_STATUS !== false)
    .filter(user => {
      const roles = Array.isArray(user?.ROLES)
        ? user.ROLES
        : [user?.ROLE].filter(Boolean);
      return roles.some(
        role => cleanText(role).toUpperCase() === "CONTRACTING"
      );
    })
    .map(user => {
      const value = getId(user);
      const fullName = cleanText(
        `${user?.FIRST_NAME || ""} ${user?.LAST_NAME || ""}`
      );
      return {
        value,
        label: fullName || cleanText(user?.EMAIL) || value,
      };
    })
    .filter(option => option.value)
    .sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    );

  return [{ value: "", label: "Select Contracting User" }, ...options];
};

export const getAccommodationEntries = file => {
  const entries = asArray(file?.QUOTATION_ACCUMIDATIONS);
  if (entries.length) return entries;
  return file?.QUOTATION_ACCUMIDATION ? [file.QUOTATION_ACCUMIDATION] : [];
};

export const getAccommodationOptionKey = (entry, optionIndex) =>
  `${getId(entry?._id) || "accommodation"}::${optionIndex}`;

const getAccommodationOptionHotelNames = option =>
  asArray(option?.CITY_GROUPS)
    .flatMap(cityGroup =>
      asArray(cityGroup?.STAYS).map(stay => cleanText(stay?.HOTEL_NAME))
    )
    .filter(Boolean);

export const buildAccommodationOptionChoices = file => {
  const choices = [];

  getAccommodationEntries(file).forEach((entry, entryIndex) => {
    asArray(entry?.OPTIONS).forEach((option, optionIndex) => {
      const hotelNames = Array.from(
        new Set(getAccommodationOptionHotelNames(option))
      );
      const labelHotels = hotelNames.length
        ? ` - ${hotelNames.join(", ")}`
        : "";

      choices.push({
        value: getAccommodationOptionKey(entry, optionIndex),
        label: `Option ${choices.length + 1}${labelHotels}`,
        entryIndex,
        optionIndex,
      });
    });
  });

  return choices;
};

export const filterFileByAccommodationOption = (file, optionKey) => {
  const selected = cleanText(optionKey);
  if (!selected) return file;

  const filteredEntries = getAccommodationEntries(file)
    .map(entry => {
      const filteredOptions = asArray(entry?.OPTIONS).filter(
        (_, optionIndex) => getAccommodationOptionKey(entry, optionIndex) === selected
      );

      return filteredOptions.length
        ? { ...entry, OPTIONS: filteredOptions, TOTAL_OPTIONS: filteredOptions.length }
        : null;
    })
    .filter(Boolean);

  if (!filteredEntries.length) return file;

  return {
    ...file,
    QUOTATION_ACCUMIDATIONS: filteredEntries,
    QUOTATION_ACCUMIDATION: filteredEntries[0] || null,
  };
};

export const mergeReservationMetadata = (draft, saved = {}) => ({
  ...draft,
  ...(saved?.accommodationSelection
    ? { accommodationSelection: saved.accommodationSelection }
    : {}),
});

export const buildHotelNameOptions = file => {
  const names = getAccommodationEntries(file).flatMap(entry =>
    asArray(entry?.OPTIONS).flatMap(option =>
      asArray(option?.CITY_GROUPS).flatMap(cityGroup =>
        asArray(cityGroup?.STAYS).map(stay => stay?.HOTEL_NAME)
      )
    )
  );

  return toOptions(names, "Select Hotel");
};

const getRouteCityName = city =>
  cleanText(
    city?.CITY_NAME ||
      city?.PLACE_NAME ||
      city?.ITEM_VALUE ||
      city?.name ||
      city?.label ||
      city
  );

const splitRouteText = routeText =>
  cleanText(routeText)
    .split(/\s*(?:->|→|>|\/|\||,|\bto\b|-)\s*/i)
    .map(part => cleanText(part))
    .filter(Boolean);

export const buildRouteOptions = file => {
  const map = new Map();
  const days = asArray(file?.QUOTATION_DAYS);

  days.forEach(day => {
    const basic = day?.basic || day || {};
    const route = day?.route || {};
    const dayOrder = basic?.DAY_ORDER ?? day?.DAY_ORDER;
    const routeText = cleanText(route?.text || basic?.ROUTE_TEXT || day?.ROUTE_TEXT);

    if (routeText) {
      const label = dayOrder ? `Day ${dayOrder}: ${routeText}` : routeText;
      addUnique(map, routeText, label);
      splitRouteText(routeText).forEach(part => addUnique(map, part));
    }

    asArray(route?.cities).forEach(city => {
      const cityName = getRouteCityName(city);
      addUnique(map, cityName);
    });
  });

  return [
    { value: "", label: "Select Route" },
    ...Array.from(map.values()),
  ];
};

const buildSizeLabel = item => {
  if (!item) return "";

  const name = cleanText(
    item?.TRANSPORTATION_SIZE ||
      item?.TRANSPORTATION_SIZE_NAME ||
      item?.TRANSPORTATION_TYPE ||
      item?.NAME ||
      item?.LABEL ||
      item?.name ||
      item?.label
  );

  const min = item?.MINIMUM_CAPACITY;
  const max = item?.MAXIMUM_CAPACITY;

  if (name && min != null && max != null) return `${name} (${min}-${max} pax)`;
  if (name && min != null) return `${name} (${min}+ pax)`;
  return name;
};

const getRateRows = company => {
  if (Array.isArray(company?.TRANSPORTATION_RATES)) return company.TRANSPORTATION_RATES;
  if (Array.isArray(company?.RATES)) return company.RATES;
  if (Array.isArray(company?.rates)) return company.rates;
  return [];
};

const getRateSizeId = row =>
  getId(row?.TRANSPORTATION_SIZE_ID) ||
  getId(row?.TRANSPORTATION_SIZE_ID?._id) ||
  getId(row?.size?._id) ||
  getId(row?.sizeId);

export const buildVehicleSizeOptions = (
  companies,
  lookups,
  companyName = ""
) => {
  const sizeMap = new Map();

  asArray(lookups?.transportationSizes).forEach(item => {
    const id = getId(item?._id);
    const label = buildSizeLabel(item);
    if (id && label) sizeMap.set(id, label);
  });

  const normalizedCompanyName = cleanText(companyName).toLowerCase();
  const map = new Map();

  asArray(companies)
    .filter(company => {
      if (!normalizedCompanyName) return true;
      return cleanText(company?.COMPANY_NAME).toLowerCase() === normalizedCompanyName;
    })
    .forEach(company => {
      getRateRows(company)
        .filter(row => row?.ACTIVE_STATUS !== false)
        .forEach(row => {
          const label = sizeMap.get(getRateSizeId(row)) || buildSizeLabel(row?.SIZE);
          addUnique(map, label);
        });
    });

  if (!map.size) {
    sizeMap.forEach(label => addUnique(map, label));
  }

  return [
    { value: "", label: "Select Size" },
    ...Array.from(map.values()).sort((a, b) =>
      a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
    ),
  ];
};

export const buildGuideNameOptions = guides =>
  toOptions(
    asArray(guides)
      .filter(guide => guide?.ACTIVE_STATUS !== false)
      .map(guide => guide?.GUIDE_NAME),
    "Select Guide"
  );

const getLanguageOptionText = language =>
  cleanText(
    language?.label ||
      language?.name ||
      language?.ITEM_VALUE ||
      language?.VALUE ||
      language?.value ||
      language
  );

export const buildGuideLanguageOptions = (
  guides,
  guideName = "",
  fallbackLanguages = []
) => {
  const normalizedGuideName = cleanText(guideName).toLowerCase();
  const sourceGuides = normalizedGuideName
    ? asArray(guides).filter(
        guide => cleanText(guide?.GUIDE_NAME).toLowerCase() === normalizedGuideName
      )
    : asArray(guides);
  const guideLanguages = sourceGuides.flatMap(guide =>
    asArray(guide?.GUIDE_LANGUAGES)
  );
  const fallback = asArray(fallbackLanguages).map(getLanguageOptionText);

  return toOptions(
    guideLanguages.length ? guideLanguages : fallback,
    "Select Language"
  );
};

export const getFirstGuideLanguage = (guides, guideName) => {
  const normalizedGuideName = cleanText(guideName).toLowerCase();
  const guide = asArray(guides).find(
    item => cleanText(item?.GUIDE_NAME).toLowerCase() === normalizedGuideName
  );

  return cleanText(asArray(guide?.GUIDE_LANGUAGES)[0]);
};

const MANIFEST_DISPLAY_FIELDS = [
  ["type", "Type"],
  ["countryCode", "Country Code"],
  ["passportNo", "Passport No"],
  ["name", "Name"],
  ["dateOfBirth", "Date of Birth"],
  ["sex", "Sex"],
  ["dateOfIssue", "Date of Issue"],
  ["dateOfExpiry", "Date of Expiry"],
  ["nationalNo", "National No"],
  ["placeOfBirth", "Place of Birth"],
  ["authority", "Authority"],
];

export const buildManifestDisplayRows = clients =>
  asArray(clients).map((client, index) => {
    const name = cleanText(client?.name) || `Client ${index + 1}`;
    const passportNo = cleanText(client?.passportNo);

    return {
      key: client?._sourceKey || `client-${index + 1}`,
      index,
      name,
      passportNo,
      fields: MANIFEST_DISPLAY_FIELDS.map(([field, label]) => ({
        field,
        label,
        value: cleanText(client?.[field]) || "-",
      })),
    };
  });

const normalizeGuideName = value => cleanText(value).toLowerCase();

export const buildGuideReservationUsageMap = reservationFiles => {
  const usage = new Map();

  asArray(reservationFiles).forEach(file => {
    const reference = cleanText(file?.FILE_REFERENCE);
    if (!reference) return;

    asArray(file?.RESERVATION_DATA?.guides).forEach(row => {
      const key = normalizeGuideName(row?.guideName);
      if (!key) return;

      const current = usage.get(key) || [];
      if (!current.includes(reference)) {
        usage.set(key, [...current, reference]);
      }
    });
  });

  return usage;
};
