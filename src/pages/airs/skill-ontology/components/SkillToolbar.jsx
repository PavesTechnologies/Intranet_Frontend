import React from "react";
import {  Download, Plus, UploadCloud } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function SkillToolbar({  onExport, onAddSkill, onBulkImport,  isExporting }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Skill Ontology</h1>
        <p className="text-xs text-slate-500 mt-1">Canonical skill taxonomy, aliases, and confidence scoring.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" size="small" onClick={onExport} disabled={isExporting}>
          <Download className="h-4 w-4 mr-1.5" /> Export
        </Button>
        <Button variant="outline" size="small" onClick={onBulkImport}>
          <UploadCloud className="h-4 w-4 mr-1.5" /> Bulk Import
        </Button>
        <Button variant="primary" size="small" onClick={onAddSkill}>
          <Plus className="h-4 w-4 mr-1.5" /> Add Skill
        </Button>
      </div>
    </div>
  );
}
