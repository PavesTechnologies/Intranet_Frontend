// src/pages/Projects/Summary/widgets/TypesOfWork.jsx
"use client";

import React, { useMemo } from "react";
import { Card, Typography } from "antd";
import DistributionBar from "./DistributionBar";
import { motion } from "framer-motion";
import { itemVariants } from "../uiConfig";
import { FiCheckSquare, FiBookmark, FiZap } from "react-icons/fi";
// import { FaBug } from "react-icons/fa";

const { Title, Text } = Typography;

const TypesOfWork = ({ tasks, stories, epics /*, bugs */ }) => {
  const workTypes = useMemo(
    () => [
      { name: "Tasks", items: tasks, icon: <FiCheckSquare className="text-blue-500" /> },
      { name: "Stories", items: stories, icon: <FiBookmark className="text-green-500" /> },
      // { name: "Bugs", items: bugs, icon: <FaBug className="text-red-500" /> },
    ],
    [tasks, stories, epics/*, bugs*/]
  );

  const totalItems = useMemo(
    () => workTypes.reduce((sum, type) => sum + type.items.length, 0),
    [workTypes]
  );

  if (!totalItems) return null;

  return (
    <motion.div variants={itemVariants} initial="hidden" animate="visible">
      <Card
        title={<Title level={4} className="!mb-0 font-bold">Types of work</Title>}
        className="shadow-md hover:shadow-lg transition-all duration-200 border border-gray-200"
        styles={{
          header: { marginBottom: 0, borderBottom: "none", paddingBottom: 0 },
          body: { padding: "0 32px 32px 32px" },
        }}
      >
        <Text type="secondary" className="block mb-6 text-sm">
          Get a breakdown of work items by their types.
        </Text>

        <div className="space-y-3">
          {workTypes.map((type) => (
            <div
              key={type.name}
              className="flex items-center p-1 -m-1 rounded-md transition-colors hover:bg-gray-50"
            >
              <div className="w-2/5 flex items-center">
                <span className="mr-3 text-lg">{type.icon}</span>
                <Text className="text-sm font-medium">
                  {type.name} ({type.items.length})
                </Text>
              </div>
              <div className="w-3/5">
                <DistributionBar
                  percentage={(type.items.length / totalItems) * 100}
                  count={type.items.length}
                  total={totalItems}
                />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};

export default React.memo(TypesOfWork);
