import React, { useState, useEffect, Fragment, useMemo } from "react";
import { useEnums } from "@/pages/resource_management/hooks/useEnums";
import { Listbox, Combobox, Transition } from "@headlessui/react";
import { ChevronDownIcon, CheckIcon } from "@/components/icons";
import ct from "countries-and-timezones";
import { createClient, updateClient, getProjectsByClient } from "../services/clientservice";
import { toast } from "react-toastify";
import Button from "../../../components/Button/Button";

// Updated CustomListbox to accept an 'error' prop
const CustomListbox = ({
  label,
  value,
  onChange,
  options,
  disabled = false,
  error = false, // Added error prop
}) => {
  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <Listbox value={value} onChange={onChange} disabled={disabled}>
        <div className="relative mt-1">
          <Listbox.Button
            className={`relative w-full cursor-default rounded-md border py-2 pl-3 pr-10 text-left shadow-sm focus:outline-none focus:ring-1 sm:text-sm 
            ${error ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:ring-blue-500"} 
            ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-white text-gray-900"}`}
          >
            <span className="block truncate">
              {value || "Default time zone (editable)"}
            </span>
            <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </span>
          </Listbox.Button>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Listbox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
              {options.map((option, idx) => (
                <Listbox.Option
                  key={idx}
                  className={({ active }) =>
                    `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? "bg-blue-100 text-blue-900" : "text-gray-900"}`
                  }
                  value={option}
                >
                  {({ selected }) => (
                    <>
                      <span
                        className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                      >
                        {option}
                      </span>
                      {selected && (
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                          <CheckIcon className="h-5 w-5" aria-hidden="true" />
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
  );
};

// Updated SearchableCombobox to accept an 'error' prop
const SearchableCombobox = ({
  label,
  value,
  onChange,
  options,
  error = false,
}) => {
  const [query, setQuery] = useState("");
  const filteredOptions =
    query === ""
      ? options
      : options.filter((o) =>
        o
          .toLowerCase()
          .replace(/\s+/g, "")
          .includes(query.toLowerCase().replace(/\s+/g, "")),
      );

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <Combobox value={value} onChange={onChange}>
        <div className="relative mt-1">
          <div
            className={`relative w-full cursor-default overflow-hidden rounded-md border bg-white text-left shadow-sm focus:outline-none sm:text-sm ${error ? "border-red-500 ring-1 ring-red-500" : "border-gray-300"}`}
          >
            <Combobox.Input
              className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 focus:outline-none"
              displayValue={(o) => o}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search country..."
            />
            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
              <ChevronDownIcon
                className="h-5 w-5 text-gray-400"
                aria-hidden="true"
              />
            </Combobox.Button>
          </div>
          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
            afterLeave={() => setQuery("")}
          >
            <Combobox.Options className="absolute mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black/5 focus:outline-none sm:text-sm z-50">
              {filteredOptions.length === 0 && query !== "" ? (
                <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                  Nothing found.
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <Combobox.Option
                    key={option}
                    className={({ active }) =>
                      `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? "bg-blue-100 text-blue-900" : "text-gray-900"}`
                    }
                    value={option}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`block truncate ${selected ? "font-medium" : "font-normal"}`}
                        >
                          {option}
                        </span>
                        {selected && (
                          <span
                            className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? "text-blue-900" : "text-blue-600"}`}
                          >
                            <CheckIcon className="h-5 w-5" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    )}
                  </Combobox.Option>
                ))
              )}
            </Combobox.Options>
          </Transition>
        </div>
      </Combobox>
    </div>
  );
};




const CreateClient = ({ mode, initialData, onSuccess, isEditable }) => {
  const { getEnumValues } = useEnums();
  const CLIENT_TYPES = getEnumValues("ClientType");
  const PRIORITY_LEVELS = getEnumValues("PriorityLevel");
  const DELIVERY_MODELS = getEnumValues("DeliveryModel");
  const STATUS_OPTIONS = getEnumValues("RecordStatus");

  const allCountryData = useMemo(() => {

    return Object.values(ct.getAllCountries()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, []);

  const [formData, setFormData] = useState({
    client_name: "",
    client_type: "STANDARD",
    priority_level: "LOW",
    delivery_model: "ONSITE",
    status: "ACTIVE",
    country_name: "",
    default_timezone: "",
    SLA: false,
    compliance: false,
    escalationContact: true,
    assets: false,
  });

  useEffect(() => {
    if (mode === "edit" && initialData) {
      setFormData({
        clientId: initialData.clientId,
        client_name: initialData.client_name,
        client_type: initialData.client_type,
        priority_level: initialData.priority_level,
        delivery_model: initialData.delivery_model,
        country_name: initialData.country_name,
        default_timezone: initialData.default_timezone,
        status: initialData.status,
        SLA: initialData.SLA,
        compliance: initialData.compliance,
        escalationContact: initialData.escalationContact,
        assets: initialData.assets,
      });
    }
  }, [mode, initialData]);

  const [timezoneOptions, setTimezoneOptions] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState([]); // Array to store names of invalid fields

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors.includes(name)) setErrors(errors.filter((f) => f !== name)); // Clear error on type
  };

  const handleGenericListboxChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors.includes(field)) setErrors(errors.filter((f) => f !== field));
  };

  const handleCountryChange = (selectedCountryName) => {
    const countryData = allCountryData.find(
      (c) => c.name === selectedCountryName,
    );
    if (!countryData) return;
    const tzIds = countryData.timezones || [];
    const uniqueOffsets = [
      ...new Set(tzIds.map((id) => `UTC${ct.getTimezone(id).utcOffsetStr}`)),
    ];

    setTimezoneOptions(uniqueOffsets);
    setFormData((prev) => ({
      ...prev,
      country_name: countryData.name,
      default_timezone: uniqueOffsets.length > 0 ? uniqueOffsets[0] : "",
    }));
    // Clear country and timezone errors
    setErrors(
      errors.filter((f) => f !== "country_name" && f !== "default_timezone"),
    );
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async () => {
    // Define mandatory keys
    const mandatoryFields = [
      "client_name",
      "client_type",
      "priority_level",
      "delivery_model",
      "status",
      "country_name",
      "default_timezone",
    ];

    const newErrors = mandatoryFields.filter((field) => !formData[field]);

    if (newErrors.length > 0) {
      setErrors(newErrors);
      toast.error("Please fill in all mandatory fields.");
      return;
    }

    setIsSubmitting(true);

    // If changing status from ACTIVE to INACTIVE, check for active projects
    // if (mode === "edit" && formData.status === "INACTIVE" && initialData.status === "ACTIVE") {
    //   try {
    //     const projectsResponse = await getProjectsByClient(formData.clientId);
    //     if (projectsResponse.success && Array.isArray(projectsResponse.data)) {
    //       const hasActiveProjects = projectsResponse.data.some(
    //         (project) => project.projectStatus === "ACTIVE"
    //       );
    //       if (hasActiveProjects) {
    //         toast.error(
    //           "Cannot deactivate: This client still has active projects. Please complete or reassign them first."
    //         );
    //         setIsSubmitting(false);
    //         onSuccess?.();
    //       }
    //     }
    //   } catch (error) {
    //     console.error("Error checking client projects:", error);
    //     // toast.error("Failed to check client projects.");
    //     // setIsSubmitting(false);
    //   }
    // } else {
    try {
      const clientCreation =
        mode === "create"
          ? await createClient(formData)
          : await updateClient(formData);
      toast.success(
        clientCreation.message ||
        (mode === "create"
          ? "Client created successfully."
          : "Client updated successfully."),
      );
      onSuccess?.();
    } catch (error) {
      toast.error(
        error.response?.data?.message ||
        (mode === "create"
          ? "Failed to create client."
          : "Failed to update client."),
      );
    } finally {
      setIsSubmitting(false);
    }
    // }
  };

  return (
    <div className="p-1">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-2">
        <div className="col-span-1 md:col-span-2">
          <label className="block text-sm font-medium text-gray-700">
            Client Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="client_name"
            value={formData.client_name}
            onChange={handleInputChange}
            className={`mt-2 block w-full border rounded-md p-2 focus:ring-blue-500 shadow-sm ${errors.includes("client_name") ? "border-red-500 ring-1 ring-red-500" : "border-gray-300 focus:border-blue-500"}`}
            placeholder="Enter client name"
          />
        </div>

        <CustomListbox
          label="Client Type"
          value={formData.client_type}
          options={CLIENT_TYPES}
          onChange={(val) => handleGenericListboxChange("client_type", val)}
          error={errors.includes("client_type")}
        />

        <CustomListbox
          label="Priority Level"
          value={formData.priority_level}
          options={PRIORITY_LEVELS}
          onChange={(val) => handleGenericListboxChange("priority_level", val)}
          error={errors.includes("priority_level")}
        />

        <CustomListbox
          label="Delivery Model"
          value={formData.delivery_model}
          options={DELIVERY_MODELS}
          onChange={(val) => handleGenericListboxChange("delivery_model", val)}
          error={errors.includes("delivery_model")}
        />

        <CustomListbox
          label="Status"
          value={formData.status}
          options={mode !== "edit" ? STATUS_OPTIONS.filter(opt => opt !== "INACTIVE") : STATUS_OPTIONS}
          onChange={(val) => handleGenericListboxChange("status", val)}
          error={errors.includes("status")}
        />

        {/* <div className="col-span-1 md:col-span-2 border-t pt-4 mt-2">
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Location Settings</h3>
        </div> */}

        <div className="col-span-1 md:col-span-2">
          <SearchableCombobox
            label={
              <span>
                Country <span className="text-red-500">*</span>
              </span>
            }
            value={formData.country_name}
            options={allCountryData.map((c) => c.name)}
            onChange={handleCountryChange}
            error={errors.includes("country_name")}
          />
        </div>

        <div className="col-span-1 md:col-span-2">
          <CustomListbox
            label={
              <span>
                Default Timezone <span className="text-red-500">*</span>
              </span>
            }
            value={formData.default_timezone}
            options={timezoneOptions}
            onChange={(val) =>
              handleGenericListboxChange("default_timezone", val)
            }
            disabled={!formData.country_name}
            error={errors.includes("default_timezone")}
          />
        </div>

        {/* <div className="grid gap-3 sm:grid-cols-2 col-span-1 md:col-span-2">
          {["SLA", "compliance", "escalationContact", "assets"].map((key) => (
            <div key={key} className="flex items-center gap-2">
              <input
                id={key}
                type="checkbox"
                name={key}
                checked={formData[key]}
                disabled={mode === "edit"}
                onChange={handleChange}
                className="rounded border-gray-300 text-green-600 focus:ring-green-500"
              />
              <label htmlFor={key} className="text-sm font-medium text-gray-700">
                {key.replace(/([A-Z])/g, " $1")}
              </label>
            </div>
          ))}
        </div> */}
        <div className="grid gap-3 sm:grid-cols-2 col-span-1 md:col-span-2">
          {["SLA", "compliance", "escalationContact", "assets"].map((key) => {
            const isDisabled = isEditable;

            return (
              <div
                key={key}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition
          ${isDisabled ? "bg-gray-50 opacity-70 cursor-not-allowed" : "hover:bg-gray-50"}
        `}
              >
                <input
                  id={key}
                  type="checkbox"
                  name={key}
                  checked={formData[key]}
                  disabled={isDisabled}
                  onChange={handleChange}
                  className={`rounded border-gray-300 text-green-600 focus:ring-green-500
            ${isDisabled ? "cursor-not-allowed" : "cursor-pointer"}
          `}
                />

                <label
                  htmlFor={key}
                  className={`text-sm font-medium
            ${isDisabled ? "text-gray-400 cursor-not-allowed" : "text-gray-700 cursor-pointer"}
          `}
                >
                  {key.replace(/([A-Z])/g, " $1")}
                </label>
              </div>
            );
          })}
        </div>

        <div className="col-span-1 md:col-span-2 flex justify-end mt-4">
          <Button
            variant="primary"
            size="medium"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className={`${isSubmitting ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {mode === "edit"
              ? isSubmitting
                ? `Updating...`
                : `Update Client`
              : isSubmitting
                ? `Creating...`
                : `Create Client`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateClient;
