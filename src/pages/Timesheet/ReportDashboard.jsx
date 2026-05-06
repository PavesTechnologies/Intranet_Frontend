import React, { useEffect, useState, useRef } from "react";
import "./ReportDashboard.css";
import {
  FileDown,
  Calendar,
  Clock,
  TrendingUp,
  Users,
  BarChart2,
  Briefcase,
  Coffee,
  Filter,
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import Pagination from "../../components/Pagination/pagination";
import LoadingSpinner from "../../components/LoadingSpinner";
import Button from "../../components/Button/Button.jsx";
import { toast } from "react-toastify";

const monthOptions = [
  { name: "January", value: 1 },
  { name: "February", value: 2 },
  { name: "March", value: 3 },
  { name: "April", value: 4 },
  { name: "May", value: 5 },
  { name: "June", value: 6 },
  { name: "July", value: 7 },
  { name: "August", value: 8 },
  { name: "September", value: 9 },
  { name: "October", value: 10 },
  { name: "November", value: 11 },
  { name: "December", value: 12 },
];

const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1; // 1-indexed (Jan=1, May=5)
const defaultMonth = currentMonth > 1 ? currentMonth - 1 : 12;
const defaultYear = currentMonth > 1 ? currentYear : currentYear - 1;
const yearOptions = [currentYear, currentYear - 1];

export default function ReportDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef();
  // const [currentPage, setCurrentPage] = useState(1);
  const [employeeBreakdownPage, setEmployeeBreakdownPage] = useState(1);
  const [productivityPage, setProductivityPage] = useState(1);
  const [projectBreakdownPage, setProjectBreakdownPage] = useState(1);
  const [leavePage, setLeavePage] = useState(1);
  const [employeeBreakdownPerPage, setEmployeeBreakdownPerPage] = useState(8);
  const [productivityPerPage, setProductivityBreakdownPerPage] = useState(8);
  const [projectBreakdownPerPage, setProjectBreakdownPerPage] = useState(8);
  const [leaveHoursPerPage, setLeaveHoursPerPage] = useState(8);
  const TS_BASE_URL = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [appliedMonth, setAppliedMonth] = useState(defaultMonth);
  const [appliedYear, setAppliedYear] = useState(defaultYear);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [projectPages, setProjectPages] = useState({});
  const [mailLoading, setMailLoading] = useState(false);
  const membersPerPage = 8;
  const [leaveError, setLeaveError] = useState(false);

  const handleProjectPageChange = (projectId, newPage) => {
    setProjectPages((prev) => ({
      ...prev,
      [projectId]: newPage,
    }));
  };

  const filteredMonths =
    selectedYear === currentYear
      ? monthOptions.filter((m) => m.value < currentMonth)
      : monthOptions;

  const itemsPerPageChangeEmployeeBreakdown = (event) => {
    const newItemsPerPage = parseInt(event.target.value, 10);
    setEmployeeBreakdownPerPage(newItemsPerPage);
    setEmployeeBreakdownPage(1);
  };
  const itemsPerPageChangeProductivity = (event) => {
    const newItemsPerPage = parseInt(event.target.value, 10);
    setProductivityBreakdownPerPage(newItemsPerPage);
    setProductivityPage(1);
  };
  const itemsPerPageChangeProjectBreakdown = (event) => {
    const newItemsPerPage = parseInt(event.target.value, 10);
    setProjectBreakdownPerPage(newItemsPerPage);
    setProjectBreakdownPage(1);
  };
  const itemsPerPageChangeLeaveHours = (event) => {
    const newItemsPerPage = parseInt(event.target.value, 10);
    setLeaveHoursPerPage(newItemsPerPage);
    setLeavePage(1);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setEmployeeBreakdownPage(1);
      setProductivityPage(1);
      setLeavePage(1);
      setProjectBreakdownPage(1);
      try {
        const res = await axios.get(
          `${TS_BASE_URL}/api/report/monthly_finance`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            params: {
              month: appliedMonth,
              year: appliedYear,
            },
          },
        );
        const json = res.data;
        setData(json);
        setSelectedMonth(json.month);
        setSelectedYear(json.year);
        setLeaveError(false);
      } catch (err) {
        console.error("Error fetching data:", err);
        toast.error(err.response?.data || "Failed to fetch data");
        if (err.response?.status === 400) {
          setLeaveError(true);
          setData(null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [TS_BASE_URL, appliedMonth, appliedYear]);

  const sendMailPDF = async () => {
    setMailLoading(true);
    try {
      const res = await axios.get(
        `${TS_BASE_URL}/api/finance/report/monthly_pdf`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          params: {
            month: appliedMonth,
            year: appliedYear,
          },
        },
      );
      toast.success(res?.data || "Mail sent successfully");
    } catch (err) {
      toast.error(err.response?.data || "Failed to send mail");
    } finally {
      setMailLoading(false);
    }
  };

  const handleFilterApply = () => {
    setAppliedYear(selectedYear);
    setAppliedMonth(selectedMonth);
    setIsFilterOpen(false);
  };

  const handleExportPDF = () => {
    if (!data) return;

    const pdf = new jsPDF("p", "mm", "a4");
    let y = 15; // manual cursor

    const monthName = monthOptions.find((m) => m.value === data.month)?.name;

    // =======================
    // TITLE
    // =======================
    pdf.setFontSize(18);
    pdf.setFont("helvetica", "bold");
    pdf.text(`Financial Report — ${monthName} ${data.year}`, 14, y);
    y += 12;

    // =======================
    // SUMMARY
    // =======================
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60); // Light black / charcoal
    pdf.setFontSize(13);
    pdf.text("Summary", 14, y);
    y += 6;

    autoTable(pdf, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Field", "Value"]],
      body: [
        ["Total Employees", data.totalEmployees],
        ["Total Working Days", data.totalWorkingDays],
        ["Total Holiday Dates", data.totalHolidayDates],
        ["Total Hours Worked", data.totalHoursWorked],
        ["Total Billable Hours", data.totalBillableHours],
        ["Total Non-billable Hours", data.totalNonBillableHours],
        ["Auto-generated Hours", data.autoGeneratedHours],
        ["Utilization Rate", `${data.utilizationRate}`],
      ],
      theme: "grid",
      styles: { fontSize: 10 },
      didDrawPage: (d) => (y = d.cursor.y + 12),
    });

    // =======================
    // HOURS BREAKDOWN
    // =======================
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60); // Light black / charcoal
    pdf.setFontSize(13);
    pdf.text("Total Hours Breakdown", 14, y);
    y += 6;

    autoTable(pdf, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Type", "Hours"]],
      body: [
        ["Billable Hours", data.hoursBreakdown.billableHours],
        ["Non-billable Hours", data.hoursBreakdown.nonBillableHours],
        ["Leave Hours", data.hoursBreakdown.leaveHours],
        ["Total Hours", data.hoursBreakdown.totalHours],
      ],
      theme: "grid",
      styles: { fontSize: 10 },
      didDrawPage: (d) => (y = d.cursor.y + 12),
    });

    // =======================
    // EMPLOYEE BREAKDOWN
    // =======================
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60); // Light black / charcoal
    pdf.setFontSize(13);
    pdf.text("Employee Breakdown", 14, y);
    y += 6;

    autoTable(pdf, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [
        [
          "Name",
          "Working Days",
          "Billable",
          "Non-Billable",
          "Auto",
          "Total",
          "Productivity",
        ],
      ],
      body: data.employeeBreakdown.map((e) => [
        e.name,
        e.workingDays,
        e.billableHours,
        e.nonBillableHours,
        e.autoGeneratedHours ?? 0,
        e.totalHours,
        `${e.productivity}`,
      ]),
      theme: "grid",
      styles: { fontSize: 9 },
      didDrawPage: (d) => (y = d.cursor.y + 12),
    });

    // =======================
    // PROJECT BREAKDOWN
    // =======================
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60); // Light black / charcoal
    pdf.setFontSize(13);
    pdf.text("Project Breakdown", 14, y);
    y += 6;

    autoTable(pdf, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [
        ["Project", "Total Hrs", "Billable", "Non-Billable", "Team Members"],
      ],
      body: data.projectBreakdown.map((p) => [
        p.projectName,
        p.totalHours,
        p.billableHours,
        p.nonBillableHours,
        p.teamMembers,
      ]),
      theme: "grid",
      styles: { fontSize: 9 },
      didDrawPage: (d) => (y = d.cursor.y + 12),
    });

    // =======================
    // PROJECT USER BREAKDOWN
    // =======================
    // =======================
    // PROJECT MEMBERS BREAKDOWN (Correct Order)
    // =======================

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60); // light black heading
    pdf.setFontSize(13);
    pdf.text("Project Members Breakdown", 14, y);
    y += 8;

    data.projectUserHoursBreakdown.forEach((proj, index) => {
      // Page break safety
      if (y > 250) {
        pdf.addPage();
        y = 15;
      }

      // ----- Project title -----
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.setTextColor(60, 60, 60); // light black
      pdf.text(`Project: ${proj.projectName}`, 14, y);
      y += 6;

      // ----- Table -----
      autoTable(pdf, {
        startY: y,
        margin: { left: 14, right: 14 },
        theme: "grid",
        styles: { fontSize: 9 },
        head: [["Member", "Billable", "Non-Billable", "Total", "Contribution"]],
        body: proj.members.map((m) => [
          m.memberName,
          m.billableHours,
          m.nonBillableHours,
          m.totalHours,
          m.contribution,
        ]),
        didDrawPage: (d) => (y = d.cursor.y + 12),
      });

      // Extra spacing between project tables
      y += 1.75;
    });

    // =======================
    // LEAVE HOURS BREAKDOWN
    // =======================
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60); // Light black / charcoal
    pdf.setFontSize(13);
    pdf.text("Leave Hours Breakdown", 14, y);
    y += 6;

    autoTable(pdf, {
      startY: y,
      margin: { left: 14, right: 14 },
      head: [["Employee", "Days", "Hours", "Contribution"]],
      body: data.leaveHoursBreakdown.map((l) => [
        l.userName,
        l.noOfDays,
        l.leaveHours,
        l.contribution,
      ]),
      theme: "grid",
      styles: { fontSize: 9 },
      didDrawPage: (d) => (y = d.cursor.y + 12),
    });

    // =======================
    // NOTES
    // =======================
    if (y > 250) {
      pdf.addPage();
      y = 15;
    }

    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(60, 60, 60); // Light black
    pdf.setFontSize(13);
    pdf.text("Report Notes", 14, y);
    y += 6;

    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(80, 80, 80); // lighter charcoal
    pdf.setFontSize(10);

    const notes = [
      "- Billable Hours = Total hours spent on tasks classified as billable across all projects.",
      "- Standard holiday hours = (Mon-Fri calculated 8 hrs/holiday).",
      "- Non-Billable Hours = Sum of all task hours marked as non-billable across all projects + Standard holiday hours.",
      "- Total Hours = Billable Hours + Non-Billable Hours.",
      "- Billable Utilization% = Billable Hours ÷ Total Hours × 100.",
      "- Minimum Monthly Hours = 176 hours.",
      "- Productivity % = (Total Hours - Holiday Hours) / Minimum Monthly Hours * 100.",
      "- Employee Leave Hours Contribution = (leaveHours / totalLeaveHours) * 100.",
      "- Employee Project Hours Contribution = (totalHours / totalProjectHours) * 100.",
    ];

    notes.forEach((line) => {
      pdf.text(line, 14, y);
      y += 6;
    });
    pdf.save(`Finance_Report_${monthName}_${data.year}.pdf`);
  };

  if (loading)
    return (
      <div className="loading-screen">
        <LoadingSpinner text="Loading Reports..." />
      </div>
    );

  if (leaveError && !data)
    return (
      <div className="report-container">
        <div className="report-header">
          <div>
            <h1>Monthly Finance Timesheet Report</h1>
            <p className="subtitle pt-1">
              Team Productivity & Utilization Metrics
            </p>
            <p className="month pt-1">
              Report Month:
              <button
                className="filter-toggle-btn"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
              >
                <span>
                  {monthOptions.find((m) => m.value === selectedMonth)?.name}
                  ,{selectedYear}
                </span>
              </button>
            </p>
            {isFilterOpen && (
              <div className="report-filters">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                >
                  {filteredMonths.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                >
                  {yearOptions.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
                <button className="apply-btn" onClick={handleFilterApply}>
                  Apply
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="text-center font-semibold" style={{ marginTop: "2rem" }}>
          Pending Leaves for {monthOptions.find((m) => m.value === appliedMonth)?.name} {appliedYear} needs to be reviewed.
        </div>
      </div>
    );

  if (!data)
    return (
      <div className="report-container text-center font-semibold">
        No data found.
      </div>
    );

  const employeeBreakdown = data.employeeBreakdown || [];
  const employeeProductivity = data.employeeProductivity || [];
  const projectBreakdown = data.projectBreakdown || [];
  const leaveHoursBreakdown = data.leaveHoursBreakdown || [];

  // Base pagination on the main list, e.g., employeeBreakdown
  const totalEmployeePages = Math.ceil(
    employeeBreakdown.length / employeeBreakdownPerPage,
  );
  const totalEmployeeProductivityPages = Math.ceil(
    employeeProductivity.length / productivityPerPage,
  );
  const totalProjectPages = Math.ceil(
    projectBreakdown.length / projectBreakdownPerPage,
  );
  const totalLeaveHoursPages = Math.ceil(
    leaveHoursBreakdown.length / leaveHoursPerPage,
  );

  // Create paginated slices for EACH list you want to paginate
  const paginatedEmployeeBreakdown = employeeBreakdown.slice(
    (employeeBreakdownPage - 1) * employeeBreakdownPerPage,
    employeeBreakdownPage * employeeBreakdownPerPage,
  );

  const paginatedEmployeeProductivity = employeeProductivity.slice(
    (productivityPage - 1) * productivityPerPage,
    productivityPage * productivityPerPage,
  );

  const paginatedProjectBreakdown = projectBreakdown.slice(
    (projectBreakdownPage - 1) * projectBreakdownPerPage,
    projectBreakdownPage * projectBreakdownPerPage,
  );

  const paginatedleaveHoursBreakdown = leaveHoursBreakdown.slice(
    (leavePage - 1) * leaveHoursPerPage,
    leavePage * leaveHoursPerPage,
  );

  return (
    <div className="report-container" ref={reportRef}>
      {/* Header */}
      <div className="report-header">
        <div>
          <h1>Monthly Finance Timesheet Report</h1>
          <p className="subtitle pt-1">
            Team Productivity & Utilization Metrics
          </p>
          <p className="month pt-1">
            Report Month:
            <button
              className="filter-toggle-btn"
              onClick={() => setIsFilterOpen(!isFilterOpen)}
            >
              <span>
                {data.month &&
                  monthOptions.find((m) => m.value === data.month)?.name}
                ,{data.year}
              </span>
            </button>
          </p>
          {isFilterOpen && (
            <div className="report-filters">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
              >
                {filteredMonths.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button className="apply-btn" onClick={handleFilterApply}>
                Apply
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-4">
          <button className="export-btn" onClick={handleExportPDF}>
            <FileDown size={16} /> Export PDF
          </button>
          <Button
            variant="secondary"
            size="medium"
            className={`${mailLoading ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={sendMailPDF}
            disabled={mailLoading}
          >
            {mailLoading ? "Sending..." : "Send PDF via Email"}
          </Button>
        </div>
      </div>

      {/* Top Stats */}
      <div className="stats-grid compact">
        <div className="stat-card white-card hover-lift">
          <Calendar size={22} className="icon text-blue" />
          <p>Total Working Days</p>
          <h2>{data.totalWorkingDays}</h2>
        </div>
        <div className="stat-card white-card hover-lift">
          <Clock size={22} className="icon text-green" />
          <p>Total Billable Hours</p>
          <h2>{data.totalBillableHours}</h2>
        </div>
        <div className="stat-card white-card hover-lift">
          <TrendingUp size={22} className="icon text-amber" />
          <p>Utilization Rate</p>
          <h2>{data.utilizationRate}</h2>
        </div>
        <div className="stat-card white-card hover-lift">
          <Users size={22} className="icon text-indigo" />
          <p>Total Employees</p>
          <h2>{data.totalEmployees || 0}</h2>
        </div>
      </div>

      {/* Hours Breakdown */}
      <div className="section-card">
        <h3>
          <BarChart2 size={18} /> Hours Breakdown Summary
        </h3>
        <div className="hours-grid">
          {[
            {
              icon: <Briefcase size={18} />,
              label: "Billable Hours",
              value: data.hoursBreakdown?.billableHours,
              color: "green",
            },
            {
              icon: <Coffee size={18} />,
              label: "Non-Billable Hours",
              value: data.hoursBreakdown?.nonBillableHours,
              color: "orange",
            },
            {
              icon: <Clock size={18} />,
              label: "Total Hours",
              value: data.hoursBreakdown?.totalHours,
              color: "blue",
            },
            {
              icon: <Calendar size={18} />,
              label: "Leave Hours",
              value: data.hoursBreakdown?.leaveHours,
              color: "red",
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className={`hours-card hover-lift border-${item.color}`}
            >
              <div className="card-top">
                {item.icon}
                <h4>{item.label}</h4>
              </div>
              <span className={`${item.color}-text`}>{item.value || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Employee Breakdown */}
      <div className="section-card">
        <div className="flex justify-between">
          <h3>
            <Users size={18} /> Employee Logged HoursBreakdown
          </h3>
          <p className="month pt-1 flex justify-end">
            Records Per Page:
            <select
              name="userRange"
              id="userRangeDropdown"
              value={employeeBreakdownPerPage}
              className="pr-6 py-0 border-none ml-2 mb-2 text-sm"
              onChange={itemsPerPageChangeEmployeeBreakdown}
            >
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
            </select>
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Employee</th>
              <th>Working Days</th>
              <th>Billable</th>
              <th>Non-Billable</th>
              <th>AutoGenLoggedHrs</th>
              <th>Total</th>
              <th>Billable Utilization</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployeeBreakdown.map((e, i) => (
              <tr key={i}>
                <td>{e.name}</td>
                <td>{e.workingDays}</td>
                <td>{e.billableHours}</td>
                <td>{e.nonBillableHours}</td>
                <td>{e.autoGeneratedHours ?? "-"}</td>
                <td>{e.totalHours}</td>
                <td>
                  <span className="badge-green">{e.productivity ?? "-"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalEmployeePages > 1 && (
          <div className="mb-4">
            <Pagination
              currentPage={employeeBreakdownPage}
              totalPages={totalEmployeePages}
              onPrevious={() =>
                setEmployeeBreakdownPage((page) => Math.max(page - 1, 1))
              }
              onNext={() =>
                setEmployeeBreakdownPage((page) =>
                  Math.min(page + 1, totalEmployeePages),
                )
              }
            />
          </div>
        )}
      </div>

      {/* Employee Productivity */}
      <div className="section-card">
        <div className="flex justify-between">
          <h3>
            <TrendingUp size={18} /> Employee Productivity
          </h3>
          <p className="month pt-1 flex justify-end">
            Records Per Page:
            <select
              name="userRange"
              id="userRangeDropdown"
              value={productivityPerPage}
              className="pr-6 py-0 border-none ml-2 mb-2 text-sm"
              onChange={itemsPerPageChangeProductivity}
            >
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
            </select>
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Working Days</th>
              <th>Total Hours</th>
              <th>Productivity</th>
            </tr>
          </thead>
          <tbody>
            {paginatedEmployeeProductivity.map((p, i) => (
              <tr key={i}>
                <td>{p.employeeId ?? "-"}</td>
                <td>{p.employeeName ?? "-"}</td>
                <td>{p.workingDays ?? "-"}</td>
                <td>{p.totalHours ?? "-"}</td>
                <td>
                  <span className="badge-blue">{p.productivity ?? "-"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalEmployeeProductivityPages > 1 && (
          <div className="mb-4">
            <Pagination
              currentPage={productivityPage}
              totalPages={totalEmployeeProductivityPages}
              onPrevious={() =>
                setProductivityPage((page) => Math.max(page - 1, 1))
              }
              onNext={() =>
                setProductivityPage((page) =>
                  Math.min(page + 1, totalEmployeeProductivityPages),
                )
              }
            />
          </div>
        )}
      </div>

      {/* Employee leaveHoursBreakdown */}
      <div className="section-card">
        <div className="flex justify-between">
          <h3>
            <Calendar size={18} /> Employee leaveHoursBreakdown
          </h3>
          <p className="month pt-1 flex justify-end">
            Records Per Page:
            <select
              name="userRange"
              id="userRangeDropdown"
              value={leaveHoursPerPage}
              className="pr-6 py-0 border-none ml-2 mb-2 text-sm"
              onChange={itemsPerPageChangeLeaveHours}
            >
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
            </select>
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Employee Name</th>
              <th>Leave Days</th>
              <th>Leave Hours</th>
              <th>Contribution</th>
            </tr>
          </thead>
          <tbody>
            {paginatedleaveHoursBreakdown.map((p, i) => (
              <tr key={i}>
                <td>{p.userId ?? "-"}</td>
                <td>{p.userName ?? "-"}</td>
                <td>{p.noOfDays ?? "-"}</td>
                <td>{p.leaveHours ?? "-"}</td>
                <td>
                  <span className="badge-yellow">{p.contribution ?? "-"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {totalLeaveHoursPages > 1 && (
          <div className="mb-4">
            <Pagination
              currentPage={leavePage}
              totalPages={totalLeaveHoursPages}
              onPrevious={() => setLeavePage((page) => Math.max(page - 1, 1))}
              onNext={() =>
                setLeavePage((page) => Math.min(page + 1, totalLeaveHoursPages))
              }
            />
          </div>
        )}
      </div>

      {/* Project Breakdown */}
      <div className="section-card">
        <div className="flex justify-between">
          <h3>
            <Briefcase size={18} /> Project-wise Breakdown
          </h3>
          <p className="month pt-1 flex justify-end">
            Records Per Page:
            <select
              name="userRange"
              id="userRangeDropdown"
              value={projectBreakdownPerPage}
              className="pr-6 py-0 border-none ml-2 mb-2 text-sm"
              onChange={itemsPerPageChangeProjectBreakdown}
            >
              <option value="5">5</option>
              <option value="6">6</option>
              <option value="7">7</option>
              <option value="8">8</option>
              <option value="9">9</option>
              <option value="10">10</option>
            </select>
          </p>
        </div>
        <div className="projects-grid">
          {paginatedProjectBreakdown.map((p, i) => (
            <div
              key={i}
              /* MODIFIED: Add onClick handler */
              onClick={() =>
                setSelectedProjectId((prevId) =>
                  prevId === p.projectId ? null : p.projectId,
                )
              }
              /* MODIFIED: Add a dynamic class for styling the selected card */
              className={`project-card hover-lift ${
                selectedProjectId === p.projectId ? "is-selected" : ""
              }`}
            >
              <div className="card-top">
                <Users size={18} className="text-blue" />
                <h4>{p.projectName ?? p.name}</h4>
              </div>
              <div className="grid grid-cols-2">
                <p>{p.teamMembers ?? "-"} team members</p>
                <span className="text-right">
                  {p.totalHours ?? p.hours} hrs
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Project User Hours Breakdown */}
      <div className="section-card">
        <h3>
          <TrendingUp size={18} /> Project User Hours Breakdown
        </h3>

        {data.projectUserHoursBreakdown?.length > 0 ? (
          <>
            {(() => {
              {
                /* MODIFIED: Find the *one* selected project */
              }
              const project = data.projectUserHoursBreakdown.find(
                (p) => p.projectId === selectedProjectId,
              );

              {
                /* MODIFIED: If no project is selected, show a prompt */
              }
              if (!project) {
                return (
                  <p>
                    Select a project from the breakdown above to see details.
                  </p>
                );
              }
              const currentPage = projectPages[project.projectId] || 1;
              const totalPages = Math.ceil(
                project.members.length / membersPerPage,
              );
              const paginatedMembers = project.members.slice(
                (currentPage - 1) * membersPerPage,
                currentPage * membersPerPage,
              );

              return (
                <div key={project.projectId} className="project-user-breakdown">
                  {/* Header */}
                  {(() => {
                    const members = project.members || [];
                    const parsedMembers = members.map((m) => ({
                      ...m,
                      contributionValue: parseFloat(
                        m.contribution?.replace("%", "") || 0,
                      ),
                    }));
                    const maxContribution = Math.max(
                      ...parsedMembers.map((m) => m.contributionValue),
                    );
                    const topPerformers =
                      maxContribution > 0
                        ? parsedMembers
                            .filter(
                              (m) => m.contributionValue === maxContribution,
                            )
                            .map((m) => `${m.memberName} (${m.contribution})`)
                        : [];

                    return (
                      <div className="project-header-3col">
                        <h4 className="project-title">{project.projectName}</h4>
                        <div className="project-owner mr-3">
                          <strong>Owner:</strong>{" "}
                          <span className="top-performer-highlight">
                            {project.ownerName ?? "-"}
                          </span>
                        </div>
                        <div
                          className="project-top-performers"
                          dangerouslySetInnerHTML={{
                            __html:
                              topPerformers.length > 0
                                ? `<strong>Top Performers:</strong> ` +
                                  topPerformers
                                    .map(
                                      (p) =>
                                        `<span class='top-performer-highlight'>${p}</span>`,
                                    )
                                    .join(" ")
                                : "<strong>Top Performers:</strong> No significant contributions",
                          }}
                        />
                      </div>
                    );
                  })()}

                  {/* Members Table */}
                  <table className="mt-2">
                    {/* ... thead ... */}
                    <thead>
                      <tr>
                        <th>Member ID</th>
                        <th>Member Name</th>
                        <th>Billable Hours</th>
                        <th>Non-Billable Hours</th>
                        <th>Total Hours</th>
                        <th>Contribution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedMembers.map((m) => (
                        <tr key={m.memberId}>
                          <td>{m.memberId}</td>
                          <td>{m.memberName}</td>
                          <td>{m.billableHours}</td>
                          <td>{m.nonBillableHours}</td>
                          <td>{m.totalHours}</td>
                          <td>
                            <span className="badge-yellow">
                              {m.contribution}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Pagination for THIS project only */}
                  {totalProjectPages > 1 && (
                    <div className="mb-4 mt-2">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalProjectPages}
                        onPrevious={() =>
                          handleProjectPageChange(
                            project.projectId,
                            Math.max(currentPage - 1, 1),
                          )
                        }
                        onNext={() =>
                          handleProjectPageChange(
                            project.projectId,
                            Math.min(currentPage + 1, totalProjectPages),
                          )
                        }
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </>
        ) : (
          <p>No project user hour data available.</p>
        )}
      </div>

      {/* Report Notes */}
      <div className="notes-card">
        <h4>Report Notes</h4>
        <ul>
          <li>
            Billable Hours = Total hours spent on tasks classified as billable
            across all projects.
          </li>
          <li>Standard holiday hours = (Mon-Fri calculated 8 hrs/holiday).</li>
          <li>
            Non-Billable Hours = Sum of all task hours marked as non-billable
            across all projects + Standard holiday hours.
          </li>
          <li>Total Hours = Billable Hours + Non-Billable Hours</li>
          <li>Billable Utilization% = Billable Hours ÷ Total Hours × 100</li>
          <li>Minimum Monthly hours = 176</li>
          <li>
            Productivity% = (Total Hours − Holiday Hours) ÷ Minimum Monthly
            hours × 100
          </li>
          <li>
            Employee leaveHoursBreakdown Contribution =
            (leaveHours/totalLeaveHours) × 100
          </li>
          <li>
            Employee projectUserHoursBreakdown Contribution =
            (totalHours/totalProjectHours) × 100
          </li>
          {/* <li>Billable Rate = (Billable Hours / Total Available Hours) × 100</li>
          <li>Total Available Hours = Working Days × 8 hours - Leave Hours</li>
          <li>Target utilization rate: 75% for sustainable productivity</li>
          <li>Productivity = (Total Hours / 160) × 100</li> */}
        </ul>
      </div>
    </div>
  );
}
