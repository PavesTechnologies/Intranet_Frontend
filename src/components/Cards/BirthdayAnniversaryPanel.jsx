import { useState, useEffect } from "react";
import { celebrations } from "../../services/dashboard";
import LoadingSpinner from "../LoadingSpinner";

const WHEN_COLORS = {
  Today: "bg-emerald-50 text-emerald-600",
  Tomorrow: "bg-amber-50 text-amber-600",
};

function getInitials(name) {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const AVATAR_COLORS = [
  "bg-teal-400", "bg-rose-400", "bg-blue-400", "bg-violet-400",
  "bg-orange-400", "bg-emerald-400", "bg-pink-400", "bg-indigo-400"
];

function getColor(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  // Assuming dateStr is DD/MM/YY
  try {
    const [day, month, year] = dateStr.split("/");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${parseInt(day)} ${months[parseInt(month) - 1]}`;
  } catch (e) {
    return dateStr;
  }
}

function whenColor(when) {
  return WHEN_COLORS[when] ?? "bg-gray-50 text-gray-500";
}

function Avatar({ initials, color, size = "md" }) {
  const sz = size === "lg" ? "w-11 h-11 text-sm" : "w-8 h-8 text-xs";
  return (
    <div className={`rounded-full ${color} ${sz} flex items-center justify-center flex-shrink-0 font-semibold text-white shadow-sm border-2 border-white transition-transform duration-200`}>
      {initials}
    </div>
  );
}

function CelebrationItem({ item, isActive }) {
  return (
    <div className="group relative flex flex-col items-center gap-2 transition-all duration-300 hover:-translate-y-1">
      {/* Name Tooltip */}
      <div className="absolute -top-9 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-all duration-200 bg-gray-900/90 text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl whitespace-nowrap z-20 pointer-events-none translate-y-2 group-hover:translate-y-0">
        <span className="font-semibold">{item.name}</span>
        {item.years && <span className="ml-1 opacity-70">({item.years}y)</span>}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/90" />
      </div>

      {/* Avatar Container */}
      <div className="relative">
        <Avatar initials={item.initials} color={item.color} size="lg" />
        {item.when === "Today" && (
          <div className="absolute -top-1 -right-1 animate-bounce">
            <span className="text-xs drop-shadow-sm">🎉</span>
          </div>
        )}
      </div>

      {/* Date */}
      <div className="flex flex-col items-center leading-tight">
        <span className={`text-[10px] font-bold ${isActive ? 'text-gray-800' : 'text-gray-500'}`}>
          {item.date}
        </span>
        {/* <span className={`text-[9px] font-medium opacity-50 uppercase tracking-tighter`}>
          {item.when === "Today" ? "Today" : item.when}
        </span> */}
      </div>
    </div>
  );
}

function EmptyState({ tab }) {
  const messages = {
    birthdays: "No birthdays today",
    anniversaries: "No anniversaries today",
    newJoinees: "No new joinees today",
  };
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-3">
      <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center">
        <svg className="w-7 h-7 text-gray-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path d="M12 3c0 0-2 2-2 4s2 2 2 2 2 0 2-2-2-4-2-4z" />
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="8" y1="9" x2="8" y2="21" />
          <line x1="16" y1="9" x2="16" y2="21" />
        </svg>
      </div>
      <p className="text-xs text-gray-400 font-medium">{messages[tab]}</p>
    </div>
  );
}

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
              color: getColor(item.name),
              when: isToday ? "Today" : formatDate(item.date),
              date: formatDate(item.date),
              years: item.years || null
            };
            if (isToday) result.today.push(processedItem);
            else result.upcoming.push(processedItem);
          });
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

  const TABS = [
    {
      key: "birthdays",
      label: "Birthdays",
      count: celebrationData.birthdays.today.length,
      activeClass: "bg-rose-50 text-rose-600",
      dotClass: "bg-rose-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M12 3c0 0-2 2-2 4s2 2 2 2 2 0 2-2-2-4-2-4z" />
          <rect x="3" y="9" width="18" height="12" rx="2" />
          <line x1="3" y1="15" x2="21" y2="15" />
          <line x1="8" y1="9" x2="8" y2="21" />
          <line x1="16" y1="9" x2="16" y2="21" />
        </svg>
      ),
    },
    {
      key: "anniversaries",
      label: "Work Anniversary",
      count: celebrationData.anniversaries.today.length,
      activeClass: "bg-violet-50 text-violet-600",
      dotClass: "bg-violet-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
        </svg>
      ),
    },
    {
      key: "newJoinees",
      label: "New Joinees",
      count: celebrationData.newJoinees.today.length,
      activeClass: "bg-blue-50 text-blue-600",
      dotClass: "bg-blue-400",
      icon: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <line x1="19" y1="8" x2="19" y2="14" />
          <line x1="22" y1="11" x2="16" y2="11" />
        </svg>
      ),
    },
  ];

  const activeTabMeta = TABS.find((t) => t.key === activeTab);
  const data = celebrationData[activeTab];
  const todayItems = data?.today ?? [];
  const upcomingItems = data?.upcoming ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`w-1.5 h-4 rounded-full ${activeTabMeta?.dotClass}`} />
          <span className="text-sm font-semibold text-gray-800">Celebrations</span>
        </div>
      </div>

      <>
        {/* Segmented tabs */}
        <div className="px-4 pb-3">
          <div className="flex gap-1 bg-gray-50 rounded-xl p-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${isActive
                    ? `${tab.activeClass} shadow-sm`
                    : "text-gray-400 hover:text-gray-600"
                    }`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline truncate">{tab.label}</span>
                  <span className={`min-w-[16px] h-4 rounded-full text-[10px] font-semibold flex items-center justify-center px-1 ${isActive ? "bg-white/70" : "bg-gray-200 text-gray-500"
                    }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="px-4 pb-10 flex flex-col items-center justify-center gap-3">
            <LoadingSpinner text="Loading Celebrations..." />
          </div>
        ) : (
          <div className="px-4 pb-5">
            <div className="grid grid-cols-2 gap-6">
              {/* Today Section */}
              <div className={`relative p-5 rounded-2xl transition-all duration-500 group/today ${activeTab === "birthdays"
                ? "bg-gradient-to-br from-rose-50/80 via-orange-50/50 to-white border border-rose-100/50 shadow-sm shadow-rose-100/20"
                : activeTab === "anniversaries"
                  ? "bg-gradient-to-br from-violet-50/80 via-purple-50/50 to-white border border-violet-100/50 shadow-sm shadow-violet-100/20"
                  : "bg-gradient-to-br from-blue-50/80 via-emerald-50/50 to-white border border-blue-100/50 shadow-sm shadow-blue-100/20"
                }`}>

                {todayItems.length > 0 && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                    <div className="absolute -bottom-6 -left-6 w-56 h-56 opacity-[0.08] transform -rotate-12 transition-all duration-1000 ease-out group-hover/today:translate-x-8 group-hover/today:-translate-y-8 group-hover/today:rotate-0 group-hover/today:scale-125 z-0 flex items-center justify-center">
                      <span className="text-[100px] select-none">
                        {activeTab === "birthdays" ? "🎉" : activeTab === "anniversaries" ? "🏆" : "🚀"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-start mb-5">
                  <p className={`text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${activeTab === "birthdays" ? "text-rose-500" : activeTab === "anniversaries" ? "text-violet-500" : "text-blue-500"
                    }`}>
                    {activeTab === "birthdays" ? <span>🎂</span> : activeTab === "anniversaries" ? <span>✨</span> : <span>🤝</span>}
                    Today
                  </p>
                  {todayItems.length > 0 && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter animate-pulse ${activeTab === "birthdays" ? "bg-rose-100/80 text-rose-600" : activeTab === "anniversaries" ? "bg-violet-100/80 text-violet-600" : "bg-blue-100/80 text-blue-600"
                      }`}>
                      {activeTab === "birthdays" ? "Party Time!" : activeTab === "anniversaries" ? "Congrats!" : "Welcome!"}
                    </span>
                  )}
                </div>

                {todayItems.length === 0 ? (
                  <EmptyState tab={activeTab} />
                ) : (
                  <div className="flex flex-wrap gap-x-6 gap-y-6">
                    {todayItems.map((item) => (
                      <CelebrationItem key={item.id} item={item} isActive={true} />
                    ))}
                  </div>
                )}
              </div>

              {/* Upcoming Section */}
              <div className="p-5 border border-transparent">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-5">
                  Upcoming
                </p>
                {upcomingItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-gray-100 rounded-2xl">
                    <p className="text-[10px] text-gray-400 font-medium">No upcoming celebrations</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-x-6 gap-y-6">
                    {upcomingItems.map((item) => (
                      <CelebrationItem key={item.id} item={item} isActive={false} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    </div>
  );
}
