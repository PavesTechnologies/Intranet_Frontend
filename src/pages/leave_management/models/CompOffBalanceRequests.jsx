import React, { useEffect, useState, useCallback, useRef } from "react";
import { Check, X } from "lucide-react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import { useLeaveWebSocket } from "../websockets/useLeaveWebSocket";

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
        setLoading(true);
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
            setLoading(false);
        }
    };

    const handleReject = async (compoffId) => {
        setLoading(true);
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
            setLoading(false);
        }
    };

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

            {pendingCompOffs.length === 0 ? (
                <p className="text-gray-500 italic font-semibold">
                    No pending Comp-Off requests for your team.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse rounded-lg overflow-hidden shadow-sm">
                        <thead>
                            <tr className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white text-xs">
                                <th className="p-3">Employee</th>
                                <th className="p-3">Dates</th>
                                <th className="p-3">Duration</th>
                                <th className="p-3">Note</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-blue-100 text-center">
                            {pendingCompOffs.map((req) => (
                                <tr key={req.idleaveCompoff} className="hover:bg-blue-50 text-xs">
                                    <td className="p-3">{req.employeeName}</td>
                                    <td className="p-3">
                                        {req.startDate}
                                        {req.endDate && req.endDate !== req.startDate
                                            ? ` to ${req.endDate}` : ""}
                                    </td>
                                    <td className="p-3">
                                        {req.halfDay ? "Half Day" : `${req.duration} ${req.duration <= 1 ? "Day" : "Days"}`}
                                    </td>
                                    <td className="p-3">{req.note}</td>
                                    <td className="p-3 capitalize">{req.status}</td>
                                    <td className="p-3">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleApprove(req.idleaveCompoff)}
                                                className="text-green-600 hover:text-green-800"
                                                disabled={loading}
                                            >
                                                <Check className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleReject(req.idleaveCompoff)}
                                                className="text-red-600 hover:text-red-800"
                                                disabled={loading}
                                            >
                                                <X className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
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