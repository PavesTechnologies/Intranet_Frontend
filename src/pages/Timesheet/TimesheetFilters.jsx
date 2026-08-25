import React from "react";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FilterListbox from "../../components/filter/FilterListbox";

const TimesheetFilters = ({
  searchText,
  setSearchText,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  filterStatus,
  setFilterStatus,
}) => {
  const today = new Date();
  const currentMonthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1,
  );
  const currentMonthEnd = new Date(
    today.getFullYear(),
    today.getMonth() + 1,
    0,
  );

  const isCurrentMonthDate = (date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth();

  const handleDateChange = (update) => {
    const [start, end] = update;
    setFilterStartDate(start ? start.toLocaleDateString("en-CA") : "");
    setFilterEndDate(end ? end.toLocaleDateString("en-CA") : "");
  };

  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        background: "#fff",
        borderRadius: 8,
        padding: "16px 20px",
        boxShadow: "0 1px 6px #e4e7ee",
        marginTop: 28,
        marginBottom: 22,
      }}
    >
      <input
        type="text"
        placeholder="Search..."
        value={searchText}
        onChange={(e) => setSearchText(e.target.value)}
        style={{
          flex: 1,
          border: "1px solid #d0d6de",
          borderRadius: 4,
          padding: "8px 14px",
          fontSize: 15,
          background: "#f9fafb",
        }}
      />
      {/* <input
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
        style={{
          border: "1px solid #d0d6de",
          borderRadius: 4,
          padding: "8px 10px",
          fontSize: 15,
          background: "#f9fafb",
        }}
      /> */}

      {/* <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="date"
          value={filterStartDate}
          onChange={(e) => setFilterStartDate(e.target.value)}
          style={{
            border: "1px solid #d0d6de",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 15,
            background: "#f9fafb",
          }}
        />
        <span style={{ fontSize: 14, color: "#555" }}>to</span>
        <input
          type="date"
          value={filterEndDate}
          onChange={(e) => setFilterEndDate(e.target.value)}
          style={{
            border: "1px solid #d0d6de",
            borderRadius: 4,
            padding: "8px 10px",
            fontSize: 15,
            background: "#f9fafb",
          }}
        />
      </div> */}

      {/* 📅 Date Range Picker */}
      <div
        style={{
          border: "1px solid #d0d6de",
          borderRadius: 4,
          background: "#f9fafb",
          padding: "2px 6px",
        }}
      >
        <DatePicker
          selectsRange
          startDate={filterStartDate ? new Date(filterStartDate) : null}
          endDate={filterEndDate ? new Date(filterEndDate) : null}
          onChange={handleDateChange}
          minDate={currentMonthStart}
          maxDate={currentMonthEnd}
          filterDate={isCurrentMonthDate}
          openToDate={today}
          isClearable
          placeholderText="Select date range"
          dateFormat="yyyy-MM-dd"
          className="date-range-input"
          wrapperClassName="date-range-wrapper"
          calendarClassName="timesheet-range-datepicker"
          style={{
            border: "none",
            fontSize: 15,
            background: "transparent",
            outline: "none",
          }}
        />
      </div>

      <div className="w-44">
        <FilterListbox
          options={[
            { value: "All Status", label: "All Status" },
            { value: "Draft", label: "Draft" },
            { value: "Submitted", label: "Submitted" },
            { value: "Approved", label: "Approved" },
            { value: "Rejected", label: "Rejected" },
          ]}
          value={filterStatus}
          onChange={setFilterStatus}
        />
      </div>
    </div>
  );
};

export { TimesheetFilters };
