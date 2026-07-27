import React from "react";
import Button from "../../../../components/Button/Button";

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
      <h2 className="text-xs font-bold text-slate-800">{title}</h2>
      <p className="text-[11px] text-slate-400 mt-1 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <Button variant="primary" size="small" onClick={onRetry}>
          Retry
        </Button>
      )}
    </div>
  );
}
