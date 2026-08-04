// src/components/Summary/widgets/PriorityDistribution.jsx
"use client";

import React, { useMemo, useRef } from "react";
import { Card, Typography } from "antd";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
} from "recharts";
import { motion } from "framer-motion";
import { itemVariants } from "../../../pages/Projects/Summary/uiConfig";
import { useInView } from "framer-motion";

const { Title, Text } = Typography;

const PriorityDistribution = ({ tasks, stories /*, bugs */ }) => {
  const data = useMemo(() => {
    const allPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL", "UNSPECIFIED"];
    const dataMap = new Map(
      allPriorities.map((p) => [p, { priority: p, Tasks: 0, Stories: 0/*, Bugs: 0*/ }])
    );
    const allItems = [
      ...(tasks || []).map((item) => ({ ...item, type: "Tasks" })),
      ...(stories || []).map((item) => ({ ...item, type: "Stories" })),
      // ...(bugs || []).map((item) => ({ ...item, type: "Bugs" })),
    ];

    allItems.forEach((item) => {
      const p = item.priority?.toUpperCase() || "UNSPECIFIED";
      if (dataMap.has(p) && item.type) dataMap.get(p)[item.type]++;
    });

    return Array.from(dataMap.values()).filter(
      (entry) => entry.Tasks > 0 || entry.Stories > 0 /*(|| entry.Bugs > 0)*/
    );
  }, [tasks, stories /*, bugs*/]);

  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  if (!data.length) return null;

  return (
    <motion.div
      ref={ref}
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      className="h-full"
    >
      <Card
        title={<Title level={4} className="!mb-0 font-bold">Priority Distribution</Title>}
        className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200 h-full flex flex-col"
        styles={{
          header: { marginBottom: 0, borderBottom: "none", paddingBottom: 0 },
          body: {
            padding: "0 32px 32px 32px",
            flex: "1 1 auto",
            display: "flex",
            flexDirection: "column",
          },
        }}
      >
        <Text
          type="secondary"
          className="block mb-6 text-sm uppercase tracking-wide font-semibold"
        >
          Breakdown by priority
        </Text>

        <div className="w-full" style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              margin={{ top: 8, right: 10, left: 8, bottom: 6 }}
              barGap={6}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(79, 70, 229, 0.06)" />
              <XAxis dataKey="priority" />
              <YAxis allowDecimals={false} />
              <RechartsTooltip cursor={{ fill: "rgba(79, 70, 229, 0.03)" }} />
              <Legend wrapperStyle={{ paddingTop: 6 }} />
              <Bar
                dataKey="Tasks"
                fill="#4f46e5"
                radius={[6, 6, 0, 0]}
                barSize={28}
                animationDuration={isInView ? 800 : 0}
              />
              <Bar
                dataKey="Stories"
                fill="#7c3aed"
                radius={[6, 6, 0, 0]}
                barSize={28}
                animationDuration={isInView ? 800 : 0}
                animationDelay={100}
              />
              {/* <Bar
                dataKey="Bugs"
                fill="#06b6d4"
                radius={[6, 6, 0, 0]}
                barSize={28}
                animationDuration={isInView ? 800 : 0}
                animationDelay={200}
              /> */}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(PriorityDistribution);
