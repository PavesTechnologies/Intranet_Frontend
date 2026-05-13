import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import FilterListbox from "../../components/filter/FilterListbox";
import Button from "../../components/Button/Button";
import { showStatusToast } from "../../components/toastfy/toast";
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  BarChart,
  Bar,
  Cell,
  Legend,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  fetchDashboardSummary,
  fetchDashboardLastMonth,
  fetchDashboardLast3Months,
  fetchDashboardDateRange,
} from "./api";
import TimesheetHeader from "./TimesheetHeader";
import LoadingSpinner from "../../components/LoadingSpinner";

const toLocalISODate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-2xl shadow ${className}`}>{children}</div>
);

const CardContent = ({ children, className = "" }) => (
  <div className={`p-5 ${className}`}>{children}</div>
);

const COLORS = ["#2563eb", "#f97316"];

const DashboardPage = () => {
  const [dashboardSummary, setDashboardSummary] = useState(null);
  const [hoursPerDay, setHoursPerDay] = useState([]);
  const [productivityTrend, setProductivityTrend] = useState([]);
  const [billableData, setBillableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [customStartDate, setCustomStartDate] = useState(null);
  const [customEndDate, setCustomEndDate] = useState(null);
  const monthOptions = [
    { label: "Current Month", value: "Current Month" },
    { label: "Last-Current Month", value: "Last Month" },
    { label: "Last 2-Cur Months", value: "Last 3 Months" },
    { label: "Custom Range", value: "Custom Range" },
  ];
  const [selectedMonth, setSelectedMonth] = useState("current");

  // 🔹 Set current month as default on mount
  useEffect(() => {
    if (monthOptions.length > 0) {
      setSelectedMonth(monthOptions[0].value);
    }
  }, []);

  // 🔹 Fetch data dynamically when month changes
  useEffect(() => {
    if (selectedMonth === "Custom Range") return;

    const fetchData = async () => {
      setLoading(true);
      try {
        let response = null;

        if (selectedMonth === "Current Month") {
          response = await fetchDashboardSummary();
        } else if (selectedMonth === "Last Month") {
          response = await fetchDashboardLastMonth();
        } else if (selectedMonth === "Last 3 Months") {
          response = await fetchDashboardLast3Months();
        }

        if (response) setDashboardSummary(response);
      } catch (error) {
        console.error("Error fetching dashboard summary:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedMonth]);

  const handleApplyCustomRange = async () => {
    if (!customStartDate || !customEndDate) {
      showStatusToast("Please select valid start and end dates", "error");
      return;
    }
    if (customStartDate > customEndDate) {
      showStatusToast("Start date must be before end date", "error");
      return;
    }

    setLoading(true);
    try {
      const start = toLocalISODate(customStartDate);
      const end = toLocalISODate(customEndDate);
      const response = await fetchDashboardDateRange(start, end);
      if (response) setDashboardSummary(response);
    } catch (error) {
      console.error("Error fetching dashboard summary:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🔹 Prepare chart data after summary loads
  useEffect(() => {
    if (!dashboardSummary) return;

    const dayOrder = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];

    const dayAbbr = {
      monday: "Mon",
      tuesday: "Tue",
      wednesday: "Wed",
      thursday: "Thu",
      friday: "Fri",
      saturday: "Sat",
      sunday: "Sun",
    };

    setHoursPerDay(
      dayOrder.map((day) => ({
        day: dayAbbr[day],
        hours: dashboardSummary.weeklySummary?.[day] || 0,
      }))
    );

    setProductivityTrend(
      dayOrder.map((day) => ({
        day: dayAbbr[day],
        Billable:
          dashboardSummary.billablePercentageDetails?.[day]?.billablePercentage || 0,
      }))
    );

    setBillableData([
      {
        name: "Billable Hours",
        value: dashboardSummary.billableActivity?.billableHours || 0,
      },
      {
        name: "Non-Billable Hours",
        value: dashboardSummary.billableActivity?.nonBillableHours || 0,
      },
    ]);
  }, [dashboardSummary]);

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      <TimesheetHeader />

      {/* 🔹 Dropdown for Month Selection */}
      <div className="flex justify-end items-center gap-3 mr-6">
        {selectedMonth === "Custom Range" && (
          <>
            <DatePicker
              selected={customStartDate}
              onChange={(d) => setCustomStartDate(d)}
              dateFormat="yyyy-MM-dd"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-36"
              maxDate={customEndDate || new Date()}
              placeholderText="Start date"
            />
            <DatePicker
              selected={customEndDate}
              onChange={(d) => setCustomEndDate(d)}
              dateFormat="yyyy-MM-dd"
              className="border border-gray-300 rounded px-2 py-1 text-sm w-36"
              minDate={customStartDate}
              maxDate={new Date()}
              placeholderText="End date"
            />
            <Button
              variant="primary"
              size="small"
              onClick={handleApplyCustomRange}
              disabled={!customStartDate || !customEndDate || loading}
              loading={loading}
            >
              Apply
            </Button>
          </>
        )}
        <label className="text-sm font-medium text-gray-700">
          Select Range:
        </label>
        <div className="w-48">
          <FilterListbox
            options={monthOptions.map((month) => ({ value: month.value, label: month.label }))}
            value={selectedMonth}
            onChange={setSelectedMonth}
          />
        </div>
      </div>

      {/* 🔹 Dashboard Body */}
      {loading ? (
        <LoadingSpinner text={`${selectedMonth} Dashboard...`} />
      ) : (
        <div className="px-6 pb-2 bg-gray-50 font-sans text-base">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-2">
            <Card>
              <CardContent className="flex flex-col items-center ">
                <div className="text-md text-center font-semibold mb-2">
                  Total Hours Logged
                </div>
                <div className="text-3xl font-black text-blue-700">
                  {dashboardSummary?.totalHours || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center ">
                <div className="text-md text-center font-semibold mb-2">
                  Billable Hours
                </div>
                <div className="text-3xl font-black text-green-600">
                  {dashboardSummary?.billableActivity?.billablePercentage || 0}%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center ">
                <div className="text-md text-center font-semibold mb-2">
                  Unsubmitted Weeks
                </div>
                <div className="text-3xl font-black text-emerald-700">
                  {dashboardSummary?.weeklyTimesheetReview?.notSubmittedWeeks ||
                    0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col items-center ">
                <div className="text-md text-center font-semibold mb-2">
                  Pending Weeks
                </div>
                <div className="text-3xl font-black text-orange-500">
                  {dashboardSummary?.weeklyTimesheetReview?.submittedWeeks || 0}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="flex flex-col text-center items-center ">
                <div className="text-md font-semibold mb-2">
                  Average Hours per Day
                </div>
                <div className="text-3xl font-black text-indigo-600">
                  {dashboardSummary?.averageHoursPerDay || "00:00"}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-2">
            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-3">Hours per Day</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={hoursPerDay}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                    <XAxis
                      dataKey="day"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip formatter={(v) => [`${v} hrs`, "Hours"]} />
                    <Bar
                      dataKey="hours"
                      fill="#6366f1"
                      barSize={28}
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-3">
                  DayWise Billable Percentage
                </h3>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={productivityTrend}>
                    <XAxis
                      dataKey="day"
                      axisLine={false}
                      tickLine={false}
                      interval={0}
                      padding={{ left: 12, right: 12 }}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis hide />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="Billable"
                      stroke="#16a34a"
                      strokeWidth={3}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <h3 className="text-lg font-semibold mb-3">
                  Billable vs Non-Billable Hours
                </h3>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={billableData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      label
                    >
                      {billableData.map((entry, idx) => (
                        <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconType="circle" />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
