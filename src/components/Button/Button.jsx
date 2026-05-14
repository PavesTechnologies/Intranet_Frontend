import React from "react";
import classNames from "classnames";
import { Fonts } from "../Fonts/Fonts";

const SIZE_CLASSES = {
  large: "text-base px-8 py-3",
  medium: "text-sm px-5 py-2.5",
  small: "text-xs px-3 py-1.5",
   icon: "h-8 w-8 p-0 text-sm",
};

const VARIANT_CLASSES = {
  primary: "bg-[#0A0082] text-white hover:bg-[#080066]",
  secondary: "bg-[#B83280] text-white hover:bg-[#9D286D]",
  success: "bg-emerald-600 text-white hover:bg-emerald-500",
  danger: "bg-[#9F1239] text-white hover:bg-[#881337]",
  outline:
    "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  ghost:
    "bg-transparent text-gray-700 hover:bg-gray-100 border border-transparent",
  link:
    "bg-transparent shadow-none text-[#0A0082] hover:underline px-0 py-0",
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

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-lg transition duration-200 focus:outline-none shadow-sm",
        Fonts.button,
        SIZE_CLASSES[size],
        VARIANT_CLASSES[variant],
        isDisabled && "opacity-50 cursor-not-allowed pointer-events-none",
        className
      )}
      {...props}
    >
      {loading && <Spinner size={size} />}
      {loading && loadingText ? loadingText : children}
    </button>
  );
};

export default Button;