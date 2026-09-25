import React, { useState } from "react";
import { toast } from "react-toastify";
import { PencilIcon, Plus, ShieldCheck, Star, Trash2 } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Pagination from "../../../../components/Pagination/pagination";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import AIProviderFormModal from "./AIProviderFormModal";
import useAiProviders from "../hooks/useAiProviders";

const formatDate = (value) => (value ? new Date(value).toLocaleString() : null);

function StatusPill({ row }) {
  const verified = formatDate(row.verified_at);
  return row.is_active ? (
    <span
      title={verified ? `Verified ${verified}` : undefined}
      className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700"
    >
      Active
    </span>
  ) : (
    <span
      title={verified ? `Verified ${verified}` : undefined}
      className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500"
    >
      Inactive
    </span>
  );
}

// Disabled buttons don't receive hover (pointer-events-none), so the reason
// a button is disabled lives on this wrapper's title instead.
function ActionButton({ title, disabledReason, onClick, className, children, disabled }) {
  return (
    <span title={disabledReason || title} className="inline-flex">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        disabled={disabled || !!disabledReason}
        className={`h-8 w-8 ${className}`}
        aria-label={title}
      >
        {children}
      </Button>
    </span>
  );
}

// Settings -> AI model providers. Several providers can be registered (one
// row each); the Active one is what JD parsing, resume parsing and AI
// evaluation use. At least one provider must always remain.
export default function SettingsAIProviders() {
  const providers = useAiProviders();
  const [modal, setModal] = useState({ open: false, mode: "create", row: null });
  const [confirm, setConfirm] = useState(null); // { type: "delete" | "activate", row }

  const onlyOne = providers.total <= 1;
  const allRegistered = providers.options.length > 0 && providers.unregisteredOptions.length === 0;

  const openCreate = () => setModal({ open: true, mode: "create", row: null });
  const openEdit = (row) => setModal({ open: true, mode: "edit", row });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const handleSaved = (message) => {
    closeModal();
    toast.success(message);
    providers.refresh();
  };

  const handleConfirm = async () => {
    // Success and failure both end in a toast (the hook shows the friendly
    // reason), so the dialog always closes.
    const { type, row } = confirm;
    await (type === "delete" ? providers.remove(row) : providers.activate(row));
    setConfirm(null);
  };

  const deleteDisabledReason = (row) => {
    if (onlyOne) return "At least one provider must remain, so the last one can't be deleted.";
    if (row.is_active) return "This is the active provider. Set another provider as active first.";
    return null;
  };

  const headers = ["Provider", "Model", "API key", "Status", "Actions"];
  const columns = ["provider", "model", "apiKey", "status", "actions"];
  const tableRows = providers.rows.map((row) => ({
    id: row.id,
    rowClass: "hover:bg-slate-50/50 transition",
    provider: <span className="font-semibold text-slate-900">{row.provider_label}</span>,
    model: (
      <span className="text-slate-700 truncate max-w-[220px] inline-block align-middle" title={row.model_name}>
        {row.model_name}
      </span>
    ),
    apiKey: <span className="font-mono text-[12px] text-slate-500">{row.api_key_masked || "—"}</span>,
    status: <StatusPill row={row} />,
    actions: (
      <div className="flex items-center justify-center gap-1">
        {!row.is_active && (
          <ActionButton
            title="Set as active"
            onClick={() => setConfirm({ type: "activate", row })}
            disabled={providers.busyId === row.id}
            className="!text-amber-500 hover:!text-amber-600"
          >
            <Star className="h-4 w-4" />
          </ActionButton>
        )}
        <ActionButton
          title="Edit"
          onClick={() => openEdit(row)}
          disabled={providers.busyId === row.id}
          className="!text-indigo-500 hover:!text-indigo-700"
        >
          <PencilIcon className="h-4 w-4" />
        </ActionButton>
        <ActionButton
          title="Delete"
          disabledReason={deleteDisabledReason(row)}
          onClick={() => setConfirm({ type: "delete", row })}
          disabled={providers.busyId === row.id}
          className="!text-red-500 hover:!text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </ActionButton>
      </div>
    ),
  }));

  const active = providers.active;
  const usingDefault = active?.source === "env_fallback";

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-1">
        <div>
          <div className="font-bold text-[14px] text-slate-900">AI model providers</div>
          <p className="text-[11px] text-slate-400 mt-0.5">
            The active provider is used for JD parsing, resume parsing and AI evaluation. Changes apply to new processing jobs.
          </p>
        </div>
        <span title={allRegistered ? "All supported providers are already registered." : undefined} className="inline-flex shrink-0">
          <Button variant="primary" size="small" onClick={openCreate} disabled={allRegistered || providers.loading}>
            <Plus className="h-3.5 w-3.5" /> Add model provider
          </Button>
        </span>
      </div>

      {active && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 my-3 text-[12px]">
          <ShieldCheck className={`h-4 w-4 shrink-0 ${usingDefault ? "text-slate-400" : "text-emerald-600"}`} />
          {usingDefault ? (
            <span className="text-slate-600">
              No provider registered yet — using the built-in default:{" "}
              <span className="font-semibold">{active.provider_label} · {active.model_name}</span>
            </span>
          ) : (
            <span className="text-slate-600">
              Active: <span className="font-semibold">{active.provider_label} · {active.model_name}</span>
            </span>
          )}
        </div>
      )}

      <div className="flex-1">
        {providers.loading && providers.rows.length === 0 ? (
          <div className="flex justify-center py-10">
            <LoadingSpinner text="Loading AI providers..." />
          </div>
        ) : providers.loadError ? (
          <div className="rounded-lg bg-red-50 border border-red-100 px-3 py-3 text-[12px] text-red-700 flex items-center justify-between gap-3">
            <span>{providers.loadError}</span>
            <Button variant="outline" size="small" onClick={providers.refresh}>Retry</Button>
          </div>
        ) : providers.rows.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center">
            <p className="text-[13px] font-semibold text-slate-700">No AI providers registered yet</p>
            <p className="text-[12px] text-slate-400 mt-1">Add one to choose which model processes JDs and resumes.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <GenericTable headers={headers} columns={columns} rows={tableRows} />
          </div>
        )}
      </div>

      <Pagination
        className="mt-3"
        currentPage={providers.page}
        totalPages={providers.totalPages}
        onPrevious={() => providers.setPage(providers.page - 1)}
        onNext={() => providers.setPage(providers.page + 1)}
      />

      <AIProviderFormModal
        isOpen={modal.open}
        mode={modal.mode}
        row={modal.row}
        providerOptions={providers.unregisteredOptions}
        onClose={closeModal}
        onSaved={handleSaved}
      />

      <ConfirmationModal
        isOpen={!!confirm}
        title={confirm?.type === "delete" ? "Delete AI provider?" : "Make this the active provider?"}
        message={
          confirm?.type === "delete"
            ? `${confirm?.row.provider_label} and its saved API key will be removed.`
            : `New JD parsing, resume parsing and AI evaluation jobs will use ${confirm?.row.provider_label} · ${confirm?.row.model_name}.`
        }
        confirmText={confirm?.type === "delete" ? "Delete" : "Set active"}
        variant={confirm?.type === "delete" ? "danger" : "primary"}
        isLoading={!!confirm && providers.busyId === confirm.row.id}
        onCancel={() => setConfirm(null)}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
