import React from "react";
import { MoreVertical, Pencil, Trash } from "lucide-react";
import { useState, useEffect, useRef} from "react";
import Button from "../../../components/Button/Button";

const ActionDropdown = ({ onEdit, onDelete }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
 
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
 
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
 
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);
 
  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <Button onClick={() => setIsOpen(!isOpen)} variant="ghost" size="icon" aria-label="Open actions menu">
        <MoreVertical className="w-5 h-5 cursor-pointer" />
      </Button>
 
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-36 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5">
          <div className="py-1">
            <button
              onClick={() => {
                setIsOpen(false);
                onEdit();
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Pencil className="w-4 h-4 mr-2" /> Edit
            </button>
            <button
              onClick={() => {
                setIsOpen(false);
                onDelete();
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-100"
            >
              <Trash className="w-4 h-4 mr-2" /> Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
 
export default ActionDropdown;