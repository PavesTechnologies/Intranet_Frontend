// src/components/AddCasesModal.jsx
import React, { useState, useEffect } from "react";
import Button from "../../../../components/Button/Button";

export default function AddCasesModal({ show, onClose, availableCases, onSubmit }) {
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    // clear selection when modal opens/closes
    if (!show) setSelected([]);
  }, [show]);

  if (!show) return null;

  const toggle = (id) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-xl w-[540px] shadow-xl relative">
        <h2 className="text-lg font-semibold mb-4">Add Test Cases</h2>

        <div className="max-h-64 overflow-y-auto border p-2 rounded">
          {availableCases.length === 0 ? (
            <p className="text-gray-500">No available test cases found.</p>
          ) : (
            availableCases.map((tc) => (
              <label key={tc.id} className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  value={tc.id}
                  checked={selected.includes(tc.id)}
                  onChange={() => toggle(tc.id)}
                />
                <span>{tc.title}</span>
              </label>
            ))
          )}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button variant="success" onClick={() => onSubmit(selected)}>
            Add Selected Cases
          </Button>

          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>

        <button
          className="absolute top-3 right-4 text-gray-400 hover:text-black"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
