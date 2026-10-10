// src/pages/accounts-payable/automation/pages/APAutomationPage.jsx
// Route: /accounts-payable/automation  (AP_AUTOMATION_MANAGE - Finance Manager)
// Touchless PO invoices: the switch, match tolerances, auto-approval limit and how it is performing.
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import clsx from "clsx";
import { AlertTriangle, ArrowLeft, BadgeCheck, Gauge, RefreshCw, Send, ShieldCheck } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import { KpiTile, Empty, formatMoney } from "../../dashboard/components/insights";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDateTime } from "../../invoice/components/bulk/BulkUploadParts";
import { useAutomationSettings, useAutomationStats, useRunAutomationNow, useUpdateAutomationSettings } from "../hooks/useApAutomation";

const FIELDS = ["price_tolerance_pct", "price_tolerance_amount", "quantity_tolerance", "require_grn", "auto_approve_max_amount"];

function toForm(settings) {
  return Object.fromEntries(FIELDS.map((f) => [f, typeof settings[f] === "boolean" ? settings[f] : String(Number(settings[f]))]));
}

function Toggle({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0A0082]/40",
        checked ? "bg-emerald-500" : "bg-slate-300",
        disabled && "opacity-60",
      )}
    >
      <span className={clsx("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", checked ? "translate-x-5" : "translate-x-0.5")} />
    </button>
  );
}

function NumberField({ id, label, hint, suffix, value, onChange, step = "0.01" }) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1 flex items-center rounded-md border border-slate-300 bg-white focus-within:ring-2 focus-within:ring-[#0A0082]/30">
        <input
          id={id}
          type="number"
          min="0"
          step={step}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-md border-0 bg-transparent px-3 py-2 text-sm tabular-nums focus:outline-none"
        />
        {suffix && <span className="pr-3 text-sm text-slate-500">{suffix}</span>}
      </div>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  );
}

