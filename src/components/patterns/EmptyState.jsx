import React from "react";
import { Inbox } from "lucide-react";
import { Fonts } from "../Fonts/Fonts";

// Default ("standard") rendering: a compact, text-only message — no icon,
// no illustration, no circle. This is deliberately minimal rather than
// pulled from Fonts.jsx, since no existing token combines text-sm/font-
// semibold/italic together and this combination isn't otherwise reused
// elsewhere in the app — see docs/ui/phase-2-leave-management.md
// ("P2.26 — EmptyState Visual Standardization").
const STANDARD_TEXT_CLASSES = "text-sm font-semibold italic text-gray-500";

// Opt-in only: reproduces the original icon-circle + subheading treatment
// byte-for-byte, for the small number of consumers that still need it
// (e.g. ApprovalDashboard.jsx). Do not use this for new/standard empty
// states — it exists solely to preserve pre-existing, deliberate UI.
export default function EmptyState({
  icon,
  title,
  description,
  action,
  className = "",
  variant = "standard",
}) {
  if (variant === "illustrated") {
    const Icon = icon || Inbox;
    return (
      <div className={`flex flex-col items-center justify-center gap-2 py-6 text-center ${className}`.trim()}>
        <div className="mb-1 flex h-24 w-24 items-center justify-center rounded-full bg-gray-100 text-gray-400">
          {React.isValidElement(Icon) ? Icon : <Icon className="h-12 w-12" aria-hidden="true" />}
        </div>
        {title ? <p className={Fonts.subheading}>{title}</p> : null}
        {description ? <p className="max-w-sm text-sm text-gray-500">{description}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    );
  }

  return (
    <div className={`flex w-full items-center justify-center ${className}`.trim()}>
      <div className="text-center">
        {title ? <p className={STANDARD_TEXT_CLASSES}>{title}</p> : null}
        {description ? <p className={STANDARD_TEXT_CLASSES}>{description}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
