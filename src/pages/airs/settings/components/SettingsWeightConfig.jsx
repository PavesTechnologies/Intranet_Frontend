import React from "react";

const FIELDS = [
  { key: "mandatorySkills", label: "Mandatory skills match" },
  { key: "semantic", label: "Semantic similarity" },
  { key: "experience", label: "Experience relevance" },
];

export default function SettingsWeightConfig({ weights, onChange, total }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="font-bold text-[14px] text-slate-900">Weight configuration</div>
        <span className={`text-[12px] font-semibold ${total === 100 ? "text-emerald-600" : "text-amber-600"}`}>
          Total: {total}% {total !== 100 && "(should equal 100%)"}
        </span>
      </div>

      {FIELDS.map(({ key, label }) => (
        <div key={key} className="mb-4">
          <div className="flex justify-between text-[12px] mb-1.5">
            <span className="text-slate-900">{label}</span>
            <span className="font-semibold text-slate-500">{weights[key]}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={weights[key]}
            onChange={(e) => onChange(key, Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      ))}
    </div>
  );
}
