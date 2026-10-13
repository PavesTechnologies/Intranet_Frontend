import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Button from "../../../../components/Button/Button";
import { getJDUnknownSkillSuggestions, resolveJDUnknownSkill } from "../../service/jdservice";
import { getSkills } from "../../skill-ontology/services/skillOntologyService";

// Unknown skills on this JD (not in the catalogue). HR_ADMIN resolves each one:
//   Map      - to a catalogue skill, for this JD only (top-3 suggestions, or search)
//   Approve  - as a new catalogue skill: global, every JD with this text is resolved
//   Drop     - from this JD only
// Until resolved a skill is scored provisionally (text match at 0.8, never a gate);
// an unresolved CORE skill blocks calibration.
const RESOLUTION_LABEL = { MAPPED: "mapped", NEW_SKILL: "approved as new", DROPPED: "dropped" };
const inputClass = "border border-slate-200 rounded-lg px-2 py-1 text-xs bg-white";

function SkillSearch({ onPick, disabled }) {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState([]);

  useEffect(() => {
    if (query.trim().length < 2) { setItems([]); return undefined; }
    const timer = setTimeout(async () => {
      try {
        const result = await getSkills({ search: query.trim(), page: 1, page_size: 8, is_active: true });
        setItems(result?.data?.items || []);
      } catch {
        setItems([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  return (
    <div className="relative">
      <input className={`${inputClass} w-48`} placeholder="Search the catalogue…" value={query} disabled={disabled}
        onChange={(e) => setQuery(e.target.value)} />
      {items.length > 0 && (
        <ul className="absolute z-10 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-sm max-h-48 overflow-auto">
          {items.map((s) => (
            <li key={s.id}>
              <button type="button" className="w-full text-left px-2 py-1 text-xs hover:bg-slate-50"
                onClick={() => { setQuery(""); setItems([]); onPick(s); }}>
                {s.canonicalName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function JdUnknownSkillResolver({ jdId, unknownSkills, readOnly, onResolved }) {
  const [suggestions, setSuggestions] = useState({});
  const [busy, setBusy] = useState(null);
  const [newName, setNewName] = useState({});
  const [message, setMessage] = useState(null);
  const pending = unknownSkills.filter((u) => u.status === "PENDING");

  useEffect(() => {
    if (readOnly || pending.length === 0) return;
    let cancelled = false;
    getJDUnknownSkillSuggestions(jdId).then((rows) => {
      if (!cancelled) setSuggestions(Object.fromEntries((rows || []).map((r) => [r.unknown_skill_id, r.suggestions])));
    });
    return () => { cancelled = true; };
    // Re-fetch only when the set of pending skills changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jdId, readOnly, pending.map((u) => u.unknown_skill_id).join(",")]);

  const resolve = async (unknown, payload, label) => {
    setBusy(unknown.unknown_skill_id);
    setMessage(null);
    try {
      const result = await resolveJDUnknownSkill(jdId, unknown.unknown_skill_id, payload);
      const others = (result.affected_jd_ids || []).length - 1;
      setMessage(`'${unknown.raw_text}' ${label}.`
        + (others > 0 ? ` ${others} other JD(s) with this skill were resolved too.` : "")
        + (result.candidates_marked_out_of_date ? ` ${result.candidates_marked_out_of_date} scored candidate(s) marked "score out of date".` : ""));
      onResolved?.(result.calibration);
    } catch {
      // the service already shows the server's reason
    } finally {
      setBusy(null);
    }
  };

  if (unknownSkills.length === 0) return null;

  return (
    <div className="mt-4">
      <h4 className="text-[11px] font-bold text-slate-600 mb-1">Not in the catalogue (unknown skills)</h4>
      <p className="text-[10px] text-slate-400 mb-2">
        Until resolved, each is scored provisionally: found in the resume = 0.8 of its tier weight, not found = 0. Never a gate.
        {!readOnly && " Map and Drop apply to this JD only; Approve as new adds the skill to the catalogue for every JD."}
      </p>
      <ul className="space-y-2">
        {unknownSkills.map((u) => {
          const isPending = u.status === "PENDING";
          const disabled = busy !== null;
          return (
            <li key={u.unknown_skill_id} className="border border-slate-100 rounded-lg p-2 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-semibold text-slate-800">{u.raw_text}</span>
                <span className="text-slate-400">· {u.tier ? u.tier.toLowerCase() : "unclassified"}</span>
                {isPending ? (
                  <span className="text-slate-400">· unresolved</span>
                ) : (
                  <span className="text-slate-500">
                    · {RESOLUTION_LABEL[u.resolution] || "resolved"}
                    {u.resolved_canonical_name ? ` to ${u.resolved_canonical_name}` : ""}
                    {u.resolved_by_name ? ` by ${u.resolved_by_name}` : ""}
                    {u.resolved_at ? ` on ${u.resolved_at.split("T")[0]}` : ""}
                  </span>
                )}
                {u.blocks_calibration && (
                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> Core - resolve before calibrating
                  </span>
                )}
              </div>
              {isPending && !readOnly && (
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {(suggestions[u.unknown_skill_id] || []).map((s) => (
                    <Button key={s.canonical_skill_id} variant="outline" size="small" disabled={disabled}
                      title={`Map to ${s.canonical_name} (similarity ${s.similarity.toFixed(2)}) - this JD only`}
                      onClick={() => resolve(u, { action: "MAP", canonical_skill_id: s.canonical_skill_id }, `mapped to ${s.canonical_name}`)}>
                      Map → {s.canonical_name} <span className="text-slate-400">{s.similarity.toFixed(2)}</span>
                    </Button>
                  ))}
                  <SkillSearch disabled={disabled}
                    onPick={(s) => resolve(u, { action: "MAP", canonical_skill_id: s.id }, `mapped to ${s.canonicalName}`)} />
                  <input className={`${inputClass} w-40`} placeholder={u.raw_text} disabled={disabled}
                    title="Name for the new catalogue skill (blank = as written)"
                    value={newName[u.unknown_skill_id] || ""}
                    onChange={(e) => setNewName((n) => ({ ...n, [u.unknown_skill_id]: e.target.value }))} />
                  <Button variant="outline" size="small" disabled={disabled}
                    title="Add to the catalogue - resolves every JD with this skill"
                    onClick={() => resolve(u, { action: "NEW", canonical_name: (newName[u.unknown_skill_id] || "").trim() || null }, "approved as a new skill")}>
                    Approve as new
                  </Button>
                  <Button variant="danger" size="small" disabled={disabled} title="Remove from this JD only"
                    onClick={() => resolve(u, { action: "DROP" }, "dropped from this JD")}>
                    Drop
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      {message && <p className="mt-2 text-[11px] text-emerald-700">{message}</p>}
    </div>
  );
}
