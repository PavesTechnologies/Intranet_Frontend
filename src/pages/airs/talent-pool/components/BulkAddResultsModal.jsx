import React from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import Modal from "@/components/ui/Modal";
import { Badge } from "@/components/ui/badge";
import Button from "@/components/Button/Button";

// Displays the exact per-candidate results BulkAddCandidatesResponse
// returns — every candidate's outcome shown individually, failures never
// hidden or summarized away, no automatic retry offered.
export default function BulkAddResultsModal({ isOpen, onClose, results, candidateNameById }) {
  if (!results) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add to Campaign — Results" width="480px" height="70vh">
      <div className="flex items-center gap-3 mb-4 text-[12.5px]">
        <span className="font-semibold text-slate-900">{results.total} candidate{results.total === 1 ? "" : "s"} selected</span>
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold px-2 py-0.5 text-[10.5px]">
          {results.added} Added
        </Badge>
        {results.failed > 0 && (
          <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-bold px-2 py-0.5 text-[10.5px]">
            {results.failed} Failed
          </Badge>
        )}
      </div>

      <div className="space-y-1.5 max-h-[360px] overflow-y-auto pr-1">
        {results.results.map((r) => {
          const name = candidateNameById?.[r.candidate_id] || r.candidate_id;
          const added = r.status === "ADDED";
          return (
            <div key={r.candidate_id} className="flex items-start gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200">
              {added ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="min-w-0">
                <div className="text-[12.5px] font-semibold text-slate-900 truncate">{name}</div>
                <div className={`text-[11px] ${added ? "text-emerald-600" : "text-rose-600"}`}>
                  {added ? "Added" : r.reason || "Failed"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-4 pt-3 border-t border-slate-100">
        <Button variant="primary" size="small" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  );
}
