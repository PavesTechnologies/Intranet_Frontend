import { useState } from "react";
import { toast } from "react-toastify";
import { Plus, Pencil, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import GenericTable from "../../../../components/Table/table";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDate } from "../../utils/formatters";
import VendorBankForm, { DEFAULT_BANK_FORM } from "./VendorBankForm";
import { useCreateBank, useUpdateBank, useDeleteBank } from "../hooks/useVendorMutations";

const validateBankForm = (formData) => {
  const errors = {};
  if (!formData.bank_name?.trim()) errors.bank_name = "This field is required.";
  if (!formData.account_holder_name?.trim()) errors.account_holder_name = "This field is required.";
  return errors;
};

const buildBankPayload = (formData) => ({
  bank_name: formData.bank_name.trim(),
  account_holder_name: formData.account_holder_name.trim(),
  account_number: formData.account_number?.trim() || null,
  iban: formData.iban?.trim() || null,
  swift_code: formData.swift_code?.trim() || null,
  routing_number: formData.routing_number?.trim() || null,
  ifsc_code: formData.ifsc_code?.trim() || null,
  is_primary: !!formData.is_primary,
});

const maskAccountNumber = (accountNumber) => {
  if (!accountNumber) return "—";
  return accountNumber.length > 4 ? `****${accountNumber.slice(-4)}` : accountNumber;
};

/**
 * Vendor bank accounts. Bank accounts are versioned by the backend — making
 * a new account primary soft-closes (effective_to) the previous primary
 * instead of deleting it, so closed accounts still show up here.
 */
const VendorBankList = ({ vendorId, banks = [] }) => {
  const [modalTarget, setModalTarget] = useState(null); // { bank: null | bank }
  const [formData, setFormData] = useState(DEFAULT_BANK_FORM);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const createMutation = useCreateBank(vendorId);
  const updateMutation = useUpdateBank(vendorId);
  const deleteMutation = useDeleteBank(vendorId);

  const openAdd = () => {
    setFormData(DEFAULT_BANK_FORM);
    setErrors({});
    setModalTarget({ bank: null });
  };

  const openEdit = (bank) => {
    setFormData({
      bank_name: bank.bank_name,
      account_holder_name: bank.account_holder_name,
      account_number: bank.account_number || "",
      iban: bank.iban || "",
      swift_code: bank.swift_code || "",
      routing_number: bank.routing_number || "",
      ifsc_code: bank.ifsc_code || "",
      is_primary: bank.is_primary,
    });
    setErrors({});
    setModalTarget({ bank });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async () => {
    const nextErrors = validateBankForm(formData);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const payload = buildBankPayload(formData);

    try {
      if (modalTarget.bank) {
        await updateMutation.mutateAsync({ bankId: modalTarget.bank.vendor_bank_id, payload });
        toast.success("Bank account updated.");
      } else {
        await createMutation.mutateAsync(payload);
        toast.success("Bank account added.");
      }
      setModalTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to save bank account."));
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(deleteTarget.vendor_bank_id);
      toast.success("Bank account deleted.");
      setDeleteTarget(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to delete bank account."));
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const isClosed = (bank) => !!bank.effective_to;

  const rows = banks.map((bank) => ({
    bankName: bank.bank_name,
    accountHolder: bank.account_holder_name,
    accountNumber: maskAccountNumber(bank.account_number),
    status: bank.is_primary ? (
      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Primary</span>
    ) : isClosed(bank) ? (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">Closed</span>
    ) : (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">Active</span>
    ),
    effective: `${formatDate(bank.effective_from)}${bank.effective_to ? ` – ${formatDate(bank.effective_to)}` : ""}`,
    actions: (
      <span className="flex justify-center gap-1.5">
        <Button size="small" variant="outline" onClick={() => openEdit(bank)}>
          <Pencil className="h-3.5 w-3.5" /> Edit
        </Button>
        <Button size="small" variant="outline" onClick={() => setDeleteTarget(bank)}>
          <Trash2 className="h-3.5 w-3.5" /> Delete
        </Button>
      </span>
    ),
    rowClass: isClosed(bank) ? "opacity-60" : "",
  }));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={openAdd}>
          <Plus className="h-4 w-4" /> Add Bank Account
        </Button>
      </div>

      <GenericTable
        headers={["Bank", "Account Holder", "Account Number", "Status", "Effective", "Actions"]}
        columns={["bankName", "accountHolder", "accountNumber", "status", "effective", "actions"]}
        rows={rows}
      />

      <Modal
        isOpen={!!modalTarget}
        onClose={() => setModalTarget(null)}
        title={modalTarget?.bank ? "Edit Bank Account" : "Add Bank Account"}
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setModalTarget(null)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} loading={isSaving} loadingText="Saving...">
              Save
            </Button>
          </div>
        }
      >
        <VendorBankForm formData={formData} errors={errors} onChange={handleChange} />
      </Modal>

      <ConfirmationModal
        isOpen={!!deleteTarget}
        title="Delete Bank Account"
        message="This will permanently remove this bank account. Continue?"
        confirmText="Delete"
        variant="danger"
        isLoading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default VendorBankList;
