// import React, { useState, useEffect } from "react";
// import axios from "axios";
// import { ChevronLeft, ChevronRight } from "lucide-react";
// import FilterListbox from "../../../components/filter/FilterListbox";

// const token = localStorage.getItem("token");

// const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// const months = [
//   "January",
//   "February",
//   "March",
//   "April",
//   "May",
//   "June",
//   "July",
//   "August",
//   "September",
//   "October",
//   "November",
//   "December",
// ];

// export default function Calendar() {
//   const today = new Date();
//   const year = today.getFullYear();
//   const [holidays, setHolidays] = useState([]); // 🎯 store backend holidays
//   const [loading, setLoading] = useState(true);
//   const [currentMonth, setCurrentMonth] = useState(today.getMonth());
//   const [currentYear, setCurrentYear] = useState(today.getFullYear());

//   const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
//   const firstDay = new Date(currentYear, currentMonth, 1).getDay();

//   const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
//   const yearOptions = Array.from({ length: 3 }, (_, i) => year - i);

//   // 🎯 Fetch holidays from backend
//   useEffect(() => {
//     const fetchHolidays = async () => {
//       try {
//         const res = await api.get(
//           `${window.__APP_CONFIG__.BASE_URL}/api/holidays/all`,
//           {
//             headers: { Authorization: `Bearer ${token}` },
//           },
//         );
//         setHolidays(res.data);
//       } catch (err) {
//         console.error("Error fetching holiday data:", err);
//       } finally {
//         setLoading(false);
//       }
//     };
//     fetchHolidays();
//   }, []);

//   const prevMonth = () => {
//     if (currentMonth === 0) {
//       setCurrentMonth(11);
//       setCurrentYear((prev) => prev - 1);
//     } else {
//       setCurrentMonth((prev) => prev - 1);
//     }
//   };

//   const nextMonth = () => {
//     if (currentMonth === 11) {
//       setCurrentMonth(0);
//       setCurrentYear((prev) => prev + 1);
//     } else {
//       setCurrentMonth((prev) => prev + 1);
//     }
//   };

//   // ✅ Match holiday by date
//   const getHolidayForDate = (day) => {
//     const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
//     return holidays.find((h) => h.holidayDate === dateString);
//   };

//   if (loading) {
//     return (
//       <div className="max-w-md mx-auto bg-white shadow-md rounded-xl p-6 text-center mt-10">
//         <p className="text-gray-500 animate-pulse">Loading calendar...</p>
//       </div>
//     );
//   }

//   return (
//     <div className="max-w-md mx-auto bg-white shadow-lg rounded-2xl p-6 mt-10 border border-gray-100">
//       {/* Header */}
//       <div className="flex justify-between items-center mb-4">
//         <button
//           onClick={prevMonth}
//           className="p-2 rounded-full hover:bg-gray-200 transition"
//         >
//           <ChevronLeft className="w-5 h-5" />
//         </button>

//         <div className="flex items-center space-x-3">
//           {/* Month Selector */}
//           <FilterListbox
//             options={months.map((month, index) => ({ value: index, label: month }))}
//             value={currentMonth}
//             onChange={setCurrentMonth}
//           />

//           {/* Year Selector */}
//           <FilterListbox
//             options={yearOptions.map((year) => ({ value: year, label: String(year) }))}
//             value={currentYear}
//             onChange={setCurrentYear}
//           />
//         </div>

//         <button
//           onClick={nextMonth}
//           className="p-2 rounded-full hover:bg-gray-200 transition"
//         >
//           <ChevronRight className="w-5 h-5" />
//         </button>
//       </div>

//       {/* Days of week */}
//       <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 mb-2">
//         {daysOfWeek.map((day) => (
//           <div key={day}>{day}</div>
//         ))}
//       </div>

//       {/* Calendar days */}
//       <div className="grid grid-cols-7 gap-1 text-center">
//         {Array(firstDay)
//           .fill(null)
//           .map((_, i) => (
//             <div key={`empty-${i}`} />
//           ))}

//         {daysArray.map((day) => {
//           const isToday =
//             day === today.getDate() &&
//             currentMonth === today.getMonth() &&
//             currentYear === today.getFullYear();

//           const holiday = getHolidayForDate(day);

//           return (
//             <div
//               key={day}
//               className={`relative p-2 rounded-lg cursor-pointer transition group ${isToday
//                 ? "bg-blue-500 text-white font-bold"
//                 : holiday
//                   ? "bg-red-100 text-red-700 font-medium hover:bg-red-200"
//                   : "hover:bg-gray-100"
//                 }`}
//             >
//               {day}

//               {/* Holiday Dot */}
//               {holiday && (
//                 <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
//               )}

//               {/* Tooltip */}
//               {holiday && (
//                 <div className="absolute z-10 hidden group-hover:block w-44 left-1/2 -translate-x-1/2 bottom-8 bg-gray-800 text-white text-xs rounded-md shadow-md px-2 py-1">
//                   <strong>{holiday.holidayName}</strong>
//                   <p className="text-gray-300 text-[11px]">
//                     {holiday.holidayDescription}
//                   </p>
//                 </div>
//               )}
//             </div>
//           );
//         })}
//       </div>
//     </div>
//   );
// }


