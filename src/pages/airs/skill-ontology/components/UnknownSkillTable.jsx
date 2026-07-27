import React, { useEffect, useState } from "react";
import { Check, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "react-toastify";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/ui/Modal";
import { formatDate } from "../utils/skillOntologyUtils.jsx";
import { bulkApproveUnknownSkills, bulkDeleteUnknownSkills } from "../services/skillOntologyService";

export default function UnknownSkillTable({ skills, isLoading, onPromote, onBulkDone }) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [confirmAction, setConfirmAction] = useState(null); // "approve" | "delete" | null
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Drop stale selections whenever the visible page changes (search/page/
  // refresh) so an id that's no longer on screen can never be bulk-actioned.
  useEffect(() => {
    setSelectedIds((prev) => {
      const visibleIds = new Set(skills.map((s) => s.id));
      const next = new Set([...prev].filter((id) => visibleIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [skills]);

  const allSelected = skills.length > 0 && skills.every((s) => selectedIds.has(s.id));

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(skills.map((s) => s.id)));
  };

  const toggleRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeConfirm = () => {
    if (isSubmitting) return;
    setConfirmAction(null);
  };

  const handleConfirmBulkAction = async () => {
    const ids = Array.from(selectedIds);
    setIsSubmitting(true);
    try {
      const action = confirmAction === "approve" ? bulkApproveUnknownSkills : bulkDeleteUnknownSkills;
      const res = await action(ids);
      const { message, failed = 0, results = [] } = res?.data || {};
      toast.success(message || "Bulk action completed.");
      if (failed > 0) {
        const firstFailure = results.find((r) => !r.success);
        toast.error(`${failed} of ${ids.length} failed${firstFailure ? `: ${firstFailure.message}` : "."}`);
      }
      setSelectedIds(new Set());
      setConfirmAction(null);
      onBulkDone?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.detail || "Bulk action failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const headers = [
    <input
      key="select-all"
      type="checkbox"
      checked={allSelected}
      onChange={toggleSelectAll}
      className="h-3.5 w-3.5 cursor-pointer accent-indigo-600"
    />,
    <span className="block w-full text-left">Raw Skill</span>,
    <span className="block w-full text-left">Normalized Key</span>,
    <span className="block w-full text-left">Frequency</span>,
    <span className="block w-full text-left">First Seen</span>,
    <span className="block w-full text-left">Last Seen</span>,
    <span className="block w-full text-left">Status</span>,
  ];
  const columns = ["select", "rawSkill", "normalizedKey", "frequency", "firstSeen", "lastSeen", "status"];

  const rows = skills.map((skill) => ({
    id: skill.id,
    select: (
      <input
        type="checkbox"
        checked={selectedIds.has(skill.id)}
        onChange={() => toggleRow(skill.id)}
        className="h-3.5 w-3.5 cursor-pointer accent-indigo-600"
      />
    ),
    rawSkill: (
      <div className="w-full text-left" title={skill.rawSkill}>
        <span className="line-clamp-1 max-w-[220px] font-semibold text-slate-900">{skill.rawSkill}</span>
      </div>
    ),
    normalizedKey: (
      <div className="w-full text-left" title={skill.normalizedKey}>
        <span className="line-clamp-1 max-w-[220px] text-slate-500">{skill.normalizedKey}</span>
      </div>
    ),
    frequency: <div className="w-full text-left">{skill.frequency}</div>,
    firstSeen: <div className="w-full text-left">{formatDate(skill.firstSeen)}</div>,
    lastSeen: <div className="w-full text-left">{formatDate(skill.lastSeen)}</div>,
    status: (
      <div className="w-full text-left">
        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
          {skill.status}
        </span>
      </div>
    ),
  }));

  return (
    <div className="space-y-3">
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-blue-100 bg-blue-50">
          <span className="text-[12.5px] font-semibold text-blue-700">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="small" onClick={() => setSelectedIds(new Set())}>
              Clear
            </Button>
            <Button variant="danger" size="small" onClick={() => setConfirmAction("delete")}>
              <Trash2 className="h-3.5 w-3.5" />
              Reject Selected
            </Button>
            <Button variant="primary" size="small" onClick={() => setConfirmAction("approve")}>
              <Check className="h-3.5 w-3.5" />
              Approve Selected
            </Button>
          </div>
        </div>
      )}

      <GenericTable headers={headers} columns={columns} rows={rows} loading={isLoading} />

      <Modal
        isOpen={!!confirmAction}
        onClose={closeConfirm}
        title={confirmAction === "approve" ? "Approve Selected Skills" : "Reject Selected Skills"}
        width="460px"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
            <p className="text-[12px] text-amber-700">
              {confirmAction === "approve"
                ? `This creates a new canonical skill for each of the ${selectedIds.size} selected unknown skill${selectedIds.size > 1 ? "s" : ""}.`
                : `This permanently deletes the ${selectedIds.size} selected unknown skill${selectedIds.size > 1 ? "s" : ""}. This action cannot be undone.`}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="small" onClick={closeConfirm} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant={confirmAction === "approve" ? "primary" : "danger"}
              size="small"
              loading={isSubmitting}
              onClick={handleConfirmBulkAction}
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
