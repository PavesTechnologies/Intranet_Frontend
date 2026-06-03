import React, {
  useState,
  useMemo,
  useCallback,
  useReducer,
  useRef,
  useEffect,
} from "react";
import api from "../../api/axiosInstance";
import FilterListbox from "../../components/filter/FilterListbox";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";
import LoadingSpinner from "../../components/LoadingSpinner";
import Button from "../../components/Button/Button.jsx";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext.jsx";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
);

const EMPLOYEE_PALETTE = [
  "#3B82F6", // Blue
  "#EF4444", // Red
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#14B8A6", // Teal
  "#D946EF", // Fuchsia
];

// reducer + initialState for modal / selected employee state
const initialState = {
  selectedEmployee: null,
  userListModal: { isOpen: false, title: "", users: [] },
  pendingTimesheets: [], // Will be populated from API
};
function reducer(state, action) {
  switch (action.type) {
    case "OPEN_EMPLOYEE":
      return { ...state, selectedEmployee: action.payload };
    case "CLOSE_EMPLOYEE":
      return { ...state, selectedEmployee: null };
    case "OPEN_USERLIST":
      return {
        ...state,
        userListModal: {
          isOpen: true,
          title: action.title,
          users: action.users,
        },
      };
    case "CLOSE_USERLIST":
      return {
        ...state,
        userListModal: { isOpen: false, title: "", users: [] },
      };
    case "SET_PENDING":
      return { ...state, pendingTimesheets: action.payload };
    case "REMOVE_PENDING":
      return {
        ...state,
        pendingTimesheets: state.pendingTimesheets.filter(
          (p) => p.name !== action.name,
        ),
      };
    default:
      return state;
  }
}

// Helper for project colors
const projectColors = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#ef4444",
  "#14b8a6",
];
const getProjectColor = (index) => projectColors[index % projectColors.length];
const TS_BASE_URL = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;

