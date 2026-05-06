import { useEnums } from "@/pages/resource_management/hooks/useEnums";

const SLAForm = ({ formData, setFormData }) => {
  const { getEnumValues } = useEnums();
  const SLA_TYPES = getEnumValues("SLAType");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="border-t pt-4 space-y-5">
      {/* ===== SLA CONFIG (RESPONSIVE GRID) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* SLA Type */}
        <div className="sm:col-span-2 lg:col-span-1">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            SLA Type *
          </label>
          <select
            name="slaType"
            value={formData.slaType || ""}
            onChange={handleChange}
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          >
            <option value="">Select Type</option>
            {SLA_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        {/* SLA Duration */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Duration (Days) *
          </label>
          <input
            type="number"
            name="slaDurationDays"
            value={formData.slaDurationDays || ""}
            onChange={handleChange}
            placeholder="e.g. 15"
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
        </div>

        {/* Warning Threshold */}
        <div>
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
            Warning Threshold (Days) *
          </label>
          <input
            type="number"
            name="warningThresholdDays"
            value={formData.warningThresholdDays || ""}
            onChange={handleChange}
            placeholder="e.g. 5"
            className="w-full mt-1.5 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none"
          />
        </div>
      </div>

      {/* ===== STATUS (MODERN TOGGLE) ===== */}
      <div className="pt-2">
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
  );
};

export default SLAForm;