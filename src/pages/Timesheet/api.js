// utils/timesheetApi.js
import { showStatusToast } from "../../components/toastfy/toast";

const apiEndpoint = window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT;

export const fetchProjectTaskInfo = async () => {
  try {
    const response = await fetch(`${apiEndpoint}/api/project-info`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showStatusToast({
      type: "error",
      message: "Failed to fetch project/task info. Please try again.",
    });
    console.error("Fetch error:", error);
    return [];
  }
};

export const reviewTimesheet = async (timesheetId, comment, status) => {
  try {
    const res = await fetch(
      `${apiEndpoint}/api/timesheets/review?status=${encodeURIComponent(
        status,
      )}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          timesheetId,
          comment: comment,
        }),
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to review timesheet");
    }

    showStatusToast(`Timesheet ${status} successfully`, "success");
    return;
  } catch (err) {
    showStatusToast("Update failed", "error");
    throw err;
  }
};

export async function updateTimesheet(timesheetId, payload) {
  try {
    const response = await fetch(
      `${apiEndpoint}/api/timesheet/updateEntries/${timesheetId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify(payload),
      },
    );

    // Try parsing JSON first; if not possible, fallback to text
    const contentType = response.headers.get("content-type");
    let responseData;
    if (contentType && contentType.includes("application/json")) {
      responseData = await response.json();
    } else {
      responseData = await response.text();
    }

    // ✅ Success handling
    if (response.ok) {
      const message =
        typeof responseData === "string"
          ? responseData
          : responseData.message || "Timesheet updated successfully.";
      showStatusToast(message, "success");
      return responseData;
    }

    // ❌ Error handling (server responded with 4xx or 5xx)
    const errorMessage =
      typeof responseData === "string"
        ? responseData
        : responseData.message || "Failed to update timesheet.";
    showStatusToast(errorMessage, "error");
    throw new Error(errorMessage);
  } catch (err) {
    // 🧠 Network / unexpected errors
    const message = err.message || "Unexpected error while updating timesheet.";
    showStatusToast(message, "error");
    throw err;
  }
}

export async function fetchTimesheetHistory() {
  try {
    const res = await fetch(`${apiEndpoint}/api/timesheet/history`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to fetch timesheet history");
    }

    const data = await res.json();
    return data;
  } catch (err) {
    showStatusToast(err.message || "Fetch failed", "error");
    throw err;
  }
}

export async function addEntryToTimesheet(timesheetId, workdate, payload) {
  try {
    let res;
    if (timesheetId === undefined) {
      res = await fetch(
        `${apiEndpoint}/api/timesheet/create?workDate=${workdate}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        },
      );
    } else {
      res = await fetch(`${apiEndpoint}/api/timesheet/addEntries`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ timeSheetId: timesheetId, entries: payload }),
      });
    }

    if (!res.ok) {
      if (res.status === 400) {
        const errorData = await res.text();
        throw new Error(errorData || "Failed to add entry to timesheet");
      }
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to add entry to timesheet");
    }
    showStatusToast("Timesheet entry added successfully", "success");
  } catch (err) {
    showStatusToast(err.message || "Update failed", "error");
    throw err;
  }
}

export async function bulkReviewTimesheet(timesheetIds, status, comment) {
  try {
    // example body
    // {
    //   "timesheetIds": [14,15
    //   ],
    //   "status": "Approved",
    //   "comment": "Testing Bulk"
    // }
    const res = await fetch(`${apiEndpoint}/api/timesheets/review/bulk`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify({
        timesheetIds,
        status,
        comment: status === "Rejected" ? comment : "Bulk Approved",
      }),
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to bulk review timesheet");
    }

    showStatusToast(`Timesheet ${status} successfully`, "success");
    return;
  } catch (err) {
    showStatusToast("Update failed", "error");
    throw err;
  }
}

// Dashboard Summary API
export async function fetchDashboardSummary() {
  try {
    const response = await fetch(`${apiEndpoint}/api/dashboard/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        errorData || `Error ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showStatusToast({
      type: "error",
      message: "Failed to fetch dashboard summary. Please try again.",
    });
    console.error("Fetch dashboard summary error:", error);
    return null; // Return null so calling code can check for loading/error
  }
}

export async function filterByRange(startDate, endDate) {
  try {
    const res = await fetch(
      `${apiEndpoint}/api/timesheet/filter?startDate=${startDate}&endDate=${endDate}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Failed to filter timesheet");
    }

    const data = await res.json();
    return data;
  } catch (err) {
    showStatusToast(err.message || "Filter failed", "error");
    throw err;
  }
}

export async function getManagerDashboardData(startDate, endDate) {
  try {
    const res = await fetch(`${apiEndpoint}/api/manager/summary`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(
        errorData.message || "Failed to fetch manager dashboard data",
      );
    }

    const data = await res.json();
    return data;
  } catch (err) {
    showStatusToast(
      err.message || "Failed to fetch manager dashboard data",
      "error",
    );
    throw err;
  }
}

// export async function submitWeeklyTimesheet(timesheetIds) {
//   try {
//     const res = await fetch(`${apiEndpoint}/api/weeklyReview/submit`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//         Authorization: `Bearer ${localStorage.getItem("token")}`,
//       },
//       body: JSON.stringify(timesheetIds),
//     });

//     if (!res.ok) {
//       let errorMessage = "Failed to submit weekly timesheet";

//       try {
//         const errorData = await res.json();
//         errorMessage = errorData?.message || errorData || errorMessage;
//       } catch {
//         // fallback if response isn't JSON (e.g. plain text)
//         const text = await res.text();
//         if (text) errorMessage = text;
//       }

//       throw new Error(errorMessage);
//     }

//     // Handle both JSON and text responses
//     let responseMessage = "Weekly timesheet submitted successfully";
//     const contentType = res.headers.get("content-type");

//     if (contentType && contentType.includes("application/json")) {
//       const data = await res.json();
//       responseMessage = data.message || responseMessage;
//     } else {
//       const text = await res.text();
//       responseMessage = text || responseMessage;
//     }

//     showStatusToast(responseMessage, "success");
//     return responseMessage;
//   } catch (err) {
//     showStatusToast(
//       err.message || "Failed to submit weekly timesheet",
//       "error"
//     );
//     throw err;
//   }
// }
export async function submitWeeklyTimesheet(timesheetIds) {
  try {
    const res = await fetch(`${apiEndpoint}/api/weeklyReview/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(timesheetIds),
    });

    // Handle non-OK responses (includes 400)
    if (!res.ok) {
      let errorMessage = "Failed to submit weekly timesheet";

      try {
        const contentType = res.headers.get("content-type");

        if (contentType && contentType.includes("application/json")) {
          const errorData = await res.json();
          errorMessage = errorData?.message || JSON.stringify(errorData);
        } else {
          const errorText = await res.text();
          errorMessage = errorText || errorMessage;
        }
      } catch (err) {
        console.error("Error parsing error response:", err);
      }

      throw new Error(errorMessage);
    }

    // ✅ Handle success response (either JSON or text)
    let responseMessage = "Weekly timesheet submitted successfully";
    const contentType = res.headers.get("content-type");

    if (contentType && contentType.includes("application/json")) {
      const data = await res.json();
      responseMessage = data?.message || responseMessage;
    } else {
      const text = await res.text();
      responseMessage = text || responseMessage;
    }

    showStatusToast(responseMessage, "success");
    return responseMessage;
  } catch (err) {
    showStatusToast(
      err.message || "Failed to submit weekly timesheet",
      "error",
    );
    throw err;
  }
}

export async function fetchCalendarHolidays() {
  try {
    const response = await fetch(
      `${apiEndpoint}/api/holidays/currentMonthLeaves`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showStatusToast({
      type: "error",
      message: "Failed to fetch calendar holidays. Please try again.",
    });
    console.error("Fetch calendar holidays error:", error);
    return null; // Return null so calling code can check for loading/error
  }
}

export async function fetchProjects() {
  try {
    const response = await fetch(`${apiEndpoint}/api/project-info/all`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    if (!response.ok) {
      throw new Error("Failed to fetch timesheets");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching timesheets:", error);
    showStatusToast("Failed to fetch timesheets", "error");
    return [];
  }
}

export const handleBulkReview = async (
  userId,
  timesheetIds,
  status,
  comments = "",
) => {
  try {
    const response = await fetch(
      `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/timesheets/review`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          userId,
          timesheetIds,
          status,
          comments: comments || (status === "APPROVED" ? "approved" : ""),
        }),
      },
    );

    // Read the response body as JSON
    const data = await response.json();

    if (!response.ok) {
      const message = data?.message || "Failed to review timesheets";
      throw new Error(message);
    }

    // ✅ Show the exact message returned from backend
    const message =
      data?.message || `Timesheets ${status.toLowerCase()} successfully`;
    showStatusToast(message, "success");
  } catch (err) {
    console.error("❌ Error reviewing timesheets:", err);
    showStatusToast(
      err.message || "Failed to update timesheet status",
      "error",
    );
  }
};
export async function fetchDashboardLastMonth() {
  try {
    const response = await fetch(
      `${apiEndpoint}/api/dashboard/summary/lastMonth`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        errorData || `Error ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showStatusToast({
      type: "error",
      message: "Failed to fetch dashboard summary. Please try again.",
    });
    console.error("Fetch dashboard summary error:", error);
    return null; // Return null so calling code can check for loading/error
  }
}
export async function fetchDashboardLast3Months() {
  try {
    const response = await fetch(
      `${apiEndpoint}/api/dashboard/summary/last3Months`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      },
    );

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(
        errorData || `Error ${response.status}: ${response.statusText}`,
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    showStatusToast({
      type: "error",
      message: "Failed to fetch dashboard summary. Please try again.",
    });
    console.error("Fetch dashboard summary error:", error);
    return null; // Return null so calling code can check for loading/error
  }
}

export const handleBulkReviewAdmin = async (
  userId,
  timesheetIds,
  status,
  comments = "",
) => {
  try {
    const response = await fetch(
      `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/timesheets/review/internal`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({
          userId,
          timesheetIds,
          status,
          comments: comments || (status === "APPROVED" ? "approved" : ""),
        }),
      },
    );

    // Read the response body as JSON
    const data = await response.json();

    if (!response.ok) {
      const message = data?.message || "Failed to review timesheets";
      throw new Error(message);
    }

    // ✅ Show the exact message returned from backend
    const message =
      data?.message || `Timesheets ${status.toLowerCase()} successfully`;
    showStatusToast(message, "success");
  } catch (err) {
    console.error("❌ Error reviewing timesheets:", err);
    showStatusToast(
      err.message || "Failed to update timesheet status",
      "error",
    );
  }
};

export const getActiveHourSettings = async () => {
  try {
    const res = await fetch(`${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/timesheet-settings/active`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || `Error ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error("❌ Failed to load hour settings:", err);
    showStatusToast("Failed to load hour settings", "error");
    throw err;
  }
};

export const updateHourSettings = async (payload) => {
  try {
    const res = await fetch(`${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/timesheet-settings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: JSON.stringify(payload),
    });

    const raw = await res.text();
    if (!res.ok) {
      throw new Error(raw || `Error ${res.status}: ${res.statusText}`);
    }

    showStatusToast("Hour settings updated successfully", "success");
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("❌ Failed to update hour settings:", err);
    showStatusToast(err.message || "Failed to update hour settings", "error");
    throw err;
  }
};
