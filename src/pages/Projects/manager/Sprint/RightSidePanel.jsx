import React from "react";

const RightSidePanel = ({ isOpen, onClose, children }) => {
  return (
    <div>
      {/* Background Overlay */}
      <div
        className={`fixed inset-0 bg-black bg-opacity-40 z-40 transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onClose}
      />

      {/* Sliding Panel */}
      <div
        className={`fixed top-0 right-0 h-full w-[480px] bg-white shadow-2xl z-[50]
          transform transition-transform duration-300 flex flex-col
          ${isOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        {children}
      </div>
    </div>
  );
};

export default RightSidePanel;
