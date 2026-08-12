import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, Download } from "lucide-react";

import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { formatCurrency } from "../../utils/format";

function downloadValidationReport(billingContext, validation) {
  const lines = [
    `Validation Report — ${billingContext.projectName} (${billingContext.projectCode})`,
    `Client: ${billingContext.client}`,
    "",
    "Checklist:",
    ...validation.checklist.map(
      (item) => `- [${item.passed ? "PASS" : "FAIL"}]${item.critical ? " (critical)" : ""} ${item.label}${item.detail ? ` — ${item.detail}` : ""}`
    ),
    "",
    "Reconciliation:",
    `- Acquired Total: ${formatCurrency(validation.reconciliation.acquiredTotal, billingContext.currency)}`,
    `- Previously Invoiced: ${formatCurrency(validation.reconciliation.previouslyInvoiced, billingContext.currency)}`,
    `- Current Draft Total: ${formatCurrency(validation.reconciliation.currentDraftTotal, billingContext.currency)}`,
    `- Variance: ${formatCurrency(validation.reconciliation.variance, billingContext.currency)}`,
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `validation-report-${billingContext.projectCode}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function ReconciliationTile({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${tone || "text-slate-900"}`}>{value}</p>
    </div>
  );
}

export default function ValidateReconcileStep({ billingContext, validation, validating, onRevalidate }) {
  const { checklist, reconciliation } = validation;
  const hasVariance = reconciliation.variance !== 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Validate &amp; Reconcile</h2>
        <p className="mt-1 text-sm text-slate-500">Confirm the acquired charges are ready to become an invoice draft.</p>
      </div>

      <PageCard>
        <PageCardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Validation Checklist</h3>
            <Button variant="outline" size="small" onClick={onRevalidate} loading={validating} loadingText="Validating...">
              <RefreshCw className="h-3.5 w-3.5" /> Re-run Validation
            </Button>
          </div>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200">
            {checklist.map((item) => (
              <div key={item.key} className="flex items-start justify-between gap-4 px-4 py-3 text-sm">
                <div className="flex items-start gap-2">
                  {item.passed ? (
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div>
                    <span className="font-medium text-slate-900">{item.label}</span>
                    {item.critical && (
                      <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
                        Critical
                      </span>
                    )}
                    {item.detail && <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardContent className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900">Reconciliation</h3>
            <Button variant="outline" size="small" onClick={() => downloadValidationReport(billingContext, validation)}>
              <Download className="h-3.5 w-3.5" /> Export Validation Report
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ReconciliationTile label="Acquired Total" value={formatCurrency(reconciliation.acquiredTotal, billingContext.currency)} />
            <ReconciliationTile
              label="Previously Invoiced"
              value={formatCurrency(reconciliation.previouslyInvoiced, billingContext.currency)}
            />
            <ReconciliationTile
              label="Current Draft Total"
              value={formatCurrency(reconciliation.currentDraftTotal, billingContext.currency)}
            />
            <ReconciliationTile
              label="Variance"
              value={formatCurrency(reconciliation.variance, billingContext.currency)}
              tone={hasVariance ? "text-amber-600" : "text-emerald-600"}
            />
          </div>

          {hasVariance && (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                The current draft total does not match the acquired total. Review the acquired charges before
                generating the invoice draft.
              </span>
            </div>
          )}
        </PageCardContent>
      </PageCard>
    </div>
  );
}
