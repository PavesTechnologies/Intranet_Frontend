import React, { useState, useEffect } from "react";
import LoadingSpinner from "../../../components/LoadingSpinner";
import api from "../../../api/axiosInstance";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AllHolidaysGrid from "./AllHolidaysGrid";
import Button from "../../../components/Button/Button";

// ── Holiday theme map — matched by keyword, not exact name ─────────────────
const HOLIDAY_THEMES = [
  {
    keywords: ["diwali", "deepawali", "dipawali"],
    gradient: "linear-gradient(135deg, #92400e 0%, #d97706 50%, #f59e0b 100%)",
    text: "#fff7ed",
    badge: "rgba(255,255,255,0.25)",
    badgeText: "#fff7ed",
    emoji: "🪔",
  },
  {
    keywords: ["holi"],
    gradient: "linear-gradient(135deg, #be185d 0%, #7c3aed 45%, #ea580c 100%)",
    text: "#fff",
    badge: "rgba(255,255,255,0.25)",
    badgeText: "#fff",
    emoji: "🎨",
  },
  {
    keywords: ["christmas", "x-mas", "xmas"],
    gradient: "linear-gradient(135deg, #14532d 0%, #166534 50%, #991b1b 100%)",
    text: "#f0fdf4",
    badge: "rgba(255,255,255,0.25)",
    badgeText: "#f0fdf4",
    emoji: "🎄",
  },
  {
    keywords: ["new year"],
    gradient: "linear-gradient(135deg, #0f0c29 0%, #302b63 55%, #24243e 100%)",
    text: "#e0e7ff",
    badge: "rgba(255,255,255,0.2)",
    badgeText: "#e0e7ff",
    emoji: "🎆",
  },
  {
    keywords: ["eid", "ramzan", "ramadan", "bakrid", "muharram", "milad"],
    gradient: "linear-gradient(135deg, #064e3b 0%, #065f46 55%, #047857 100%)",
    text: "#ecfdf5",
    badge: "rgba(255,255,255,0.2)",
    badgeText: "#ecfdf5",
    emoji: "🌙",
  },
  {
    keywords: ["independence"],
    // Indian national flag: saffron (#FF9933) | white (#FFFFFF) | India green (#138808)
    gradient: "linear-gradient(180deg, #FF9933 0% 33.3%, #ffffff 33.3% 66.6%, #138808 66.6% 100%)",
    overlay: "rgba(0, 0, 40, 0.48)",
    text: "#fff",
    badge: "rgba(255,255,255,0.28)",
    badgeText: "#fff",
    emoji: "🇮🇳",
  },
  {
    keywords: ["republic"],
    gradient: "linear-gradient(180deg, #FF9933 0% 33.3%, #ffffff 33.3% 66.6%, #138808 66.6% 100%)",
    overlay: "rgba(0, 0, 40, 0.48)",
    text: "#fff",
    badge: "rgba(255,255,255,0.28)",
    badgeText: "#fff",
    emoji: "🇮🇳",
  },
  {
    keywords: ["pongal", "sankranti", "makar", "onam", "vishu", "ugadi", "baisakhi", "lohri", "bihu"],
    gradient: "linear-gradient(135deg, #713f12 0%, #ca8a04 55%, #4d7c0f 100%)",
    text: "#fefce8",
    badge: "rgba(255,255,255,0.25)",
    badgeText: "#fefce8",
    emoji: "🌾",
  },
  {
    keywords: ["ganesh", "navratri", "navaratri", "durga", "dussehra", "vijayadashami"],
    gradient: "linear-gradient(135deg, #7c2d12 0%, #c2410c 48%, #ca8a04 100%)",
    text: "#fff7ed",
    badge: "rgba(255,255,255,0.25)",
    badgeText: "#fff7ed",
    emoji: "🐘",
  },
  {
    keywords: ["good friday", "easter"],
    gradient: "linear-gradient(135deg, #2e1065 0%, #4c1d95 55%, #5b21b6 100%)",
    text: "#ede9fe",
    badge: "rgba(255,255,255,0.2)",
    badgeText: "#ede9fe",
    emoji: "✝️",
  },
  {
    keywords: ["buddha", "buddhist", "vesak"],
    gradient: "linear-gradient(135deg, #713f12 0%, #b45309 55%, #d97706 100%)",
    text: "#fefce8",
    badge: "rgba(255,255,255,0.25)",
    badgeText: "#fefce8",
    emoji: "🪷",
  },
  {
    keywords: ["mahavir", "jain"],
    gradient: "linear-gradient(135deg, #78350f 0%, #d97706 55%, #fde68a 100%)",
    text: "#fefce8",
    badge: "rgba(255,255,255,0.25)",
    badgeText: "#78350f",
    emoji: "🕊️",
  },
  {
    keywords: ["guru", "gurpurab", "nanak", "sikh"],
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 50%, #b45309 100%)",
    text: "#fff",
    badge: "rgba(255,255,255,0.2)",
    badgeText: "#fff",
    emoji: "🙏",
  },
  {
    keywords: ["ambedkar", "gandhi", "jayanti", "constitution"],
    gradient: "linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)",
    text: "#e0f2fe",
    badge: "rgba(255,255,255,0.2)",
    badgeText: "#e0f2fe",
    emoji: "🕊️",
  },
];

const DEFAULT_THEME = {
  gradient: "linear-gradient(135deg, #312e81 0%, #4f46e5 100%)",
  text: "#eef2ff",
  badge: "rgba(255,255,255,0.2)",
  badgeText: "#eef2ff",
  emoji: "📅",
};

