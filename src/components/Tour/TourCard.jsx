import React, { forwardRef } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Compass, Lightbulb, X } from "lucide-react";

import { WELCOME_TOUR_ID } from "./tours";

/* Paves palette — matches Sidebar/Header. */
const NAVY = "#081534";
const INDIGO = "#263383";
const PINK = "#ff3d72";
const MAGENTA = "#B83280";

const HERO_GRADIENT = `linear-gradient(135deg, ${NAVY} 0%, ${INDIGO} 58%, ${MAGENTA} 100%)`;
const ACCENT_GRADIENT = `linear-gradient(90deg, ${INDIGO} 0%, ${MAGENTA} 60%, ${PINK} 100%)`;

const ARROW_SIDE = { bottom: "top", top: "bottom", right: "left", left: "right" };

function Arrow({ placement, offset }) {
  const side = ARROW_SIDE[placement];
  if (!side || offset == null) return null;
  const horizontal = side === "top" || side === "bottom";
  return (
    <span
      aria-hidden="true"
      className="absolute h-3 w-3 rotate-45 border-[#e4e8f2] bg-white"
      style={{
        [side]: -6,
        ...(horizontal ? { left: offset - 6 } : { top: offset - 6 }),
        borderTopWidth: side === "top" || side === "left" ? 1 : 0,
        borderLeftWidth: side === "top" || side === "left" ? 1 : 0,
        borderBottomWidth: side === "bottom" || side === "right" ? 1 : 0,
        borderRightWidth: side === "bottom" || side === "right" ? 1 : 0,
      }}
    />
  );
}

