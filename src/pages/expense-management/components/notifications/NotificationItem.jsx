import React from "react";
import { AlertCircle, CheckCircle2, Hourglass, Info, XCircle, Users, ArrowRight } from "lucide-react";

/**
 * Backend NotificationCategory -> how it reads. Status colors always come with an icon + label,
 * never color alone.
 */
export const CATEGORY_META = {
  ACTION_REQUIRED: { label: "Action required", Icon: AlertCircle, tint: "bg-amber-50 text-amber-700 ring-amber-200", dot: "#d97706" },
  PENDING: { label: "In progress", Icon: Hourglass, tint: "bg-blue-50 text-blue-700 ring-blue-200", dot: "#2a78d6" },
  COMPLETED: { label: "Completed", Icon: CheckCircle2, tint: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "#0ca30c" },
  FAILED: { label: "Failed", Icon: XCircle, tint: "bg-rose-50 text-rose-700 ring-rose-200", dot: "#d03b3b" },
  INFO: { label: "Info", Icon: Info, tint: "bg-slate-100 text-slate-600 ring-slate-200", dot: "#898781" },
};

const TEAM_LABELS = { FINANCE_EXECUTIVE: "Finance team", AP_EXECUTIVE: "AP team", ADMIN: "Admins" };

export const timeAgo = (value) => {
  if (!value) return "";
  const mins = Math.round((Date.now() - new Date(value).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const money = (amount, currency) => {
  if (amount == null) return null;
  try {
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: currency || "INR", maximumFractionDigits: 2 }).format(Number(amount));
  } catch {
    return `${currency || ""} ${Number(amount).toFixed(2)}`;
  }
};

/**
 * One notification: who -> what happened -> which record -> current status -> what to do.
 * `compact` is the header dropdown variant. Clicking anywhere opens it (onOpen marks it read
 * and navigates to its link).
 */
export default function NotificationItem({ notification: n, onOpen, compact = false }) {
  const meta = CATEGORY_META[n.category] || CATEGORY_META.INFO;
  const { Icon } = meta;
  const amount = money(n.amount, n.currencyCode);

  return (
    <button
      type="button"
      onClick={() => onOpen?.(n)}
      className={`group flex w-full items-start gap-3 text-left transition ${compact ? "px-4 py-3" : "p-4"} ${
        n.read ? "bg-white hover:bg-slate-50" : "bg-indigo-50/40 hover:bg-indigo-50/70"
      }`}
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ${meta.tint}`}>
        <Icon className="h-4 w-4" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start gap-2">
          <span className={`min-w-0 flex-1 text-sm ${n.read ? "font-medium text-slate-700" : "font-semibold text-slate-900"} ${compact ? "line-clamp-2" : ""}`}>
            {n.title}
          </span>
          {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" title="Unread" />}
        </span>

        {!compact && n.message && <span className="mt-1 block text-xs leading-relaxed text-slate-600">{n.message}</span>}

        <span className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-semibold ring-1 ${meta.tint}`}>
            {meta.label}
          </span>
          {n.reportNumber && <span className="font-mono font-semibold text-slate-600">{n.reportNumber}</span>}
          {!compact && n.actorName && <span>By {n.actorName}</span>}
          {!compact && amount && <span className="font-semibold text-slate-700">{amount}</span>}
          {!compact && n.statusLabel && <span>Status: {n.statusLabel}</span>}
          {n.recipientRole && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {TEAM_LABELS[n.recipientRole] || n.recipientRole}
            </span>
          )}
          <span className="ml-auto whitespace-nowrap text-slate-400">{timeAgo(n.sentAt)}</span>
        </span>

        {!compact && n.actionLabel && n.link && (
          <span className="mt-2 inline-flex items-center gap-1 rounded-lg bg-[#0A0082] px-2.5 py-1 text-xs font-semibold text-white group-hover:bg-indigo-900">
            {n.actionLabel} <ArrowRight className="h-3 w-3" />
          </span>
        )}
      </span>
    </button>
  );
}
