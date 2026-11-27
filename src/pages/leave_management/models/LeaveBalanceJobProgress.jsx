import React, { useState, useEffect, useRef } from 'react';
import api from "../../../api/axiosInstance";
import { X, CheckCircle, XCircle, Loader } from 'lucide-react';
import Button from "../../../components/Button/Button";
import StatusBadge from "../../../components/patterns/StatusBadge";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const LeaveBalanceJobProgress = ({ jobId, onClose }) => {
    const [job, setJob] = useState(null);
    const intervalRef = useRef(null);

    useEffect(() => {
        if (!jobId) return;

        // fetch immediately on mount
        fetchJob();

        // then poll every 3 seconds
        intervalRef.current = setInterval(fetchJob, 3000);

        return () => clearInterval(intervalRef.current);
    }, [jobId]);

    const fetchJob = async () => {
        try {
            const res = await api.get(
                `${BASE_URL}/api/leave/leave-balance-job/${jobId}`,
                {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );
            const data = res.data?.data;
            setJob(data);

            // stop polling when job is terminal
            if (['COMPLETED', 'FAILED', 'ROLLED_BACK'].includes(data?.status)) {
                clearInterval(intervalRef.current);
            }
        } catch (e) {
            console.error('Failed to fetch job status', e);
        }
    };

    if (!job) return null;

    const isRunning  = job.status === 'RUNNING' || job.status === 'PENDING';
    const isFailed   = job.status === 'FAILED' || job.status === 'ROLLED_BACK';
    const isDone     = job.status === 'COMPLETED';

    const barColor = isDone   ? 'bg-green-500'
                   : isFailed ? 'bg-red-500'
                   : 'bg-indigo-500';

    const statusIcon = isDone   ? <CheckCircle className="w-4 h-4 text-green-600" />
                     : isFailed ? <XCircle className="w-4 h-4 text-red-600" />
                     : <Loader className="w-4 h-4 text-indigo-500 animate-spin" />;

    const statusText = isDone   ? 'Completed'
                     : isFailed ? 'Failed'
                     : 'Processing...';

    return (
        <div className="fixed bottom-6 right-6 w-84 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden">

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
                <div className="flex items-center gap-2">
                    {statusIcon}
                    <span className="text-sm font-semibold text-gray-700">
                        Leave Balance Creation
                    </span>
                </div>
                {/* manual close — always visible */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    aria-label="Close"
                    className="text-gray-400 hover:text-gray-600"
                >
                    <X className="w-4 h-4" />
                </Button>
            </div>

            {/* Body */}
            <div className="px-4 py-3 space-y-3">
                <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-gray-600">
                        {job.leaveTypeName}
                    </p>
                    <StatusBadge
                        status={job.status}
                        label={statusText}
                        tone={isDone ? "success" : isFailed ? "danger" : "info"}
                        size="sm"
                    />
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                        className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
                        style={{ width: `${job.progressPercentage || 0}%` }}
                    />
                </div>

                {/* Stats */}
                <div className="flex justify-between text-xs text-gray-500">
                    <span>
                        {job.processedEmployees} / {job.totalEmployees} employees
                    </span>
                    <span className="font-medium">
                        {job.progressPercentage || 0}%
                    </span>
                </div>

                {/* Error message */}
                {isFailed && job.errorMessage && (
                    <p className="text-xs text-red-500 bg-red-50 rounded p-2">
                        {job.errorMessage}
                    </p>
                )}

                {/* Info messages */}
                {isRunning && (
                    <p className="text-xs text-gray-400 italic">
                        You can continue using the system while this runs.
                    </p>
                )}
                {isDone && (
                    <p className="text-xs text-green-600">
                        All employee leave balances created successfully.
                    </p>
                )}
                {isFailed && (
                    <p className="text-xs text-red-500">
                        Leave type has been rolled back. Please try again.
                    </p>
                )}
            </div>
        </div>
    );
};

export default LeaveBalanceJobProgress;