import React, { useState, useEffect } from "react";
import api from "../../../api/axiosInstance";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Button from "../../../components/Button/Button";


const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ── Inline native select — fixes truncation, matches dashboard style ─────────
function NativeSelect({ options, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm font-medium rounded-lg px-3 py-1.5 pr-7 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-colors"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  );
}

export default function Calendar() {
  const today = new Date();
  const year = today.getFullYear();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(null);

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => year + 1 - i);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await api.get(
          `${window.__APP_CONFIG__.BASE_URL}/api/holidays/all`,
          {
            headers: { Authorization: `Bearer ${ localStorage.getItem("token")}` },
          },
        );
        setHolidays(res.data);
      } catch (err) {
        console.error("Error fetching holiday data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, []);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear((p) => p - 1); }
    else setCurrentMonth((p) => p - 1);
  };

  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear((p) => p + 1); }
    else setCurrentMonth((p) => p + 1);
  };

  const getHolidayForDate = (day) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return holidays.find((h) => h.holidayDate === dateString);
  };

  const isWeekend = (day) => {
    const d = new Date(currentYear, currentMonth, day).getDay();
    return d === 0 || d === 6;
  };

  // Holidays in current month for the legend
  const monthHolidays = holidays.filter((h) => {
    const d = new Date(h.holidayDate);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl p-5">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-5 h-5 bg-gray-200 rounded" />
          <div className="h-4 bg-gray-200 rounded w-32" />
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1">
          {Array(35).fill(null).map((_, i) => (
            <div key={i} className="h-8 bg-gray-100 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5">

      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-800">Calendar</h2>

        <div className="flex items-center gap-2">
          {/* Month dropdown — full label, no truncation */}
          <NativeSelect
            options={months.map((m, i) => ({ value: i, label: m }))}
            value={currentMonth}
            onChange={setCurrentMonth}
          />
          {/* Year dropdown */}
          <NativeSelect
            options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
            value={currentYear}
            onChange={setCurrentYear}
          />
        </div>

        <div className="flex items-center gap-1">
          <Button
            onClick={prevMonth}
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            className="w-7 h-7 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            onClick={nextMonth}
            variant="ghost"
            size="icon"
            aria-label="Next month"
            className="w-7 h-7 hover:bg-gray-100 text-gray-500 hover:text-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ── Day labels ──────────────────────────────────────────── */}
      <div className="grid grid-cols-7 mb-1">
        {daysOfWeek.map((d) => (
          <div
            key={d}
            className={`text-center text-[11px] font-medium py-1 ${d === "Sun" || d === "Sat" ? "text-red-400" : "text-gray-400"
              }`}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Day grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}

        {daysArray.map((day) => {
          const isToday =
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();

          const holiday = getHolidayForDate(day);
          const weekend = isWeekend(day);
          const isSelected = selectedDay === day;

          return (
            <div key={day} className="relative flex justify-center group py-0.5">
              <button
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`
                  w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-all
                  ${isToday
                    ? "bg-gray-900 text-white font-semibold"
                    : isSelected
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-300"
                      : holiday
                        ? "bg-red-50 text-red-600 hover:bg-red-100"
                        : weekend
                          ? "text-red-400 hover:bg-gray-50"
                          : "text-gray-700 hover:bg-gray-50"
                  }
                `}
              >
                {day}
              </button>

              {/* Holiday dot */}
              {holiday && !isToday && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-red-400 rounded-full" />
              )}

              {/* Tooltip */}
              {holiday && (
                <div className="absolute z-20 hidden group-hover:flex flex-col bottom-10 left-1/2 -translate-x-1/2 w-44 bg-gray-900 text-white text-[11px] rounded-xl shadow-lg px-3 py-2 pointer-events-none">
                  <span className="font-semibold text-xs mb-0.5">{holiday.holidayName}</span>
                  {holiday.holidayDescription && (
                    <span className="text-gray-400 leading-relaxed">{holiday.holidayDescription}</span>
                  )}
                  {/* arrow */}
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-gray-900 rotate-45 rounded-sm" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── This month's holidays list ───────────────────────────── */}
      {/* {monthHolidays.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-[11px] font-medium text-gray-400 uppercase tracking-widest mb-2">
            Holidays this month
          </p>
          <ul className="flex flex-col gap-1.5">
            {monthHolidays.map((h) => {
              const d = new Date(h.holidayDate);
              return (
                <li key={h.holidayDate} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                    <span className="text-xs text-gray-700">{h.holidayName}</span>
                  </div>
                  <span className="text-[11px] text-gray-400">
                    {d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )} */}

      {/* ── Legend ──────────────────────────────────────────────── */}
      {/* <div className="mt-3 flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-md bg-gray-900 inline-block" />
          <span className="text-[11px] text-gray-400">Today</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-5 rounded-md bg-red-50 inline-block" />
          <span className="text-[11px] text-gray-400">Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-red-400 font-medium">S</span>
          <span className="text-[11px] text-gray-400">Weekend</span>
        </div>
      </div> */}
    </div>
  );
}