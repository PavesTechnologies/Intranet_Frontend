// src/pages/accounts-payable/utils/apiError.js

/**
 * Extracts a human-readable message from a FastAPI error response
 * (`{detail: string | Array<{msg, loc}>}`), falling back to `fallback`.
 */
export const getApiErrorMessage = (error, fallback = "Something went wrong.") => {
  const detail = error?.response?.data?.detail;

  if (!detail) return fallback;
  if (typeof detail === "string") return detail;

  if (Array.isArray(detail)) {
    const messages = detail.map((item) => item?.msg).filter(Boolean);
    if (messages.length) return messages.join(" ");
  }

  return fallback;
};

export default getApiErrorMessage;
