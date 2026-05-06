import React, { useEffect } from "react";

export default function AllHolidaysGrid({ holidays, onClose }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const handleEsc = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const sortedHolidays = [...holidays].sort(
    (a, b) => new Date(a.holidayDate) - new Date(b.holidayDate)
  );

  return (
    <div
      id="holidayOverlay"
      onClick={(e) => e.target.id === "holidayOverlay" && onClose()}
      className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto p-6 pt-10"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden"
        style={{ animation: "fadeUp .25s cubic-bezier(.22,1,.36,1)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Company Holidays</h2>
            <p className="text-xs text-gray-400 mt-0.5">{holidays.length} holidays this year</p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        {/* Grid */}
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[70vh] overflow-y-auto">
          {sortedHolidays.map((holiday) => {
            const holidayDate = new Date(holiday.holidayDate);
            holidayDate.setHours(0, 0, 0, 0);
            const isPast = holidayDate < today;
            const isToday = holidayDate.getTime() === today.getTime();

            return (
              <div
                key={holiday.id}
                className={`relative flex items-start gap-4 rounded-xl border p-4 transition-all ${
                  isToday
                    ? "border-blue-200 bg-blue-50"
                    : isPast
                    ? "border-gray-100 bg-gray-50 opacity-60"
                    : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
                }`}
              >
                {/* Date block */}
                <div className={`flex-shrink-0 w-12 text-center rounded-lg py-1.5 ${
                  isToday ? "bg-blue-600" : isPast ? "bg-gray-200" : "bg-slate-100"
                }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-wide ${
                    isToday ? "text-blue-100" : isPast ? "text-gray-400" : "text-slate-400"
                  }`}>
                    {holidayDate.toLocaleDateString("en-US", { month: "short" })}
                  </div>
                  <div className={`text-lg font-bold leading-tight ${
                    isToday ? "text-white" : isPast ? "text-gray-400" : "text-slate-700"
                  }`}>
                    {holidayDate.toLocaleDateString("en-US", { day: "2-digit" })}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold truncate ${
                      isToday ? "text-blue-800" : isPast ? "text-gray-400" : "text-gray-800"
                    }`}>
                      {holiday.holidayName}
                    </p>
                    {isToday && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-600 text-white uppercase tracking-wide flex-shrink-0">
                        Today
                      </span>
                    )}
                  </div>

                  <p className={`text-xs mt-0.5 ${isToday ? "text-blue-500" : "text-gray-400"}`}>
                    {holidayDate.toLocaleDateString("en-US", { weekday: "long" })}
                  </p>

                  {holiday.holidayDescription && (
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">
                      {holiday.holidayDescription}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px) scale(.98); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
      `}</style>
    </div>
  );
}