import { useState } from "react";
import { Link } from "react-router-dom";
import clsx from "clsx";
import { toast } from "react-toastify";
import { Trash2, Users } from "lucide-react";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import VendorPicker from "../../vendor/components/VendorPicker";
import useDepartments from "../../system-configuration/hooks/useDepartments";
import { AP_ROUTES } from "../../constants/routes";
import { getApiErrorMessage } from "../../utils/apiError";
import { useApTeam, useReassignAll, useRemoveRule, useSetRule, useWorkload } from "../hooks/useWorkAssignment";

const WORKBENCH = AP_ROUTES.INVOICE_REVIEW_WORKBENCH;

function MemberRow({ member, team }) {
  const reassignAll = useReassignAll();
  const [moving, setMoving] = useState(false);
  const [to, setTo] = useState("");
  const others = team.filter((m) => m.user_id !== member.user_id);

  const move = async () => {
    try {
      const result = await reassignAll.mutateAsync({ fromUserId: member.user_id, toUserId: to });
      toast.success(`${result.reassigned.length} invoice(s) moved to ${others.find((m) => m.user_id === to)?.name}.`);
      setMoving(false);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not move the work."));
    }
  };

  return (
    <tr>
      <td className="px-4 py-3">
        <p className="font-medium text-slate-800">{member.name}</p>
        {!member.in_team && <p className="text-xs text-amber-700">No longer an active AP Executive - move their work</p>}
      </td>
      {["to_review", "returned", "reviewed"].map((k) => (
        <td key={k} className={clsx("px-3 py-3 text-right tabular-nums", member[k] ? "text-slate-800" : "text-slate-300")}>{member[k]}</td>
      ))}
      <td className="px-3 py-3 text-right font-semibold tabular-nums text-slate-900">{member.open}</td>
      <td className="px-3 py-3 text-right tabular-nums text-slate-500">{member.in_approval}</td>
      <td className={clsx("px-3 py-3 text-right tabular-nums", member.oldest_days > 3 ? "font-medium text-rose-600" : "text-slate-500")}>
        {member.open ? `${member.oldest_days} d` : "—"}
      </td>
      <td className="px-4 py-3 text-right">
        {moving ? (
          <span className="flex flex-wrap items-center justify-end gap-2">
            <select aria-label={`Move ${member.name}'s work to`} className="h-8 rounded-md border border-slate-300 px-2 text-xs" value={to} onChange={(e) => setTo(e.target.value)}>
              <option value="">Move to…</option>
              {others.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
            </select>
            <Button size="small" variant="primary" disabled={!to} loading={reassignAll.isPending} onClick={move}>Move</Button>
            <Button size="small" variant="ghost" onClick={() => setMoving(false)}>Cancel</Button>
          </span>
        ) : member.open > 0 && others.length > 0 ? (
          <Button size="small" variant="outline" onClick={() => setMoving(true)}>Move all (leave)</Button>
        ) : null}
      </td>
    </tr>
  );
}

function RuleForm({ team }) {
  const setRule = useSetRule();
  const { data: departments = [] } = useDepartments();
  const [scope, setScope] = useState("VENDOR");
  const [vendor, setVendor] = useState({ id: null, label: "" });
  const [departmentId, setDepartmentId] = useState("");
  const [assignee, setAssignee] = useState("");
  const target = scope === "VENDOR" ? vendor.id : departmentId;

  const save = async () => {
    try {
      await setRule.mutateAsync({ scope, targetId: target, assigneeUserId: assignee });
      toast.success("Rule saved - new invoices will go to the chosen person.");
      setVendor({ id: null, label: "" });
      setDepartmentId("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not save the rule."));
    }
  };

  return (
    <div className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[auto_1fr_auto_auto] sm:items-end">
      <label className="text-xs font-medium text-slate-600">
        Route by
        <select aria-label="Route by" className="mt-1 block h-9 rounded-md border border-slate-300 bg-white px-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value)}>
          <option value="VENDOR">Vendor</option>
          <option value="DEPARTMENT">Department</option>
        </select>
      </label>
      <div className="text-xs font-medium text-slate-600">
        {scope === "VENDOR" ? (
          <>
            Vendor
            <div className="mt-1"><VendorPicker vendorId={vendor.id} vendorLabel={vendor.label} onSelect={(id, label) => setVendor({ id, label })} /></div>
          </>
        ) : (
          <label>
            Department
            <select aria-label="Department" className="mt-1 block h-9 w-full rounded-md border border-slate-300 bg-white px-2 text-sm" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}>
              <option value="">Choose…</option>
              {departments.filter((d) => d.is_active).map((d) => <option key={d.id} value={d.id}>{d.code} — {d.name}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="text-xs font-medium text-slate-600">
        Goes to
        <select aria-label="Goes to" className="mt-1 block h-9 rounded-md border border-slate-300 bg-white px-2 text-sm" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
          <option value="">Choose…</option>
          {team.map((m) => <option key={m.user_id} value={m.user_id}>{m.name}</option>)}
        </select>
      </label>
      <Button variant="primary" size="small" disabled={!target || !assignee} loading={setRule.isPending} onClick={save}>Save rule</Button>
    </div>
  );
}

/**
 * AP team & assignment (AP lead / Finance Manager): who holds how much AP work, the unclaimed
 * pool, routing rules (vendor or department -> AP Executive) and moving work when someone is away.
 */
export default function WorkAssignmentPage() {
  const { data, isLoading, isError, error } = useWorkload();
  const { data: team = [] } = useApTeam();
  const removeRule = useRemoveRule();

  const remove = async (rule) => {
    try {
      await removeRule.mutateAsync(rule.rule_id);
      toast.success("Rule removed - new invoices from it will wait to be claimed.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not remove the rule."));
    }
  };

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <Breadcrumb items={[{ label: "Accounts Payable", to: AP_ROUTES.DASHBOARD }, { label: "AP team & assignment" }]} />
      <PageHeader title="AP Team" subtitle="Who is working which invoice, routing rules, and cover when someone is away" />
      {isLoading ? (
        <div className="flex justify-center rounded-xl border border-slate-200 bg-white py-20"><LoadingSpinner text="Loading the team..." /></div>
      ) : isError ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">{getApiErrorMessage(error, "Could not load the team workload.")}</p>
      ) : (
        <>
          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
              <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800"><Users className="h-4 w-4" aria-hidden /> Workload</h2>
              {data.unassigned.total > 0 ? (
                <Link to={`${WORKBENCH}?assigned=unassigned`} className="text-xs font-medium text-amber-700 hover:underline">
                  {data.unassigned.total} unassigned invoice(s) waiting to be claimed →
                </Link>
              ) : (
                <span className="text-xs text-emerald-700">Every open invoice has an owner</span>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs font-medium text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">AP Executive</th>
                    <th className="px-3 py-2 text-right">To review</th>
                    <th className="px-3 py-2 text-right">Returned</th>
                    <th className="px-3 py-2 text-right">Reviewed, not sent</th>
                    <th className="px-3 py-2 text-right">Open</th>
                    <th className="px-3 py-2 text-right">In approval</th>
                    <th className="px-3 py-2 text-right">Oldest</th>
                    <th className="px-4 py-2" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.members.map((m) => <MemberRow key={m.user_id} member={m} team={team} />)}
                  {data.members.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-xs text-slate-500">No AP Executives found (UMS role AP_EXECUTIVE).</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Routing rules</h2>
              <p className="text-xs text-slate-500">New invoices go straight to the vendor's owner (a vendor rule wins over a department rule). Without a rule they wait in the unassigned pool.</p>
            </div>
            <RuleForm team={team} />
            {data.rules.length === 0 ? (
              <p className="text-xs text-slate-500">No rules yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                {data.rules.map((r) => (
                  <li key={r.rule_id} className="flex items-center justify-between gap-3 px-4 py-2 text-sm">
                    <span>
                      <span className="text-xs uppercase tracking-wide text-slate-400">{r.scope === "VENDOR" ? "Vendor" : "Department"}</span>{" "}
                      <span className="font-medium text-slate-800">{r.vendor_name || r.department_name}</span>
                      <span className="text-slate-500"> → {r.assignee_name}</span>
                    </span>
                    <Button size="small" variant="ghost" onClick={() => remove(r)} loading={removeRule.isPending} aria-label={`Remove rule for ${r.vendor_name || r.department_name}`}>
                      <Trash2 size={14} />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
