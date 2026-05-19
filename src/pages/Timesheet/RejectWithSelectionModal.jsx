import React, { useState, useEffect, useMemo } from "react";
import { XCircle, CheckCircle } from "lucide-react";

const formatDay = (workDate) => {
  if (!workDate) return "";
  const d = new Date(workDate);
  if (Number.isNaN(d.getTime())) return workDate;
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
};

export default function RejectWithSelectionModal({
  isOpen,
  week,
  isLoading = false,
  onCancel,
  onConfirm,
}) {
  const timesheets = useMemo(
    () => (week && Array.isArray(week.timesheets) ? week.timesheets : []),
    [week],
  );

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [comment, setComment] = useState("");

  // When the modal opens (or the week changes), default all days to checked.
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(new Set(timesheets.map((t) => t.timesheetId)));
      setComment("");
    }
  }, [isOpen, timesheets]);

  if (!isOpen) return null;

  const toggle = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allIds = timesheets.map((t) => t.timesheetId);
  const rejectedIds = allIds.filter((id) => selectedIds.has(id));
  const approvedIds = allIds.filter((id) => !selectedIds.has(id));

  const hasRejection = rejectedIds.length > 0;
  const commentRequired = hasRejection;
  const commentValid = !commentRequired || comment.trim().length > 0;
  const canSubmit = hasRejection && commentValid && !isLoading;

  const handleConfirm = () => {
    if (!canSubmit) return;
    onConfirm({
      approvedIds,
      rejectedIds,
      comment: comment.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="p-5 border-b">
          <h3 className="text-lg font-semibold">
            Reject week
            {week?.startDate && week?.endDate
              ? `: ${formatDay(week.startDate)} – ${formatDay(week.endDate)}`
              : ""}
          </h3>
          <p className="mt-1 text-xs text-gray-600">
            <span className="font-medium">Checked</span> days will be{" "}
            <span className="text-red-600 font-medium">rejected</span>.{" "}
            <span className="font-medium">Unchecked</span> days will be{" "}
            <span className="text-green-600 font-medium">approved</span> by you.
          </p>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          <ul className="divide-y border rounded">
            {timesheets.length === 0 && (
              <li className="p-3 text-sm text-gray-500">
                No days available for this week.
              </li>
            )}
            {timesheets.map((t) => {
              const checked = selectedIds.has(t.timesheetId);
              return (
                <li
                  key={t.timesheetId}
                  className="flex items-center gap-3 px-3 py-2"
                >
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-red-600 cursor-pointer"
                    checked={checked}
                    onChange={() => toggle(t.timesheetId)}
                    disabled={isLoading}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-800">
                      {formatDay(t.workDate)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t.hoursWorked ?? 0} hrs
                      {t.isHolidayTimesheet ? " · Holiday" : ""}
                      {t.isLeaveTimesheet ? " · Leave" : ""}
                      {t.defaultHolidayTimesheet ? " · Auto-holiday" : ""}
                    </div>
                  </div>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full inline-flex items-center gap-1 ${
                      checked
                        ? "bg-red-50 text-red-700"
                        : "bg-green-50 text-green-700"
                    }`}
                  >
                    {checked ? (
                      <>
                        <XCircle size={12} /> Will reject
                      </>
                    ) : (
                      <>
                        <CheckCircle size={12} /> Will approve
                      </>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-3 text-xs text-gray-600">
            Summary:{" "}
            <span className="text-red-600 font-medium">
              {rejectedIds.length}
            </span>{" "}
            to reject ·{" "}
            <span className="text-green-600 font-medium">
              {approvedIds.length}
            </span>{" "}
            to approve
          </div>

          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rejection reason{" "}
              {commentRequired && <span className="text-red-500">*</span>}
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                commentRequired
                  ? "Required when rejecting one or more days…"
                  : "No rejection — comment not required"
              }
              disabled={isLoading || !commentRequired}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 resize-none disabled:bg-gray-50"
            />
            {commentRequired && !commentValid && (
              <p className="mt-1 text-xs text-red-600">
                Please enter a reason for the rejection.
              </p>
            )}
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            title={
              !hasRejection
                ? "Tick at least one day to reject, or use Approve All instead."
                : ""
            }
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
          >
            {isLoading ? "Submitting…" : "Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  );
}
