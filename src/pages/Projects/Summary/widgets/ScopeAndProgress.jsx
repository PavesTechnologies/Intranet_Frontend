// src/pages/Projects/Summary/widgets/ScopeAndProgress.jsx
import React, { useMemo } from "react";
import { Card, Typography } from "antd";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { FiCheckSquare, FiBookmark, FiZap } from "react-icons/fi";
// import { FaBug } from "react-icons/fa";
import { motion } from "framer-motion";
import { itemVariants } from "../uiConfig";

const { Title, Text } = Typography;

const ScopeAndProgress = ({ stories, tasks, statuses /*, bugs */ }) => {
  const allWorkItems = useMemo(
    () => [...stories, ...tasks/*, ...bugs*/],
    [stories, tasks/*, bugs*/]
  );
  const totalItems = allWorkItems.length;

  const getWorkStatusId = (item) => {
    return item.status?.id ?? item.statusId ?? item.status?.statusId ?? null;
  };

  const getWorkStatusName = (item) => {
    return (
      item.status?.name ??
      item.statusName ??
      (typeof item.status === "string" ? item.status : null) ??
      item.status?.label ??
      ""
    );
  };

  const doneStatusId = useMemo(() => {
    if (!statuses || statuses.length === 0) return null;
    const doneStatus = statuses.reduce(
      (max, status) => (status.sortOrder > max.sortOrder ? status : max),
      statuses[0],
    );
    return doneStatus?.id;
  }, [statuses]);

  const completedItems = useMemo(() => {
    return allWorkItems.filter((item) => {
      const statusId = getWorkStatusId(item);
      if (doneStatusId && statusId != null) return statusId === doneStatusId;
      return getWorkStatusName(item).toLowerCase() === "done";
    }).length;
  }, [allWorkItems, doneStatusId]);

  const progressPercentage =
    totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const progressData = useMemo(
    () => [
      { name: "Completed", value: progressPercentage },
      { name: "Remaining", value: 100 - progressPercentage },
    ],
    [progressPercentage]
  );

  const statItems = useMemo(
    () => [
      // {
      //   name: "Epics",
      //   count: epics.length,
      //   icon: <FiZap className="text-purple-500 text-xl" />,
      // },
      {
        name: "User Stories",
        count: stories.length,
        icon: <FiBookmark className="text-green-500 text-xl" />,
      },
      {
        name: "Tasks",
        count: tasks.length,
        icon: <FiCheckSquare className="text-blue-500 text-xl" />,
      },
      // {
      //   name: "Bugs",
      //   count: bugs.length,
      //   icon: <FaBug className="text-red-500 text-xl" />,
      // },
    ],
    [stories.length, tasks.length/*, bugs.length*/]
  );

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      <Card
        title={
          <Title level={4} className="!mb-0 font-bold">
            Scope & Progress
          </Title>
        }
        className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
        styles={{
          header: {
            marginBottom: 0,
            borderBottom: "none",
            paddingBottom: 0,
          },
          body: { padding: "0 24px 24px 24px" },
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap- items-center">
          <div className="grid grid-cols-2 gap-3">
            {statItems.map((item) => (
              <div
                key={item.name}
                className="bg-gray-50 rounded p-3 flex flex-col items-center justify-center transition-all duration-200 hover:bg-gray-100 hover:-translate-y-0.5"
              >
                <div className="text-2xl mb-1">{item.icon}</div>
                <Text
                  type="secondary"
                  className="text-xs uppercase tracking-wide font-semibold text-center"
                >
                  {item.name}
                </Text>
                <Title
                  level={4}
                  className="!mb-0 !text-indigo-600 font-bold text-center"
                >
                  {item.count}
                </Title>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center justify-center">
            <Text
              strong
              className="mb-2 text-xs uppercase tracking-wide font-bold"
            >
              Overall Progress
            </Text>
            <div className="w-36 h-36 relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={progressData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={65}
                    startAngle={90}
                    endAngle={450}
                    dataKey="value"
                  >
                    <Cell key="completed" fill="#4f46e5" />
                    <Cell key="remaining" fill="#e5e7eb" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.12, duration: 0.28 }}
                  className="text-center"
                >
                  <Title
                    level={4}
                    className="!mb-0 !text-indigo-600 font-bold"
                  >
                    {progressPercentage}%
                  </Title>
                  <Text
                    type="secondary"
                    className="text-xs font-semibold"
                  >{`${completedItems} / ${totalItems}`}</Text>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(ScopeAndProgress);
