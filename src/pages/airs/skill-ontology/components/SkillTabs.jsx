import React from "react";
import { CheckCircle2, HelpCircle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "../../../../components/ui/tabs";

const TABS = [
  { value: "verified", label: "Verified Skills", icon: CheckCircle2 },
  { value: "unknown", label: "Unknown Skills", icon: HelpCircle },
];

// Same Tabs/TabsList/TabsTrigger pattern as JdLibrary's Processed JD /
// Processing JD tabs — white bordered pill container, blue-600 active state.
export default function SkillTabs({ activeTab, onChange }) {
  return (
    <Tabs value={activeTab} onValueChange={onChange}>
      <TabsList className="bg-white border border-slate-200 shadow-sm mb-6 p-1 h-auto">
        {TABS.map(({ value, label, icon: Icon }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-none text-slate-500"
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
