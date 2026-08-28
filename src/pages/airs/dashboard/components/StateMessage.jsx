import React from "react";
import { Inbox, AlertCircle, RotateCcw } from "lucide-react";

// A fetch that throws (401/network/5xx) and a fetch that succeeds with zero
// rows look identical if both just render "No data" — that makes a broken
// call indistinguishable from a genuinely quiet dashboard. This renders the
// two states differently, and gives either state real height/weight instead
// of collapsing to a single line of small gray text.
export default function StateMessage({ variant = "empty", title, detail, onRetry, minHeight = 120 }) {
    const isError = variant === "error";
    const Icon = isError ? AlertCircle : Inbox;
    return (
        <div
            className="flex flex-col items-center justify-center gap-1.5 text-center py-4 px-4"
            style={{ minHeight }}
        >
            <div className={`flex h-8 w-8 items-center justify-center rounded-full ${isError ? "bg-red-50 text-red-500" : "bg-slate-100 text-slate-400"}`}>
                <Icon className="h-4 w-4" />
            </div>
            <p className={`text-xs font-semibold ${isError ? "text-red-600" : "text-slate-500"}`}>
                {title || (isError ? "Couldn't load this data" : "Nothing to show yet")}
            </p>
            {isError && detail && (
                <p className="text-[11px] text-slate-400 max-w-xs break-words">{detail}</p>
            )}
            {isError && onRetry && (
                <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 mt-1"
                >
                    <RotateCcw className="h-3 w-3" /> Retry
                </button>
            )}
        </div>
    );
}
