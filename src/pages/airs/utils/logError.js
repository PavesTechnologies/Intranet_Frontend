// Axios errors carry the request config - its Authorization header (the bearer token), the
// request body and params - and the full response. Logging one raw puts all of that in the
// browser console. Every airs error log goes through logError, which keeps only what helps
// debugging: the error's name and message, the HTTP status, method and path (no query string),
// and the backend's message when it's a plain string.
const MAX_DETAIL = 300;

export function safeError(error) {
  if (!error || typeof error !== "object") return error;
  const { config, response } = error;
  if (!config && !response) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  const data = response?.data;
  const detail = typeof data?.detail === "string" ? data.detail : typeof data?.message === "string" ? data.message : undefined;
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    status: response?.status,
    method: config?.method?.toUpperCase(),
    path: typeof config?.url === "string" ? config.url.split("?")[0] : undefined,
    detail: detail?.slice(0, MAX_DETAIL),
  };
}

export function logError(context, error) {
  console.error(context, safeError(error));
}
