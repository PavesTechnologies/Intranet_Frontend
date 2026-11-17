const fullInr = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/**
 * Compact INR in Indian units: 4580000 → "₹45.8L", 12500000 → "₹1.25Cr",
 * 86000 → "₹86,000". `signed` prefixes "+" for positive values.
 */
export function formatInrCompact(amount, { signed = false } = {}) {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);
  let body;
  if (abs >= 1e7) body = `${trim(abs / 1e7, 2)}Cr`;
  else if (abs >= 1e5) body = `${trim(abs / 1e5, 1)}L`;
  else body = fullInr.format(abs);

  const sign = value < 0 ? "−" : signed && value > 0 ? "+" : "";
  return `${sign}₹${body}`;
}

/** Full INR with Indian digit grouping: 245000 → "₹2,45,000". */
export function formatInrFull(amount) {
  const value = Number(amount) || 0;
  return `${value < 0 ? "−" : ""}₹${fullInr.format(Math.abs(value))}`;
}

export function formatShortDate(isoDate) {
  const d = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function trim(n, digits) {
  return Number(n.toFixed(digits)).toString();
}
