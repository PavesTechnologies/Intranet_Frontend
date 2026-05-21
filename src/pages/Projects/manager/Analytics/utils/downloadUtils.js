// ─── Trigger helpers ────────────────────────────────────────────────────────

function triggerDownload(url, filename) {
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
}

// ─── Scope-change rendering helpers ─────────────────────────────────────────

const CHANGE_TYPE_LABELS = {
  ADDED_TO_SPRINT:        "Added to sprint",
  REMOVED_FROM_SPRINT:    "Removed from sprint",
  STORY_POINTS_CHANGED:   "Points changed",
  STATUS_CHANGED_TO_DONE: "Marked as done",
  STATUS_REOPENED:        "Reopened",
};

function fmtDate(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const day   = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year  = d.getFullYear();
  const time  = d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
  return `${day}/${month}/${year} ${time}`;
}

function getDetail(sc) {
  switch (sc.changeType) {
    case "ADDED_TO_SPRINT":        return "Added to sprint";
    case "REMOVED_FROM_SPRINT":    return "Removed from sprint";
    case "STORY_POINTS_CHANGED":   return `Points: ${sc.oldStoryPoints ?? "?"} → ${sc.newStoryPoints ?? "?"}`;
    case "STATUS_CHANGED_TO_DONE": return "Marked as done";
    case "STATUS_REOPENED":        return "Reopened";
    default:                       return sc.changeType ?? "—";
  }
}

function scopeRow(sc) {
  return {
    date:      fmtDate(sc.changedAt ?? sc.date),
    issue:     sc.issueTitle ?? "—",
    eventType: CHANGE_TYPE_LABELS[sc.changeType] ?? sc.changeType ?? "—",
    detail:    getDetail(sc),
    inc:       sc.pointsDelta > 0  ? String(sc.pointsDelta)           : "—",
    dec:       sc.pointsDelta < 0  ? String(Math.abs(sc.pointsDelta)) : "—",
    pts:       sc.newStoryPoints != null ? String(sc.newStoryPoints)  : "—",
  };
}

// ─── Combined canvas (chart + scope changes table) ───────────────────────────

const OUT_W      = 1200;   // fixed output width in px
const PAD        = 24;
const GAP        = 28;     // gap between chart and table
const TITLE_H    = 34;
const HDR_H      = 34;
const ROW_H      = 28;
const FS_TITLE   = 15;
const FS_HDR     = 11;
const FS_DATA    = 12;

// column definitions: label, fixedWidth (0 = fill remaining)
const COLS = [
  { key: "date",      label: "Date",         fw: 195 },
  { key: "issue",     label: "Issue",        fw: 120 },
  { key: "eventType", label: "Event Type",   fw: 155 },
  { key: "detail",    label: "Event Detail", fw: 0   },  // fills rest
  { key: "inc",       label: "Inc.",         fw: 55  },
  { key: "dec",       label: "Dec.",         fw: 55  },
  { key: "pts",       label: "Story Pts",    fw: 80  },
];
const FIXED_W = COLS.reduce((s, c) => s + c.fw, 0);  // 660

function buildColLayout(canvasW) {
  const usable   = canvasW - 2 * PAD;
  const detailW  = Math.max(80, usable - FIXED_W);
  return COLS.map((c) => ({ ...c, w: c.fw === 0 ? detailW : c.fw }));
}

function truncate(ctx, text, maxW) {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t + "…";
}

