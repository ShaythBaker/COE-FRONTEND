// path: src/helpers/jwt-token-access/auth-token-header.jsx
export default function authHeader() {
  const obj = JSON.parse(localStorage.getItem("authUser"));

  if (obj && obj.accessToken) {
    // if already has Bearer keep it; otherwise add it
    const token = obj.accessToken.startsWith("Bearer ")
      ? obj.accessToken
      : `Bearer ${obj.accessToken}`;

    return { Authorization: token };
  }

  return {};
}