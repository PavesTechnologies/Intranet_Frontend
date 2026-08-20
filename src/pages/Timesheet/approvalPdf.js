// Shared PDF export for the three approval views (Manager, Reporting Manager,
// Admin). All three render the same document — only the role label, the file
// name and the rows differ — so the layout lives here once instead of being
// copy-pasted three times.
//
// Layout, top to bottom:
//   • brand banner (title, role/scope line, generated-on stamp, logo)
//   • KPI strip (employees, weeks, total hours, billable hours)
//   • one section per employee → one sub-header + table per week
//   • footer with page numbers on every page
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { showStatusToast } from "../../components/toastfy/toast";

// ---- palette (matches the app's #263383 brand) ---------------------------
const BRAND = [38, 51, 131];
const BRAND_SOFT = [244, 246, 252];
const INK = [31, 41, 55];
const MUTED = [107, 114, 128];
const LINE = [226, 232, 240];
const ZEBRA = [249, 250, 252];
const GREEN = [21, 128, 61];
const RED = [185, 28, 28];
const AMBER = [180, 118, 12];

// ---- page geometry (A4 landscape, mm) ------------------------------------
const MARGIN = 12;
const BANNER_H = 26;
const RUNNING_H = 14; // slim header repeated on continuation pages
const FOOTER_H = 12;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// ---- value formatting ----------------------------------------------------
const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const fmtHours = (value) => toNumber(value).toFixed(2);

