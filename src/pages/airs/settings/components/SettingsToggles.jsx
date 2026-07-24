import React from "react";
import FilterListbox from "../../../../components/filter/FilterListbox";
import { AUDIT_RETENTION_OPTIONS } from "../mock/settingsMockData";

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div>
        <div className="text-[13px] font-semibold text-slate-900">{title}</div>
        <div className="text-[12px] text-slate-400">{description}</div>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="w-11 h-6 rounded-full relative transition-colors shrink-0"
        style={{ background: checked ? "#2563EB" : "#D9DEE7" }}
      >
        <div
          className="w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow"
          style={{ left: checked ? 22 : 2 }}
        />
      </button>
    </div>
  );
}

export default function SettingsToggles({ settings, onChange }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5 divide-y divide-slate-100">
      <ToggleRow
        title="Automatic skill mapping"
        description="Map resume skill mentions to canonical taxonomy using vector similarity."
        checked={settings.autoSkillMapping}
        onChange={(v) => onChange("autoSkillMapping", v)}
      />
      <ToggleRow
        title="Email parsing notifications"
        description="Notify recruiters when a resume is parsed via the email intake channel."
        checked={settings.emailParsingNotifications}
        onChange={(v) => onChange("emailParsingNotifications", v)}
      />

      <div className="py-3">
        <div className="flex justify-between text-[12px] mb-1.5">
          <span className="font-semibold text-slate-900">Confidence score threshold</span>
          <span className="font-semibold text-slate-500">{settings.confidenceThreshold}% minimum match</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={settings.confidenceThreshold}
          onChange={(e) => onChange("confidenceThreshold", Number(e.target.value))}
          className="w-full accent-blue-600"
        />
      </div>

      <div className="py-3">
        <div className="text-[12px] font-semibold text-slate-900 mb-1.5">Recruiter audit log retention</div>
        <FilterListbox
          options={AUDIT_RETENTION_OPTIONS}
          value={settings.auditLogRetentionDays}
          onChange={(v) => onChange("auditLogRetentionDays", v)}
        />
      </div>
    </div>
  );
}
