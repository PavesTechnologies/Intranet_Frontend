import React, { useMemo, useState } from "react";
import {
  Boxes,
  Plus,
  AlertTriangle,
  FileText,
  Hash,
  ListOrdered,
  Power,
  Tag,
  X,
} from "lucide-react";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import Pagination from "../../../components/Pagination/pagination";
import GenericTable from "../../../components/Table/table";
import { assetCategoryApi } from "./assetMasterService";
import {
  ActionButtons,
  CategoryForm,
  EmptyOrError,
  SearchInput,
  SortHeader,
  StatusBadge,
} from "./AssetMasterComponents";
import { useAssetCategories } from "./useAssetMasters";
import { buildCategoryPayload, responseMessage } from "./assetMasterUtils";
import { notify } from "../utils/notify";

const defaultFilters = { categoryCode: "", categoryName: "", search: "" };

const DetailItem = ({ icon: Icon, label, value, valueClassName = "" }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
      <Icon className="h-4 w-4 text-indigo-500" />
      <span>{label}</span>
    </div>
    <div className={`text-sm font-medium text-slate-700 ${valueClassName}`}>
      {value ?? "-"}
    </div>
  </div>
);

const CategoryDetailDrawer = ({ open, record, loading, onClose, onToggle }) => {
  if (!open || !record) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-end bg-slate-950/35 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      onClick={onClose}
    >
      <div
        className={`h-full w-full max-w-xl border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                Asset Category Details
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                {record.categoryName || "Category"}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
              aria-label="Close details"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-600">
                    Current Status
                  </p>
                  <div className="mt-2 flex items-center gap-3">
                    <StatusBadge active={record.activeFlag} />
                    <p className="text-sm text-slate-600">
                      {record.activeFlag
                        ? "This category is currently available for use."
                        : "This category is currently disabled."}
                    </p>
                  </div>
                </div>
                <Button
                  variant={record.activeFlag ? "outline" : "success"}
                  className={record.activeFlag ? "border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : ""}
                  onClick={() => onToggle(record)}
                  loading={loading}
                  loadingText="Processing..."
                >
                  {record.activeFlag ? "Deactivate Category" : "Activate Category"}
                </Button>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <DetailItem
                icon={Tag}
                label="Category Code"
                value={record.categoryCode}
              />
              <DetailItem
                icon={Boxes}
                label="Category Name"
                value={record.categoryName}
              />
              <DetailItem
                icon={ListOrdered}
                label="Display Order"
                value={record.displayOrder ?? "-"}
              />
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <span>Description</span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {record.description || "No description provided."}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <Power className="h-4 w-4 text-indigo-500" />
                  <span>Current Status</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge active={record.activeFlag} />
                  <span className="text-sm text-slate-600">
                    {record.activeFlag ? "Active" : "Inactive"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetCategoryManagement = () => {
  const [filters, setFilters] = useState(defaultFilters);
  const [sort, setSort] = useState({
    sortBy: "displayOrder",
    sortDirection: "asc",
  });
  const { categories, pageInfo, setPageInfo, loading, error, refresh } =
    useAssetCategories(filters, sort);

  const [modalState, setModalState] = useState({
    open: false,
    mode: "create",
    record: null,
  });
  const [drawerState, setDrawerState] = useState({
    open: false,
    record: null,
  });
  const [confirmState, setConfirmState] = useState(null);
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const totalPages = Math.max(0, pageInfo.totalPages);

  const handleSort = (field) => {
    setSort((prev) => ({
      sortBy: field,
      sortDirection:
        prev.sortBy === field && prev.sortDirection === "asc" ? "desc" : "asc",
    }));
    setPageInfo((prev) => ({ ...prev, current: 0 }));
  };

  const openModal = (mode, record = null) => {
    setModalState({ open: true, mode, record });
    setDrawerState({ open: false, record: null });
  };

  const closeModal = () => {
    if (!saving) setModalState({ open: false, mode: "create", record: null });
  };

  const forceCloseModal = () => {
    setModalState({ open: false, mode: "create", record: null });
  };

  const openViewDrawer = (record) => {
    setDrawerState({ open: true, record });
    setModalState({ open: false, mode: "create", record: null });
  };

  const closeViewDrawer = () => {
    setDrawerState({ open: false, record: null });
  };

  const handleSave = async (values) => {
    console.log("handleSave", values);
    setSaving(true);
    try {
      const payload = buildCategoryPayload(values);
      console.log(values);
      console.log(payload);
      const response =
        modalState.mode === "edit"
          ? await assetCategoryApi.update(modalState.record.categoryId, payload)
          : await assetCategoryApi.create(payload);

      notify.success(
        responseMessage(
          response,
          modalState.mode === "edit"
            ? "Asset Category Updated Successfully"
            : "Asset Category Created Successfully",
        ),
      );
      forceCloseModal();
      refresh();
    } catch (err) {
      notify.error(err, "Failed To Save Asset Category.");
    } finally {
      setSaving(false);
    }
  };

  const requestToggle = (record) => {
    const nextActive = !record.activeFlag;
    if (record.activeFlag === nextActive) {
      notify.warning(
        `Category Is Already ${record.activeFlag ? "Enabled" : "Disabled"}.`,
      );
      return;
    }

    setConfirmState({
      type: "toggle",
      record,
      nextActive,
      title: nextActive ? "Enable Category" : "Disable Category",
      message: `Are You Sure You Want To ${nextActive ? "Enable" : "Disable"} ${record.categoryName}?`,
    });
  };

  const handleToggle = async () => {
    const { record, nextActive } = confirmState;
    setActionLoadingId(record.categoryId);
    try {
      const response = await assetCategoryApi.setActive(
        record.categoryId,
        nextActive,
      );
      notify.success(
        responseMessage(
          response,
          `Category ${nextActive ? "Enabled" : "Disabled"} Successfully`,
        ),
      );
      setConfirmState(null);
      setDrawerState((prev) =>
        prev.record && prev.record.categoryId === record.categoryId
          ? { ...prev, record: { ...prev.record, activeFlag: nextActive } }
          : prev,
      );
      refresh();
    } catch (err) {
      notify.error(
        err,
        `Failed To ${nextActive ? "Enable" : "Disable"} Category.`,
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const requestDelete = (record) => {
    setConfirmState({
      type: "delete",
      record,
      title: "Delete Category",
      message: `Are You Sure You Want To Delete ${record.categoryName}?`,
    });
  };

  const handleDelete = async () => {
    const { record } = confirmState;
    setActionLoadingId(record.categoryId);
    try {
      const response = await assetCategoryApi.delete(record.categoryId);
      notify.success(
        responseMessage(response, "Asset Category Deleted Successfully"),
      );
      setConfirmState(null);
      refresh();
    } catch (err) {
      notify.error(
        err,
        "Category cannot be deleted because it is associated with existing asset types",
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const rows = useMemo(
    () =>
      categories.map((category) => ({
        ...category,
        code_info: (
          <span className="font-semibold text-gray-900">
            {category.categoryCode}
          </span>
        ),
        name_info: (
          <span className="font-medium text-gray-800">
            {category.categoryName}
          </span>
        ),
        status_info: <StatusBadge active={category.activeFlag} />,
        actions: (
          <ActionButtons
            onView={() => openViewDrawer(category)}
            onEdit={() => openModal("edit", category)}
            onDelete={() => requestDelete(category)}
            deleteDisabled={actionLoadingId === category.categoryId}
          />
        ),
      })),
    [categories, actionLoadingId],
  );

  return (
    <div className="min-h-screen bg-gray-50/50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <span>Resource Management</span>
              <span>/</span>
              <span>Company Asset Management</span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Asset Categories
            </h1>
            <p className="text-sm text-gray-500">
              Manage category codes, names, display order, and active status.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="primary" onClick={() => openModal("create")}>
              <Plus className="h-4 w-4" /> Create Category
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/30 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Category Listing
              </h2>
              <p className="text-xs text-gray-500">
                {pageInfo.totalElements} records found
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput
                value={filters.categoryCode}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, categoryCode: value }));
                  setPageInfo((prev) => ({ ...prev, current: 0 }));
                }}
                placeholder="Search Category Code..."
              />
              <SearchInput
                value={filters.categoryName}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, categoryName: value }));
                  setPageInfo((prev) => ({ ...prev, current: 0 }));
                }}
                placeholder="Search Category Name..."
              />
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            {error && !loading ? (
              <EmptyOrError message={error} isError />
            ) : (
              <GenericTable
                loading={loading}
                headers={[
                  <SortHeader
                    label="Code"
                    field="categoryCode"
                    sort={sort}
                    onSort={handleSort}
                  />,
                  <SortHeader
                    label="Name"
                    field="categoryName"
                    sort={sort}
                    onSort={handleSort}
                  />,
                  "Status",
                  "Actions",
                ]}
                columns={["code_info", "name_info", "status_info", "actions"]}
                rows={rows}
              />
            )}
          </div>

          {totalPages > 1 && (
            <div className="border-t border-gray-100 bg-gray-50/30 p-4">
              <Pagination
                currentPage={pageInfo.current + 1}
                totalPages={totalPages}
                onPrevious={() =>
                  setPageInfo((prev) => ({
                    ...prev,
                    current: Math.max(0, prev.current - 1),
                  }))
                }
                onNext={() =>
                  setPageInfo((prev) => ({
                    ...prev,
                    current: Math.min(totalPages - 1, prev.current + 1),
                  }))
                }
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalState.open}
        onClose={closeModal}
        title={
          modalState.mode === "edit"
            ? "Edit Asset Category"
            : "Create Asset Category"
        }
        titleIcon={<Boxes className="h-5 w-5" />}
        size="2xl"
      >
        <CategoryForm
          mode={modalState.mode}
          initialData={modalState.record}
          onSubmit={handleSave}
          onCancel={closeModal}
          saving={saving}
        />
      </Modal>

      <CategoryDetailDrawer
        open={drawerState.open}
        record={drawerState.record}
        loading={Boolean(actionLoadingId)}
        onClose={closeViewDrawer}
        onToggle={requestToggle}
      />

      <Modal
        isOpen={Boolean(confirmState)}
        onClose={() => !actionLoadingId && setConfirmState(null)}
        title={confirmState?.title}
        titleIcon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
        size="md"
      >
        <div className="space-y-5">
          <p className="text-sm text-gray-600">{confirmState?.message}</p>
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              disabled={Boolean(actionLoadingId)}
              onClick={() => setConfirmState(null)}
            >
              Cancel
            </Button>
            <Button
              variant={confirmState?.type === "delete" ? "danger" : "primary"}
              loading={Boolean(actionLoadingId)}
              loadingText="Processing..."
              onClick={
                confirmState?.type === "delete" ? handleDelete : handleToggle
              }
            >
              Confirm
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AssetCategoryManagement;
