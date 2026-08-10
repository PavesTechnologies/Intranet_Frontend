import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import {
  Boxes,
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  ToggleLeft,
  ToggleRight,
  FileText,
  Tag,
  Hash,
  Package,
  PackageCheck,
  PackageX,
  Wrench,
  X,
  AlertTriangle,
  CheckCircle2,
  CircleSlash,
} from "lucide-react";
import Button from "../../../components/Button/Button";
import Modal from "../../../components/Modal/modal";
import Pagination from "../../../components/Pagination/pagination";
import GenericTable from "../../../components/Table/table";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import { assetInventoryApi, assetTypeApi, normalizePagedResponse } from "./assetMasterService";
import { useActiveAssetCategories } from "./useAssetMasters";
import { notify } from "../utils/notify";
import { EmptyOrError, SearchInput, SortHeader } from "./AssetMasterComponents";

const ASSET_STATUS_OPTIONS = ["AVAILABLE", "MAINTENANCE", "LOST", "DAMAGED", "RETIRED"];

const defaultFilters = {
  assetCode: "",
  assetName: "",
  categoryId: "",
  typeId: "",
  status: "",
  active: "",
  search: "",
};

const assetSchema = yup.object({
  assetName: yup
    .string()
    .trim()
    .required("Asset name is required")
    .max(120, "Asset name must not exceed 120 characters"),
  quantity: yup
    .number()
    .typeError("Quantity must be a number")
    .integer("Quantity must be a whole number")
    .min(1, "Quantity must be at least 1")
    .required("Quantity is required"),
  categoryId: yup.string().required("Category is required"),
  typeId: yup.string().required("Asset type is required"),
  description: yup.string().trim().max(1000, "Description must not exceed 1000 characters").nullable(),
  status: yup
    .string()
    .oneOf(ASSET_STATUS_OPTIONS, "Status is invalid")
    .required("Status is required"),
  activeFlag: yup.boolean(),
});

const getAssetId = (asset) => asset?.assetId ?? asset?.id;

const getAssetActiveFlag = (asset = {}) => {
  if (typeof asset.activeFlag === "boolean") return asset.activeFlag;
  if (typeof asset.isActive === "boolean") return asset.isActive;
  if (typeof asset.active === "boolean") return asset.active;
  return true;
};

const normalizeSerialNumbers = (asset = {}) => {
  const serials = asset.serialNumbers ?? asset.serialNumberList ?? asset.serialNumber ?? [];
  if (Array.isArray(serials)) return serials.filter(Boolean);
  return String(serials)
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
};

const normalizeAsset = (asset = {}) => ({
  ...asset,
  assetId: getAssetId(asset),
  assetCode: asset.assetCode ?? asset.code ?? "",
  assetName: asset.assetName ?? asset.name ?? "",
  categoryId: asset.categoryId ?? asset.assetCategoryId ?? asset.category?.categoryId ?? "",
  categoryName: asset.categoryName ?? asset.category?.categoryName ?? asset.category?.name ?? "",
  typeId: asset.typeId ?? asset.assetTypeId ?? asset.type?.typeId ?? "",
  typeName: asset.typeName ?? asset.type?.typeName ?? asset.type?.name ?? "",
  quantity: asset.quantity ?? 0,
  status: asset.status ?? "AVAILABLE",
  activeFlag: getAssetActiveFlag(asset),
  description: asset.description ?? "",
  serialNumbers: normalizeSerialNumbers(asset),
  requiresSerialNumber: Boolean(asset.requiresSerialNumber ?? asset.serialNumberRequired ?? asset.category?.requiresSerialNumber ?? asset.category?.serialNumberRequired ?? false),
  createdAt: asset.createdAt ?? asset.createdDate ?? "",
  updatedAt: asset.updatedAt ?? asset.updatedDate ?? "",
});

