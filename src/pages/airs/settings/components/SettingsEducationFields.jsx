import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { GraduationCap, Plus, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  addEducationFieldRelation, getEducationFieldRelations, removeEducationFieldRelation,
} from "../services/educationFieldService";
import { apiErrorMessage } from "../services/aiProviderService";

const FIELD_LABELS = {
  COMPUTER_SCIENCE: "Computer Science",
  INFORMATION_TECHNOLOGY: "Information Technology",
  SOFTWARE_ENGINEERING: "Software Engineering",
  DATA_SCIENCE: "Data Science",
  COMPUTER_APPLICATIONS: "Computer Applications (BCA / MCA)",
  ELECTRONICS_ENGINEERING: "Electronics (incl. ECE)",
  ELECTRICAL_ENGINEERING: "Electrical Engineering",
  MECHANICAL_ENGINEERING: "Mechanical Engineering",
  CIVIL_ENGINEERING: "Civil Engineering",
  MATHEMATICS: "Mathematics",
  STATISTICS: "Statistics",
  BUSINESS_ADMINISTRATION: "Business Administration",
  COMMERCE: "Commerce",
  ECONOMICS: "Economics",
};
const DOMAIN_LABELS = {
  SOFTWARE: "Software", IT_OPERATIONS: "IT operations", DATA: "Data", BUSINESS: "Business", OTHER: "Other",
};
const label = (map, key) => map[key] || key;
const selectClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";
const EMPTY_PAIR = { field_1: "", field_2: "", role_domain: "SOFTWARE", note: "" };

// Phase 3 Step 2: two fields of study that count as one family on JDs of a
// role domain, when the JD's education is mandatory (set in JD calibration).
export default function SettingsEducationFields() {
  const { hasRole } = useAuth();
  const isHrAdmin = hasRole(["HR_ADMIN"]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pair, setPair] = useState(EMPTY_PAIR);
  const [busy, setBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      setData(await getEducationFieldRelations());
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the related education fields."));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isHrAdmin) load();
  }, [isHrAdmin]);

  if (!isHrAdmin) return null;

  const add = async () => {
    setBusy(true);
    try {
      await addEducationFieldRelation({ ...pair, note: pair.note.trim() || null });
      toast.success("Related fields added.");
      setPair((p) => ({ ...EMPTY_PAIR, role_domain: p.role_domain }));
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't add the related fields."));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (relation) => {
    setBusy(true);
    try {
      await removeEducationFieldRelation(relation.id);
      toast.success("Related fields removed.");
      await load();
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't remove the related fields."));
    } finally {
      setBusy(false);
      setConfirmRemove(null);
    }
  };

  const relations = data?.relations || [];
  const domains = data?.role_domains || Object.keys(DOMAIN_LABELS);
  const fields = data?.fields || Object.keys(FIELD_LABELS);
  const canAdd = pair.field_1 && pair.field_2 && pair.field_1 !== pair.field_2 && !busy;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 mt-5">
      <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-slate-500" /> Related education fields
      </h2>
      <p className="text-[11px] text-slate-500 mt-1 max-w-3xl">
        Two fields of study in one family pass each other's requirement on JDs of that role domain, when the JD's
        education is mandatory. A JD's role domain is set in its Calibration tab.
      </p>

      {loading ? <LoadingSpinner text="Loading..." /> : (
        <>
          {domains.filter((d) => relations.some((r) => r.role_domain === d)).map((domain) => (
            <div key={domain} className="mt-3">
              <h3 className="text-[11px] font-bold text-slate-600 mb-1">{label(DOMAIN_LABELS, domain)} JDs</h3>
              <ul className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
                {relations.filter((r) => r.role_domain === domain).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 px-3 py-1.5 text-xs">
                    <span className="font-semibold text-slate-800">{label(FIELD_LABELS, r.field_a)}</span>
                    <span className="text-slate-400">↔</span>
                    <span className="font-semibold text-slate-800">{label(FIELD_LABELS, r.field_b)}</span>
                    {r.note && <span className="text-[10px] text-slate-400 truncate">{r.note}</span>}
                    <span className="ml-auto whitespace-nowrap">
                      {confirmRemove === r.id ? (
                        <span className="inline-flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500">Remove?</span>
                          <Button variant="danger" size="small" disabled={busy} onClick={() => remove(r)}>Remove</Button>
                          <Button variant="outline" size="small" disabled={busy} onClick={() => setConfirmRemove(null)}>Keep</Button>
                        </span>
                      ) : (
                        <Button variant="outline" size="small" disabled={busy} title="Remove this pair"
                          onClick={() => setConfirmRemove(r.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {relations.length === 0 && <p className="text-xs text-slate-400 mt-3">No related fields yet.</p>}

          <div className="mt-4 border-t border-slate-100 pt-3 flex flex-wrap items-center gap-2">
            <select className={selectClass} value={pair.field_1} disabled={busy}
              onChange={(e) => setPair((p) => ({ ...p, field_1: e.target.value }))}>
              <option value="">Field…</option>
              {fields.map((f) => <option key={f} value={f}>{label(FIELD_LABELS, f)}</option>)}
            </select>
            <span className="text-slate-400 text-xs">↔</span>
            <select className={selectClass} value={pair.field_2} disabled={busy}
              onChange={(e) => setPair((p) => ({ ...p, field_2: e.target.value }))}>
              <option value="">Field…</option>
              {fields.filter((f) => f !== pair.field_1).map((f) => <option key={f} value={f}>{label(FIELD_LABELS, f)}</option>)}
            </select>
            <span className="text-slate-400 text-xs">for</span>
            <select className={selectClass} value={pair.role_domain} disabled={busy}
              onChange={(e) => setPair((p) => ({ ...p, role_domain: e.target.value }))}>
              {domains.map((d) => <option key={d} value={d}>{label(DOMAIN_LABELS, d)} JDs</option>)}
            </select>
            <input className="border border-slate-200 rounded-lg px-2 py-1 text-xs w-56" placeholder="Note (optional)"
              maxLength={500} value={pair.note} disabled={busy}
              onChange={(e) => setPair((p) => ({ ...p, note: e.target.value }))} />
            <Button variant="outline" size="small" disabled={!canAdd} onClick={add}>
              <Plus className="h-3.5 w-3.5" /> Add
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
