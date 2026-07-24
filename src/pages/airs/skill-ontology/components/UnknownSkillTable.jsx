import React from "react";
import { UserPlus } from "lucide-react";
import GenericTable from "../../../../components/Table/table";
import Button from "../../../../components/Button/Button";
import { formatDate } from "../utils/skillOntologyUtils.jsx";

// GenericTable already renders the shared LoadingSpinner while loading={true}
// and a "No records found." empty state on its own — no need to hand-roll
// either here (unlike SkillTable.jsx, which needs a custom empty state with a
// Seed Ontology CTA; unknown skills have no equivalent action).
export default function UnknownSkillTable({ skills, isLoading, onPromote }) {
  const headers = ["Raw Skill", "Normalized Key", "Frequency", "First Seen", "Last Seen", "Status", "Actions"];
  const columns = ["rawSkill", "normalizedKey", "frequency", "firstSeen", "lastSeen", "status", "actions"];

  const rows = skills.map((skill) => ({
    id: skill.id,
    rawSkill: <span className="font-semibold text-slate-900">{skill.rawSkill}</span>,
    normalizedKey: <span className="text-slate-500">{skill.normalizedKey}</span>,
    frequency: skill.frequency,
    firstSeen: formatDate(skill.firstSeen),
    lastSeen: formatDate(skill.lastSeen),
    status: (
      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-600">
        {skill.status}
      </span>
    ),
    actions: (
      <Button
        variant="ghost"
        size="icon"
        title="Promote to skill"
        onClick={() => onPromote(skill)}
        className="h-8 w-8 text-blue-500 hover:text-blue-600"
      >
        <UserPlus className="h-4 w-4" />
      </Button>
    ),
  }));

  return <GenericTable headers={headers} columns={columns} rows={rows} loading={isLoading} />;
}
