// src/pages/Projects/Summary/widgets/EpicProgress.jsx
"use client";

import React, { useEffect, useState } from "react";
import { Card, Typography, Tooltip } from "antd";
import { FiZap } from "react-icons/fi";
import { motion } from "framer-motion";
import { itemVariants, DASHBOARD_COLORS } from "../uiConfig";

const { Title, Text } = Typography;

const EpicTooltipContent = ({ epic, sortedStatuses }) => (
  <div className="text-xs">
    <Text strong className="text-white text-sm block mb-1">{epic.name}</Text>
    {epic.statusDistribution
      .filter(dist => dist.count > 0)
      .map(dist => {
        const status = sortedStatuses.find(s => s.id === dist.id);
        return (
          <div key={dist.id} className="flex items-center">
            <span
              className="w-2.5 h-2.5 rounded-sm mr-2"
              style={{ backgroundColor: status?.color || '#gray' }}
            />
            <Text className="text-gray-200">{dist.name}: {dist.count}</Text>
          </div>
        );
      })}
  </div>
);

const EpicProgress = ({ epics, stories, tasks, statuses /*, bugs */ }) => {
  const [epicProgressData, setEpicProgressData] = useState([]);
  const [sortedStatuses, setSortedStatuses] = useState([]);

  useEffect(() => {
    if (!statuses || statuses.length === 0) {
      setEpicProgressData([]);
      return;
    }

    const localSortedStatuses = [...statuses]
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
      .map((status, index) => ({
        ...status,
        color: DASHBOARD_COLORS[index % DASHBOARD_COLORS.length],
      }));
    setSortedStatuses(localSortedStatuses);

    const allWorkItems = [...(stories || []), ...(tasks || []) /*, ...(bugs || [])*/].filter(
      Boolean,
    );

    const processed = (epics || []).map((epic) => {
      const children = allWorkItems.filter((item) => {
        const epicId = item.epicId ?? item.epic?.id ?? item.epic_id;
        return epicId === epic.id;
      });

      const statusCounts = new Map(localSortedStatuses.map((s) => [s.id, 0]));
      children.forEach((child) => {
        const statusId = child.status?.id ?? child.statusId;
        if (statusId) {
          statusCounts.set(statusId, (statusCounts.get(statusId) || 0) + 1);
        }
      });

      const total = children.length;
      const dist = localSortedStatuses.map((s) => ({
        id: s.id,
        name: s.name,
        color: s.color,
        count: statusCounts.get(s.id) || 0,
        percentage: total > 0 ? ((statusCounts.get(s.id) || 0) / total) * 100 : 0,
      }));

      return { ...epic, total, statusDistribution: dist };
    });

    setEpicProgressData(processed);
  }, [epics, stories, tasks, statuses /*, bugs*/]);

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      <Card
        title={<Title level={4} className="!mb-0 font-bold">Epic progress</Title>}
        className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
        styles={{
          header: { marginBottom: 0, borderBottom: "none", paddingBottom: 0 },
          body: { padding: "0 32px 32px 32px" },
        }}
      >
        <Text type="secondary" className="block mb-6 text-sm">
          See how your epics are progressing at a glance.
        </Text>

        {/* Legend */}
        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 mb-4">
          {sortedStatuses.map((status) => (
            <div key={status.id} className="flex items-center">
              <span
                className="w-3 h-3 rounded-sm mr-2"
                style={{ backgroundColor: status.color }}
              />
              <Text className="text-xs font-semibold">{status.name}</Text>
            </div>
          ))}
        </div>

        {/* EPICS LIST */}
        <div className="space-y-3">
          {epicProgressData.map((epic) => (
            <div key={epic.id}>
              <Tooltip
                title={<EpicTooltipContent epic={epic} sortedStatuses={sortedStatuses} />}
                placement="top"
                arrow={false}
                styles={{
                  popup: {
                    backgroundColor: "rgba(23, 23, 23, 0.9)",
                    borderRadius: "6px",
                    padding: "8px 10px",
                  },
                }}
              >
                <div className="flex items-center gap-2 mb-1 cursor-default">
                  <FiZap className="text-purple-500" />
                  <Text strong className="text-sm">
                    {epic.key || `EPIC-${epic.id}`}
                  </Text>
                  <Text className="text-sm">{epic.name}</Text>
                </div>
              </Tooltip>
              <div className="w-full h-6 flex rounded overflow-hidden text-gray-800 bg-slate-100">
                {epic.statusDistribution.map((status, index) => (
                  <motion.div
                    key={status.id}
                    className="flex items-center justify-center"
                    style={{ backgroundColor: status.color }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${status.percentage}%` }}
                    transition={{
                      duration: 0.6,
                      ease: "easeOut",
                      delay: index * 0.05,
                    }}
                    viewport={{ once: true, amount: 0.5 }}
                  >
                    {status.percentage > 10 && (
                      <span className="text-xs font-semibold text-white px-1">
                        {Math.round(status.percentage)}%
                      </span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(EpicProgress);
