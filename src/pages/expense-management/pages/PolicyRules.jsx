import React, { useCallback, useEffect, useMemo, useState } from "react";
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import ConfirmationModal from "@/components/confirmation_modal/ConfirmationModal";
import { useAuth } from "@/contexts/AuthContext";
import { showStatusToast } from "@/components/toastfy/toast";
import { lookupService } from "@/pages/expense-management/api/expenseReportsApi";
import { policyBundleService, policyRuleService } from "@/pages/expense-management/api/policyApi";
import { POLICY_ADMIN_ROLES } from "@/pages/expense-management/components/policy/common/policyEnums";
import { PolicyWorkspaceLayout, PolicyToolbar, PolicyWorkspaceGrid } from "@/pages/expense-management/components/policy/common/PolicyWorkspaceLayout";
import RuleNavList from "@/pages/expense-management/components/policy/PolicyRule/RuleNavList";
import RuleBuilderInline from "@/pages/expense-management/components/policy/RuleBuilder/RuleBuilderInline";

export default function PolicyRules() {
  const { hasRole } = useAuth();
  const canManage = hasRole(POLICY_ADMIN_ROLES);

  const [bundles, setBundles] = useState([]);
  const [rules, setRules] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [bundleFilter, setBundleFilter] = useState("");
  const [ruleTypeFilter, setRuleTypeFilter] = useState("");

  const [selectedRule, setSelectedRule] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      const [bundlesRes, rulesRes, categoryList, currencyList] = await Promise.all([
        policyBundleService.getAll(),
        policyRuleService.getAll(),
        lookupService.getActiveCategories(),
        lookupService.getActiveCurrencies(),
      ]);
      setBundles(bundlesRes.data?.data || []);
      setRules(rulesRes.data?.data || []);
      setCategories(categoryList);
      setCurrencies(currencyList);
      return rulesRes.data?.data || [];
    } catch (err) {
      console.error("Failed to load policy rules:", err);
      const errMsg = err.response?.data?.message || "Failed to load policy rules.";
      showStatusToast(errMsg, "error");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const bundleOptions = useMemo(() => bundles.map((b) => ({ value: b.policyId, label: b.policyName })), [bundles]);
  const categoryOptions = useMemo(() => categories.map((c) => ({ value: c.categoryId || c.id, label: c.categoryName || c.name })), [categories]);
  const currencyOptions = useMemo(() => currencies.map((c) => ({ value: c.currencyId || c.id, label: c.currencyCode || c.code || c.name })), [currencies]);

  const bundleNameById = useMemo(() => {
    const map = new Map();
    bundles.forEach((b) => map.set(b.policyId, b.policyName));
    return map;
  }, [bundles]);
  const resolveBundleName = useCallback((rule) => bundleNameById.get(rule.policyBundleId) || "Unassigned Bundle", [bundleNameById]);

  const filteredRules = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rules.filter((r) => {
      const matchesSearch = !q || (r.policyName || "").toLowerCase().includes(q) || (r.categoryName || "").toLowerCase().includes(q) || resolveBundleName(r).toLowerCase().includes(q);
      const matchesBundle = !bundleFilter || r.policyBundleId === bundleFilter;
      const matchesRuleType = !ruleTypeFilter || r.ruleType === ruleTypeFilter;
      return matchesSearch && matchesBundle && matchesRuleType;
    });
  }, [rules, searchTerm, bundleFilter, ruleTypeFilter, resolveBundleName]);

  const handleSubmit = async (payload) => {
    try {
      setSubmitting(true);
      if (selectedRule) {
        await policyRuleService.update(selectedRule.policyId, payload);
        showStatusToast("Rule updated successfully!", "success");
      } else {
        await policyRuleService.create(payload);
        showStatusToast("Rule created successfully!", "success");
      }
      const list = await fetchAll();
      if (selectedRule) {
        const refreshed = list.find((r) => r.policyId === selectedRule.policyId);
        setSelectedRule(refreshed || null);
      } else {
        setSelectedRule(null);
      }
    } catch (err) {
      console.error("Error saving rule:", err);
      const errMsg = err.response?.data?.message || "Failed to save rule.";
      showStatusToast(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;
    try {
      setDeleting(true);
      await policyRuleService.delete(ruleToDelete.policyId);
      showStatusToast("Rule deleted successfully!", "success");
      if (selectedRule?.policyId === ruleToDelete.policyId) setSelectedRule(null);
      setRuleToDelete(null);
      fetchAll();
    } catch (err) {
      console.error("Error deleting rule:", err);
      const errMsg = err.response?.data?.message || "Failed to delete rule.";
      showStatusToast(errMsg, "error");
    } finally {
      setDeleting(false);
    }
  };

  const breadcrumbs = [
    { label: "Expense Management", to: "/expense-management/dashboard" },
    { label: "Policy & Compliance", to: "/expense-management/policy-engine/dashboard" },
    { label: "Rules" },
  ];

  return (
    <PolicyWorkspaceLayout>
      <Breadcrumb items={breadcrumbs} />

      <PolicyToolbar title="Policy Rules" subtitle="The visual rule builder — select a rule to edit it, or start a new one." />

      <PolicyWorkspaceGrid
        left={
          <RuleNavList
            rules={filteredRules}
            selectedId={selectedRule?.policyId || null}
            onSelect={setSelectedRule}
            loading={loading}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            bundleFilter={bundleFilter}
            onBundleFilterChange={setBundleFilter}
            bundleOptions={bundleOptions}
            ruleTypeFilter={ruleTypeFilter}
            onRuleTypeFilterChange={setRuleTypeFilter}
            onCreateClick={() => setSelectedRule(null)}
            canManage={canManage}
            resolveBundleName={resolveBundleName}
          />
        }
        right={
          <RuleBuilderInline
            bundleOptions={bundleOptions}
            rule={selectedRule}
            categoryOptions={categoryOptions}
            currencyOptions={currencyOptions}
            onSubmit={handleSubmit}
            submitting={submitting}
            onDelete={setRuleToDelete}
            canDelete={canManage}
          />
        }
      />

      <ConfirmationModal
        isOpen={!!ruleToDelete}
        title="Delete Rule"
        message={`Are you sure you want to delete the rule "${ruleToDelete?.policyName}"? This action cannot be undone.`}
        confirmText="Delete Rule"
        cancelText="Cancel"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRuleToDelete(null)}
        isLoading={deleting}
        variant="danger"
      />
    </PolicyWorkspaceLayout>
  );
}
