// src/components/Summary/widgets/DistributionBar.jsx
import React from "react";
import { Tooltip } from "antd";
import { motion } from "framer-motion";

const DistributionBar = ({ percentage, count, total, isInteractive = true }) => {
  const percentLabel = `${Math.round(percentage)}%`;
  const tooltipTitle = `${count} / ${total} items`;

  const bar = (
    <div
      className={`w-full bg-gray-200 rounded h-4 flex items-center ${
        isInteractive ? "cursor-pointer" : ""
      }`}
    >
      <motion.div
        className="bg-gray-600 h-4 rounded flex items-center px-2 text-xs text-white font-semibold origin-left"
        initial={{ width: 0 }}
        whileInView={{ width: `${percentage}%` }}
        whileHover={isInteractive ? { scaleY: 1.2 } : {}}
        viewport={{ once: true, amount: 0.8 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <span>{percentLabel}</span>
      </motion.div>
    </div>
  );

  return isInteractive ? <Tooltip title={tooltipTitle}>{bar}</Tooltip> : bar;
};

export default React.memo(DistributionBar);