const ManagerMonthlyReport = () => {
  // --- STATE FOR API DATA ---
  const [apiData, setApiData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projectInfo, setProjectInfo] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [appliedMonth, setAppliedMonth] = useState(new Date().getMonth());
  const [appliedYear, setAppliedYear] = useState(new Date().getFullYear());
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mailLoading, setMailLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const canViewFinance = user?.permissions?.includes("VIEW_FINANCE_REPORT");

  useEffect(() => {
    api.get(`${TS_BASE_URL}/api/project-info/all`).then((res) => {
      setProjectInfo(res.data);
    });
  }, []);

  const getProjectName = (pid) => {
    const p = projectInfo.find((x) => x.projectId == pid);
    return p?.project || `Project ID: ${pid}`;
  };

  const getTaskName = (tid) => {
    for (const p of projectInfo) {
      const t = p.tasks.find((x) => x.taskId == tid);
      if (t) return t.task;
    }
    return `Task ID: ${tid}`;
  };

  // --- DATA FETCHING ---
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // Fetch data from the endpoint
        const response = await api.get(
          `${TS_BASE_URL}/api/report/managerMonthly`,
          {
            params: {
              month: appliedMonth,
              year: appliedYear,
            },
          },
        );
        setApiData(response.data);
        setSelectedMonth(response.data.month);
        setSelectedYear(response.data.year);
      } catch (err) {
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [appliedMonth, appliedYear]);
  const handleFilterApply = () => {
    setAppliedMonth(selectedMonth); // update API month
    setAppliedYear(selectedYear); // update API year
    setIsFilterOpen(false); // close dropdown
  };
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
  const yearOptions = [currentYear, currentYear - 1];

  const totalBillable = apiData?.billableHours ?? 0;
  const totalNonBillable = apiData?.nonBillableHours ?? 0;

  const filteredMonths =
    selectedYear === currentYear
      ? monthOptions.filter((m) => m.value <= appliedMonth)
      : monthOptions;

  const underutilized = useMemo(() => {
    if (!apiData) return [];
    return (apiData.underutilizedInsight?.underutilized || []).map((u) => ({
      name: u.userName,
      hours: u.totalHours, // API doesn't provide hours in this insight
      rank: u.rank,
      expectedHours: apiData.expectedHours, // API doesn't provide productivity
    }));
  }, [apiData]);

  const overworked = useMemo(() => {
    if (!apiData) return [];
    return (apiData.overworkedInsight?.overworked || []).map((u) => ({
      name: u.userName,
      hours: u.totalHours, // API doesn't provide hours in this insight
      expectedHours: apiData.expectedHours, // API doesn't provide productivity
    }));
  }, [apiData]);

  const totalMonthlyHours = apiData?.totalHours ?? 0;

  const topPerformer = useMemo(() => {
    // API data doesn't provide a per-user summary to calculate this.
    // If apiData.userEntriesSummary were populated, we could sort it.
    if (apiData?.userEntriesSummary && apiData.userEntriesSummary.length > 0) {
      const arr = [...apiData.userEntriesSummary];
      arr.sort((a, b) => (b.totalHours || 0) - (a.totalHours || 0));
      return arr[0] || { name: "—", totalHours: 0 };
    }
    return { name: "N/A", totalHours: 0 };
  }, [apiData]);

  const billableMembers = useMemo(
    () => apiData?.billableContribution?.members || [],
    [apiData],
  );

  const nonBillableMembers = useMemo(
    () => apiData?.nonBillableContribution?.members || [],
    [apiData],
  );

  const employeeMonthlyData = useMemo(
    () => apiData?.userEntriesSummary || [],
    [apiData],
  );

  // reducer state for modals / selected employee
  const [state, dispatch] = useReducer(reducer, initialState);
  const { selectedEmployee, userListModal } = state;

  // Effect to populate pending timesheets in the reducer once API data is available
  useEffect(() => {
    if (apiData) {
      const pending = (apiData.missingTimesheets || []).map((u) => ({
        name: u.fullName,
        reason: "Missing timesheet",
      }));
      dispatch({ type: "SET_PENDING", payload: pending });
    }
  }, [apiData]);

  const sendMailPDF = async () => {
    setMailLoading(true);
    try {
      const res = await api.get(
        `${TS_BASE_URL}/api/report/managerMonthlyPdf`,
        {
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
  const generateManagerPDF = async (apiData) => {
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    // ----------------------
    // Visual constants (tweak these for a pixel-perfect match)
    // If you want me to sample exact values, upload the exact page image to sample.
    // ----------------------
    const COLORS = {
      sectionTitle: [14, 56, 133], // blue for section headings (adjust RGB as needed)
      tableHeaderBg: [225, 225, 225], // header background (light gray)
      alternateRowBg: [245, 245, 245], // zebra row color
      notesBoxFill: [235, 245, 255], // light-blue for the notes box
      text: [20, 20, 20], // default text color
      mutedText: [100, 100, 100], // muted / smaller text
    };
    const PAGE = {
      width: 210, // A4 width mm
      height: 297, // A4 height mm
      margin: 14, // default margin in mm - tweak if you want exact match
      bottomLimit: 280, // bottom threshold for adding pages (safe)
    };

    // ----------------------
    // doc setup
    // ----------------------
    const doc = new jsPDF("p", "mm", "a4");
    doc.setProperties({ title: "Manager Monthly Report" });

    // internal cursor (y position)
    let cursorY = 14;

    // helpers
    const ensureSpace = (needed = 30) => {
      if (cursorY + needed > PAGE.bottomLimit) {
        doc.addPage();
        cursorY = 20;
      }
    };

    const addTitle = (text) => {
      doc.setFontSize(18);
      doc.setTextColor(...COLORS.sectionTitle);
      doc.text(text, PAGE.margin, cursorY);
      cursorY += 10;
    };

    const addSubTitle = (text) => {
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.sectionTitle);
      doc.text(text, PAGE.margin, cursorY);
      cursorY += 8;
    };

    const addMutedText = (text) => {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.mutedText);
      doc.text(text, PAGE.margin, cursorY);
      cursorY += 6;
    };

    // shared table defaults for consistent look
    const tableDefaults = {
      theme: "grid",
      styles: {
        fontSize: 10,
        cellPadding: 3,
        textColor: COLORS.text,
        lineWidth: 0.1,
      },
      headStyles: {
        fillColor: COLORS.tableHeaderBg,
        textColor: [0, 0, 0],
        fontStyle: "bold",
      },
      alternateRowStyles: {
        fillColor: COLORS.alternateRowBg,
      },
      margin: { left: PAGE.margin, right: PAGE.margin },
    };

    // ----------------------
    // Header area
    // ----------------------
    addTitle("Manager Monthly Report");

    doc.setFontSize(11);
    doc.setTextColor(...COLORS.mutedText);
    doc.text(
      `${apiData.monthName || ""} ${apiData.year || ""}`,
      PAGE.margin,
      cursorY,
    );
    cursorY += 6;
    doc.setFontSize(11);
    doc.setTextColor(...COLORS.text);
    doc.text(`Manager: ${apiData.managerName || "—"}`, PAGE.margin, cursorY);
    cursorY += 10;

    // ----------------------
    // Summary (boxed table style like reference)
    // ----------------------
    addSubTitle("Summary");

    autoTable(doc, {
      ...tableDefaults,
      startY: cursorY,
      head: [["Metric", "Value"]],
      body: [
        [
          "Month / Year",
          `${apiData.month || apiData.monthName || ""} / ${apiData.year || ""}`,
        ],
        ["Total Hours", (apiData.totalHours ?? 0).toFixed(2)],
        ["Billable Hours", (apiData.billableHours ?? 0).toFixed(2)],
        ["Non-Billable Hours", (apiData.nonBillableHours ?? 0).toFixed(2)],
        ["Auto-Generated Hours", (apiData.autoGeneratedHours ?? 0).toFixed(2)],
        ["Billable %", `${apiData.billablePercentage ?? 0}`],
        [
          "Pending Timesheets",
          apiData.pending ?? apiData.pendingUsers?.length ?? 0,
        ],
      ],
      styles: { halign: "left", valign: "middle" },
      columnStyles: { 0: { cellWidth: 80 }, 1: { cellWidth: 80 } },
    });

    cursorY =
      doc.lastAutoTable && doc.lastAutoTable.finalY
        ? doc.lastAutoTable.finalY + 12
        : cursorY + 12;

    // ----------------------
    // Missing Timesheets (always shown — if empty show 'All users submitted...' like reference)
    // ----------------------
    addSubTitle("Missing Timesheets (Last 15 Days)");

    const missing = apiData.missingTimesheets || [];

    if (missing.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.mutedText);
      doc.text("None", PAGE.margin, cursorY); // << clean text
      cursorY += 10;
    } else {
      autoTable(doc, {
        ...tableDefaults,
        startY: cursorY,
        head: [["User", "User ID", "Pending Weeks"]],
        body: missing.map((m) => [
          m.userName || "-",
          m.userId ?? "-",
          m.pendingWeeks ?? "-",
        ]),
      });
      cursorY = doc.lastAutoTable.finalY + 12;
    }
    // ----------------------
    // Weekly Summary (Day-wise)
    // ----------------------
    addSubTitle("Weekly Summary (Day-wise)");

    autoTable(doc, {
      ...tableDefaults,
      startY: cursorY,
      head: [["Day", "Total Hours"]],
      body: Object.entries(apiData.weeklySummary || {}).map(([d, h]) => [
        d,
        typeof h === "number" ? h.toFixed(2) : h,
      ]),
      styles: { fontSize: 10 },
    });

    cursorY = doc.lastAutoTable.finalY + 12;

    // ----------------------
    // Pending Users (table)
    // ----------------------
    addSubTitle("Pending Users");

    if (!apiData.pendingUsers || apiData.pendingUsers.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.mutedText);
      doc.text("None", PAGE.margin, cursorY);
      cursorY += 10;
    } else {
      autoTable(doc, {
        ...tableDefaults,
        startY: cursorY,
        head: [["User", "User ID", "Pending Weeks"]],
        body: apiData.pendingUsers.map((u) => [
          u.userName,
          u.userId ?? "-",
          u.pendingWeeks ?? "-",
        ]),
      });
      cursorY = doc.lastAutoTable.finalY + 12;
    }

    // ----------------------
    // Project Breakdown (summary table)
    // ----------------------
    addSubTitle("Project Breakdown");

    autoTable(doc, {
      ...tableDefaults,
      startY: cursorY,
      head: [
        ["Project", "Total Hours", "Billable", "Non-Billable", "Billable %"],
      ],
      body: (apiData.projectBreakdown || []).map((p) => [
        p.projectName || `Project ${p.projectId || "-"}`,
        (p.totalHours ?? 0).toFixed(2),
        (p.billableHours ?? 0).toFixed(2),
        (p.nonBillableHours ?? 0).toFixed(2),
        (p.billablePercentage ?? 0).toFixed(2),
      ]),
      styles: { fontSize: 10 },
    });

    cursorY = doc.lastAutoTable.finalY + 12;

    // ----------------------
    // Project Breakdown (per-project details with member contributions)
    // ----------------------
    // Add a heading similar to the PDF that says: Project Breakdown (With Member Contributions)
    addSubTitle("Project Breakdown (With Member Contributions)");

    (apiData.projectBreakdown || []).forEach((proj, pIdx) => {
      ensureSpace(40);

      // Project title
      doc.setFontSize(13);
      doc.setTextColor(...COLORS.text);
      doc.text(
        proj.projectName || `Project ${proj.projectId || pIdx + 1}`,
        PAGE.margin,
        cursorY,
      );
      cursorY += 8;

      // Project summary small table
      autoTable(doc, {
        ...tableDefaults,
        startY: cursorY,
        head: [["Metric", "Value"]],
        body: [
          ["Total Hours", (proj.totalHours ?? 0).toFixed(2)],
          ["Billable Hours", (proj.billableHours ?? 0).toFixed(2)],
          ["Non-Billable Hours", (proj.nonBillableHours ?? 0).toFixed(2)],
          ["Billable %", (proj.billablePercentage ?? 0).toFixed(2)],
        ],
        styles: { fontSize: 10 },
      });

      cursorY = doc.lastAutoTable.finalY + 8;

      // Member Contributions
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.sectionTitle);
      doc.text("Member Contributions", PAGE.margin, cursorY);
      cursorY += 8;

      const members = proj.membersContribution || proj.members || [];
      if (!members || members.length === 0) {
        doc.setFontSize(10);
        doc.setTextColor(...COLORS.mutedText);
        doc.text("No members assigned", PAGE.margin, cursorY);
        cursorY += 10;
      } else {
        autoTable(doc, {
          ...tableDefaults,
          startY: cursorY,
          head: [["Member", "User ID", "Hours", "Contribution %"]],
          body: members.map((m) => [
            m.userName || m.name || "-",
            m.userId ?? m.id ?? "-",
            (m.totalHours ?? m.hours ?? 0).toFixed(2),
            (m.contribution ?? 0).toFixed(2),
          ]),
          styles: { fontSize: 10 },
        });
        cursorY = doc.lastAutoTable.finalY + 12;
      }

      // horizontal rule separation (thin)
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(PAGE.margin, cursorY - 4, PAGE.width - PAGE.margin, cursorY - 4);
      cursorY += 4;
    });

    // ----------------------
    // User Contributions
    // ----------------------
    addSubTitle("User Contributions");

    // Billable
    addSubTitle("Billable Contribution");
    autoTable(doc, {
      ...tableDefaults,
      startY: cursorY,
      head: [["User", "User ID", "Hours", "Contribution %"]],
      body: (apiData.billableContribution?.members || []).map((m) => [
        m.userName,
        m.userId,
        (m.billableHours ?? 0).toFixed(2),
        (m.contribution ?? 0).toFixed(2),
      ]),
    });
    cursorY = doc.lastAutoTable.finalY + 12;

    // Non-Billable
    addSubTitle("Non-Billable Contribution");
    autoTable(doc, {
      ...tableDefaults,
      startY: cursorY,
      head: [["User", "User ID", "Hours", "Contribution %"]],
      body: (apiData.nonBillableContribution?.members || []).map((m) => [
        m.userName,
        m.userId,
        (m.nonBillableHours ?? 0).toFixed(2),
        (m.contribution ?? 0).toFixed(2),
      ]),
    });
    cursorY = doc.lastAutoTable.finalY + 12;

    // Auto-Generated
    addSubTitle("Auto-Generated Contribution");
    autoTable(doc, {
      ...tableDefaults,
      startY: cursorY,
      head: [["User", "User ID", "Hours", "Contribution %"]],
      body: (apiData.autoGeneratedContribution?.members || []).map((m) => [
        m.userName,
        m.userId,
        (m.autoHours ?? 0).toFixed(2),
        (m.contribution ?? 0).toFixed(2),
      ]),
    });
    cursorY = doc.lastAutoTable.finalY + 12;

    // ----------------------
    // Insights (Underutilized, Overworked, Multi-Project)
    // ----------------------
    addSubTitle("Insights");

    // Underutilized Employees (Heading with Expected Hours)
    const expectedHours = apiData.expectedHours ?? "-";

    // Custom heading instead of addSubTitle
    doc.setFontSize(13);
    doc.setTextColor(...COLORS.sectionTitle);
    doc.text(
      `Underutilized Employees (Expected Hours: ${expectedHours})`,
      PAGE.margin,
      cursorY,
    );
    cursorY += 8;

    const under = apiData.underutilizedInsight?.underutilized || [];

    if (under.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.mutedText);
      doc.text("None", PAGE.margin, cursorY);
      cursorY += 8;
    } else {
      autoTable(doc, {
        ...tableDefaults,
        startY: cursorY,
        head: [["User", "User ID", "Total Hours"]],
        body: under.map((u) => [
          u.userName,
          u.userId,
          (u.totalHours ?? 0).toFixed(2),
        ]),
      });

      cursorY = doc.lastAutoTable.finalY + 12;
    }

    // Overworked
    addSubTitle("Overworked Employees");
    const over = apiData.overworkedInsight?.overworked || [];
    if (over.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.mutedText);
      doc.text("None", PAGE.margin, cursorY);
      cursorY += 8;
    } else {
      autoTable(doc, {
        ...tableDefaults,
        startY: cursorY,
        head: [["User", "User ID", "totalHours"]],
        body: over.map((u) => [
          u.userName,
          u.userId,
          (u.totalHours ?? 0).toFixed(2),
        ]),
      });
      cursorY = doc.lastAutoTable.finalY + 12;
    }

    // Multi-Project Workers
    addSubTitle("Multi-Project Workers");
    const multi = apiData.multiProjectWorkersInsight?.multiProjectWorkers || [];
    if (multi.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(...COLORS.mutedText);
      doc.text("None", PAGE.margin, cursorY);
      cursorY += 8;
    } else {
      autoTable(doc, {
        ...tableDefaults,
        startY: cursorY,
        head: [["User", "User ID", "projectCount"]],
        body: multi.map((u) => [u.userName, u.userId, u.projectCount]),
      });
      cursorY = doc.lastAutoTable.finalY + 12;
    }

    // ----------------------
    // User Weekly Timesheet Summaries (detailed per user)
    // ----------------------
    addSubTitle("User Weekly Timesheet Summaries");

    (apiData.userEntriesSummary || []).forEach((usr) => {
      ensureSpace(30);
      doc.setFontSize(12);
      doc.setTextColor(...COLORS.text);
      doc.text(`${usr.userName} (${usr.userId})`, PAGE.margin, cursorY);
      cursorY += 8;

      doc.setFontSize(10);
      doc.setTextColor(...COLORS.mutedText);
      doc.text(
        `Total Hours: ${(usr.totalHours ?? 0).toFixed(2)}`,
        PAGE.margin,
        cursorY,
      );
      cursorY += 8;

      (usr.weeklySummary || []).forEach((week) => {
        ensureSpace(40);
        // week heading box style
        doc.setFillColor(245, 245, 245);
        doc.rect(PAGE.margin, cursorY, PAGE.width - PAGE.margin * 2, 8, "F");
        doc.setFontSize(11);
        doc.setTextColor(...COLORS.text);
        doc.text(
          `Week ${week.weekId}: ${week.startDate} # ${week.endDate} (${week.weeklyStatus || "-"})`,
          PAGE.margin + 2,
          cursorY + 6,
        );
        cursorY += 12;

        // table of timesheets for the week
        const rows = (week.timesheets || []).map((t) => {
          // if is holiday / default timesheet and no entries, show combined description row
          if (
            (t.defaultHolidayTimesheet || t.isHolidayTimesheet) &&
            (!t.entries || t.entries.length === 0)
          ) {
            return [
              t.workDate || "-",
              `Auto/holiday/default timesheet (hours=${(t.hoursWorked ?? t.hours ?? t.totalHours ?? 0).toFixed(2)})`,
              "",
              "",
              "",
            ];
          }
          // otherwise expand entries if present
          if (t.entries && t.entries.length > 0) {
            // join entries for display as multiple rows
            return t.entries.map((e) => [
              t.workDate || e.workDate || "-",
              e.projectId ?? e.projectName ?? "-",
              e.taskId ?? e.taskName ?? "-",
              (e.hoursWorked ?? e.hours ?? 0).toFixed(2),
              e.isBillable ? "true" : "false",
              e.description || "",
            ]);
          }
          // fallback row
          return [
            t.workDate || "-",
            "-",
            "-",
            (t.hoursWorked ?? t.hours ?? 0).toFixed(2),
            t.status || "-",
            "",
          ];
        });

        // rows may be nested arrays if we returned arrays of arrays; flatten appropriately
        const flatRows = [];
        rows.forEach((r) => {
          if (Array.isArray(r[0])) {
            r.forEach((rr) => flatRows.push(rr));
          } else flatRows.push(r);
        });

        // Choose header depending on whether we have description column
        const hasDescription = flatRows.some((r) => r.length >= 6);
        const headRow = hasDescription
          ? ["Date", "Project", "Task", "Hours", "Billable", "Description"]
          : ["Date", "Project", "Task", "Hours", "Billable"];

        autoTable(doc, {
          ...tableDefaults,
          startY: cursorY,
          head: [headRow],
          body: flatRows,
          styles: { fontSize: 10 },
          columnStyles: { 0: { cellWidth: 30 } },
        });

        cursorY = doc.lastAutoTable.finalY + 10;
      });
    });

    // ----------------------
    // Report Notes (boxed, blue background)
    // ----------------------
    // ------------------------------------------------------------
    // REPORT NOTES (Fully Dynamic — No Text Overflow)
    // ------------------------------------------------------------
    if (cursorY + 50 > 270) {
      doc.addPage();
      cursorY = 20;
    }

    const notes = [
      "Billable Hours: Total hours spent by team members on tasks classified as billable across all assigned projects.",
      "Non-Billable Hours: Total hours logged on tasks marked as non-billable across all projects.",
      "Total Hours: Sum of Billable Hours and Non-Billable Hours.",
      "Billable Utilization (%): (Billable Hours ÷ Total Hours) × 100.",
      "Minimum Monthly Hours Requirement: 176 hours per employee (22 working days × 8 hours/day).",
      "Active Projects: Total number of projects that had at least one timesheet entry during the selected month.",
      "Project Allocation Hours: Total hours contributed to each project by all associated team members.",
      "Daily Contribution: Distribution of total hours logged by the team for each day of the selected month.",
      "Billable vs Non-Billable (Overall): Normalized ratio showing how the team's total hours split across billable and non-billable work.",
      "Underutilized Employees: Team members whose logged hours are below the expected minimum monthly threshold.",
      "Overworked Employees: Team members whose hours exceed acceptable capacity (e.g., > 176 hours/month).",
      "Pending Timesheets: Number of employees who have not submitted timesheets for last 15 days within the selected month.",
      "Billing Data Accuracy: Hours in this report are based on submitted timesheets only.",
      "Average Billable Percentage: Average of the billable percentage values of all projects for the selected month.",
    ];

    // ---- Box Layout ----
    const boxX = 12;
    const boxWidth = 186;
    const padding = 10;
    let startY = cursorY;

    // Compute wrapped notes + total height
    let lineHeight = 6;
    let totalHeight = padding + 10; // Title

    const wrappedNotes = notes.map((note) => {
      const wrapped = doc.splitTextToSize(note, boxWidth - 20);
      totalHeight += wrapped.length * lineHeight + 6;
      return wrapped;
    });
    totalHeight += padding;

    // Page break if needed
    if (startY + totalHeight > 280) {
      doc.addPage();
      startY = 20;
    }

    // Draw dynamic rounded box
    doc.setFillColor(230, 240, 255);
    doc.roundedRect(boxX, startY, boxWidth, totalHeight, 6, 6, "F");

    // Title
    let y = startY + 16;
    doc.setFontSize(13);
    doc.setTextColor(20, 60, 160);
    doc.text("Report Notes", boxX + 6, y);

    y += 10;

    // Reset font for notes
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);

    // Render bullet + wrapped note
    wrappedNotes.forEach((lines) => {
      doc.setFillColor(0, 0, 0);
      doc.circle(boxX + 6, y + 1.5, 1.6, "F");
      doc.text(lines, boxX + 12, y);
      y += lines.length * lineHeight + 4;
    });

    cursorY = y + 10;

    // footer timestamp
    doc.setFontSize(8);
    doc.setTextColor(130, 130, 130);
    const footerTxt = `Report generated by Timesheet Management System on ${new Date().toISOString()}`;
    doc.text(footerTxt, PAGE.margin, PAGE.height - 8);

    // Save final file
    doc.save(
      `Manager_Report_${apiData.month || apiData.monthName}_${apiData.year}.pdf`,
    );
  };

  // weekly selection state (No longer used for modal, but keeping structure if needed)
  // const [selectedWeekIdx, setSelectedWeekIdx] = useState(null);
  // const [weeklyModal, setWeeklyModal] = useState({ isOpen: false, weekIndex: null });
  // const openWeeklyModal = (idx) => { ... };
  // const closeWeeklyModal = () => setWeeklyModal({ isOpen: false, weekIndex: null });

  // -------------------------
  // Charts: Project selection behavior
  // -------------------------
  const projectsWithTotals = useMemo(() => {
    if (!apiData || !apiData.projectBreakdown) return [];
    return apiData.projectBreakdown.map((p, idx) => ({
      project: p.projectName,
      members: (p.membersContribution || []).map((m) => ({
        name: m.userName,
        hours: m.totalHours,
        billableHours: m.billableHours,
        nonBillableHours: m.nonBillableHours,
        contribution: m.contribution,
      })),
      totalHours: p.totalHours,
      billableHours: p.billableHours,
      color: getProjectColor(idx), // Assign a color
    }));
  }, [apiData]);

  // bar chart: total hours per project
  const [selectedProjectIdx, setSelectedProjectIdx] = useState(0);
  const barRef = useRef(null);
  // const lineRef = useRef(null); // Line chart removed

  // section refs (for KPI scroll navigation)
  const lineSectionRef = useRef(null); // Now points to Daily Contribution
  const projectAllocationRef = useRef(null);
  const projectBarSectionRef = useRef(null);
  const employeeOverviewRef = useRef(null);

  // small helper: smooth scroll and optional callback
  const scrollToSection = (ref, cb) => {
    if (!ref || !ref.current) return;
    ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    if (typeof cb === "function") cb();
  };

  const totalHoursBarData = useMemo(
    () => ({
      labels: projectsWithTotals.map((p) => p.project),
      datasets: [
        {
          label: "Total Hours",
          data: projectsWithTotals.map((p) => p.totalHours),
          backgroundColor: projectsWithTotals.map((p) => p.color),
          borderRadius: 8,
        },
      ],
    }),
    [projectsWithTotals],
  );

  const totalHoursBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            // Title is the Project Name. ensure it shows the FULL name on hover
            title: (tooltipItems) => {
              return tooltipItems[0].label;
            },
            label: (ctx) => {
              const val = ctx.parsed.y ?? ctx.parsed;
              return ` ${val} hours`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { maxTicksLimit: 10 },
          title: { display: true, text: "Hours" },
        },
        x: {
          ticks: {
            // This is the "Line Clamp" logic
            callback: function (value) {
              // Get the full label using the value index
              const label = this.getLabelForValue(value);

              // Truncate if longer than 12 characters (adjust 12 to your liking)
              if (typeof label === "string" && label.length > 12) {
                return label.substr(0, 12) + "...";
              }
              return label;
            },
            // Optional: Rotate labels slightly if they are still tight
            maxRotation: 45,
            minRotation: 25,
            autoSkip: false,
          },
        },
      },
    }),
    [],
  );

  // Daily contribution (bar) - shows daily contribution hours
  const dailyBarData = useMemo(() => {
    if (!apiData) return { labels: [], datasets: [] };
    const labels = Object.keys(apiData.weeklySummary).map(
      (d) => d.charAt(0) + d.slice(1).toLowerCase(),
    );
    const data = Object.values(apiData.weeklySummary);

    return {
      labels,
      datasets: [
        {
          label: "Daily Hours",
          data,
          borderRadius: 6,
          borderWidth: 0,
          backgroundColor: labels.map(() => "#8b5cf6"),
        },
      ],
    };
  }, [apiData]);

  const dailyBarOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          left: 10,
          right: 10,
          top: 15,
          bottom: 10,
        },
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: { label: (ctx) => `${ctx.parsed.y ?? ctx.parsed} hours` },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            maxTicksLimit: 5,
          },
          grid: { drawBorder: true },
        },
        x: {
          grid: { display: false },
          ticks: { maxRotation: 0, autoSkip: false },
        },
      },
    }),
    [],
  );

  // handleLineClick (REMOVED)

  // robust handleBarClick — works across react-chartjs-2 / Chart.js versions
  const handleBarClick = useCallback((event) => {
    try {
      const chartWrapper = barRef.current;
      const chart =
        chartWrapper?.chartInstance ?? chartWrapper?.current ?? chartWrapper;

      if (!chart) {
        return;
      }

      const nativeEvt = event?.nativeEvent ?? event;

      const elems =
        typeof chart.getElementsAtEventForMode === "function"
          ? chart.getElementsAtEventForMode(
              nativeEvt,
              "nearest",
              { intersect: true },
              true,
            )
          : typeof chart.getElementsAtEvent === "function"
            ? chart.getElementsAtEvent(nativeEvt)
            : [];

      if (!elems || elems.length === 0) {
        return;
      }

      const idx = elems[0].index;
      if (typeof idx === "number") setSelectedProjectIdx(idx);
    } catch (err) {
      // console.error('handleBarClick error', err);
    }
  }, []);

  // donut data for selected project (members' raw hours)
  const donutData = useMemo(() => {
    const p = projectsWithTotals[selectedProjectIdx] ||
      projectsWithTotals[0] || {
        members: [],
        color: "#888",
        project: "N/A",
        totalHours: 0,
      };
    const labels = p.members.map((m) => m.name);
    const data = p.members.map((m) => m.hours);
    const backgroundColor = p.members.map(
      (_, i) => EMPLOYEE_PALETTE[i % EMPLOYEE_PALETTE.length],
    );
    return {
      labels,
      datasets: [
        { data, backgroundColor, borderColor: "#fff", borderWidth: 2 },
      ],
    };
  }, [selectedProjectIdx, projectsWithTotals]);

  const donutOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: "bottom", labels: { padding: 10 } },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const label = ctx.label || "";
              const hours = ctx.raw ?? ctx.parsed;
              const project = projectsWithTotals[selectedProjectIdx] ||
                projectsWithTotals[0] || { totalHours: 1 };
              const percent = project.totalHours
                ? ((hours / project.totalHours) * 100).toFixed(1)
                : "0.0";
              return `${label}: ${hours}h (${percent}%)`;
            },
          },
        },
      },
    }),
    [selectedProjectIdx, projectsWithTotals],
  );

  const selectedProject =
    projectsWithTotals[selectedProjectIdx] || projectsWithTotals[0] || null;
  const selectedProjectTotal = selectedProject ? selectedProject.totalHours : 0;

  // overall stacked data (normalized percentages for overall totals)
  const overallStackedData = useMemo(() => {
    const total = totalBillable + totalNonBillable || 1;
    return {
      labels: ["Overall"],
      datasets: [
        {
          label: "Billable",
          data: [Number(((totalBillable / total) * 100).toFixed(1))],
          backgroundColor: "#C9B59C",
          rawHours: totalBillable,
        },
        {
          label: "Non-Billable",
          data: [Number(((totalNonBillable / total) * 100).toFixed(1))],
          backgroundColor: "white",
          rawHours: totalNonBillable,
        },
      ],
    };
  }, [totalBillable, totalNonBillable]);

  // overall stacked options — tuned for height and alignment
  const overallStackedOptions = useMemo(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 18, right: 18, top: 8, bottom: 8 }, // match other charts
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 14, padding: 8, usePointStyle: false },
          align: "center",
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const hours = ctx.dataset.rawHours;
              const pct = ctx.parsed.x;
              return `${ctx.dataset.label}: ${hours}h (${pct}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          max: 100,
          ticks: { callback: (v) => `${v}%`, stepSize: 10 },
          grid: { display: true, drawBorder: false },
        },
        y: {
          stacked: true,
          grid: { display: false },
        },
      },
      elements: {
        bar: {
          // stronger thickness for horizontal bar
          barThickness: 28,
          maxBarThickness: 40,
        },
      },
    }),
    [],
  );

  // map projectStackedData into a full-width data shape for the larger stacked bar
  const projectStackedDataForFullWidth = useMemo(() => {
    if (!selectedProject) return { labels: [], datasets: [] };

    const billable = Math.max(0, selectedProject.billableHours || 0);
    const nonBillable = Math.max(
      0,
      (selectedProject.totalHours || 0) - billable,
    );
    const tot = billable + nonBillable || 1;
    const billablePerc = +((billable / tot) * 100).toFixed(1);
    const nonBillablePerc = +((nonBillable / tot) * 100).toFixed(1);

    return {
      labels: [selectedProject.project],
      datasets: [
        {
          label: "Billable",
          data: [billablePerc],
          backgroundColor: "#2563eb",
          rawHours: billable,
        },
        {
          label: "Non-billable",
          data: [nonBillablePerc],
          backgroundColor: "#f59e0b",
          rawHours: nonBillable,
        },
      ],
      raw: { billable, nonBillable, tot },
    };
  }, [selectedProject]);

  // project stacked options for full width — match overall padding and thickness
  const projectStackedOptionsForFullWidth = useMemo(
    () => ({
      indexAxis: "y",
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { left: 18, right: 18, top: 0, bottom: 8 },
      },
      plugins: {
        legend: {
          position: "bottom",
          labels: { boxWidth: 14, padding: 5 },
          align: "center",
        },
        // 1. Add the Title configuration here
        title: {
          display: true,
          text: selectedProject ? selectedProject.project : "",
          position: "top",
          align: "center",
          font: {
            size: 20,
            weight: "bold",
            family: "'Inter', sans-serif",
          },
          padding: { bottom: 10 },
          color: "#8C00FF", // gray-700
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const hours = ctx.dataset.rawHours;
              const pct = ctx.parsed.x;
              return `${ctx.dataset.label}: ${hours}h (${pct}%)`;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          max: 100,
          ticks: { callback: (v) => `${v}%`, stepSize: 10 },
          grid: { display: true, drawBorder: false },
        },
        y: {
          stacked: true,
          grid: { display: false, drawBorder: false },
          // 2. Hide the label on the left
          ticks: { display: false },
        },
      },
      elements: {
        bar: { barThickness: 40, maxBarThickness: 40 },
      },
    }),
    // 3. Important: Add selectedProject to dependencies so title updates
    [selectedProject],
  );

  // (Export CSV helper removed — not required in this variant)

  const showEmployeeTimesheet = (employee) =>
    dispatch({ type: "OPEN_EMPLOYEE", payload: employee });
  const closeEmployeeTimesheet = () => dispatch({ type: "CLOSE_EMPLOYEE" });

  const showUserList = useCallback(
    (title, users) => dispatch({ type: "OPEN_USERLIST", title, users }),
    [dispatch],
  );
  const closeUserList = () => dispatch({ type: "CLOSE_USERLIST" });

  const showBillableUsers = () => {
    showUserList(
      "Billable Hours Breakdown",
      (billableMembers || []).map((e) => ({
        name: e.userName,
        hours: e.billableHours,
        meta: `${e.billableHours}h billable • ${e.contribution.toFixed(
          1,
        )}% of total`,
      })),
    );
  };

  const showNonBillableUsers = () => {
    showUserList(
      "Non-Billable Hours Breakdown",
      (nonBillableMembers || []).map((e) => ({
        name: e.userName,
        hours: e.nonBillableHours,
        meta: `${e.nonBillableHours}h non-billable • ${e.contribution.toFixed(
          1,
        )}% of total`,
      })),
    );
  };

  const showPendingUsers = () => {
    showUserList(
      "Pending Timesheets",
      state.pendingTimesheets.map((p) => ({
        name: p.name,
        hours: null,
        meta: p.reason,
      })),
    );
  };

  const showUnderutilizedUsers = () => {
    showUserList(
      "Underutilized Team Members",
      underutilized.map((u) => ({
        name: u.name,
        hours: u.hours,
        rank: u.rank,
        expectedHours: u.expectedHours,
        meta: `• ${u.hours} hours less than monthly ${u.expectedHours} hours`,
      })),
    );
  };

  const showOverworkedUsers = () => {
    if (overworked.length === 0) {
      showUserList("Overworked Team Members", [
        {
          name: "No overworked members",
          hours: null,
          meta: "All team members are within healthy working hours",
        },
      ]);
    } else {
      showUserList(
        "Overworked Team Members",
        overworked.map((o) => ({
          name: o.name,
          hours: o.hours,
          expectedHours: o.expectedHours,
          meta: `• ${o.hours} hours over than monthly ${o.expectedHours} hours`,
        })),
      );
    }
  };

  // Show project allocation details in the user list modal
  const showProjectAllocationDetails = (project) => {
    showUserList(
      `Project: ${project.project} Details`,
      project.members.map((m) => ({
        name: m.name,
        hours: m.hours,
        billableHours: m.billableHours,
        nonBillableHours: m.nonBillableHours,
        contribution: m.contribution,
        meta: `Billable: ${m.billableHours}h, Non-billable: ${
          m.nonBillableHours
        }h Contribution: ${m.contribution.toFixed(1)}%`,
      })),
    );
  };

  // click handler for the overall stacked bar (billable / non-billable)
  const handleOverallStackClick = useCallback(
    (evt, elements) => {
      if (!elements || elements.length === 0) return;
      const datasetIndex = elements[0].datasetIndex;
      if (datasetIndex === 0) {
        // Billable clicked
        showBillableUsers();
      } else {
        // Non-billable clicked
        showNonBillableUsers();
      }
    },
    [billableMembers, nonBillableMembers, showUserList], // Dependencies updated
  );

  // click handler for the per-project stacked bar (works like overall but scoped to selectedProject)
  const handleProjectStackClick = useCallback(
    (evt, elements) => {
      if (!elements || elements.length === 0) return;
      const datasetIndex = elements[0].datasetIndex;
      if (!selectedProject) return;
      if (datasetIndex === 0) {
        // show members' billable hours for selected project
        showUserList(
          `Project: ${selectedProject.project} — Members (hours)`,
          (selectedProject.members || []).map((m) => ({
            name: m.name,
            hours: m.hours,
            meta: `${m.hours}h on ${selectedProject.project}`,
          })),
        );
      } else {
        // For Non-billable — show same members but mark as non-billable
        showUserList(
          `Project: ${selectedProject.project} — Members (non-billable)`,
          (selectedProject.members || []).map((m) => ({
            name: m.name,
            hours: 0,
            meta: `Non-billable details not available per member`,
          })),
        );
      }
    },
    [selectedProject, showUserList],
  );

  // --- KPI Card handler functions ---
  const showTeamTotalDetails = () => {
    // This function used mock data. We'll adapt it to show project members instead.
    // Or, we can use the billable/non-billable members list
    showUserList(
      "Team Members — Billable (This Month)",
      (billableMembers || []).map((m) => ({
        name: m.userName,
        hours: m.billableHours,
        meta: `${m.billableHours}h billable`,
      })),
    );
  };

  const showActiveProjectsDetails = () => {
    showUserList(
      "Active Projects",
      projectsWithTotals.map((p) => ({
        name: p.project,
        hours: p.totalHours,
        meta: `${p.members.length} member${
          p.members.length !== 1 ? "s" : ""
        } • ${p.totalHours}h total`,
      })),
    );
  };

  // ... (Other functions like getIntensityClass, getTileClass remain the same) ...
  const getIntensityClass = (hours) => {
    if (hours > 25) return "bg-blue-600 text-white";
    if (hours > 18) return "bg-blue-500 text-white";
    if (hours > 10) return "bg-blue-300 text-gray-900";
    return "bg-blue-100 text-gray-700";
  };

  const getTileClass = (hours) => {
    if (hours < 140)
      return "border-red-300 bg-gradient-to-br from-red-50 to-white";
    if (hours < 160)
      return "border-yellow-300 bg-gradient-to-br from-yellow-50 to-white";
    if (hours < 170)
      return "border-green-300 bg-gradient-to-br from-green-50 to-white";
    return "border-blue-400 bg-gradient-to-br from-blue-50 to-white";
  };

  const getTileHoursColor = (hours) => {
    if (hours < 140) return "text-red-600";
    if (hours < 160) return "text-yellow-600";
    if (hours < 170) return "text-green-600";
    return "text-blue-600";
  };

  // --- RENDER LOGIC ---
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">
          <LoadingSpinner text="Loading Report..." />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-xl font-semibold text-red-600">
          Error loading data: {error.message}
        </div>
      </div>
    );
  }

  if (!apiData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-xl font-semibold text-gray-700">
          No data available for this report.
        </div>
      </div>
    );
  }

  // --- JSX ---
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {!canViewFinance && (
          <div>
            <button
              className="flex gap-1 text-lg text-blue-500 hover:text-blue-700"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft size={20} className="mt-1" /> Back
            </button>
          </div>
        )}
        {/* Header */}
        <header className="mb-6 mt-2">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Manager Dashboard — Team View
              </h1>
              {/* <p className="text-sm text-gray-600">
                Generated: {new Date().toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Data for: {apiData.dateRange.startDate} to{" "}
                {apiData.dateRange.endDate}
              </p> */}
              <p className="month pt-1 font-semibold text-red-500">
                Report Month:
                <button
                  className="filter-toggle-btn"
                  onClick={() => setIsFilterOpen(!isFilterOpen)}
                >
                  <span>
                    {monthOptions.find((m) => m.value === appliedMonth)?.name},
                    {appliedYear}
                  </span>
                </button>
              </p>

              {isFilterOpen && (
                <div className="report-filters">
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

                  <button className="apply-btn" onClick={handleFilterApply}>
                    Apply
                  </button>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <Button
                variant="primary"
                size="medium"
                onClick={() => generateManagerPDF(apiData)}
              >
                Download PDF
              </Button>

              <Button
                variant="secondary"
                size="medium"
                className={`${mailLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={sendMailPDF}
                disabled={mailLoading}
              >
                {mailLoading ? "Sending..." : "Send Report via Email"}
              </Button>
            </div>
          </div>
        </header>

        {/* KPI Cards (clickable, scroll-enabled) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* 1) Team Monthly Hours -> scroll to line/daily section */}
          <button
            type="button"
            onClick={() =>
              scrollToSection(lineSectionRef, () => {
                // optionally, you could highlight a default week or similar
              })
            }
            className="text-left bg-white rounded-xl shadow-sm p-6 hover:-translate-y-1 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm text-gray-600 font-medium mb-2">
                  Team Monthly Hours
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {totalMonthlyHours}h
                </div>
                <div className="text-xs text-gray-600">
                  Click to view daily breakdown
                </div>
              </div>
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center text-2xl">
                ⏰
              </div>
            </div>
          </button>

          {/* 2) Active Projects -> scroll to Project Allocation */}
          <button
            type="button"
            onClick={() => scrollToSection(projectAllocationRef)}
            className="text-left bg-white rounded-xl shadow-sm p-6 hover:-translate-y-1 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm text-gray-600 font-medium mb-2">
                  Active Projects
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {apiData.uniqueProjectCount}
                </div>
                <div className="text-xs text-gray-600">
                  Click to open project allocation
                </div>
              </div>
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center text-2xl">
                📁
              </div>
            </div>
          </button>

          {/* 3) Project Utilization -> scroll to project-wise totals + stack */}
          <button
            type="button"
            onClick={() =>
              scrollToSection(projectBarSectionRef, () => {
                // optionally, focus a project (e.g., the first)
                setSelectedProjectIdx(0);
              })
            }
            className="text-left bg-white rounded-xl shadow-sm p-6 hover:-translate-y-1 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm text-gray-600 font-medium mb-2">
                  Project Utilization
                </div>
                <div className="text-3xl font-bold text-gray-900 mb-1">
                  {apiData.billablePercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-600">
                  Click to view project totals & billable split
                </div>
              </div>
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-lg flex items-center justify-center text-2xl">
                📈
              </div>
            </div>
          </button>

          {/* 4) Top Performer -> scroll to Employee Monthly Overview */}
          <button
            type="button"
            onClick={() => scrollToSection(employeeOverviewRef)}
            className="text-left bg-white rounded-xl shadow-sm p-6 hover:-translate-y-1 transition-transform focus:outline-none focus:ring-2 focus:ring-blue-300"
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="text-sm text-gray-600 font-medium mb-2">
                  Average Billable Percentage
                </div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {apiData?.projectHoursSummary?.averageBillablePercentage ?? 0}{" "}
                  %
                </div>
                <div className="text-xs text-gray-600">
                  Click to view profile
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-lg flex items-center justify-center text-2xl">
                ⭐
              </div>
            </div>
          </button>
        </div>

        {/* 1️⃣ SECTION 1: Daily Contribution (KPI #1) */}
        {/* Weekly Trend chart removed as API data is not compatible */}
        <div ref={lineSectionRef} className="grid grid-cols-1 gap-6 mb-6">
          {/* DAILY CONTRIBUTION */}
          <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">
              Daily Contribution
            </h2>
            <p className="text-xs text-gray-500 mb-4">Total hours by day</p>
            <div className="flex-1 min-h-[200px]">
              <Bar
                data={dailyBarData}
                options={dailyBarOptions}
                onClick={(evt, elements) => {
                  if (!elements?.length) return;
                  const idx = elements[0].index;
                  const day = Object.keys(apiData.weeklySummary)[idx];
                  const hours = Object.values(apiData.weeklySummary)[idx];
                  showUserList(`Daily breakdown — ${day}`, [
                    {
                      name: "Team total",
                      hours: hours,
                      meta: `${hours}h on ${day}`,
                    },
                  ]);
                }}
              />
            </div>
          </div>
        </div>

        <div>
          {/* OVERALL STACKED BAR - give the container a taller min height to match top charts */}
          <div className="mt-6 mb-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <div className="text-sm font-semibold">
                  Overall Billable vs Non-Billable
                </div>
                <div className="text-xs text-gray-600">
                  100% normalized total hours
                </div>
              </div>
              <div className="text-sm font-semibold text-gray-700">
                {totalBillable}h billable • {totalNonBillable}h non-billable
              </div>
            </div>

            {/* Taller canvas so the horizontal stacked bar is clear and aligned */}
            <div className="min-h-[120px] h-32">
              <Bar
                data={overallStackedData}
                options={overallStackedOptions}
                onClick={handleOverallStackClick}
              />
            </div>
          </div>
        </div>

        {/* 2️⃣ SECTION 2: Project Allocation Tiles (KPI #2) */}
        <div
          ref={projectAllocationRef}
          className="bg-white rounded-xl shadow-sm p-6 mb-6"
        >
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Project Allocation
              </h2>
              <p className="text-sm text-gray-600">
                Click on any project to see which employees are working on it
                and their hours.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {projectsWithTotals.map((project, idx) => (
              <div
                key={idx}
                tabIndex={0}
                role="button"
                onClick={() => showProjectAllocationDetails(project)}
                onKeyDown={(e) =>
                  e.key === "Enter" && showProjectAllocationDetails(project)
                }
                className={`p-6 rounded-xl border-2 ${
                  selectedProjectIdx === idx
                    ? "border-blue-500 shadow-lg"
                    : "bg-gradient-to-br from-blue-50 to-white"
                } hover:-translate-y-1 hover:shadow-lg cursor-pointer transition-all`}
              >
                <div className="text-sm font-semibold text-gray-900 mb-2 truncate">
                  {project.project}
                </div>
                <div className="text-3xl font-bold text-blue-600 mb-1">
                  {project.totalHours}h
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  {project.members.length} member
                  {project.members.length > 1 ? "s" : ""}
                </div>

                <div className="flex -space-x-2">
                  {project.members.slice(0, 3).map((m, i) => {
                    const initials = m.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("");
                    return (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-semibold border-2 border-white"
                      >
                        {initials}
                      </div>
                    );
                  })}
                  {project.members.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-xs font-semibold border-2 border-white">
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3️⃣ SECTION 3: Project-wise Charts (KPI #3) */}
        {/* This section (Project charts) should be robustly wired to projectsWithTotals */}
        <div
          ref={projectBarSectionRef}
          // className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6"
        >
          {/* LEFT: Project-wise Total Hours + Overall stacked bar */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Project-wise Total Hours
            </h2>

            {/* Chart area - same visual height as right side */}
            <div className="flex-1 min-h-[200px]">
              <Bar
                ref={barRef}
                data={totalHoursBarData}
                options={{
                  ...totalHoursBarOptions,
                  layout: {
                    padding: { left: 10, right: 10, top: 12, bottom: 8 },
                  }, // match right side
                }}
                onClick={(evt, elements) => handleBarClick(evt, elements)}
              />
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Click a bar to drill into that project's employee contributions
              and see billable/non-billable below.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6 mb-6">
            {/* RIGHT: Donut + selected-project small card + per-project stacked bar */}
            <div className="bg-white rounded-xl shadow-sm p-6 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    Project Members Contribution
                  </h2>
                </div>
                {/* <div className="text-sm text-gray-600">
                  {selectedProject ? selectedProject.project : ""}
                </div> */}
              </div>

              {/* Chart area (same min height as left) */}
              <div className="flex-1 min-h-[360px] relative">
                {/* small total card top-right — visually matches left side */}
                {selectedProject && (
                  <div className="absolute right-4 top-4 z-20">
                    <div className="p-2 bg-white rounded-lg shadow text-xs text-right">
                      <div className="font-semibold">
                        {selectedProject.project}
                      </div>
                      <div className="text-xs text-gray-600">Total hours</div>
                      <div className="text-sm font-bold text-blue-600">
                        {selectedProjectTotal}h
                      </div>
                    </div>
                  </div>
                )}

                <div className="h-[90%] flex items-center justify-center">
                  <Doughnut
                    data={donutData}
                    options={{
                      ...donutOptions,
                      layout: {
                        padding: { left: 10, right: 10, top: 12, bottom: 0 },
                      }, // match left side
                    }}
                  />
                </div>
              </div>
            </div>
            <div>
              {/* PROJECT-SPECIFIC STACKED BAR */}
              {selectedProject && (
                <div>
                  <div className="flex justify-between items-center mt-8 mb-3">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">
                        Billable vs Non-billable
                      </div>
                      <div className="text-xs text-gray-600">
                        100% normalized for{" "}
                        <span className="font-medium">
                          {selectedProject.project}
                        </span>
                      </div>
                    </div>
                    {/* <div className="text-sm font-semibold text-gray-700">
                      {selectedProject.billableHours || 0}h billable •{" "}
                      {Math.max(
                        0,
                        (selectedProject.totalHours || 0) -
                          (selectedProject.billableHours || 0)
                      ).toFixed(1)}
                      h non-billable
                    </div> */}
                  </div>
                  <div className="flex flex-col text-center mt-10">
                    <div className="text-lg font-semibold text-gray-900 mb-2 truncate">
                      Total Billable Hours :{" "}
                      <span className="text-xl font-bold text-blue-600 mb-1">
                        {selectedProject.billableHours || 0}h
                      </span>
                    </div>
                    <div className="text-lg font-semibold text-gray-900 mb-2 truncate">
                      Total Non-Billable Hours :{" "}
                      <span className="text-xl font-bold text-blue-600 mb-1">
                        {Math.max(
                          0,
                          (selectedProject.totalHours || 0) -
                            (selectedProject.billableHours || 0),
                        ).toFixed(1)}
                        h
                      </span>
                    </div>
                  </div>

                  <div className="min-h-[120px] h-32 mt-10">
                    <Bar
                      data={projectStackedDataForFullWidth}
                      options={projectStackedOptionsForFullWidth}
                      onClick={handleProjectStackClick}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 4️⃣ SECTION 4: Employee Monthly Overview (KPI #4) */}
        {/* This section will only render if apiData.userEntriesSummary is populated */}
        {employeeMonthlyData && employeeMonthlyData.length > 0 ? (
          (console.log("Employee Monthly Data:", employeeMonthlyData),
          (
            <div
              ref={employeeOverviewRef}
              className="bg-white rounded-xl shadow-sm p-6 mb-6"
            >
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Employee Monthly Overview
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Click on any employee to view their weekly timesheet breakdown
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {employeeMonthlyData.map((employee, idx) => (
                  <div
                    key={idx}
                    onClick={() => showEmployeeTimesheet(employee)}
                    onKeyPress={(e) =>
                      e.key === "Enter" && showEmployeeTimesheet(employee)
                    }
                    tabIndex={0}
                    className={`p-6 rounded-xl text-center cursor-pointer transition-all hover:-translate-y-1 hover:shadow-lg border-2 ${getTileClass(
                      employee.totalHours,
                    )}`}
                  >
                    <div className="text-sm font-semibold text-gray-900 mb-2">
                      {employee.userName} {/* Assuming API provides 'name' */}
                    </div>
                    {/* <div
                    className={`text-3xl font-bold mb-1 ${getTileHoursColor(
                      employee.totalHours
                    )}`}
                  >
                    {employee.totalHours}h
                  </div> */}
                    <div className="text-xs text-gray-600">
                      Click to View Monthly
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div
            ref={employeeOverviewRef}
            className="bg-white rounded-xl shadow-sm p-6 mb-6"
          >
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Employee Monthly Overview
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Detailed employee-level monthly data is not available in this
              report summary.
            </p>
          </div>
        )}

        {/* Team Insights */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Team Insights
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Pending Timesheets */}
            <div className="p-5 rounded-lg bg-yellow-50 border border-yellow-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">⏱️</span>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Pending Timesheets
                  </h3>
                </div>
                <div className="mb-3">
                  <div className="text-3xl font-bold text-yellow-600 mb-1">
                    {state.pendingTimesheets.length}
                  </div>
                  <div className="text-sm text-gray-600">
                    Awaiting submission
                  </div>
                </div>
              </div>
              <button
                onClick={showPendingUsers}
                className="mt-4 w-full bg-yellow-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                View Users
              </button>
            </div>

            {/* Underutilized */}
            <div className="p-5 rounded-lg bg-orange-50 border border-orange-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📉</span>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Underutilized
                  </h3>
                </div>
                <div
                  className={`mb-3 ${underutilized.length > 5 ? "h-24 overflow-y-auto" : ""}`}
                >
                  {underutilized.length > 0 ? (
                    <ul className="text-sm text-gray-700 space-y-1">
                      {underutilized.map((u, idx) => (
                        <li key={idx}>• {u.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">None identified</p>
                  )}
                </div>
              </div>
              <button
                onClick={showUnderutilizedUsers}
                className="mt-4 w-full bg-orange-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-orange-700 transition-colors"
              >
                View All
              </button>
            </div>

            {/* Overworked */}
            <div className="p-5 rounded-lg bg-red-50 border border-red-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">📈</span>
                  <h3 className="text-sm font-semibold text-gray-900">
                    Overworked
                  </h3>
                </div>
                <div
                  className={`mb-3 ${overworked.length > 5 ? "h-24 overflow-y-auto" : ""}`}
                >
                  {overworked.length > 0 ? (
                    <ul className="text-sm text-gray-700 space-y-1">
                      {overworked.map((o, idx) => (
                        <li key={idx}>• {o.name}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-600">None identified</p>
                  )}
                </div>
              </div>
              <button
                onClick={showOverworkedUsers}
                className="mt-4 w-full bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
              >
                View All
              </button>
            </div>

            {/* Key Actions */}
            <div className="p-5 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">💡</span>
                <h3 className="text-sm font-semibold text-gray-900">
                  Key Actions
                </h3>
              </div>
              <ul className="text-sm text-gray-700 space-y-2">
                {underutilized.length > 0 && (
                  <li>
                    • Review capacity for {underutilized.length} member(s)
                  </li>
                )}
                {overworked.length > 0 && (
                  <li>
                    • Redistribute workload for {overworked.length} member(s)
                  </li>
                )}
                {state.pendingTimesheets.length > 0 && (
                  <li>
                    • Follow up on {state.pendingTimesheets.length} missing
                    timesheet(s)
                  </li>
                )}
                {underutilized.length === 0 &&
                  overworked.length === 0 &&
                  state.pendingTimesheets.length === 0 && (
                    <li>
                      • Team capacity is well-balanced — continue monitoring
                      trends
                    </li>
                  )}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        {/* <footer className="bg-gray-100 rounded-xl p-6 text-center">
          <p className="text-xs text-gray-600">
            <strong className="text-gray-900">
              Manager Dashboard — Team View
            </strong>{" "}
            • Generated on {new Date().toLocaleString()}
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Confidential • For internal management use only
          </p>
        </footer> */}
        <footer>
          <div className="notes-card">
            <h4>Report Notes</h4>
            <ul>
              <li>
                <strong>Billable Hours:</strong> Total hours spent by team
                members on tasks classified as billable across all assigned
                projects.
              </li>
              <li>
                <strong>Non-Billable Hours:</strong> Total hours logged on tasks
                marked as non-billable across all projects.
              </li>
              <li>
                <strong>Total Hours:</strong> Sum of Billable Hours +
                Non-Billable Hours.
              </li>
              <li>
                <strong>Billable Utilization (%):</strong> (Billable Hours ÷
                Total Hours) × 100.
              </li>
              <li>
                <strong>Minimum Monthly Hours Requirement:</strong> 176 hours
                per employee (22 working days × 8 hours/day).
              </li>
              <li>
                <strong>Active Projects:</strong> Count of all projects that had
                at least one time entry in the selected month.
              </li>
              <li>
                <strong>Project Allocation Hours:</strong> Total number of hours
                contributed to each project by all assigned team members.
              </li>
              <li>
                <strong>Daily Contribution:</strong> Distribution of total hours
                logged by the team for each day of the selected month.
              </li>
              <li>
                <strong>Billable vs Non-Billable (Overall):</strong> Normalized
                ratio showing how the team's total hours split across billable
                and non-billable work.
              </li>
              <li>
                <strong>Underutilized Employees:</strong> Team members whose
                logged hours are below the expected minimum monthly threshold.
              </li>
              <li>
                <strong>Overworked Employees:</strong> Team members whose hours
                exceed acceptable capacity (e.g., &gt; 176 hours/month).
              </li>
              <li>
                <strong>Pending Timesheets:</strong> Number of employees who
                have not submitted timesheets for last 15 days within the
                selected month.
              </li>
              <li>
                <strong>Billing Data Accuracy:</strong> Hours in this report are
                based on submitted timesheets only;
              </li>
              <li>
                <strong>Average Billable Percentage:</strong> Average of the
                billable percentage values of all projects for the selected
                month.
              </li>
            </ul>
          </div>
        </footer>
      </div>

      {/* Employee Timesheet Modal (richer per-day layout) */}
      {/* This modal will only open if employeeMonthlyData (userEntriesSummary) is populated */}
      {selectedEmployee &&
        // ... (The entire modal structure remains unchanged) ...
        // (Self-closing IIFE and StatusBadge helper)
        (() => {
          const read = (entry, key, fallback = "—") => {
            if (!entry) return fallback;
            const v = entry[key];
            if (v === undefined || v === null || v === "") return fallback;
            return v;
          };

          const StatusBadge = ({ status, approvers }) => (
            <div className="flex items-center gap-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  status.toLowerCase() === "submitted"
                    ? "bg-yellow-100 text-yellow-800"
                    : status.toLowerCase() === "approved"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                }`}
              >
                {status || "Draft"}
              </span>
              {typeof approvers === "number" && (
                <span className="text-xs text-gray-500 px-2 py-1 rounded border">
                  {" "}
                  {approvers} approver{approvers > 1 ? "s" : ""}{" "}
                </span>
              )}
            </div>
          );

          return (
            <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={() => closeEmployeeTimesheet()}
            >
              <div
                className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-6 border-b border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center sticky top-0 bg-white z-30">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      {selectedEmployee.userName} - Monthly Timesheet
                    </h3>
                  </div>
                  <div className="flex items-center gap-3 mt-4 md:mt-0">
                    <button
                      onClick={() => closeEmployeeTimesheet()}
                      className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-2xl transition-colors"
                      aria-label="Close timesheet"
                    >
                      ×
                    </button>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* summary top cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">Total Hours</div>
                      <div className="text-2xl font-bold text-gray-900">
                        {selectedEmployee.totalHours}h
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">Billable</div>
                      <div className="text-2xl font-bold text-green-600">
                        {selectedEmployee.billableHours}h
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-600">Non-Billable</div>
                      <div className="text-2xl font-bold text-gray-700">
                        {selectedEmployee.nonBillableHours}h
                      </div>
                    </div>
                  </div>

                  {/* weeklyBreakdown => render each week with per-day cards */}
                  {selectedEmployee.weeklySummary &&
                    selectedEmployee.weeklySummary.map((week, wIdx) => {
                      // 1. FLATTEN DATA: Collect all entries from all timesheets in this week
                      const allWeekEntries = (week.timesheets || []).flatMap(
                        (ts) =>
                          (ts.entries || []).map((entry) => ({
                            ...entry,
                            // Hoist parent timesheet data into the entry for easy access
                            workDate: ts.workDate,
                            status: ts.status,
                            isHoliday: ts.isHolidayTimesheet,
                          })),
                      );

                      return (
                        <div
                          key={wIdx}
                          className="p-4 bg-white rounded-xl shadow-sm border"
                        >
                          {/* Week Header */}
                          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-3">
                            <div>
                              <div className="text-lg font-semibold text-blue-900">
                                Week {week.weekId}{" "}
                                <span className="text-sm font-semibold text-black">
                                  ({week.startDate} to {week.endDate})
                                </span>
                              </div>
                              <div className="text-sm text-gray-500">
                                Week total:{" "}
                                <span className="font-semibold text-gray-700">
                                  {week.totalHours}h
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-sm text-gray-500">
                                Entries:{" "}
                                <span className="font-semibold">
                                  {allWeekEntries.length}
                                </span>
                              </div>
                              {/* Weekly Status Badge */}
                              <span
                                className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                  week.weeklyStatus === "APPROVED"
                                    ? "bg-green-100 text-green-800"
                                    : week.weeklyStatus === "REJECTED"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-yellow-100 text-yellow-800"
                                }
                                `}
                              >
                                {week.weeklyStatus}
                              </span>
                            </div>
                          </div>

                          {/* Per-entry list */}
                          <div className="space-y-4">
                            {allWeekEntries.length > 0 ? (
                              allWeekEntries.map((entry, eIdx) => {
                                // 2. MAP DATA: Use the specific keys from your API response

                                // Format Date: "2025-11-10"
                                const dateLabel =
                                  entry.workDate || `Day ${eIdx + 1}`;

                                // Note: API gives IDs (projectId: 12).
                                // Ideally, you need a lookup function here to show names.
                                // For now, showing ID or basic text.
                                const project = getProjectName(entry.projectId);
                                const task = getTaskName(entry.taskId);

                                // Format Time: Extract HH:MM from "2025-11-10T04:30:00"
                                const formatTime = (isoString) =>
                                  isoString
                                    ? isoString.split("T")[1].substring(0, 5)
                                    : "-";
                                const start = formatTime(entry.fromTime);
                                const end = formatTime(entry.toTime);

                                const workLocation =
                                  entry.workLocation || "Office";
                                const description = entry.description || "";
                                const billable = entry.isBillable
                                  ? "Yes"
                                  : "No";
                                const status = entry.status || "Submitted";
                                const hours = entry.hoursWorked || 0;

                                return (
                                  <div
                                    key={eIdx}
                                    className="bg-gray-50 rounded-lg p-3 border-l-4 border-blue-600"
                                  >
                                    <div className="flex justify-between items-center mb-3">
                                      <div>
                                        <div className="text-sm font-semibold text-gray-900">
                                          {dateLabel}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                          {project} — {task}
                                        </div>
                                      </div>

                                      <div className="flex items-center gap-4">
                                        <div className="text-sm font-bold text-blue-600">
                                          {hours}h
                                        </div>
                                        <StatusBadge
                                          status={status}
                                          // approvers={1} // API doesn't seem to send approver count in entry, defaulting to 1
                                        />
                                      </div>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-sm text-gray-700">
                                      <div className="md:col-span-3">
                                        <div className="text-xs text-gray-500">
                                          Project
                                        </div>
                                        <div className="font-medium">
                                          {project}
                                        </div>
                                      </div>

                                      <div className="md:col-span-2">
                                        <div className="text-xs text-gray-500">
                                          Task
                                        </div>
                                        <div>{task}</div>
                                      </div>

                                      <div className="md:col-span-2">
                                        <div className="text-xs text-gray-500">
                                          Start
                                        </div>
                                        <div>{start}</div>
                                      </div>

                                      <div className="md:col-span-2">
                                        <div className="text-xs text-gray-500">
                                          End
                                        </div>
                                        <div>{end}</div>
                                      </div>

                                      <div className="md:col-span-2">
                                        <div className="text-xs text-gray-500">
                                          Work Location
                                        </div>
                                        <div>{workLocation}</div>
                                      </div>

                                      <div className="md:col-span-1 text-right">
                                        <div className="text-xs text-gray-500">
                                          Billable
                                        </div>
                                        <div>{billable}</div>
                                      </div>

                                      {/* Description Row */}
                                      {description && (
                                        <div className="md:col-span-12 mt-3 text-xs text-gray-600 bg-white p-3 rounded border">
                                          <span className="font-semibold">
                                            Description:{" "}
                                          </span>{" "}
                                          {description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="text-center py-4 text-gray-500 text-sm italic">
                                No entries logged for this week.
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {/* close button */}
                  <div className="flex justify-end">
                    <button
                      onClick={closeEmployeeTimesheet}
                      className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

      {/* User List Modal */}
      {userListModal.isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => closeUserList()}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-8 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-2xl font-bold text-gray-900">
                {userListModal.title}
              </h3>
              <button
                onClick={() => closeUserList()}
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-600 text-2xl transition-colors"
              >
                ×
              </button>
            </div>
            <div className="p-8">
              <div className="space-y-3">
                {userListModal.users.map((user, idx) => {
                  const initials = user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("");
                  return (
                    <div
                      key={idx}
                      className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {initials}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">
                            {user.name}
                          </div>
                          <div className="text-xs text-gray-600">
                            {user.meta}
                          </div>
                        </div>
                      </div>
                      {user.hours !== null && (
                        <div className="text-base font-bold text-blue-600">
                          {user.hours}h
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Breakdown Modal (REMOVED - No longer used) */}
    </div>
  );
};

export default ManagerMonthlyReport;
