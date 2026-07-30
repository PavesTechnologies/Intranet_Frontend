import React from "react";
import { FileText, Lock } from "lucide-react";
import Button from "../../../../../../components/Button/Button";
import { Input } from "../../../../../../components/ui/input";
import { renderParseStatusBadge, renderConfidenceBadge } from "../../utils/intakeUtils.jsx";

export default function ReviewHeader({ resume, onChange, isEditing }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 flex items-start justify-between gap-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2.5 flex-wrap">
          {isEditing ? (
            <div className="w-80 mb-2">
              <Input
                value={resume.candidate_name || ""}
                onChange={(e) => onChange({ candidate_name: e.target.value })}
                placeholder="Candidate full name"
                className="h-8 text-sm font-semibold"
              />
            </div>
          ) : (
            <h1 className="text-lg font-bold text-slate-900 truncate">{resume.candidate_name}</h1>
          )}
          <div className="flex items-center gap-1.5">
            {renderParseStatusBadge(resume.parse_status)}
            {renderConfidenceBadge(resume.parse_confidence_score)}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[12.5px] text-slate-500 flex-wrap">
          <span className="inline-flex items-center gap-1">
            <Lock size={12} /> {resume.candidate_email_masked}
          </span>
          <span className="text-slate-300">·</span>
          <span>{resume.file_format}</span>
          <span className="text-slate-300">·</span>
          <span>Version {resume.version_number}</span>
          <span className="text-slate-300">·</span>
          <span>Parser {resume.parser_version}</span>
        </div>
      </div>
      <Button variant="outline" size="small" disabled title="Original file storage is not wired up yet">
        <FileText className="h-4 w-4 mr-1.5" /> View original resume
      </Button>
    </div>
  );
}
