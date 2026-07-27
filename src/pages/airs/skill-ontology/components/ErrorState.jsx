import React from "react";
import { RotateCcw } from "lucide-react";
import Button from "../../../../components/Button/Button";

export default function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this data. Please try again.",
  onRetry,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      {/* Retry Icon */}
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <RotateCcw className="h-8 w-8 text-slate-500" strokeWidth={2.2} />
      </div>

      {/* Title */}
      <h3 className="text-lg font-semibold text-slate-800">
        {title}
      </h3>

      {/* Message */}
      <p className="mt-2 mb-6 max-w-md text-center text-sm text-slate-500">
        {message}
      </p>

      {/* Retry Button */}
      {onRetry && (
        <Button
          variant="primary"
          size="small"
          onClick={onRetry}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Retry
        </Button>
      )}
    </div>
  );
}