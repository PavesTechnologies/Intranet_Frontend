export function formatCurrency(amount, currency = "INR") {
  const value = Number(amount) || 0;
  const symbol = currency === "INR" ? "₹" : `${currency} `;
  return `${symbol}${new Intl.NumberFormat("en-IN").format(value)}`;
}

export function formatDisplayDate(isoValue) {
  if (!isoValue) return "—";
  const datePart = isoValue.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return isoValue;
  const date = new Date(`${datePart}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoValue;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDisplayDateTime(isoValue) {
  if (!isoValue) return "—";
  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) return isoValue;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
