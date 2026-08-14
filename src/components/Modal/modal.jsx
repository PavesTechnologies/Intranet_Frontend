import React, { useEffect } from "react";
import { X } from "lucide-react";

import Button from "../Button/Button";
import { Fonts } from "../Fonts/Fonts";

/**
 * Dynamic Modal Component
 *
 * Supports:
 * - responsive sizes
 * - custom header/footer
 * - backdrop close
 * - reusable Button
 * - reusable Fonts
 */

const SIZE_MAP = {
  xs: "max-w-xs",
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  "7xl": "max-w-7xl",
  full: "max-w-full",
  screen: "max-w-screen-xl",
};

const POSITION_MAP = {
  center: "items-center",
  top: "items-start pt-16",
  bottom: "items-end pb-10",
};

const ANIMATION_MAP = {
  zoom: "animate-in zoom-in-95 duration-200",
  "slide-up": "animate-in slide-in-from-bottom-8 duration-300",
  "slide-down": "animate-in slide-in-from-top-8 duration-300",
  fade: "animate-in fade-in duration-300",
  none: "",
};

const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  className = "",
  bodyClassName = "",

  size = "lg",
  position = "center",
  maxHeight = "max-h-[85vh]",
  fullScreenMobile = false,
  zIndex = "z-[9999]",

  closeOnBackdrop = true,
  closeOnEscape = true,
  scrollable = true,

  showCloseButton = true,
  showHeader = true,
  headerBorder = true,

  headerClassName = "",
  footerClassName = "",
  backdropClassName = "",
  panelClassName = "",
  // Inline styles for the panel. Use when the width must be content-driven
  // (e.g. `width: fit-content`), which a class cannot express reliably against
  // the panel's own `w-full`.
  panelStyle,
  titleClassName = "",
  subtitleClassName = "",
  overlayColor = "bg-black/60",

  footer,
  closeIcon,
  titleIcon,

  animation = "zoom",
}) => {
  useEffect(() => {
    if (!isOpen || !closeOnEscape || !onClose) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeOnEscape, onClose]);

  if (!isOpen) return null;

  const mergedClassName = [className, panelClassName].filter(Boolean).join(" ");
  const hasMaxWidth = mergedClassName.includes("max-w-");
  const sizeClass = hasMaxWidth ? "" : SIZE_MAP[size] || SIZE_MAP.lg;
  const animationClass = ANIMATION_MAP[animation] ?? ANIMATION_MAP.zoom;
  const positionClass = POSITION_MAP[position] || POSITION_MAP.center;

  const mobileClass = fullScreenMobile
    ? "max-sm:max-w-none max-sm:w-screen max-sm:h-screen max-sm:rounded-none max-sm:max-h-screen"
    : "";

  return (
    <div
      className={`fixed inset-0 ${zIndex} flex justify-center overflow-hidden p-4 md:p-10 ${positionClass}`}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`fixed inset-0 ${overlayColor} backdrop-blur-sm ${
          backdropClassName || ""
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      <div
        style={panelStyle}
        className={`
          relative flex w-full flex-col rounded-xl border border-gray-200 bg-white shadow-2xl
          ${maxHeight}
          ${animationClass}
          ${sizeClass}
          ${mobileClass}
          ${mergedClassName}
        `}
      >
        {showHeader && (title || subtitle || showCloseButton) && (
          <div
            className={`
              shrink-0 rounded-t-xl bg-white p-4 sm:p-5
              ${headerBorder ? "border-b border-gray-100" : ""}
              ${headerClassName}
            `}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-3">
                {titleIcon && (
                  <div className="mt-0.5 shrink-0 text-[#0A0082]">
                    {titleIcon}
                  </div>
                )}

                <div className="min-w-0">
                  {title && (
                    <h2
                      className={`${Fonts.heading4} truncate ${
                        titleClassName || ""
                      }`}
                      title={typeof title === "string" ? title : undefined}
                    >
                      {title}
                    </h2>
                  )}

                  {subtitle && (
                    <p
                      className={`${Fonts.paragraphMuted} mt-1 text-sm ${
                        subtitleClassName || ""
                      }`}
                      title={
                        typeof subtitle === "string" ? subtitle : undefined
                      }
                    >
                      {subtitle}
                    </p>
                  )}
                </div>
              </div>

              {showCloseButton && (
                <Button
                  type="button"
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 p-0"
                  aria-label="Close modal"
                >
                  {closeIcon ?? <X className="h-4 w-4" />}
                </Button>
              )}
            </div>
          </div>
        )}

        <div
          className={`
            min-h-0 flex-1
            ${scrollable ? "overflow-y-auto" : "overflow-hidden"}
            ${bodyClassName || "p-4 sm:p-5"}
          `}
        >
          {children}
        </div>

        {footer && (
          <div
            className={`
              shrink-0 rounded-b-xl border-t border-gray-100 bg-white
              ${footerClassName || "p-4 sm:p-5"}
            `}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;