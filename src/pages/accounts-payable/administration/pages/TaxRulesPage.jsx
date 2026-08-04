import React, { useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import Button from "../../../../components/Button/Button";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useTaxRules, useDeleteTaxRule } from "../hooks/useTaxRules";
import TaxRuleTable from "../components/TaxRuleTable";
import TaxRuleModal from "../components/TaxRuleModal";

export default function TaxRulesPage() {
  const { data: rules = [], isLoading, isError, error } = useTaxRules();
  const deleteTaxRule = useDeleteTaxRule();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [ruleToDelete, setRuleToDelete] = useState(null);

  const openCreateModal = () => {
    setEditingRule(null);
    setIsModalOpen(true);
  };

  const openEditModal = (rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleDeleteConfirm = async () => {
    if (!ruleToDelete) return;

    try {
      await deleteTaxRule.mutateAsync(ruleToDelete.id);
      showStatusToast("Tax rule deleted successfully.", "success");
      setRuleToDelete(null);
    } catch (err) {
      showStatusToast(err?.message || "Failed to delete tax rule.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tax Rules"
        subtitle="Manage jurisdiction-based tax rates applied to vendor invoices."
        actions={
          <Button variant="primary" onClick={openCreateModal}>
            Add Rule
          </Button>
        }
      />

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load tax rules{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      <PageCard>
        <PageCardContent>
          <TaxRuleTable
            rules={rules}
            loading={isLoading}
            onEdit={openEditModal}
            onDeleteRequest={setRuleToDelete}
          />
        </PageCardContent>
      </PageCard>

      <TaxRuleModal isOpen={isModalOpen} onClose={closeModal} rule={editingRule} />

      <ConfirmationModal
        isOpen={Boolean(ruleToDelete)}
        title="Delete Tax Rule"
        message={
          ruleToDelete
            ? `Are you sure you want to delete the ${ruleToDelete.taxType} rule for ${ruleToDelete.jurisdiction}? This action cannot be undone.`
            : ""
        }
        onConfirm={handleDeleteConfirm}
        onCancel={() => setRuleToDelete(null)}
        isLoading={deleteTaxRule.isPending}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  );
}
