// src/components/ProjectDashboard/ProjectMenu.jsx
import React from "react";
import { ViewIcon, EditIcon, DeleteIcon } from "../icons";

const ProjectMenu = ({ project, onView, onEdit, onDelete, canEdit }) => (
  <div className="flex items-center gap-1">
    <button
      title="View Details"
      onClick={(e) => { e.stopPropagation(); onView(project.project); }}
      className="p-1 rounded hover:bg-indigo-50 transition-colors"
    >
      <ViewIcon size={15} className="text-indigo-500" />
    </button>

    {canEdit && (
      <>
        <button
          title="Edit"
          onClick={(e) => { e.stopPropagation(); onEdit(project.project); }}
          className="p-1 rounded hover:bg-blue-50 transition-colors"
        >
          <EditIcon size={15} className="text-blue-500" />
        </button>
        <button
          title="Delete"
          onClick={(e) => { e.stopPropagation(); onDelete(project.project.id); }}
          className="p-1 rounded hover:bg-red-50 transition-colors"
        >
          <DeleteIcon size={15} className="text-red-500" />
        </button>
      </>
    )}
  </div>
);

export default ProjectMenu;