const parseDate = (value) => {
  if (!value) return null;
  const date = new Date(String(value).length <= 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** "12 Aug 2025" — spelled out so the output never shifts with the viewer's locale. */
const fmtDate = (value) => {
  const date = parseDate(value);
  return date ? `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}` : "-";
};

/** "12 Aug – 18 Aug 2025", with the year printed once when both ends share it. */
const fmtRange = (from, to) => {
  const start = parseDate(from);
  const end = parseDate(to);
  if (!start || !end) return "-";
  const left = `${start.getDate()} ${MONTHS[start.getMonth()]}`;
  const right = `${end.getDate()} ${MONTHS[end.getMonth()]} ${end.getFullYear()}`;
  return start.getFullYear() === end.getFullYear()
    ? `${left} - ${right}`
    : `${left} ${start.getFullYear()} - ${right}`;
};

/**
 * Backend times arrive as UTC datetimes (sometimes without the trailing Z) and
 * sometimes as a bare HH:mm:ss — the same reading EntriesTable applies, so the
 * PDF shows exactly the times the approver saw on screen.
 */
const prettyTime = (value) => {
  if (!value) return "-";
  try {
    if (/^\d{2}:\d{2}/.test(value)) {
      const [h, m] = String(value).split(":");
      const local = new Date();
      local.setHours(Number(h), Number(m), 0, 0);
      return local.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
    }
    const date = new Date(String(value).endsWith("Z") ? value : `${value}Z`);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
  } catch {
    return "-";
  }
};

/** "PARTIALLY_APPROVED" → "Partially Approved". */
const statusLabel = (value) =>
  String(value || "-")
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

const statusColor = (value) => {
  const s = String(value || "").toUpperCase().replace(/\s+/g, "_");
  if (s === "APPROVED" || s === "PARTIALLY_APPROVED") return GREEN;
  if (s === "REJECTED") return RED;
  if (s === "SUBMITTED" || s === "DRAFT") return AMBER;
  return MUTED;
};

// `billable` comes back as a boolean from some endpoints and "Yes" from others.
const isBillable = (entry) => entry?.billable === true || entry?.billable === "Yes";

// ---- data shaping --------------------------------------------------------
/**
 * Flatten the nested approval payload into what the document needs, keeping the
 * per-week and per-employee totals the header lines print.
 */
const buildModel = (users = []) => {
  let weekCount = 0;
  let totalHours = 0;
  let billableHours = 0;

  const employees = users
    .map((user) => {
      let userHours = 0;
      let userBillable = 0;

      const weeks = (user.weeklySummary || [])
        .map((week) => {
          let weekHours = 0;
          let weekBillable = 0;
          const rows = [];

          (week.timesheets || []).forEach((sheet) => {
            (sheet.entries || []).forEach((entry) => {
              const hours = toNumber(entry.hoursWorked);
              weekHours += hours;
              if (isBillable(entry)) weekBillable += hours;

              rows.push([
                fmtDate(sheet.workDate),
                entry.projectName || `Project-${entry.projectId ?? "-"}`,
                entry.taskName || `Task-${entry.taskId ?? "-"}`,
                prettyTime(entry.fromTime),
                prettyTime(entry.toTime),
                entry.workLocation || entry.workType || "-",
                entry.description || entry.otherDescription || "-",
                isBillable(entry) ? "Yes" : "No",
                fmtHours(hours),
                statusLabel(sheet.status),
              ]);
            });
          });

          if (rows.length === 0) return null;

          userHours += weekHours;
          userBillable += weekBillable;

          return {
            label: `Week ${week.weekId ?? "-"}`,
            range: fmtRange(week.startDate, week.endDate),
            status: statusLabel(week.weeklyStatus),
            statusRaw: week.weeklyStatus,
            hours: weekHours,
            billable: weekBillable,
            rows,
          };
        })
        .filter(Boolean);

      if (weeks.length === 0) return null;

      weekCount += weeks.length;
      totalHours += userHours;
      billableHours += userBillable;

      return {
        userId: user.userId,
        userName: user.userName || `User ${user.userId ?? "-"}`,
        hours: userHours,
        billable: userBillable,
        weeks,
      };
    })
    .filter(Boolean);

  return { employees, weekCount, totalHours, billableHours };
};

// ---- page chrome ---------------------------------------------------------
/** The public logo, as a data URI. Optional — the banner works without it. */
const loadLogo = async () => {
  try {
    const response = await fetch("/logo.png");
    if (!response.ok) return null;
    const blob = await response.blob();
    return await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};

const drawLogoChip = (doc, logo, x, y, size) => {
  if (!logo) return;
  // The logo is transparent artwork, so it needs a light chip to sit on before
  // it can go over the dark banner.
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(x, y, size, size, 1.6, 1.6, "F");
  try {
    const inner = size - 3;
    doc.addImage(logo, "PNG", x + 1.5, y + 1.5 + (inner - inner / 1.125) / 2, inner, inner / 1.125);
  } catch {
    /* a broken image must never take the whole export down */
  }
};

const drawBanner = (doc, state) => {
  const { pageWidth } = state;

  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, BANNER_H, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(state.title, MARGIN, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(206, 213, 235);
  doc.text(state.subtitle, MARGIN, 18.5);

  const chip = 14;
  const stampX = pageWidth - MARGIN - chip - 4;
  doc.setFontSize(8);
  doc.text(`Generated ${state.generatedAt}`, stampX, 15.5, { align: "right" });
  drawLogoChip(doc, state.logo, pageWidth - MARGIN - chip, (BANNER_H - chip) / 2, chip);

  state.chromePainted.add(1);
};

/** Continuation pages get a slim rule + title instead of the full banner. */
const drawRunningHeader = (doc, state, pageNumber) => {
  if (state.chromePainted.has(pageNumber)) return;

  doc.setFillColor(...BRAND_SOFT);
  doc.rect(0, 0, state.pageWidth, RUNNING_H, "F");
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(0, RUNNING_H, state.pageWidth, RUNNING_H);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND);
  doc.text(state.title, MARGIN, 9);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...MUTED);
  doc.setFontSize(8);
  doc.text(state.subtitle, state.pageWidth - MARGIN, 9, { align: "right" });

  state.chromePainted.add(pageNumber);
};

const drawFooters = (doc, state) => {
  const total = doc.getNumberOfPages();
  for (let page = 1; page <= total; page += 1) {
    doc.setPage(page);
    const y = state.pageHeight - FOOTER_H + 5;

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y - 3.5, state.pageWidth - MARGIN, y - 3.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(state.footerNote, MARGIN, y);
    doc.text(`Page ${page} of ${total}`, state.pageWidth - MARGIN, y, { align: "right" });
  }
};

/** Move to a fresh page when `needed` mm no longer fit above the footer. */
const ensureSpace = (doc, state, needed) => {
  if (state.cursorY + needed <= state.pageHeight - FOOTER_H) return;
  doc.addPage();
  drawRunningHeader(doc, state, doc.getCurrentPageInfo().pageNumber);
  state.cursorY = RUNNING_H + 8;
};

// ---- document sections ---------------------------------------------------
const drawKpiStrip = (doc, state, model) => {
  const cards = [
    ["Employees", String(model.employees.length)],
    ["Weeks", String(model.weekCount)],
    ["Total Hours", fmtHours(model.totalHours)],
    ["Billable Hours", fmtHours(model.billableHours)],
  ];

  const gap = 4;
  const usable = state.pageWidth - MARGIN * 2;
  const width = (usable - gap * (cards.length - 1)) / cards.length;
  const height = 16;

  cards.forEach(([label, value], index) => {
    const x = MARGIN + index * (width + gap);

    doc.setFillColor(...BRAND_SOFT);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, state.cursorY, width, height, 1.6, 1.6, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...MUTED);
    doc.text(label.toUpperCase(), x + 4, state.cursorY + 6);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...BRAND);
    doc.text(value, x + 4, state.cursorY + 13);
  });

  state.cursorY += height + 8;
};

