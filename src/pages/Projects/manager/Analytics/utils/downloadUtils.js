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
    epic:      sc.epicName   ?? "—",
    eventType: CHANGE_TYPE_LABELS[sc.changeType] ?? sc.changeType ?? "—",
    detail:    getDetail(sc),
    inc:       sc.pointsDelta > 0  ? String(sc.pointsDelta)           : "—",
    dec:       sc.pointsDelta < 0  ? String(Math.abs(sc.pointsDelta)) : "—",
    pts:       sc.newStoryPoints != null ? String(sc.newStoryPoints)  : "—",
  };
}

// ─── Combined canvas (chart + scope changes table) ───────────────────────────

const OUT_W        = 1200;
const PAD          = 24;
const GAP          = 28;
const TITLE_H      = 34;
const HDR_H        = 34;
const ROW_H        = 28;
const FS_TITLE     = 15;
const FS_HDR       = 11;
const FS_DATA      = 12;
// Header (title + subtitle + legend strip)
const FS_CHART_TITLE    = 17;
const FS_CHART_SUBTITLE = 12;
const FS_LEGEND_ITEM    = 11;
const LEGEND_ITEM_H     = 22;
const LEGEND_ITEM_GAP   = 20;

// column definitions: label, fixedWidth (0 = fill remaining)
const COLS = [
  { key: "date",      label: "Date",         fw: 185 },
  { key: "issue",     label: "Issue",        fw: 110 },
  { key: "epic",      label: "Epic",         fw: 120 },
  { key: "eventType", label: "Event Type",   fw: 145 },
  { key: "detail",    label: "Event Detail", fw: 0   },  // fills rest
  { key: "inc",       label: "Inc.",         fw: 50  },
  { key: "dec",       label: "Dec.",         fw: 50  },
  { key: "pts",       label: "Story Pts",    fw: 75  },
];
const FIXED_W = COLS.reduce((s, c) => s + c.fw, 0);  // 735

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

/**
 * Draw title, subtitle and legend strip at the top of the canvas.
 * Returns the total height consumed (so the chart can be offset below it).
 */
