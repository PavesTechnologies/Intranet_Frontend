import React, { useEffect, useState } from "react";
import axios from "axios";
import FilterListbox from "../../../components/filter/FilterListbox";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;
const SECOND_URL = "/api/workflow/admin";
const token = localStorage.getItem("token");

// Axios instance with baseURL and token
const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
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
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-lg p-8 space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-indigo-700">
            Rule Book Configuration
          </h1>
          {editing && (
            <button
              onClick={handleResetForm}
              className="text-sm text-gray-500 hover:text-indigo-600"
            >
              ✖ Cancel Edit
            </button>
          )}
        </div>

        {/* Action Type */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Action Type
          </label>
          <div className="flex gap-2">
            <div className="flex-1">
              <FilterListbox
                options={[
                  { value: "", label: "Select Action Type" },
                  ...actionTypes.map((type) => ({ value: type, label: type.replaceAll("_", " ") })),
                ]}
                value={newRule.name}
                onChange={(val) => setNewRule({ ...newRule, name: val })}
              />
            </div>

            {!showAddActionType ? (
              <button
                onClick={() => setShowAddActionType(true)}
                className="bg-indigo-500 text-white px-3 py-2 rounded-md hover:bg-indigo-600"
              >
                + Add New
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newActionType}
                  onChange={(e) => setNewActionType(e.target.value)}
                  placeholder="Enter new action type"
                  className="border border-gray-300 rounded-md px-3 py-2 w-48"
                />
                <button
                  onClick={handleAddActionType}
                  className="bg-green-500 text-white px-3 py-2 rounded-md hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={() => setShowAddActionType(false)}
                  className="text-gray-500 hover:text-red-500 font-medium"
                >
                  ✖
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Description
          </label>
          <input
            type="text"
            value={newRule.description}
            onChange={(e) =>
              setNewRule({ ...newRule, description: e.target.value })
            }
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-indigo-500"
            placeholder="Enter rule description"
          />
        </div>

        {/* Conditions */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-medium text-gray-700">Conditions</h2>
            <button
              onClick={handleAddCondition}
              className="bg-indigo-500 text-white px-3 py-1 rounded-md hover:bg-indigo-600"
            >
              + Add Condition
            </button>
          </div>

          {newRule.conditions.length === 0 ? (
            <p className="text-gray-400 text-sm">No conditions added yet.</p>
          ) : (
            newRule.conditions.map((condition, index) => (
              <div
                key={index}
                className="flex gap-3 mb-2 border rounded-md p-3 bg-gray-50 items-center"
              >
                <input
                  type="text"
                  placeholder="Attribute"
                  value={condition.attribute}
                  onChange={(e) => {
                    const updated = [...newRule.conditions];
                    updated[index].attribute = e.target.value;
                    setNewRule({ ...newRule, conditions: updated });
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
                />
                <div className="w-28">
                  <FilterListbox
                    options={[
                      { value: "==", label: "==" },
                      { value: "!=", label: "!=" },
                    ]}
                    value={condition.operator}
                    onChange={(val) => {
                      const updated = [...newRule.conditions];
                      updated[index].operator = val;
                      setNewRule({ ...newRule, conditions: updated });
                    }}
                  />
                </div>
                <input
                  type="text"
                  placeholder="Value"
                  value={condition.value}
                  onChange={(e) => {
                    const updated = [...newRule.conditions];
                    updated[index].value = e.target.value;
                    setNewRule({ ...newRule, conditions: updated });
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
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
            <button
              onClick={handleAddStep}
              className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600"
            >
              + Add Step
            </button>
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
                <input
                  type="number"
                  value={step.level}
                  onChange={(e) => {
                    const updated = [...newRule.approvalSteps];
                    updated[index].level = parseInt(e.target.value);
                    setNewRule({ ...newRule, approvalSteps: updated });
                  }}
                  className="w-20 border border-gray-300 rounded px-2 py-1"
                />
                <div className="flex-1">
                  <FilterListbox
                    options={[
                      { value: "", label: "Select Approver Type" },
                      ...approverTypes.map((type) => ({ value: type, label: type })),
                    ]}
                    value={step.approverType}
                    onChange={(val) => {
                      const updated = [...newRule.approvalSteps];
                      updated[index].approverType = val;
                      setNewRule({ ...newRule, approvalSteps: updated });
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={step.approverValue}
                  onChange={(e) => {
                    const updated = [...newRule.approvalSteps];
                    updated[index].approverValue = e.target.value;
                    setNewRule({ ...newRule, approvalSteps: updated });
                  }}
                  className="flex-1 border border-gray-300 rounded px-2 py-1"
                  placeholder="Approver Value"
                />
                <div className="w-32">
                  <FilterListbox
                    options={[
                      { value: "SEQUENTIAL", label: "Sequential" },
                      { value: "PARALLEL", label: "Parallel" },
                    ]}
                    value={step.mode}
                    onChange={(val) => {
                      const updated = [...newRule.approvalSteps];
                      updated[index].mode = val;
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
          <button
            onClick={handleSaveRule}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition-all"
          >
            {editing ? "Update Rule" : "Save Rule"}
          </button>
        </div>
      </div>

      {/* Existing Rules */}
      <div className="max-w-5xl mx-auto bg-white mt-10 rounded-xl shadow-lg p-8 transition-all duration-300">
        <h2 className="text-2xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
          📜 Existing Rules
        </h2>

        {loading ? (
          <div className="flex justify-center py-6 text-indigo-600 font-medium animate-pulse">
            Loading rules...
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
                        <button
                          onClick={() => handleEditRule(rule)}
                          className="px-3 py-1 text-indigo-600 border border-indigo-500 rounded hover:bg-indigo-50 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteRule(rule.id)}
                          className="px-3 py-1 text-red-600 border border-red-500 rounded hover:bg-red-50 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default RuleBookPage;
