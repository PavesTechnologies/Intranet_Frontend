import React from "react";

const Modal = ({ isOpen, onClose, title, subtitle, children, className, bodyClassName }) => {
  if (!isOpen) return null;

  // If a max-width class is passed in className, we want it to take precedence
  const hasMaxWidth = className?.includes('max-w-');
  const finalClassName = `${hasMaxWidth ? '' : 'max-w-lg'} ${className || ''}`;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 md:p-10 overflow-hidden">
      {/* Backdrop - Added 'fixed inset-0' to ensure full coverage */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className={`relative bg-white rounded-xl shadow-2xl w-full flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 border border-slate-100 ${finalClassName}`}>

        {/* Header - Added 'shrink-0' so it never squishes when scrolling */}
        <div className="p-4 border-b shrink-0 bg-white rounded-t-xl">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-[#081534]">{title}</h2>
              {subtitle && (
                <p className="text-[12px] text-gray-500 mt-0.5 leading-tight">{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="px-2.5 py-1 -mr-1 -mt-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body - Added 'overflow-y-auto' here to scroll ONLY the content */}
        <div className={`flex-1 min-h-0 overflow-y-auto ${bodyClassName || "p-4"}`}>
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;