const StatusBadge = ({ status }) => {
  const map = {
    AVAILABLE: "border-emerald-200 bg-emerald-50 text-emerald-700",
    MAINTENANCE: "border-amber-200 bg-amber-50 text-amber-700",
    LOST: "border-rose-200 bg-rose-50 text-rose-700",
    DAMAGED: "border-orange-200 bg-orange-50 text-orange-700",
    RETIRED: "border-slate-300 bg-slate-50 text-slate-700",
  };

  return (
    <span className={`inline-flex min-w-[92px] items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold ${map[status] || "border-slate-200 bg-slate-50 text-slate-600"}`}>
      {status || "UNKNOWN"}
    </span>
  );
};

const DetailField = ({ label, value }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</div>
    <div className="text-sm font-medium text-slate-700">{value ?? "-"}</div>
  </div>
);

const AssetDetailDrawer = ({ open, record, loading, onClose, onEdit }) => {
  if (!open || !record) return null;

  return (
    <div className={`fixed inset-0 z-50 flex justify-end bg-slate-950/35 transition-opacity duration-300 ${open ? "opacity-100" : "pointer-events-none opacity-0"}`} onClick={onClose}>
      <div className={`h-full w-full max-w-2xl border-l border-slate-200 bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "translate-x-full"}`} onClick={(event) => event.stopPropagation()}>
        <div className="flex h-full flex-col">
          <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Asset Inventory</p>
              <h2 className="mt-1 text-2xl font-semibold text-slate-900">{record.assetName || "-"}</h2>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                  <Hash className="h-4 w-4 text-indigo-500" />
                  {record.assetCode || "-"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {record.activeFlag ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="primary" onClick={() => onEdit && onEdit(record)}>
                Edit
              </Button>
              <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700" aria-label="Close details">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {loading && <div className="mb-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm font-medium text-indigo-700">Refreshing asset details...</div>}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <DetailField label="Category" value={record.categoryName || "-"} />
              <DetailField label="Asset Type" value={record.typeName || "-"} />
              <DetailField label="Quantity" value={record.quantity ?? "-"} />
              <DetailField label="Status" value={<StatusBadge status={record.status} />} />
              <DetailField label="Active" value={record.activeFlag ? "Yes" : "No"} />
            </div>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                <FileText className="h-4 w-4 text-indigo-500" />
                <span>Description</span>
              </div>
              <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{record.description || "No description provided."}</p>
            </div>

            {record.requiresSerialNumber && (
              <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
                <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <Package className="h-4 w-4 text-indigo-500" />
                  <span>Serial Numbers</span>
                </div>
                {record.serialNumbers?.length ? (
                  <ul className="space-y-2 text-sm text-slate-700">
                    {record.serialNumbers.map((serial) => (
                      <li key={serial} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">{serial}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">No serial numbers recorded.</p>
                )}
              </div>
            )}

            {(record.createdAt || record.updatedAt) && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <DetailField label="Created At" value={record.createdAt || "-"} />
                <DetailField label="Updated At" value={record.updatedAt || "-"} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetInventoryManagement = () => {
  const { categories, loading: categoriesLoading } = useActiveAssetCategories();
  const [filters, setFilters] = useState(defaultFilters);
  const [sort, setSort] = useState({ sortBy: "assetName", sortDirection: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize] = useState(8);
  const [assets, setAssets] = useState([]);
  const [pageInfo, setPageInfo] = useState({ totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [detailLoading, setDetailLoading] = useState(false);
  const [modalState, setModalState] = useState({ isOpen: false, mode: "create", record: null });
  const [drawerState, setDrawerState] = useState({ open: false, record: null });
  const [confirmState, setConfirmState] = useState(null);
  const [statusModalState, setStatusModalState] = useState({ open: false, record: null, value: "AVAILABLE" });
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [availableTypes, setAvailableTypes] = useState([]);
  const [typesLoading, setTypesLoading] = useState(false);

  const fetchTypesForCategory = useCallback(async (categoryId) => {
    if (!categoryId) {
      setAvailableTypes([]);
      return;
    }

    setTypesLoading(true);
    try {
      const response = await assetTypeApi.search({
        page: 0,
        size: 100,
        sortBy: "typeName",
        sortDirection: "asc",
        categoryId,
      });
      const page = normalizePagedResponse(response);
      setAvailableTypes(page.records.map((item) => ({ ...item, typeId: item.typeId ?? item.id })));
    } catch (err) {
      setAvailableTypes([]);
      notify.error(err, "Failed To Load Asset Types.");
    } finally {
      setTypesLoading(false);
    }
  }, []);

  const fetchAssets = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await assetInventoryApi.search({
        page: page - 1,
        size: pageSize,
        sortBy: sort.sortBy,
        sortDirection: sort.sortDirection,
        assetCode: filters.assetCode || "",
        assetName: filters.assetName || "",
        categoryId: filters.categoryId || "",
        typeId: filters.typeId || "",
        status: filters.status || "",
        search: filters.search || "",
        active: filters.active === "" ? undefined : filters.active === "true",
      });
      const pageData = normalizePagedResponse(response);
      setAssets(pageData.records.map(normalizeAsset));
      setPageInfo({
        totalElements: pageData.totalElements,
        totalPages: pageData.totalPages,
      });
    } catch (err) {
      setAssets([]);
      setPageInfo({ totalElements: 0, totalPages: 0 });
      setError("Failed To Load Asset Inventory.");
      notify.error(err, "Failed To Load Asset Inventory.");
    } finally {
      setLoading(false);
    }
  }, [filters, page, pageSize, sort]);

  useEffect(() => {
    const timeout = setTimeout(() => fetchAssets(), 350);
    return () => clearTimeout(timeout);
  }, [fetchAssets]);

  useEffect(() => {
    if (filters.categoryId) {
      fetchTypesForCategory(filters.categoryId);
    } else {
      setAvailableTypes([]);
    }
  }, [filters.categoryId, fetchTypesForCategory]);

  const handleSort = (field) => {
    setSort((prev) => ({
      sortBy: field,
      sortDirection: prev.sortBy === field && prev.sortDirection === "asc" ? "desc" : "asc",
    }));
    setPage(1);
  };

  const openCreateModal = () => {
    setModalState({ isOpen: true, mode: "create", record: null });
    setDrawerState({ open: false, record: null });
    setAvailableTypes([]);
  };

  const openEditModal = (record) => {
    setModalState({ isOpen: true, mode: "edit", record });
    setDrawerState({ open: false, record: null });
    if (record.categoryId) {
      fetchTypesForCategory(record.categoryId);
    }
  };

  const closeModal = () => {
    if (!saving) {
      setModalState({ isOpen: false, mode: "create", record: null });
    }
  };

  const openViewDrawer = async (record) => {
    setDrawerState({ open: true, record });
    setModalState({ isOpen: false, mode: "create", record: null });

    if (!record?.assetId) return;

    setDetailLoading(true);
    try {
      const response = await assetInventoryApi.getById(record.assetId);
      setDrawerState({ open: true, record: normalizeAsset(response?.data ?? response) });
    } catch (err) {
      notify.error(err, "Failed To Load Asset Details.");
    } finally {
      setDetailLoading(false);
    }
  };

  const closeViewDrawer = () => {
    setDrawerState({ open: false, record: null });
  };

  const requestDelete = (record) => {
    setConfirmState({
      type: "delete",
      record,
      title: "Delete Asset",
      message: `Are you sure you want to delete ${record.assetName}?`,
    });
  };

  const requestToggleActive = (record) => {
    setConfirmState({
      type: "toggleActive",
      record,
      title: record.activeFlag ? "Disable Asset" : "Enable Asset",
      message: `Are you sure you want to ${record.activeFlag ? "disable" : "enable"} ${record.assetName}?`,
    });
  };

  const openStatusModal = (record) => {
    setStatusModalState({ open: true, record, value: record.status || "AVAILABLE" });
  };

  const handleDelete = async () => {
    const { record } = confirmState;
    setActionLoadingId(record.assetId);
    try {
      await assetInventoryApi.delete(record.assetId);
      notify.success("Asset deleted successfully.");
      setConfirmState(null);
      fetchAssets();
    } catch (err) {
      notify.error(err, "Failed To Delete Asset.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleActive = async () => {
    const { record } = confirmState;
    setActionLoadingId(record.assetId);
    try {
      await assetInventoryApi.toggleActive(record.assetId, !record.activeFlag);
      notify.success(`Asset ${record.activeFlag ? "disabled" : "enabled"} successfully.`);
      setConfirmState(null);
      setAssets((prev) => prev.map((item) => (item.assetId === record.assetId ? { ...item, activeFlag: !record.activeFlag } : item)));
      setDrawerState((prev) => (prev.record?.assetId === record.assetId ? { ...prev, record: { ...prev.record, activeFlag: !record.activeFlag } } : prev));
    } catch (err) {
      notify.error(err, "Failed To Update Asset Active State.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleStatusSave = async () => {
    const { record, value } = statusModalState;
    if (!record) return;
    setActionLoadingId(record.assetId);
    try {
      await assetInventoryApi.updateStatus(record.assetId, value);
      notify.success("Asset status updated successfully.");
      setStatusModalState({ open: false, record: null, value: "AVAILABLE" });
      setAssets((prev) => prev.map((item) => (item.assetId === record.assetId ? { ...item, status: value } : item)));
      setDrawerState((prev) => (prev.record?.assetId === record.assetId ? { ...prev, record: { ...prev.record, status: value } } : prev));
    } catch (err) {
      notify.error(err, "Failed To Update Asset Status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const rows = useMemo(() => assets.map((asset) => ({
    ...asset,
    code_info: <span className="font-semibold text-gray-900">{asset.assetCode || "-"}</span>,
    name_info: <span className="font-medium text-gray-800">{asset.assetName || "-"}</span>,
    category_info: <span className="font-medium text-gray-800">{asset.categoryName || "-"}</span>,
    type_info: <span className="font-medium text-gray-800">{asset.typeName || "-"}</span>,
    quantity_info: <span className="font-medium text-gray-800">{asset.quantity ?? 0}</span>,
    status_info: <StatusBadge status={asset.status} />,
    active_info: <span className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold ${asset.activeFlag ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}><span className={`h-2 w-2 rounded-full ${asset.activeFlag ? "bg-emerald-500" : "bg-slate-400"}`} />{asset.activeFlag ? "Yes" : "No"}</span>,
    actions: (
      <div className="flex justify-end gap-2">
        <button type="button" onClick={(event) => { event.stopPropagation(); openViewDrawer(asset); }} className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900" title="View">
          <Eye size={16} />
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); openEditModal(asset); }} className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800" title="Edit">
          <Pencil size={16} />
        </button>
        <button type="button" onClick={(event) => { event.stopPropagation(); requestDelete(asset); }} className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800" title="Delete">
          <Trash2 size={16} />
        </button>
        <button type="button" disabled={actionLoadingId === asset.assetId} onClick={(event) => { event.stopPropagation(); requestToggleActive(asset); }} className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50 hover:text-emerald-800" title={asset.activeFlag ? "Disable" : "Enable"}>
          {asset.activeFlag ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
        </button>
        <button type="button" disabled={actionLoadingId === asset.assetId} onClick={(event) => { event.stopPropagation(); openStatusModal(asset); }} className="rounded-lg p-2 text-amber-600 transition-colors hover:bg-amber-50 hover:text-amber-800" title="Update status">
          <Wrench size={16} />
        </button>
      </div>
    ),
  })), [actionLoadingId, assets]);

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
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Asset Inventory</h1>
            <p className="mt-1 text-sm text-gray-500">Manage company assets, statuses, lifecycle, and activation state from a single workspace.</p>
          </div>
          <Button variant="primary" onClick={openCreateModal}>
            <Plus className="h-4 w-4" /> Create Asset
          </Button>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-gray-100 bg-gray-50/30 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Inventory Listing</h2>
              <p className="text-xs text-gray-500">{pageInfo.totalElements} records found</p>
            </div>
            <div className="flex flex-col gap-3 lg:flex-row">
              <SearchInput value={filters.search} onChange={(value) => { setFilters((prev) => ({ ...prev, search: value })); setPage(1); }} placeholder="Search by code, name, or description..." />
              <input value={filters.assetCode} onChange={(event) => { setFilters((prev) => ({ ...prev, assetCode: event.target.value })); setPage(1); }} placeholder="Asset Code" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-40" />
              <input value={filters.assetName} onChange={(event) => { setFilters((prev) => ({ ...prev, assetName: event.target.value })); setPage(1); }} placeholder="Asset Name" className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-40" />
              <select value={filters.categoryId} onChange={(event) => { setFilters((prev) => ({ ...prev, categoryId: event.target.value, typeId: "" })); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-48">
                <option value="">All Categories</option>
                {categories.map((category) => (
                  <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>
                ))}
              </select>
              <select value={filters.typeId} onChange={(event) => { setFilters((prev) => ({ ...prev, typeId: event.target.value })); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-48" disabled={!filters.categoryId || typesLoading}>
                <option value="">All Types</option>
                {availableTypes.map((type) => (
                  <option key={type.typeId} value={type.typeId}>{type.typeName}</option>
                ))}
              </select>
              <select value={filters.status} onChange={(event) => { setFilters((prev) => ({ ...prev, status: event.target.value })); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-40">
                <option value="">All Status</option>
                {ASSET_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
              <select value={filters.active} onChange={(event) => { setFilters((prev) => ({ ...prev, active: event.target.value })); setPage(1); }} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 lg:w-36">
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto p-4">
            {loading ? (
              <GenericTable loading headers={[<SortHeader label="Asset Code" field="assetCode" sort={sort} onSort={handleSort} />, <SortHeader label="Asset Name" field="assetName" sort={sort} onSort={handleSort} />, "Category", "Type", "Quantity", "Status", "Active", "Actions"]} columns={["code_info", "name_info", "category_info", "type_info", "quantity_info", "status_info", "active_info", "actions"]} rows={[]} />
            ) : error && !loading ? (
              <EmptyOrError message={error} isError />
            ) : (
              <GenericTable headers={[<SortHeader label="Asset Code" field="assetCode" sort={sort} onSort={handleSort} />, <SortHeader label="Asset Name" field="assetName" sort={sort} onSort={handleSort} />, "Category", "Type", "Quantity", "Status", "Active", "Actions"]} columns={["code_info", "name_info", "category_info", "type_info", "quantity_info", "status_info", "active_info", "actions"]} rows={rows} />
            )}
          </div>

          {pageInfo.totalPages > 1 && (
            <div className="border-t border-gray-100 bg-gray-50/30 p-4">
              <Pagination currentPage={page} totalPages={pageInfo.totalPages} onPrevious={() => setPage((prev) => Math.max(1, prev - 1))} onNext={() => setPage((prev) => Math.min(pageInfo.totalPages, prev + 1))} />
            </div>
          )}
        </div>

        <Modal isOpen={modalState.isOpen} title={modalState.mode === "edit" ? "Edit Asset" : "Create Asset"} onClose={closeModal} size="3xl">
          <AssetForm
            mode={modalState.mode}
            initialData={modalState.record}
            categories={categories}
            categoryLoading={categoriesLoading}
            assetTypes={availableTypes}
            typesLoading={typesLoading}
            onSubmit={async (values) => {
              setSaving(true);
              try {
                const payload = {
                  assetName: values.assetName.trim(),
                  quantity: Number(values.quantity),
                  categoryId: values.categoryId,
                  assetCategoryId: values.categoryId,
                  category: { categoryId: values.categoryId },
                  typeId: values.typeId,
                  assetTypeId: values.typeId,
                  type: { typeId: values.typeId },
                  description: values.description?.trim() || "",
                  status: values.status,
                  activeFlag: Boolean(values.activeFlag),
                  serialNumbers: values.serialNumbers
                    .split(/\n|,/)
                    .map((item) => item.trim())
                    .filter(Boolean),
                };

                if (modalState.mode === "edit") {
                  await assetInventoryApi.update(modalState.record.assetId, payload);
                  notify.success("Asset updated successfully.");
                } else {
                  await assetInventoryApi.create(payload);
                  notify.success("Asset created successfully.");
                }
                closeModal();
                setPage(1);
                fetchAssets();
              } catch (err) {
                notify.error(err, modalState.mode === "edit" ? "Failed To Update Asset." : "Failed To Create Asset.");
              } finally {
                setSaving(false);
              }
            }}
            onCancel={closeModal}
            saving={saving}
            setCategoryTypeOptions={fetchTypesForCategory}
          />
        </Modal>

        <AssetDetailDrawer open={drawerState.open} record={drawerState.record} loading={detailLoading} onClose={closeViewDrawer} onEdit={(record) => openEditModal(record)} />

        <ConfirmationModal isOpen={Boolean(confirmState)} title={confirmState?.title || "Confirm Action"} message={confirmState?.message || "Are you sure?"} onConfirm={confirmState?.type === "delete" ? handleDelete : handleToggleActive} onCancel={() => setConfirmState(null)} isLoading={actionLoadingId !== null} confirmText={confirmState?.type === "delete" ? "Delete" : (confirmState?.record?.activeFlag ? "Disable" : "Enable")} variant={confirmState?.type === "delete" ? "danger" : "success"} />

        <Modal isOpen={statusModalState.open} title="Update Asset Status" onClose={() => setStatusModalState({ open: false, record: null, value: "AVAILABLE" })} size="md">
          <div className="space-y-4 p-2">
            <label className="block text-sm font-semibold text-slate-700">Status</label>
            <select value={statusModalState.value} onChange={(event) => setStatusModalState((prev) => ({ ...prev, value: event.target.value }))} className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100">
              {ASSET_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
            </select>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setStatusModalState({ open: false, record: null, value: "AVAILABLE" })}>Cancel</Button>
              <Button variant="primary" onClick={handleStatusSave} loading={actionLoadingId !== null}>Save Status</Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

const AssetForm = ({ mode, initialData, categories, categoryLoading, assetTypes, typesLoading, onSubmit, onCancel, saving, setCategoryTypeOptions }) => {
  const readOnly = mode === "view";
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(assetSchema),
    defaultValues: {
      assetName: "",
      quantity: 1,
      categoryId: "",
      typeId: "",
      description: "",
      status: "AVAILABLE",
      activeFlag: true,
      serialNumbers: "",
    },
  });

  const selectedCategoryId = watch("categoryId");
  const selectedCategory = categories.find((item) => String(item.categoryId) === String(selectedCategoryId));
  const requiresSerialNumber = Boolean(selectedCategory?.requiresSerialNumber || selectedCategory?.serialNumberRequired || false);
  const serialNumbersValue = watch("serialNumbers");

  useEffect(() => {
    reset({
      assetName: initialData?.assetName || "",
      quantity: initialData?.quantity ?? 1,
      categoryId: initialData?.categoryId || initialData?.assetCategoryId || "",
      typeId: initialData?.typeId || initialData?.assetTypeId || "",
      description: initialData?.description || "",
      status: initialData?.status || "AVAILABLE",
      activeFlag: initialData?.activeFlag ?? initialData?.active ?? true,
      serialNumbers: (initialData?.serialNumbers || []).join("\n") || "",
    });
  }, [initialData, reset]);

  useEffect(() => {
    if (selectedCategoryId) {
      setCategoryTypeOptions(selectedCategoryId);
      setValue("typeId", "");
    }
  }, [selectedCategoryId, setCategoryTypeOptions, setValue]);

  useEffect(() => {
    if (initialData?.typeId || initialData?.assetTypeId) {
      setValue("typeId", initialData.typeId || initialData.assetTypeId || "");
    }
  }, [initialData, setValue]);

  const handleFormSubmit = (values) => {
    if (requiresSerialNumber) {
      const serialNumbers = values.serialNumbers
        .split(/\n|,/)
        .map((item) => item.trim())
        .filter(Boolean);

      if (serialNumbers.length === 0) {
        setValue("serialNumbers", values.serialNumbers, { shouldDirty: true, shouldValidate: true });
        notify.warning("Please add at least one serial number for this category.");
        return;
      }
    }

    onSubmit(values);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 p-2">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Asset Name <span className="text-red-500">*</span></label>
          <input {...register("assetName")} readOnly={readOnly} className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm ${errors.assetName ? "border-red-400 bg-red-50/40" : "border-slate-200 bg-white"}`} placeholder="e.g. MacBook Pro 14" />
          {errors.assetName && <p className="text-xs font-medium text-red-500">{errors.assetName.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Quantity <span className="text-red-500">*</span></label>
          <input type="number" min="1" {...register("quantity", { valueAsNumber: true })} readOnly={readOnly} className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm ${errors.quantity ? "border-red-400 bg-red-50/40" : "border-slate-200 bg-white"}`} />
          {errors.quantity && <p className="text-xs font-medium text-red-500">{errors.quantity.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Category <span className="text-red-500">*</span></label>
          <select {...register("categoryId")} readOnly={readOnly} className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm ${errors.categoryId ? "border-red-400 bg-red-50/40" : "border-slate-200 bg-white"}`}>
            <option value="">Select category</option>
            {categories.map((category) => <option key={category.categoryId} value={category.categoryId}>{category.categoryName}</option>)}
          </select>
          {errors.categoryId && <p className="text-xs font-medium text-red-500">{errors.categoryId.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Asset Type <span className="text-red-500">*</span></label>
          <select {...register("typeId")} readOnly={readOnly} disabled={typesLoading || !selectedCategoryId} className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm ${errors.typeId ? "border-red-400 bg-red-50/40" : "border-slate-200 bg-white"}`}>
            <option value="">{selectedCategoryId ? "Select type" : "Select category first"}</option>
            {assetTypes.map((type) => <option key={type.typeId} value={type.typeId}>{type.typeName}</option>)}
          </select>
          {errors.typeId && <p className="text-xs font-medium text-red-500">{errors.typeId.message}</p>}
        </div>
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Status <span className="text-red-500">*</span></label>
          <select {...register("status")} readOnly={readOnly} className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm ${errors.status ? "border-red-400 bg-red-50/40" : "border-slate-200 bg-white"}`}>
            {ASSET_STATUS_OPTIONS.map((status) => <option key={status} value={status}>{status}</option>)}
          </select>
          {errors.status && <p className="text-xs font-medium text-red-500">{errors.status.message}</p>}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-slate-700">Active</p>
            <p className="text-xs text-slate-500">Enable or disable asset availability.</p>
          </div>
          <input type="checkbox" {...register("activeFlag")} className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-semibold text-slate-700">Description</label>
        <textarea {...register("description")} readOnly={readOnly} rows={4} className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Add helpful context about the asset." />
      </div>

      {requiresSerialNumber && (
        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Serial Numbers <span className="text-red-500">*</span></label>
          <textarea {...register("serialNumbers")} rows={5} className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100" placeholder="Enter serial numbers separated by comma or newline" />
          <p className="text-xs text-slate-500">This category requires serial numbers. Add one per line or comma-separated.</p>
        </div>
      )}

      <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
        <Button variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary" loading={saving}>Save Asset</Button>
      </div>
    </form>
  );
};

export default AssetInventoryManagement;






