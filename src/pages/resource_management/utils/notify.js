import { toast } from "react-toastify";

const DEFAULT_AUTO_CLOSE = 3000;
let hasWarnedAboutMissingContainer = false;

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const collectMessages = (value) => {
  if (!value) return [];
  if (typeof value === "string") return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectMessages(item)).filter(Boolean);
  }
  if (!isPlainObject(value)) return [];

  return [
    ...collectMessages(value.message),
    ...collectMessages(value.error),
    ...collectMessages(value.detail),
    ...collectMessages(value.title),
    ...collectMessages(value.description),
    ...collectMessages(value.errors),
  ].filter(Boolean);
};

export const getResourceManagementErrorMessage = (
  error,
  fallback = "Something went wrong. Please try again.",
) => {
  if (typeof error === "string" && error.trim()) {
    return error.trim();
  }

  const responseData = error?.response?.data;
  const responseMessages = collectMessages(responseData);
  if (responseMessages.length > 0) {
    return responseMessages.join(" ");
  }

  const directMessages = collectMessages(error);
  if (directMessages.length > 0) {
    return directMessages.join(" ");
  }

  if (error?.code === "ECONNABORTED") {
    return "Request timed out. Please try again.";
  }

  if (!error?.response && error?.request) {
    return "Server unavailable. Please check your connection and try again.";
  }

  return fallback;
};

const warnIfToastContainerMissing = () => {
  if (!import.meta.env.DEV || hasWarnedAboutMissingContainer) return;
  if (typeof document === "undefined") return;

  const hasToastContainer = Boolean(document.querySelector(".Toastify"));
  if (!hasToastContainer) {
    hasWarnedAboutMissingContainer = true;
    console.warn(
      "[resource_management] ToastContainer is not mounted. Notifications will not be visible.",
    );
  }
};

const baseToast = (method, payload, options) => {
  warnIfToastContainerMissing();
  return toast[method](payload, options);
};

export const notify = {
  success(message, options = {}) {
    return baseToast("success", message, {
      autoClose: DEFAULT_AUTO_CLOSE,
      ...options,
    });
  },

  error(errorOrMessage, fallback, options = {}) {
    const message =
      fallback === undefined
        ? getResourceManagementErrorMessage(errorOrMessage)
        : getResourceManagementErrorMessage(errorOrMessage, fallback);

    return baseToast("error", message, {
      autoClose: DEFAULT_AUTO_CLOSE,
      ...options,
    });
  },

  warning(message, options = {}) {
    return baseToast("warning", message, {
      autoClose: DEFAULT_AUTO_CLOSE,
      ...options,
    });
  },

  info(message, options = {}) {
    return baseToast("info", message, {
      autoClose: DEFAULT_AUTO_CLOSE,
      ...options,
    });
  },

  loading(message, toastId, options = {}) {
    warnIfToastContainerMissing();
    return toast.loading(message, {
      toastId,
      closeOnClick: false,
      draggable: false,
      ...options,
    });
  },

  complete(toastId, message, type = "success", options = {}) {
    warnIfToastContainerMissing();
    toast.update(toastId, {
      render: message,
      type,
      isLoading: false,
      autoClose: DEFAULT_AUTO_CLOSE,
      closeButton: true,
      draggable: true,
      ...options,
    });
  },
};

