import React from "react";
import { Plus } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function PromptTemplateToolbar({ onCreate }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Prompt Templates</h1>
        <p className="text-xs text-slate-500 mt-1">Manage prompt templates used across AI screening tasks.</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="primary" size="small" onClick={onCreate}>
          <Plus className="h-4 w-4 mr-1.5" /> Create Prompt
        </Button>
      </div>
    </div>
  );
}
