import React, { useEffect } from "react";
import Button from "../../../components/Button/Button";

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

  const upcomingCount = sortedHolidays.filter((h) => {
    const d = new Date(h.holidayDate);
    d.setHours(0, 0, 0, 0);
    return d >= today;
  }).length;

  return (
    <div
      id="holidayOverlay"
      onClick={(e) => e.target.id === "holidayOverlay" && onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(8px)" }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col"
        style={{
          animation: "fadeUp .28s cubic-bezier(.22,1,.36,1)",
          maxHeight: "88vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-7 py-5 rounded-t-2xl flex-shrink-0 bg-indigo-900">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">
              Company Holidays
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-white/70">
                {holidays.length} total
              </span>
              <span className="text-white/70 text-xs">•</span>
              <span className="text-xs text-white/70">
                {upcomingCount} upcoming
              </span>
            </div>
          </div>
          <Button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-all"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-4 h-4"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Button>
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sortedHolidays.map((holiday) => {
            const holidayDate = new Date(holiday.holidayDate);
            holidayDate.setHours(0, 0, 0, 0);
            const isPast = holidayDate < today;
            const isToday = holidayDate.getTime() === today.getTime();

            const monthLabel = holidayDate.toLocaleDateString("en-US", { month: "short" });
            const dayLabel = holidayDate.toLocaleDateString("en-US", { day: "2-digit" });
            const weekday = holidayDate.toLocaleDateString("en-US", { weekday: "long" });

            return (
              <div
                key={holiday.id}
                className={`relative flex items-start gap-4 rounded-xl border p-4 transition-all ${
                  isToday
                    ? "border-indigo-900 bg-indigo-200 shadow-sm shadow-indigo-900"
                    : isPast
                    ? "border-gray-100 bg-gray-50/70 opacity-55"
                    : "border-gray-100 bg-white hover:border-indigo-100 hover:shadow-md hover:shadow-gray-100"
                }`}
              >
                {/* Date block */}
                <div
                  className={`flex-shrink-0 w-13 min-w-[52px] text-center rounded-xl py-2 px-1 ${
                    isToday
                      ? "bg-indigo-600"
                      : isPast
                      ? "bg-gray-200"
                      : "bg-indigo-50"
                  }`}
                >
                  <div
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isToday ? "text-indigo-200" : isPast ? "text-gray-400" : "text-indigo-400"
                    }`}
                  >
                    {monthLabel}
                  </div>
                  <div
                    className={`text-xl font-extrabold leading-tight ${
                      isToday ? "text-white" : isPast ? "text-gray-400" : "text-indigo-700"
                    }`}
                  >
                    {dayLabel}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p
                      className={`text-sm font-semibold truncate ${
                        isToday ? "text-indigo-800" : isPast ? "text-gray-400" : "text-gray-800"
                      }`}
                    >
                      {holiday.holidayName}
                    </p>
                    {isToday && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-200 text-white uppercase tracking-wide flex-shrink-0">
                        Today
                      </span>
                    )}
                    {!isPast && !isToday && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 flex-shrink-0">
                        Upcoming
                      </span>
                    )}
                  </div>

                  <p className={`text-xs mt-0.5 font-medium ${isToday ? "text-indigo-500" : isPast ? "text-gray-300" : "text-gray-400"}`}>
                    {weekday}
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-2xl flex-shrink-0">
          <p className="text-xs text-gray-400">
            Press <kbd className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-500 font-mono text-[10px]">Esc</kbd> to close
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold text-white bg-indigo-900 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(12px) scale(.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);   }
        }
      `}</style>
    </div>
  );
}