function createCombinedCanvas(chartCanvas, scopeChanges) {
  const scope   = scopeChanges ?? [];
  const chartH  = Math.round(OUT_W * chartCanvas.height / chartCanvas.width);
  const tableH  = scope.length > 0
    ? TITLE_H + HDR_H + scope.length * ROW_H + PAD
    : 0;
  const totalH  = PAD + chartH + (tableH > 0 ? GAP + tableH : 0) + PAD;

  const off = document.createElement("canvas");
  off.width  = OUT_W;
  off.height = totalH;
  const ctx  = off.getContext("2d");

  // white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUT_W, totalH);

  // chart image
  ctx.drawImage(chartCanvas, 0, PAD, OUT_W, chartH);

  if (scope.length === 0) return off;

  const cols = buildColLayout(OUT_W);
  // compute x positions
  const xs = [];
  let xc = PAD;
  cols.forEach((c) => { xs.push(xc); xc += c.w; });

  let y = PAD + chartH + GAP;

  // section title
  ctx.fillStyle = "#1e293b";
  ctx.font      = `bold ${FS_TITLE}px system-ui,sans-serif`;
  ctx.fillText("Scope Changes", PAD, y + FS_TITLE);
  y += TITLE_H;

  // header row
  ctx.fillStyle = "#f1f5f9";
  ctx.fillRect(0, y, OUT_W, HDR_H);
  ctx.strokeStyle = "#e2e8f0";
  ctx.lineWidth   = 1;
  [y, y + HDR_H].forEach((ly) => {
    ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(OUT_W, ly); ctx.stroke();
  });
  ctx.font      = `bold ${FS_HDR}px system-ui,sans-serif`;
  ctx.fillStyle = "#64748b";
  cols.forEach((c, i) => ctx.fillText(c.label.toUpperCase(), xs[i] + 4, y + HDR_H / 2 + 4));
  y += HDR_H;

  // data rows
  const CELL_COLORS = {
    date:      () => "#94a3b8",
    issue:     () => "#4f46e5",
    eventType: () => "#374151",
    detail:    () => "#64748b",
    inc:       (v) => v !== "—" ? "#16a34a" : "#94a3b8",
    dec:       (v) => v !== "—" ? "#dc2626" : "#94a3b8",
    pts:       () => "#334155",
  };

  ctx.font = `${FS_DATA}px system-ui,sans-serif`;
  scope.forEach((sc, ri) => {
    ctx.fillStyle = ri % 2 === 0 ? "#f8fafc" : "#ffffff";
    ctx.fillRect(0, y, OUT_W, ROW_H);
    ctx.strokeStyle = "#f1f5f9";
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(0, y + ROW_H); ctx.lineTo(OUT_W, y + ROW_H); ctx.stroke();

    const row = scopeRow(sc);
    cols.forEach((c, i) => {
      const val   = row[c.key] ?? "—";
      const color = CELL_COLORS[c.key](val);
      ctx.fillStyle = color;
      ctx.fillText(truncate(ctx, val, c.w - 8), xs[i] + 4, y + ROW_H / 2 + 4);
    });
    y += ROW_H;
  });

  return off;
}

// ─── Public download functions ────────────────────────────────────────────────

export async function downloadChartAsPNG(canvasRef, filename) {
  if (!canvasRef?.current) return;
  const url = canvasRef.current.toDataURL("image/png");
  triggerDownload(url, `${filename}.png`);
}

export async function downloadChartAsPDF(canvasRef, filename) {
  if (!canvasRef?.current) return;
  try {
    const { default: jsPDF } = await import("jspdf");
    const canvas  = canvasRef.current;
    const imgData = canvas.toDataURL("image/png");
    const pdf     = new jsPDF({ orientation: "landscape", unit: "px", format: [canvas.width, canvas.height] });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
    pdf.save(`${filename}.pdf`);
  } catch {
    console.error("jsPDF not installed. Run: npm install jspdf");
  }
}

/** PNG: chart + scope changes table combined into one image */
export async function downloadChartWithScopeAsPNG(chartCanvas, scopeChanges, filename) {
  if (!chartCanvas) return;
  const combined = createCombinedCanvas(chartCanvas, scopeChanges ?? []);
  triggerDownload(combined.toDataURL("image/png"), `${filename}.png`);
}

