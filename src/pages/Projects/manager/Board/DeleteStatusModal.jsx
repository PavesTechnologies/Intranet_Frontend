import { useState, useEffect } from "react";
import { showStatusToast } from "../../../../components/toastfy/toast";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import FilterListbox from "../../../../components/filter/FilterListbox";

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
      showStatusToast("Delete failed", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={`Move work from ${statusToDelete?.name ?? statusToDelete?.statusName} column`}
      className="max-w-xl"
    >
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
            <FilterListbox
              options={[{value:"",label:"-- Select destination status --"},...otherStatuses.map(s=>({value:s.id,label:s.name??s.statusName}))]}
              value={selectedNewStatus}
              onChange={setSelectedNewStatus}
            />
          </div>
        </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline" size="small" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="danger"
          size="small"
          onClick={handleConfirm}
          disabled={!canConfirm || submitting}
          loading={submitting}
          loadingText="Processing..."
        >
          Confirm & Delete
        </Button>
      </div>
    </Modal>
  );
};
