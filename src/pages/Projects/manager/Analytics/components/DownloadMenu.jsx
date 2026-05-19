import React, { useState, useRef, useEffect } from "react";
import { Download, Image, FileText, Table, ChevronDown } from "lucide-react";

const DownloadMenu = ({ onPNG, onPDF, onCSV }) => {
  const [open, setOpen] = useState(false);
  const ref             = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const items = [
    { label: "Export PNG",  icon: Image,    action: onPNG },
    { label: "Export PDF",  icon: FileText, action: onPDF },
    { label: "Export CSV",  icon: Table,    action: onCSV },
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 text-white text-sm
                   font-medium rounded-lg hover:bg-indigo-700 transition-colors duration-150"
      >
        <Download className="w-4 h-4" />
        Download
        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-slate-200
                        rounded-lg shadow-lg z-50 overflow-hidden">
          {items.map(({ label, icon: Icon, action }) => (
            <button
              key={label}
              onClick={() => { action?.(); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-600
                         hover:bg-slate-50 hover:text-slate-900 transition-colors duration-100"
            >
              <Icon className="w-4 h-4 text-slate-400" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default DownloadMenu;