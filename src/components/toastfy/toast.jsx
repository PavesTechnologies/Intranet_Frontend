// src/components/toastify/toast.jsx
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


const STATUS_CONFIG = {
  success: {
    toastType: toast.success,
    defaultMessage: "Action completed successfully!",
  },
  info: {
    toastType: toast.info,
    defaultMessage: "Action is in progress or on hold.",
  },
  error: {
    toastType: toast.error,
    defaultMessage: "Action failed or was rejected.",
  },
};


export const showStatusToast = (message = "", messageType = "info") => {
  const config = STATUS_CONFIG[messageType];

  if (config) {
    config.toastType(message || config.defaultMessage);
  } else {
    toast(message); // fallback to default toast if type is not recognized
  }
};
