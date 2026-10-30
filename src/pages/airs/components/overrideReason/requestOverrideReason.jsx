import React, { useState } from "react";
import { createRoot } from "react-dom/client";

const STAGE_LABEL = (stage) => (stage || "").replaceAll("_", " ").toLowerCase();

// The reason picker shown when a move goes against the system's screening outcome (or resolves a
// HOLD): the server refused the move with OVERRIDE_REASON_REQUIRED and the codes to choose from.
// Codes only - there is no free-text field on purpose.
function OverrideReasonDialog({ info, message, onDone }) {
  const [code, setCode] = useState("");
  const isOverride = info?.kind === "OVERRIDE";
  const batch = Number(info?.candidates_in_batch || 1);

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4" role="dialog"
      aria-modal="true" aria-labelledby="override-reason-title">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h2 id="override-reason-title" className="text-sm font-bold text-slate-900">
          {isOverride ? "This move goes against the system's outcome" : "Resolving a HOLD"}
        </h2>
        <p className="mt-1 text-xs text-slate-600">
          {message || "Choose a reason for this move."}
        </p>
        <p className="mt-2 text-xs text-slate-500">
          System outcome <span className="font-semibold">{info?.system_outcome}</span>; moving from{" "}
          <span className="font-semibold">{STAGE_LABEL(info?.from_stage)}</span> to{" "}
          <span className="font-semibold">{STAGE_LABEL(info?.to_stage)}</span>.
          {batch > 1 && <> The reason applies to all {batch} candidates in this move.</>}
        </p>
        <fieldset className="mt-3 space-y-1.5">
          <legend className="sr-only">Reason</legend>
          {(info?.reason_codes || []).map((option) => (
            <label key={option.code} className="flex cursor-pointer items-center gap-2 text-xs text-slate-800">
              <input type="radio" name="override-reason" value={option.code} checked={code === option.code}
                onChange={() => setCode(option.code)} />
              {option.label}
            </label>
          ))}
        </fieldset>
        <p className="mt-3 text-[11px] text-slate-400">
          Recorded with the move, so the system's outcomes can be reviewed against people's decisions.
        </p>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700"
            onClick={() => onDone(null)}>
            Cancel
          </button>
          <button type="button" disabled={!code}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
            onClick={() => onDone(code)}>
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

// Shows the picker and resolves with the chosen code, or null when cancelled. Mounts its own root,
// so any screen's stage move can ask without wiring a modal into its own tree.
export function requestOverrideReason(info, message) {
  return new Promise((resolve) => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (value) => {
      root.unmount();
      host.remove();
      resolve(value);
    };
    root.render(<OverrideReasonDialog info={info} message={message} onDone={done} />);
  });
}
