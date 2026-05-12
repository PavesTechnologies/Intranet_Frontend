import React from "react";
import { Edit, Trash2 } from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";

const TestPlanTableRow = ({ plan, onEdit, onDelete }) => {
  return (
    <tr className="hover:bg-gray-50 transition">
      <td className="px-4 py-2">{plan.name}</td>
      <td className="px-4 py-2">{plan.description}</td>
      <td className="px-4 py-2">
        <StatusBadge label={plan.status} size="sm" />
      </td>
      <td className="px-4 py-2">{new Date(plan.createdAt).toLocaleDateString()}</td>
      <td className="px-4 py-2 flex gap-2">
        <button
          onClick={onEdit}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
        >
          <Edit size={16} />
        </button>
        <button
          onClick={onDelete}
          className="p-1 text-red-600 hover:bg-red-50 rounded"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
};

export default TestPlanTableRow;
