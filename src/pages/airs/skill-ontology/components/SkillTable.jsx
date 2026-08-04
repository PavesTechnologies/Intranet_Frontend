import React from "react";
import { Eye, PencilIcon, Ban, RotateCcw } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import EmptyState from "./EmptyState";
import { renderStatusPill, renderVerificationBadge, formatDate, getSourceLabel } from "../utils/skillOntologyUtils.jsx";

export default function SkillTable({ skills, isLoading, onView, onEdit, onDeactivate, onReactivate }) {
  if (isLoading) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl py-16 flex items-center justify-center">
        <LoadingSpinner text="Loading skills..." />
      </div>
    );
  }

  if (skills.length === 0) return <EmptyState />;

  const headers = ["Canonical Skill", "Category", "Aliases", "Confidence", "Status", "Occurrences", "Last Seen", "Source", "Actions"];

  const columns = ["canonicalName", "category", "aliases", "confidence", "status", "occurrenceCount", "lastSeen", "source", "actions"];

  const rows = skills.map((skill) => ({
    id: skill.id,
    rowClass: "hover:bg-slate-50/50 transition cursor-pointer",
    onRowClick: () => onView(skill),
    canonicalName: (
      <div className="w-full flex justify-center font-semibold text-slate-900" title={skill.canonicalName}>
        <span className="line-clamp-1 truncate max-w-[180px]">{skill.canonicalName}</span>
      </div>
    ),
    category: (
      <div className="w-full flex justify-center text-slate-500" title={skill.category}>
        <span className="line-clamp-1 truncate max-w-[150px]">{skill.category}</span>
      </div>
    ),
    aliases: (
      <div
        className="w-full flex justify-center"
        title={(skill.aliases || []).join(", ")}
      >
        <span className="line-clamp-1 truncate max-w-[200px] text-slate-500">
          {(skill.aliases || []).length > 0 ? skill.aliases.join(", ") : "-"}
        </span>
      </div>
    ),
    confidence: renderVerificationBadge(skill.confidence),
    status: renderStatusPill(skill.status),
    occurrenceCount: skill.occurrenceCount,
    lastSeen: formatDate(skill.lastSeen),
    source: <span className="text-slate-500">{getSourceLabel(skill.source)}</span>,
    actions: (
      <div className="flex items-center justify-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          title="View skill"
          onClick={(e) => {
            e.stopPropagation();
            onView(skill);
          }}
          className="h-8 w-8 !text-blue-500 hover:!text-blue-600"
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          title="Edit skill"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(skill);
          }}
          className="h-8 w-8 text-indigo-500 hover:text-indigo-700"
        >
          <PencilIcon className="h-4 w-4" />
        </Button>
        {skill.status === "ACTIVE" ? (
          <Button
            variant="ghost"
            size="icon"
            title="Deactivate skill"
            onClick={(e) => {
              e.stopPropagation();
              onDeactivate(skill);
            }}
            className="h-8 w-8 text-rose-500 hover:text-rose-600"
          >
            <Ban className="h-4 w-4" />
          </Button>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            title="Reactivate skill"
            onClick={(e) => {
              e.stopPropagation();
              onReactivate(skill);
            }}
            className="h-8 w-8 text-emerald-500 hover:text-emerald-600"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    ),
  }));

  return <GenericTable headers={headers} columns={columns} rows={rows} />;
}
