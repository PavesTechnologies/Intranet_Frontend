import React, { useEffect, useMemo, useState } from "react";
import { X, ChevronDown, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import Button from "../../../components/Button/Button";
import FilterListbox from "../../../components/filter/FilterListbox";
import LoadingSpinner from "../../../components/LoadingSpinner";

const STATUS_OPTIONS = [
  { value: "BOTH", label: "Approved & Rejected" },
  { value: "APPROVED", label: "Approved only" },
  { value: "REJECTED", label: "Rejected only" },
];

const PAGE_SIZE_OPTIONS = [
  { value: 25, label: "25 / page" },
  { value: 50, label: "50 / page" },
  { value: 100, label: "100 / page" },
];

const toISODate = (date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate: toISODate(start), endDate: toISODate(end) };
};

const formatDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleString();
};

const statusBadge = (status) => {
  const base = "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium";
  if (status === "APPROVED")
    return (
      <span className={`${base} bg-green-100 text-green-700`}>
        <CheckCircle2 size={12} /> Approved
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className={`${base} bg-red-100 text-red-700`}>
        <XCircle size={12} /> Rejected
      </span>
    );
  return <span className={`${base} bg-gray-100 text-gray-700`}>{status || "—"}</span>;
};

const ReviewedTimesheetsModal = ({ isOpen, onClose }) => {
  const initial = useMemo(() => getCurrentMonthRange(), []);

  const [startDate, setStartDate] = useState(initial.startDate);
  const [endDate, setEndDate] = useState(initial.endDate);
  const [statusOption, setStatusOption] = useState("BOTH");
  const [selectedUserId, setSelectedUserId] = useState("ALL");

  const [page, setPage] = useState(0);
  const [size, setSize] = useState(50);

  const [reviewees, setReviewees] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [expandedUsers, setExpandedUsers] = useState({});
  const [expandedWeeks, setExpandedWeeks] = useState({});

  const buildQuery = (overrides = {}) => {
    const params = new URLSearchParams();
    const finalStartDate = overrides.startDate ?? startDate;
    const finalEndDate = overrides.endDate ?? endDate;
    const finalStatus = overrides.statusOption ?? statusOption;
    const finalUserId = overrides.selectedUserId ?? selectedUserId;
    const finalPage = overrides.page ?? page;
    const finalSize = overrides.size ?? size;

    if (finalStartDate) params.set("startDate", finalStartDate);
    if (finalEndDate) params.set("endDate", finalEndDate);
    if (finalUserId && finalUserId !== "ALL") params.set("userId", finalUserId);
    if (finalStatus === "APPROVED") params.append("statuses", "APPROVED");
    else if (finalStatus === "REJECTED") params.append("statuses", "REJECTED");
    // BOTH → omit statuses; server defaults to APPROVED + REJECTED
    params.set("page", String(finalPage));
    params.set("size", String(finalSize));
    return params.toString();
  };

  const fetchAudit = async (overrides = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/timesheets/review/audit?${buildQuery(overrides)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (!res.ok) throw new Error(`Failed to load reviewed timesheets (${res.status})`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      setError(e.message || "Failed to load reviewed timesheets");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchReviewees = async () => {
    try {
      const res = await fetch(
        `${window.__APP_CONFIG__.TIMESHEET_API_ENDPOINT}/api/manager/users`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      );
      if (!res.ok) return;
      const users = await res.json();
      setReviewees(Array.isArray(users) ? users : []);
    } catch (e) {
      // Silent — user filter just won't be populated
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setPage(0);
    setExpandedUsers({});
    setExpandedWeeks({});
    fetchReviewees();
    fetchAudit({ page: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleApply = () => {
    setPage(0);
    fetchAudit({ page: 0 });
  };

  const handleClear = () => {
    const fresh = getCurrentMonthRange();
    setStartDate(fresh.startDate);
    setEndDate(fresh.endDate);
    setStatusOption("BOTH");
    setSelectedUserId("ALL");
    setPage(0);
    fetchAudit({
      startDate: fresh.startDate,
      endDate: fresh.endDate,
      statusOption: "BOTH",
      selectedUserId: "ALL",
      page: 0,
    });
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
    fetchAudit({ page: nextPage });
  };

  const handleSizeChange = (nextSize) => {
    setSize(nextSize);
    setPage(0);
    fetchAudit({ size: nextSize, page: 0 });
  };

  // Group the current page rows: userId → weekId → rows
  const grouped = useMemo(() => {
    const rows = data?.content || [];
    const byUser = new Map();
    for (const row of rows) {
      const uKey = row.userId ?? "unknown";
      if (!byUser.has(uKey)) {
        byUser.set(uKey, {
          userId: row.userId,
          userName: row.userName || `User #${row.userId ?? "?"}`,
          userEmail: row.userEmail,
          weeks: new Map(),
        });
      }
      const userBucket = byUser.get(uKey);
      const wKey = row.weekId ?? `${row.weekStartDate}_${row.weekEndDate}`;
      if (!userBucket.weeks.has(wKey)) {
        userBucket.weeks.set(wKey, {
          weekId: row.weekId,
          weekStartDate: row.weekStartDate,
          weekEndDate: row.weekEndDate,
          rows: [],
        });
      }
      userBucket.weeks.get(wKey).rows.push(row);
    }
    return Array.from(byUser.values()).map((u) => ({
      ...u,
      weeks: Array.from(u.weeks.values()).sort((a, b) =>
        (b.weekStartDate || "").localeCompare(a.weekStartDate || ""),
      ),
    }));
  }, [data]);

  const totalPages = data?.totalPages ?? 0;
  const totalElements = data?.totalElements ?? 0;
  const currentPage = data?.number ?? page;

  const userOptions = useMemo(() => {
    const opts = [{ value: "ALL", label: "All Users" }];
    for (const u of reviewees) {
      if (u?.id == null) continue;
      const label = u.fullName?.trim() || u.email || `User #${u.id}`;
      opts.push({ value: String(u.id), label });
    }
    return opts;
  }, [reviewees]);

  const weekStatus = (week) => {
    const statuses = week.rows.map((r) => r.status);
    if (statuses.every((s) => s === "APPROVED")) return "APPROVED";
    if (statuses.every((s) => s === "REJECTED")) return "REJECTED";
    return "MIXED";
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">My Reviewed Timesheets</h2>
            <p className="text-sm text-gray-500">
              Audit view of timesheets you have approved or rejected.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">User</label>
              <FilterListbox
                options={userOptions}
                value={selectedUserId}
                onChange={setSelectedUserId}
              />
            </div>
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <FilterListbox
                options={STATUS_OPTIONS}
                value={statusOption}
                onChange={setStatusOption}
              />
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="secondary" size="medium" onClick={handleClear}>
                Clear
              </Button>
              <Button variant="primary" size="medium" onClick={handleApply}>
                Apply
              </Button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex justify-center py-10">
              <LoadingSpinner text="Loading reviewed timesheets..." />
            </div>
          )}

          {!loading && error && (
            <div className="text-center text-red-600 py-6">{error}</div>
          )}

          {!loading && !error && grouped.length === 0 && (
            <div className="text-center text-gray-500 py-10">
              No reviewed timesheets found for the selected filters.
            </div>
          )}

          {!loading && !error && grouped.length > 0 && (
            <div className="space-y-3">
              {grouped.map((u) => {
                const userKey = String(u.userId ?? "unknown");
                const userOpen = expandedUsers[userKey] ?? true;
                const totalWeeks = u.weeks.length;
                const totalDays = u.weeks.reduce((acc, w) => acc + w.rows.length, 0);
                return (
                  <div
                    key={userKey}
                    className="border border-gray-200 rounded-lg overflow-hidden"
                  >
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-left"
                      onClick={() =>
                        setExpandedUsers((s) => ({ ...s, [userKey]: !userOpen }))
                      }
                    >
                      <div className="flex items-center gap-2">
                        {userOpen ? (
                          <ChevronDown size={16} className="text-gray-500" />
                        ) : (
                          <ChevronRight size={16} className="text-gray-500" />
                        )}
                        <div>
                          <div className="font-semibold text-gray-900">{u.userName}</div>
                          {u.userEmail && (
                            <div className="text-xs text-gray-500">{u.userEmail}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-xs text-gray-600">
                        {totalWeeks} {totalWeeks === 1 ? "week" : "weeks"} ·{" "}
                        {totalDays} {totalDays === 1 ? "day" : "days"} reviewed
                      </div>
                    </button>

                    {userOpen && (
                      <div className="divide-y divide-gray-100">
                        {u.weeks.map((w) => {
                          const weekKey = `${userKey}-${w.weekId ?? w.weekStartDate}`;
                          const weekOpen = expandedWeeks[weekKey] ?? false;
                          const wStatus = weekStatus(w);
                          return (
                            <div key={weekKey}>
                              <button
                                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 text-left"
                                onClick={() =>
                                  setExpandedWeeks((s) => ({
                                    ...s,
                                    [weekKey]: !weekOpen,
                                  }))
                                }
                              >
                                <div className="flex items-center gap-2">
                                  {weekOpen ? (
                                    <ChevronDown size={14} className="text-gray-500" />
                                  ) : (
                                    <ChevronRight size={14} className="text-gray-500" />
                                  )}
                                  <span className="text-sm text-gray-800">
                                    {w.weekStartDate} – {w.weekEndDate}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({w.rows.length}{" "}
                                    {w.rows.length === 1 ? "day" : "days"})
                                  </span>
                                </div>
                                {wStatus === "MIXED" ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                                    Mixed
                                  </span>
                                ) : (
                                  statusBadge(wStatus)
                                )}
                              </button>
                              {weekOpen && (
                                <div className="px-4 pb-3">
                                  <table className="w-full text-sm border-t border-gray-100">
                                    <thead>
                                      <tr className="text-xs text-gray-500 uppercase tracking-wide">
                                        <th className="text-left py-2 pr-2 font-medium">
                                          Work Date
                                        </th>
                                        <th className="text-left py-2 pr-2 font-medium">
                                          Hours
                                        </th>
                                        <th className="text-left py-2 pr-2 font-medium">
                                          Status
                                        </th>
                                        <th className="text-left py-2 pr-2 font-medium">
                                          Reviewed At
                                        </th>
                                        <th className="text-left py-2 font-medium">
                                          Comments
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {w.rows.map((r) => (
                                        <tr
                                          key={r.reviewId}
                                          className="border-t border-gray-50"
                                        >
                                          <td className="py-2 pr-2 text-gray-800">
                                            {r.workDate || "—"}
                                          </td>
                                          <td className="py-2 pr-2 text-gray-800">
                                            {r.hoursWorked ?? "—"}
                                          </td>
                                          <td className="py-2 pr-2">
                                            {statusBadge(r.status)}
                                          </td>
                                          <td className="py-2 pr-2 text-gray-600">
                                            {formatDateTime(r.reviewedAt)}
                                          </td>
                                          <td className="py-2 text-gray-600">
                                            {r.comments || "—"}
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-600">
            {totalElements} reviewed {totalElements === 1 ? "entry" : "entries"}
            {totalPages > 0 && (
              <>
                {" · "}Page {currentPage + 1} of {totalPages}
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <div className="min-w-[130px]">
              <FilterListbox
                options={PAGE_SIZE_OPTIONS}
                value={size}
                onChange={handleSizeChange}
              />
            </div>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 0 || loading}
            >
              Prev
            </Button>
            <Button
              variant="secondary"
              size="medium"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage + 1 >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewedTimesheetsModal;
