import React, {
    useEffect,
    useState,
    useCallback,        // ✅ add this
    forwardRef,
    useImperativeHandle,
} from "react";
import api from "../../../api/axiosInstance";
import { toast } from "react-toastify";
import CompOffRequestsTable from "./CompOffRequestsTable";
import LoadingSpinner from "../../../components/LoadingSpinner";
import { useLeaveWebSocket } from "../websockets/useLeaveWebSocket";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

// ✅ Outside component — stable, never recreated
const COMPOFF_EMPLOYEE_EVENTS = ["COMPOFF_APPROVED", "COMPOFF_REJECTED"];

const CompOffPage = forwardRef(
    ({ employeeId, onPendingRequestsChange }, ref) => {
    // ✅ Removed refreshKey prop — self-sufficient via WS now

    const [requests, setRequests]           = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [isLoading, setIsLoading]         = useState(false);
    const [loading, setLoading]             = useState(false);

    // ✅ Wrapped in useCallback — stable reference for useLeaveWebSocket
    const fetchRequests = useCallback(async () => {
        if (!employeeId) return;
        try {
            setIsLoading(true);
            const res = await api.get(
                `${BASE_URL}/api/compoff/employee/${employeeId}`,
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );

            if (res.data.success) {
                const allRequests = res.data.data || [];
                const pending     = allRequests.filter((r) => r.status === "PENDING");

                setRequests(allRequests);
                setPendingRequests([...pending]);
                if (onPendingRequestsChange) onPendingRequestsChange([...pending]);
            }
        } catch {
            toast.error("Failed to fetch comp-off requests");
        } finally {
            setIsLoading(false);
        }
    }, [employeeId, onPendingRequestsChange]);
    // ↑ stable — only changes if employeeId changes

    // ✅ Initial fetch
    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    // ✅ Fixed — correct channel + stable fetchRequests reference
    // "employee-update" fires when manager approves/rejects
    // Backend: template.convertAndSendToUser(employeeId, "/queue/data-updated", event)
    // WebSocketProvider: emitEvent("employee-update", data)
    useLeaveWebSocket(
        "employee-update",           // ✅ correct channel
        COMPOFF_EMPLOYEE_EVENTS,     // ✅ ["COMPOFF_APPROVED", "COMPOFF_REJECTED"]
        fetchRequests                // ✅ stable useCallback ref
    );

    useImperativeHandle(ref, () => ({
        handleCompOffSubmit,
        refreshRequests: fetchRequests,
    }));

    const handleCompOffSubmit = async (payload) => {
        try {
            setIsLoading(true);
            const res = await api.post(
                `${BASE_URL}/api/compoff/request`,
                { ...payload, employeeId },
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            toast.success(res?.data?.message || "Comp-Off request submitted!");
            await fetchRequests();
            return true;
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to submit comp-off request");
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = async (id) => {
        try {
            setLoading(true);
            await api.put(
                `${BASE_URL}/api/compoff/employee/cancel/${id}`,
                {},
                { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
            );
            toast.success("Comp-Off request cancelled!");
            await fetchRequests();
        } catch {
            toast.error("Failed to cancel request");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {isLoading && <LoadingSpinner />}

            {pendingRequests.length > 0 && !isLoading && (
                <>
                    <h2 className="m-4 text-sl font-semibold mb-4">
                        Pending Comp-Off Requests
                    </h2>
                    <CompOffRequestsTable
                        key={pendingRequests.map((r) => r.idleaveCompoff).join(",")}
                        requests={pendingRequests}
                        loading={loading}
                        onCancel={handleCancel} // ✅ moved out of JSX — stable ref
                    />
                </>
            )}
        </div>
    );
});

export default CompOffPage;