function drawChartHeader(ctx, meta) {
  if (!meta) return 0;
  const { title, subtitle, legendItems } = meta;
  let y = PAD;

  // Title
  ctx.font      = `bold ${FS_CHART_TITLE}px system-ui,sans-serif`;
  ctx.fillStyle = "#1e293b";
  ctx.fillText(title, PAD, y + FS_CHART_TITLE);
  y += FS_CHART_TITLE + 5;

  // Subtitle
  if (subtitle) {
    ctx.font      = `${FS_CHART_SUBTITLE}px system-ui,sans-serif`;
    ctx.fillStyle = "#94a3b8";
    ctx.fillText(subtitle, PAD, y + FS_CHART_SUBTITLE);
    y += FS_CHART_SUBTITLE + 12;
  }

  // Legend strip
  if (legendItems?.length) {
    let x = PAD;
    const yMid = y + LEGEND_ITEM_H / 2;

    legendItems.forEach((item) => {
      const ICON_W = 20;

      if (item.type === "solid-line") {
        ctx.save();
        ctx.strokeStyle = item.color;
        ctx.lineWidth   = 2.5;
        ctx.setLineDash([]);
        ctx.beginPath(); ctx.moveTo(x, yMid); ctx.lineTo(x + ICON_W, yMid); ctx.stroke();
        ctx.fillStyle = item.color;
        ctx.beginPath(); ctx.arc(x + ICON_W / 2, yMid, 3, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        x += ICON_W + 5;
      } else if (item.type === "dashed-line") {
        ctx.save();
        ctx.strokeStyle = item.color;
        ctx.lineWidth   = 1.5;
        ctx.setLineDash([5, 3]);
        ctx.beginPath(); ctx.moveTo(x, yMid); ctx.lineTo(x + ICON_W, yMid); ctx.stroke();
        ctx.restore();
        x += ICON_W + 5;
      } else if (item.type === "box") {
        ctx.save();
        ctx.fillStyle = item.color;
        ctx.fillRect(x, yMid - 6, 14, 12);
        ctx.restore();
        x += 14 + 5;
      }
      // "text" type → no icon prefix, label drawn in its own color

      ctx.font      = `${FS_LEGEND_ITEM}px system-ui,sans-serif`;
      ctx.fillStyle = item.type === "text" ? item.color : "#475569";
      ctx.fillText(item.label, x, yMid + 4);
      x += ctx.measureText(item.label).width + LEGEND_ITEM_GAP;
    });

    y += LEGEND_ITEM_H + 12;
  }

  return y - PAD; // height consumed (excluding the initial PAD)
}

function createCombinedCanvas(chartCanvas, scopeChanges, meta) {
  const scope    = scopeChanges ?? [];
  const headerH  = meta
    ? PAD + FS_CHART_TITLE + 5
      + (meta.subtitle ? FS_CHART_SUBTITLE + 12 : 0)
      + (meta.legendItems?.length ? LEGEND_ITEM_H + 12 : 0)
    : 0;
  const chartH   = Math.round(OUT_W * chartCanvas.height / chartCanvas.width);
  const tableH   = scope.length > 0
    ? TITLE_H + HDR_H + scope.length * ROW_H + PAD
    : 0;
  const totalH   = PAD + headerH + chartH + (tableH > 0 ? GAP + tableH : 0) + PAD;

  const off = document.createElement("canvas");
  off.width  = OUT_W;
  off.height = totalH;
  const ctx  = off.getContext("2d");

  // white background
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, OUT_W, totalH);

  // header (title + subtitle + legend)
  const drawnH = drawChartHeader(ctx, meta);

  // chart image — shifted down by header height
  ctx.drawImage(chartCanvas, 0, PAD + drawnH, OUT_W, chartH);

  if (scope.length === 0) return off;

  const cols = buildColLayout(OUT_W);
  // compute x positions
  const xs = [];
  let xc = PAD;
  cols.forEach((c) => { xs.push(xc); xc += c.w; });

  let y = PAD + drawnH + chartH + GAP;

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
    epic:      (v) => v !== "—" ? "#7c3aed" : "#94a3b8",
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

/** PNG: chart + header metrics + scope changes table combined into one image */
export async function downloadChartWithScopeAsPNG(chartCanvas, scopeChanges, filename, meta) {
  if (!chartCanvas) return;
  const combined = createCombinedCanvas(chartCanvas, scopeChanges ?? [], meta);
  triggerDownload(combined.toDataURL("image/png"), `${filename}.png`);
}

/** PDF: chart + header metrics + scope changes table combined on one page */
export async function downloadChartWithScopeAsPDF(chartCanvas, scopeChanges, filename, meta) {
  if (!chartCanvas) return;
  try {
    const { default: jsPDF } = await import("jspdf");
    const combined = createCombinedCanvas(chartCanvas, scopeChanges ?? [], meta);
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
  const headers = ["Date", "Issue", "Epic", "Issue Type", "Event Type", "Event Detail", "Inc.", "Dec.", "Story Pts After"];
  const data    = (scopeChanges ?? []).map((sc) => ({
    "Date":            fmtDate(sc.changedAt ?? sc.date),
    "Issue":           sc.issueTitle ?? "—",
    "Epic":            sc.epicName   ?? "",
    "Issue Type":      sc.issueType  ?? "—",
    "Event Type":      CHANGE_TYPE_LABELS[sc.changeType] ?? sc.changeType ?? "—",
    "Event Detail":    getDetail(sc),
    "Inc.":            sc.pointsDelta > 0  ? sc.pointsDelta           : "",
    "Dec.":            sc.pointsDelta < 0  ? Math.abs(sc.pointsDelta) : "",
    "Story Pts After": sc.newStoryPoints != null ? sc.newStoryPoints  : "",
  }));
  return { title: "Scope Changes", headers, data };
}
