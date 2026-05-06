import React, { useEffect } from "react";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";

const EscalationForm = ({ formData, setFormData }) => {
  const { getEnumValues } = useEnums();
  const CONTACT_ROLES = getEnumValues("ContactRole");
  const ESCALATION_LEVELS = getEnumValues("EscalationLevel");
  const ESCALATION_TRIGGERS = getEnumValues("EscalationTriggerType");

  useEffect(() => {
    if (!formData.triggers) {
      setFormData((prev) => ({ ...prev, triggers: [] }));
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTriggerChange = (trigger) => {
    setFormData((prev) => {
      const exists = prev.triggers?.includes(trigger);
      return {
        ...prev,
        triggers: exists
          ? prev.triggers.filter((t) => t !== trigger)
          : [...(prev.triggers || []), trigger],
      };
    });
  };

  return (
    <div className="border-t pt-4 space-y-4">
      {/* ===== CONTACT & LEVEL (RESPONSIVE GRID) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Contact Name */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Contact Name *
          </label>
          <input
            name="contactName"
            placeholder="John Doe"
            value={formData.contactName || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        {/* Contact Role */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Contact Role *
          </label>
          <select
            name="contactRole"
            value={formData.contactRole || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          >
            <option value="">Select Role</option>
            {CONTACT_ROLES.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
              </option>
            ))}
          </select>
        </div>

        {/* Escalation Level */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Escalation Level *
          </label>
          <select
            name="escalationLevel"
            value={formData.escalationLevel || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          >
            <option value="">Select Level</option>
            {ESCALATION_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ===== EMAIL / PHONE / ACTIVE ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end">
        {/* Email */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Email *
          </label>
          <input
            type="email"
            name="email"
            placeholder="john@example.com"
            value={formData.email || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Phone
          </label>
          <input
            name="phone"
            placeholder="+1 234 567 890"
            value={formData.phone || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        {/* Active */}
        <div className="flex items-center gap-3 py-2">
          <label htmlFor="activeFlag" className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              id="activeFlag"
              checked={formData.activeFlag ?? true}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  activeFlag: e.target.checked,
                }))
              }
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-700">
              Active Status
            </span>
          </label>
        </div>
      </div>

      {/* ===== TRIGGERS (PILL STYLE) ===== */}
      <div className="pt-2">
        <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-3">
          Escalation Triggers
        </label>

        <div className="flex flex-wrap gap-2">
          {ESCALATION_TRIGGERS.map((trigger) => (
            <label
              key={trigger}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-xs font-medium cursor-pointer transition-all duration-200 select-none
                ${formData.triggers?.includes(trigger)
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-sm"
                  : "bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
            >
              <input
                type="checkbox"
                checked={formData.triggers?.includes(trigger)}
                onChange={() => handleTriggerChange(trigger)}
                className="hidden"
              />
              {trigger.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default EscalationForm;
