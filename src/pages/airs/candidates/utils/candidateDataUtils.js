// Shared null-safe formatting primitives used when adapting backend AIRS
// candidate responses (list + detail) into display-ready values. Never lets
// null/undefined/NaN reach a component — text falls back to "-", numbers used
// in arithmetic (gauges, templated units) fall back to 0.
export const DASH = "-";

export const isEmpty = (v) =>
  v === null || v === undefined || v === "" || (typeof v === "number" && Number.isNaN(v));

export const textOrDash = (v) => (isEmpty(v) ? DASH : v);

export const numberOr = (v, fallback = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};

export const numberOrDash = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : DASH;
};

export const arr = (v) => (Array.isArray(v) ? v : []);

export function initialsFromName(name) {
  if (isEmpty(name) || typeof name !== "string") return DASH;
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return DASH;
  return parts.map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export const formatDateTime = (iso) => {
  if (isEmpty(iso)) return DASH;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? DASH : d.toLocaleString();
};
