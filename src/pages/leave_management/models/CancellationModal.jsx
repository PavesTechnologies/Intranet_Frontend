import React, { useState, Fragment } from "react";
import { Listbox, Transition } from "@headlessui/react";
import { ChevronDown } from "lucide-react";

export default function CancellationModal({
  title,
  subtitle,
  isOpen,
  isRevoke = false,
  onConfirm,
  onCancel,
  confirmText = "Confirm",
  isLoading,
}) {
  const predefinedReasons = [
    "Workload increased",
    "Incorrect request submitted",
    "Entered wrong dates",
    "Enter Valid description",
    "Other",
  ];

  if (!isOpen) return null;

  const [selectedReason, setSelectedReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const isOther = selectedReason === "Other";

  const handleConfirm = () => {
    const finalReason = isOther ? customReason : selectedReason;
    onConfirm(finalReason);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">

        {/* Title */}
        <h3 className="text-lg font-semibold mb-2">
          {title || (isRevoke ? "Confirm Revoke" : "Confirm Cancellation")}
        </h3>

        {/* Subtitle */}
        {subtitle ? (
          <p className="mb-4 text-sm text-gray-600">{subtitle}</p>
        ) : (
          <p className="mb-4 text-sm text-gray-600">
            {isRevoke
              ? "Are you sure you want to Revoke this Leave Request?"
              : "Are you sure you want to Cancel this Leave Request?"}
          </p>
        )}

        {/* Reason Label */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Select a Reason <span className="text-red-500">*</span>
        </label>

        {/* Reason Dropdown */}
        <Listbox value={selectedReason} onChange={setSelectedReason}>
          <div className="relative">
            <Listbox.Button className="w-full border px-3 py-2 rounded-lg bg-white flex justify-between items-center">
              {selectedReason || "Choose a reason"}
              <ChevronDown className="w-4 h-4 text-gray-600" />
            </Listbox.Button>

            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute mt-1 w-full bg-white border rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                {predefinedReasons.map((r) => (
                  <Listbox.Option
                    key={r}
                    value={r}
                    className={({ active }) =>
                      `cursor-pointer px-3 py-2 ${
                        active ? "bg-indigo-100" : "bg-white"
                      }`
                    }
                  >
                    {r}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>

        {/* Custom Reason Textarea */}
        {isOther && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Enter Custom Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              maxLength="60"
              rows="2"
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Type your reason here..."
              className="w-full mt-1 px-4 py-3 border border-gray-300 rounded-lg
              focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex justify-end space-x-2 mt-5">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400
            disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            onClick={handleConfirm}
            disabled={
              isLoading ||
              !selectedReason ||
              (isOther && customReason.trim().length === 0)
            }
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700
            disabled:opacity-50"
          >
            {isLoading ? `${confirmText}ing...` : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
