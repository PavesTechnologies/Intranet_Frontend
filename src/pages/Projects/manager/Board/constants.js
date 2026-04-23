export const BASE = window.__APP_CONFIG__.PMS_BASE_URL || "";

export const WIP_WARNING_THRESHOLD = 8;

export const PALETTE = [
  "bg-slate-100 text-slate-800",
  "bg-indigo-100 text-indigo-800",
  "bg-emerald-100 text-emerald-800",
  "bg-rose-100 text-rose-800",
  "bg-amber-100 text-amber-800",
  "bg-violet-100 text-violet-800",
  "bg-cyan-100 text-cyan-800",
  "bg-pink-100 text-pink-800",
];

export const headersWithToken = () => {
  const token = localStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : undefined,
    "Content-Type": "application/json",
  };
};

export const stableColorClass = (k) => {
  const s = String(k ?? "");
  let h = 216;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 1000;
  return PALETTE[Math.abs(h) % PALETTE.length];
};
