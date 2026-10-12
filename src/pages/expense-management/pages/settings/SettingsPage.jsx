import React, { useMemo, useState } from "react";
import { AlertCircle, Pencil, Plus, RotateCcw, SlidersHorizontal, Trash2 } from "lucide-react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import { PageCard, PageCardContent } from "@/components/Cards/PageCard";
import GenericTable from "@/components/Table/table";
import Button from "@/components/Button/Button";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import LoadingSpinner from "@/components/LoadingSpinner";
import { showStatusToast } from "@/components/toastfy/toast";
import EmployeeLabel from "../../approval-engine/components/EmployeeLabel";
import { formatDateTime } from "../../approval-engine/constants/approvalLabels";
import CatalogSettingModal from "./CatalogSettingModal";
import CustomSettingModal from "./CustomSettingModal";
import { CATALOG_KEYS, SETTINGS_CATALOG, SETTING_TYPES, formatSettingValue } from "./settingsCatalog";
import {
  useDeleteSystemConfiguration,
  useSaveSystemConfiguration,
  useSystemConfigurations,
} from "./useSystemConfigurations";

const breadcrumbs = [
  { label: "Expense Management", to: "/expense-management/dashboard" },
  { label: "Settings" },
];

const TOTAL_CATALOG_SETTINGS = CATALOG_KEYS.size;

const errorMessage = (err, fallback) => err?.response?.data?.message || fallback;

function SettingValue({ setting, row }) {
  if (!row) {
    const text =
      setting.defaultValue === null ? setting.defaultLabel : formatSettingValue(setting, setting.defaultValue);
    return <span className="text-sm text-gray-500">Default: {text}</span>;
  }

  return (
    <div className="min-w-0">
      {setting.type === SETTING_TYPES.EMPLOYEE ? (
        <EmployeeLabel employeeId={row.configValue} showIdSubtext className="text-sm text-gray-900" />
      ) : (
        <span className="block break-words text-sm font-medium text-gray-900">
          {formatSettingValue(setting, row.configValue)}
        </span>
      )}
      {row.updatedAt || row.createdAt ? (
        <span className="mt-0.5 block text-xs text-gray-400">Updated {formatDateTime(row.updatedAt || row.createdAt)}</span>
      ) : null}
    </div>
  );
}

