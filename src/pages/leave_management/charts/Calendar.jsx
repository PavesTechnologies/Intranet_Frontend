import React, { useState, useEffect } from "react";
import axios from "axios";
import { ChevronLeft, ChevronRight } from "lucide-react";



const token = localStorage.getItem("token");

const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const months = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Calendar() {
  const today = new Date();
  const [holidays, setHolidays] = useState([]); // 🎯 store backend holidays
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());

  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();

  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const yearOptions = Array.from({ length: 5 }, (_, i) => 2023 + i);

  // 🎯 Fetch holidays from backend
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await axios.get(`${window.__APP_CONFIG__.BASE_URL}/api/holidays/all`,{
            headers: { Authorization: `Bearer ${token}` }
        });
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
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  // ✅ Match holiday by date
  const getHolidayForDate = (day) => {
    const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return holidays.find((h) => h.holidayDate === dateString);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto bg-white shadow-md rounded-xl p-6 text-center mt-10">
        <p className="text-gray-500 animate-pulse">Loading calendar...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto bg-white shadow-lg rounded-2xl p-6 mt-10 border border-gray-100">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <button onClick={prevMonth} className="p-2 rounded-full hover:bg-gray-200 transition">
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3">
          {/* Month Selector */}
          <select
            value={currentMonth}
            onChange={(e) => setCurrentMonth(parseInt(e.target.value))}
            className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 cursor-pointer transition"
          >
            {months.map((month, index) => (
              <option key={month} value={index}>{month}</option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={currentYear}
            onChange={(e) => setCurrentYear(parseInt(e.target.value))}
            className="appearance-none bg-gray-50 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 hover:bg-gray-100 cursor-pointer transition"
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>

        <button onClick={nextMonth} className="p-2 rounded-full hover:bg-gray-200 transition">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Days of week */}
      <div className="grid grid-cols-7 text-center text-sm font-medium text-gray-500 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar days */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {Array(firstDay)
          .fill(null)
          .map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

        {daysArray.map((day) => {
          const isToday =
            day === today.getDate() &&
            currentMonth === today.getMonth() &&
            currentYear === today.getFullYear();

          const holiday = getHolidayForDate(day);

          return (
            <div
              key={day}
              className={`relative p-2 rounded-lg cursor-pointer transition group ${
                isToday
                  ? "bg-blue-500 text-white font-bold"
                  : holiday
                  ? "bg-red-100 text-red-700 font-medium hover:bg-red-200"
                  : "hover:bg-gray-100"
              }`}
            >
              {day}

              {/* Holiday Dot */}
              {holiday && (
                <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full"></div>
              )}

              {/* Tooltip */}
              {holiday && (
                <div className="absolute z-10 hidden group-hover:block w-44 left-1/2 -translate-x-1/2 bottom-8 bg-gray-800 text-white text-xs rounded-md shadow-md px-2 py-1">
                  <strong>{holiday.holidayName}</strong>
                  <p className="text-gray-300 text-[11px]">
                    {holiday.holidayDescription}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
