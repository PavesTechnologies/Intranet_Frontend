import React from "react";
import classNames from "classnames";
import { Fonts } from "../Fonts/Fonts";

// Canonical Button (src/components/Button/Button.jsx) — Phase 1 UI unification.
// Historical size names (large/medium/small/icon) remain the source of truth;
// sm/md/lg are accepted as aliases so new call sites can use the naming from
// docs/ui/phase-1-canonical-ui.md without breaking any existing consumer.
const SIZE_ALIASES = {
  sm: "small",
  md: "medium",
  lg: "large",
};

const SIZE_CLASSES = {
  large: "text-base px-8 py-3",
  medium: "text-sm px-5 py-2.5", // ~40px tall, matches canonical md height
  small: "text-xs px-3 py-1.5",
  icon: "h-8 w-8 p-0 text-sm",
};

const VARIANT_CLASSES = {
  primary: "bg-brand-primary text-white hover:bg-brand-primary-hover",
  secondary: "bg-brand-secondary text-white hover:bg-brand-secondary-hover",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
  danger: "bg-danger text-white hover:bg-danger/90",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent",
  link:
    "bg-transparent shadow-none text-brand-primary hover:underline px-0 py-0",
};

const Spinner = ({ size }) => {
  const spinnerSize = {
    large: "h-4 w-4",
    medium: "h-3.5 w-3.5",
    small: "h-3 w-3",
  }[size];

  return (
    <svg
      className={classNames("animate-spin", spinnerSize)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
};

const Button = ({
  children,
  size = "medium",
  variant = "primary",
  className = "",
  disabled = false,
  loading = false,
  loadingText,
  type = "button",
  ...props
}) => {
  const isDisabled = disabled || loading;
  const resolvedSize = SIZE_ALIASES[size] || size;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-lg transition duration-200 shadow-sm",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
        Fonts.button,
        SIZE_CLASSES[resolvedSize] || SIZE_CLASSES.medium,
        VARIANT_CLASSES[variant] || VARIANT_CLASSES.primary,
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {loading && <Spinner size={resolvedSize} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
};

export default Button;
