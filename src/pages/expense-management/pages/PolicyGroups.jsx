import React, { useCallback, useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import api from "@/api/axiosInstance";
import { policyGroupService, policyAssignmentService, policyBundleService, groupMemberService } from "@/pages/expense-management/api/policyApi";
import { POLICY_MANAGE_ROLES } from "@/pages/expense-management/components/policy/common/policyEnums";
import { PolicyWorkspaceLayout, PolicyToolbar, PolicyWorkspaceGrid } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";
import GroupList from "@/pages/expense-management/components/policy/PolicyGroup/GroupList";
import GroupWorkspacePanel from "@/pages/expense-management/components/policy/PolicyGroup/GroupWorkspacePanel";
import GroupEditDrawer from "@/pages/expense-management/components/policy/PolicyGroup/GroupEditDrawer";

const EMPLOYEE_ONBOARDING_URL = window.__APP_CONFIG__?.EMPLOYEE_ONBOARDING_URL || "";
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const employeeService = {
  getAll: () => api.get(`${EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`, { headers: authHeaders() }),
};

const sameIds = (a, b) => a.length === b.length && new Set(a).size === new Set([...a, ...b]).size;

export default function PolicyGroups() {
  const { hasRole } = useAuth();
  const canManage = hasRole(POLICY_MANAGE_ROLES);

  const [groups, setGroups] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [bundles, setBundles] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);

  const [originalMemberIds, setOriginalMemberIds] = useState([]);
  const [memberIds, setMemberIds] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [savingMembers, setSavingMembers] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [groupsRes, assignmentsRes, bundlesRes, employeesRes] = await Promise.all([
        policyGroupService.getAll(),
        policyAssignmentService.getAll(),
        policyBundleService.getAll(),
        employeeService.getAll().catch(() => ({ data: [] })),
      ]);
      setGroups(groupsRes.data?.data || []);
      setAssignments(assignmentsRes.data?.data || []);
      setBundles(bundlesRes.data?.data || []);

      const rawEmployees = Array.isArray(employeesRes.data) ? employeesRes.data : employeesRes.data?.content || employeesRes.data?.data || [];
      setEmployees(
        rawEmployees.map((e) => ({
          employeeId: e.employee_id,
          name: [e.first_name, e.last_name].filter(Boolean).join(" ") || "Unnamed Employee",
          email: e.work_email || "",
          department: e.department_name || e.department || "",
        }))
      );
      return groupsRes.data?.data || [];
    } catch (err) {
      console.error("Failed to load policy groups:", err);
      const errMsg = err.response?.data?.message || "Failed to load policy groups.";
      showStatusToast(errMsg, "error");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const bundleNameById = useMemo(() => {
    const map = new Map();
    bundles.forEach((b) => map.set(b.policyId, b.policyName));
    return map;
  }, [bundles]);

  const resolveAssignedPolicy = useCallback(
    (group) => {
      const match = assignments.find((a) => a.assignmentType === "GROUP" && a.groupId === group.groupId);
      return match ? bundleNameById.get(match.policyId) : null;
    },
    [assignments, bundleNameById]
  );

  const loadMembers = useCallback(async (group) => {
    if (!group) return;
    setMembersLoading(true);
    try {
      const res = await policyGroupService.getMembers(group.groupId);
      const ids = (res.data?.data || []).map((m) => m.employeeId);
      setOriginalMemberIds(ids);
      setMemberIds(ids);
    } catch (err) {
      console.error("Failed to fetch group members:", err);
      setOriginalMemberIds([]);
      setMemberIds([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const handleSelect = (group) => {
    setSelectedGroup(group);
    loadMembers(group);
  };

  const filteredGroups = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) => g.groupName.toLowerCase().includes(q));
  }, [groups, searchTerm]);

  const openCreate = () => {
    if (!canManage) return;
    setEditingGroup(null);
    setIsDrawerOpen(true);
  };

  const openEdit = (group) => {
    if (!canManage) return;
    setEditingGroup(group);
    setIsDrawerOpen(true);
  };

  const handleGroupSubmit = async (payload) => {
    try {
      setSubmitting(true);
      let id;
      if (editingGroup) {
        id = editingGroup.groupId;
        await policyGroupService.update(id, payload);
      } else {
        const res = await policyGroupService.create(payload);
        id = res.data?.data?.groupId;
      }
      showStatusToast(editingGroup ? "Policy group updated successfully!" : "Policy group created successfully!", "success");
      setIsDrawerOpen(false);
      const list = await fetchAll();
      const refreshed = list.find((g) => g.groupId === id);
      if (refreshed) handleSelect(refreshed);
    } catch (err) {
      console.error("Error saving policy group:", err);
      const errMsg = err.response?.data?.message || "Failed to save policy group.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!groupToDelete) return;
    try {
      setDeleting(true);
      await policyGroupService.delete(groupToDelete.groupId);
      showStatusToast("Policy group deleted successfully!", "success");
      setGroupToDelete(null);
      if (selectedGroup && selectedGroup.groupId === groupToDelete.groupId) setSelectedGroup(null);
      fetchAll();
    } catch (err) {
      console.error("Error deleting policy group:", err);
      const errMsg = err.response?.data?.message || "Failed to delete policy group.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const membersDirty = !sameIds(memberIds, originalMemberIds);

  const handleSaveMembers = async () => {
    if (!selectedGroup) return;
    try {
      setSavingMembers(true);
      const toAdd = memberIds.filter((id) => !originalMemberIds.includes(id));
      const toRemove = originalMemberIds.filter((id) => !memberIds.includes(id));
      const results = await Promise.allSettled([
        ...toAdd.map((id) => groupMemberService.add(selectedGroup.groupId, id)),
        ...toRemove.map((id) => groupMemberService.remove(selectedGroup.groupId, id)),
      ]);
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        showStatusToast(`${failures.length} member change${failures.length === 1 ? "" : "s"} failed to apply.`, "warning");
      } else {
        showStatusToast("Membership updated successfully!", "success");
      }
      await loadMembers(selectedGroup);
      fetchAll();
    } catch (err) {
      console.error("Error saving members:", err);
      showStatusToast("Failed to update membership.", "error");
    } finally {
      setSavingMembers(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Policy & Compliance", to: "/expense-management/policy-engine/dashboard" },
    { label: "Policy Groups" },
  ];

  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar title="Policy Groups" subtitle="Organize employees into groups so you can assign them a shared policy bundle." />

      <PolicyWorkspaceGrid
        left={
          <GroupList
            groups={filteredGroups}
            selectedId={selectedGroup?.groupId || null}
            onSelect={handleSelect}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onCreateClick={openCreate}
            canManage={canManage}
            resolveAssignedPolicy={resolveAssignedPolicy}
          />
        }
        right={
          <GroupWorkspacePanel
            group={selectedGroup}
            assignedPolicyLabel={selectedGroup ? resolveAssignedPolicy(selectedGroup) : null}
            employees={employees}
            memberIds={memberIds}
            membersLoading={membersLoading}
            membersDirty={membersDirty}
            onMemberIdsChange={setMemberIds}
            onSaveMembers={handleSaveMembers}
            savingMembers={savingMembers}
            onEditGroup={openEdit}
            onDeleteGroup={setGroupToDelete}
            canManage={canManage}
          />
        }
      />

      <GroupEditDrawer open={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} group={editingGroup} onSubmit={handleGroupSubmit} submitting={submitting} />

      <ConfirmationModal
        isOpen={!!groupToDelete}
        title="Delete Policy Group"
        message={`Are you sure you want to delete "${groupToDelete?.groupName}"? This action cannot be undone.`}
        confirmText="Delete Group"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setGroupToDelete(null)}
        isLoading={deleting}
        variant="danger"
      />
    </PolicyWorkspaceLayout>
  );
}
