import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const STATUS_CONFIG = {
  success: {
    toastType: toast.success,
    defaultMessage: "Action completed successfully!",
  },
  info: {
    toastType: toast.info,
    defaultMessage: "Action is in progress.",
  },
  error: {
    toastType: toast.error,
    defaultMessage: "Action failed.",
  },
  warning: {
    toastType: toast.warning,
    defaultMessage: "Please check the details.",
  },
};

export const showStatusToast = (message = "", messageType = "info") => {
  const config = STATUS_CONFIG[messageType];

  if (config) {
    config.toastType(message || config.defaultMessage);
  } else {
    toast(message || "Notification");
  }
};