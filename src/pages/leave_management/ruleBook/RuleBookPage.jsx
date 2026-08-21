import React, { useEffect, useState } from "react";
import api from "../../../api/axiosInstance";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import FormSelect from "../../../components/forms/FormSelect";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import FormLabel from "../../../components/forms/FormLabel";
import LoadingSpinner from "../../../components/LoadingSpinner";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;
const SECOND_URL = "/api/workflow/admin";

// Axios instance with baseURL and token
const api = api.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("token")}`,
  },
});

const RuleBookPage = () => {
  const [rules, setRules] = useState([]);
  const [actionTypes, setActionTypes] = useState([]);
  const [approverTypes, setApproverTypes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [editing, setEditing] = useState(false);
  const [showAddActionType, setShowAddActionType] = useState(false);
  const [newActionType, setNewActionType] = useState("");

  const [newRule, setNewRule] = useState({
    id: null,
    name: "",
    description: "",
    active: true,
    conditions: [],
    approvalSteps: [],
  });

  // Toast utility
  const showToast = (message, type = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Fetch rule sets
  const fetchRules = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${BASE_URL}${SECOND_URL}/rulesets`);
      const data = res?.data?.data || [];
      const cleaned = data.map((r) => ({
        ...r,
        conditions: Array.isArray(r.conditions) ? r.conditions : [],
        approvalSteps: Array.isArray(r.approvalSteps) ? r.approvalSteps : [],
      }));
      setRules(cleaned);
    } catch (err) {
      showToast("Failed to fetch rules", "error");
    } finally {
      setLoading(false);
    }
  };

  // Fetch action types
  const fetchActionTypes = async () => {
    try {
      const res = await api.get(`${BASE_URL}/api/rule-book/action-types`);
      setActionTypes(res.data || []);
    } catch {
      showToast("Failed to load action types", "error");
    }
  };

  // Fetch approver types
  const fetchApproverTypes = async () => {
    try {
      const res = await api.get(`${BASE_URL}/api/rule-book/approver-types`);
      setApproverTypes(res.data || []);
    } catch {
      showToast("Failed to load approver types", "error");
    }
  };

  useEffect(() => {
    fetchRules();
    fetchActionTypes();
    fetchApproverTypes();
  }, []);

  // Add new action type locally
  const handleAddActionType = () => {
    if (!newActionType.trim())
      return showToast("Enter a valid action type", "error");

    const formatted = newActionType.toUpperCase().replaceAll(" ", "_");
    if (actionTypes.includes(formatted)) {
      showToast("Action type already exists", "error");
      return;
    }
    setActionTypes([...actionTypes, formatted]);
    setNewRule({ ...newRule, name: formatted });
    setNewActionType("");
    setShowAddActionType(false);
    showToast("New action type added");
  };

  const handleAddCondition = () => {
    setNewRule({
      ...newRule,
      conditions: [
        ...newRule.conditions,
        { attribute: "", operator: "==", value: "" },
      ],
    });
  };

  const handleAddStep = () => {
    setNewRule({
      ...newRule,
      approvalSteps: [
        ...newRule.approvalSteps,
        { level: 1, approverType: "", approverValue: "", mode: "SEQUENTIAL" },
      ],
    });
  };

  const handleSaveRule = async () => {
    try {
      const payload = {
        id: newRule.id,
        name: newRule.name,
        description: newRule.description,
        active: newRule.active,
        conditions: newRule.conditions,
        approvalSteps: newRule.approvalSteps,
      };

      if (editing) {
        await api.put(
          `${BASE_URL}${SECOND_URL}/rulesets/${newRule.id}`,
          payload,
        );
        showToast("Rule updated successfully");
      } else {
        await api.post(`${BASE_URL}${SECOND_URL}/rulesets`, payload);
        showToast("Rule created successfully");
      }

      fetchRules();
      handleResetForm();
    } catch {
      showToast("Failed to save rule", "error");
    }
  };

  const handleResetForm = () => {
    setEditing(false);
    setNewRule({
      id: null,
      name: "",
      description: "",
      active: true,
      conditions: [],
      approvalSteps: [],
    });
  };

  const handleEditRule = (rule) => {
    setEditing(true);
    setNewRule(rule);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteRule = async (id) => {
    if (!window.confirm("Are you sure you want to delete this rule?")) return;
    try {
      await api.delete(`${BASE_URL}${SECOND_URL}/rulesets/${id}`);
      showToast("Rule deleted successfully");
      fetchRules();
    } catch {
      showToast("Failed to delete rule", "error");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-8">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-5 right-5 px-4 py-2 rounded-md shadow-lg text-white transition-opacity ${
            toast.type === "error" ? "bg-red-500" : "bg-green-600"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Rule Creation Panel */}
      <div className="max-w-5xl mx-auto">
        <PageCard
          className="shadow-lg"
          title="Rule Book Configuration"
          actions={
            editing && (
              <Button
                onClick={handleResetForm}
                variant="link"
                className="text-sm text-gray-500 hover:text-indigo-600"
              >
                ✖ Cancel Edit
              </Button>
            )
          }
        >
        <PageCardContent className="p-8 space-y-6">
        {/* Action Type */}
        <div>
          <FormLabel className="mb-1">Action Type</FormLabel>
          <div className="flex gap-2">
            <div className="flex-1">
              <FormSelect
                name="actionType"
                options={[
                  { value: "", label: "Select Action Type" },
                  ...actionTypes.map((type) => ({ value: type, label: type.replaceAll("_", " ") })),
                ]}
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </div>

            {!showAddActionType ? (
              <Button
                onClick={() => setShowAddActionType(true)}
                variant="primary"
                size="sm"
                className="bg-indigo-500 text-white px-3 py-2 rounded-md hover:bg-indigo-600"
              >
                + Add New
              </Button>
            ) : (
              <div className="flex gap-2">
                <FormInput
                  type="text"
                  name="newActionType"
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value)}
                  placeholder="Enter new action type"
                  inputClassName="w-48"
                />
                <Button
                  onClick={handleAddActionType}
                  variant="primary"
                  size="sm"
                  className="bg-green-500 hover:bg-green-600"
                >
                  Save
                </Button>
                <Button
                  onClick={() => setShowAddActionType(false)}
                  variant="link"
                  className="text-gray-500 hover:text-red-500 font-medium"
                >
                  ✖
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <FormInput
            label="Description"
            name="ruleDescription"
            type="text"
            value={newRule.description}
            onChange={(e) =>
              setNewRule({ ...newRule, description: e.target.value })
            }
            inputClassName="focus:ring-indigo-500"
            placeholder="Enter rule description"
          />
        </div>

        {/* Conditions */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium text-gray-700">Conditions</h2>
            <Button
              onClick={handleAddCondition}
              variant="primary"
              size="sm"
              className="bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600"
            >
              + Add Condition
            </Button>
          </div>

          {newRule.conditions.length === 0 ? (
            <p className="text-gray-400 text-sm">No conditions added yet.</p>
          ) : (
            newRule.conditions.map((condition, index) => (
              <div
                key={index}
                className="flex gap-3 mb-2 border rounded-md p-3 bg-gray-50 items-center"
              >
                <FormInput
                  type="text"
                  name={`condition-attribute-${index}`}
                  placeholder="Attribute"
                  value={condition.attribute}
                  onChange={(e) => {
                    const updated = [...newRule.conditions];
                    updated[index].attribute = e.target.value;
                    setNewRule({ ...newRule, conditions: updated });
                  }}
                  inputClassName="flex-1"
                />
                <div className="w-28">
                  <FormSelect
                    name={`condition-operator-${index}`}
                    options={[
                      { value: "==", label: "==" },
                      { value: "!=", label: "!=" },
                    ]}
                    value={condition.operator}
                    onChange={(e) => {
                      const updated = [...newRule.conditions];
                      updated[index].operator = e.target.value;
                      setNewRule({ ...newRule, conditions: updated });
                    }}
                  />
                </div>
                <FormInput
                  type="text"
                  name={`condition-value-${index}`}
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) => {
                    const updated = [...newRule.conditions];
                    updated[index].value = e.target.value;
                    setNewRule({ ...newRule, conditions: updated });
                  }}
                  inputClassName="flex-1"
                />
              </div>
            ))
          )}
        </div>

        {/* Approval Steps */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium text-gray-700">
              Approval Steps
            </h2>
            <Button
              onClick={handleAddStep}
              variant="primary"
              size="sm"
              className="bg-green-500 hover:bg-green-600"
            >
              + Add Step
            </Button>
          </div>

          {newRule.approvalSteps.length === 0 ? (
            <p className="text-gray-400 text-sm">
              No approval steps added yet.
            </p>
          ) : (
            newRule.approvalSteps.map((step, index) => (
              <div
                key={index}
                className="flex gap-3 mb-2 border rounded-md p-3 bg-gray-50 items-center"
              >
                <FormInput
                  type="number"
                  name={`approval-level-${index}`}
                  value={step.level}
                  onChange={(e) => {
                    const updated = [...newRule.approvalSteps];
                    updated[index].level = parseInt(e.target.value);
                    setNewRule({ ...newRule, approvalSteps: updated });
                  }}
                  inputClassName="w-20"
                />
                <div className="flex-1">
                  <FormSelect
                    name="approverType"
                    options={[
                      { value: "", label: "Select Approver Type" },
                      ...approverTypes.map((type) => ({ value: type, label: type })),
                    ]}
                    value={step.approverType}
                    onChange={(e) => {
                      const updated = [...newRule.approvalSteps];
                      updated[index].approverType = e.target.value;
                      setNewRule({ ...newRule, approvalSteps: updated });
                    }}
                  />
                </div>
                <FormInput
                  type="text"
                  name={`approver-value-${index}`}
                  value={step.approverValue}
                  onChange={(e) => {
                    const updated = [...newRule.approvalSteps];
                    updated[index].approverValue = e.target.value;
                    setNewRule({ ...newRule, approvalSteps: updated });
                  }}
                  inputClassName="flex-1"
                  placeholder="Approver Value"
                />
                <div className="w-32">
                  <FormSelect
                    name={`approval-mode-${index}`}
                    options={[
                      { value: "SEQUENTIAL", label: "Sequential" },
                      { value: "PARALLEL", label: "Parallel" },
                    ]}
                    value={step.mode}
                    onChange={(e) => {
                      const updated = [...newRule.approvalSteps];
                      updated[index].mode = e.target.value;
                      setNewRule({ ...newRule, approvalSteps: updated });
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* Save / Update */}
        <div className="text-right">
          <Button
            onClick={handleSaveRule}
            variant="primary"
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-all"
          >
            {editing ? "Update Rule" : "Save Rule"}
          </Button>
        </div>
        </PageCardContent>
        </PageCard>
      </div>

      {/* Existing Rules */}
      <div className="max-w-5xl mx-auto mt-10">
        <PageCard className="shadow-lg" title="📜 Existing Rules">
        <PageCardContent className="p-8">
        {loading ? (
          <div className="flex justify-center py-6">
            <LoadingSpinner text="Loading rules..." />
          </div>
        ) : (rules ?? []).length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm bg-gray-50 rounded-lg">
            No rules found. Try adding one using the form above.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-indigo-100 text-gray-700 font-medium">
                <tr>
                  <th className="p-3 border">Name</th>
                  <th className="p-3 border">Description</th>
                  <th className="p-3 border text-center">Active</th>
                  <th className="p-3 border text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(rules ?? []).map((rule, idx) => (
                  <tr
                    key={rule.id || idx}
                    className={`border-b transition-colors ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    } hover:bg-indigo-50`}
                  >
                    <td className="p-3 border font-medium text-gray-800">
                      {rule.name}
                    </td>
                    <td className="p-3 border text-gray-600">
                      {rule.description || "—"}
                    </td>
                    <td className="p-3 border text-center">
                      {rule.active ? (
                        <span className="text-green-600 font-semibold">
                          ✅ Active
                        </span>
                      ) : (
                        <span className="text-red-500 font-semibold">
                          ❌ Inactive
                        </span>
                      )}
                    </td>
                    <td className="p-3 border text-center">
                      <div className="flex justify-center gap-3">
                        <Button
                          onClick={() => handleEditRule(rule)}
                          variant="outline"
                          size="sm"
                          className="text-indigo-600 border-indigo-500 hover:bg-indigo-50"
                        >
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteRule(rule.id)}
                          variant="danger"
                          size="sm"
                          className="text-red-600 border-red-500 hover:bg-red-50"
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        </PageCardContent>
        </PageCard>
      </div>
    </div>
  );
};

export default RuleBookPage;
