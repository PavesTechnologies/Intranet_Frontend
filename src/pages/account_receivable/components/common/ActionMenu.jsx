import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { MoreVertical } from "lucide-react";

const MENU_WIDTH = 176; // matches the w-44 menu width below
const GAP = 4;
const EDGE_PADDING = 8;

export default function ActionMenu({ items }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const visibleItems = items.filter((item) => !item.hidden);

  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (!rect) return;

      // menuRef isn't mounted yet on the very first call right after opening (the portal
      // only renders once `position` is set), so fall back to an estimated height for the
      // up/down decision on that first pass. The requestAnimationFrame below re-runs this
      // once the real node exists, correcting the estimate before the browser paints.
      const menuHeight = menuRef.current?.offsetHeight || visibleItems.length * 36 + 8;

      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUpward = spaceBelow < menuHeight + GAP && spaceAbove > spaceBelow;

      const top = openUpward
        ? Math.max(EDGE_PADDING, rect.top - menuHeight - GAP)
        : Math.min(rect.bottom + GAP, window.innerHeight - menuHeight - EDGE_PADDING);
      const left = Math.max(
        EDGE_PADDING,
        Math.min(rect.right - MENU_WIDTH, window.innerWidth - MENU_WIDTH - EDGE_PADDING),
      );

      setPosition({ top, left });
    };

    updatePosition();
    const raf = requestAnimationFrame(updatePosition);

    const handleClickOutside = (event) => {
      if (
        buttonRef.current &&
        !buttonRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open, visibleItems.length]);

  return (
    <div className="relative inline-block text-left">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Row actions"
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {open &&
        position &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{ position: "fixed", top: position.top, left: position.left }}
            className="z-50 w-44 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
          >
            {visibleItems.map((item) => (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) return;
                  setOpen(false);
                  item.onClick?.();
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  item.disabled
                    ? "opacity-50 cursor-not-allowed text-slate-400"
                    : item.danger
                    ? "hover:bg-slate-50 text-red-600"
                    : "hover:bg-slate-50 text-slate-700"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
