import React, { useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Modal from "../../../../components/Modal/modal";
import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormSelect from "../../../../components/forms/FormSelect";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useApprovalRules } from "../hooks/useApprovalRules";
import { AP_ALL_ROLES } from "../../constants/apRoles";
import ApprovalRuleTable from "../components/ApprovalRuleTable";

const APPROVER_ROLE_OPTIONS = AP_ALL_ROLES.map((role) => ({ value: role, label: role }));
const ACTIVE_OPTIONS = [
  { value: true, label: "Yes" },
  { value: false, label: "No" },
];

const EMPTY_FORM = { escalationDays: "", approverRole: "", active: true };

export default function ApprovalRulesPage() {
  const { data = [], isLoading, isError, error, updateRule, isUpdating } = useApprovalRules();
  const [editingRule, setEditingRule] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const openEdit = (rule) => {
    setEditingRule(rule);
    setForm({
      escalationDays: rule.escalationDays,
      approverRole: rule.approverRole,
      active: rule.active,
    });
  };

  const closeEdit = () => {
    setEditingRule(null);
    setForm(EMPTY_FORM);
  };

  const handleFieldChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!editingRule) return;
    try {
      await updateRule({
        id: editingRule.id,
        payload: {
          escalationDays: Number(form.escalationDays) || 0,
          approverRole: form.approverRole,
          active: form.active,
        },
      });
      showStatusToast(`${editingRule.tier} rule updated.`, "success");
      closeEdit();
    } catch (err) {
      showStatusToast(err?.message || "Failed to update approval rule.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Approval Rules" subtitle="Configure tier thresholds, approver roles, and escalation timers." />

      <PageCard>
        <PageCardContent>
          {isError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Failed to load approval rules{error?.message ? `: ${error.message}` : "."}
            </div>
          )}

          <ApprovalRuleTable rules={data} loading={isLoading} onEdit={openEdit} />
        </PageCardContent>
      </PageCard>

      <Modal
        isOpen={Boolean(editingRule)}
        onClose={closeEdit}
        title="Edit Approval Rule"
        subtitle={editingRule?.tier}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={closeEdit} disabled={isUpdating}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} loading={isUpdating} loadingText="Saving...">
              Save Changes
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <FormInput
            label="Escalation Days"
            name="escalationDays"
            type="number"
            min="0"
            value={form.escalationDays}
            onChange={handleFieldChange}
          />

          <FormSelect
            label="Approver Role"
            name="approverRole"
            options={APPROVER_ROLE_OPTIONS}
            value={form.approverRole}
            onChange={handleFieldChange}
          />

          <FormSelect
            label="Active"
            name="active"
            options={ACTIVE_OPTIONS}
            value={form.active}
            onChange={handleFieldChange}
          />
        </div>
      </Modal>
    </div>
  );
}
