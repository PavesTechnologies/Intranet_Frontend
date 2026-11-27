import { useEffect, useId } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getApiErrorMessage } from "../../utils/apiError";
import { TAX_COMPONENTS, TAX_COMPONENT_LABELS } from "../../constants/gstItc";
import { inr, inrOrDash, invoiceValueText } from "../utils/gstFormat";

/**
 * GSTR-2B document totals (backend document_totals: invoice value, taxable value and GST reported separately,
 * credit notes negative). Shown exactly as returned; a missing invoice value is labelled, not replaced by ₹0.
 */
export function DocumentTotals({ totals, className }) {
  const value = invoiceValueText(totals);
  const items = [
    ["Invoice value", value.text, value.note],
    ["Taxable value", inrOrDash(totals?.taxable_value)],
    ["GST amount", inrOrDash(totals?.total_gst), totals ? TAX_COMPONENTS.map((c) => `${TAX_COMPONENT_LABELS[c]} ${inrOrDash(totals[c])}`).join(" · ") : null],
  ];
  return (
    <dl className={clsx("grid gap-2 sm:grid-cols-3", className)} aria-label="GSTR-2B totals">
      {items.map(([label, text, note]) => (
        <div key={label} className="rounded-md bg-white px-3 py-2">
          <dt className="text-[11px] text-slate-500">{label}</dt>
          <dd className="text-base font-semibold tabular-nums text-slate-800">{text}</dd>
          {note && <dd className="text-[11px] text-slate-400">{note}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Status badge for a {label, tone} spec from constants/gstItc.js. */
export function StatusPill({ spec, title, className }) {
  if (!spec) return null;
  return (
    <span title={title || spec.hint} className={clsx("inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset", spec.tone, className)}>
      {spec.label}
    </span>
  );
}

export function SectionCard({ title, actions, children, className, bodyClassName }) {
  return (
    <section className={clsx("rounded-xl border border-slate-200 bg-white", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      )}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function LoadingBlock({ text }) {
  return <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-16"><LoadingSpinner text={text} /></div>;
}

export function ErrorBlock({ error, fallback }) {
  return <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{getApiErrorMessage(error, fallback)}</p>;
}

export function Field({ label, children, className }) {
  return (
    <div className={className}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children ?? "—"}</dd>
    </div>
  );
}

/**
 * Per-component amounts table: one row per {label, values: {igst, cgst, sgst, cess, total?}, count?}.
 * Values are shown exactly as the backend returned them; "total" is only shown when provided.
 */
export function ComponentTable({ rows, showCount = false, caption }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
          <tr>
            <th className="px-3 py-2" scope="col"> </th>
            {showCount && <th className="px-3 py-2 text-right" scope="col">Invoices</th>}
            {TAX_COMPONENTS.map((c) => <th key={c} className="px-3 py-2 text-right" scope="col">{TAX_COMPONENT_LABELS[c]}</th>)}
            <th className="px-3 py-2 text-right" scope="col">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => (
            <tr key={r.label} className={r.emphasis ? "font-semibold text-slate-900" : "text-slate-700"}>
              <th scope="row" className="whitespace-nowrap px-3 py-2 text-left text-xs font-medium text-slate-600">
                {r.label}
                {r.hint && <div className="font-normal text-slate-400">{r.hint}</div>}
              </th>
              {showCount && <td className="px-3 py-2 text-right tabular-nums">{r.count ?? "—"}</td>}
              {TAX_COMPONENTS.map((c) => (
                <td key={c} className="px-3 py-2 text-right tabular-nums">{r.values ? inrOrDash(r.values[c]) : "—"}</td>
              ))}
              <td className="px-3 py-2 text-right tabular-nums">{r.values ? inrOrDash(r.values.total) : "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Right-hand side panel for record details (Escape / backdrop closes it). */
export function Drawer({ open, onClose, title, subtitle, children, footer, width = "max-w-3xl" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9000] flex justify-end" role="dialog" aria-modal="true" aria-label={typeof title === "string" ? title : undefined}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className={clsx("relative flex h-full w-full flex-col bg-white shadow-xl", width)}>
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="truncate text-base font-semibold text-slate-900">{title}</h2>
            {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 p-0" aria-label="Close" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-slate-200 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

/** Confirmation step for important actions; the confirm button is disabled while the request runs. */
export function ConfirmDialog({ open, title, message, children, confirmText = "Confirm", onConfirm, onCancel, loading, variant = "primary", confirmDisabled }) {
  if (!open) return null;
  return (
    // Above the shared Modal (z-[9999]) and the Drawer, since it is opened from both.
    <div className="fixed inset-0 z-[10050] flex items-center justify-center bg-black/40 px-4" role="alertdialog" aria-modal="true" aria-label={title}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {message && <div className="mt-2 text-sm leading-relaxed text-slate-600">{message}</div>}
        {children && <div className="mt-3">{children}</div>}
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" size="small" onClick={onCancel} disabled={loading}>Cancel</Button>
          <Button variant={variant} size="small" onClick={onConfirm} loading={loading} disabled={confirmDisabled}>{confirmText}</Button>
        </div>
      </div>
    </div>
  );
}

const inputClass = "h-9 w-full rounded-md border border-slate-300 px-2.5 text-sm text-slate-800 focus:border-[#0A0082] focus:outline-none focus:ring-2 focus:ring-[#0A0082]/20 disabled:bg-slate-50";

/** Hint / error under a field - outside the <label>, so it describes the field instead of renaming it. */
function FieldNote({ id, error, hint }) {
  if (error) return <span id={id} className="mt-0.5 block font-normal text-rose-600">{error}</span>;
  if (hint) return <span id={id} className="mt-0.5 block font-normal text-slate-400">{hint}</span>;
  return null;
}

export function TextInput({ label, error, hint, className, id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={clsx("block text-xs font-medium text-slate-600", className)}>
      <label htmlFor={inputId}>{label}</label>
      <input {...props} id={inputId} className={clsx(inputClass, "mt-1", error && "border-rose-400")} aria-invalid={Boolean(error)}
        aria-describedby={error || hint ? `${inputId}-note` : undefined} />
      <FieldNote id={`${inputId}-note`} error={error} hint={hint} />
    </div>
  );
}

export function SelectInput({ label, children, className, ...props }) {
  return (
    <label className={clsx("block text-xs font-medium text-slate-600", className)}>
      {label}
      <select {...props} className={clsx(inputClass, "mt-1")}>{children}</select>
    </label>
  );
}

export function TextArea({ label, error, hint, className, id, ...props }) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={clsx("block text-xs font-medium text-slate-600", className)}>
      <label htmlFor={inputId}>{label}</label>
      <textarea rows={2} {...props} id={inputId} className={clsx(inputClass, "mt-1 h-auto py-2", error && "border-rose-400")}
        aria-invalid={Boolean(error)} aria-describedby={error || hint ? `${inputId}-note` : undefined} />
      <FieldNote id={`${inputId}-note`} error={error} hint={hint} />
    </div>
  );
}

/** Four component inputs (IGST / CGST / SGST / Cess) with an optional cap per component. */
export function ComponentInputs({ values, onChange, caps, placeholders, labelPrefix = "", errors = {} }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {TAX_COMPONENTS.map((c) => (
        <TextInput
          key={c}
          label={`${labelPrefix}${TAX_COMPONENT_LABELS[c]}`}
          type="number"
          min="0"
          step="0.01"
          inputMode="decimal"
          value={values[c] ?? ""}
          placeholder={placeholders?.[c]}
          onChange={(e) => onChange({ ...values, [c]: e.target.value })}
          error={errors[c]}
          hint={caps ? `Up to ${inr(caps[c])}` : undefined}
        />
      ))}
    </div>
  );
}
