import React, { useCallback, useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import api from "@/api/axiosInstance";
import { policyAssignmentService, policyGroupService, policyBundleService, policyRuleService } from "@/pages/expense-management/api/policyApi";
import { POLICY_MANAGE_ROLES } from "@/pages/expense-management/components/policy/common/policyEnums";
import { PolicyWorkspaceLayout, PolicyToolbar, PolicyWorkspaceGrid } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";
import AssignmentList from "@/pages/expense-management/components/policy/PolicyAssignment/AssignmentList";
import AssignmentDetailPanel from "@/pages/expense-management/components/policy/PolicyAssignment/AssignmentDetailPanel";
import AssignmentBuilderDrawer from "@/pages/expense-management/components/policy/PolicyAssignment/AssignmentBuilderDrawer";
import ResolutionPreview from "@/pages/expense-management/components/policy/PolicyAssignment/ResolutionPreview";

const EMPLOYEE_ONBOARDING_URL = window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL || "";
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const employeeService = {
  getAll: () => api.get(`${EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`, { headers: authHeaders() }),
};

export default function PolicyAssignments() {
  const { hasRole } = useAuth();
  const canManage = hasRole(POLICY_MANAGE_ROLES);

  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [rules, setRules] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [groupMembersMap, setGroupMembersMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignmentToDelete, setAssignmentToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [assignmentsRes, groupsRes, bundlesRes, rulesRes, employeesRes] = await Promise.all([
        policyAssignmentService.getAll(),
        policyGroupService.getAll(),
        policyBundleService.getAll(),
        policyRuleService.getAll(),
        employeeService.getAll().catch(() => ({ data: [] })),
      ]);
      const groupList = groupsRes.data?.data || [];
      setAssignments(assignmentsRes.data?.data || []);
      setGroups(groupList);
      setBundles(bundlesRes.data?.data || []);
      setRules(rulesRes.data?.data || []);

      const rawEmployees = Array.isArray(employeesRes.data) ? employeesRes.data : employeesRes.data?.content || employeesRes.data?.data || [];
      setEmployees(
        rawEmployees.map((e) => ({
          employeeId: e.employee_id,
          name: [e.first_name, e.last_name].filter(Boolean).join(" ") || "Unnamed Employee",
          email: e.work_email || "",
        }))
      );

      const memberResults = await Promise.allSettled(groupList.map((g) => policyGroupService.getMembers(g.groupId)));
      const map = new Map();
      memberResults.forEach((result, idx) => {
        if (result.status !== "fulfilled") return;
        const ids = (result.value.data?.data || []).map((m) => m.employeeId);
        map.set(groupList[idx].groupId, ids);
      });
      setGroupMembersMap(map);
    } catch (err) {
      console.error("Failed to load policy assignments:", err);
      const errMsg = err.response?.data?.message || "Failed to load policy assignments.";
      showStatusToast(errMsg, "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const employeeOptions = useMemo(() => employees.map((e) => ({ value: e.employeeId, label: `${e.name} (${e.employeeId})` })), [employees]);
  const groupOptions = useMemo(() => groups.map((g) => ({ value: g.groupId, label: g.groupName })), [groups]);
  const bundleOptions = useMemo(() => bundles.map((b) => ({ value: b.policyId, label: b.policyName })), [bundles]);

  const groupNameById = useMemo(() => {
    const map = new Map();
    groups.forEach((g) => map.set(g.groupId, g.groupName));
    return map;
  }, [groups]);

  const groupIdByEmployeeId = useMemo(() => {
    const map = new Map();
    groupMembersMap.forEach((employeeIds, groupId) => {
      employeeIds.forEach((id) => map.set(id, groupId));
    });
    return map;
  }, [groupMembersMap]);

  const employeeNameById = useMemo(() => {
    const map = new Map();
    employees.forEach((e) => map.set(e.employeeId, e.name));
    return map;
  }, [employees]);

  const rulesByBundle = useCallback((policyId) => rules.filter((r) => r.policyBundleId === policyId), [rules]);

  const membersForTarget = useCallback(
    (assignmentType, targetId) => {
      if (assignmentType === "INDIVIDUAL") {
        return employees.filter((e) => e.employeeId === targetId);
      }
      const ids = groupMembersMap.get(targetId) || [];
      return employees.filter((e) => ids.includes(e.employeeId));
    },
    [employees, groupMembersMap]
  );

  const resolveTargetLabel = useCallback(
    (assignment) => {
      if (assignment.assignmentType === "DEFAULT") return "Everyone (Org Default)";
      if (assignment.assignmentType === "INDIVIDUAL") return employeeNameById.get(assignment.employeeId) || assignment.employeeId;
      return assignment.groupName || groupNameById.get(assignment.groupId) || "Unknown Group";
    },
    [employeeNameById, groupNameById]
  );

  const filteredAssignments = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return assignments;
    return assignments.filter((a) => resolveTargetLabel(a).toLowerCase().includes(q) || (a.policyName || "").toLowerCase().includes(q));
  }, [assignments, searchTerm, resolveTargetLabel]);

  const handleCreate = async (payload) => {
    try {
      setSubmitting(true);
      await policyAssignmentService.create(payload);
      showStatusToast("Assignment created successfully!", "success");
      setIsDrawerOpen(false);
      fetchAll();
    } catch (err) {
      console.error("Error creating assignment:", err);
      const errMsg = err.response?.data?.message || "Failed to create assignment.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!assignmentToDelete) return;
    try {
      setDeleting(true);
      await policyAssignmentService.delete(assignmentToDelete.assignmentId);
      showStatusToast("Assignment deleted successfully!", "success");
      setAssignmentToDelete(null);
      if (selectedAssignment?.assignmentId === assignmentToDelete.assignmentId) setSelectedAssignment(null);
      fetchAll();
    } catch (err) {
      console.error("Error deleting assignment:", err);
      const errMsg = err.response?.data?.message || "Failed to delete assignment.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Policy & Compliance", to: "/expense-management/policy-engine/dashboard" },
    { label: "Assignments" },
  ];

  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar title="Policy Assignments" subtitle="Map employees and groups to policy bundles, and see exactly who's governed by what." />

      <PolicyWorkspaceGrid
        left={
          <AssignmentList
            assignments={filteredAssignments}
            selectedId={selectedAssignment?.assignmentId || null}
            onSelect={setSelectedAssignment}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onCreateClick={() => canManage && setIsDrawerOpen(true)}
            onDelete={setAssignmentToDelete}
            canManage={canManage}
            resolveTargetLabel={resolveTargetLabel}
            resolutionPreview={
              <ResolutionPreview
                employeeOptions={employeeOptions}
                assignments={assignments}
                groupIdByEmployeeId={groupIdByEmployeeId}
                groupNameById={groupNameById}
              />
            }
          />
        }
        right={
          <AssignmentDetailPanel
            assignment={selectedAssignment}
            targetLabel={selectedAssignment ? resolveTargetLabel(selectedAssignment) : ""}
            rules={selectedAssignment ? rulesByBundle(selectedAssignment.policyId) : []}
            members={
              selectedAssignment
                ? selectedAssignment.assignmentType === "DEFAULT"
                  ? []
                  : membersForTarget(selectedAssignment.assignmentType, selectedAssignment.assignmentType === "INDIVIDUAL" ? selectedAssignment.employeeId : selectedAssignment.groupId)
                : []
            }
            canManage={canManage}
            onDelete={setAssignmentToDelete}
          />
        }
      />

      <AssignmentBuilderDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        employeeOptions={employeeOptions}
        groupOptions={groupOptions}
        bundleOptions={bundleOptions}
        rulesByBundle={rulesByBundle}
        membersForTarget={membersForTarget}
        onSubmit={handleCreate}
        submitting={submitting}
      />

      <ConfirmationModal
        isOpen={!!assignmentToDelete}
        title="Delete Assignment"
        message="Are you sure you want to delete this policy assignment? This action cannot be undone."
        confirmText="Delete Assignment"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setAssignmentToDelete(null)}
        isLoading={deleting}
        variant="danger"
      />
    </PolicyWorkspaceLayout>
  );
}
