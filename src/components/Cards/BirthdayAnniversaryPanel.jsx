import { useState, useEffect } from "react";
import { celebrations } from "../../services/dashboard";

// ── Helpers ─────────────────────────────────────────────────────────────────

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** dateStr is DD/MM/YY → { day, month (0-based) } or null */
function parseDayMonth(dateStr) {
  const [d, m] = String(dateStr || "").split("/");
  const day = parseInt(d, 10);
  const month = parseInt(m, 10) - 1;
  if (Number.isNaN(day) || Number.isNaN(month)) return null;
  return { day, month };
}

function formatDate(dateStr) {
  const dm = parseDayMonth(dateStr);
  return dm ? `${dm.day} ${MONTHS[dm.month]}` : dateStr;
}

/** Days from today until the next occurrence of this day/month. */
function daysUntil(dateStr) {
  const dm = parseDayMonth(dateStr);
  if (!dm) return null;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), dm.month, dm.day);
  if (next < today) next = new Date(today.getFullYear() + 1, dm.month, dm.day);
  return Math.round((next - today) / 86400000);
}

function relativeLabel(days) {
  if (days === null) return "";
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

const AVATAR_TONES = [
  "bg-[#E6E5F7] text-[#0A0082]", "bg-[#FFE4EC] text-[#D6245A]", "bg-emerald-50 text-emerald-700",
  "bg-amber-50 text-amber-700", "bg-sky-50 text-sky-700", "bg-violet-50 text-violet-700",
];

function toneFor(name = "") {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_TONES[Math.abs(hash) % AVATAR_TONES.length];
}

const TABS = [
  { key: "birthdays", label: "Birthdays", empty: "No birthdays today", accent: "#FF3D72", emoji: "🎂", cheer: "Happy Birthday!", action: "Celebrating" },
  { key: "anniversaries", label: "Anniversaries", empty: "No work anniversaries today", accent: "#0A0082", emoji: "🏆", cheer: "Congratulations!", action: "Milestone" },
  { key: "newJoinees", label: "New Joinees", empty: "No new joinees today", accent: "#10b981", emoji: "👋", cheer: "Welcome aboard!", action: "New here" },
];

const CONFETTI = [
  ["58%", "14%", "#FF3D72"], ["93%", "16%", "#0A0082"], ["86%", "86%", "#f59e0b"],
  ["70%", "30%", "#10b981"], ["48%", "88%", "#5B66B8"],
];

// ── Sub-components ──────────────────────────────────────────────────────────

/** Festive card for people celebrating today. */
function TodayCelebrants({ items, meta }) {
  return (
    <div
      className="relative mt-3 overflow-hidden rounded-xl p-4"
      style={{ background: `linear-gradient(120deg, ${meta.accent}14 0%, #ffffff 70%)`, border: `1px solid ${meta.accent}26` }}
    >
      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
        {CONFETTI.map(([l, t, c], i) => (
          <span key={i} className="cel-confetti absolute h-1.5 w-1.5 rounded-sm" style={{ left: l, top: t, background: c, animationDelay: `${i * 0.4}s` }} />
        ))}
      </div>

      <p className="relative mb-3 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest" style={{ color: meta.accent }}>
        <span>{meta.emoji}</span> Today · {meta.cheer}
      </p>
      <ul className="relative space-y-2.5">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-white font-heading text-sm font-semibold"
              style={{ background: `${meta.accent}1F`, color: meta.accent, boxShadow: `0 0 0 2px ${meta.accent}` }}
            >
              {item.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-semibold text-[#0A174E]">{item.name}</p>
              <p className="text-xs text-[#78716C]">
                {item.date}
                {item.years ? <span className="ml-1.5 font-semibold" style={{ color: meta.accent }}>· {item.years} yr{item.years > 1 ? "s" : ""}</span> : null}
              </p>
            </div>
            <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm" style={{ background: meta.accent }}>
              {meta.emoji} {meta.action}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PersonRow({ item }) {
  const rel = relativeLabel(item.daysUntil);
  const soon = item.daysUntil !== null && item.daysUntil <= 7;
  return (
    <li className="flex items-center gap-3 rounded-lg px-1.5 py-2 transition hover:bg-[#F7F8FC]">
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${toneFor(item.name)}`}>
        {item.initials}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-[#0A174E]">{item.name}</p>
        <p className="text-[11px] text-[#A8A29E]">
          {item.date}
          {item.years ? ` · ${item.years} year${item.years > 1 ? "s" : ""}` : ""}
        </p>
      </div>
      {rel && (
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${
            soon ? "bg-[#FFE4EC] text-[#D6245A]" : "bg-[#F1F2F8] text-[#4B5275]"
          }`}
        >
          {rel}
        </span>
      )}
    </li>
  );
}

function SkeletonRows() {
  return (
    <ul className="space-y-1 py-2 animate-pulse">
      {[0, 1, 2].map((i) => (
        <li key={i} className="flex items-center gap-3 px-1.5 py-2">
          <div className="h-9 w-9 rounded-full bg-[#EEF0F7]" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-32 rounded bg-[#EEF0F7]" />
            <div className="h-2.5 w-16 rounded bg-[#EEF0F7]" />
          </div>
          <div className="h-5 w-16 rounded-full bg-[#EEF0F7]" />
        </li>
      ))}
    </ul>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────

export default function BirthdayAnniversaryPanel() {
  const [activeTab, setActiveTab] = useState("birthdays");
  const [loading, setLoading] = useState(true);
  const [celebrationData, setCelebrationData] = useState({
    birthdays: { today: [], upcoming: [] },
    anniversaries: { today: [], upcoming: [] },
    newJoinees: { today: [], upcoming: [] },
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await celebrations();
        const today = new Date();
        const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${String(today.getFullYear()).slice(-2)}`;

        const processItems = (items) => {
          const result = { today: [], upcoming: [] };
          if (!items) return result;
          items.forEach((item, index) => {
            const isToday = item.date === todayStr;
            const processedItem = {
              id: index,
              name: item.name,
              initials: getInitials(item.name),
              date: formatDate(item.date),
              daysUntil: isToday ? 0 : daysUntil(item.date),
              years: item.anniversaryYear || null,
            };
            if (isToday) result.today.push(processedItem);
            else result.upcoming.push(processedItem);
          });
          result.upcoming.sort((a, b) => (a.daysUntil ?? 999) - (b.daysUntil ?? 999));
          return result;
        };

        setCelebrationData({
          birthdays: processItems(res.birthdays || []),
          anniversaries: processItems(res.workAnniversaries || []),
          newJoinees: processItems(res.newJoinees || []),
        });
      } catch (err) {
        console.error("Failed to fetch celebration data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const tab = TABS.find((t) => t.key === activeTab);
  const data = celebrationData[activeTab];
  const todayItems = data?.today ?? [];
  const upcomingItems = data?.upcoming ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <style>{`
        @keyframes celConfetti { 0%,100% { transform: translateY(0) rotate(0deg); opacity: .9 } 50% { transform: translateY(-6px) rotate(90deg); opacity: .5 } }
        .cel-confetti { animation: celConfetti 3s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) { .cel-confetti { animation: none; } }
      `}</style>

      {/* Header */}
      <div className="flex items-center gap-2.5 px-4 pt-4">
        <span className="h-1 w-6 rounded bg-gradient-to-r from-[#0A0082] to-[#FF3D72]" />
        <span className="font-heading text-sm font-semibold text-[#0A174E]">Celebrations</span>
      </div>

      {/* Tabs — plain text with an underline on the active one */}
      <div className="mt-3 flex gap-4 sm:gap-5 border-b border-gray-100 px-4" role="tablist">
        {TABS.map((t) => {
          const isActive = activeTab === t.key;
          const d = celebrationData[t.key];
          const total = d.today.length + d.upcoming.length;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(t.key)}
              className={`-mb-px shrink-0 whitespace-nowrap border-b-2 pb-2 text-xs font-medium transition-colors ${isActive ? "border-[#0A0082] text-[#0A0082]" : "border-transparent text-gray-400 hover:text-gray-600"}`}
            >
              {t.label}
              {total > 0 && <span className="ml-1 text-gray-400">({total})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="px-4 pb-3">
          <SkeletonRows />
        </div>
      ) : (
        <div className="px-4 pb-3">
          {todayItems.length > 0 ? (
            <TodayCelebrants items={todayItems} meta={tab} />
          ) : (
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-[#F4F6FC] px-2.5 py-1 text-[11px] text-[#78716C]">
              <span aria-hidden="true">{tab.emoji}</span> {tab.empty}
            </p>
          )}

          <p className="mt-4 mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-[#A8A29E]">Coming up</p>
          {upcomingItems.length === 0 ? (
            <p className="py-3 text-xs text-gray-400">Nothing coming up</p>
          ) : (
            <ul className="-mx-1.5 max-h-64 overflow-y-auto">
              {upcomingItems.map((item) => (
                <PersonRow key={`u-${item.id}`} item={item} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
