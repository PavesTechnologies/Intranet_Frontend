import { useEffect, useState } from "react";
import axios from "axios";
import Pagination from "../../../components/Pagination/pagination";

export default function AdminApprovalView() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const PAGE_SIZE = 5;

  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.ceil(requests.length / PAGE_SIZE);

  const paginatedRequests = requests.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );
  useEffect(() => {
    const fetchApprovals = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offer-approval/pending`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          },
        );
        setRequests(res.data || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("Failed to fetch approvals", err);
      } finally {
        setLoading(false);
      }
    };

    fetchApprovals();
  }, []);

  if (loading) return <p>Loading approvals...</p>;

  if (!requests.length)
    return <p className="text-gray-500">No approval requests</p>;

  return (
    <div className="space-y-4">
      {paginatedRequests.map((req) => (
        <div
          key={req.request_uuid}
          className="bg-white p-4 rounded-lg shadow flex justify-between items-center"
        >
          <div>
            <h3 className="font-semibold">{req.candidate_name}</h3>
            <p className="text-sm text-gray-500">{req.designation}</p>
          </div>

          <div className="flex gap-2">
            <button className="px-3 py-1 bg-green-600 text-white rounded">
              Approve
            </button>
            <button className="px-3 py-1 bg-yellow-500 text-white rounded">
              On Hold
            </button>
            <button className="px-3 py-1 bg-red-600 text-white rounded">
              Reject
            </button>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          />
        </div>
      ))}
    </div>
  );
}
