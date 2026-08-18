import React, { useEffect, useState, useMemo } from "react";
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

const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const WeeklyPattern = ({ employeeId, refreshKey, year }) => {
  const { leaveData, loading, error } = useLeaveData(employeeId, refreshKey, year);
  

  const data = useMemo(() => {
    const counts = [0, 0, 0, 0, 0, 0, 0]; // Mon–Sun

    leaveData.forEach((leave) => {
      const start = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      const isMaternity = leave.leaveType?.leaveName
        ?.toLowerCase()
        .includes("maternity");

      let validDays = 0;
      let current = new Date(start);
      while (current <= end) {
        const jsDay = current.getDay();
        if (isMaternity || (jsDay !== 0 && jsDay !== 6)) validDays++;
        current.setDate(current.getDate() + 1);
      }

      if (validDays === 0) return;

      const perDayValue = parseFloat(leave.daysRequested) / validDays;
      current = new Date(start);

      while (current <= end) {
        const jsDay = current.getDay(); // 0=Sun
        const dayIdx = (jsDay + 6) % 7; // Convert to Mon=0...Sun=6
        if (isMaternity || (jsDay !== 0 && jsDay !== 6)) {
          counts[dayIdx] += perDayValue;
        }
        current.setDate(current.getDate() + 1);
      }
    });

    return dayOrder.map((day, i) => ({
      day,
      leaveDays: parseFloat(counts[i].toFixed(2)),
    }));
  }, [leaveData]);

  return (
    <div className="w-full bg-white rounded-lg shadow p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Weekly Leave Pattern
        </h3>
        <span className="text-xs sm:text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
          {new Date().toLocaleDateString("en-US", {
            month: "short",
          })} {" "}
          {year}
        </span>
      </div>

      {/* Chart */}
      {loading ? (
        <InlineLoader text="Loading..." />
      ) : leaveData.length > 0 ? (
        <div className="h-36 sm:h-44 md:h-52 lg:h-56 xl:h-45">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
            >
              {/* Subtle Grid */}
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                opacity={0.1}
              />

              {/* X-Axis for Days */}
              <XAxis
                dataKey="day"
                tickLine={false}
                axisLine={false}
                tick={{
                  fontSize: 10,
                  fill: "#4B5563",
                }}
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

              {/* Small line indicators under bars */}
              <Customized
                component={({ width, height, xAxisMap }) => {
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

export default WeeklyPattern;
