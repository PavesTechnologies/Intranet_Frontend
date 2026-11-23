/**
 * Rule-based intent matching for the intranet assistant.
 *
 * Pure and synchronous so it can be unit-tested: `matchIntent(text)` returns
 * the first intent whose rule matches, or null. Rules are ordered from most to
 * least specific (e.g. "apply leave" must win over the generic "leave" page).
 */

const has = (t, ...words) => words.some((w) => t.includes(w));

export const INTENT_RULES = [
  { id: "tour", test: (t) => has(t, "tour", "walkthrough", "guide me", "show me around") },
  { id: "applyLeave", test: (t) => has(t, "leave", "time off", "day off") && has(t, "apply", "request", "take", "book", "submit", "how do i") },
  { id: "onLeaveToday", test: (t) => (has(t, "who", "anyone", "everyone", "team") && has(t, "leave", "off", "absent", "out")) || has(t, "on leave today", "out today", "absent today") },
  { id: "leaveBalance", test: (t) => has(t, "leave", "leaves") && has(t, "balance", "left", "remaining", "how many", "available", "have") },
  { id: "holidays", test: (t) => has(t, "holiday", "public holiday", "day off calendar") },
  { id: "celebrations", test: (t) => has(t, "birthday", "anniversar", "joinee", "new joiner", "celebrat") },
  { id: "hours", test: (t) => has(t, "hour", "timesheet", "time sheet") && has(t, "how many", "logged", "this month", "total", "my hours", "worked") },
  { id: "timesheet", test: (t) => has(t, "timesheet", "time sheet", "log hours", "log time", "fill hours", "enter hours") },
  { id: "tasks", test: (t) => has(t, "task", "my work", "to do", "todo") },
  { id: "projects", test: (t) => has(t, "project") },
  { id: "leavePage", test: (t) => has(t, "leave") },
  { id: "profile", test: (t) => has(t, "profile", "my details", "my info", "personal details") },
  { id: "thanks", test: (t) => has(t, "thank", "thx", "great", "awesome", "cool") && t.length < 40 },
  { id: "help", test: (t) => has(t, "help", "what can you do", "options", "menu") },
  { id: "greet", test: (t) => /^(hi|hello|hey|hii+|yo|good (morning|afternoon|evening))\b/.test(t) },
];

export function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s']/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function matchIntent(text) {
  const t = normalize(text);
  if (!t) return null;
  const rule = INTENT_RULES.find((r) => r.test(t));
  return rule ? rule.id : null;
}

/** Starter prompts shown as chips. */
export const SUGGESTIONS = [
  "What's my leave balance?",
  "Who's on leave today?",
  "Upcoming holidays",
  "How many hours this month?",
  "Upcoming birthdays",
  "Apply for leave",
];
