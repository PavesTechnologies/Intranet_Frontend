import React, { useState } from "react";
import { HelpCircle, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "react-toastify";
import GenericTable from "../../../../../components/Table/table";
import Button from "../../../../../components/Button/Button";
import LoadingSpinner from "../../../../../components/LoadingSpinner";
import Tooltip from "../../../../../components/status/Tooltip";
import {
  renderMatchTypeBadge,
  formatWeightApplied,
  formatNormalisationDiscount,
  renderDeterministicStatusBadge,
  renderMatchTierBadge,
} from "../../utils/scoreBreakdownUtils.jsx";

const WEIGHT_LEGEND = [
  { label: "Exact Match", weight: "100%" },
  { label: "Child Match", weight: "70%" },
  { label: "Grandchild Match", weight: "50%" },
  { label: "Sibling Match", weight: "40%" },
  { label: "Semantic Match", weight: "20%" },
  { label: "Missing", weight: "0%" },
];

const CONFIDENCE_LEGEND = [
  { value: "1.0", label: "Alias / High confidence" },
  { value: "0.8", label: "Partial fuzzy / Vector normalized" },
];

const SKILL_TABLE_HEADERS = [
  "JD Skill",
  "Match Type",
  "Matched Candidate Skill",
  "JD Weight",
  "Normalisation Discount",
  "Hierarchy Multiplier",
  "Skill Contribution",
];
const SKILL_TABLE_COLUMNS = [
  "jdSkillName",
  "matchType",
  "matchedCandidateSkill",
  "jdWeight",
  "normalisationDiscount",
  "hierarchyMultiplier",
  "skillContribution",
];

// Shared between the Mandatory and Preferred sections (S05-T01/T02) — same
// column set, same row shape, so neither reimplements the other.
function SkillTable({ items }) {
  const rows = items.map((r, i) => ({
    id: i,
    jdSkillName: <span className="font-semibold text-slate-900">{r.jdSkillName}</span>,
    matchType: renderMatchTypeBadge(r.matchType),
    matchedCandidateSkill: r.matchedCandidateSkill || <span className="text-slate-400">—</span>,
    jdWeight: r.jdWeight,
    normalisationDiscount: formatNormalisationDiscount(r.candidateScoringWeight),
    hierarchyMultiplier: formatWeightApplied(r.hierarchyMultiplier),
    skillContribution: <span className="font-semibold text-slate-900">{r.skillContribution.toFixed(2)}</span>,
  }));

  return (
    <>
      <div className="hidden sm:block overflow-x-auto rounded-xl">
        <GenericTable headers={SKILL_TABLE_HEADERS} columns={SKILL_TABLE_COLUMNS} rows={rows} />
      </div>

      <div className="sm:hidden space-y-2">
        {items.map((r, i) => (
          <div key={i} className="rounded-xl border border-slate-200 bg-white p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-[12.5px] text-slate-900 truncate">{r.jdSkillName}</span>
              {renderMatchTypeBadge(r.matchType)}
            </div>
            <div className="text-[11.5px] text-slate-500">Matched: {r.matchedCandidateSkill || "—"}</div>
            <div className="grid grid-cols-2 gap-1.5 text-[11.5px] text-slate-500">
              <span>
                JD Weight: <span className="font-semibold text-slate-900">{r.jdWeight}</span>
              </span>
              <span>
                Discount: <span className="font-semibold text-slate-900">{formatNormalisationDiscount(r.candidateScoringWeight)}</span>
              </span>
              <span>
                Multiplier: <span className="font-semibold text-slate-900">{formatWeightApplied(r.hierarchyMultiplier)}</span>
              </span>
              <span>
                Contribution: <span className="font-semibold text-slate-900">{r.skillContribution.toFixed(2)}</span>
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

// M03-E05 → S06 / M07-E01 → S05: Candidate Scorecard — Hierarchy Match
// Results. Every value rendered here (match type, jd weight, normalisation
// discount, hierarchy multiplier, skill contribution, mandatory coverage,
// preferred skill bonus, deterministic score/status) is read directly from
// the candidate's score_breakdown — nothing is calculated in this component.
//
// scoreBreakdown shape: { items, noVerifiedSkills, score, status,
// mandatoryCoveragePct, preferredSkillBonus }. manualSkills (M07-E01/S04) and
// additionalSkills (M07-E01/S05-T03) are shown for visibility but never
// folded into the deterministic score/status above.
export default function HierarchyMatchResults({ scoreBreakdown, manualSkills = [], additionalSkills = [], isLoading = false }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [additionalOpen, setAdditionalOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-12 flex items-center justify-center">
        <LoadingSpinner text="Loading hierarchy match results..." />
      </div>
    );
  }

  if (!scoreBreakdown || !scoreBreakdown.items || scoreBreakdown.items.length === 0) {
    return (
      <div className="bg-white border border-dashed border-slate-200 rounded-xl p-8 text-center">
        <p className="text-[12.5px] font-semibold text-slate-700">No hierarchy match data available</p>
        <p className="text-[11.5px] text-slate-400 mt-1">This candidate has no score breakdown for the current JD.</p>
      </div>
    );
  }

  const mandatoryItems = scoreBreakdown.items.filter((r) => r.mandatory);
  const preferredItems = scoreBreakdown.items.filter((r) => !r.mandatory);

  // The dedicated No Verified Skills banner already covers this candidate's
  // total-failure case at the top of the tab — skip the redundant
  // missing-mandatory card here so the two warnings don't stack.
  const missingMandatory = scoreBreakdown.noVerifiedSkills ? [] : mandatoryItems.filter((r) => r.matchType === "MISSING");

  const recognisedAdditional = additionalSkills.filter((s) => s.scoringWeight > 0);
  const unrecognisedAdditional = additionalSkills.filter((s) => s.scoringWeight === 0);

  return (
    <div className="space-y-4">
      <div className="sticky top-0 z-10 bg-white flex items-center justify-between py-1">
        <h3 className="text-[13.5px] font-bold text-slate-900">Hierarchy Match Results</h3>
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          className="flex items-center gap-1 text-[11.5px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
          aria-expanded={helpOpen}
          aria-controls="hierarchy-match-help"
        >
          <HelpCircle size={14} />
          How Scores Are Calculated
          {helpOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
      </div>

      {helpOpen && (
        <div id="hierarchy-match-help" className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
          <div>
            <div className="text-[12px] font-bold text-slate-700 mb-2">Hierarchy multiplier</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              {WEIGHT_LEGEND.map((l) => (
                <div key={l.label} className="rounded-lg bg-white border border-slate-200 p-2 text-center">
                  <div className="text-[10.5px] text-slate-500">{l.label}</div>
                  <div className="text-[13px] font-bold text-slate-900">{l.weight}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Missing mandatory skills fail deterministic screening — a candidate cannot pass if any mandatory JD skill
            has no hierarchy match.
          </p>

          <div>
            <div className="text-[12px] font-bold text-slate-700 mb-2">Candidate scoring weight (normalisation discount)</div>
            <div className="grid grid-cols-2 gap-2">
              {CONFIDENCE_LEGEND.map((c) => (
                <div key={c.value} className="rounded-lg bg-white border border-slate-200 p-2.5">
                  <div className="text-[13px] font-bold text-slate-900">{c.value}</div>
                  <div className="text-[10.5px] text-slate-500">{c.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {missingMandatory.length > 0 && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-rose-800">Missing Mandatory Skills</div>
              <div className="mt-2 space-y-1.5">
                {missingMandatory.map((r, i) => (
                  <div
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-[12px] text-rose-700 bg-white/70 rounded-lg px-3 py-1.5"
                  >
                    <span className="font-semibold">{r.jdSkillName}</span>
                    <span>Configured Weight: {r.jdWeight}</span>
                    <span className="italic">No hierarchy match found</span>
                  </div>
                ))}
              </div>
              <Button
                variant="danger"
                size="small"
                className="mt-3"
                onClick={() => toast.info("This candidate has been flagged for manual review.")}
              >
                Escalate for Manual Review
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* S05-T01 — Mandatory Skills. Mandatory Coverage % is a summary stat
          above the table, distinct from the Deterministic Score/Passed-Failed
          badge which stays at the bottom of the whole section. */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12.5px] font-bold text-slate-900">Mandatory Skills</div>
          <div className="text-[11.5px] text-slate-500">
            Mandatory Coverage: <span className="font-semibold text-slate-900">{scoreBreakdown.mandatoryCoveragePct.toFixed(1)}%</span>
          </div>
        </div>
        {mandatoryItems.length > 0 ? (
          <SkillTable items={mandatoryItems} />
        ) : (
          <p className="text-[11.5px] text-slate-400">No mandatory skills found</p>
        )}
      </div>

      {/* S05-T02 — Preferred (Bonus) Skills, visually distinct from Mandatory,
          hidden entirely when the JD has no preferred skills. */}
      {preferredItems.length > 0 && (
        <div className="rounded-xl bg-indigo-50/60 border border-indigo-100 p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[12.5px] font-bold text-indigo-900">Preferred (Bonus)</div>
            <div className="text-[11.5px] text-indigo-700">
              Preferred skill bonus: <span className="font-semibold">{scoreBreakdown.preferredSkillBonus.toFixed(2)}</span>
            </div>
          </div>
          <SkillTable items={preferredItems} />
          <p className="text-[11px] text-indigo-600 mt-2">
            Preferred skill bonus contributes to composite score via the deterministic weight component.
          </p>
        </div>
      )}

      {manualSkills.length > 0 && (
        <div>
          <div className="text-[12px] font-semibold mb-1.5 text-slate-600">
            Manually added skills <span className="text-slate-400 font-normal">(not included in the score above)</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {manualSkills.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded-full bg-blue-50 text-[11px] font-semibold text-blue-700">
                {s.canonicalName}
                <span className="px-1.5 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-bold">Manually Added</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* S05-T03 — Additional Candidate Skills (collapsible) */}
      <div className="rounded-xl border border-slate-200">
        <button
          type="button"
          onClick={() => setAdditionalOpen((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-left"
          aria-expanded={additionalOpen}
          aria-controls="additional-candidate-skills"
        >
          <span className="text-[12.5px] font-bold text-slate-900">
            Additional Candidate Skills{" "}
            <span className="text-slate-400 font-normal">
              — {additionalSkills.length} additional skill{additionalSkills.length === 1 ? "" : "s"} — click to view
            </span>
          </span>
          {additionalOpen ? <ChevronUp size={15} className="text-slate-400" /> : <ChevronDown size={15} className="text-slate-400" />}
        </button>

        {additionalOpen && (
          <div id="additional-candidate-skills" className="px-4 pb-4 space-y-4">
            {additionalSkills.length === 0 ? (
              <p className="text-[11.5px] text-slate-400">No additional candidate skills</p>
            ) : (
              <>
                {recognisedAdditional.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Not matched to any JD skill</div>
                    {recognisedAdditional.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                        <span className="text-[12.5px] font-semibold text-slate-900">{s.canonicalName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {renderMatchTierBadge(s.matchTier)}
                          <span className="text-[11.5px] text-slate-500">Weight: {s.scoringWeight.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {unrecognisedAdditional.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Unrecognised Skills</div>
                    {unrecognisedAdditional.map((s, i) => (
                      <div key={i} className="flex items-center justify-between gap-2 bg-slate-50 rounded-lg px-3 py-1.5">
                        <span className="text-[12.5px] font-semibold text-slate-900">{s.canonicalName}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {renderMatchTierBadge(s.matchTier)}
                          <span className="text-[11.5px] text-slate-500">Weight: 0.0</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* S05-T01 summary — Deterministic Score + Passed/Failed at the bottom
          of the section (Mandatory Coverage % is shown above the table). */}
      <div className="flex items-center justify-between rounded-xl bg-slate-50 border border-slate-200 p-4">
        <div>
          <div className="text-[11px] text-slate-400">Deterministic Score</div>
          <div className="text-[15px] font-extrabold text-slate-900">{scoreBreakdown.score.toFixed(2)} / 100</div>
        </div>
        {renderDeterministicStatusBadge(scoreBreakdown.status)}
      </div>
    </div>
  );
}