function SettingRow({ setting, row, onEdit, onReset }) {
  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:px-5 lg:flex-row lg:items-center lg:gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-900">{setting.label}</h3>
          {row ? (
            <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">Custom</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-gray-500">{setting.description}</p>
        <p className="mt-1 break-all font-mono text-[11px] text-gray-400">{setting.key}</p>
      </div>

      <div className="min-w-0 lg:w-64 lg:shrink-0">
        <SettingValue setting={setting} row={row} />
      </div>

      <div className="flex flex-wrap gap-2 lg:w-56 lg:shrink-0 lg:justify-end">
        <Button type="button" variant="outline" size="small" onClick={() => onEdit(setting)}>
          <Pencil size={14} />
          Edit
        </Button>
        {row ? (
          <Button type="button" variant="outline" size="small" onClick={() => onReset(setting, row)}>
            <RotateCcw size={14} />
            Reset to default
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export default function SettingsPage() {
  const { data, isLoading, isError, refetch, isFetching } = useSystemConfigurations();
  const saveMutation = useSaveSystemConfiguration();
  const deleteMutation = useDeleteSystemConfiguration();

  const [editingSetting, setEditingSetting] = useState(null);
  // { row } for edit, { row: null } for add, null when closed
  const [customModal, setCustomModal] = useState(null);
  // { kind: "reset" | "delete", row, label }
  const [confirmTarget, setConfirmTarget] = useState(null);

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const rowsByKey = useMemo(() => new Map(rows.map((r) => [r.configKey, r])), [rows]);
  const otherRows = useMemo(
    () =>
      rows
        .filter((r) => !CATALOG_KEYS.has(r.configKey))
        .sort((a, b) => (a.configKey || "").localeCompare(b.configKey || "")),
    [rows]
  );
  const customisedCount = rows.length - otherRows.length;

  const handleCatalogSave = async (setting, row, value) => {
    const payload = {
      configKey: setting.key,
      configValue: String(value),
      dataType: setting.type,
      description: setting.description,
    };
    try {
      await saveMutation.mutateAsync({ id: row?.configId, payload });
      showStatusToast(`${setting.label} saved.`, "success");
      setEditingSetting(null);
    } catch (err) {
      showStatusToast(errorMessage(err, "Failed to save setting."), "error");
    }
  };

  const handleCustomSave = async (row, payload) => {
    try {
      await saveMutation.mutateAsync({ id: row?.configId, payload });
      showStatusToast(row ? "Setting updated." : "Setting added.", "success");
      setCustomModal(null);
    } catch (err) {
      showStatusToast(errorMessage(err, "Failed to save setting."), "error");
    }
  };

  const handleConfirm = async () => {
    if (!confirmTarget) return;
    const { kind, row, label } = confirmTarget;
    try {
      await deleteMutation.mutateAsync(row.configId);
      showStatusToast(kind === "reset" ? `${label} reset to default.` : "Setting deleted.", "success");
      setConfirmTarget(null);
    } catch (err) {
      showStatusToast(
        errorMessage(err, kind === "reset" ? "Failed to reset setting." : "Failed to delete setting."),
        "error"
      );
    }
  };

  const otherHeaders = ["Key", "Value", "Type", "Description", "Updated", "Actions"];
  const otherColumns = ["key", "value", "type", "description", "updated", "actions"];
  const otherTableRows = otherRows.map((row) => ({
    key: <span className="break-all font-mono text-xs text-gray-800">{row.configKey}</span>,
    value: <span className="break-words">{row.configValue === null || row.configValue === "" ? "—" : row.configValue}</span>,
    type: row.dataType || "—",
    description: row.description || "—",
    updated: formatDateTime(row.updatedAt || row.createdAt),
    actions: (
      <div className="flex items-center justify-center gap-1">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Edit Setting"
          aria-label="Edit Setting"
          className="h-8 w-8 rounded-md p-0 text-blue-600 transition hover:bg-blue-50 hover:text-blue-800"
          onClick={() => setCustomModal({ row })}
        >
          <Pencil size={16} />
        </Button>
        <Button
          type="button"
          variant="link"
          size="icon"
          title="Delete Setting"
          aria-label="Delete Setting"
          className="h-8 w-8 rounded-md p-0 text-red-600 transition hover:bg-red-50 hover:text-red-800"
          onClick={() => setConfirmTarget({ kind: "delete", row, label: row.configKey })}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    ),
  }));

  const renderBody = () => {
    if (isLoading) {
      return (
        <PageCard>
          <PageCardContent className="py-16">
            <LoadingSpinner text="Loading settings..." />
          </PageCardContent>
        </PageCard>
      );
    }

    if (isError) {
      return (
        <PageCard>
          <PageCardContent className="flex flex-col items-center justify-center py-16 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-red-300" />
            <h2 className="text-sm font-semibold text-gray-700">Failed to load settings</h2>
            <p className="mt-1 max-w-sm text-xs text-gray-400">
              Something went wrong while fetching data. Please try again.
            </p>
            <Button variant="outline" size="small" className="mt-4" onClick={() => refetch()} loading={isFetching}>
              Retry
            </Button>
          </PageCardContent>
        </PageCard>
      );
    }

    return (
      <>
        {SETTINGS_CATALOG.map(({ group, settings }) => (
          <section key={group} className="rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="border-b border-gray-100 px-4 py-3 sm:px-5">
              <h2 className="text-base font-semibold text-[#0a174e]">{group}</h2>
            </header>
            <ul className="divide-y divide-gray-100">
              {settings.map((setting) => (
                <SettingRow
                  key={setting.key}
                  setting={setting}
                  row={rowsByKey.get(setting.key)}
                  onEdit={setEditingSetting}
                  onReset={(s, row) => setConfirmTarget({ kind: "reset", row, label: s.label })}
                />
              ))}
            </ul>
          </section>
        ))}

        <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-[#0a174e]">Other settings</h2>
              <p className="mt-0.5 text-xs text-gray-500">Stored configuration entries not covered above.</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="small"
              className="w-full whitespace-nowrap sm:w-auto"
              onClick={() => setCustomModal({ row: null })}
            >
              <Plus size={14} />
              Add Setting
            </Button>
          </header>

          <div className="p-4 sm:p-5">
            {otherRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <SlidersHorizontal className="mb-3 h-10 w-10 text-gray-300" />
                <h3 className="text-sm font-semibold text-gray-700">No other settings</h3>
                <p className="mt-1 max-w-sm text-xs text-gray-400">
                  Entries added here are stored as-is; the system only reads the keys listed above.
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg">
                <GenericTable headers={otherHeaders} rows={otherTableRows} columns={otherColumns} />
              </div>
            )}
          </div>
        </section>
      </>
    );
  };

  return (
    <div className="space-y-4">
      <Breadcrumb items={breadcrumbs} />

      <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-bold text-[#0a174e]">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            System-wide rules for approvals, finance verification, cash advances and tax. Anything not set uses the
            built-in default.
          </p>
        </div>
        {!isLoading && !isError ? (
          <div className="shrink-0 rounded-lg bg-gray-50 px-4 py-2 text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{customisedCount}</span> of {TOTAL_CATALOG_SETTINGS}{" "}
            settings customised
          </div>
        ) : null}
      </div>

      {renderBody()}

      {editingSetting ? (
        <CatalogSettingModal
          key={editingSetting.key}
          setting={editingSetting}
          row={rowsByKey.get(editingSetting.key)}
          onClose={() => setEditingSetting(null)}
          onSave={handleCatalogSave}
          saving={saveMutation.isPending}
        />
      ) : null}

      {customModal ? (
        <CustomSettingModal
          key={customModal.row?.configId ?? "new"}
          row={customModal.row}
          onClose={() => setCustomModal(null)}
          onSave={handleCustomSave}
          saving={saveMutation.isPending}
        />
      ) : null}

      <ConfirmationModal
        isOpen={Boolean(confirmTarget)}
        title={confirmTarget?.kind === "reset" ? "Reset to Default" : "Delete Setting"}
        message={
          confirmTarget?.kind === "reset"
            ? `Reset "${confirmTarget.label}" to its built-in default? The stored value will be removed.`
            : `Delete the setting "${confirmTarget?.label}"? This action cannot be undone.`
        }
        confirmText={confirmTarget?.kind === "reset" ? "Reset" : "Delete"}
        cancelText="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
        isLoading={deleteMutation.isPending}
        variant={confirmTarget?.kind === "reset" ? "primary" : "danger"}
      />
    </div>
  );
}
