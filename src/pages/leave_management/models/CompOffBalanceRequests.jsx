import React, { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const CompOffBalanceRequests = ({ managerId }) => {
  const [pendingCompOffs, setPendingCompOffs] = useState([]);
  const [loading, setLoading] = useState(false);
  // const token = localStorage.getItem('token');

  // Fetch comp-off requests for the manager
  const fetchCompOffs = async () => {
    try {
      const res = await axios.post(
        `${BASE_URL}/api/compoff/pending`,
        { managerId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      setPendingCompOffs(
        Array.isArray(res.data) ? res.data : res.data?.data || [],
      );
    } catch (err) {
      toast.error("Failed to fetch Comp-Off requests.");
      setPendingCompOffs([]);
    } finally {
      setLoading(false);
    }
  };

  // Approve comp-off
  const handleApprove = async (compoffId) => {
    try {
      // setLoading(true);
      await axios.put(
        `${BASE_URL}/api/compoff/approve`,
        {
          managerId,
          compoffId,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success("Comp-Off approved.");
      fetchCompOffs();
    } catch {
      toast.error("Approval failed.");
    } finally {
      setLoading(false);
    }
  };

  // Reject comp-off
  const handleReject = async (compoffId) => {
    try {
      // setLoading(true);
      await axios.put(
        `${BASE_URL}/api/compoff/reject`,
        { managerId, compoffId },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );
      toast.success("Comp-Off rejected.");
      fetchCompOffs();
    } catch {
      toast.error("Rejection failed.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (managerId) fetchCompOffs();
  }, [managerId]);

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
                <th className="p-3 text-center uppercase">Employee</th>
                <th className="p-3 text-center uppercase">Dates</th>
                <th className="p-3 text-center uppercase">Duration</th>
                <th className="p-3 text-center uppercase">Note</th>
                <th className="p-3 text-center uppercase">Status</th>
                <th className="p-3 text-center uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-blue-100 text-center">
              {pendingCompOffs.map((req) => (
                <tr
                  key={req.idleaveCompoff}
                  className="hover:bg-blue-50 transition-colors text-xs"
                >
                  <td className="p-3">{req.employeeName}</td>
                  <td className="p-3">
                    {req.startDate}
                    {req.endDate && req.endDate !== req.startDate
                      ? ` to ${req.endDate}`
                      : ""}
                  </td>
                  <td className="p-3">
                    {req.halfDay
                      ? "Half Day"
                      : `${req.duration} ${req.duration <= 1 ? "Day" : "Days"}`}
                  </td>
                  <td className="p-3">{req.note}</td>
                  <td className="p-3 capitalize">{req.status}</td>
                  <td className="p-3 flex justify-center gap-2">
                    <button
                      onClick={() => handleApprove(req.idleaveCompoff)}
                      className="p-1 pr-2 text-green-600 hover:text-green-800 transition-colors"
                      title="Approve"
                      disabled={loading}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleReject(req.idleaveCompoff)}
                      className="p-1 pl-4 text-red-600 hover:text-red-800 transition-colors"
                      title="Reject"
                      disabled={loading}
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

export default CompOffBalanceRequests;
