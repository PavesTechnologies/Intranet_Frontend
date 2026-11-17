// components/ActionDropdown.js or .tsx
import React, { useState, useRef, useEffect } from "react";
import { MoreHorizontal, FileText, XCircle } from "lucide-react";
import Button from "../../../components/Button/Button";

const ActionDropdownPendingLeaveRequests = ({ onEdit, onCancel }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <Button onClick={() => setOpen(!open)} variant="ghost" size="icon" aria-label="Open actions menu" className="p-1 text-gray-500 hover:text-gray-700">
        <MoreHorizontal className="w-5 h-5" />
      </Button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow-lg z-50">
          <button
            onClick={() => {
              onEdit();
              setOpen(false);
            }}
            className="flex items-center px-4 py-2 text-sm w-full hover:bg-gray-100"
          >
            <FileText className="w-4 h-4 mr-2" /> Edit
          </button>
          <button
            onClick={() => {
              onCancel();
              setOpen(false);
            }}
            className="flex items-center px-4 py-2 text-sm w-full hover:bg-gray-100 text-red-600"
          >
            <XCircle className="w-4 h-4 mr-2" /> Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ActionDropdownPendingLeaveRequests;
