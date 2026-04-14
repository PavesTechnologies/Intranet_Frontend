import React, { useEffect, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import axios from "axios";

const Calendar = ({ projectId }) => {
  const [events, setEvents] = useState([]);

  // ===========================
  // FETCH TASKS
  // ===========================
  const fetchTasks = async () => {
    try {
      const res = await axios.get(
        `${window.__APP_CONFIG__.PMS_BASE_URL}/api/projects/${projectId}/tasks`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      // Convert backend tasks → FullCalendar events
      const formattedEvents = res.data.map((task) => ({
        id: task.id,
        title: task.title,
        start: task.dueDate.split("T")[0], // remove time
        end: task.dueDate.split("T")[0],
      }));

      setEvents(formattedEvents);
    } catch (error) {
      console.error("Error fetching project tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  // ===========================
  // CUSTOM EVENT UI
  // ===========================
  const renderEventContent = (eventInfo) => {
    return (
      <div
        style={{
          background: "#4F46E5",
          color: "white",
          padding: "4px 6px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
          boxShadow: "0 2px 4px rgba(0,0,0,0.15)",
          overflow: "hidden",
          whiteSpace: "nowrap",
          textOverflow: "ellipsis",
        }}
      >
        {eventInfo.event.title}
      </div>
    );
  };

  return (
    <div style={{ width: "90%", margin: "auto", marginTop: "20px" }}>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        eventContent={renderEventContent} // ⭐ added
        height="80vh"
      />
    </div>
  );
};

export default Calendar;
