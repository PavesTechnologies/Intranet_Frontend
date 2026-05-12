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

// Shared column accent / badge palette — used by both Board and SwimlaneBoard
export const STATUS_PALETTES = [
  { accent: "bg-rose-400",    badge: "bg-rose-100 text-rose-700",       dot: "bg-rose-400"    },
  { accent: "bg-blue-500",    badge: "bg-blue-100 text-blue-700",       dot: "bg-blue-500"    },
  { accent: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700", dot: "bg-emerald-500" },
  { accent: "bg-violet-500",  badge: "bg-violet-100 text-violet-700",   dot: "bg-violet-500"  },
  { accent: "bg-amber-500",   badge: "bg-amber-100 text-amber-700",     dot: "bg-amber-500"   },
  { accent: "bg-cyan-500",    badge: "bg-cyan-100 text-cyan-700",       dot: "bg-cyan-500"    },
  { accent: "bg-pink-500",    badge: "bg-pink-100 text-pink-700",       dot: "bg-pink-500"    },
];

export const getStatusColors = (name, idx) => {
  const n = (name || "").toLowerCase().replace(/[\s-]/g, "");
  if (n.includes("done") || n.includes("complet") || n.includes("finish"))
    return STATUS_PALETTES[2];
  if (n.includes("progress") || n.includes("doing") || n.includes("wip") || n.includes("active"))
    return STATUS_PALETTES[1];
  if (n.includes("block") || n.includes("hold") || n.includes("stuck"))
    return { accent: "bg-red-500", badge: "bg-red-100 text-red-700", dot: "bg-red-500" };
  if (n.includes("todo") || n.includes("new") || n.includes("open") || n.includes("backlog"))
    return STATUS_PALETTES[0];
  return STATUS_PALETTES[idx % STATUS_PALETTES.length];
};
