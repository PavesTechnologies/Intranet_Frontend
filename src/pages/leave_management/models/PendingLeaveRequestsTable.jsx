import React, { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "react-toastify";
import api from "../../../api/axiosInstance";
import { PencilIcon, X } from "lucide-react";
import EditLeaveModal from "./EditLeaveModal";
import LoadingSpinner from "../../../components/LoadingSpinner";
import ConfirmationModal from "./ConfirmationModal";
import Button from "../../../components/Button/Button";
import DataTable from "../../../components/patterns/DataTable";
const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// Visible cell is a single-line CSS ellipsis (`truncate`) — the table Reason
// value must stay single-line so it can't force other columns' headers to
// wrap. The complete reason is still available via the tooltip, which
// reuses BirthdayAnniversaryPanel's visual design (bg-gray-900/90
// text-white text-[10px] px-2.5 py-1.5 rounded-lg shadow-xl + pointer
// triangle), adapted two ways: (1) the tooltip itself still wraps across
// multiple lines (unlike Birthday's `whitespace-nowrap`, since names are
// short but reasons aren't), and (2) it's shown/positioned via hover state
// + a `document.body` portal instead of Birthday's pure `group-hover` CSS.
// Birthday's trigger sits in plain page flow, so a same-flow `absolute`
// tooltip never affects any ancestor's size. This trigger sits inside
// DataTable's `overflow-x-auto` wrapper, where a same-flow `absolute`
// tooltip would still be included in that ancestor's scrollable-overflow
// box and could visually "resize" the table / introduce scrollbars — the
// portal avoids that entirely.
function ReasonCell({ reason }) {
  const [show, setShow] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);

  const handleMouseEnter = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPosition({ top: rect.top - 8, left: rect.left + rect.width / 2 });
    }
    setShow(true);
  };

  return (
    <div
      ref={triggerRef}
      className="relative block w-full min-w-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
    >
      <div className="truncate text-left">{reason}</div>
      {show &&
        createPortal(
          <div
            className="fixed z-20 max-w-xs -translate-x-1/2 -translate-y-full whitespace-normal break-words rounded-lg bg-gray-900/90 px-2.5 py-1.5 text-[10px] text-white shadow-xl pointer-events-none"
            style={{ top: position.top, left: position.left }}
          >
            {reason}
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-[5px] border-transparent border-t-gray-900/90" />
          </div>,
          document.body,
        )}
    </div>
  );
}

/**
 * This is now a "presentational" component. It receives data and functions as props.
 * - `pendingLeaves`: The array of leaves to display (already paginated by the parent).
 * - `leaveBalances`: Needed for the Edit Modal.
 * - `leaveTypeNames`: An array of [{name, label}] for displaying friendly leave names.
 * - `employeeId`: The current user's ID.
 * - `refreshData`: A function from the parent to trigger a full data refresh.
 */
