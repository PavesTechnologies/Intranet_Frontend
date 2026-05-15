import React from "react";
import Button from "../../../../components/Button/Button";
import { PageCard } from "../../../../components/Cards/PageCard";

const columnStyles = {
  todo: {
    accent: "bg-orange-500",
    background: "bg-orange-50",
    border: "border-orange-200",
    badgeText: "text-orange-600",
  },
  progress: {
    accent: "bg-blue-500",
    background: "bg-blue-50",
    border: "border-blue-200",
    badgeText: "text-blue-600",
  },
  completed: {
    accent: "bg-emerald-500",
    background: "bg-emerald-50",
    border: "border-emerald-200",
    badgeText: "text-emerald-600",
  },
};

const priorityStyles = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const formatLabel = (value) => {
  if (!value) return "Not set";

  return String(value)
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function TaskBoard({ tasks, loading = false, onCardClick, onDelete }) {
  const columns = [
    { key: "todo", title: "To Do", subtitle: "Ready to start" },
    { key: "progress", title: "In Progress", subtitle: "Actively moving" },
    { key: "completed", title: "Completed", subtitle: "Finished tasks" },
  ];

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm font-medium text-slate-500">
        Loading tasks...
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
      {columns.map((column) => {
        const style = columnStyles[column.key];
        const list = tasks?.[column.key] || [];

        return (
          <PageCard key={column.key} className="overflow-hidden border-slate-200">
            <div className={`border-b px-5 py-4 ${style.background} ${style.border}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${style.accent}`} />
                    <h3 className="text-base font-semibold text-slate-900">{column.title}</h3>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{column.subtitle}</p>
                </div>

                <div
                  className={`flex h-9 min-w-9 items-center justify-center rounded-full border bg-white px-3 text-sm font-bold ${style.border} ${style.badgeText}`}
                >
                  {list.length}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-4 min-h-[360px]">
              {list.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  No tasks in this stage.
                </div>
              ) : (
                list.map((task) => (
                  <div
                    key={task.task_uuid}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <div className="mb-4 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="text-base font-semibold leading-6 text-slate-900">
                          {task.title}
                        </h4>
                        <p className="mt-1 text-sm text-slate-500">
                          {task.description || "No description added yet."}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize ${
                          priorityStyles[task.priority] || priorityStyles.low
                        }`}
                      >
                        {task.priority}
                      </span>
                    </div>

                    <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <InfoTile label="Employee" value={task.employee || "Unknown Employee"} />
                      <InfoTile label="Assigned To" value={task.assignedTo || "Unassigned"} />
                      <InfoTile label="Due Date" value={task.dueDate || "Not scheduled"} />
                      <InfoTile label="Status" value={formatLabel(task.status)} />
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => onCardClick?.(task)}
                        variant="primary"
                        size="small"
                      >
                        Edit Task
                      </Button>
                      <Button
                        onClick={() => onDelete?.(task)}
                        variant="danger"
                        size="small"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </PageCard>
        );
      })}
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-3">
      <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="text-sm font-medium text-slate-800">{value}</div>
    </div>
  );
}
