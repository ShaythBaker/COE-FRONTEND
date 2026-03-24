// path: src/components/Common/RoleProtected.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";
import { hasAnyRole } from "../../helpers/coe_roles";

const RoleProtected = ({ allowedRoles = [], children }) => {
  const roles = useSelector((state) => state?.Login?.roles || []);
  const isAuthed = useSelector((state) => !!state?.Login?.isAuthenticated);

  if (!isAuthed) return <Navigate to="/login" replace />;

  const ok = hasAnyRole(roles, allowedRoles);
  if (!ok) return <Navigate to="/not-authorized" replace />;

  return children;
};

export default RoleProtected;