export default function APAutomationPage() {
  const navigate = useNavigate();
  const { data: settings, isLoading, isError, error } = useAutomationSettings();
  const { data: stats } = useAutomationStats(30);
  const update = useUpdateAutomationSettings();
  const runNow = useRunAutomationNow();
  const [form, setForm] = useState(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (settings) setForm(toForm(settings));
  }, [settings]);

  if (isLoading || !form) {
    return <div className="p-6 text-sm text-slate-500">{isError ? getApiErrorMessage(error, "Could not load automation settings.") : "Loading…"}</div>;
  }

  const saved = toForm(settings);
  const dirty = FIELDS.some((f) => String(form[f]) !== String(saved[f]));
  const set = (field) => (value) => setForm((f) => ({ ...f, [field]: value }));

  const save = async (changes, message) => {
    try {
      await update.mutateAsync(changes);
      toast.success(message);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save the settings."));
    }
  };

  const saveForm = () =>
    save(
      Object.fromEntries(FIELDS.map((f) => [f, typeof form[f] === "boolean" ? form[f] : form[f] === "" ? "0" : form[f]])),
      "Automation settings saved.",
    );

  const toggle = async () => {
    setConfirming(false);
    await save({ enabled: !settings.enabled }, settings.enabled ? "Automation switched off." : "Automation switched on.");
  };

  const recheck = async () => {
    try {
      const results = await runNow.mutateAsync();
      const touchless = results.filter((r) => r.outcome === "AUTO_SENT" || r.outcome === "AUTO_APPROVED").length;
      toast.success(`${results.length} waiting PO invoice${results.length === 1 ? "" : "s"} re-checked · ${touchless} processed automatically.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not re-check invoices."));
    }
  };

  const threshold = Number(form.auto_approve_max_amount || 0);
  const kpis = [
    { key: "rate", label: "Touchless rate", value: stats?.touchless_rate ?? null, format: "percent", tone: "emerald", subtitle: `${stats?.processed ?? 0} PO invoices processed`, icon: Gauge },
    { key: "approved", label: "Auto-approved", value: stats?.auto_approved ?? 0, format: "count", tone: "emerald", subtitle: "Matched, within the limit", icon: BadgeCheck },
    { key: "sent", label: "Sent for approval", value: stats?.auto_sent ?? 0, format: "count", tone: "blue", subtitle: "Matched, approver decides", icon: Send },
    { key: "exceptions", label: "Exceptions", value: (stats?.exceptions ?? 0) + (stats?.reviewed_not_sent ?? 0), format: "count", tone: stats?.exceptions ? "amber" : "gray", subtitle: "Waiting for the AP team", icon: AlertTriangle },
  ];

  return (
    <div className="space-y-5 p-6">
      <PageHeader
        title="AP Automation"
        subtitle="Touchless PO invoices: matched invoices are reviewed and sent for approval automatically; only exceptions wait for the AP team."
        actions={
          <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_LIST)}>
            <ArrowLeft className="h-4 w-4" /> Back to Invoices
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map(({ icon, ...kpi }) => (
          <KpiTile key={kpi.key} kpi={kpi} icon={icon} />
        ))}
      </div>
      <p className="-mt-2 text-xs text-slate-500">Last 30 days · bulk and email PO invoices · each invoice counted by its latest result.</p>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className={clsx("flex h-9 w-9 items-center justify-center rounded-full", settings.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
              <ShieldCheck className="h-4 w-4" aria-hidden />
            </span>
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Touchless PO invoices{" "}
                <span className={clsx("ml-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1", settings.enabled ? "bg-emerald-50 text-emerald-700 ring-emerald-200" : "bg-slate-100 text-slate-600 ring-slate-200")}>
                  {settings.enabled ? "On" : "Off"}
                </span>
              </h2>
              <p className="mt-0.5 max-w-3xl text-sm text-slate-600">
                For each bulk / emailed PO invoice the system links the PO, checks validation, open issues, the 2/3-way match, double billing and the approval policy.
                If every check passes it is reviewed, TDS is determined and it is sent for approval - all recorded as “AP automation”.
              </p>
              {settings.updated_at && (
                <p className="mt-1 text-xs text-slate-500">
                  Last changed {formatDateTime(settings.updated_at)}
                  {settings.updated_by ? ` by ${settings.updated_by}` : ""}
                </p>
              )}
            </div>
          </div>
          {confirming ? (
            <div className="flex items-center gap-2" role="group" aria-label="Confirm change">
              <span className="text-xs text-slate-600">{settings.enabled ? "Stop automatic processing?" : "Start automatic processing?"}</span>
              <Button size="small" variant="primary" onClick={toggle} loading={update.isPending}>
                {settings.enabled ? "Switch off" : "Switch on"}
              </Button>
              <Button size="small" variant="ghost" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Toggle checked={settings.enabled} onChange={() => setConfirming(true)} label="Touchless PO invoices" disabled={update.isPending} />
          )}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Matching tolerances</h2>
          <p className="mt-0.5 text-sm text-slate-600">A unit-price difference is accepted only when it is within both limits (whichever is lower).</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <NumberField id="price-pct" label="Unit price tolerance" suffix="%" value={form.price_tolerance_pct} onChange={set("price_tolerance_pct")} hint="Of the PO unit price (max 10%)" />
            <NumberField id="price-amount" label="Unit price tolerance" suffix="INR" value={form.price_tolerance_amount} onChange={set("price_tolerance_amount")} hint="Per unit" />
            <NumberField id="qty" label="Quantity tolerance" suffix="units" value={form.quantity_tolerance} onChange={set("quantity_tolerance")} step="1" hint="0 = exact quantity" />
            <div>
              <span className="block text-sm font-medium text-slate-700">Goods receipt required</span>
              <div className="mt-2 flex items-center gap-3">
                <Toggle checked={form.require_grn} onChange={set("require_grn")} label="Goods receipt required" />
                <span className="text-sm text-slate-600">{form.require_grn ? "3-way match (PO + GRN + invoice)" : "2-way match allowed (PO + invoice)"}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Auto-approval</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Matched PO invoices at or below this net amount are approved without an approver. Finance still verifies TDS before the invoice can be paid.
          </p>
          <div className="mt-4 max-w-xs">
            <NumberField id="auto-approve" label="Auto-approve up to" suffix="INR" value={form.auto_approve_max_amount} onChange={set("auto_approve_max_amount")} step="1" hint="0 = never auto-approve (always send to the approver)" />
          </div>
          <p className={clsx("mt-3 rounded-lg px-3 py-2 text-xs", threshold > 0 ? "bg-amber-50 text-amber-900" : "bg-slate-50 text-slate-600")}>
            {threshold > 0
              ? `Matched PO invoices up to ${formatMoney(threshold, "INR")} will skip the approval policy. Above it - and every non-INR invoice - goes to the approvers.`
              : "Every matched PO invoice is sent to its approvers."}
          </p>
        </section>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setForm(saved)} disabled={!dirty || update.isPending}>
          Discard changes
        </Button>
        <Button variant="primary" onClick={saveForm} disabled={!dirty} loading={update.isPending} loadingText="Saving...">
          Save settings
        </Button>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Why invoices still need a person</h2>
            <p className="text-sm text-slate-600">Most common exception reasons, last 30 days. Each one is listed on the invoice in Review &amp; Send.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(AP_ROUTES.INVOICE_REVIEW_WORKBENCH)}>
              Open Review &amp; Send
            </Button>
            <Button variant="primary" onClick={recheck} disabled={!settings.enabled} loading={runNow.isPending} loadingText="Re-checking..." title={settings.enabled ? undefined : "Switch automation on first"}>
              <RefreshCw className="h-4 w-4" /> Re-check waiting invoices
            </Button>
          </div>
        </div>
        {stats?.top_exceptions?.length ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {stats.top_exceptions.map((e) => (
              <li key={e.reason} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-800">{e.reason}</span>
                <span className="font-semibold tabular-nums text-slate-900">{e.count}</span>
              </li>
            ))}
          </ul>
        ) : (
          <Empty text="No exceptions in the last 30 days." />
        )}
      </section>
    </div>
  );
}
