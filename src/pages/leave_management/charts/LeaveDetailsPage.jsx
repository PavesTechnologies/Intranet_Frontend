import { useEffect, useState, useMemo } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import beachDay from "../../../components/icons/beach-day_cnsv.svg";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// Helper to format dates for readability
const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};
// Add this helper function at the top of your file
const formatLeaveNameFromParam = (name = "") => {
  return name
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
};

// Helper to get styling for status badges
const getStatusBadgeStyles = (status) => {
  switch (status?.toUpperCase()) {
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "APPROVED":
      return "bg-green-100 text-green-800";
    case "REJECTED":
      return "bg-red-100 text-red-800";
    case "CANCELLED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function LeaveDetailsPage() {
  const { employeeId, leaveName } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Retrieve employeeId and leaveTypeName passed from the dashboard
  const {
    leaveTypeName: initialLeaveTypeName,
    allLeaveTypes: intialAllLeaveTypes = [],
  } = location.state || {};
  const [allLeaveTypes, setAllLeaveTypes] = useState(intialAllLeaveTypes);
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [displayName, setDisplayName] = useState(
    initialLeaveTypeName || formatLeaveNameFromParam(leaveName),
  );
  const [loading, setLoading] = useState(true);

  const fetchAllLeaveTypes = async () => {
    try {
      const res = await axios.get(`${BASE_URL}/api/leave/types`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      // Assuming res.data is an array like [{ name: 'SICK_LEAVE', label: 'Sick Leave' }]
      setAllLeaveTypes(res.data);
    } catch (err) {
      toast.error("Failed to fetch leave types for navigation.");
    }
  };

  useEffect(() => {
    setDisplayName(initialLeaveTypeName || formatLeaveNameFromParam(leaveName));
  }, [initialLeaveTypeName, leaveName]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (allLeaveTypes.length === 0) {
      fetchAllLeaveTypes();
    }
    const fetchLeaveDetails = async () => {
      setLoading(true);
      try {
        const year = new Date().getFullYear();
        // NOTE: Adjust the API endpoint if it's different.
        const res = await axios.get(
          `${BASE_URL}/api/leave-requests/view-details`,
          {
            params: { employeeId: employeeId, leaveName: leaveName, year },
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        if (res.data?.success) {
          setLeaveRequests(res.data.data);
          if (!displayName && res.data.data.length > 0) {
            // This creates a readable name like "Sick Leave" from "SICK_LEAVE"
            const fetchedName = res.data.data[0].leaveType.leaveName;
            const formattedName = fetchedName
              .split("_")
              .map(
                (word) =>
                  word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
              )
              .join(" ");
            setDisplayName(formattedName);
          }
        } else {
          toast.error(res.data.message || "Failed to fetch leave details.");
        }
      } catch (err) {
        toast.error(
          err.response?.data?.message || err.message || "An error occurred.",
        );
      } finally {
        setLoading(false);
      }
    };

    fetchLeaveDetails();
  }, [employeeId, leaveName]);

  const handleSwitchLeaveType = (newLeaveType) => {
    if (newLeaveType.name === leaveName) return; // Don't reload if it's the same type

    navigate(`/leave-details/${employeeId}/${newLeaveType.name}`, {
      replace: true, // Use replace to avoid cluttering browser history
      state: {
        leaveTypeName: newLeaveType.label,
        allLeaveTypes, // Pass the state again
      },
    });
  };

  const groupedLeaves = useMemo(() => {
    // The 'acc' (accumulator) is the object we're building.
    // The 'req' is the current leave request being processed.
    return leaveRequests.reduce((acc, req) => {
      // Get the month and year from the start date.
      const monthYear = new Date(req.startDate).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      // If this month isn't in our accumulator yet, create it.
      if (!acc[monthYear]) {
        acc[monthYear] = {
          requests: [],
          totalDays: 0,
        };
      }

      // Add the current request to this month's list.
      acc[monthYear].requests.push(req);

      // Add the days from this request to the month's total.
      acc[monthYear].totalDays += req.daysRequested;

      return acc; // Return the updated accumulator for the next item.
    }, {}); // Start with an empty object.
  }, [leaveRequests]);

  const sortedMonthKeys = Object.keys(groupedLeaves).sort(
    (a, b) => new Date(b) - new Date(a),
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner text="Loading leave details..." />
      </div>
    );
  }

  // Separate requests for better UI presentation
  const pendingRequests = leaveRequests.filter(
    (req) => req.status === "PENDING",
  );
  const pastRequests = leaveRequests.filter((req) => req.status !== "PENDING");

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Column 1: Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <div className="sticky top-6">
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Leave Types
              </h2>
              <nav className="space-y-1">
                {allLeaveTypes.map((type) => {
                  const isActive = type.name === leaveName;
                  return (
                    <button
                      key={type.name}
                      onClick={() => handleSwitchLeaveType(type)}
                      className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                        isActive
                          ? "bg-indigo-100 text-indigo-700"
                          : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      {type.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Column 2: Main Content */}
          <main className="lg:col-span-3">
            {/* Page Header */}
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-bold text-gray-800">
                {displayName || "Leave"} History - {new Date().getFullYear()}
              </h1>
              <button
                onClick={() => navigate(-1)}
                className="text-indigo-600 font-semibold hover:text-indigo-800 transition-colors"
              >
                &larr; Back
              </button>
            </div>

            {/* Render leave requests grouped by month */}
            {sortedMonthKeys.length > 0 ? (
              <div className="space-y-6">
                {sortedMonthKeys.map((monthKey) => {
                  const monthData = groupedLeaves[monthKey];
                  return (
                    <section key={monthKey}>
                      <div className="flex justify-between items-center mb-3">
                        <h2 className="text-lg font-semibold text-gray-700">
                          {monthKey}
                        </h2>
                        <p className="font-semibold text-gray-600">
                          {monthData.totalDays} Day
                          {monthData.totalDays !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="space-y-4">
                        {monthData.requests.map((req) => (
                          <RequestCard key={req.leaveId} request={req} />
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>
            ) : (
              // Display this message if there are no leave requests at all
              <div className="flex flex-col justify-center items-center p-8 bg-white rounded-lg border">
                <img src={beachDay} alt="No Leave History" className="w-40" />
                <p className="text-gray-500 mt-5">
                  No requests found for {displayName} in{" "}
                  {new Date().getFullYear()}.
                </p>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

// A reusable card component to display request details
const RequestCard = ({ request }) => (
  <div className="bg-white p-4 rounded-lg shadow-sm border">
    <div className="flex flex-col sm:flex-row justify-between text-sm">
      <div>
        <p className="font-semibold text-gray-900">
          {formatDate(request.startDate)} to {formatDate(request.endDate)}
        </p>
        <p className="text-xs text-gray-600 mt-1">
          Reason:{" "}
          <span className="text-gray-700">{request.reason || "N/A"}</span>
        </p>
         <p className="text-xs text-gray-600 mt-1">
          Approved by: <span className="text-gray-700">{request.approvedBy?.fullName || "N/A"}</span>
        </p>
      </div>
      <div className="mt-3 sm:mt-0 text-left sm:text-right flex flex-col items-start sm:items-center">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeStyles(request.status)}`}
        >
          {request.status}
        </span>
        <p className="text-sm font-bold text-gray-800 mt-2">
          -{request.daysRequested} Day{request.daysRequested !== 1 ? "s" : ""}
        </p>
         <p className="text-xs text-gray-600 mt-1">
          Applied by: <span className="text-gray-700">{request.appliedBy?.fullName || "N/A"}</span>
        </p>
      </div>
    </div>
  </div>
);
