import React from "react";
import { useQuery } from "@tanstack/react-query";
import Modal from "@/components/Modal/modal";
import Button from "@/components/Button/Button";
import LoadingSpinner from "@/components/LoadingSpinner";
import { taxAuditService } from "@/pages/expense-management/api/expenseReportsApi";

const ACTION_LABELS = {
  TAX_CODE_CREATED: "Tax code created",
  TAX_CODE_UPDATED: "Tax code updated",
  TAX_CODE_DEACTIVATED: "Tax code deactivated",
  TAX_CODE_DELETED: "Tax code deleted",
  TAX_MAPPING_ADDED: "Mapping added",
  TAX_MAPPING_UPDATED: "Mapping updated",
  TAX_MAPPING_ENDED: "Mapping ended",
  TAX_MAPPING_REMOVED: "Mapping removed",
  TAX_SNAPSHOT_FROZEN: "Tax frozen at submission",
  TAX_OVERRIDE: "Employee tax override",
  TAX_CHANGED_DURING_CORRECTION: "Tax changed during correction",
  OCR_TAX_ATTACHED: "OCR tax attached",
  TAX_VALIDATION_STATUS_CHANGED: "Sent to Finance review",
  TAX_FINANCE_VERIFIED: "Finance verified tax",
  TAX_FINANCE_ADJUSTED: "Finance adjusted tax",
  TAX_FINANCE_VERIFICATION_RESET: "Finance verification reopened",
};

const parse = (json) => {
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const humanKey = (k) => k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

/** Fields that differ between the old and new JSON snapshot (or every field of a create / delete). */
const changes = (entry) => {
  const before = parse(entry.oldValue) || {};
  const after = parse(entry.newValue) || {};
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])];
  return keys
    .filter((k) => String(before[k] ?? "") !== String(after[k] ?? ""))
    .map((k) => ({ key: k, before: before[k], after: after[k] }));
};

const show = (v) => (v === null || v === undefined || v === "" || v === "null" ? "—" : String(v));

/**
 * Tax audit history of one record (tax code, category mapping or expense line), newest first:
 * who did what, from which source, why, and which fields changed.
 */
export default function TaxAuditHistoryModal({ isOpen, onClose, entity, entityId, title }) {
  const { data: entries = [], isLoading, isError } = useQuery({
    queryKey: ["taxAudit", entity, entityId],
    queryFn: () => taxAuditService.history(entity, entityId).then((res) => res.data?.data || []),
    enabled: isOpen && !!entityId,
    staleTime: 30_000,
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title || "Tax History"}
      subtitle="Every tax change on this record, newest first."
      size="lg"
      fullScreenMobile
      footer={
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      }
    >
      <div className="py-2">
        {isLoading ? (
          <div className="py-10"><LoadingSpinner text="Loading history…" /></div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-rose-600">Couldn't load the history.</p>
        ) : entries.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-500">No tax changes recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {entries.map((e) => {
              const diff = changes(e);
              return (
                <li key={e.auditId} className="rounded-lg border border-gray-200 p-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-800">{ACTION_LABELS[e.action] || e.action}</span>
                    <span className="text-xs text-gray-500">
                      {e.performedAt ? new Date(e.performedAt).toLocaleString("en-IN") : "—"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {show(e.performedBy)}
                    {e.source && <span className="ml-1 rounded bg-gray-100 px-1.5 py-px text-[10px] font-semibold text-gray-600">{e.source}</span>}
                  </p>
                  {e.reason && <p className="mt-1.5 text-xs text-amber-800"><span className="font-semibold">Reason:</span> {e.reason}</p>}
                  {diff.length > 0 && (
                    <div className="mt-2 overflow-x-auto">
                      <table className="w-full text-[11px]">
                        <tbody>
                          {diff.map((d) => (
                            <tr key={d.key} className="border-t border-gray-100">
                              <td className="py-1 pr-3 text-gray-500">{humanKey(d.key)}</td>
                              <td className="py-1 pr-3 text-gray-400 line-through">{show(d.before)}</td>
                              <td className="py-1 font-medium text-gray-800">{show(d.after)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Modal>
  );
}