const drawEmployeeHeader = (doc, state, employee) => {
  const height = 9;
  const width = state.pageWidth - MARGIN * 2;

  ensureSpace(doc, state, height + 30); // keep the header with its first week

  doc.setFillColor(...BRAND_SOFT);
  doc.roundedRect(MARGIN, state.cursorY, width, height, 1.4, 1.4, "F");
  doc.setFillColor(...BRAND);
  doc.rect(MARGIN, state.cursorY, 1.6, height, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...INK);
  doc.text(employee.userName, MARGIN + 5, state.cursorY + 6);

  const nameWidth = doc.getTextWidth(employee.userName);
  if (employee.userId != null) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text(`ID ${employee.userId}`, MARGIN + 8 + nameWidth, state.cursorY + 6);
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...BRAND);
  doc.text(
    `${fmtHours(employee.hours)} h total  |  ${fmtHours(employee.billable)} h billable`,
    state.pageWidth - MARGIN - 4,
    state.cursorY + 6,
    { align: "right" },
  );

  state.cursorY += height + 3;
};

const ENTRY_HEAD = [
  "Date",
  "Project",
  "Task",
  "Start",
  "End",
  "Location",
  "Description",
  "Billable",
  "Hours",
  "Status",
];

/**
 * The week's identity is the table's first head row rather than free-standing
 * text, so it repeats on every continuation page and can never be orphaned at
 * the foot of a page away from its own rows.
 */
const weekTitleRow = (week) => [
  {
    content: `${week.label}    ${week.range}`,
    colSpan: 8,
    styles: {
      halign: "left",
      fillColor: BRAND_SOFT,
      textColor: INK,
      fontSize: 8.5,
      lineColor: LINE,
    },
  },
  {
    content: week.status,
    colSpan: 2,
    styles: {
      halign: "right",
      fillColor: BRAND_SOFT,
      textColor: statusColor(week.statusRaw),
      fontSize: 8.5,
      lineColor: LINE,
    },
  },
];

