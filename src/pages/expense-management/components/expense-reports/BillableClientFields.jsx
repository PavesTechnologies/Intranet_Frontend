import React, { useCallback, useState } from "react";
import Select from "react-select";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";

/**
 * Active RMS clients via XMS (GET /xms/clients). A failure is kept as an inline message (with a retry)
 * rather than only a toast, since it blocks saving a billable expense.
 */
export function useActiveClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const list = await lookupService.getActiveClients();
      setClients(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error("Failed to load clients:", err);
      // XMS forwards the user's own token to RMS, which only lets Admin / Resource Manager /
      // Project Manager list clients — a 403 here is a role issue, not an outage.
      setError(
        err.response?.status === 403
          ? "Your role doesn't have access to the client list in RMS."
          : err.response?.data?.message || "Could not load clients."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { clients, loading, error, reload };
}

/**
 * The selected client's projects among the employee's PMS-assigned ones (p.clientId is the project's RMS
 * client as PMS reports it). No status filter: the assigned-projects endpoint already restricts to the
 * employee's ACTIVE/PLANNING projects and returns no status per project.
 */
export function projectOptionsForClient(projects, clientId) {
  if (!clientId) return [];
  return projects
    .filter((p) => p.clientId === clientId)
    .map((p) => ({ value: p.projectId, label: `${p.projectCode} - ${p.projectName}` }));
}

/** Switching client drops a picked project that doesn't belong to the new client. */
export function projectIdForClient(projects, projectId, clientId) {
  const project = projects.find((p) => p.projectId === projectId);
  return project && clientId && project.clientId === clientId ? projectId : "";
}

/**
 * Client Billable? / Client (required when billable) / Project (optional, the client's projects only).
 * Shared by the Manual Entry drawer and the Automatic (AI Scan) review so both ask the same thing.
 */
export function BillableClientFields({
  clientBillable,
  clientId,
  projectId,
  onBillableChange,
  onClientChange,
  onProjectChange,
  clientOptions,
  projectOptions,
  clientsLoading,
  clientsError,
  onRetryClients,
  projectsLoading = false,
  errors = {},
  selectStyles,
  disabled,
}) {
  return (
    <>
      <div className="space-y-0.5">
        <label className="block text-xs font-semibold text-gray-600">
          Client Billable?
        </label>
        <select
          name="clientBillable"
          value={String(!!clientBillable)}
          onChange={(e) => onBillableChange(e.target.value === "true")}
          className="w-full text-xs px-2.5 py-1.5 border border-gray-300 bg-white rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 shadow-sm h-8"
          disabled={disabled}
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      </div>

      {clientBillable && (
        <div className="space-y-0.5">
          <label className="block text-xs font-semibold text-gray-600">
            Client <span className="text-red-500">*</span>
          </label>
          <Select
            options={clientOptions}
            value={clientOptions.find((o) => o.value === clientId) || null}
            onChange={(opt) => onClientChange(opt ? opt.value : "")}
            placeholder={clientsLoading ? "Loading clients..." : clientsError ? "Clients unavailable" : "Select client..."}
            isSearchable
            isLoading={clientsLoading}
            noOptionsMessage={() => (clientsLoading ? "Loading..." : "No active clients found.")}
            styles={selectStyles}
            isDisabled={disabled || clientsLoading || !!clientsError}
          />
          {clientsError ? (
            <span className="text-[11px] text-red-600 block mt-0.5">
              {clientsError}{" "}
              <button
                type="button"
                onClick={onRetryClients}
                className="font-semibold text-indigo-600 hover:text-indigo-800 underline"
              >
                Retry
              </button>
            </span>
          ) : !clientsLoading && clientOptions.length === 0 ? (
            <span className="text-[11px] text-gray-500 block mt-0.5">
              No active clients are available, so this expense can't be marked billable yet.
            </span>
          ) : null}
          {errors.clientId && <span className="text-[11px] text-red-600 block mt-0.5">{errors.clientId}</span>}
        </div>
      )}

      {clientBillable && (
        <div className="space-y-0.5">
          <label className="block text-xs font-semibold text-gray-600">
            Project <span className="font-normal text-gray-400">(optional)</span>
          </label>
          <Select
            options={projectOptions}
            value={projectOptions.find((o) => o.value === projectId) || null}
            onChange={(opt) => onProjectChange(opt ? opt.value : "")}
            placeholder={
              projectsLoading ? "Loading your assigned projects..." : !clientId ? "Select a client first" : "Select project..."
            }
            isSearchable
            isClearable
            isLoading={projectsLoading}
            noOptionsMessage={() => (projectsLoading ? "Loading..." : "You have no assigned projects for this client.")}
            styles={selectStyles}
            isDisabled={disabled || projectsLoading || !clientId}
          />
          {errors.projectId && <span className="text-[11px] text-red-600 block mt-0.5">{errors.projectId}</span>}
        </div>
      )}
    </>
  );
}
