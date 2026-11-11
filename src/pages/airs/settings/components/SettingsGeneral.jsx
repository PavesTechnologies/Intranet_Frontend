import React, { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { AlertTriangle, SlidersHorizontal } from "lucide-react";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { fieldProblems, getPlatformSettings, previewPlatformSettings, savePlatformSettings } from "../services/settingsService";
import { apiErrorMessage } from "../services/aiProviderService";

const inputClass = "w-28 border border-slate-200 rounded-lg px-2 py-1 text-xs text-right bg-white";

const show = (value, unit) => `${value}${unit ? ` ${unit}` : ""}`;

// Settings phase 1: the simple platform settings. Edits stay local until "Review changes": the server checks
// them and returns the before/after, shown in a confirm step; only then are they saved (and audited).
export default function SettingsGeneral() {
  const [groups, setGroups] = useState(null);
  const [draft, setDraft] = useState({});
  const [problems, setProblems] = useState({});
  const [review, setReview] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      setGroups(await getPlatformSettings());
    } catch (error) {
      toast.error(apiErrorMessage(error, "Couldn't load the settings."));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const byKey = useMemo(() => {
    const map = {};
    (groups || []).forEach((g) => g.settings.forEach((s) => { map[s.key] = s; }));
    return map;
  }, [groups]);

  const changed = Object.entries(draft)
    .filter(([key, text]) => byKey[key] && text !== "" && Number(text) !== Number(byKey[key].value))
    .reduce((acc, [key, text]) => ({ ...acc, [key]: Number(text) }), {});
  const hasChanges = Object.keys(changed).length > 0;
  const hasBlank = Object.values(draft).some((text) => text === "");

  const edit = (key, text) => {
    setDraft((d) => ({ ...d, [key]: text }));
    setProblems((p) => ({ ...p, [key]: undefined }));
  };

  const startReview = async () => {
    setBusy(true);
    try {
      const result = await previewPlatformSettings(changed);
      if (!result.changes?.length) {
        toast.info("Nothing to save: the values are the same as now.");
        setDraft({});
        return;
      }
      setReview(result);
    } catch (error) {
      const perKey = fieldProblems(error);
      if (perKey) setProblems(perKey);
      else toast.error(apiErrorMessage(error, "Couldn't check the changes."));
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    setBusy(true);
    try {
      const result = await savePlatformSettings(changed);
      setGroups(result.settings);
      setDraft({});
      setReview(null);
      toast.success(`${result.changed.length} setting${result.changed.length === 1 ? "" : "s"} saved.`);
    } catch (error) {
      const perKey = fieldProblems(error);
      if (perKey) setProblems(perKey);
      toast.error(apiErrorMessage(error, "Couldn't save the settings."));
      setReview(null);
    } finally {
      setBusy(false);
    }
  };

  if (!groups) return <LoadingSpinner text="Loading settings..." />;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-slate-500" /> General settings
          </h2>
          <p className="text-[11px] text-slate-500 mt-1 max-w-2xl">
            Limits, alert thresholds and SLAs. A saved value applies from the next upload, check or report.
            Scoring rules are changed through scoring versions, and AI model settings on the AI providers tab.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasChanges && (
            <Button variant="outline" size="small" disabled={busy} onClick={() => { setDraft({}); setProblems({}); }}>
              Discard
            </Button>
          )}
          <Button variant="primary" size="small" disabled={!hasChanges || hasBlank || busy} onClick={startReview}>
            Review changes{hasChanges ? ` (${Object.keys(changed).length})` : ""}
          </Button>
        </div>
      </div>

      {groups.map((group) => (
        <div key={group.group} className="mt-5">
          <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1">{group.group}</h3>
          <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg">
            {group.settings.map((s) => {
              const text = draft[s.key] ?? String(s.value);
              const dirty = s.key in changed;
              return (
                <div key={s.key} className={`flex flex-wrap items-center gap-3 px-3 py-2 ${dirty ? "bg-blue-50/50" : ""}`}>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-slate-800">
                      {s.label}
                      {s.is_default && !dirty && (
                        <span className="ml-2 text-[10px] font-normal text-slate-400">default</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{s.help}</div>
                    {problems[s.key] && <div className="text-[11px] text-rose-600 mt-0.5">{problems[s.key]}</div>}
                  </div>
                  <div className="flex items-center gap-1.5 whitespace-nowrap">
                    <input
                      type="number"
                      className={`${inputClass} ${problems[s.key] ? "border-rose-400" : ""}`}
                      value={text}
                      min={s.minimum}
                      max={s.maximum}
                      step={s.kind === "int" ? 1 : "any"}
                      disabled={busy}
                      aria-label={s.label}
                      onChange={(e) => edit(s.key, e.target.value)}
                    />
                    <span className="text-[11px] text-slate-500 w-20">{s.unit}</span>
                  </div>
                  <div className="w-full text-[10px] text-slate-400 -mt-1">
                    Allowed {s.minimum} to {s.maximum}{s.unit ? ` ${s.unit}` : ""}; default {s.default}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      <ConfirmationModal
        isOpen={!!review}
        title="Save these changes?"
        message="They apply from the next use and are recorded in the audit log."
        confirmText="Save"
        variant="primary"
        isLoading={busy}
        onCancel={() => setReview(null)}
        onConfirm={save}
      >
        {review && (
          <div className="space-y-2">
            <ul className="text-xs divide-y divide-slate-100 border border-slate-100 rounded-lg">
              {review.changes.map((c) => (
                <li key={c.key} className="px-2 py-1.5">
                  <div className="font-semibold text-slate-700">{c.label}</div>
                  <div className="text-slate-500">
                    {show(c.before, c.unit)} <span className="text-slate-400">→</span>{" "}
                    <span className="font-semibold text-slate-800">{show(c.after, c.unit)}</span>
                  </div>
                </li>
              ))}
            </ul>
            {review.warnings?.map((w) => (
              <p key={w.key} className="text-[11px] text-amber-700 flex items-start gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" /> {w.message}
              </p>
            ))}
          </div>
        )}
      </ConfirmationModal>
    </div>
  );
}
