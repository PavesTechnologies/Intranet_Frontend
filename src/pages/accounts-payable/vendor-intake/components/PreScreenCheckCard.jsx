import PreScreenStatusBadge from "./PreScreenStatusBadge";

/**
 * One labelled detail row inside a check card. `value` is plain text from the API;
 * `badge` renders it as a pill instead when the value is a status.
 */
export const PreScreenDetailRow = ({ label, value, badge, tone = "neutral" }) => (
  <div className="flex flex-col gap-1 border-b border-gray-100 py-2 last:border-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
    <span className="text-xs font-medium text-gray-500">{label}</span>
    {badge ? (
      <PreScreenStatusBadge label={value || "—"} tone={tone} />
    ) : (
      <span className="text-xs text-gray-900 sm:max-w-[60%] sm:text-right">{value || "—"}</span>
    )}
  </div>
);

/**
 * Numbered enterprise-style card for a single Pre-Screen check. The status badge is always
 * driven by the backend's own result for that check — this component never evaluates anything.
 * @param {{index:number, title:string, statusLabel:string, statusTone:string,
 *   reason?:string, reasonTone?:string, children:React.ReactNode}} props
 */
export default function PreScreenCheckCard({
  index,
  title,
  statusLabel,
  statusTone = "neutral",
  reason,
  reasonTone = "neutral",
  children,
}) {
  const reasonClasses =
    reasonTone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : reasonTone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : "border-gray-200 bg-gray-50 text-gray-600";

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#0A0082]/20 bg-[#0A0082]/5 text-xs font-semibold text-[#0A0082]">
            {index}
          </span>
          <h3 className="min-w-0 text-sm font-semibold text-gray-900">{title}</h3>
        </div>
        <PreScreenStatusBadge label={statusLabel} tone={statusTone} size="md" />
      </div>

      <div className="mt-3 sm:pl-9">{children}</div>

      {reason ? (
        <p className={`mt-3 rounded-lg border px-3 py-2 text-xs sm:ml-9 ${reasonClasses}`}>{reason}</p>
      ) : null}
    </div>
  );
}
