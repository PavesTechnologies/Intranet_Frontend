import { Fonts } from "../../../../components/Fonts/Fonts";

export default function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  name,
}) {
  return (
    <label
      className={`flex items-center justify-between gap-4 ${
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      }`}
    >
      <span>
        {label ? <span className={Fonts.label}>{label}</span> : null}
        {description ? <span className="block text-xs text-slate-500">{description}</span> : null}
      </span>

      <button
        type="button"
        role="switch"
        name={name}
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => !disabled && onChange?.(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 ${
          checked ? "border-[#0A0082] bg-[#0A0082]" : "border-slate-300 bg-slate-200"
        } ${disabled ? "pointer-events-none" : ""}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </button>
    </label>
  );
}
