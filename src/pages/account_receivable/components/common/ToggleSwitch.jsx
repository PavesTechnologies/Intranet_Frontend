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
        className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-[#0A0082]/30 ${
          checked ? "border-[#0A0082] bg-[#0A0082]" : "border-slate-300 bg-slate-200"
        } ${disabled ? "pointer-events-none" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
          style={{ height: "1.125rem", width: "1.125rem" }}
        />
      </button>
    </label>
  );
}
