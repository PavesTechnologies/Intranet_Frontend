import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Calendar as CalendarIcon } from "lucide-react";
import { format, isSameDay } from "date-fns";
import { toast } from "react-toastify";
import api from "../../../api/axiosInstance";
import { useAuth } from "../../../contexts/AuthContext";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// Style for holidays
const holidayStyleRed = { backgroundColor: "#fee2e2", color: "#b91c1c" };

const LeaveDayButton = (props) => {
  const { day, modifiers, ...buttonProps } = props;
  const ref = useRef(null);
  const [coords, setCoords] = useState(null);

  useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  if (!modifiers.leave) {
    return <button ref={ref} {...buttonProps} />;
  }

  const showTooltip = () => {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) {
      setCoords({ top: rect.top, left: rect.left + rect.width / 5 });
    }
  };

  return (
    <>
      <button
        ref={ref}
        {...buttonProps}
        onMouseEnter={(e) => {
          buttonProps.onMouseEnter?.(e);
          showTooltip();
        }}
        onMouseLeave={(e) => {
          buttonProps.onMouseLeave?.(e);
          setCoords(null);
        }}
      />
      {coords &&
        createPortal(
          <div
            className="fixed z-[9999] -translate-x-1/2 -translate-y-full -mt-2 rounded-md border bg-popover px-3 py-1.5 text-xs text-popover-foreground shadow-md whitespace-nowrap pointer-events-none"
            style={{ top: coords.top, left: coords.left }}
          >
            You have already applied leave for this day.
          </div>,
          document.body,
        )}
    </>
  );
};

const DateRangePicker = ({
  label,
  onChange,
  defaultDate,
  disabledDays,
  defaultMonth,
  align = "left",
  year,
}) => {
  const [selected, setSelected] = useState(defaultDate);
  const [holidaysDays, setHolidaysDays] = useState([]);
  const [empLeaveDates, setEmpLeaveDates] = useState([]);
  const [currentMonth, setCurrentMonth] = useState(
    defaultMonth || defaultDate || new Date(),
  );
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const empId = useAuth()?.user?.user_id;

  const fetchHolidays = async () => {
    try {
      const res = await api.get(
        `${BASE_URL}/api/holidays/by-location/${year}`,
        {
          params: { state: "All", country: "India" },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );

      const holidayDates = res.data.data.map((holiday) => {
        const [y, m, d] = holiday.holidayDate.split("-").map(Number);
        return new Date(y, (m ?? 1) - 1, d ?? 1);
      });

      setHolidaysDays(holidayDates);
    } catch (err) {
      toast.error("Could not load company holidays");
    }
  };

  const fetchLeaveDates = async (monthDate) => {
    try {
      const month = monthDate.getMonth() + 1;
      const year = monthDate.getFullYear();

      const res = await api.get(
        `${BASE_URL}/api/leave-requests/employee/${empId}/leave-dates`,
        {
          params: {
            year,
            month,
          },
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const leaveDates = res.data.data.map((date) => new Date(date));

      setEmpLeaveDates(leaveDates);
    } catch (err) {
      toast.error("Could not load leave dates");
    }
  };
  const handleSelect = (date) => {
    if (holidaysDays.some((holiday) => isSameDay(date, holiday))) {
      return;
    }

    if (empLeaveDates.some((d) => isSameDay(d, date))) {
      toast.info("You have already applied leave for this day.");
      return;
    }

    setSelected(date);
    if (onChange) onChange(date);
    setOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetchHolidays();
  }, []);

  useEffect(() => {
    setSelected(defaultDate);
  }, [defaultDate]);

  useEffect(() => {
    if (empId) fetchLeaveDates(currentMonth);
  }, [currentMonth, empId]);

  const currentYear = new Date().getFullYear();
  const toYear = currentYear + 3;

  return (
    <div className="flex flex-col space-y-2 w-full" ref={ref}>
      {label && (
        <label className="text-sm font-medium text-gray-700">{label}</label>
      )}

      <div className="relative w-full">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-3 py-2 border rounded-lg shadow-sm bg-white text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <span>
            {selected ? format(selected, "MMM d, yyyy") : "Pick a date"}
          </span>
          <CalendarIcon className="w-5 h-5 text-gray-500" />
        </button>

        {open && (
          <div
            className={`absolute z-20 mt-2 origin-top-left scale-75 ${
              align === "right" ? "right-0" : "left-0"
            }`}
          >
            <div className="bg-white border rounded-lg shadow-lg p-2 w-fit">
              <DayPicker
                className="rdp-compact"
                mode="single"
                selected={selected}
                onSelect={handleSelect}
                defaultMonth={defaultMonth}
                disabled={disabledDays}
                onMonthChange={setCurrentMonth}
                captionLayout="dropdown-buttons"
                toYear={toYear}
                modifiers={{
                  holiday: holidaysDays,
                  leave: empLeaveDates,
                }}
                modifiersStyles={{
                  holiday: holidayStyleRed,
                  leave: {
                    backgroundColor: "#fee2e2",
                    color: "#b91c1c",
                  },
                }}
                modifiersClassNames={{
                  selected: "bg-indigo-600 text-white rounded-md",
                  today: "font-bold text-indigo-600",
                  disabled: "opacity-50 line-through",
                }}
                components={{ DayButton: LeaveDayButton }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DateRangePicker;
