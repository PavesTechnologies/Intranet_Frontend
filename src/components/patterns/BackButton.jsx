import React from "react";
import { ArrowLeft } from "lucide-react";
import Button from "../Button/Button";

// Canonical "go back" control. Purely presentational/navigational — it has
// no React Router (or any other history/routing) knowledge and performs no
// navigation itself. The parent always supplies `onClick` and decides what
// "back" means (navigate(-1), a specific route, closing a panel, etc.).
// Composes the canonical Button (outline variant) rather than re-styling a
// bespoke bordered button, so it automatically stays visually consistent
// with every other canonical Button usage. See docs/ui/phase-2-leave-management.md
// ("Canonical BackButton") for the rationale and the first migrated consumer.
export default function BackButton({ onClick, label = "Back", className = "" }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="small"
      onClick={onClick}
      className={className}
      aria-label={label}
    >
      <ArrowLeft className="h-4 w-4" />
      {/* {label} */}
    </Button>
  );
}