/** PDF: chart + scope changes table combined on one page */
export async function downloadChartWithScopeAsPDF(chartCanvas, scopeChanges, filename) {
  if (!chartCanvas) return;
  try {
    const { default: jsPDF } = await import("jspdf");
    const combined = createCombinedCanvas(chartCanvas, scopeChanges ?? []);
    const imgData  = combined.toDataURL("image/png");
    const W = combined.width;
    const H = combined.height;
    const pdf = new jsPDF({ orientation: W >= H ? "landscape" : "portrait", unit: "px", format: [W, H] });
    pdf.addImage(imgData, "PNG", 0, 0, W, H);
    pdf.save(`${filename}.pdf`);
  } catch {
    console.error("jsPDF not installed. Run: npm install jspdf");
  }
}

export function downloadAsCSV(data, headers, filename) {
  const csvRows = [headers.join(",")];
  data.forEach((row) => {
    csvRows.push(headers.map((h) => {
      const val = row[h] ?? "";
      return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
    }).join(","));
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.csv`);
  URL.revokeObjectURL(url);
}

/** CSV: chart data section + blank separator + scope changes section */
export function downloadSectionedCSV(sections, filename) {
  const csvRows = [];
  sections.forEach((section, si) => {
    if (si > 0) { csvRows.push(""); csvRows.push(""); }
    if (section.title) csvRows.push(section.title);
    csvRows.push(section.headers.join(","));
    section.data.forEach((row) => {
      csvRows.push(section.headers.map((h) => {
        const val = row[h] ?? "";
        return typeof val === "string" && val.includes(",") ? `"${val}"` : val;
      }).join(","));
    });
  });
  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  triggerDownload(url, `${filename}.csv`);
  URL.revokeObjectURL(url);
}

export function buildBurndownCSV(dailyBurnup, initialPoints) {
  const headers = ["Day", "Date", "Ideal Remaining", "Actual Remaining", "Velocity", "Added Scope", "Removed Scope", "Is Weekend"];
  const data    = dailyBurnup.map((d) => ({
    "Day":              `Day ${d.sprintDayNumber}`,
    "Date":             d.date,
    "Ideal Remaining":  initialPoints - d.idealCompletedPoints,
    "Actual Remaining": d.completedPoints !== null ? initialPoints - d.completedPoints : "",
    "Velocity":         d.velocityPoints ?? "",
    "Added Scope":      d.addedScopePoints ?? "",
    "Removed Scope":    d.removedScopePoints ?? "",
    "Is Weekend":       d.isWeekend ? "Yes" : "No",
  }));
  return { headers, data };
}

export function buildBurnupCSV(dailyBurnup) {
  const headers = ["Day", "Date", "Ideal Completed", "Completed Points", "Total Scope", "Velocity", "Is Weekend"];
  const data    = dailyBurnup.map((d) => ({
    "Day":               `Day ${d.sprintDayNumber}`,
    "Date":              d.date,
    "Ideal Completed":   d.idealCompletedPoints,
    "Completed Points":  d.completedPoints ?? "",
    "Total Scope":       d.totalScopePoints ?? "",
    "Velocity":          d.velocityPoints ?? "",
    "Is Weekend":        d.isWeekend ? "Yes" : "No",
  }));
  return { headers, data };
}

export function buildScopeChangesSection(scopeChanges) {
  const headers = ["Date", "Issue", "Issue Type", "Event Type", "Event Detail", "Inc.", "Dec.", "Story Pts After"];
  const data    = (scopeChanges ?? []).map((sc) => ({
    "Date":            fmtDate(sc.changedAt ?? sc.date),
    "Issue":           sc.issueTitle ?? "—",
    "Issue Type":      sc.issueType  ?? "—",
    "Event Type":      CHANGE_TYPE_LABELS[sc.changeType] ?? sc.changeType ?? "—",
    "Event Detail":    getDetail(sc),
    "Inc.":            sc.pointsDelta > 0  ? sc.pointsDelta           : "",
    "Dec.":            sc.pointsDelta < 0  ? Math.abs(sc.pointsDelta) : "",
    "Story Pts After": sc.newStoryPoints != null ? sc.newStoryPoints  : "",
  }));
  return { title: "Scope Changes", headers, data };
}
