import React from "react";
import { Eye, PencilIcon, Trash2 } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import EmptyState from "./EmptyState";
import { renderStatusPill, getTaskTypeLabel, formatDateTime } from "../utils/promptTemplateUtils.jsx";

export default function PromptTemplateTable({
  promptTemplates,
  isLoading,
  onView,
  onEdit,
  onDelete,
}) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-16 flex items-center justify-center">
        <LoadingSpinner text="Loading prompt templates..." />
      </div>
    );
  }

  if (promptTemplates.length === 0) return <EmptyState />;

  const headers = ["Prompt Name", "Task Type", "Status", "Last Updated", "Updated By", "Created At", "Actions"];

  const columns = ["name", "taskType", "status", "updatedAt", "updatedBy", "createdAt", "actions"];

  const rows = promptTemplates.map((pt) => ({
    id: pt.id,
    rowClass: "hover:bg-slate-50/50 transition cursor-pointer",
    onRowClick: () => onView(pt),
    name: (
      <div className="w-full flex justify-start font-semibold text-slate-900" title={pt.name}>
        <span className="line-clamp-1 truncate max-w-[220px]">{pt.name}</span>
      </div>
    ),
    taskType: <span className="font-semibold text-slate-900">{getTaskTypeLabel(pt.taskType)}</span>,
    status: renderStatusPill(pt.status),
    updatedAt: <span className="text-slate-500">{formatDateTime(pt.updatedAt)}</span>,
    updatedBy: <span className="text-slate-500">{pt.updatedBy || "—"}</span>,
    createdAt: <span className="text-slate-500">{formatDateTime(pt.createdAt)}</span>,
    actions: (
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          title="View prompt template"
          onClick={(e) => {
            e.stopPropagation();
            onView(pt);
          }}
          className="h-8 w-8 !text-blue-500 hover:!text-blue-600"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Edit prompt template"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(pt);
          }}
          className="h-8 w-8 text-indigo-500 hover:text-indigo-700"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Delete prompt template"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(pt);
          }}
          className="h-8 w-8 text-rose-500 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    ),
  }));

  return <GenericTable headers={headers} columns={columns} rows={rows} />;
}
