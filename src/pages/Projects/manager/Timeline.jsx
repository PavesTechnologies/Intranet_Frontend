"use client";
import React, { useEffect, useState, useRef } from "react";
import dayjs from "dayjs";

const Sprint = ({ children }) => children;
const Epic = ({ children }) => children;

const Timeline = ({ projectId }) => {
  const [sprints, setSprints] = useState([]);
  const [epics, setEpics] = useState([]);
  const [stories, setStories] = useState([]);
  const [expandedSprints, setExpandedSprints] = useState(new Set());
  const [expandedEpics, setExpandedEpics] = useState(new Set());
  const [loading, setLoading] = useState(false);

  const scrollRef = useRef(null);

  const stickyWidth = 320;
  const cellWidth = 40;

  const today = dayjs();
  const startTimeline = today.subtract(1, "month").startOf("month");
  const endTimeline = today.add(3, "month").endOf("month");

  const days = [];
  for (
    let d = startTimeline.clone();
    d.isBefore(endTimeline) || d.isSame(endTimeline, "day");
    d = d.add(1, "day")
  ) {
    days.push(d.clone());
  }

  const totalWidth = days.length * cellWidth;

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);

    try {
      const token = localStorage.getItem("token");
      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const [sprintR, epicR, storyR] = await Promise.all([
        fetch(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/sprints`,
          { headers },
        ).then((r) => r.json()),
        fetch(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/epics`,
          { headers },
        ).then((r) => r.json()),
        fetch(
          `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/stories`,
          { headers },
        ).then((r) => r.json()),
      ]);

      setSprints(sprintR?.data ?? sprintR ?? []);
      setEpics(epicR?.data ?? epicR ?? []);
      setStories(storyR?.data ?? storyR ?? []);
    } catch (err) {
      console.error("Timeline Fetch Error:", err);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const toStart = (d) => (d ? dayjs(d).startOf("day") : null);
  const toEnd = (d) => (d ? dayjs(d).endOf("day") : null);

  const fallbackStart = (item) =>
    toStart(item?.startedAt || item?.startDate || item?.start_date) || startTimeline;
  const fallbackEnd = (item) =>
    toEnd(item?.endDate || item?.end_date || item?.dueDate || item?.due_date) ||
    fallbackStart(item).add(6, "day");

  const calcX = (date) => {
    const diff = dayjs(date).startOf("day").diff(startTimeline, "day");
    return diff * cellWidth;
  };

  const calcW = (s, e) => {
    const diff = dayjs(e).endOf("day").diff(dayjs(s).startOf("day"), "day") + 1;
    return Math.max(diff * cellWidth, cellWidth);
  };

  const toggleExpand = (id, type) => {
    if (type === "sprint") {
      setExpandedSprints((prev) => {
        const updated = new Set(prev);
        updated.has(id) ? updated.delete(id) : updated.add(id);
        return updated;
      });
    }
    if (type === "epic") {
      setExpandedEpics((prev) => {
        const updated = new Set(prev);
        updated.has(id) ? updated.delete(id) : updated.add(id);
        return updated;
      });
    }
  };

  const monthGroups = [];
  let current = days[0].format("MMM YYYY");
  let startIndex = 0;

  days.forEach((d, i) => {
    const key = d.format("MMM YYYY");
    if (key !== current) {
      monthGroups.push({
        month: days[startIndex].format("MMM"),
        year: days[startIndex].format("YYYY"),
        days: i - startIndex,
      });
      current = key;
      startIndex = i;
    }
  });

  monthGroups.push({
    month: days[startIndex].format("MMM"),
    year: days[startIndex].format("YYYY"),
    days: days.length - startIndex,
  });

  const Bar = ({ item, color, label }) => {
    const start = fallbackStart(item);
    const end = fallbackEnd(item);

    return (
      <div
        className="absolute text-white text-xs px-3 flex items-center shadow-sm rounded"
        style={{
          background: color,
          left: calcX(start),
          width: calcW(start, end),
          height: 24,
          top: "50%",
          transform: "translateY(-50%)",
          opacity: 0.9,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </div>
    );
  };

  const ItemRow = ({
    item,
    labelKey,
    icon,
    color,
    indent = 0,
    expandable = false,
    expanded = false,
    onToggle,
  }) => {
    const label = item?.[labelKey] || item?.name || item?.title;

    return (
      <div className="table-row-container" style={{ height: 48 }}>
        {/* STICKY LEFT COLUMN */}
        <div
          className="sticky-column"
          style={{
            paddingLeft: 12 + indent * 20,
          }}
        >
          {expandable ? (
            <button className="expand-btn" onClick={onToggle}>
              {expanded ? "▼" : "▶"}
            </button>
          ) : (
            <div style={{ width: 16 }} />
          )}

          <span className="text-base">{icon}</span>
          <span className="text-sm text-gray-800 truncate flex-1">{label}</span>
        </div>

        {/* SCROLLABLE TIMELINE AREA */}
        <div className="timeline-content">
          <Bar item={item} color={color} label={label} />
        </div>
      </div>
    );
  };

  const StoryRow = ({ story, indent }) => (
    <ItemRow
      item={story}
      labelKey="title"
      color="#10B981"
      icon="📋"
      indent={indent}
    />
  );

  const EpicRow = ({ epic, sprintId, indent }) => {
    const epicId = epic.id;
    const expanded = expandedEpics.has(epicId);

    const epicStories = stories.filter(
      (s) =>
        (s.epicId === epicId || s.epic_id === epicId) &&
        (!sprintId || s.sprintId === sprintId || s.sprint_id === sprintId),
    );

    return (
      <>
        <ItemRow
          item={epic}
          labelKey="name"
          color="#A855F7"
          icon="⬡"
          indent={indent}
          expandable={epicStories.length > 0}
          expanded={expanded}
          onToggle={() => toggleExpand(epicId, "epic")}
        />

        {expanded &&
          epicStories.map((story) => (
            <StoryRow key={story.id} story={story} indent={indent + 1} />
          ))}
      </>
    );
  };

  const SprintRow = ({ sprint }) => {
    const sprintId = sprint.id;
    const expanded = expandedSprints.has(sprintId);

    const sprintEpics = epics.filter(
      (e) => e.sprintId === sprintId || e.sprint_id === sprintId,
    );

    const directStories = stories.filter(
      (s) => !s.epicId && (s.sprintId === sprintId || s.sprint_id === sprintId),
    );

    return (
      <>
        <ItemRow
          item={sprint}
          labelKey="name"
          color="#0EA5E9"
          icon="⚡"
          expandable={true}
          expanded={expanded}
          onToggle={() => toggleExpand(sprintId, "sprint")}
        />

        {expanded && (
          <>
            {sprintEpics.map((epic) => (
              <EpicRow
                key={epic.id}
                epic={epic}
                sprintId={sprintId}
                indent={1}
              />
            ))}

            {directStories.map((story) => (
              <StoryRow key={story.id} story={story} indent={1} />
            ))}
          </>
        )}
      </>
    );
  };

  const unassignedEpics = epics.filter((e) => !e.sprintId && !e.sprint_id);
  const unassignedStories = stories.filter(
    (s) => !s.sprintId && !s.sprint_id && !s.epicId && !s.epic_id,
  );

  if (loading)
    return <div className="p-4 text-center">Loading Timeline...</div>;

  return (
    <div className="timeline-wrapper">
      <div ref={scrollRef} className="timeline-scroll-container">
        <div className="timeline-table">
          {/* HEADER ROW */}
          <div className="header-row">
            {/* STICKY WORK HEADER */}
            <div className="sticky-header-column">Work</div>

            {/* CALENDAR HEADER */}
            <div className="calendar-header">
              {/* Month Row */}
              <div className="month-row">
                {monthGroups.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      width: m.days * cellWidth,
                      minWidth: m.days * cellWidth,
                    }}
                    className="month-cell"
                  >
                    {m.month}
                  </div>
                ))}
              </div>

              {/* Day Row */}
              <div className="day-row">
                {days.map((d, i) => {
                  const isToday = d.isSame(today, "day");
                  return (
                    <div
                      key={i}
                      style={{ width: cellWidth, minWidth: cellWidth }}
                      className={`day-cell ${isToday ? "today" : ""}`}
                    >
                      {d.date()}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CONTENT ROWS */}
          {sprints.length > 0 && (
            <>
              <div className="section-header">
                <div className="sticky-section-label">Sprints</div>
                <div style={{ width: totalWidth }} />
              </div>
              {sprints.map((s) => (
                <SprintRow key={s.id} sprint={s} />
              ))}
            </>
          )}

          {unassignedEpics.length > 0 && (
            <>
              <div className="section-header">
                <div className="sticky-section-label">Epics</div>
                <div style={{ width: totalWidth }} />
              </div>
              {unassignedEpics.map((e) => (
                <EpicRow key={e.id} epic={e} indent={0} />
              ))}
            </>
          )}

          {unassignedStories.length > 0 && (
            <>
              <div className="section-header">
                <div className="sticky-section-label">Stories</div>
                <div style={{ width: totalWidth }} />
              </div>
              {unassignedStories.map((s) => (
                <StoryRow key={s.id} story={s} indent={0} />
              ))}
            </>
          )}
        </div>
      </div>

      <style jsx>{`
        .timeline-wrapper {
          width: 100%;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          border: 1px solid #e5e7eb;
          overflow: hidden;
        }

        .timeline-scroll-container {
          height: 80vh;
          overflow: auto;
          position: relative;
        }

        .timeline-table {
          display: table;
          width: 100%;
          border-collapse: collapse;
        }

        /* HEADER STYLES */
        .header-row {
          display: table-row;
          position: sticky;
          top: 0;
          z-index: 100;
          background: white;
        }

        .sticky-header-column {
          display: table-cell;
          position: sticky;
          left: 0;
          z-index: 101;
          width: ${stickyWidth}px;
          min-width: ${stickyWidth}px;
          max-width: ${stickyWidth}px;
          background: #f9fafb;
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          padding: 12px 16px;
          font-weight: 600;
          color: #374151;
          vertical-align: middle;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.05);
        }

        .calendar-header {
          display: table-cell;
          background: #f9fafb;
          border-bottom: 1px solid #d1d5db;
          vertical-align: top;
        }

        .month-row {
          display: flex;
          border-bottom: 1px solid #e5e7eb;
        }

        .month-cell {
          text-align: center;
          padding: 8px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          border-right: 1px solid #e5e7eb;
          background: #f9fafb;
        }

        .day-row {
          display: flex;
          background: white;
        }

        .day-cell {
          text-align: center;
          padding: 8px;
          font-size: 12px;
          color: #6b7280;
          border-right: 1px solid #e5e7eb;
        }

        .day-cell.today {
          background: #eff6ff;
          color: #2563eb;
          font-weight: 600;
        }

        /* SECTION HEADERS */
        .section-header {
          display: table-row;
          position: sticky;
          top: 80px;
          z-index: 50;
          background: #f3f4f6;
        }

        .sticky-section-label {
          display: table-cell;
          position: sticky;
          left: 0;
          z-index: 51;
          width: ${stickyWidth}px;
          min-width: ${stickyWidth}px;
          max-width: ${stickyWidth}px;
          background: #f3f4f6;
          border-right: 1px solid #d1d5db;
          border-bottom: 1px solid #d1d5db;
          padding: 8px 16px;
          font-weight: 600;
          color: #374151;
          font-size: 14px;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.03);
        }

        /* CONTENT ROWS */
        .table-row-container {
          display: table-row;
          border-bottom: 1px solid #e5e7eb;
        }

        .table-row-container:hover .sticky-column,
        .table-row-container:hover .timeline-content {
          background: #f9fafb;
        }

        .sticky-column {
          display: table-cell;
          position: sticky;
          left: 0;
          z-index: 10;
          width: ${stickyWidth}px;
          min-width: ${stickyWidth}px;
          max-width: ${stickyWidth}px;
          background: white;
          border-right: 1px solid #e5e7eb;
          padding: 12px;
          vertical-align: middle;
          box-shadow: 2px 0 4px rgba(0, 0, 0, 0.03);
        }

        .sticky-column {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .expand-btn {
          color: #6b7280;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0;
        }

        .expand-btn:hover {
          color: #374151;
        }

        .timeline-content {
          display: table-cell;
          position: relative;
          width: ${totalWidth}px;
          min-width: ${totalWidth}px;
          background: white;
          vertical-align: middle;
        }

        /* SCROLLBAR */
        .timeline-scroll-container::-webkit-scrollbar {
          height: 12px;
          width: 12px;
        }

        .timeline-scroll-container::-webkit-scrollbar-track {
          background: #f1f1f1;
        }

        .timeline-scroll-container::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 6px;
        }

        .timeline-scroll-container::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default Timeline;
