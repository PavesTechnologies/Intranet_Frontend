import React, { useState, useEffect, Fragment } from "react";
import { X, FileText, Check, ChevronDown } from "lucide-react";
import axios from "axios";
import { Listbox, Transition } from "@headlessui/react";
import { toast } from "react-toastify";
import LoadingSpinner from "../../../components/LoadingSpinner";
import Button from "../../../components/Button/Button";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const useLeavelables = () => {
  const [leavelables, setLeavelables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accrualFrequency, setaccrualFrequency] = useState([]);

  useEffect(() => {
    const fetchLeavelables = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/leave/types`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const accfre = await axios.get(
          `${BASE_URL}/api/leave/accrual-frequencies`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );
        setaccrualFrequency(accfre.data || []);
        // console.log("res", res);
        // console.log("accfre", accfre);
        // console.log("freq", accrualFrequency);
        const types = res.data?.data || res.data || [];
        setLeavelables(types); // store full {name, label} objects
      } catch (err) {
        toast.error("Failed to fetch leave labels.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchLeavelables();
  }, []);

  return { leavelables, loading, accrualFrequency };
};

const GENDERS = [
  { value: "Male", label: "Male" },
  { value: "Female", label: "Female" },
  { value: "Other", label: "Other" },
];

export function GenderDropdown({ value, onChange }) {
  const selectedGender = GENDERS.find((g) => g.value === value);

  return (
    <Listbox value={value} onChange={onChange}>
      <div className="relative w-full">
        {/* Button */}
        <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm">
          <span className="block truncate text-gray-700">
            {selectedGender ? selectedGender.label : "Select Gender"}
          </span>
          <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown className="h-5 w-5 text-gray-400" />
          </span>
        </Listbox.Button>

        {/* Options */}
        <Transition as={Fragment} leave="transition ease-in duration-100">
          <Listbox.Options className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
            {GENDERS.map((gender) => (
              <Listbox.Option
                key={gender.value}
                value={gender.value}
                className={({ active }) =>
                  `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                    active ? "bg-green-100 text-green-900" : "text-gray-900"
                  }`
                }
              >
                {({ selected }) => (
                  <>
                    <span
                      className={`block truncate ${
                        selected ? "font-medium" : "font-normal"
                      }`}
                    >
                      {gender.label}
                    </span>
                    {selected && (
                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-600">
                        <Check className="h-5 w-5" />
                      </span>
                    )}
                  </>
                )}
              </Listbox.Option>
            ))}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  );
}

const defaultForm = {
  leaveTypeId: "",
  leaveName: "",
  description: "",
  maxDaysPerYear: "",
  maxCarryForwardPerYear: "",
  maxCarryForward: "",
  accrualFrequency: "",
  requiresDocumentation: false,
  expiryDays: "",
  waitingPeriodDays: "",
  advanceNoticeDays: "",
  pastDateLimitDays: "",
  allowHalfDay: true,
  allowNegativeBalance: false,
  noticePeriodRestriction: false,
  weekendsAndHolidaysAllowed: false,
  active: true,
  effectiveStartDate: "",
  maxLeaveDays: "",
  minLeaveDays: "",
  coolDownPeriod: "",
  gender: "",
  maxNoOfTimes: "",
  // deactivationEffectiveDate: "",
};

const AddLeaveTypeModal = ({ isOpen, onClose, editData = null, onSuccess }) => {
  const [formData, setFormData] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const {
    leavelables,
    loading: loadinglables,
    accrualFrequency,
  } = useLeavelables();

  useEffect(() => {
    if (isOpen) {
      setFormData(editData ? { ...defaultForm, ...editData } : defaultForm);
    }
  }, [isOpen, editData]);

  useEffect(() => {
    if (isGenderBasedLeave(formData.leaveName)) {
      setFormData((prev) => ({ ...prev, gender: "" }));
    }
  }, [formData.leaveName]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const isGenderBasedLeave = (leaveName) => {
    if (!leaveName) return false;
    const name = leaveName.toLowerCase();
    return name === "paternity_leave" || name === "maternity_leave";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    let payload;
    const isGender = isGenderBasedLeave(formData.leaveName);

    if (editData) {
      // --- PAYLOAD FOR UPDATING (Keep your existing structure) ---
      payload = isGender
        ? {
            updateType: "GENDER_BASED",
            genderBasedLeave: {
              leaveTypeId: editData.leaveTypeId,
              leaveName: formData.leaveName,
              maxLeaveDays: Number(formData.maxLeaveDays) || 0,
              minLeaveDays: Number(formData.minLeaveDays) || 0,
              waitingPeriodDays: Number(formData.waitingPeriodDays) || 0,
              advanceNotice: Number(formData.advanceNoticeDays) || 0,
              coolDownPeriod: Number(formData.coolDownPeriod) || 0,
              requiresDocumentation: formData.requiresDocumentation,
              allowNegativeBalance: formData.allowNegativeBalance,
              noticePeriodRestrictions: formData.noticePeriodRestriction,
              weekendsAndHolidaysAllowed: formData.weekendsAndHolidaysAllowed,
              active: formData.active,
              gender: formData.gender,
              effectiveStartDate: formData.effectiveStartDate,
              maxNoOfTimes: Number(formData.maxNoOfTimes) || 0,
            },
          }
        : {
            updateType: "REGULAR",
            leaveType: {
              leaveTypeId: editData.leaveTypeId,
              leaveName: formData.leaveName,
              description: formData.description,
              accrualFrequency: formData.accrualFrequency,
              maxDaysPerYear: Number(formData.maxDaysPerYear) || 0,
              maxCarryForward: Number(formData.maxCarryForward) || 0,
              maxCarryForwardPerYear:
                Number(formData.maxCarryForwardPerYear) || 0,
              expiryDays: Number(formData.expiryDays) || 0,
              waitingPeriodDays: Number(formData.waitingPeriodDays) || 0,
              advanceNoticeDays: Number(formData.advanceNoticeDays) || 0,
              pastDateLimitDays: Number(formData.pastDateLimitDays) || 0,
              allowHalfDay: formData.allowHalfDay,
              allowNegativeBalance: formData.allowNegativeBalance,
              noticePeriodRestriction: formData.noticePeriodRestriction,
              weekendsAndHolidaysAllowed: formData.weekendsAndHolidaysAllowed,
              active: formData.active,
              effectiveStartDate: formData.effectiveStartDate,
            },
          };
    } else {
      // --- PAYLOAD FOR ADDING (Flat structure, no updateType) ---
      payload = isGender
        ? {
            // Gender-based Add Payload
            leaveName: formData.leaveName,
            maxLeaveDays: Number(formData.maxLeaveDays) || 0,
            minLeaveDays: Number(formData.minLeaveDays) || 0,
            waitingPeriodDays: Number(formData.waitingPeriodDays) || 0,
            advanceNotice: Number(formData.advanceNoticeDays) || 0,
            coolDownPeriod: Number(formData.coolDownPeriod) || 0,
            requiresDocumentation: formData.requiresDocumentation,
            allowNegativeBalance: formData.allowNegativeBalance,
            noticePeriodRestrictions: formData.noticePeriodRestriction,
            weekendsAndHolidaysAllowed: formData.weekendsAndHolidaysAllowed,
            active: formData.active,
            gender: formData.gender,
            effectiveStartDate: formData.effectiveStartDate,
            maxNoOfTimes: Number(formData.maxNoOfTimes) || 0,
          }
        : {
            // Regular Add Payload
            leaveName: formData.leaveName,
            description: formData.description,
            accrualFrequency: formData.accrualFrequency,
            maxDaysPerYear: Number(formData.maxDaysPerYear) || 0,
            maxCarryForward: Number(formData.maxCarryForward) || 0,
            maxCarryForwardPerYear:
              Number(formData.maxCarryForwardPerYear) || 0,
            expiryDays: Number(formData.expiryDays) || 0,
            waitingPeriodDays: Number(formData.waitingPeriodDays) || 0,
            advanceNoticeDays: Number(formData.advanceNoticeDays) || 0,
            pastDateLimitDays: Number(formData.pastDateLimitDays) || 0,
            allowHalfDay: formData.allowHalfDay,
            allowNegativeBalance: formData.allowNegativeBalance,
            noticePeriodRestriction: formData.noticePeriodRestriction,
            weekendsAndHolidaysAllowed: formData.weekendsAndHolidaysAllowed,
            active: formData.active,
            effectiveStartDate: formData.effectiveStartDate,
          };
    }

    // Determine URL and Method
    const url = editData
      ? `${BASE_URL}/api/leave/update-leave-type/${editData.leaveTypeId}`
      : isGender
        ? `${BASE_URL}/api/gender-base-leave/add-leave`
        : `${BASE_URL}/api/leave/add-leave-type`;

    const method = editData ? "patch" : "post";

    try {
      const response = await axios({
        method,
        url,
        data: payload,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.data?.success) {
        toast.success(
          response.data.message || (editData ? "Updated!" : "Added!"),
        );
        onSuccess?.();
        onClose();
      } else {
        toast.error(response.data?.message || "Something went wrong!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  };

  const isGenderBased = isGenderBasedLeave(formData.leaveName);

  const isFormValid =
    formData.leaveName &&
    formData.effectiveStartDate &&
    (isGenderBased ? formData.gender : formData.accrualFrequency);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg sm:max-w-xl max-h-[90vh] overflow-y-auto relative">
        {submitting && (
          <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-xl z-50">
            <LoadingSpinner text="Submitting..." />
          </div>
        )}

        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center">
            <FileText className="w-6 h-6 text-green-600 mr-3" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
              {editData ? "Edit Leave Type" : "Add New Leave Type"}
            </h2>
          </div>
          <Button
            onClick={onClose}
            variant=""
            type="button"
            size="small"
            disabled={submitting}
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
          {/* Leave Name Dropdown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Leave Name *
            </label>
            {loadinglables ? (
              <p className="text-gray-500 text-sm">Loading leave labels...</p>
            ) : (
              <Listbox
                value={formData.leaveName}
                onChange={(selectedName) =>
                  setFormData((prev) => ({ ...prev, leaveName: selectedName }))
                }
              >
                <div className="relative mt-1">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm">
                    <span className="block truncate">
                      {leavelables.find(
                        (item) => item.name === formData.leaveName,
                      )?.label || "Select leave name"}
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </span>
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {leavelables.map((item) => (
                        <Listbox.Option
                          key={item.name}
                          value={item.name}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-green-100 text-green-900"
                                : "text-gray-900"
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {item.label}
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-600">
                                  <Check className="w-5 h-5" />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            )}
          </div>

          {/* Effective Dates */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effective Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                name="effectiveStartDate"
                value={formData.effectiveStartDate}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div>
            {/* <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deactivation Effective Date
              </label>
              <input
                type="date"
                name="deactivationEffectiveDate"
                value={formData.deactivationEffectiveDate}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              />
            </div> */}
          </div>

          {/* accrualFrequency */}
          {isGenderBasedLeave(formData.leaveName) ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender <span className="text-red-500">*</span>
              </label>
              <GenderDropdown
                value={formData.gender}
                onChange={(val) =>
                  setFormData((prev) => ({
                    ...prev,
                    gender: val,
                  }))
                }
              />
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Accrual Frequency <span className="text-red-500">*</span>
              </label>

              <Listbox
                value={formData.accrualFrequency}
                onChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    accrualFrequency: value,
                  }))
                }
              >
                <div className="relative mt-1">
                  <Listbox.Button className="relative w-full cursor-pointer rounded-lg border border-gray-300 bg-white py-3 pl-4 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-green-500 sm:text-sm">
                    <span className="block truncate">
                      {formData.accrualFrequency || "Select Frequency"}
                    </span>
                    <span className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    </span>
                  </Listbox.Button>

                  <Transition
                    as={Fragment}
                    leave="transition ease-in duration-100"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                  >
                    <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                      {accrualFrequency.map((freq, index) => (
                        <Listbox.Option
                          key={index}
                          value={freq}
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                              active
                                ? "bg-green-100 text-green-900"
                                : "text-gray-900"
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                {freq}
                              </span>
                              {selected && (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-green-600">
                                  <Check className="w-5 h-5" />
                                </span>
                              )}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
          )}

          {/* Numeric Fields */}
          {formData.leaveName.toLowerCase() === "paternity_leave" ||
          formData.leaveName.toLowerCase() === "maternity_leave" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "maxLeaveDays",
                "minLeaveDays",
                "maxNoOfTimes",
                "waitingPeriodDays",
                "advanceNoticePeriod",
                "coolDownPeriod",
              ].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>
                  <input
                    name={key}
                    type="number"
                    min="0"
                    value={formData[key]}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                "maxDaysPerYear",
                "maxCarryForward",
                "maxCarryForwardPerYear",
                "expiryDays",
                "waitingPeriodDays",
                "advanceNoticeDays",
                "pastDateLimitDays",
              ].map((key) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>
                  <input
                    name={key}
                    type="number"
                    min="0"
                    value={formData[key]}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 resize-none"
              placeholder="Describe the leave type"
            />
          </div>

          {/* Boolean Fields */}
          {isGenderBasedLeave(formData.leaveName) ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "requiresDocumentation",
                "allowNegativeBalance",
                "noticePeriodRestriction",
                "weekendsAndHolidaysAllowed",
                "active",
              ].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    id={key}
                    type="checkbox"
                    name={key}
                    checked={formData[key]}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label
                    htmlFor={key}
                    className="text-sm font-medium text-gray-700"
                  >
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                "requiresDocumentation",
                "allowHalfDay",
                "allowNegativeBalance",
                "noticePeriodRestriction",
                "weekendsAndHolidaysAllowed",
                "active",
              ].map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <input
                    id={key}
                    type="checkbox"
                    name={key}
                    checked={formData[key]}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                  />
                  <label
                    htmlFor={key}
                    className="text-sm font-medium text-gray-700"
                  >
                    {key.replace(/([A-Z])/g, " $1")}
                  </label>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-200">
            <Button
              type="button"
              onClick={onClose}
              variant="ghost"
              size="medium"
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="medium"
              loading={submitting}
              loadingText={editData ? "Updating..." : "Adding..."}
              disabled={!isFormValid}
            >
              {editData ? "Update Leave Type" : "Add Leave Type"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddLeaveTypeModal;
