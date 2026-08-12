import React, { useState } from "react";
import { toast } from "react-toastify";
import { Star, StarOff, Eye, Archive, Trash2, MessageSquare } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import ScoreRing from "./ScoreRing";
import { renderStageBadge, renderRiskBadge } from "../utils/candidateUtils.jsx";
import { deleteCandidate } from "../../service/resumeIntake";
import { extractErrorMessage } from "../../resume-intake/intake/utils/intakeUtils.jsx";
import { useAuth } from "../../../../contexts/AuthContext";

/**
 * Shared candidate table (M10). The selection, note-badge and extra-action
 * props below are M11-E04 additions and are all opt-in — every existing caller
 * that omits them renders exactly as before.
 */
export default function CandidateTable({
  candidates,
  onView,
  onToggleStar,
  onDeleted,
  // M11-E04-S03-T02 bulk selection
  selectable = false,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  // M11-E04-S01-T03 note count badges, keyed by campaign_candidate_id
  noteCounts,
  // M11-E04-S03-T01/T03 per-row actions, rendered after the built-in ones
  renderExtraActions,
}) {
  const { hasRole } = useAuth();
  const canDeleteCandidates = hasRole(["HR_ADMIN"]);
  const selected = selectedIds || new Set();
  const allOnPageSelected =
    candidates.length > 0 && candidates.every((c) => selected.has(c.id));

  const [candidateToDelete, setCandidateToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirmDelete = async () => {
    if (!candidateToDelete) return;
    setIsDeleting(true);
    try {
      await deleteCandidate(candidateToDelete.candidate_id);
      toast.success(`${candidateToDelete.name} has been deleted.`);
      setCandidateToDelete(null);
      onDeleted?.(candidateToDelete);
    } catch (err) {
      toast.error(extractErrorMessage(err, "Failed to delete candidate."));
    } finally {
      setIsDeleting(false);
    }
  };

  if (candidates.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
        <Archive className="h-10 w-10 mx-auto stroke-1 mb-2" />
        No candidates found matching the criteria.
      </div>
    );
  }

  const headers = ["Candidate", "Deterministic", "Semantic", "ATS", "Composite", "Exp.", "Location", "Stage", "Risk", "Actions"];
  const columns = ["name", "deterministic", "semantic", "ats", "composite", "experience", "location", "stage", "risk", "actions"];

  if (selectable) {
    headers.unshift(
      <input
        type="checkbox"
        checked={allOnPageSelected}
        onChange={() => onToggleSelectAll?.(candidates, !allOnPageSelected)}
        className="accent-indigo-600 cursor-pointer"
        title="Select all on this page"
      />
    );
    columns.unshift("select");
  }

  const rows = candidates.map((c) => ({
    id: c.id,
    rowClass: "hover:bg-slate-50/50 transition cursor-pointer",
    onRowClick: () => onView(c),
    // stopPropagation throughout: the row itself opens the scorecard, so a
    // click on the checkbox must not navigate away from the selection.
    select: selectable ? (
      <input
        type="checkbox"
        checked={selected.has(c.id)}
        onChange={() => onToggleSelect?.(c.id)}
        onClick={(e) => e.stopPropagation()}
        className="accent-indigo-600 cursor-pointer"
      />
    ) : null,
    name: (
      <div className="w-full flex items-center gap-2.5 text-left">
        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
          {c.initials}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
            <span className="truncate">{c.name}</span>
            {/* M11-E04-S01-T03 — only shown when there is something to see */}
            {noteCounts?.[c.id] > 0 && (
              <span
                title={`${noteCounts[c.id]} recruiter note(s)`}
                className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700"
              >
                <MessageSquare className="h-2.5 w-2.5" />
                {noteCounts[c.id]}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 truncate">{c.role}</div>
        </div>
        <button
          className="shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onToggleStar(c.id);
          }}
        >
          {c.starred ? <Star size={14} className="fill-amber-500 text-amber-500" /> : <StarOff size={14} className="text-slate-300" />}
        </button>
      </div>
    ),
    deterministic: <span className="font-semibold text-slate-900">{Number(c.deterministic).toFixed(1)}</span>,
    ats: <span className="font-semibold text-slate-900">{(Number(c.ats) * 100).toFixed(1)}</span>,
    semantic: <span className="font-semibold text-slate-900">{(Number(c.semantic) * 100).toFixed(1)}</span>,
    composite: <ScoreRing value={c.composite} size={32} color="#16A34A" />,
    experience: `${Number(c.experience).toFixed(1)} yrs`,
    location: c.location,
    stage: renderStageBadge(c.stage),
    risk: renderRiskBadge(c.risk),
    actions: (
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onView(c);
          }}
          title="View candidate"
          className="h-8 w-8 !text-blue-500 hover:!text-blue-600"
        >
          <Eye className="h-4 w-4" />
        </Button>
        {canDeleteCandidates && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setCandidateToDelete(c);
            }}
            title="Delete candidate"
            className="h-8 w-8 !text-red-500 hover:!text-red-600"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
        {renderExtraActions?.(c)}
      </div>
    ),
  }));

  return (
    <>
      <GenericTable headers={headers} columns={columns} rows={rows} />

      <ConfirmationModal
        isOpen={!!candidateToDelete}
        title="Delete candidate"
        message={`Are you sure you want to delete "${candidateToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        isLoading={isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setCandidateToDelete(null)}
      />
    </>
  );
}
