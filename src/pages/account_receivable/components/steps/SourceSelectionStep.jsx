import { Building2, FilePlus2, Check } from "lucide-react";

import Button from "../../../../components/Button/Button";
import { Fonts } from "../../../../components/Fonts/Fonts";

const SOURCE_CARDS = [
  {
    mode: "EXISTING",
    icon: Building2,
    title: "Use Existing Enterprise Project",
    description: "Select an existing enterprise project and use its billing information for setup.",
    action: "Select Existing Project",
  },
  {
    mode: "STANDALONE",
    icon: FilePlus2,
    title: "Create Standalone AR Project",
    description:
      "Create a new project directly within Accounts Receivable when enterprise project records are not available.",
    action: "Create Standalone Project",
  },
];

export default function SourceSelectionStep({ value, onChange }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className={Fonts.heading4}>Project Source</h2>
        <p className="mt-1 text-sm text-slate-500">
          Select how this project's billing setup will be created.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {SOURCE_CARDS.map((card) => {
          const isSelected = value === card.mode;

          return (
            <div
              key={card.mode}
              role="radio"
              aria-checked={isSelected}
              tabIndex={0}
              onClick={() => onChange(card.mode)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onChange(card.mode);
                }
              }}
              className={`flex h-full cursor-pointer flex-col items-start rounded-2xl border p-6 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 ${
                isSelected
                  ? "border-[#0A0082] bg-[#0A0082]/5 ring-1 ring-[#0A0082]"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="flex w-full items-start justify-between">
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    isSelected ? "bg-[#0A0082] text-white" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <card.icon className="h-5 w-5" />
                </span>
                {isSelected && (
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0A0082] text-white">
                    <Check className="h-4 w-4" />
                  </span>
                )}
              </div>

              <h3 className="mt-4 text-base font-semibold text-slate-900">{card.title}</h3>
              <p className="mt-2 flex-1 text-sm text-slate-500">{card.description}</p>

              <Button
                variant={isSelected ? "primary" : "outline"}
                className="mt-6 w-full"
                onClick={(event) => {
                  event.stopPropagation();
                  onChange(card.mode);
                }}
              >
                {card.action}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
