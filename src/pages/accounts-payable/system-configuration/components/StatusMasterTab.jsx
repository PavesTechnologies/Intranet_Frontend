import { useMemo, useState } from "react";
import { Eye } from "lucide-react";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import SearchInput from "../../../../components/filter/Searchbar";
import FormSelect from "../../../../components/forms/FormSelect";
import Modal from "../../../../components/Modal/modal";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { getApiErrorMessage } from "../../utils/apiError";
import useStatusMasters from "../hooks/useStatusMasters";
import useStatusMasterDetail from "../hooks/useStatusMasterDetail";

const ALL_MODULES = "";

const toTitleCase = (value) =>
  value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

export default function StatusMasterTab() {
  const { data, isLoading, isError, error } = useStatusMasters();
  const statuses = data || [];

  const [moduleFilter, setModuleFilter] = useState(ALL_MODULES);
  const [search, setSearch] = useState("");
  const [viewStatusId, setViewStatusId] = useState(null);

  const moduleOptions = useMemo(() => {
    const modules = [...new Set(statuses.map((item) => item.module_name))].sort();
    return [
      { value: ALL_MODULES, label: "All Modules" },
      ...modules.map((module) => ({ value: module, label: toTitleCase(module) })),
    ];
  }, [statuses]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return statuses
      .filter((item) => !moduleFilter || item.module_name === moduleFilter)
      .filter(
        (item) =>
          !q ||
          item.status_code.toLowerCase().includes(q) ||
          item.status_name.toLowerCase().includes(q)
      )
      .sort(
        (a, b) =>
          a.module_name.localeCompare(b.module_name) || a.display_order - b.display_order
      );
  }, [statuses, moduleFilter, search]);

  const {
    data: viewStatus,
    isLoading: isViewLoading,
    isError: isViewError,
    error: viewError,
  } = useStatusMasterDetail(viewStatusId);

  const headers = ["Module", "Status Code", "Status Name", "Display Order", "Actions"];
  const columns = ["module", "statusCode", "statusName", "displayOrder", "actions"];

  const rows = filteredItems.map((item) => ({
    module: <span className="text-gray-700">{toTitleCase(item.module_name)}</span>,
    statusCode: <span className="font-mono text-xs font-semibold text-gray-700">{item.status_code}</span>,
    statusName: <span className="font-medium text-gray-900">{item.status_name}</span>,
    displayOrder: item.display_order,
    actions: (
      <div className="flex items-center justify-center">
        <Button
          type="button"
          variant="link"
          size="icon"
          title="View Status"
          className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-800 transition rounded-md"
          onClick={() => setViewStatusId(item.status_id)}
        >
          <Eye size={16} />
        </Button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="w-full sm:w-56">
            <FormSelect
              label="Module"
              name="module"
              value={moduleFilter}
              onChange={(e) => setModuleFilter(e.target.value)}
              options={moduleOptions}
            />
          </div>
          <div className="w-full sm:w-64">
            <SearchInput onSearch={setSearch} placeholder="Search by status code or name..." />
          </div>
        </div>
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {getApiErrorMessage(error, "Failed to load statuses.")}
        </div>
      ) : isLoading ? (
        <LoadingSpinner text="Loading statuses..." />
      ) : (
        <div className="w-full overflow-x-auto rounded-lg">
          <GenericTable headers={headers} rows={rows} columns={columns} />
        </div>
      )}

      <Modal
        isOpen={viewStatusId != null}
        onClose={() => setViewStatusId(null)}
        title="Status Details"
        size="md"
      >
        {isViewLoading ? (
          <LoadingSpinner text="Loading status details..." />
        ) : isViewError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {getApiErrorMessage(viewError, "Failed to load status details.")}
          </div>
        ) : viewStatus ? (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 py-2 text-sm">
            <dt className="text-gray-500">Status ID</dt>
            <dd className="font-medium text-gray-900">{viewStatus.status_id}</dd>
            <dt className="text-gray-500">Module</dt>
            <dd className="font-medium text-gray-900">{toTitleCase(viewStatus.module_name)}</dd>
            <dt className="text-gray-500">Status Code</dt>
            <dd className="font-mono text-xs font-semibold text-gray-700">{viewStatus.status_code}</dd>
            <dt className="text-gray-500">Status Name</dt>
            <dd className="font-medium text-gray-900">{viewStatus.status_name}</dd>
            <dt className="text-gray-500">Display Order</dt>
            <dd className="font-medium text-gray-900">{viewStatus.display_order}</dd>
          </dl>
        ) : null}
      </Modal>
    </div>
  );
}
