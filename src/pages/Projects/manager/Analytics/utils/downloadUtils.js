export async function downloadChartAsPNG(canvasRef, filename) {
  if (!canvasRef?.current) return;
  const canvas = canvasRef.current;
  const url    = canvas.toDataURL("image/png");
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

export function downloadAsCSV(data, headers, filename) {
  const csvRows  = [headers.join(",")];
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

function triggerDownload(url, filename) {
  const a    = document.createElement("a");
  a.href     = url;
  a.download = filename;
  a.click();
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