export const companyUserProfilePath = id =>
  `/settings/users/${encodeURIComponent(String(id || ""))}`;
