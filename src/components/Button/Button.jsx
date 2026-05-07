import React from "react";
import classNames from "classnames";

const SIZE_CLASSES = {
  large: "text-base px-8 py-3",
  medium: "text-[12px] px-5 py-2.5",
  small: "text-xs px-3 py-1.5",
};

const VARIANT_CLASSES = {
  primary: "bg-[#0A0082] text-white hover:bg-[#080066]",
  secondary: "bg-pink-700 text-white hover:bg-pink-600",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
  danger: "bg-rose-700 text-white hover:bg-rose-600",
  destructive:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90",
  outline:
    "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
  ghost:
    "hover:bg-accent hover:text-accent-foreground hover:bg-gray-200 border border-gray-300",
  link: "text-primary underline-offset-4 hover:underline",
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
  ...props
}) => {
  const isDisabled = disabled || loading;

  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition duration-200 focus:outline-none shadow-sm";

  const disabledClasses = isDisabled
    ? "opacity-50 cursor-not-allowed pointer-events-none"
    : "";

  return (
    <button
      className={classNames(
        baseClasses,
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        disabledClasses,
        className,
      )}
      disabled={isDisabled}
      aria-busy={loading}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
};

export default Button;