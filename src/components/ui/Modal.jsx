import React from "react";
import { X } from "lucide-react";

const Modal = ({ isOpen, onClose, title, children, width = "500px", height }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="bg-white rounded-2xl shadow-xl p-6 relative flex flex-col max-h-full"
        style={{ width, height }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-black">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1">{children}</div>
      </div>
    </div>
  );
};

export default Modal;
