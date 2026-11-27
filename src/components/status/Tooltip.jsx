import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";

// `usePortal` is opt-in and defaults to false, so every existing consumer's
// absolutely-positioned-in-place tooltip is byte-for-byte unchanged. It exists
// for triggers that live inside a scrolling ancestor (e.g. a DataTable's
// `overflow-x-auto` wrapper) — an in-place absolutely positioned tooltip is
// still included in that ancestor's *scrollable overflow* even though it's
// visually a floating overlay, so it grows the ancestor's scroll box and can
// introduce spurious horizontal/vertical scrollbars. Portaling the tooltip to
// `document.body` and positioning it with `fixed` (viewport) coordinates
// takes it out of that ancestor's layout/overflow entirely.
const Tooltip = ({ children, content, usePortal = false }) => {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleMouseEnter = () => {
    if (usePortal && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 8, left: rect.left });
    }
    setShow(true);
  };

  return (
    <div
      ref={triggerRef}
      className="relative flex items-center cursor-default"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && !usePortal && (
        <div className="absolute z-50 top-full mt-2 w-64 p-3 text-xs text-white bg-gray-800 rounded-lg shadow-lg whitespace-pre-line">
          {content}
        </div>
      )}
      {show &&
        usePortal &&
        createPortal(
          <div
            className="fixed z-50 max-w-xs p-3 text-xs text-white bg-gray-800 rounded-lg shadow-lg whitespace-pre-line"
            style={{ top: position.top, left: position.left }}
          >
            {content}
          </div>,
          document.body,
        )}
    </div>
  );
};

export default Tooltip;
