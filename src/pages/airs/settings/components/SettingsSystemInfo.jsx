import React from "react";
import { Cpu, Network, Database } from "lucide-react";
import { KPICard } from "../../../../components/kpi/KPI";
import { SYSTEM_INFO } from "../mock/settingsMockData";

export default function SettingsSystemInfo() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      <KPICard
        label="OCR engine version"
        value={SYSTEM_INFO.ocrEngineVersion}
        icon={<Cpu className="h-5 w-5 text-slate-600" />}
        color="bg-slate-100 text-slate-700"
      />
      <KPICard
        label="Active skill nodes"
        value={SYSTEM_INFO.activeSkillNodes}
        icon={<Network className="h-5 w-5 text-blue-600" />}
        color="bg-blue-50 text-blue-700"
      />
      <KPICard
        label="Vector DB size"
        value={SYSTEM_INFO.vectorDbSize}
        icon={<Database className="h-5 w-5 text-purple-600" />}
        color="bg-purple-50 text-purple-700"
      />
    </div>
  );
}
