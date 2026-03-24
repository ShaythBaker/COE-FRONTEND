// path: src/helpers/notify.js

import { toast } from "react-toastify";

const normalize = (message) => {
  if (message === null || message === undefined) return "";
  if (typeof message === "string") return message;
  try {
    return JSON.stringify(message);
  } catch {
    return String(message);
  }
};

export const notifySuccess = (message) => {
  toast.success(normalize(message));
};

export const notifyError = (message) => {
  toast.error(normalize(message));
};

export const notifyInfo = (message) => {
  toast.info(normalize(message));
};