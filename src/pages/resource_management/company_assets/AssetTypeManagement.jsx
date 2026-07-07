import React, { useMemo, useState } from "react";
import { Layers3, Plus, RefreshCcw, AlertTriangle } from "lucide-react";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import Pagination from "../../../components/Pagination/pagination";
import GenericTable from "../../../components/Table/table";
import { assetTypeApi } from "./assetMasterService";
import {
  ActionButtons,
  EmptyOrError,
  SearchInput,
  SortHeader,
  StatusBadge,
  TypeForm,
} from "./AssetMasterComponents";
import { useActiveAssetCategories, useAssetTypes } from "./useAssetMasters";
import {
  buildTypePayload,
  responseMessage,
} from "./assetMasterUtils";
import { notify } from "../utils/notify";

const AssetTypeManagement = () => {
  const [filters, setFilters] = useState({ search: "", categoryId: "" });
  const [sort, setSort] = useState({ sortBy: "displayOrder", sortDirection: "asc" });
  const { types, pageInfo, setPageInfo, loading, error, refresh } =
    useAssetTypes(filters, sort);
  const {
    categories,
    loading: categoriesLoading,
    refresh: refreshCategories,
  } = useActiveAssetCategories();

  const [modalState, setModalState] = useState({ open: false, mode: "create", record: null });
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
    if (mode !== "view") refreshCategories();
    setModalState({ open: true, mode, record });
  };

  const closeModal = () => {
    if (!saving) setModalState({ open: false, mode: "create", record: null });
  };

  const forceCloseModal = () => {
    setModalState({ open: false, mode: "create", record: null });
  };

  const requestDelete = (record) => {
    setConfirmState({
      record,
      title: "Delete Asset Type",
      message: `Are You Sure You Want To Delete ${record.typeName}?`,
    });
  };

  const handleDelete = async () => {
    const { record } = confirmState;
    setActionLoadingId(record.typeId);
    try {
      const response = await assetTypeApi.delete(record.typeId);
      notify.success(responseMessage(response, "Asset Type Deleted Successfully"));
      setConfirmState(null);
      refresh();
    } catch (err) {
      notify.error(err, "Failed To Delete Asset Type.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSave = async (values) => {
    setSaving(true);
    try {
      const payload = buildTypePayload(values);
      const response =
        modalState.mode === "edit"
          ? await assetTypeApi.update(modalState.record.typeId, payload)
          : await assetTypeApi.create(payload);

      notify.success(
        responseMessage(
          response,
          modalState.mode === "edit"
            ? "Asset Type Updated Successfully"
            : "Asset Type Created Successfully",
        ),
      );
      forceCloseModal();
      refresh();
    } catch (err) {
      notify.error(err, "Failed To Save Asset Type.");
    } finally {
      setSaving(false);
    }
  };

  const rows = useMemo(
    () =>
      types.map((type) => ({
        ...type,
        category_info: (
          <span className="font-medium text-gray-800">
            {type.categoryName || "-"}
          </span>
        ),
        code_info: <span className="font-semibold text-gray-900">{type.typeCode}</span>,
        name_info: <span className="font-medium text-gray-800">{type.typeName}</span>,
        description_info: (
          <span className="line-clamp-2 max-w-md text-sm text-gray-600">
            {type.description || "-"}
          </span>
        ),
        display_order_info: <span className="font-medium">{type.displayOrder ?? "-"}</span>,
        status_info: <StatusBadge active={type.activeFlag} />,
        actions: (
          <ActionButtons
            onView={() => openModal("view", type)}
            onEdit={() => openModal("edit", type)}
            onDelete={() => requestDelete(type)}
            deleteDisabled={actionLoadingId === type.typeId}
          />
        ),
      })),
    [types, actionLoadingId],
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
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Asset Types</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage asset type codes, active status, and category mapping.
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={refresh} disabled={loading}>
              <RefreshCcw className="h-4 w-4" /> Refresh
            </Button>
            <Button variant="primary" onClick={() => openModal("create")}>
              <Plus className="h-4 w-4" /> Create Type
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/30 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Type Listing</h2>
              <p className="text-xs text-gray-500">{pageInfo.totalElements} records found</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <SearchInput
                value={filters.search}
                onChange={(value) => {
                  setFilters((prev) => ({ ...prev, search: value }));
                  setPageInfo((prev) => ({ ...prev, current: 0 }));
                }}
                placeholder="Search Type Code Or Name..."
              />
              <select
                value={filters.categoryId}
                onChange={(event) => {
                  setFilters((prev) => ({ ...prev, categoryId: event.target.value }));
                  setPageInfo((prev) => ({ ...prev, current: 0 }));
                }}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:w-72"
              >
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>
                    {category.categoryCode} - {category.categoryName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            {error && !loading ? (
              <EmptyOrError message={error} isError />
            ) : (
              <GenericTable
                loading={loading}
                headers={[
                  "Category",
                  <SortHeader label="Type Code" field="typeCode" sort={sort} onSort={handleSort} />,
                  <SortHeader label="Type Name" field="typeName" sort={sort} onSort={handleSort} />,
                  "Description",
                  <SortHeader label="Display Order" field="displayOrder" sort={sort} onSort={handleSort} />,
                  "Status",
                  "Actions",
                ]}
                columns={[
                  "category_info",
                  "code_info",
                  "name_info",
                  "description_info",
                  "display_order_info",
                  "status_info",
                  "actions",
                ]}
                rows={rows}
              />
            )}
          </div>

          {totalPages > 1 && (
            <div className="border-t border-gray-100 bg-gray-50/30 p-4">
              <Pagination
                currentPage={pageInfo.current + 1}
                totalPages={totalPages}
                onPrevious={() => setPageInfo((prev) => ({ ...prev, current: Math.max(0, prev.current - 1) }))}
                onNext={() => setPageInfo((prev) => ({ ...prev, current: Math.min(totalPages - 1, prev.current + 1) }))}
              />
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={modalState.open}
        onClose={closeModal}
        title={
          modalState.mode === "view"
            ? "View Asset Type"
            : modalState.mode === "edit"
              ? "Edit Asset Type"
              : "Create Asset Type"
        }
        titleIcon={<Layers3 className="h-5 w-5" />}
        size="2xl"
      >
        <TypeForm
          mode={modalState.mode}
          initialData={modalState.record}
          categories={categories}
          categoriesLoading={categoriesLoading}
          onSubmit={handleSave}
          onCancel={closeModal}
          saving={saving}
        />
      </Modal>

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
            <Button variant="outline" disabled={Boolean(actionLoadingId)} onClick={() => setConfirmState(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={Boolean(actionLoadingId)}
              loadingText="Deleting..."
              onClick={handleDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Modal>    </div>
  );
};

export default AssetTypeManagement;
