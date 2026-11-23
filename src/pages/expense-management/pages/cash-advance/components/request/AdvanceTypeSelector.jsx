import React from "react";

// Ways to ask for an advance. The Cash Advance + Outstanding (rollover) flow has been removed; Cash Advance + Carry
// Forward takes in only the balance Finance has already carried forward.
export const ADVANCE_TYPE = {
  COMPLETE_NEW: "COMPLETE_NEW",
  ADVANCE_PLUS_CARRY_FORWARD: "ADVANCE_PLUS_CARRY_FORWARD",
};

/** True for the request types where the amount entered is only the new cash, with a balance added on top. */
export const addsBalance = (type) => type === ADVANCE_TYPE.ADVANCE_PLUS_CARRY_FORWARD;

const OPTIONS = [
  {
    value: ADVANCE_TYPE.COMPLETE_NEW,
    title: "Complete New Cash Advance",
    help: "The whole sum for a new trip. Any balance you already owe stays separately tracked.",
  },
  {
    value: ADVANCE_TYPE.ADVANCE_PLUS_CARRY_FORWARD,
    title: "Cash Advance + Carry Forward",
    help: "Enter only the new cash you need. The balance Finance carried forward moves into this advance when it is approved.",
    needsCarryForward: true,
  },
];

// The carry-forward option is offered only when Finance has carried a balance forward for the employee.
export default function AdvanceTypeSelector({ value, onChange, disabled = false, hasCarryForward = false }) {
  const options = OPTIONS.filter((option) => !option.needsCarryForward || hasCarryForward);
  return (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-sm font-medium text-gray-700">Type of Advance</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition ${
                selected ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500" : "border-gray-200 bg-white hover:border-gray-300"
              } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            >
              <input
                type="radio"
                name="advance-type"
                value={option.value}
                checked={selected}
                disabled={disabled}
                onChange={() => onChange(option.value)}
                className="mt-0.5 h-3.5 w-3.5 accent-blue-600"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-900">{option.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-gray-500">{option.help}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
