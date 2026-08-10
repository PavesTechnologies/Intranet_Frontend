import React from "react";
import Button from "@/components/Button/Button";

export default function PolicyEmptyState({ icon, title, description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-14 text-center">
      {icon && <div className="mb-3 text-gray-300">{icon}</div>}
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-xs text-gray-400">{description}</p>}
      {actionLabel && onAction && (
        <Button type="button" variant="outline" size="small" className="mt-4" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
