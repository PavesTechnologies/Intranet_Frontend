// src/pages/Projects/Summary/widgets/StatusOverview.jsx
import React, { useEffect, useState } from "react";
import { Card, Typography } from "antd";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Sector,
} from "recharts";
import { motion } from "framer-motion";
import { itemVariants, DASHBOARD_COLORS } from "../uiConfig";

const { Title, Text } = Typography;

const StatusOverview = ({ workItems, statuses }) => {
  const [chartData, setChartData] = useState([]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const totalItems = workItems.length;

  useEffect(() => {
  const normalize = (s) => {
    if (!s) return "";

    // convert everything to string safely
    const str = String(s);

    return str.toLowerCase().replace(/\s+/g, "");
  };

  const statusMap = new Map(
    statuses.map((s) => [normalize(s.name), { ...s, count: 0 }])
  );

  workItems.forEach((item) => {
    const key = normalize(item?.status?.name);
    if (!key) return;

    if (statusMap.has(key)) {
      statusMap.get(key).count++;
    }
  });
    const data = Array.from(statusMap.values())
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((status, index) => ({
        name: status.name,
        value: status.count,
        percentage: totalItems > 0 ? (status.count / totalItems) * 100 : 0,
        color: DASHBOARD_COLORS[index % DASHBOARD_COLORS.length],
      }));
    setChartData(data);
  }, [workItems, statuses, totalItems]);

  console.log("WORK ITEMS:", workItems);
  console.log("STATUSES:", statuses);

  const ActiveSliceShape = (props) => {
    const {
      cx,
      cy,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      fill,
      payload,
      ...rest
    } = props;
    return (
      <g>
        <text
          x={cx}
          y={cy - 15}
          dy={8}
          textAnchor="middle"
          fill="#374151"
          className="font-bold text-base"
        >
          {payload.name}
        </text>
        <Sector
          {...rest}
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
        />
      </g>
    );
  };

  if (!totalItems && chartData.every((d) => d.value === 0)) return null;

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      <Card
        title={
          <Title level={4} className="!mb-0 font-bold">
            Status overview
          </Title>
        }
        className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
        styles={{
          header: {
            marginBottom: 0,
            borderBottom: "none",
            paddingBottom: 0,
          },
          body: { padding: "0 32px 32px 32px" },
        }}
      >
        <Text type="secondary" className="block mb-6 text-sm">
          Get a snapshot of the status of your work items.
        </Text>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
          <div className="relative h-64 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={4}
                  dataKey="value"
                  onClick={(_, index) => {
                    setActiveIndex(activeIndex === index ? null : index);
                    setHoveredIndex(null);
                  }}
                  onMouseEnter={(_, index) => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  activeIndex={
                    activeIndex !== null ? activeIndex : hoveredIndex
                  }
                  activeShape={
                    activeIndex !== null || hoveredIndex !== null ? (
                      <ActiveSliceShape />
                    ) : undefined
                  }
                >
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.name}`}
                      fill={entry.value > 0 ? entry.color : "#f3f4f6"}
                      style={{ cursor: "pointer" }}
                      opacity={
                        (activeIndex !== null && activeIndex !== index) ||
                        (hoveredIndex !== null && hoveredIndex !== index)
                          ? 0.4
                          : 1
                      }
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {activeIndex === null && hoveredIndex === null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <Title level={4} className="!mb-0 font-bold">
                  {totalItems}
                </Title>
                <Text
                  type="secondary"
                  className="text-xs font-semibold"
                >
                  Total items
                </Text>
              </div>
            )}
          </div>
          <div
            className="space-y-3 self-center w-full"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            {chartData.map((item, index) => (
              <div
                key={item.name}
                onMouseEnter={() => setHoveredIndex(index)}
                onClick={() =>
                  setActiveIndex(activeIndex === index ? null : index)
                }
                className={`p-2 -m-1 rounded-md transition-all duration-200 cursor-pointer ${
                  activeIndex === index
                    ? "bg-indigo-50 scale-[1.02]"
                    : hoveredIndex === index
                    ? "bg-gray-100 scale-[1.02]"
                    : "hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span
                      className="w-3 h-3 rounded-sm flex-shrink-0"
                      style={{
                        backgroundColor:
                          item.value > 0 ? item.color : "#f3f4f6",
                      }}
                    />
                    <Text className="text-m font-medium ml-2">
                      {item.name}
                    </Text>
                  </div>
                  <Text
                    type="secondary"
                    className="text-m font-semibold"
                  >
                    {item.value} ({Math.round(item.percentage)}%)
                  </Text>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(StatusOverview);
