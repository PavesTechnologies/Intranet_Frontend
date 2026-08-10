import React, { useCallback, useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import {
  policyBundleService,
  policyRuleService,
  policyAssignmentService,
  policyGroupService,
  policyVersionService,
} from "@/pages/expense-management/api/policyApi";
import { POLICY_ADMIN_ROLES, POLICY_MANAGE_ROLES } from "@/pages/expense-management/components/policy/common/policyEnums";
import { PolicyWorkspaceLayout, PolicyToolbar, PolicyWorkspaceGrid } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";
import BundleList from "@/pages/expense-management/components/policy/PolicyBundle/BundleList";
import BundleDetailPanel from "@/pages/expense-management/components/policy/PolicyBundle/BundleDetailPanel";
import BundleEditDrawer from "@/pages/expense-management/components/policy/PolicyBundle/BundleEditDrawer";
import RuleBuilderDrawer from "@/pages/expense-management/components/policy/RuleBuilder/RuleBuilderDrawer";

export default function PolicyBundles() {
  const { hasRole } = useAuth();
  const canManage = hasRole(POLICY_MANAGE_ROLES);
  const canManageRules = hasRole(POLICY_ADMIN_ROLES);

  const [bundles, setBundles] = useState([]);
  const [rules, setRules] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [groups, setGroups] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBundle, setSelectedBundle] = useState(null);

  const [versions, setVersions] = useState(null);
  const [versionsLoading, setVersionsLoading] = useState(false);

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [bundleToDelete, setBundleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [bundleToSetDefault, setBundleToSetDefault] = useState(null);
  const [settingDefault, setSettingDefault] = useState(false);

  const [isRuleDrawerOpen, setIsRuleDrawerOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleSubmitting, setRuleSubmitting] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [deletingRule, setDeletingRule] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [bundlesRes, rulesRes, assignmentsRes, groupsRes, categoryList, currencyList] = await Promise.all([
        policyBundleService.getAll(),
        policyRuleService.getAll(),
        policyAssignmentService.getAll(),
        policyGroupService.getAll(),
        lookupService.getActiveCategories(),
        lookupService.getActiveCurrencies(),
      ]);
      setBundles(bundlesRes.data?.data || []);
      setRules(rulesRes.data?.data || []);
      setAssignments(assignmentsRes.data?.data || []);
      setGroups(groupsRes.data?.data || []);
      setCategories(categoryList);
      setCurrencies(currencyList);
      return bundlesRes.data?.data || [];
    } catch (err) {
      console.error("Failed to fetch policy bundles:", err);
      const errMsg = err.response?.data?.message || "Failed to fetch policy bundles.";
      showStatusToast(errMsg, "error");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c.categoryId || c.id, label: c.categoryName || c.name })),
    [categories]
  );
  const currencyOptions = useMemo(
    () => currencies.map((c) => ({ value: c.currencyId || c.id, label: c.currencyCode || c.code || c.name })),
    [currencies]
  );

  const rulesForSelected = useMemo(
    () => (selectedBundle ? rules.filter((r) => r.policyBundleId === selectedBundle.policyId) : []),
    [rules, selectedBundle]
  );
  const assignmentsForSelected = useMemo(
    () => (selectedBundle ? assignments.filter((a) => a.policyId === selectedBundle.policyId) : []),
    [assignments, selectedBundle]
  );
  const defaultAssignment = useMemo(() => assignments.find((a) => a.assignmentType === "DEFAULT"), [assignments]);

  const loadVersions = useCallback(async (bundle) => {
    if (!bundle) return;
    setVersionsLoading(true);
    try {
      const res = await policyVersionService.getVersions(bundle.policyId);
      const raw = res.data?.data || [];
      setVersions([...raw].sort((a, b) => new Date(b.activatedAt || 0) - new Date(a.activatedAt || 0)));
    } catch (err) {
      console.error("Failed to fetch policy versions:", err);
      setVersions([]);
    } finally {
      setVersionsLoading(false);
    }
  }, []);

  const handleSelect = (bundle) => {
    setSelectedBundle(bundle);
    setVersions(null);
    loadVersions(bundle);
  };

  const filteredBundles = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return bundles;
    return bundles.filter(
      (b) => b.policyName.toLowerCase().includes(q) || (b.description || "").toLowerCase().includes(q)
    );
  }, [bundles, searchTerm]);

  const openCreateDrawer = () => {
    if (!canManage) return;
    setEditingBundle(null);
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (bundle) => {
    if (!canManage) return;
    setEditingBundle(bundle);
    setIsDrawerOpen(true);
  };

  const handleDrawerSubmit = async (payload) => {
    try {
      setSubmitting(true);
      if (editingBundle) {
        await policyBundleService.update(editingBundle.policyId, payload);
        showStatusToast("Policy bundle updated successfully!", "success");
      } else {
        await policyBundleService.create(payload);
        showStatusToast("Policy bundle created successfully!", "success");
      }
      setIsDrawerOpen(false);
      const list = await fetchAll();
      if (editingBundle) {
        const refreshed = list.find((b) => b.policyId === editingBundle.policyId);
        if (refreshed) setSelectedBundle(refreshed);
      }
    } catch (err) {
      console.error("Error saving policy bundle:", err);
      const errMsg = err.response?.data?.message || "Failed to save policy bundle.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!bundleToDelete) return;
    try {
      setDeleting(true);
      await policyBundleService.delete(bundleToDelete.policyId);
      showStatusToast("Policy bundle deleted successfully!", "success");
      setBundleToDelete(null);
      if (selectedBundle && selectedBundle.policyId === bundleToDelete.policyId) setSelectedBundle(null);
      fetchAll();
    } catch (err) {
      console.error("Error deleting policy bundle:", err);
      const errMsg = err.response?.data?.message || "Failed to delete policy bundle.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleSetDefaultConfirm = async () => {
    if (!bundleToSetDefault) return;
    try {
      setSettingDefault(true);
      await policyAssignmentService.setDefault(bundleToSetDefault.policyId);
      showStatusToast(`"${bundleToSetDefault.policyName}" is now the org default policy.`, "success");
      setBundleToSetDefault(null);
      fetchAll();
    } catch (err) {
      console.error("Error setting default policy:", err);
      const errMsg = err.response?.data?.message || "Failed to set the org default policy.";
      showStatusToast(errMsg, "error");
    } finally {
      setSettingDefault(false);
    }
  };

  const handleAddRule = () => {
    if (!canManageRules) return;
    setEditingRule(null);
    setIsRuleDrawerOpen(true);
  };

  const handleEditRule = (rule) => {
    if (!canManageRules) return;
    setEditingRule(rule);
    setIsRuleDrawerOpen(true);
  };

  const handleRuleSubmit = async (payload) => {
    try {
      setRuleSubmitting(true);
      if (editingRule) {
        await policyRuleService.update(editingRule.policyId, payload);
        showStatusToast("Rule updated successfully!", "success");
      } else {
        await policyRuleService.create(payload);
        showStatusToast("Rule created successfully!", "success");
      }
      setIsRuleDrawerOpen(false);
      const list = await fetchAll();
      if (selectedBundle) {
        const refreshed = list.find((b) => b.policyId === selectedBundle.policyId);
        if (refreshed) {
          setSelectedBundle(refreshed);
          loadVersions(refreshed);
        }
      }
    } catch (err) {
      console.error("Error saving rule:", err);
      const errMsg = err.response?.data?.message || "Failed to save rule.";
      showStatusToast(errMsg, "error");
    } finally {
      setRuleSubmitting(false);
    }
  };

  const handleDeleteRuleConfirm = async () => {
    if (!ruleToDelete) return;
    try {
      setDeletingRule(true);
      await policyRuleService.delete(ruleToDelete.policyId);
      showStatusToast("Rule deleted successfully!", "success");
      setRuleToDelete(null);
      fetchAll();
    } catch (err) {
      console.error("Error deleting rule:", err);
      const errMsg = err.response?.data?.message || "Failed to delete rule.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeletingRule(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Policy & Compliance", to: "/expense-management/policy-engine/dashboard" },
    { label: "Policy Bundles" },
  ];

  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar
        title="Policy Bundle Workspace"
        subtitle="Browse every policy bundle, manage its rules, and review its assignments and version history in one place."
      />

      <PolicyWorkspaceGrid
        left={
          <BundleList
            bundles={filteredBundles}
            selectedId={selectedBundle?.policyId || null}
            onSelect={handleSelect}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onCreateClick={openCreateDrawer}
            canManage={canManage}
          />
        }
        right={
          <BundleDetailPanel
            bundle={selectedBundle}
            rules={selectedBundle ? rulesForSelected : null}
            rulesLoading={loading}
            onAddRule={handleAddRule}
            onEditRule={handleEditRule}
            onDeleteRule={setRuleToDelete}
            assignments={selectedBundle ? assignmentsForSelected : null}
            assignmentsLoading={loading}
            groups={groups}
            versions={versions}
            versionsLoading={versionsLoading}
            onEditBundle={openEditDrawer}
            onDeleteBundle={setBundleToDelete}
            onSetDefault={setBundleToSetDefault}
            isDefaultBundle={!!(selectedBundle && defaultAssignment?.policyId === selectedBundle.policyId)}
            canManage={canManage}
            canManageRules={canManageRules}
          />
        }
      />

      <BundleEditDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        bundle={editingBundle}
        onSubmit={handleDrawerSubmit}
        submitting={submitting}
      />

      <RuleBuilderDrawer
        open={isRuleDrawerOpen}
        onClose={() => setIsRuleDrawerOpen(false)}
        fixedBundle={selectedBundle}
        rule={editingRule}
        categoryOptions={categoryOptions}
        currencyOptions={currencyOptions}
        onSubmit={handleRuleSubmit}
        submitting={ruleSubmitting}
      />

      <ConfirmationModal
        isOpen={!!bundleToDelete}
        title="Delete Policy Bundle"
        message={`Are you sure you want to delete "${bundleToDelete?.policyName}"? This action cannot be undone.`}
        confirmText="Delete Bundle"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setBundleToDelete(null)}
        isLoading={deleting}
        variant="danger"
      />

      <ConfirmationModal
        isOpen={!!bundleToSetDefault}
        title="Set as Org Default"
        message={`Set "${bundleToSetDefault?.policyName}" as the fallback policy for anyone without an individual or group assignment?`}
        confirmText="Set as Default"
        cancelText="Cancel"
        onConfirm={handleSetDefaultConfirm}
        onCancel={() => setBundleToSetDefault(null)}
        isLoading={settingDefault}
      />

      <ConfirmationModal
        isOpen={!!ruleToDelete}
        title="Delete Rule"
        message={`Are you sure you want to delete the rule "${ruleToDelete?.policyName}"? This action cannot be undone.`}
        confirmText="Delete Rule"
        cancelText="Cancel"
        onConfirm={handleDeleteRuleConfirm}
        onCancel={() => setRuleToDelete(null)}
        isLoading={deletingRule}
        variant="danger"
      />
    </PolicyWorkspaceLayout>
  );
}
