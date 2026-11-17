import { CreditCard, FileText, HelpCircle, Landmark, ShieldCheck, UserCheck } from "lucide-react";
import { ACTIVITY_CATEGORY } from "../../utils/invoiceActivityEvents";

/** Subtle status colours: green = completed, blue = informational/current, amber = attention,
 * red = rejected/failed, gray = unknown. */
export const TONE_STYLES = {
  success: { dot: "bg-emerald-50 text-emerald-700 ring-emerald-200", badge: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  info: { dot: "bg-blue-50 text-blue-700 ring-blue-200", badge: "bg-blue-50 text-blue-700 ring-blue-200" },
  warning: { dot: "bg-amber-50 text-amber-700 ring-amber-200", badge: "bg-amber-50 text-amber-800 ring-amber-200" },
  danger: { dot: "bg-red-50 text-red-700 ring-red-200", badge: "bg-red-50 text-red-700 ring-red-200" },
  neutral: { dot: "bg-gray-50 text-gray-500 ring-gray-200", badge: "bg-gray-50 text-gray-600 ring-gray-200" },
};

export const CATEGORY_ICON = {
  [ACTIVITY_CATEGORY.PROCESSING]: FileText,
  [ACTIVITY_CATEGORY.VALIDATION]: ShieldCheck,
  [ACTIVITY_CATEGORY.TAX]: Landmark,
  [ACTIVITY_CATEGORY.APPROVAL]: UserCheck,
  [ACTIVITY_CATEGORY.PAYMENT]: CreditCard,
  [ACTIVITY_CATEGORY.OTHER]: HelpCircle,
};

export const BADGE_BASE = "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset";
