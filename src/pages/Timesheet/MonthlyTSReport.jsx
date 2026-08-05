import React, { useState, useEffect, useMemo } from "react";
import FilterListbox from "../../components/filter/FilterListbox";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { XCircle, ArrowLeft } from "lucide-react";
import KPICards from "./KPICards";
import ProjectDonutChart from "./ProjectDonutChart";
import DayOfWeekBarChart from "./DayOfWeekBarChart";
import WeeklySummaryCard from "./WeeklySummaryCard";
import "./MonthlyTSReport.css";
import LoadingSpinner from "../../components/LoadingSpinner.jsx";
import api from "../../api/axiosInstance";
import { toast } from "react-toastify";
import Button from "../../components/Button/Button.jsx";
import { useNavigate } from "react-router-dom";

const TS_BASE_URL = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;

const MonthlyTSReport = () => {
  const [apiData, setApiData] = useState(null);
  const [kpis, setKpis] = useState({
    monthlyTotalAdjusted: 0,
    monthlyBillableHours: 0,
    billableRatio: 0,
    nonBillableRatio: 0,
    activeProjectsCount: 0,
    leaves: { days: 0, hours: 0 },
    holidays: { days: 0 },
  });
  const [loading, setLoading] = useState(false);
  const [mailLoading, setMailLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projectInfo, setProjectInfo] = useState([]);
  const navigate = useNavigate();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [year, setYear] = useState(new Date().getFullYear());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
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
  // Cap the month list at the real current month (1-indexed) taken from today's date,
  // NOT from the applied `month` selection — otherwise picking an earlier month would
  // shrink the list the next time the filter is opened.
  const currentMonth = new Date().getMonth() + 1;
  const yearOptions = [currentYear, currentYear - 1];

  const filteredMonths =
    selectedYear === currentYear
      ? monthOptions.filter((m) => m.value < currentMonth)
      : monthOptions;

  useEffect(() => {
    const loadProjectInfo = async () => {
      try {
        const res = await api.get(`${TS_BASE_URL}/api/project-info`);
        setProjectInfo(res.data);
      } catch (err) {
        console.error("Failed to load project info", err);
      }
    };

    loadProjectInfo();
  }, []);

  const getProjectName = (id) => {
    const p = projectInfo.find((x) => x.projectId === id);
    return p ? p.project : `Project ${id}`;
  };

  const getTaskName = (projectId, taskId) => {
    const p = projectInfo.find((x) => x.projectId === projectId);
    if (!p) return taskId ? `Task ${taskId}` : "-";
    const t = p.tasks?.find((x) => x.taskId === taskId);
    return t ? t.task : taskId ? `Task ${taskId}` : "-";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(
        `${TS_BASE_URL}/api/report/user_monthly?month=${month}&year=${year}`,
      );
      const data = await res.data;
      setApiData(data);
    } catch (e) {
      // console.log("Error msg :", e?.response?.data);
      setError(e?.response?.data || "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [month, year]);
  const handleFilterApply = () => {
    setMonth(selectedMonth);
    setYear(selectedYear);
    setIsFilterOpen(false);
    // fetchData();
  };

  useEffect(() => {
    if (!apiData) return;

    const total = apiData.totalHoursWorked; // use as-is
    const billable = apiData.billableHours; // use as-is
    const nonBillable = apiData.nonBillableHours; // use as-is

    const billPct = total > 0 ? ((billable / total) * 100).toFixed(1) : "0";
    const nonPct = total > 0 ? ((nonBillable / total) * 100).toFixed(1) : "0";

    setKpis({
      monthlyTotalAdjusted: total,
      monthlyBillableHours: billable,
      monthlyNonBillableHours: nonBillable,
      billableRatio: billPct,
      nonBillableRatio: nonPct,
      activeProjectsCount: apiData.activeProjectsCount,
      totalWorkingDays: apiData.leavesAndHolidays?.totalWorkingDays,
      leaves: {
        days: apiData.leavesAndHolidays?.totalLeavesDays,
        hours: apiData.leavesAndHolidays?.totalLeavesHours,
      },
      holidays: {
        days: apiData.leavesAndHolidays?.totalHolidays,
      },
    });
  }, [apiData]);

  const allEntries = useMemo(() => {
    if (!apiData) return [];
    const rows = [];
    for (const week of apiData.weeklySummaryHistory || []) {
      for (const ts of week.timesheets || []) {
        const workDate = ts.workDate;
        if (!ts.defaultHolidayTimesheet && Array.isArray(ts.entries)) {
          for (const e of ts.entries) {
            rows.push({
              date: workDate,
              project:
                getProjectName(e.projectId) || `Project ${e.projectId ?? ""}`,
              type: e.isBillable ? "Billable" : "Non-Billable",
              hours: Number(e.hoursWorked || 0),
              description: e.description || "",
            });
          }
        }
      }
    }
    return rows;
  }, [apiData]);

  const dayOfWeekData = useMemo(() => {
    if (!apiData?.dayWiseSummary) return null;
    const map = apiData.dayWiseSummary;
    const orderedDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    return orderedDays.map((d) => ({
      day: d.charAt(0).toUpperCase() + d.slice(1),
      hours: Number(map[d] || 0),
    }));
  }, [apiData]);

  // -------------------- UPDATED PDF GENERATION (Option A) --------------------
  const handleDownloadPDF = () => {
    if (!apiData) return;

    const doc = new jsPDF("p", "mm", "a4");
    const pageWidth = doc.internal.pageSize.getWidth();

    const monthLabel = new Date(
      `${year}-${String(month).padStart(2, "0")}-01`,
    ).toLocaleDateString("en-US", { month: "long", year: "numeric" });

    const totalHours = Number(apiData.totalHoursWorked || 0);
    const billableHours = Number(apiData.billableHours || 0);
    const nonBillableHours = Number(apiData.nonBillableHours || 0);
    const activeProjects = Number(apiData.activeProjectsCount || 0);
    const leavesDays = Number(apiData.leavesAndHolidays?.totalLeavesDays || 0);
    const leavesHours = Number(
      apiData.leavesAndHolidays?.totalLeavesHours || 0,
    );
    const holidaysDays = Number(apiData.leavesAndHolidays?.totalHolidays || 0);

    const formatDate = (dateStr) => {
      if (!dateStr) return "";
      if (dateStr.length >= 10) return dateStr.slice(0, 10);
      return dateStr;
    };

    //     const resolveStatus = (week) => {
    //   return (
    //     week.statusLabel ||
    //     week.timesheetStatus ||
    //     week.approvalStatus ||
    //     week.status ||
    //     "No Timesheets"
    //   );
    // };
    const getWeeklyStatus = (week) => {
      if (week.weeklyStatus) return week.weeklyStatus;

      // fallback logic
      if (!week.timesheets || week.timesheets.length === 0)
        return "No Timesheets";

      return "SUBMITTED";
    };

    const formatDateTime = (dtStr) => {
      if (!dtStr) return "";
      if (dtStr.length >= 16) return dtStr.slice(0, 16);
      return dtStr;
    };

    const ensureSpace = (neededY, currentY) => {
      const pageHeight = doc.internal.pageSize.getHeight();
      if (currentY + neededY > pageHeight - 10) {
        doc.addPage();
        return 20;
      }
      return currentY;
    };

    // ---------------- PAGE 1: Title + Header Card ----------------
    let y = 20;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(15, 23, 42);
    doc.text("User Monthly Report", 14, y);

    y += 10;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.text(`Report for ${monthLabel}`, 14, y);

    // Header card background
    y += 10; // increased spacing
    const cardX = 14;
    const cardY = y;
    const cardWidth = pageWidth - 28;
    const cardHeight = 70; // taller for proper spacing

    doc.setFillColor(228, 235, 245);
    doc.rect(cardX, cardY, cardWidth, cardHeight, "F");

    // ---------------- Card Content ----------------
    let textY = cardY + 12;

    // Employee name
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text(apiData.employeeName || "-", cardX + 6, textY);

    // Forward spacing
    textY += 12;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    // Hours
    doc.text(`Total Hours Worked: ${totalHours.toFixed(2)}`, cardX + 6, textY);
    textY += 6;
    doc.text(`Billable Hours: ${billableHours.toFixed(2)}`, cardX + 6, textY);
    textY += 6;
    doc.text(
      `Non-Billable Hours: ${nonBillableHours.toFixed(2)}`,
      cardX + 6,
      textY,
    );

    // ------------- Divider (MUST COME AFTER ACTIVE PROJECTS) -------------
    textY += 6;
    doc.text(`Active Projects: ${activeProjects}`, cardX + 6, textY);

    textY += 6;
    doc.text(
      `Total Working Days: ${apiData.leavesAndHolidays?.totalWorkingDays || 0} days`,
      cardX + 6,
      textY,
    );

    // Divider line
    const dividerY = textY + 4;
    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.3);
    doc.line(cardX + 6, dividerY, cardX + cardWidth - 6, dividerY);

    // ------------- Bottom section (Leaves + Holidays) -------------
    let bottomY = dividerY + 6;

    doc.text(
      `Total Leaves: ${leavesDays} days (${leavesHours} hrs)`,
      cardX + 6,
      bottomY,
    );

    bottomY += 6;

    doc.text(`Total Holidays: ${holidaysDays} days`, cardX + 6, bottomY);

    // Update global y for next sections
    y = cardY + cardHeight + 15;

    // ---------------- Daywise Summary ----------------
    y = ensureSpace(40, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Daywise Summary", 14, y);

    const daySummaryRows = [];
    const orderedDays = [
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
      "sunday",
    ];
    if (apiData.dayWiseSummary) {
      orderedDays.forEach((d) => {
        const label = d.charAt(0).toUpperCase() + d.slice(1);
        const val = Number(apiData.dayWiseSummary[d] || 0);
        daySummaryRows.push([label, val.toString()]);
      });
    }

    autoTable(doc, {
      head: [["Day", "Hours"]],
      body: daySummaryRows,
      startY: y + 4,
      styles: { fontSize: 10 },
      theme: "grid",
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [15, 23, 42],
        halign: "left",
      },
    });

    y = (doc.lastAutoTable?.finalY || y + 10) + 10;

    // ---------------- Project Contributions ----------------
    y = ensureSpace(50, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Project Contributions", 14, y);

    const projectRows = [];
    const projects = apiData.projectSummaries?.projects || [];
    projects.forEach((p) => {
      const name =
        getProjectName(p.projectId) ||
        (p.projectId ? `Project ${p.projectId}` : "-");
      projectRows.push([
        name,
        Number(p.totalHours || 0).toFixed(2),
        Number(p.billableHours || 0).toFixed(2),
        Number(p.nonBillableHours || 0).toFixed(2),
        `${Number(p.contribution || 0).toFixed(2)}%`,
      ]);
    });

    autoTable(doc, {
      head: [
        ["Project", "Total Hrs", "Billable", "Non-Billable", "Contribution %"],
      ],
      body: projectRows,
      startY: y + 4,
      theme: "grid",
      styles: { fontSize: 10 },
      headStyles: {
        fillColor: [243, 244, 246],
        textColor: [15, 23, 42],
        halign: "left",
      },
    });

    // ---------------- PAGE 2+: Weekly Summary ----------------
    doc.addPage();
    y = 20;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text("Weekly Summary", 14, y);
    y += 8;

    const weeklyHistory = [...(apiData.weeklySummaryHistory || [])];

    // latest week first (matches sample)
    weeklyHistory.sort((a, b) => {
      const da = new Date(a.startDate);
      const db = new Date(b.startDate);
      return db - da;
    });

    weeklyHistory.forEach((week) => {
      y = ensureSpace(25, y);

      const weekLabelParts = [];
      if (week.weekNumber != null) {
        weekLabelParts.push(`Week ${week.weekNumber}`);
      }
      if (week.startDate && week.endDate) {
        weekLabelParts.push(
          `(${formatDate(week.startDate)} to ${formatDate(week.endDate)})`,
        );
      }
      const hoursPart = `— ${Number(week.totalHours || 0).toFixed(2)} hrs`;
      const weekHeaderText = `${weekLabelParts.join(" ")} ${hoursPart}`;
      const statusText = `[Status: ${getWeeklyStatus(week)}]`;

      // yellow header bar
      doc.setFillColor(254, 243, 199);
      doc.setDrawColor(254, 243, 199);
      doc.rect(14, y, pageWidth - 28, 10, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text(weekHeaderText, 18, y + 7);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(37, 99, 235);
      doc.text(statusText, pageWidth - 14 - 70, y + 7);

      y += 12;

      const timesheets = week.timesheets || [];
      const hasEntries =
        timesheets.some(
          (ts) =>
            ts.defaultHolidayTimesheet ||
            (Array.isArray(ts.entries) && ts.entries.length > 0),
        ) && Number(week.totalHours || 0) > 0;

      if (!hasEntries) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        y = ensureSpace(10, y);
        doc.text("No Timesheets Submitted", 18, y + 5);
        y += 12;
        return;
      }

      const weeklyRows = [];
      timesheets.forEach((ts) => {
        if (ts.defaultHolidayTimesheet) {
          weeklyRows.push([
            formatDate(ts.workDate),
            "",
            "",
            "",
            "",
            Number(ts.hoursWorked || 0).toFixed(2),
            "",
            "Auto/Holiday Entry",
          ]);
        } else if (Array.isArray(ts.entries)) {
          ts.entries.forEach((e) => {
            weeklyRows.push([
              formatDate(ts.workDate),
              getProjectName(e.projectId) ||
              (e.projectId ? `Project ${e.projectId}` : ""),
              getTaskName(e.projectId, e.taskId) ||
              (e.taskId != null ? String(e.taskId) : ""),
              formatDateTime(e.startTime || ""),
              formatDateTime(e.endTime || ""),
              Number(e.hoursWorked || 0).toFixed(2),
              e.isBillable ? "Yes" : "No",
              e.description || "",
            ]);
          });
        }
      });

      y = ensureSpace(30, y);
      autoTable(doc, {
        head: [
          [
            "Date",
            "Project",
            "Task",
            "Start",
            "End",
            "Hours",
            "Billable",
            "Description",
          ],
        ],
        body: weeklyRows,
        startY: y,
        theme: "grid",
        styles: { fontSize: 9 },
        headStyles: {
          fillColor: [243, 244, 246],
          textColor: [15, 23, 42],
          halign: "left",
        },
      });

      y = (doc.lastAutoTable?.finalY || y + 10) + 10;
    });

    // ---------------- Report Notes ----------------
    // ---------------- Dynamic Stylish Report Notes Box ----------------
    y = ensureSpace(20, y);

    const notesX = 14;
    const notesWidth = pageWidth - 28;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);

    // Title height = 12 px
    const titleHeight = 12;
    let tempY = y + titleHeight + 6;

    // Prepare notes list
    const notes = [
      "Billable Hours = Total hours spent on tasks classified as billable across all projects.",
      "Standard Holiday Hours = (Mon–Fri calculated at 8 hours per holiday).",
      "Non-Billable Hours = Sum of all task hours marked as non-billable across all projects + Standard holiday hours.",
      "Total Hours = Billable Hours + Non-Billable Hours.",
      "Billable Utilization % = Billable Hours ÷ Total Hours × 100.",
      "Minimum Monthly Hours = 176.",
      "Leaves / Holidays = Sum of approved leave days + company-declared holidays in the selected month.",
      "Current Active Projects = Number of projects where the employee logged hours during the month.",
      "Project-wise Hour Distribution = Proportion of total hours dedicated to each project relative to all projects combined.",
      "Daily Hours Breakdown = Shows how the employee distributed work hours across each day of the week throughout the month.",
      "Weekly Timesheet Summary = Displays weekly logged hours, approval status, and detailed daily tasks.",
      "Draft / Submitted / Approved / Rejected Status = Draft (saved), Submitted (pending approval), Approved (reviewed), Rejected (requires correction).",
      "Monthly Minimum Hours Requirement = Expected minimum monthly working hours: 176 hours (22 working days × 8 hours/day).",
      "Missing Timesheets = Weeks with zero entries indicate unfilled or unsubmitted timesheets.",
      "Hour Accuracy = Hours displayed are based on submitted timesheets; incomplete or delayed entries may affect totals.",
    ];

    // ---------------- Calculate total dynamic height ----------------
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);

    let totalTextHeight = 0;

    notes.forEach((line) => {
      const split = doc.splitTextToSize(line, notesWidth - 20);
      totalTextHeight += split.length * 6; // 6px per line
      totalTextHeight += 2; // padding
    });

    // Final box height
    const notesHeight = titleHeight + 10 + totalTextHeight + 10;

    // Ensure page space before drawing box
    y = ensureSpace(notesHeight + 20, y);

    // Draw background box
    doc.setFillColor(228, 235, 245);
    doc.roundedRect(notesX, y, notesWidth, notesHeight, 6, 6, "F");

    // Draw border
    doc.setDrawColor(180, 190, 205);
    doc.roundedRect(notesX, y, notesWidth, notesHeight, 6, 6, "S");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text("Report Notes", notesX + 10, y + 14);

    // Render notes
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(55, 65, 81);

    let lineY = y + 24;

    notes.forEach((line) => {
      const wrapped = doc.splitTextToSize(line, notesWidth - 20);
      doc.text(`• `, notesX + 10, lineY);
      doc.text(wrapped, notesX + 16, lineY);
      lineY += wrapped.length * 6 + 2;
    });

    // Footer
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.text(
      `Report generated on ${new Date().toISOString().slice(0, 10)}.`,
      notesX + 10,
      y + notesHeight - 6,
    );

    doc.save(`User_Monthly_Report_${monthLabel.replace(" ", "_")}.pdf`);
  };

  const sendMailPDF = async () => {
    setMailLoading(true);
    try {
      const res = await api.get(`${TS_BASE_URL}/api/report/userMonthlyPdf`, {
        params: {
          month: month,
          year: year,
        },
      });
      toast.success(res?.data || "Mail sent successfully");
    } catch (err) {
      toast.error(err.response?.data || "Failed to send mail");
    } finally {
      setMailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="timesheet-container">
        <div className="timesheet-wrapper">
          <LoadingSpinner text="Loading..." />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="timesheet-container">
        <div className="timesheet-wrapper">Error: {error}</div>
      </div>
    );
  }
  if (!apiData) return null;

  const employeeInitials =
    (apiData.employeeName || "")
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase())
      .join("") || "U";

  return (
    <div className="timesheet-container">
      <div className="timesheet-wrapper">
        <div>
          <button
            className="inline-flex items-center gap-1.5 mb-2 rounded-lg px-3 py-1.5 text-sm font-semibold text-[#263383] bg-[#f4f6fc] hover:bg-[#e8ebf8] transition-colors"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={18} /> Back
          </button>
        </div>
        <header className="timesheet-header">
          <div className="header-content">
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex h-14 w-14 rounded-2xl bg-[#263383] text-white items-center justify-center text-lg font-bold shrink-0">
                {employeeInitials}
              </div>
              <div>
              <h1 className="timesheet-title">
                Monthly Timesheet :
                <button
                  className="filter-toggle-btn"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  {isFilterOpen ? (
                    <div
                      className="ml-15 report-filters"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FilterListbox
                        options={filteredMonths.map((m) => ({ value: m.value, label: m.name }))}
                        value={selectedMonth}
                        onChange={setSelectedMonth}
                      />

                      <FilterListbox
                        options={yearOptions.map((y) => ({ value: y, label: String(y) }))}
                        value={selectedYear}
                        onChange={setSelectedYear}
                      />

                      <Button variant="primary" size="small" onClick={handleFilterApply}>
                        Apply
                      </Button>
                      <XCircle
                        className="text-red-600"
                        onClick={() => setIsFilterOpen(false)}
                      />
                    </div>
                  ) : (
                    <div className="text-teal-500 font-semibold">
                      {monthOptions.find((m) => m.value === month)?.name} {year}
                    </div>
                  )}
                </button>
              </h1>
              <p className="employee-details">
                Employee ID: {apiData.employeeId}
              </p>
              <p className="employee-name">Employee: {apiData.employeeName}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                // className={`download-btn ${
                //   pdfLoading ? "opacity-50 cursor-not-allowed" : ""
                // }`}
                onClick={handleDownloadPDF}
                variant="primary"
                size="medium"
                disabled={pdfLoading}
                loading={pdfLoading}
                loadingText={pdfLoading ? "Downloading..." : ""}
              >
                Download PDF Report
              </Button>
              <Button
                variant="secondary"
                size="medium"
                // className={`ml-3 ${mailLoading ? "is-sending" : ""}`}
                onClick={sendMailPDF}
                disabled={mailLoading}
                loading={mailLoading}
                loadingText={mailLoading ? "Sending..." : ""}
              >
                Send Report via Email
              </Button>
            </div>
          </div>
        </header>

        <KPICards kpis={kpis} />

        {/* Donut from per-entry aggregation; alternatively you can render from projectSummaries */}
        <ProjectDonutChart entries={apiData.projectSummaries.projects} />

        <DayOfWeekBarChart
          entries={allEntries}
          dataOverride={dayOfWeekData || undefined}
        />

        <section className="timesheet-section">
          <div className="section-title">Month (Week-wise)</div>
          <div className="space-y-4">
            {apiData.weeklySummaryHistory.length === 0 ? (
              <p className="text-gray-500 text-sm font-semibold italic">
                No timesheet data available.
              </p>
            ) : (
              (apiData.weeklySummaryHistory || []).map((week, idx) => (
                <WeeklySummaryCard
                  key={idx}
                  week={week}
                  projectInfo={projectInfo}
                />
              ))
            )}
          </div>
        </section>

        <div className="footer-summary">
          <span className="footer-label">MONTHLY TOTAL LOGGED :</span>
          <span className="footer-value">
            {kpis.monthlyTotalAdjusted.toFixed(1)} hrs
          </span>
        </div>
        <div className="notes-card mt-5">
          <h4>Report Notes</h4>
          <ul>
            <li>
              <strong>Billable Hours</strong> = Total hours spent on tasks
              classified as billable across all projects.
            </li>
            <li>
              <strong>Standard Holiday Hours</strong> = (Mon-Fri calculated 8
              hrs/holiday).
            </li>
            <li>
              <strong>Non-Billable Hours</strong> = Sum of all task hours marked
              as non-billable across all projects + Standard holiday hours.
            </li>
            <li>
              <strong>Total Hours</strong> = Billable Hours + Non-Billable Hours
            </li>
            <li>
              <strong>Billable Utilization%</strong> = Billable Hours ÷ Total
              Hours × 100
            </li>
            <li>
              <strong>Minimum Monthly hours</strong> = 176
            </li>
            <li>
              <strong>Leaves / Holidays:</strong> Sum of approved leave days and
              company-declared holidays during the selected month.
            </li>
            <li>
              <strong>Current Active Projects:</strong> Number of projects in
              which the employee logged hours during the month.
            </li>
            <li>
              <strong>Project-wise Hour Distribution:</strong> Represents the
              proportion of total hours dedicated to each project relative to
              all projects combined.
            </li>
            <li>
              <strong>Daily Hours Breakdown:</strong> Shows how the employee
              distributed their work hours across each day of the week
              throughout the month.
            </li>
            <li>
              <strong>Weekly Timesheet Summary:</strong> Each week block
              displays hours logged, approval status, and detailed daily tasks
              submitted by the employee.
            </li>
            <li>
              <strong>Draft / Submitted / Approved / Rejected Status:</strong>
              Draft = Saved but not submitted. Submitted = Pending manager
              approval. Approved = Reviewed and confirmed. Rejected = Timesheet
              reviewed and declined; corrections required before resubmission.
            </li>
            <li>
              <strong>Monthly Minimum Hours Requirement:</strong> Expected
              monthly working hours are 176 hours (22 working days × 8
              hours/day).
            </li>
            <li>
              <strong>Missing Timesheets:</strong> Weeks with zero entries
              indicate timesheets were not filled or submitted.
            </li>
            <li>
              <strong>Hour Accuracy:</strong> Hours displayed are based on
              submitted timesheets; incomplete or delayed entries may affect
              totals.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MonthlyTSReport;
