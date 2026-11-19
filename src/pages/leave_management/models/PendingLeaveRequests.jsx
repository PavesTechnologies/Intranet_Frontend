import React, { useEffect, useState, useRef, useCallback } from "react";
import api from "../../../api/axiosInstance";
import PendingLeaveRequestsTable from "./PendingLeaveRequestsTable";
import { TableSkeleton } from "../../../components/patterns/Loaders";
import { useAuth } from "../../../contexts/AuthContext";
import { toast } from "react-toastify";
import Pagination from "../../../components/Pagination/pagination";
import NoPendingLeaves from "../../../components/icons/no_pending_leaves.svg";
import { Fonts } from "../../../components/Fonts/Fonts";
import { useLeaveWebSocket } from "../websockets/useLeaveWebSocket";

// ✅ Removed refreshKey prop — self-sufficient now
const PendingLeaveRequests = ({ refresh, year, onLeaveCancel }) => {
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  const employeeId = useAuth()?.user?.user_id;
  const BASE_URL = window.__APP_CONFIG__.BASE_URL;
  const ITEMS_PER_PAGE = 5;

  // ─── Single stable fetchData ──────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (!employeeId) return;
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const [leaveReqRes, leaveTypeRes, balanceRes] = await Promise.all([
        api.get(
          `${BASE_URL}/api/leave-requests/employee/pending/${employeeId}/${year}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
        api.get(`${BASE_URL}/api/leave/get-all-leave-types`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        api.get(
          `${BASE_URL}/api/leave-balance/employee/drop/${employeeId}/${year}`,
          { headers: { Authorization: `Bearer ${token}` } }
        ),
      ]);

      const allLeaves = Array.isArray(leaveReqRes.data?.data)
        ? leaveReqRes.data.data : [];


      setPendingLeaves(
        allLeaves.filter((l) => String(l.status).toUpperCase() === "PENDING")
      );
      setLeaveTypes(leaveTypeRes.data || []);
      setLeaveBalances(balanceRes.data || {});
      setError(null);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch pending leave requests.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, year, BASE_URL]);
  // ↑ Only recreated when employeeId/year/BASE_URL change

  // ─── ONE useEffect — no duplicate ─────────────────────────────────────
  useEffect(() => {
    fetchData();
  }, [fetchData, refresh]); // refresh can trigger a manual refresh from parent
  // ↑ fetchData is stable so this runs only on mount + year/employeeId change

  // ─── ✅ useLeaveWebSocket actually CALLED now ──────────────────────────
  // Listens for manager approve/reject → refreshes this table only
  useLeaveWebSocket(
    "employee-update",
    ["LEAVE_APPROVED", "LEAVE_REJECTED", "LEAVE_UPDATED"],
    fetchData
  );

  // ─── Stable ref for grandchild ────────────────────────────────────────
  const handleChildRefresh = useCallback(() => {
    fetchData();
    onLeaveCancel?.(); // Notify parent if a leave was cancelled
  }, [fetchData]);

  // ─── Pagination ───────────────────────────────────────────────────────
  const totalPages = Math.ceil(pendingLeaves.length / ITEMS_PER_PAGE);
  const paginatedLeaves = pendingLeaves.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <>
      {loading ? (
        <TableSkeleton rows={5} columns={6} />
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : pendingLeaves.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="flex flex-row items-center justify-center gap-4 text-left">
            <div className="flex items-center justify-center">
              <img src={NoPendingLeaves} alt="" className="h-24 w-24 object-contain" />
            </div>
            <div>
              <p className={Fonts.subheading}>Cheers! No pending leave requests.</p>
              <p className="max-w-sm text-sm text-gray-500">Request leave on the above!</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          <PendingLeaveRequestsTable
            pendingLeaves={paginatedLeaves}
            leaveBalances={leaveBalances}
            leaveTypeNames={leaveTypes}
            employeeId={employeeId}
            refreshData={handleChildRefresh}
            year={year}
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage(p => Math.max(1, p - 1))}
              onNext={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            />
          )}
        </>
      )}
    </>
  );
};

export default PendingLeaveRequests;
