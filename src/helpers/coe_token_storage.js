// path: src/helpers/coe_token_storage.js

export const COE_ACCESS_TOKEN = "COE_ACCESS_TOKEN";
export const COE_REFRESH_TOKEN = "COE_REFRESH_TOKEN";

export const getAccessToken = () => localStorage.getItem(COE_ACCESS_TOKEN);
export const getRefreshToken = () => localStorage.getItem(COE_REFRESH_TOKEN);

export const setTokens = ({ accessToken, refreshToken }) => {
  if (accessToken) localStorage.setItem(COE_ACCESS_TOKEN, accessToken);
  if (refreshToken) localStorage.setItem(COE_REFRESH_TOKEN, refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem(COE_ACCESS_TOKEN);
  localStorage.removeItem(COE_REFRESH_TOKEN);
};