function getHolidayTheme(name = "") {
  const lower = name.toLowerCase();
  for (const theme of HOLIDAY_THEMES) {
    if (theme.keywords.some((kw) => lower.includes(kw))) return theme;
  }
  return DEFAULT_THEME;
}
// ──────────────────────────────────────────────────────────────────────────

export default function UpcomingHolidays({ year }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAllHolidays, setShowAllHolidays] = useState(false);

  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const res = await api.get(
          `${window.__APP_CONFIG__.BASE_URL}/api/holidays/year/${year}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        setHolidays(res.data);
      } catch (err) {
        console.error("Error fetching holiday data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchHolidays();
  }, [year]);

  const upcoming = holidays
    .filter((h) => {
      const d = new Date(h.holidayDate);
      d.setHours(0, 0, 0, 0);
      return d >= today;
    })
    .sort((a, b) => new Date(a.holidayDate) - new Date(b.holidayDate));

  const prevHoliday = () =>
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : prev));
  const nextHoliday = () =>
    setCurrentIndex((prev) => (prev < upcoming.length - 1 ? prev + 1 : prev));

  const activeHoliday = upcoming[currentIndex];
  const theme = activeHoliday ? getHolidayTheme(activeHoliday.holidayName) : DEFAULT_THEME;

  if (loading) {
    return (
      <div className="bg-white shadow rounded-lg p-6 w-full flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <>
      <div
        key={currentIndex}
        className="shadow-lg rounded-xl w-full flex flex-col relative overflow-hidden"
        style={{
          background: theme.gradient,
          animation: "holidayFadeIn .3s ease",
          minHeight: "148px",
        }}
      >
        {/* Dark overlay for flag-stripe themes (keeps text readable over white stripe) */}
        {theme.overlay && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: theme.overlay, zIndex: 1 }}
          />
        )}

        {/* Festival icon watermark */}
        <div
          className="absolute bottom-1 right-3 pointer-events-none select-none"
          style={{ fontSize: "72px", opacity: 0.13, zIndex: 2, lineHeight: 1, transform: "rotate(-10deg)" }}
        >
          {theme.emoji}
        </div>

        {/* Header */}
        <div className="flex justify-between items-center px-4 pt-3.5 relative z-10">
          <h3
            className="text-xs font-bold flex items-center gap-1.5"
            style={{ color: theme.text }}
          >
            <span>{theme.emoji}</span>
            <span>{activeHoliday && new Date(activeHoliday.holidayDate).toDateString() === today.toDateString() ? "Today is a Holiday!" : "Upcoming Holiday"}</span>
          </h3>
          <Button
            variant="secondary"
            size="sm"
            className="text-xs font-semibold px-2.5 py-1"
            style={{
              color: theme.text,
              background: "rgba(255,255,255,0.18)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.28)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.18)")}
            onClick={() => setShowAllHolidays(true)}
          >
            View All
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col justify-center px-4 pb-4 pt-2 relative z-10">
          {upcoming.length > 0 ? (
            <div className="flex items-center gap-2">
              {/* Prev */}
              <Button
                onClick={prevHoliday}
                disabled={currentIndex === 0}
                variant="ghost"
                size="icon"
                aria-label="Previous holiday"
                className="p-1.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", color: theme.text }}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>

              {/* Card content */}
              <div className="flex-1 text-center">
                <p className="font-bold text-sm leading-snug" style={{ color: theme.text }}>
                  {upcoming[currentIndex].holidayName}
                </p>
                <span
                  className="inline-block mt-1.5 px-3 py-0.5 text-xs font-semibold rounded-full"
                  style={{ background: theme.badge, color: theme.text }}
                >
                  {new Date(upcoming[currentIndex].holidayDate).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                  })}
                </span>
                {upcoming[currentIndex].holidayDescription && (
                  <p
                    className="mt-1.5 text-xs line-clamp-2 opacity-75 leading-relaxed"
                    style={{ color: theme.text }}
                  >
                    {upcoming[currentIndex].holidayDescription}
                  </p>
                )}
                {new Date(upcoming[currentIndex].holidayDate).toDateString() === today.toDateString() && (
                  <p className="mt-1 text-xs font-semibold opacity-90" style={{ color: theme.text }}>
                    Enjoy your day off! 🎉
                  </p>
                )}

                {/* Dot / counter indicator */}
                {upcoming.length > 1 && (
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {upcoming.length <= 8 ? (
                      upcoming.map((_, i) => (
                        <div
                          key={i}
                          className="rounded-full transition-all duration-300"
                          style={{
                            width: i === currentIndex ? "14px" : "5px",
                            height: "5px",
                            background:
                              i === currentIndex
                                ? "rgba(255,255,255,0.9)"
                                : "rgba(255,255,255,0.35)",
                          }}
                        />
                      ))
                    ) : (
                      <span
                        className="text-[10px] font-semibold opacity-70"
                        style={{ color: theme.text }}
                      >
                        {currentIndex + 1} / {upcoming.length}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Next */}
              <Button
                onClick={nextHoliday}
                disabled={currentIndex === upcoming.length - 1}
                variant="ghost"
                size="icon"
                aria-label="Next holiday"
                className="p-1.5 rounded-full flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.18)", color: theme.text }}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <p
              className="text-center text-sm opacity-75"
              style={{ color: theme.text }}
            >
              No upcoming holidays.
            </p>
          )}
        </div>

        <style>{`
          @keyframes holidayFadeIn {
            from { opacity: 0; transform: scale(.97); }
            to   { opacity: 1; transform: scale(1); }
          }
        `}</style>
      </div>

      {showAllHolidays && (
        <AllHolidaysGrid
          holidays={holidays}
          onClose={() => setShowAllHolidays(false)}
        />
      )}
    </>
  );
}
