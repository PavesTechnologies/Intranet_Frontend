import React, { useEffect, useRef, useState } from "react";
import { animate } from "framer-motion";

/**
 * Count-up number built on framer-motion's imperative animate() —
 * the same animation library already used elsewhere in the app (Leave
 * Management, Projects, Header, etc.), just not yet inside XMS.
 */
export default function AnimatedNumber({ value = 0, format, duration = 0.6, className = "" }) {
  const [display, setDisplay] = useState(0);
  const prevValueRef = useRef(0);

  useEffect(() => {
    const safeValue = Number.isFinite(value) ? value : 0;
    const controls = animate(prevValueRef.current, safeValue, {
      duration,
      ease: "easeOut",
      onUpdate: (latest) => setDisplay(latest),
    });
    prevValueRef.current = safeValue;
    return () => controls.stop();
  }, [value, duration]);

  const formatted = format
    ? format(display)
    : display.toLocaleString(undefined, { maximumFractionDigits: 0 });

  return <span className={className}>{formatted}</span>;
}
