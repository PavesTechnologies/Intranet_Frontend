import { Clock3 } from "lucide-react";

/**
 * Shown in place of a list when its backend endpoint has not been released
 * yet (see utils/apiAvailability.js). Names the exact endpoint so it is clear
 * what the screen is waiting for.
 */
export default function ARFeaturePending({ title = "Waiting for backend", endpoint, description }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white ring-1 ring-slate-200">
        <Clock3 className="h-5 w-5 text-slate-400" />
      </div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="max-w-md text-xs text-slate-500">
        {description || "This screen is ready, but the AR backend has not released its API yet. It will show live data as soon as the endpoint is available."}
      </p>
      {endpoint && (
        <code className="mt-1 rounded-md bg-white px-2 py-1 font-mono text-[11px] text-slate-600 ring-1 ring-slate-200">
          {endpoint}
        </code>
      )}
    </div>
  );
}