const drawWeekTable = (doc, state, week) => {
  autoTable(doc, {
    head: [weekTitleRow(week), ENTRY_HEAD],
    body: week.rows,
    foot: [
      [
        { content: "Week total", colSpan: 8, styles: { halign: "right" } },
        fmtHours(week.hours),
        "",
      ],
    ],
    startY: state.cursorY,
    margin: { top: RUNNING_H + 8, left: MARGIN, right: MARGIN, bottom: FOOTER_H + 4 },
    theme: "grid",
    rowPageBreak: "avoid",
    // the head (week title + columns) repeats on every page; the total must not
    showHead: "everyPage",
    showFoot: "lastPage",
    tableLineColor: LINE,
    tableLineWidth: 0.1,
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: { top: 1.8, right: 2, bottom: 1.8, left: 2 },
      textColor: INK,
      lineColor: LINE,
      lineWidth: 0.1,
      overflow: "linebreak",
      valign: "middle",
    },
    headStyles: {
      fillColor: BRAND,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 7.5,
      lineColor: BRAND,
    },
    footStyles: {
      fillColor: BRAND_SOFT,
      textColor: BRAND,
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: ZEBRA },
    // Description is deliberately left without a width so it absorbs whatever
    // the fixed columns leave over — the table then fills the page exactly.
    columnStyles: {
      0: { cellWidth: 22 },
      1: { cellWidth: 36 },
      2: { cellWidth: 38 },
      3: { cellWidth: 17, halign: "center" },
      4: { cellWidth: 17, halign: "center" },
      5: { cellWidth: 24 },
      7: { cellWidth: 16, halign: "center" },
      8: { cellWidth: 15, halign: "right" },
      9: { cellWidth: 26, halign: "center", fontStyle: "bold" },
    },
    didParseCell: (data) => {
      if (data.section !== "body") return;
      if (data.column.index === 9) data.cell.styles.textColor = statusColor(data.cell.raw);
      if (data.column.index === 7) {
        data.cell.styles.textColor = data.cell.raw === "Yes" ? GREEN : MUTED;
      }
    },
    didDrawPage: () => {
      // Pages autoTable created for itself still need the running header.
      drawRunningHeader(doc, state, doc.getCurrentPageInfo().pageNumber);
    },
  });

  state.cursorY = doc.lastAutoTable.finalY + 7;
};

// ---- entry point ---------------------------------------------------------
/**
 * Render and download the approval report.
 *
 * @param {Object}   options
 * @param {string}   options.roleLabel  e.g. "Manager View" — the only visible
 *                                      difference between the three exports.
 * @param {Array}    options.users      the view's already-filtered rows
 *                                      (`enrichedGroupedData`).
 * @param {string}   options.fileSlug   file-name prefix, e.g. "manager".
 */
export const exportApprovalPdf = async ({ roleLabel, users = [], fileSlug = "timesheet" }) => {
  const model = buildModel(users);

  if (model.employees.length === 0) {
    showStatusToast("Nothing to export — no timesheet entries in the current view.", "error");
    return false;
  }

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const now = new Date();

  const state = {
    pageWidth: doc.internal.pageSize.getWidth(),
    pageHeight: doc.internal.pageSize.getHeight(),
    cursorY: BANNER_H + 8,
    title: "Timesheet Approval Report",
    subtitle: `${roleLabel}  |  ${model.employees.length} employee${
      model.employees.length === 1 ? "" : "s"
    }  |  ${model.weekCount} week${model.weekCount === 1 ? "" : "s"}`,
    generatedAt: `${fmtDate(now)}, ${now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })}`,
    footerNote: `Paves Technologies  |  Timesheet Approvals  |  ${roleLabel}`,
    logo: await loadLogo(),
    chromePainted: new Set(),
  };

  doc.setProperties({
    title: `${state.title} - ${roleLabel}`,
    subject: "Timesheet approvals",
    creator: "Paves Enterprise App",
  });

  drawBanner(doc, state);
  drawKpiStrip(doc, state, model);

  model.employees.forEach((employee) => {
    drawEmployeeHeader(doc, state, employee);
    employee.weeks.forEach((week) => {
      drawWeekTable(doc, state, week);
    });
    state.cursorY += 2;
  });

  drawFooters(doc, state);

  const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
  doc.save(`${fileSlug}-timesheet-approvals-${stamp}.pdf`);
  return true;
};

export default exportApprovalPdf;
