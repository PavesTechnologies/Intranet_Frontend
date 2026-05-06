import React from "react";
import RoleOffWorkspace from "@/pages/resource_management/roleoff/RoleOffWorkspace";

const ProjectRoleOffManagement = ({ projectId, projectName }) => {
  return (
    <RoleOffWorkspace
      mode="pm"
      embedded
      projectId={projectId}
      projectName={projectName}
    />
  );
};

export default ProjectRoleOffManagement;
