import React, { useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Customized,
} from "recharts";
import useLeaveData from "../hooks/useLeaveData";
import { InlineLoader } from "../../../components/patterns/Loaders";

const monthsOrder = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MonthlyStats = ({ employeeId, refreshKey, year }) => {
  const { leaveData, loading, error } = useLeaveData(employeeId, refreshKey, year);

  // useEffect(() => {}, [leaveData, refreshKey]);

  const data = useMemo(() => {
    const monthlyCounts = {};
    leaveData.forEach((request) => {
      const monthIndex = new Date(request.startDate).getMonth();
      const monthName = monthsOrder[monthIndex];
      const days = parseFloat(request.daysRequested) || 0;
      monthlyCounts[monthName] = (monthlyCounts[monthName] || 0) + days;
    });

    return monthsOrder.map((month) => ({
      month,
      leaveDays: monthlyCounts[month] || 0,
    }));
  }, [leaveData]);

  return (
    <div className="w-full bg-white rounded-lg shadow p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Monthly Leave Days
        </h3>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
          {year}
        </span>
      </div>

      {loading ? (
        <InlineLoader text="Loading..." />
      ) : leaveData.length > 0 ? (
        <div className="h-36 sm:h-44 md:h-52 lg:h-56 xl:h-45">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 0, left: 0, bottom: 20 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={0.1}
              />

              {/* Month Axis */}
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 10, fill: "#4B5563" }}
              />

              {/* Tooltip */}
              <Tooltip
                cursor={{ fill: "rgba(99,102,241,0.08)" }}
                formatter={(value) => [`${value} day(s)`, "Leave Days"]}
                contentStyle={{
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  border: "1px solid #E5E7EB",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.05)",
                }}
              />

              {/* Vertical month tick indicators */}
              <Customized
                component={({ width, height, xAxisMap }) => {
                  // ✅ xAxisMap is an object; safely extract ticks
                  const xAxisKey = Object.keys(xAxisMap || {})[0];
                  const ticks = xAxisKey ? xAxisMap[xAxisKey].ticks : [];

                  return (
                    <g>
                      {ticks.map((tick, index) => (
                        <line
                          key={index}
                          x1={tick.coordinate}
                          x2={tick.coordinate}
                          y1={height - 15}
                          y2={height - 10}
                          stroke="#9CA3AF"
                          strokeWidth="1.2"
                          opacity="0.7"
                        />
                      ))}
                    </g>
                  );
                }}
              />

              {/* Bars */}
              <Bar
                dataKey="leaveDays"
                fill="#6366f1"
                radius={[5, 5, 0, 0]}
                barSize={25}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No data available</p>
      )}
    </div>
  );
};

export default MonthlyStats;
