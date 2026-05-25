import React, { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import {
  PieChart,
  Pie,
  Sector,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from "recharts";
import { toast } from "react-toastify";

// Color palette
const COLORS = [
  // "#8884d8",
  // "#82ca9d",
  // "#A28BD4",
  // "#F08080",
  "#8dd1e1",
];

// Custom slice highlight on hover
const renderActiveShape = (props) => {
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    value,
  } = props;

  const RADIAN = Math.PI / 180;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 5) * cos;
  const sy = cy + (outerRadius + 5) * sin;
  const mx = cx + (outerRadius + 20) * cos;
  const my = cy + (outerRadius + 20) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 20;
  const ey = my;

  return (
    <g>
      <Sector
        {...{ cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill }}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 4}
        outerRadius={outerRadius + 6}
        fill={fill}
      />
      {/* <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" /> */}
      {/* <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" /> */}
      {/* <text
        x={cx + Math.cos(-RADIAN * midAngle) * (innerRadius + outerRadius - 50)}
        y={cy + Math.sin(-RADIAN * midAngle) * ((innerRadius + outerRadius + 4) / 1.3)}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#333"
        className="text-xs font-semibold"
      >
        {`${payload.name}: ${value}`}
      </text> */}
    </g>
  );
};

const CustomActiveShapePieChart = ({ employeeId, refreshKey, year }) => {
  const [data, setData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const BASE_URL = window.__APP_CONFIG__.BASE_URL;
  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true);
        const res = await api.get(
          `${BASE_URL}/api/leave-requests/employee/${employeeId}/${year}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        const leaveRequests = res.data.data;

        const grouped = {};
        leaveRequests.forEach((leave) => {
          if (leave.status !== "APPROVED" && leave.status !== "PENDING") return;
          const name = leave.leaveName || "Unknown";
          grouped[name] =
            (grouped[name] || 0) + parseFloat(leave.daysRequested || 0);
        });

        const chartData = Object.entries(grouped).map(([name, value]) => ({
          name,
          value,
        }));
        setData(chartData);
      } catch (error) {
        console.error("Error fetching leave data:", error);
        toast.error(error?.message || "Failed to fetch Leave Data");
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, [employeeId, refreshKey, year]);

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  return (
    <div className="w-full bg-white rounded-lg shadow p-4 sm:p-5 hover:shadow-lg transition-all duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Leave Usage By Type
        </h3>
        <span className="text-xs sm:text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
          {year}
        </span>
      </div>
      {loading ? (
        <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
      ) : data.length > 0 ? (
        <div className="w-full flex justify-center items-center">
          <ResponsiveContainer
            width="100%"
            height={window.innerWidth < 640 ? 180 : 220}
          >
            <PieChart>
              <Pie
                activeIndex={activeIndex}
                activeShape={renderActiveShape}
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={70}
                dataKey="value"
                onMouseEnter={onPieEnter}
              >
                {data.map((entry, index) => {
                  let fillColor;
                  console.log("Entry Name:", entry);
                  switch (entry.name) {
                    case "Earned Leave":
                      fillColor = "#34d399";
                      break;
                    case "Sick Leave":
                      fillColor = "#ef4444";
                      break;
                    case "Complementry Leave":
                      fillColor = "#3b82f6";
                      break;
                    case "Unpaid Leave":
                      fillColor = "#e7e5e4";
                      break;
                    case "Maternity Leave":
                      fillColor = "#ff5883";
                      break;
                    case "Paternity Leave":
                      fillColor = "#F25117";
                      break;
                    default:
                      fillColor = COLORS[index % COLORS.length];
                  }

                  return <Cell key={`cell-${index}`} fill={fillColor} />;
                })}
              </Pie>
              {/* ✅ Tooltip shows leave type and days */}
              <Tooltip
                formatter={(value, name, props) => [`${value} days`, name]}
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #ccc",
                  fontSize: "13px",
                }}
              />
              Center label inside pie
              <text
                x="50%"
                y="50%"
                textAnchor="middle"
                dominantBaseline="middle"
                className="text-sm fill-gray-700 font-semibold"
              >
                Leave Usage
              </text>
            </PieChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-gray-400">No approved leave data to show.</p>
      )}
    </div>
  );
};

export default CustomActiveShapePieChart;
