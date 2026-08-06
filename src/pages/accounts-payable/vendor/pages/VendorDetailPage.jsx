import React, { useState } from "react";
import { useParams, Link } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import StatusBadge from "../../../../components/status/statusbadge";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatDateTime } from "../../utils/formatters";
import useApLookups from "../../hooks/useApLookups";
import useVendorDetail from "../hooks/useVendorDetail";
import { useUpdateVendor, useUpdateVendorStatus } from "../hooks/useVendorMutations";
import VendorForm, { DEFAULT_VENDOR_FORM } from "../components/VendorForm";
import VendorAddressList from "../components/VendorAddressList";
import VendorBankList from "../components/VendorBankList";
import VendorTaxTab from "../components/VendorTaxTab";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "addresses", label: "Addresses" },
  { id: "banks", label: "Bank Accounts" },
  { id: "tax", label: "Tax" },
];

const DetailRow = ({ label, value }) => (
  <div className="flex flex-col gap-1 border-b border-gray-100 py-2 last:border-0">
    <span className={Fonts.label}>{label}</span>
    <span className="text-sm text-gray-800">{value || "—"}</span>
  </div>
);

export default function VendorDetailPage() {
  const { vendorId } = useParams();

  const [activeTab, setActiveTab] = useState("overview");
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(DEFAULT_VENDOR_FORM);
  const [editErrors, setEditErrors] = useState({});
  const [confirmStatusChange, setConfirmStatusChange] = useState(null); // "activate" | "deactivate" | null

  const { vendor, addresses, banks, isLoading, isError, error } = useVendorDetail(vendorId);
  const { countries, currencies, paymentTerms, vendorStatuses } = useApLookups();

  const updateVendorMutation = useUpdateVendor(vendorId);
  const updateStatusMutation = useUpdateVendorStatus(vendorId);

  const countryName = countries.find((c) => c.country_id === vendor?.country_id)?.country_name;
  const currencyName = currencies.find((c) => c.currency_id === vendor?.currency_id)?.currency_name;
  const paymentTermName = paymentTerms.find((p) => p.payment_term_id === vendor?.payment_term_id)?.term_name;
  const status = vendorStatuses.find((s) => s.status_id === vendor?.status_id);
  const isActive = status?.status_code === "ACTIVE";

  const openEdit = () => {
    setEditForm({
      vendor_name: vendor.vendor_name || "",
      vendor_code: vendor.vendor_code || "",
      country_id: vendor.country_id || "",
      payment_term_id: vendor.payment_term_id || "",
      currency_id: vendor.currency_id || "",
      pan_number: vendor.pan_number || "",
      phone_number: vendor.phone_number || "",
      email: vendor.email || "",
      status_id: vendor.status_id || "",
    });
    setEditErrors({});
    setIsEditOpen(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
    setEditErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleEditSubmit = async () => {
    if (!editForm.vendor_name?.trim()) {
      setEditErrors({ vendor_name: "This field is required." });
      return;
    }

    try {
      await updateVendorMutation.mutateAsync({
        vendor_name: editForm.vendor_name.trim(),
        vendor_code: editForm.vendor_code?.trim() || null,
        country_id: editForm.country_id ? Number(editForm.country_id) : undefined,
        payment_term_id: editForm.payment_term_id ? Number(editForm.payment_term_id) : null,
        currency_id: editForm.currency_id ? Number(editForm.currency_id) : null,
        pan_number: editForm.pan_number?.trim() || null,
        phone_number: editForm.phone_number?.trim() || null,
        email: editForm.email?.trim() || null,
        status_id: editForm.status_id ? Number(editForm.status_id) : undefined,
      });
      showStatusToast("Vendor updated.", "success");
      setIsEditOpen(false);
    } catch (err) {
      showStatusToast(getApiErrorMessage(err, "Failed to update vendor."), "error");
    }
  };

  const handleConfirmStatusChange = async () => {
    try {
      await updateStatusMutation.mutateAsync(confirmStatusChange === "activate");
      showStatusToast(confirmStatusChange === "activate" ? "Vendor activated." : "Vendor deactivated.", "success");
      setConfirmStatusChange(null);
    } catch (err) {
      showStatusToast(getApiErrorMessage(err, "Failed to update vendor status."), "error");
    }
  };

  if (isLoading) {
    return <LoadingSpinner text="Loading vendor..." size="lg" />;
  }

  if (isError || !vendor) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load vendor{error?.message ? `: ${error.message}` : "."}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className={Fonts.smallText}>
        <Link to="/accounts-payable/dashboard" className="hover:underline">
          Accounts Payable
        </Link>
        {" / "}
        <Link to="/accounts-payable/vendors" className="hover:underline">
          Vendors
        </Link>
        {" / "}
        {vendor.vendor_name}
      </p>

      <PageHeader
        title={
          <span className="flex items-center gap-3">
            {vendor.vendor_name}
            {status && <StatusBadge label={status.status_name} size="md" />}
          </span>
        }
        subtitle={`${vendor.vendor_code || "No code"} — Vendor #${vendor.vendor_id}`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={openEdit}>
              Edit Vendor
            </Button>
            <Button
              variant={isActive ? "danger" : "success"}
              onClick={() => setConfirmStatusChange(isActive ? "deactivate" : "activate")}
            >
              {isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        }
      />

      <div className="flex gap-6 border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 text-sm transition ${
              activeTab === tab.id
                ? "border-b-2 border-[#0A0082] font-semibold text-[#0A0082]"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <PageCard>
          <PageCardContent>
            <div className="grid grid-cols-1 gap-x-8 gap-y-1 md:grid-cols-2">
              <DetailRow label="Vendor Code" value={vendor.vendor_code} />
              <DetailRow label="Country" value={countryName} />
              <DetailRow label="Payment Term" value={paymentTermName} />
              <DetailRow label="Currency" value={currencyName} />
              <DetailRow label="PAN Number" value={vendor.pan_number} />
              <DetailRow label="Phone Number" value={vendor.phone_number} />
              <DetailRow label="Email" value={vendor.email} />
              <DetailRow label="Created" value={formatDateTime(vendor.created_at)} />
              <DetailRow label="Last Updated" value={formatDateTime(vendor.updated_at)} />
            </div>
          </PageCardContent>
        </PageCard>
      )}

      {activeTab === "addresses" && <VendorAddressList vendorId={vendorId} addresses={addresses} />}

      {activeTab === "banks" && <VendorBankList vendorId={vendorId} banks={banks} />}

      {activeTab === "tax" && (
        <VendorTaxTab vendorId={vendorId} addresses={addresses} onGoToAddresses={() => setActiveTab("addresses")} />
      )}

      <Modal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        title="Edit Vendor"
        size="lg"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} loading={updateVendorMutation.isPending} loadingText="Saving...">
              Save
            </Button>
          </div>
        }
      >
        <VendorForm formData={editForm} errors={editErrors} onChange={handleEditChange} mode="edit" />
      </Modal>

      <ConfirmationModal
        isOpen={!!confirmStatusChange}
        title={confirmStatusChange === "activate" ? "Activate Vendor" : "Deactivate Vendor"}
        message={
          confirmStatusChange === "activate"
            ? "This will mark the vendor as active. Continue?"
            : "This will mark the vendor as inactive. Continue?"
        }
        confirmText={confirmStatusChange === "activate" ? "Activate" : "Deactivate"}
        variant={confirmStatusChange === "activate" ? "success" : "danger"}
        isLoading={updateStatusMutation.isPending}
        onConfirm={handleConfirmStatusChange}
        onCancel={() => setConfirmStatusChange(null)}
      />
    </div>
  );
}
