import React, { useEffect, useState, useCallback, useRef } from "react";
import { Check, X } from "lucide-react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import { useLeaveWebSocket } from "../websockets/useLeaveWebSocket";
import Button from "../../../components/Button/Button";
import DataTable from "../../../components/patterns/DataTable";
import StatusBadge from "../../../components/patterns/StatusBadge";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// ✅ Outside component — stable reference, never recreated
const COMPOFF_EVENTS = [
    "COMPOFF_REQUESTED",
    "COMPOFF_CANCELLED",
    "COMPOFF_UPDATED",
    "COMPOFF_APPROVED",
    "COMPOFF_REJECTED",
];

const CompOffBalanceRequests = ({ managerId }) => {
    const [pendingCompOffs, setPendingCompOffs] = useState([]);
    const [loading, setLoading] = useState(false);
    // Tracks an in-flight approve/reject action (row id + action type), kept
    // separate from `loading` (table-data fetch) so a single row action no
    // longer replaces the whole DataTable with a skeleton — see
    // docs/ui/phase-2-leave-management.md ("P2.10 Follow-up").
    const [actionState, setActionState] = useState({ id: null, type: null });
    const fetchLock = useRef(false);

    // ✅ Stable fetch function
    const fetchCompOffs = useCallback(async () => {
        if (!managerId || fetchLock.current) return;

        fetchLock.current = true;
        setLoading(true);

        try {
            const res = await api.post(
                `${BASE_URL}/api/compoff/pending`,
                { managerId },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            setPendingCompOffs(
                Array.isArray(res.data) ? res.data : res.data?.data || []
            );
            // console.log("Fetched Comp-Off requests:", res.data);
        } catch {
            toast.error("Failed to fetch Comp-Off requests.");
            setPendingCompOffs([]);
        } finally {
            setLoading(false);
            setTimeout(() => { fetchLock.current = false; }, 500);
        }
    }, [managerId]); // ✅ only managerId — stable

    const handleApprove = async (compoffId) => {
        setActionState({ id: compoffId, type: "approve" });
        try {
            await api.put(
                `${BASE_URL}/api/compoff/approve`,
                { managerId, compoffId },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            toast.success("Comp-Off approved.");
            fetchCompOffs();
        } catch {
            toast.error("Approval failed.");
        } finally {
            setActionState({ id: null, type: null });
        }
    };

    const handleReject = async (compoffId) => {
        setActionState({ id: compoffId, type: "reject" });
        try {
            await api.put(
                `${BASE_URL}/api/compoff/reject`,
                { managerId, compoffId },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            toast.success("Comp-Off rejected.");
            fetchCompOffs();
        } catch {
            toast.error("Rejection failed.");
        } finally {
            setActionState({ id: null, type: null });
        }
    };

    const isActionLoading = actionState.id !== null;

    // ✅ Initial load
    useEffect(() => {
        fetchCompOffs();
    }, [fetchCompOffs]);

    // ✅ Fixed — array passed directly, stable callback reference
    useLeaveWebSocket(
        "manager-update",
        COMPOFF_EVENTS,
        fetchCompOffs
    );

    return (
        <div className="bg-white p-6 rounded-lg shadow-sm border-l-4 border-blue-500 mb-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                Comp-Off Balance Requests
            </h3>
            <div className="border-b-2 border-blue-500 w-16 mb-4"></div>

            <DataTable
                loading={loading}
                emptyTitle="No pending Comp-Off requests for your team."
                getRowKey={(req) => req.idleaveCompoff}
                rows={pendingCompOffs}
                columns={[
                    { key: "employeeName", header: "Employee", className: "text-center" },
                    {
                        key: "dates",
                        header: "Dates",
                        className: "text-center",
                        render: (req) =>
                            `${req.startDate}${req.endDate && req.endDate !== req.startDate ? ` to ${req.endDate}` : ""}`,
                    },
                    {
                        key: "duration",
                        header: "Duration",
                        className: "text-center",
                        render: (req) =>
                            req.halfDay ? "Half Day" : `${req.duration} ${req.duration <= 1 ? "Day" : "Days"}`,
                    },
                    { key: "note", header: "Note", className: "text-center" },
                    {
                        key: "status",
                        header: "Status",
                        className: "text-center",
                        render: (req) => <StatusBadge status={req.status} size="sm" />,
                    },
                    {
                        key: "actions",
                        header: "Action",
                        className: "text-center",
                        render: (req) => (
                            <div className="flex justify-center gap-2">
                                <Button
                                    variant="primary"
                                    size="icon"
                                    onClick={() => handleApprove(req.idleaveCompoff)}
                                    className="text-green-600 hover:text-green-800"
                                    disabled={isActionLoading}
                                    aria-label="Approve comp-off request"
                                >
                                    <Check className="w-4 h-4" />
                                </Button>
                                <Button
                                    variant="danger"
                                    size="icon"
                                    onClick={() => handleReject(req.idleaveCompoff)}
                                    className="text-red-600 hover:text-red-800"
                                    disabled={isActionLoading}
                                    aria-label="Reject comp-off request"
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        ),
                    },
                ]}
            />
            {/*
            {loading && (
                <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
                    <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                </div>
            )} */}
        </div>
    );
};

export default CompOffBalanceRequests;