function Flow({ steps }) {
  if (!steps?.length) return null;
  return (
    <ol className="mt-4 flex flex-wrap items-center gap-1.5" aria-label="How it flows">
      {steps.map((label, i) => (
        <li key={label} className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e4e8f2] bg-[#f4f6fc] py-1 pl-1 pr-2.5 text-[11px] font-medium text-[#263383]">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#263383] text-[9px] font-bold text-white">{i + 1}</span>
            {label}
          </span>
          {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-[#B83280]" aria-hidden="true" />}
        </li>
      ))}
    </ol>
  );
}

function Items({ items, columns = 1 }) {
  if (!items?.length) return null;
  return (
    <ul className={`mt-3 grid gap-2 ${columns === 2 ? "sm:grid-cols-2" : ""}`}>
      {items.map((item) => (
        <li key={item.label} className="flex gap-2.5 rounded-lg border border-[#eef1f8] bg-[#fafbfd] px-3 py-2">
          <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: PINK }} aria-hidden="true" />
          <span className="min-w-0 text-xs leading-relaxed">
            <span className="font-semibold text-[#081534]">{item.label}</span>
            {item.desc && <span className="text-gray-500"> — {item.desc}</span>}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Tip({ text }) {
  if (!text) return null;
  return (
    <div className="mt-3 flex gap-2 rounded-lg border border-[#fbd5e3] bg-[#fff5f8] px-3 py-2 text-xs leading-relaxed text-[#7a1f4f]">
      <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B83280]" aria-hidden="true" />
      <span>{text}</span>
    </div>
  );
}

function Progress({ index, total, onJump }) {
  if (total <= 12) {
    return (
      <div className="flex items-center gap-1" role="tablist" aria-label="Tour progress">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`Go to step ${i + 1}`}
            onClick={() => onJump(i)}
            className="h-1.5 rounded-full transition-all duration-300"
            style={{
              width: i === index ? 18 : 6,
              background: i === index ? PINK : i < index ? INDIGO : "#dfe3ef",
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[#dfe3ef]" aria-label={`Step ${index + 1} of ${total}`}>
      <div className="h-full rounded-full" style={{ width: `${((index + 1) / total) * 100}%`, background: ACCENT_GRADIENT }} />
    </div>
  );
}

function SuggestedTours({ tour }) {
  const { tours, start, stop, isCompleted } = tour;
  const suggestions = tours
    .filter((t) => t.id !== WELCOME_TOUR_ID)
    .sort((a, b) => Number(isCompleted(a.id)) - Number(isCompleted(b.id)))
    .slice(0, 6);
  if (!suggestions.length) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Continue with a module tour</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {suggestions.map((t) => {
          const Icon = t.icon || Compass;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                stop("completed"); // finishing the current tour by choosing the next one
                start(t.id);
              }}
              className="group flex items-center gap-2.5 rounded-lg border border-[#e4e8f2] bg-white px-3 py-2 text-left transition-all hover:border-[#263383] hover:bg-[#f4f6fc]"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#f4f6fc] text-[#263383] group-hover:bg-[#263383] group-hover:text-white">
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1 truncate text-xs font-semibold text-[#081534]">{t.title}</span>
              {isCompleted(t.id) ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Completed" />
              ) : (
                <ArrowRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-[#B83280]" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TourCard = forwardRef(function TourCard({ tour, placement, arrowOffset }, ref) {
  const { active, step, index, total, next, prev, goTo, stop } = tour;
  const navigate = useNavigate();
  const reduceMotion = useReducedMotion();
  if (!active || !step) return null;

  const isHero = step.variant === "hero" || step.variant === "outro" || !step.target;
  const isFirst = index === 0;
  const isLast = index === total - 1;
  const Icon = active.icon || Compass;

  const handleAction = () => {
    stop("completed");
    navigate(step.action.to);
  };

  const nextLabel = isLast ? "Finish" : isFirst && isHero ? "Start tour" : "Next";

  const content = (
    <motion.div
      key={`${active.id}:${index}`}
      initial={reduceMotion ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? undefined : { opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {isHero ? (
        <div className="relative overflow-hidden px-6 pb-5 pt-6 text-white" style={{ background: HERO_GRADIENT }}>
          <span className="pointer-events-none absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden="true" />
          <span className="pointer-events-none absolute -bottom-16 right-16 h-32 w-32 rounded-full bg-[#ff3d72]/25 blur-xl" aria-hidden="true" />
          <div className="relative flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/95 shadow-md">
              {step.variant === "outro" ? (
                <Check className="h-5 w-5 text-[#263383]" />
              ) : active.id === WELCOME_TOUR_ID ? (
                <img src="/logo.png" alt="" className="h-7 w-7" />
              ) : (
                <Icon className="h-5 w-5 text-[#263383]" />
              )}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
                {step.variant === "outro" ? "Tour complete" : `Guided tour · ${total} steps`}
              </p>
              <p className="truncate text-xs font-medium text-white/90">{active.title}</p>
            </div>
          </div>
          <h2 id="paves-tour-title" className="relative mt-4 font-heading text-xl font-semibold leading-snug">
            {step.title}
          </h2>
        </div>
      ) : (
        <div className="px-5 pt-4">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#f4f6fc] text-[#263383]">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[#B83280]">
              {active.title}
            </span>
            <span className="mr-7 text-[11px] font-medium tabular-nums text-gray-400">
              {index + 1} / {total}
            </span>
          </div>
          <h2 id="paves-tour-title" className="mt-3 font-heading text-[15px] font-semibold leading-snug text-[#081534]">
            {step.title}
          </h2>
        </div>
      )}

      <div className={isHero ? "px-6 pt-4" : "px-5 pt-1.5"}>
        {step.body && (
          <p id="paves-tour-body" className="text-[13px] leading-relaxed text-gray-600">
            {step.body}
          </p>
        )}
        <Flow steps={step.flow} />
        <Items items={step.items} columns={isHero ? 2 : 1} />
        <Tip text={step.tip} />
        {step.suggestTours && <SuggestedTours tour={tour} />}
      </div>
    </motion.div>
  );

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="paves-tour-title"
      aria-describedby={step.body ? "paves-tour-body" : undefined}
      className="relative rounded-2xl outline-none"
      style={{ boxShadow: "0 28px 64px -16px rgba(8, 21, 52, 0.55), 0 2px 6px rgba(8, 21, 52, 0.08)" }}
    >
    <Arrow placement={placement} offset={arrowOffset} />
    <div className="relative max-h-[calc(100vh-32px)] overflow-y-auto rounded-2xl border border-[#e4e8f2] bg-white">
      {!isHero && <div className="h-1 w-full" style={{ background: ACCENT_GRADIENT }} aria-hidden="true" />}

      <button
        type="button"
        onClick={() => stop("dismissed")}
        aria-label="Close tour"
        className={`absolute right-3 z-10 rounded-md p-1 transition-colors ${
          isHero ? "top-3 text-white/70 hover:bg-white/15 hover:text-white" : "top-[17px] text-gray-400 hover:bg-[#f4f6fc] hover:text-[#081534]"
        }`}
      >
        <X className={isHero ? "h-4 w-4" : "h-3.5 w-3.5"} />
      </button>

      <AnimatePresence mode="wait" initial={false}>
        {content}
      </AnimatePresence>

      {/* Footer */}
      <div className={`mt-4 flex items-center justify-between gap-3 border-t border-[#eef1f8] ${isHero ? "px-6 py-4" : "px-5 py-3"}`}>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Progress index={index} total={total} onJump={goTo} />
          {!isLast && (
            <button
              type="button"
              onClick={() => stop("dismissed")}
              className="w-fit text-[11px] font-medium text-gray-400 transition-colors hover:text-[#B83280]"
            >
              Skip tour
            </button>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {!isFirst && (
            <button
              type="button"
              onClick={prev}
              className="inline-flex items-center gap-1 rounded-lg border border-[#e4e8f2] bg-white px-3 py-2 text-xs font-semibold text-[#263383] transition-colors hover:bg-[#f4f6fc]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </button>
          )}
          {isLast && step.action ? (
            <button
              type="button"
              onClick={handleAction}
              className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-transform hover:-translate-y-px"
              style={{ background: ACCENT_GRADIENT }}
            >
              {step.action.label} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#263383] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-px hover:bg-[#1d2870]"
            >
              {nextLabel}
              {isLast ? <Check className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>
      </div>

      {!isHero && (
        <p className="hidden border-t border-[#f3f4f8] bg-[#fafbfd] px-5 py-1.5 text-[10px] text-gray-400 sm:block">
          <kbd className="font-sans font-semibold text-gray-500">←</kbd> <kbd className="font-sans font-semibold text-gray-500">→</kbd> to move ·{" "}
          <kbd className="font-sans font-semibold text-gray-500">Esc</kbd> to exit
        </p>
      )}
    </div>
    </div>
  );
});

export default TourCard;
