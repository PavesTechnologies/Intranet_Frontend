import {
  MODULE_BADGE_CLASS,
  OTHER_MODULE_BADGE_CLASS,
  moduleLabel,
} from "../constants/notifications";

/**
 * Compact chip naming the AP module a notification belongs to — the backend's `module`,
 * rendered as given. An unknown module still gets a readable, neutral chip.
 *
 * The visible text is the module name itself, so it never relies on colour; a visually hidden
 * "Module:" prefix keeps a screen reader from announcing a bare "Payments".
 */
export default function ModuleBadge({ module, className = "" }) {
  const label = moduleLabel(module);

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] font-medium leading-none ${
        MODULE_BADGE_CLASS[module] || OTHER_MODULE_BADGE_CLASS
      } ${className}`}
      title={`Module: ${label}`}
      data-testid="notification-module"
      data-module={module || "OTHER"}
    >
      <span className="sr-only">Module: </span>
      {label}
    </span>
  );
}
