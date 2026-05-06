import { useState, useEffect } from "react";
import { toast } from "react-toastify";

/* -------------------
  Delete Status Modal
--------------------*/
export const DeleteStatusModal = ({
  open,
  onClose,
  statusToDelete,
  otherStatuses,
  onConfirm,
}) => {
  const [selectedNewStatus, setSelectedNewStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setSelectedNewStatus("");
  }, [open, statusToDelete]);

  if (!open) return null;

  const canConfirm =
    selectedNewStatus &&
    Number(selectedNewStatus) !== Number(statusToDelete?.id);

  const handleConfirm = async () => {
    if (!canConfirm) return;
    setSubmitting(true);
    try {
      await onConfirm(Number(selectedNewStatus));
      onClose();
    } catch (err) {
      console.error(err);
      toast.error("Delete failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg w-full max-w-xl p-6">
        <h3 className="text-lg font-semibold mb-2">
          Move work from {statusToDelete?.name ?? statusToDelete?.statusName}{" "}
          column
        </h3>
        <p className="mb-4 text-sm text-gray-700">
          Select a new home for any work with the{" "}
          {statusToDelete?.name ?? statusToDelete?.statusName} status — the work
          will be moved there and this status will be deleted.
        </p>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-500">
              This status will be deleted
            </div>
            <div className="mt-2 px-3 py-2 border rounded inline-block">
              {statusToDelete?.name ?? statusToDelete?.statusName}
            </div>
          </div>

          <div>
            <div className="text-xs text-gray-500">
              Move existing work items to
            </div>
            <select
              value={selectedNewStatus}
              onChange={(e) => setSelectedNewStatus(e.target.value)}
              className="w-full mt-2 border rounded px-3 py-2"
            >
              <option value="">-- Select destination status --</option>
              {otherStatuses.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name ?? s.statusName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded border">
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm || submitting}
            className="px-4 py-2 rounded bg-red-600 text-white"
          >
            {submitting ? "Processing..." : "Confirm & Delete"}
          </button>
        </div>
      </div>
    </div>
  );
};