const PendingLeaveRequestsTable = ({
  pendingLeaves,
  leaveBalances,
  leaveTypeNames, // Receive this from the parent
  employeeId,
  refreshData, // This is the key prop for refreshing
  year,
}) => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentLeaveToEdit, setCurrentLeaveToEdit] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cancelId, setCancelId] = useState(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  // const [isLoading, setIsLoading] = useState(false);

  const handleEdit = (leave) => {
    setCurrentLeaveToEdit(leave);
    setIsEditModalOpen(true);
  };

  // When the modal succeeds, just call the refresh function from the parent.
  const handleUpdateSuccess = () => {
    refreshData();
  };

  const handleCancel = (leaveId) => {
    setCancelId(leaveId);
    setIsConfirmationOpen(true);
  };

  const confirmCancel = async () => {
    setLoading(true);
    try {
      const leaveToCancel = pendingLeaves.find((l) => l.leaveId === cancelId);
      if (!leaveToCancel) {
        toast.error("Leave not found.");
        return;
      }

      const empId = leaveToCancel.employee?.employeeId || employeeId;

      await api.put(
        `${BASE_URL}/api/leave-requests/${cancelId}/cancel/${empId}`,
        null,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.success("Leave cancelled successfully");
      refreshData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Cancel failed");
    } finally {
      setCancelId(null);
      setLoading(false);
    }
  };

  // This helper now uses the prop for leave type names.
  const getLabelFromName = (name) => {
    if (!name) return "-";

    // First, try to find a direct match from the props
    if (Array.isArray(leaveTypeNames) && leaveTypeNames.length > 0) {
      const match = leaveTypeNames.find((lt) => lt.name === name);
      if (match && match.label) {
        return match.label; // e.g., "Sick Leave"
      }
    }

    // If no match is found, format the raw name gracefully.
    // "L-SICK_LEAVE" -> "Sick Leave"
    return name
      .replace(/^L-/, "") // Removes "L-" prefix
      .replace(/_/g, " ") // Replaces underscores with spaces
      .toLowerCase() // Converts to lowercase
      .replace(/(^\w{1})|(\s+\w{1})/g, (letter) => letter.toUpperCase()); // Capitalizes each word
  };

  // Column `w-[n%]` widths sum to 100% (required by the `table-fixed`
  // layout below). Reason is the only column that ever gives up width —
  // startDate/endDate/days/actions get whatever they need to never clip a
  // value or a button (dates render as e.g. "Aug 27, 2026" plus an
  // optional " (session)" suffix, so they carry no truncation classes at
  // all), Leave Type gets enough to fit typical names (e.g. "Casual Leave")
  // in full, and Reason absorbs whatever's left, truncating to one line
  // with the complete value still available via its own tooltip.
  const columns = [
    {
      key: "leaveType",
      header: "Leave Type",
      className: "w-[15%] truncate overflow-hidden whitespace-nowrap text-center",
      render: (leave) => getLabelFromName(leave.leaveName),
    },
    {
      key: "startDate",
      header: "Start Date",
      // Renders as e.g. "Aug 27, 2026" plus an optional " (session)" suffix
      // — never truncate/clip this; the column is sized to always fit it.
      className: "w-[17%] whitespace-nowrap text-center",
      render: (leave) => (
        <>
          {new Date(leave.startDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {leave.startSession &&
            leave.startSession !== "none" &&
            leave.startSession !== "fullday" && (
              <span className="ml-1 text-gray-500">
                ({leave.startSession})
              </span>
            )}
        </>
      ),
    },
    {
      key: "endDate",
      header: "End Date",
      // Same rationale as startDate above — must stay fully visible.
      className: "w-[17%] whitespace-nowrap text-center",
      render: (leave) => (
        <>
          {new Date(leave.endDate).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
          {leave.endSession &&
            leave.endSession !== "none" &&
            leave.endSession !== "fullday" && (
              <span className="ml-1 text-gray-500">({leave.endSession})</span>
            )}
        </>
      ),
    },
    {
      key: "days",
      header: "Days",
      className: "w-[10%] whitespace-nowrap text-center",
      render: (leave) => leave.daysRequested,
    },
    {
      key: "reason",
      header: "Reason",
      className: "w-[25%] whitespace-nowrap text-center",
      render: (leave) =>
        leave.reason ? <ReasonCell reason={leave.reason} /> : "-",
    },
    {
      key: "actions",
      header: "Actions",
      className: "w-[16%] whitespace-nowrap text-center",
      render: (leave) => (
        <div className="flex items-center space-x-1 justify-center">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Edit leave request"
            onClick={() => handleEdit(leave)}
          >
            <PencilIcon className="text-blue-700 w-4 h-4" />
          </Button>
          <Button
            variant="danger"
            size="icon"
            aria-label="Cancel leave request"
            onClick={() => handleCancel(leave.leaveId)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="w-full max-w-screen-xl mx-auto">
        <DataTable
          columns={columns}
          rows={pendingLeaves}
          getRowKey={(leave) => leave.leaveId}
          // Auto table layout sizes every column to its unwrapped content
          // (every header/cell here is `whitespace-nowrap`), so the sum of
          // those natural widths can exceed the section's available width
          // and force DataTable's own `overflow-x-auto` to kick in. Fixed
          // layout instead divides the table strictly by each column's own
          // width class below, so the table always equals its container's
          // width (100%) and never grows past it — no DataTable.jsx change
          // needed, since this only targets this table's own descendant
          // `<table>` element.
          className="[&_table]:table-fixed"
        />
      </div>

      {isEditModalOpen && (
        <EditLeaveModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setCurrentLeaveToEdit(null);
          }}
          initialData={currentLeaveToEdit}
          leaveBalances={leaveBalances}
          onSuccess={handleUpdateSuccess}
          employeeId={employeeId}
          year={year}
        />
      )}

      <ConfirmationModal
        isOpen={cancelId}
        title="Cancel Leave Request"
        message="Are you sure you want to cancel this leave request?"
        onConfirm={confirmCancel}
        onCancel={() => setCancelId(null)}
        isLoading={loading}
        confirmText="Confirm"
      />
    </div>
  );
};

export default PendingLeaveRequestsTable;
