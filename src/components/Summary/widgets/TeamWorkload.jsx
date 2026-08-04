// src/components/Summary/widgets/TeamWorkload.jsx
"use client";

import React, { useMemo, useEffect, useState } from "react";
import { Card, Typography, Avatar } from "antd";
import DistributionBar from "./DistributionBar";
import { motion } from "framer-motion";
import { itemVariants, DASHBOARD_COLORS } from "../../../pages/Projects/Summary/uiConfig";
import { FiUser } from "react-icons/fi";

const { Title, Text } = Typography;

const TeamWorkload = ({ workItems, users }) => {
  const [workloadData, setWorkloadData] = useState([]);
  const totalItems = workItems.length;

  useEffect(() => {
    if (!users || !workItems) return;

    const userMap = new Map(users.map((u) => [u.id, { ...u, count: 0 }]));
    const unassigned = { id: null, name: "Unassigned", count: 0, color: "#9ca3af" };

    workItems.forEach((item) => {
      const assignedTo = item.assigneeId || item.assignee?.id;
      if (assignedTo && userMap.has(assignedTo)) {
        userMap.get(assignedTo).count++;
      } else {
        unassigned.count++;
      }
    });

    const activeUsers = Array.from(userMap.values()).filter((u) => u.count > 0);
    const finalUsers =
      unassigned.count > 0 ? [unassigned, ...activeUsers] : activeUsers;

    const mapped = finalUsers.map((user, index) => ({
      ...user,
      percentage: totalItems > 0 ? (user.count / totalItems) * 100 : 0,
      initials: user.id
        ? user.name?.split(" ").map((n) => n[0]).join("").toUpperCase() || "?"
        : <FiUser />,
      color: user.id
        ? DASHBOARD_COLORS[index % DASHBOARD_COLORS.length]
        : "#9ca3af",
    }));

    setWorkloadData(mapped);
  }, [workItems, users, totalItems]);

  if (!totalItems) return null;

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      <Card
        title={<Title level={4} className="!mb-0 font-bold">Team workload</Title>}
        className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
        styles={{
          header: { marginBottom: 0, borderBottom: "none", paddingBottom: 0 },
          body: { padding: "0 32px 32px 32px" },
        }}
      >
        <Text type="secondary" className="block !mt-0 !mb-6 text-sm">
          Monitor the capacity of your team.
        </Text>

        <div className="space-y-3">
          {workloadData.map((user) => (
            <div
              key={user.name}
              className="flex items-center p-1 -m-1 rounded-md transition-colors hover:bg-gray-50"
            >
              <div className="w-2/5 flex items-center">
                <Avatar
                  size="small"
                  style={{
                    backgroundColor: user.color,
                    marginRight: 12,
                    fontWeight: "bold",
                  }}
                >
                  {user.initials}
                </Avatar>
                <Text className="text-sm font-medium">
                  {user.name || user.email || "Unassigned"}
                </Text>
              </div>
              <div className="w-3/5">
                <DistributionBar
                  percentage={user.percentage}
                  count={user.count}
                  total={totalItems}
                  isInteractive={false}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(TeamWorkload);
