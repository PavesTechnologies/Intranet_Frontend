import React from "react";
import { Plus, Minus, Equal, FileText } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";

// Defensive read of a diff section (added/removed/unchanged) — tolerates a
// couple of plausible alternate key spellings since the exact
// GET /resumes/compare response shape hasn't been verified against a live
// backend in this environment.
function readSection(raw, key) {
  const section = raw?.[key] || {};
  return {
    added: section.added ?? section.new ?? [],
    removed: section.removed ?? section.missing ?? [],
    unchanged: section.unchanged ?? section.common ?? [],
  };
}

function readExperienceYears(raw) {
  const ey = raw?.experience_years ?? raw?.experience_years_diff ?? {};
  const previous = ey.previous ?? ey.previous_value ?? ey.old ?? null;
  const next = ey.new ?? ey.new_value ?? ey.current ?? null;
  const difference =
    ey.difference ?? ey.diff ?? (previous != null && next != null ? Number((next - previous).toFixed(1)) : null);
  return { previous, next, difference };
}

function mapCompareResponse(raw) {
  return {
    skills: readSection(raw, "skills"),
    experience: readSection(raw, "experience"),
    education: readSection(raw, "education"),
    experienceYears: readExperienceYears(raw),
  };
}

function DiffColumn({ icon: Icon, label, tone, items }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-2.5 min-w-0">
      <div className={`flex items-center gap-1 text-[10.5px] font-bold uppercase mb-1.5 ${tone}`}>
        <Icon className="h-3 w-3" /> {label} ({items.length})
      </div>
      {items.length === 0 ? (
        <p className="text-[11px] text-slate-400">None</p>
      ) : (
        <div className="flex flex-wrap gap-1">
          {items.map((item, i) => (
            <Badge key={`${item}-${i}`} className="bg-white text-slate-700 border-slate-200 font-medium px-2 py-0.5 text-[10.5px]">
              {item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

function DiffSection({ title, section }) {
  return (
    <div>
      <h4 className="text-[12.5px] font-bold text-slate-900 mb-2">{title}</h4>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <DiffColumn icon={Plus} label="Added" tone="text-emerald-700" items={section.added} />
        <DiffColumn icon={Minus} label="Removed" tone="text-rose-700" items={section.removed} />
        <DiffColumn icon={Equal} label="Unchanged" tone="text-slate-500" items={section.unchanged} />
      </div>
    </div>
  );
}

function VersionChip({ version }) {
  if (!version) return null;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11.5px] font-semibold text-slate-700">
      <FileText className="h-3 w-3 text-slate-400" />
      V{version.version_number} · {version.file_format}
    </span>
  );
}

// Resume Version Comparison modal — fetched only after the user clicks
// "Compare Versions" in ResumeVersionsTab (never on selection alone). Shows
// the returned skills/experience/education diffs plus the experience-years
// delta in a side-by-side Added/Removed/Unchanged layout per section.
export default function ResumeCompareModal({ isOpen, onClose, loading, error, data, versionA, versionB, onRetry }) {
  const comparison = data ? mapCompareResponse(data) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Compare Resume Versions" width="720px" height="80vh">
      <div className="flex items-center justify-center gap-3 mb-4">
        <VersionChip version={versionA} />
        <span className="text-[11px] text-slate-400 font-bold">VS</span>
        <VersionChip version={versionB} />
      </div>

      {loading && (
        <div className="py-12 flex justify-center">
          <LoadingSpinner text="Comparing resume versions..." />
        </div>
      )}

      {!loading && error && (
        <>
          <ErrorState
            title="Couldn't compare these versions"
            message="Something went wrong while comparing the selected resume versions. Please try again."
            onRetry={onRetry}
          />
          {onRetry && (
            <div className="flex justify-center -mt-8">
              <Button variant="outline" size="small" onClick={onRetry}>
                Retry Comparison
              </Button>
            </div>
          )}
        </>
      )}

      {!loading && !error && comparison && (
        <div className="space-y-5">
          <div className="rounded-lg border border-slate-200 bg-white p-3">
            <h4 className="text-[12.5px] font-bold text-slate-900 mb-2">Experience Years</h4>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Previous</div>
                <div className="text-[15px] font-extrabold text-slate-900">{comparison.experienceYears.previous ?? "—"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase">New</div>
                <div className="text-[15px] font-extrabold text-slate-900">{comparison.experienceYears.next ?? "—"}</div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Difference</div>
                <div
                  className={`text-[15px] font-extrabold ${
                    (comparison.experienceYears.difference ?? 0) > 0
                      ? "text-emerald-600"
                      : (comparison.experienceYears.difference ?? 0) < 0
                      ? "text-rose-600"
                      : "text-slate-900"
                  }`}
                >
                  {comparison.experienceYears.difference != null
                    ? `${comparison.experienceYears.difference > 0 ? "+" : ""}${comparison.experienceYears.difference}`
                    : "—"}
                </div>
              </div>
            </div>
          </div>

          <DiffSection title="Skills" section={comparison.skills} />
          <DiffSection title="Experience" section={comparison.experience} />
          <DiffSection title="Education" section={comparison.education} />
        </div>
      )}
    </Modal>
  );
}
