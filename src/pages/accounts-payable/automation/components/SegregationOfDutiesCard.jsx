// "Segregation of duties" card on the AP Automation page: who may approve, release and pay an
// invoice (GET/PUT /ap-automation/segregation-of-duties). Finance Manager only (AP_AUTOMATION_MANAGE).
import { useState } from "react";
import clsx from "clsx";
import { toast } from "react-toastify";
import { ShieldCheck } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { getApiErrorMessage } from "../../utils/apiError";
import { useSegregationOfDuties, useSetSegregationOfDuties } from "../hooks/useApAutomation";

export default function SegregationOfDutiesCard() {
  const { data, isLoading, isError } = useSegregationOfDuties();
  const update = useSetSegregationOfDuties();
  const [confirming, setConfirming] = useState(null); // rule key awaiting confirmation
  if (isLoading || isError || !data) return null;

  const apply = async (rule) => {
    setConfirming(null);
    try {
      await update.mutateAsync({ [rule.key]: !rule.enabled });
      toast.success(`${rule.label} switched ${rule.enabled ? "off" : "on"}.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not change the rule."));
    }
  };

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="sod-title">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
          <ShieldCheck className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <h2 id="sod-title" className="text-base font-semibold text-slate-900">Segregation of duties</h2>
          <p className="mt-0.5 max-w-3xl text-sm text-slate-600">
            No one person should carry an invoice from entry to payment. These rules are checked on every approval,
            release and payment, using the invoice&apos;s audit trail; the system&apos;s automation never counts as a person.
          </p>
        </div>
      </div>
      <ul className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-200">
        {data.map((rule) => (
          <li key={rule.key} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800">
                {rule.label}
                {rule.enabled !== rule.default && (
                  <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-200">
                    Changed from default
                  </span>
                )}
              </p>
              <p className="text-xs text-slate-500">{rule.description}</p>
            </div>
            {confirming === rule.key ? (
              <div className="flex items-center gap-2" role="group" aria-label={`Confirm ${rule.label}`}>
                <span className="text-xs text-slate-600">{rule.enabled ? "Switch this control off?" : "Switch this control on?"}</span>
                <Button size="small" variant="primary" onClick={() => apply(rule)} loading={update.isPending}>
                  {rule.enabled ? "Switch off" : "Switch on"}
                </Button>
                <Button size="small" variant="ghost" onClick={() => setConfirming(null)}>Cancel</Button>
              </div>
            ) : (
              <button
                type="button"
                role="switch"
                aria-checked={rule.enabled}
                aria-label={rule.label}
                onClick={() => setConfirming(rule.key)}
                className={clsx("relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition", rule.enabled ? "bg-emerald-500" : "bg-slate-300")}
              >
                <span className={clsx("inline-block h-5 w-5 transform rounded-full bg-white shadow transition", rule.enabled ? "translate-x-5" : "translate-x-0.5")} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
