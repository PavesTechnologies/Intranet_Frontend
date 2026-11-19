import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { useTour } from "./TourContext";
import TourCard from "./TourCard";
import { computeCardPosition, spotlightRect, stripQuery } from "./tourUtils";

const TARGET_TIMEOUT_MS = 4000;
const POLL_MS = 120;
const CARD_WIDTH = 368;
const HERO_WIDTH = 540;

const readViewport = () => ({ width: window.innerWidth, height: window.innerHeight });

const sameRect = (a, b) =>
  a && b && Math.abs(a.top - b.top) < 0.5 && Math.abs(a.left - b.left) < 0.5
  && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;

const toRect = (el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
};

/**
 * Full-screen spotlight for the running tour: dims the app, cuts a rounded
 * "hole" around the step's target, and anchors the TourCard beside it.
 * Steps on other pages navigate there first; targets that never appear
 * (role-hidden UI) are skipped automatically.
 */
export default function TourOverlay() {
  const tour = useTour();
  const { active, step, index, next, prev, stop, skipMissingStep } = tour;
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();

  const [viewport, setViewport] = useState(readViewport);
  const [targetRect, setTargetRect] = useState(null);
  const [phase, setPhase] = useState("locating"); // "locating" | "ready"
  const [cardSize, setCardSize] = useState({ width: CARD_WIDTH, height: 240 });
  const cardRef = useRef(null);
  const targetElRef = useRef(null);
  const pathnameRef = useRef(location.pathname);
  pathnameRef.current = location.pathname;

  const stepKey = active ? `${active.id}:${index}` : null;

  // 1 — take the user to the step's page.
  useEffect(() => {
    if (!step?.route) return;
    if (location.pathname !== stripQuery(step.route)) navigate(step.route);
    // Only when the step changes — not on every navigation the user makes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  // 2 — wait for the target to exist on the right page, bring it into view.
  useEffect(() => {
    if (!step) return undefined;
    targetElRef.current = null;
    setTargetRect(null);

    if (!step.target) {
      setPhase("ready");
      return undefined;
    }

    setPhase("locating");
    let cancelled = false;
    let timer;
    const startedAt = Date.now();
    const expectedPath = step.route ? stripQuery(step.route) : null;

    const attempt = () => {
      if (cancelled) return;
      const onRightPage = !expectedPath || pathnameRef.current === expectedPath;
      const el = onRightPage ? document.querySelector(step.target) : null;
      const rect = el ? el.getBoundingClientRect() : null;

      if (el && rect.width > 0 && rect.height > 0) {
        const offscreen = rect.top < 0 || rect.bottom > window.innerHeight;
        // Large regions (the page area) are left where they are.
        const fitsInView = rect.height < window.innerHeight * 0.8;
        if (offscreen && fitsInView) {
          el.scrollIntoView({ block: "center", behavior: reduceMotion ? "auto" : "smooth" });
        }
        timer = setTimeout(() => {
          if (cancelled) return;
          targetElRef.current = el;
          setTargetRect(toRect(el));
          setPhase("ready");
        }, offscreen && fitsInView ? 400 : 60);
        return;
      }

      if (Date.now() - startedAt > TARGET_TIMEOUT_MS) {
        skipMissingStep();
        return;
      }
      timer = setTimeout(attempt, POLL_MS);
    };

    attempt();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  // 3 — follow the target through scrolls, resizes and layout shifts.
  useEffect(() => {
    if (phase !== "ready" || !step?.target) return undefined;
    const measure = () => {
      setViewport((v) => {
        const nv = readViewport();
        return v.width === nv.width && v.height === nv.height ? v : nv;
      });
      const el = targetElRef.current;
      if (!el || !el.isConnected) return;
      const rect = toRect(el);
      setTargetRect((prevRect) => (sameRect(prevRect, rect) ? prevRect : rect));
    };
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && targetElRef.current) observer.observe(targetElRef.current);
    const interval = setInterval(measure, 400); // catches sidebar expand/collapse animations
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
      observer?.disconnect();
      clearInterval(interval);
    };
  }, [phase, step?.target]);

  // Viewport tracking for centred cards too.
  useEffect(() => {
    if (!active) return undefined;
    const onResize = () => setViewport(readViewport());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [active]);

  // Measure the card so it can be placed precisely.
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const update = () => {
      const size = { width: el.offsetWidth, height: el.offsetHeight };
      setCardSize((prevSize) => (prevSize.width === size.width && prevSize.height === size.height ? prevSize : size));
    };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [stepKey, phase]);

  // Keyboard: ← → to move, Esc to leave.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        stop("dismissed");
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, next, prev, stop]);

  // Move focus into the card on every step for keyboard and screen-reader users.
  useEffect(() => {
    if (phase === "ready") cardRef.current?.focus({ preventScroll: true });
  }, [phase, stepKey]);

  if (!active || !step) return null;

  const centred = !step.target;
  const hole = !centred && targetRect ? spotlightRect(targetRect, viewport, step.padding ?? 8) : null;
  const radius = step.radius ?? 12;
  const width = Math.min(centred ? HERO_WIDTH : CARD_WIDTH, viewport.width - 32);

  let position;
  if (centred) {
    position = {
      top: Math.max(16, (viewport.height - cardSize.height) / 2),
      left: (viewport.width - width) / 2,
      placement: "center",
      arrowOffset: null,
    };
  } else if (hole) {
    position = computeCardPosition(hole, { width, height: cardSize.height }, viewport, step.placement || "bottom");
  }

  const transition = reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 30 };
  const ready = phase === "ready" && position;

  return createPortal(
    <div className="fixed inset-0 z-[10000]" aria-live="polite">
      <style>{`
        @keyframes pavesTourPulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 61, 114, 0.45); }
          70% { box-shadow: 0 0 0 14px rgba(255, 61, 114, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 61, 114, 0); }
        }
        .paves-tour-ring { animation: pavesTourPulse 2s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) { .paves-tour-ring { animation: none; } }
      `}</style>

      {/* Dimmer with a spotlight cut-out. Clicks on the dimmed area are swallowed. */}
      <motion.svg
        className={`absolute inset-0 h-full w-full ${centred ? "backdrop-blur-[2px]" : ""}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.25 }}
        onClick={(e) => e.stopPropagation()}
      >
        <defs>
          <mask id="paves-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {hole && (
              <motion.rect
                initial={false}
                animate={{ x: hole.left, y: hole.top, width: hole.width, height: hole.height }}
                transition={transition}
                rx={radius}
                ry={radius}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(8, 21, 52, 0.68)" mask="url(#paves-tour-mask)" />
      </motion.svg>

      {/* Pulsing brand ring around the target. */}
      {hole && (
        <motion.div
          className="paves-tour-ring pointer-events-none absolute border-2 border-[#ff3d72]"
          style={{ borderRadius: radius }}
          initial={false}
          animate={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height }}
          transition={transition}
        />
      )}

      {/* While a step's page/target is loading. */}
      <AnimatePresence>
        {phase === "locating" && (
          <motion.div
            key="locating"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.3 } }}
            exit={{ opacity: 0 }}
            className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-xs font-medium text-[#263383] shadow-lg"
          >
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-[#263383]/25 border-t-[#263383]" />
            Taking you to the next stop…
            <button type="button" onClick={() => stop("dismissed")} className="ml-1 text-gray-400 underline-offset-2 hover:text-[#B83280] hover:underline">
              Exit
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {position && (
        <motion.div
          className="absolute"
          style={{ width, visibility: ready ? "visible" : "hidden" }}
          initial={false}
          animate={{ top: position.top, left: position.left }}
          transition={transition}
        >
          <TourCard ref={cardRef} tour={tour} placement={position.placement} arrowOffset={position.arrowOffset} />
        </motion.div>
      )}
    </div>,
    document.body,
  );
}
