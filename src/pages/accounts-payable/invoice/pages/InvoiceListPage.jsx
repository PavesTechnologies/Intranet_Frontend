import React, { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Modal from "../../../../components/Modal/modal";
import Pagination from "../../../../components/Pagination/pagination";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import FormDatePicker from "../../../../components/forms/FormDatePicker";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useAuth } from "../../../../contexts/AuthContext";
import InvoiceTable from "../components/InvoiceTable";
import InvoiceFilterPanel from "../components/InvoiceFilterPanel";
import { useInvoices, useCreateInvoice } from "../hooks/useInvoices";
// RBAC disabled for AP module development — restore to re-enable role checks
// import { AP_CLERK_PLUS_ROLES } from "../../constants/apRoles";
import { VENDORS } from "../../mocks/apFixtures";

const PAGE_SIZE = 10;

const EMPTY_FORM = { vendorId: "", poNumber: "", amount: "", dueDate: "" };

const VENDOR_SELECT_OPTIONS = VENDORS.map((vendor) => ({ value: vendor.id, label: vendor.name }));

const InvoiceListPage = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const [vendorId, setVendorId] = useState("All");
  const [page, setPage] = useState(1);

  const [isCreateOpen, setIsCreateOpen] = useState(searchParams.get("new") === "1");
  const [form, setForm] = useState(EMPTY_FORM);

  const filters = useMemo(() => ({ search, status, vendorId }), [search, status, vendorId]);
  const { data: invoices = [], isLoading } = useInvoices(filters);
  const createInvoice = useCreateInvoice();

  const canCreate = true; // RBAC disabled for AP module development — restore: hasRole(AP_CLERK_PLUS_ROLES)

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const pagedInvoices = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const openCreateModal = () => setIsCreateOpen(true);
  const closeCreateModal = () => {
    setIsCreateOpen(false);
    setForm(EMPTY_FORM);
    if (searchParams.get("new")) {
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitCreate = async (e) => {
    e.preventDefault();
    if (!form.vendorId || !form.amount) {
      showStatusToast("Vendor and amount are required.", "warning");
      return;
    }
    try {
      await createInvoice.mutateAsync(form);
      showStatusToast("Draft invoice created successfully.", "success");
      closeCreateModal();
    } catch (error) {
      showStatusToast(error?.message || "Failed to create invoice.", "error");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 md:px-6">
      <PageHeader
        title="Invoices"
        subtitle="Browse, filter, and create accounts payable invoices."
        actions={
          canCreate ? (
            <Button size="medium" variant="primary" onClick={openCreateModal}>
              New Invoice
            </Button>
          ) : null
        }
      />

      <PageCard className="mb-4">
        <PageCardContent>
          <InvoiceFilterPanel
            search={search}
            onSearchChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            status={status}
            onStatusChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
            vendorId={vendorId}
            onVendorChange={(value) => {
              setVendorId(value);
              setPage(1);
            }}
          />
        </PageCardContent>
      </PageCard>

      <PageCard>
        <PageCardContent>
          <InvoiceTable
            invoices={pagedInvoices}
            loading={isLoading}
            mode="list"
            onView={(invoice) => navigate(`/accounts-payable/invoices/${invoice.id}`)}
          />
          {!isLoading && invoices.length > 0 && (
            <div className="mt-4">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPrevious={() => setPage((p) => Math.max(1, p - 1))}
                onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
              />
            </div>
          )}
        </PageCardContent>
      </PageCard>

      <Modal
        isOpen={isCreateOpen}
        onClose={closeCreateModal}
        title="New Invoice"
        subtitle="Create a draft invoice to begin processing."
        size="md"
      >
        <form className="space-y-4" onSubmit={handleSubmitCreate}>
          <FormSelect
            label="Vendor"
            name="vendorId"
            options={VENDOR_SELECT_OPTIONS}
            value={form.vendorId}
            onChange={handleChange}
          />
          <FormInput
            label="PO Number"
            name="poNumber"
            value={form.poNumber}
            onChange={handleChange}
            placeholder="PO-9999"
          />
          <FormInput
            label="Amount"
            name="amount"
            type="number"
            value={form.amount}
            onChange={handleChange}
            placeholder="0.00"
            requiredMark
          />
          <FormDatePicker label="Due Date" name="dueDate" value={form.dueDate} onChange={handleChange} />

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" size="medium" onClick={closeCreateModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="medium"
              loading={createInvoice.isPending}
              loadingText="Creating..."
            >
              Create Draft
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default InvoiceListPage;
