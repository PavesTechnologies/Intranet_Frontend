"use client";

import React from "react";
import { X } from "lucide-react";

export default function LargeModal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[85vh] p-6 relative flex flex-col">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
        >
          <X size={20} />
        </button>

        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">{title}</h2>

          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>

        <div className="space-y-4 overflow-y-auto pr-2 flex-1">{children}</div>
      </div>
    </div>
  );
}
