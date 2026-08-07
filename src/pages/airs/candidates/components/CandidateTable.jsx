import React, { useState } from "react";
import { toast } from "react-toastify";
import { Star, StarOff, Eye, Archive, Trash2 } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import ScoreRing from "./ScoreRing";
import { renderStageBadge, renderRiskBadge } from "../utils/candidateUtils.jsx";
import { deleteCandidate } from "../../service/resumeIntake";
import { extractErrorMessage } from "../../resume-intake/intake/utils/intakeUtils.jsx";
import { useAuth } from "../../../../contexts/AuthContext";

export default function CandidateTable({ candidates, onView, onToggleStar, onDeleted }) {
  const { hasRole } = useAuth();
  const canDeleteCandidates = hasRole(["HR_ADMIN"]);

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
  const rows = candidates.map((c) => ({
    id: c.id,
    rowClass: "hover:bg-slate-50/50 transition cursor-pointer",
    onRowClick: () => onView(c),
    name: (
      <div className="w-full flex items-center gap-2.5 text-left">
        <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 bg-gradient-to-br from-blue-600 to-indigo-600">
          {c.initials}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 truncate">{c.name}</div>
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
