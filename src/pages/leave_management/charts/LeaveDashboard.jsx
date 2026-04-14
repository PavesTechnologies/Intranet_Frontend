import { useEffect, useState, useMemo, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import useLeaveConsumption from "../hooks/useLeaveConsumption";
import LeaveUsageChart from "./LeaveUsageChart";
import LoadingSpinner from "../../../components/LoadingSpinner";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const CARD_ACCENTS = {
  EARNED_LEAVE: "border-l-emerald-400",
  SICK_LEAVE: "border-l-red-400",
  COMPENSATORY_LEAVE: "border-l-blue-400",
  UNPAID_LEAVE: "border-l-stone-400",
};

const SPECIAL_THEMES = {
  MATERNITY_LEAVE: {
    bg: "bg-pink-50",
    border: "border-pink-200",
    text: "text-pink-700",
    dot: "bg-pink-400",
  },
  PATERNITY_LEAVE: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-700",
    dot: "bg-sky-400",
  },
  DEFAULT: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-700",
    dot: "bg-violet-400",
  },
};

export default function LeaveDashboard({ employeeId, refreshKey, year }) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const { leaveData, loading } = useLeaveConsumption(
    employeeId,
    refreshKey,
    year,
  );
  const navigate = useNavigate();

  useEffect(() => {
    axios
      .get(`${BASE_URL}/api/leave/types`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setLeaveTypes(res.data))
      .catch((err) =>
        toast.error(err.message || "Failed to fetch leave types"),
      );
  }, []);

  const getDisplayName = useCallback(
    (leaveName) =>
      leaveTypes.find((t) => t.name === leaveName)?.label ?? leaveName,
    [leaveTypes],
  );

  const { sortedMainLeaves, specialLeaves, allLeaveTypesForNav } =
    useMemo(() => {
      const regular = leaveData?.regular ?? [];
      const genderBased = leaveData?.genderBasedLeaveBalances ?? [];
      if (
        (regular.length === 0 && genderBased.length === 0) ||
        leaveTypes.length === 0
      )
        return {
          sortedMainLeaves: [],
          specialLeaves: [],
          allLeaveTypesForNav: [],
        };

      const desiredOrder = [
        "Earned Leave",
        "Sick Leave",
        "Unpaid Leave",
        "CompOff Leave",
      ];
      const sortedMainLeaves = [...regular].sort((a, b) => {
        const iA = desiredOrder.indexOf(getDisplayName(a.leaveType.leaveName));
        const iB = desiredOrder.indexOf(getDisplayName(b.leaveType.leaveName));
        return (iA === -1 ? Infinity : iA) - (iB === -1 ? Infinity : iB);
      });

      const allLeaveTypesForNav = [...sortedMainLeaves, ...genderBased].map(
        (l) => ({
          name: l.leaveType.leaveName,
          label: getDisplayName(l.leaveType.leaveName),
        }),
      );

      return {
        sortedMainLeaves,
        specialLeaves: genderBased,
        allLeaveTypesForNav,
      };
    }, [leaveData, leaveTypes, getDisplayName]);

  if (loading)
    return (
      <div className="text-center">
        <LoadingSpinner text="Loading Balances..." />
      </div>
    );

    // console.log("special leaves", specialLeaves);

  const isEmpty =
    leaveData?.regular?.length === 0 &&
    leaveData?.genderBasedLeaveBalances?.length === 0;

  return (
    <div className="space-y-6">
      {isEmpty && (
        <p className="text-center text-gray-400 italic py-8">
          No leave balances available in {year}.
        </p>
      )}

      {/* Main leave cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-4">
        {sortedMainLeaves.map((leave, i) => {
          const displayName = getDisplayName(leave.leaveType.leaveName);
          const accentClass =
            CARD_ACCENTS[leave.leaveType.leaveName] ?? "border-l-violet-400";

          return (
            <div
              key={leave.balanceId}
              className={`
                bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${accentClass}
                hover:shadow-md hover:-translate-y-0.5 transition-all duration-200
                p-5 flex flex-col gap-4
              `}
              style={{ animationDelay: `${i * 80}ms` }}
            >
              {/* Card header */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                    {displayName}
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {year} Balance
                  </p>
                </div>
                <button
                  onClick={() =>
                    navigate(
                      `/leave-details/${employeeId}/${leave.leaveType.leaveName}`,
                      {
                        state: {
                          leaveTypeName: displayName,
                          allLeaveTypes: allLeaveTypesForNav,
                        },
                      },
                    )
                  }
                  className="text-[11px] font-medium text-indigo-500 hover:text-indigo-700 transition-colors whitespace-nowrap ml-2"
                >
                  Details →
                </button>
              </div>

              {/* Chart */}
              <LeaveUsageChart leave={leave} />
            </div>
          );
        })}
      </div>

      {/* Special / Gender-based leaves */}
      {specialLeaves.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3 px-1">
            Special Leave Entitlements
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {specialLeaves.map((leave) => {
              const displayName = getDisplayName(leave.leaveType.leaveName);
              const theme =
                SPECIAL_THEMES[leave.leaveType.leaveName] ??
                SPECIAL_THEMES.DEFAULT;
              const remaining = Math.max(leave.remainingDays, 0);

              return (
                <div
                  key={leave.balanceId}
                  className={`${theme.bg} ${theme.border} border rounded-xl p-4 flex items-center gap-4
                    hover:shadow-sm transition-all duration-200`}
                >
                  <div
                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${theme.dot}`}
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={`text-sm font-semibold ${theme.text} truncate`}
                    >
                      {displayName}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {remaining} days remaining · {leave.totalEntitledDays ?? "-"}{" "}
                      total
                    </p>
                  </div>
                  <div
                    className={`text-xl font-bold ${theme.text} flex-shrink-0`}
                  >
                    {remaining}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
