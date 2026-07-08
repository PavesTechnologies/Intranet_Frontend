import React, { Fragment, useEffect, useMemo, useState } from "react";
import { Combobox, Transition } from "@headlessui/react";
import {
  Award,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  FileBadge,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
  Pencil,
  Trash2,
} from "lucide-react";
import { useLocation } from "react-router-dom";
import Button from "../../../components/Button/Button";
import { Fonts } from "../../../components/Fonts/Fonts";
import ConfirmationModal from "../../../components/confirmation_modal/ConfirmationModal";
import Pagination from "../../../components/Pagination/pagination";
import { skillService } from "../../../services/skillService";
import { notify } from "../../resource_management/utils/notify";

const initialForm = {
  certificateName: "",
  providerName: "",
  categoryId: "",
  skillId: "",
  validityType: "permanent",
  validityMonths: "",
};

const CERTIFICATES_PAGE_SIZE = 10;

const normalize = (value) => `${value || ""}`.trim().toLowerCase();

const getCertificateId = (certificate) =>
  certificate?.certificateId ||
  certificate?.id ||
  certificate?.uuid ||
  certificate?.certificateUuid;

const formatDate = (value) => {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getCreatedDate = (certificate) =>
  certificate.createdDate ||
  certificate.createdAt ||
  certificate.created_on ||
  certificate.createdOn ||
  certificate.updatedAt;

const isGeneralCertificateRecord = (certificate) => {
  const rawType = normalize(
    certificate.type ||
      certificate.certificateType ||
      certificate.certificationType,
  );
  if (rawType.includes("general")) return true;
  if (rawType.includes("skill")) return false;
  return !(
    certificate.skillId ||
    certificate.skill?.id ||
    certificate.skillName ||
    certificate.categoryId ||
    certificate.category?.id ||
    certificate.categoryName
  );
};

const getValidityLabel = (certificate) => {
  const validityType = normalize(
    certificate.validityType || certificate.validity_status,
  );
  const validityMonths =
    certificate.validityMonths || certificate.validity_months;

  if (validityType.includes("expire") || validityMonths) {
    return validityMonths ? `Expires in ${validityMonths} months` : "Expires";
  }

  if (validityType.includes("permanent") || validityType.includes("lifetime")) {
    return "Permanent";
  }

  return "Permanent";
};

const getValidityTone = (label) =>
  label.toLowerCase().includes("expire")
    ? "bg-amber-50 text-amber-700 ring-amber-600/20"
    : "bg-emerald-50 text-emerald-700 ring-emerald-600/20";

const getSkillDisplayName = (certificate) =>
  certificate.skillName ||
  certificate.skill?.name ||
  certificate.skill?.skillName ||
  certificate.skill?.skill_name ||
  certificate.skill?.label ||
  certificate.skill?.title ||
  null;

const getCategoryDisplayName = (certificate) =>
  certificate.categoryName ||
  certificate.category?.name ||
  certificate.category?.categoryName ||
  certificate.category?.category_name ||
  (certificate.categoryId ? String(certificate.categoryId) : null);

const getCertificateMappedCount = (certificate) => {
  const count = [
    certificate?.mappedResourceCount,
    certificate?.resourceMappedCount,
    certificate?.resourceCount,
    certificate?.mappedCount,
    certificate?.mappingCount,
    certificate?.usageCount,
    certificate?.resourceCertificateCount,
  ].find((value) => Number(value) > 0);

  if (count) return Number(count);

  const resources =
    certificate?.mappedResources ||
    certificate?.resources ||
    certificate?.resourceCertificates ||
    certificate?.mappings;

  return Array.isArray(resources) ? resources.length : 0;
};

const isCertificateMappedFromRecord = (certificate) =>
  Boolean(
    certificate?.isMapped === true ||
      certificate?.mapped === true ||
      certificate?.alreadyMapped === true ||
      certificate?.isAlreadyMapped === true ||
      certificate?.mappedToResources === true ||
      getCertificateMappedCount(certificate) > 0,
  );

const getMappedCountFromResponse = (response, certificateId) => {
  const payload = response?.data ?? response;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.content)
      ? payload.content
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.results)
          ? payload.results
          : null;

  if (Array.isArray(list)) {
    if (!certificateId) return list.length;

    return list.filter((item) => {
      const itemCertificateId =
        item?.certificateId ||
        item?.certificate?.certificateId ||
        item?.certificate?.id ||
        item?.certificate_id;
      return String(itemCertificateId || "") === String(certificateId);
    }).length;
  }

  const count = [
    payload?.mappedResourceCount,
    payload?.resourceMappedCount,
    payload?.resourceCount,
    payload?.mappedCount,
    payload?.mappingCount,
    payload?.totalElements,
    payload?.totalCount,
  ].find((value) => Number(value) > 0);

  if (count) return Number(count);
  return 0;
};

const getApiList = (response) => {
  if (Array.isArray(response)) return response;
  if (Array.isArray(response?.data)) return response.data;
  if (Array.isArray(response?.data?.data)) return response.data.data;
  if (Array.isArray(response?.result)) return response.result;
  if (Array.isArray(response?.payload)) return response.payload;
  return [];
};

const normalizeOption = (source) => ({
  ...source,
  id:
    source.id ||
    source.categoryId ||
    source.category_id ||
    source.categoryUuid ||
    source.categoryUUID ||
    source.category_uuid ||
    source.skillId ||
    source.skill_id ||
    source.skillUuid ||
    source.skillUUID ||
    source.skill_uuid ||
    source.uuid,
  name:
    source.name ||
    source.categoryName ||
    source.category_name ||
    source.skillName ||
    source.skill_name ||
    source.label ||
    source.title,
});

const mapCategoryOption = (item) => {
  if (typeof item === "string") {
    return { id: item, name: item };
  }

  const nestedCategory =
    item?.category && typeof item.category === "object" ? item.category : null;
  return normalizeOption(nestedCategory || item || {});
};

const mapSkillOption = (item) => {
  if (typeof item === "string") {
    return { id: item, name: item };
  }

  const nestedSkill =
    item?.skill && typeof item.skill === "object" ? item.skill : null;
  const source = nestedSkill || item || {};
  const option = normalizeOption(source);

  return {
    ...option,
    name:
      option.name ||
      source.skill?.name ||
      source.skillName ||
      source.skill_name,
  };
};

const uniqueOptions = (items) => {
  const seen = new Set();
  return items.filter((option) => {
    const key = String(option.id);
    if (!option.id || !option.name || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mapCategoryOptions = (items) =>
  uniqueOptions(items.map(mapCategoryOption));
const mapSkillOptions = (items) => uniqueOptions(items.map(mapSkillOption));

const FieldError = ({ message }) =>
  message ? (
    <p className="mt-1.5 text-xs font-medium text-rose-600">{message}</p>
  ) : null;

const TextField = ({ label, required, error, className = "", ...props }) => (
  <div className={className}>
    <label className={`${Fonts.label} mb-1.5 block`}>
      {label}
      {required ? <span className="ml-1 text-rose-500">*</span> : null}
    </label>
    <input
      className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-gray-900 shadow-sm outline-none transition placeholder:text-gray-400 focus:ring-2 ${
        error
          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/10"
          : "border-gray-200 focus:border-indigo-500 focus:ring-indigo-500/10"
      }`}
      {...props}
    />
    <FieldError message={error} />
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder,
  onFocus,
}) => (
  <div>
    <label className={`${Fonts.label} mb-1.5 block`}>
      {label}
    </label>
    <div className="relative">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={onFocus}
        onClick={onFocus}
        className="w-full appearance-none rounded-lg border border-gray-200 bg-white px-3.5 py-2.5 pr-10 text-sm text-gray-900 shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
    </div>
  </div>
);

const SearchableSkillSelect = ({
  value,
  onChange,
  options,
  loading,
  error,
  disabled,
}) => {
  const [query, setQuery] = useState("");
  const selectedOption = options.find(
    (option) => String(option.id) === String(value),
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.name} ${option.description || ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <div>
      <label className={`${Fonts.label} mb-1.5 block`}>
        Skill<span className="ml-1 text-rose-500">*</span>
      </label>
      <Combobox
        value={value}
        onChange={(nextValue) => {
          onChange(nextValue);
          setQuery("");
        }}
        disabled={disabled}
      >
        {({ open }) => (
          <div className="relative">
            <Combobox.Button
              as="div"
              className={`relative w-full rounded-xl border bg-white shadow-sm transition ${
                error
                  ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/10"
                  : "border-gray-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10"
              } ${disabled ? "cursor-not-allowed bg-gray-50 opacity-70" : ""}`}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Combobox.Input
                className="w-full border-none bg-transparent py-2.5 pl-9 pr-10 text-sm text-gray-900 outline-none focus:ring-0"
                displayValue={() => selectedOption?.name || ""}
                onFocus={() => onFocus && onFocus()}
                placeholder="Select Skill"
                readOnly
              />
              {loading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500" />
              ) : (
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition ${
                    open ? "rotate-180 text-indigo-600" : ""
                  }`}
                />
              )}
            </Combobox.Button>

            <Transition
              as={Fragment}
              show={open}
              enter="transition ease-out duration-150"
              enterFrom="translate-y-1 opacity-0"
              enterTo="translate-y-0 opacity-100"
              leave="transition ease-in duration-100"
              leaveFrom="translate-y-0 opacity-100"
              leaveTo="translate-y-1 opacity-0"
              afterLeave={() => setQuery("")}
            >
              <Combobox.Options className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl focus:outline-none">
                {/* ADD THIS SEARCH BOX */}
                <div className="sticky top-0 bg-white p-2 border-b">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search Skill..."
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>

                {filteredOptions.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                    No skills found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <Combobox.Option
                      key={option.id}
                      value={option.id}
                      className={({ active, selected }) =>
                        `relative cursor-pointer rounded-lg py-2.5 pl-10 pr-4 text-sm transition ${
                          selected
                            ? "bg-indigo-600 font-semibold text-white"
                            : active
                              ? "bg-indigo-50 text-indigo-700"
                              : "text-gray-700"
                        }`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className="block truncate">{option.name}</span>
                          {selected ? (
                            <Check className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Transition>
          </div>
        )}
      </Combobox>
      <FieldError message={error} />
    </div>
  );
};

const SearchableCategorySelect = ({
  value,
  onChange,
  options,
  loading,
  error,
  disabled,
  onFocus,
}) => {
  const [query, setQuery] = useState("");
  const selectedOption = options.find(
    (option) => String(option.id) === String(value),
  );
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return options;
    return options.filter((option) =>
      `${option.name} ${option.description || ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [options, query]);

  return (
    <div>
      <label className={`${Fonts.label} mb-1.5 block`}>
        Skill Category
      </label>
      <Combobox
        value={value}
        onChange={(nextValue) => {
          onChange(nextValue);
          setQuery("");
        }}
        disabled={disabled}
      >
        {({ open }) => (
          <div className="relative">
            <Combobox.Button
              as="div"
              className={`relative w-full rounded-xl border bg-white shadow-sm transition ${
                error
                  ? "border-rose-300 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/10"
                  : "border-gray-200 hover:border-indigo-300 focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/10"
              } ${disabled ? "cursor-not-allowed bg-gray-50 opacity-70" : ""}`}
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Combobox.Input
                className="w-full border-none bg-transparent py-2.5 pl-9 pr-10 text-sm text-gray-900 outline-none focus:ring-0"
                displayValue={() => selectedOption?.name || ""}
                onFocus={() => onFocus && onFocus()}
                placeholder="Select Category"
                readOnly
              />
              {loading ? (
                <Loader2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-indigo-500" />
              ) : (
                <ChevronDown
                  className={`pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 transition ${open ? "rotate-180 text-indigo-600" : ""}`}
                />
              )}
            </Combobox.Button>

            <Transition
              as={Fragment}
              show={open}
              enter="transition ease-out duration-150"
              enterFrom="translate-y-1 opacity-0"
              enterTo="translate-y-0 opacity-100"
              leave="transition ease-in duration-100"
              leaveFrom="translate-y-0 opacity-100"
              leaveTo="translate-y-1 opacity-0"
              afterLeave={() => setQuery("")}
            >
              <Combobox.Options className="absolute z-50 mt-2 max-h-64 w-full overflow-auto rounded-xl border border-gray-200 bg-white p-1.5 shadow-xl focus:outline-none">
                <div className="sticky top-0 bg-white p-2 border-b">
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search category..."
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm"
                  />
                </div>
                {filteredOptions.length === 0 ? (
                  <div className="rounded-lg bg-gray-50 px-3 py-4 text-center text-sm text-gray-500">
                    No categories found
                  </div>
                ) : (
                  filteredOptions.map((option) => (
                    <Combobox.Option
                      key={option.id}
                      value={option.id}
                      className={({ active, selected }) =>
                        `relative cursor-pointer rounded-lg py-2.5 pl-10 pr-4 text-sm transition ${selected ? "bg-indigo-600 font-semibold text-white" : active ? "bg-indigo-50 text-indigo-700" : "text-gray-700"}`
                      }
                    >
                      {({ selected }) => (
                        <>
                          <span className="block truncate">{option.name}</span>
                          {selected ? (
                            <Check className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                          ) : null}
                        </>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </Combobox.Options>
            </Transition>
          </div>
        )}
      </Combobox>
      <FieldError message={error} />
    </div>
  );
};

const ValidityToggle = ({ value, onChange }) => (
  <div>
    <label className={`${Fonts.label} mb-1.5 block`}>
      Validity Type
    </label>
    <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 shadow-sm sm:w-auto">
      {[
        { label: "Permanent", value: "permanent" },
        { label: "Expires", value: "expires" },
      ].map((option) => {
        const selected = value === option.value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-lg px-5 py-2 text-sm font-semibold transition sm:flex-none ${
              selected
                ? "bg-white text-indigo-700 shadow-sm ring-1 ring-gray-200"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  </div>
);

const CertificateForm = ({
  mode,
  onCancel,
  onSaved,
  certificates = [],
  initialCertificate = null,
  isEdit = false,
}) => {
  const editing = Boolean(isEdit);
  const isGeneralCertificate = mode === "general";
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [categories, setCategories] = useState([]);
  const [skills, setSkills] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadCategories = async () => {
    if (isGeneralCertificate) return;
    if (loadingCategories || categories.length > 0) return;

    setLoadingCategories(true);
    try {
      const response = await skillService.getAllCategories();
      if (response?.success === false) {
        throw new Error(response?.error || "Unable to load categories.");
      }

      setCategories(mapCategoryOptions(getApiList(response)));
    } catch (error) {
      notify.error(error, "Unable to load skill categories.");
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [isGeneralCertificate]);

  // populate form when editing
  useEffect(() => {
    if (!initialCertificate) return;
    const cert = initialCertificate || {};
    setForm({
      certificateName: cert.certificateName || cert.name || "",
      providerName: cert.providerName || cert.provider || "",
      categoryId:
        cert.categoryId ||
        cert.category?.id ||
        cert.categoryUuid ||
        cert.category_id ||
        "",
      skillId:
        cert.skillId ||
        cert.skill?.id ||
        cert.skill?.skillId ||
        cert.skillUuid ||
        cert.skill_id ||
        "",
      validityType:
        cert.timeBound ||
        cert.validityType === "expires" ||
        cert.validity_months
          ? "expires"
          : "permanent",
      validityMonths: cert.validityMonths || cert.validity_months || "",
    });
  }, [initialCertificate]);

  useEffect(() => {
    if (isGeneralCertificate) {
      setSkills([]);
      setLoadingSkills(false);
      setForm((current) => ({ ...current, categoryId: "", skillId: "" }));
      return;
    }

    const loadSkills = async () => {
      setLoadingSkills(true);
      setForm((current) => ({ ...current, skillId: "" }));
      try {
        const response = form.categoryId
          ? await skillService.getCertificationSkillsByCategory(form.categoryId)
          : await skillService.getSkills();

        if (response?.success === false)
          throw new Error(response?.error || "Unable to load skills.");
        let mappedSkills = mapSkillOptions(getApiList(response));

        if (form.categoryId && mappedSkills.length === 0) {
          const fallbackResponse = await skillService.getSkillsByCategory(
            form.categoryId,
          );
          if (fallbackResponse?.success === false) {
            throw new Error(
              fallbackResponse?.error || "Unable to load skills.",
            );
          }
          mappedSkills = mapSkillOptions(getApiList(fallbackResponse));
        }

        setSkills(mappedSkills);
      } catch (error) {
        notify.error(error, "Unable to load skills.");
        setSkills([]);
      } finally {
        setLoadingSkills(false);
      }
    };

    loadSkills();
  }, [form.categoryId, isGeneralCertificate]);

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: "" }));
  };

  const validate = () => {
    const nextErrors = {};

    if (!form.certificateName.trim()) {
      nextErrors.certificateName = "Certificate name is required.";
    }
    if (!form.providerName.trim()) {
      nextErrors.providerName = "Provider name is required.";
    }
    if (!isGeneralCertificate && !form.skillId) {
      nextErrors.skillId = "Skill is required.";
    }
    if (!isGeneralCertificate && form.validityType === "expires") {
      const months = Number(form.validityMonths);
      if (!form.validityMonths) {
        nextErrors.validityMonths =
          "Validity duration is required when Expires is selected.";
      } else if (!Number.isInteger(months) || months <= 0) {
        nextErrors.validityMonths = "Enter a valid number of months.";
      }
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validate()) return;

    const selectedCategory = categories.find(
      (category) => String(category.id) === String(form.categoryId),
    );
    const selectedSkill = skills.find(
      (skill) => String(skill.id) === String(form.skillId),
    );
    // Build API payload using new contract:
    // - Skill certificates use certificateType: "SKILL_BASED" and include `skillId`, `timeBound`, `validityMonths`.
    // - General certificates use certificateType: "ACHIEVEMENT" and omit skill/time fields.
    const apiPayload = {
      certificateName: form.certificateName.trim(),
      providerName: form.providerName.trim(),
      certificateType: isGeneralCertificate ? "ACHIEVEMENT" : "SKILL_BASED",
      skillId: isGeneralCertificate ? null : form.skillId || null,
      timeBound: isGeneralCertificate ? false : form.validityType === "expires",
      validityMonths:
        !isGeneralCertificate && form.validityType === "expires"
          ? Number(form.validityMonths)
          : null,
    };

    // Client-side duplicate detection to avoid backend duplicate error
    const existingCerts = Array.isArray(certificates) ? certificates : [];
    const duplicate = existingCerts.find((c) => {
      const isGeneralC = isGeneralCertificateRecord(c);
      const cName = normalize(c.certificateName || c.name || "");
      const cProvider = normalize(c.providerName || c.provider || "");
      const cSkillId = String(
        c.skillId || c.skill?.id || c.skill?.skillId || "",
      );

      const formName = normalize(form.certificateName);
      const formProvider = normalize(form.providerName);
      const formSkillId = String(form.skillId || "");
      // If editing, skip comparing with the same certificate
      if (editing && initialCertificate) {
        const currentId = String(getCertificateId(initialCertificate) || "");
        const thisId = String(getCertificateId(c) || "");
        if (currentId && thisId && currentId === thisId) return false;
      }

      if (isGeneralCertificate && isGeneralC) {
        return cName === formName && cProvider === formProvider;
      }

      if (!isGeneralCertificate && !isGeneralC) {
        return (
          cName === formName &&
          cProvider === formProvider &&
          cSkillId === formSkillId
        );
      }

      return false;
    });

    if (duplicate) {
      return notify.error(
        isGeneralCertificate
          ? "A general certificate with the same name and provider already exists."
          : "A skill certificate with the same name, provider and skill already exists.",
      );
    }

    setSaving(true);
    try {
      let response;
      if (editing && initialCertificate) {
        const certId = getCertificateId(initialCertificate);
        response = await skillService.updateCertificate(certId, apiPayload);
        if (response?.success === false)
          throw new Error(response?.error || "Certificate update failed.");
      } else {
        response = await skillService.createCertificate(apiPayload);
        if (response?.success === false)
          throw new Error(response?.error || "Certificate creation failed.");
      }

      const savedCertificate = response?.data || {
        ...apiPayload,
        certificateId:
          (editing &&
            initialCertificate &&
            getCertificateId(initialCertificate)) ||
          `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };

      notify.success(
        editing
          ? "Certificate updated successfully."
          : "Certificate saved successfully.",
      );
      setForm(initialForm);
      setErrors({});
      onSaved(savedCertificate, { isEdit: editing });
    } catch (error) {
      notify.error(
        error,
        editing
          ? "Unable to update certificate."
          : "Unable to save certificate.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="overflow-visible bg-white">
      <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
        <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
          <Award className="h-3.5 w-3.5" />
          Certificate Administration
        </div>
        <h2 className={`${Fonts.heading4} mt-3 sm:text-2xl`}>
          {isGeneralCertificate
            ? "Add General Certification"
            : "Add Skill Certification"}
        </h2>
        <p className="mt-1 max-w-2xl text-sm leading-6 text-gray-500">
          {isGeneralCertificate
            ? "Create organization-level recognition, learning, or achievement certificates without skill mapping."
            : "Configure certification metadata, skill mapping, and validity for the skill taxonomy."}
        </p>
      </div>

      <div className="px-5 py-6 sm:px-7">
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
          <TextField
            label="Certificate Name"
            required
            value={form.certificateName}
            onChange={(event) =>
              updateField("certificateName", event.target.value)
            }
            placeholder={
              isGeneralCertificate
                ? "e.g. Leadership Excellence Award"
                : "e.g. AWS Certified Solutions Architect"
            }
            error={errors.certificateName}
          />
          <TextField
            label={
              isGeneralCertificate
                ? "Issuing Organization / Provider Name"
                : "Provider Name"
            }
            required
            value={form.providerName}
            onChange={(event) =>
              updateField("providerName", event.target.value)
            }
            placeholder={
              isGeneralCertificate
                ? "e.g. Internal HR Department"
                : "e.g. Amazon Web Services"
            }
            error={errors.providerName}
          />
          {!isGeneralCertificate ? (
            <>
              <SearchableCategorySelect
                value={form.categoryId}
                onChange={(value) => updateField("categoryId", value)}
                options={categories}
                loading={loadingCategories}
                error={errors.categoryId}
                disabled={loadingCategories}
                onFocus={loadCategories}
              />
              <SearchableSkillSelect
                value={form.skillId}
                onChange={(value) => updateField("skillId", value)}
                options={skills}
                loading={loadingSkills}
                error={errors.skillId}
                disabled={loadingSkills}
              />
              <ValidityToggle
                value={form.validityType}
                onChange={(value) => {
                  updateField("validityType", value);
                  if (value === "permanent") updateField("validityMonths", "");
                }}
              />
              {form.validityType === "expires" ? (
                <TextField
                  label="Validity Duration in Months"
                  type="number"
                  min="1"
                  step="1"
                  value={form.validityMonths}
                  onChange={(event) =>
                    updateField("validityMonths", event.target.value)
                  }
                  onWheel={(event) => event.currentTarget.blur()}
                  placeholder="e.g. 24"
                  error={errors.validityMonths}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-gray-100 bg-gray-50/70 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400 w-full sm:w-auto"
        >
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-w-[92px] items-center justify-center gap-2 rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 disabled:cursor-not-allowed disabled:bg-indigo-300 disabled:shadow-none w-full sm:w-auto"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          <span>{saving ? "Saving..." : "Save"}</span>
        </button>
      </div>
    </form>
  );
};

const EmptyState = ({ isGeneral, onAdd }) => (
  <div className="rounded-xl border border-dashed border-gray-200 bg-white px-6 py-12 text-center shadow-sm">
    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
      <FileBadge className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-sm font-semibold text-gray-900">
      No {isGeneral ? "general" : "skill"} certifications found
    </h3>
    <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-gray-500">
      Add the first certificate to make it available across the employee skill
      management flow.
    </p>
    <Button onClick={onAdd} className="mt-5">
      <Plus className="h-4 w-4" />
      Add Certificate
    </Button>
  </div>
);

const CertificateCard = ({
  certificate,
  isGeneral,
  onEdit,
  onDelete,
  checkingEditId,
}) => {
  const validity = getValidityLabel(certificate);
  const certificateId = getCertificateId(certificate);
  const editChecking =
    checkingEditId && String(checkingEditId) === String(certificateId);
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-100 hover:shadow-md lg:hidden">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-gray-900">
            {certificate.certificateName ||
              certificate.name ||
              "Untitled certificate"}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
            <Building2 className="h-3 w-3" />
            <span className="truncate">
              {certificate.providerName ||
                certificate.provider ||
                "Provider not available"}
            </span>
          </p>
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
            {isGeneral ? "General" : "Skill"}
          </span>
          <button
            type="button"
            onClick={() => onEdit && onEdit(certificate)}
            disabled={editChecking}
            aria-label="Edit certificate"
            className="rounded p-1 text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {editChecking ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Pencil className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onDelete && onDelete(certificate)}
            aria-label="Delete certificate"
            className="rounded p-1 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
      {!isGeneral ? (
        <div className="mt-4 grid grid-cols-1 gap-2 text-sm text-gray-700 sm:grid-cols-2">
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Skill</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-800">
              <BookOpen className="h-4 w-4 text-gray-400" />
              <span className="truncate">
                {getSkillDisplayName(certificate) || "Not mapped"}
              </span>
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 px-3 py-2">
            <div className="text-xs text-gray-500">Validity</div>
            <div className="mt-1 text-sm text-gray-800">{validity}</div>
          </div>
        </div>
      ) : null}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
        <CalendarDays className="h-3 w-3" />
        <span>
          Created{" "}
          {formatDateTime(getCreatedDate(certificate)) ||
            formatDate(getCreatedDate(certificate)) ||
            "—"}
        </span>
      </div>
    </div>
  );
};

const CertificateLanding = () => {
  const location = useLocation();
  const isGeneral = location.pathname.endsWith("/general");
  const mode = isGeneral ? "general" : "skill";
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    certificate: null,
  });
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [checkingEditId, setCheckingEditId] = useState(null);

  const title = isGeneral ? "General Certifications" : "Skill Certifications";
  const description = isGeneral
    ? "Manage organization-level certificates, awards, and learning recognitions without skill mapping."
    : "Manage certificates mapped to skill taxonomy, including category, skill, and validity configuration.";

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const response = await skillService.getCertificates();
      if (response?.success === false) {
        throw new Error(response?.error || "Unable to load certificates.");
      }
      const data = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response)
          ? response
          : [];
      setCertificates(data);
    } catch (error) {
      notify.error(error, "Unable to load certificates.");
      setCertificates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const visibleCertificates = useMemo(() => {
    const query = normalize(searchTerm);
    return certificates
      .filter((certificate) =>
        isGeneral
          ? isGeneralCertificateRecord(certificate)
          : !isGeneralCertificateRecord(certificate),
      )
      .filter((certificate) => {
        if (!query) return true;
        return [
          certificate.certificateName,
          certificate.name,
          certificate.providerName,
          certificate.provider,
          certificate.type,
          certificate.certificateType,
          certificate.categoryName,
          certificate.category?.name,
          certificate.skillName,
          certificate.skill?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      });
  }, [certificates, isGeneral, searchTerm]);

  const totalPages = useMemo(
    () =>
      Math.max(
        1,
        Math.ceil(visibleCertificates.length / CERTIFICATES_PAGE_SIZE),
      ),
    [visibleCertificates.length],
  );

  const paginatedCertificates = useMemo(() => {
    const start = (currentPage - 1) * CERTIFICATES_PAGE_SIZE;
    return visibleCertificates.slice(start, start + CERTIFICATES_PAGE_SIZE);
  }, [visibleCertificates, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, isGeneral]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const handleSaved = (savedCertificate) => {
    setCertificates((current) => {
      const id = String(getCertificateId(savedCertificate) || "");
      const exists = current.some(
        (c) => String(getCertificateId(c) || "") === id,
      );
      if (exists) {
        return current.map((c) =>
          String(getCertificateId(c) || "") === id
            ? { ...c, ...savedCertificate }
            : c,
        );
      }
      return [savedCertificate, ...current];
    });
    setFormOpen(false);
    setEditingCertificate(null);
  };

  const openEdit = async (certificate) => {
    const id = getCertificateId(certificate);

    if (!id) {
      notify.error("Cannot determine certificate id to edit.");
      return;
    }

    if (isCertificateMappedFromRecord(certificate)) {
      notify.error(
        "This certificate is already mapped to one or more resources and cannot be edited.",
      );
      return;
    }

    try {
      setCheckingEditId(id);
      const response = await skillService.getCertificateResourceMappings(id);
      if (getMappedCountFromResponse(response, id) > 0) {
        notify.error(
          "This certificate is already mapped to one or more resources and cannot be edited.",
        );
        await fetchCertificates();
        return;
      }
    } catch (error) {
      notify.error(error, "Unable to verify certificate mappings.");
      return;
    } finally {
      setCheckingEditId(null);
    }

    setEditingCertificate(certificate);
    setFormOpen(true);
  };

  const closeDeleteModal = () => {
    if (deleteLoading) return;
    setDeleteModal({ open: false, certificate: null });
  };

  const handleDelete = (certificate) => {
    const id = getCertificateId(certificate);
    if (!id) return notify.error("Cannot determine certificate id to delete.");

    setDeleteModal({
      open: true,
      certificate,
    });
  };

  const confirmDelete = async () => {
    const certificate = deleteModal.certificate;
    const id = getCertificateId(certificate);
    if (!id) {
      notify.error("Cannot determine certificate id to delete.");
      setDeleteModal({ open: false, certificate: null });
      return;
    }

    try {
      setDeleteLoading(true);
      const response = await skillService.deleteCertificate(id);
      if (response?.success === false)
        throw new Error(response?.error || "Delete failed.");

      // Remove from local state immediately
      setCertificates((current) =>
        current.filter((c) => String(getCertificateId(c) || "") !== String(id)),
      );
      notify.success("Certificate deleted.");
      setDeleteModal({ open: false, certificate: null });

      // Refetch to ensure consistency with server
      await fetchCertificates();
    } catch (error) {
      notify.error(error, "Unable to delete certificate.");
      // Refetch to ensure UI is in sync with server
      await fetchCertificates();
    } finally {
      setDeleteLoading(false);
    }
  };

  const deleteCertificateName =
    deleteModal.certificate?.certificateName ||
    deleteModal.certificate?.name ||
    "this certificate";

  return (
    <div className="min-h-[calc(100vh-140px)] bg-gray-50 px-3 py-6 sm:px-5 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.06)]">
          <div className="border-b border-gray-100 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                {/* <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
                  {isGeneral ? (
                    <Sparkles className="h-3.5 w-3.5" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  Employee Skill Management
                </div> */}
                <h1 className={`${Fonts.heading3} mt-3 sm:text-3xl`}>
                  {title}
                </h1>
                <p className="mt-1 max-w-3xl text-sm leading-6 text-gray-500">
                  {description}
                </p>
              </div>
              <Button
                onClick={() => setFormOpen(true)}
                className="h-11 shrink-0 px-5"
              >
                <Plus className="h-4 w-4" />
                Add Certificate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-b border-gray-100 bg-gray-50/70 px-5 py-4 sm:px-7 lg:grid-cols-[1fr_auto_auto] lg:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search certificates by name, provider, skill, or type"
                className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-10 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10"
              />
              {searchTerm ? (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  aria-label="Clear search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">
              <span className="font-semibold text-gray-950">
                {visibleCertificates.length}
              </span>{" "}
              records
            </div>
            {/* <div className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-600">
              <span className="font-semibold text-gray-950">
                {isGeneral ? "General" : "Skill"}
              </span>{" "}
              flow
            </div> */}
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 px-5 py-16 text-sm text-gray-500">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
              Loading certificates...
            </div>
          ) : visibleCertificates.length === 0 ? (
            <div className="p-5 sm:p-7">
              <EmptyState
                isGeneral={isGeneral}
                onAdd={() => setFormOpen(true)}
              />
            </div>
          ) : (
            <div className="p-4 sm:p-5">
              <div className="space-y-3 lg:hidden">
                {paginatedCertificates.map((certificate) => (
                  <CertificateCard
                    key={
                      getCertificateId(certificate) ||
                      `${certificate.certificateName}-${certificate.providerName}`
                    }
                    certificate={certificate}
                    isGeneral={isGeneral}
                    onEdit={openEdit}
                    onDelete={handleDelete}
                    checkingEditId={checkingEditId}
                  />
                ))}
              </div>

              <div className="hidden overflow-hidden rounded-xl border border-gray-200 bg-white lg:block">
                <table className="min-w-full divide-y divide-gray-100 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        Certificate Name
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                        {isGeneral ? "Provider / Organization" : "Provider"}
                      </th>
                      <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
                        Type
                      </th>
                      {!isGeneral ? (
                        <>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            Skill Details
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                            Validity Status
                          </th>
                        </>
                      ) : null}
                      <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wide text-gray-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {paginatedCertificates.map((certificate) => {
                      const validity = getValidityLabel(certificate);
                      const certificateId = getCertificateId(certificate);
                      const editChecking =
                        checkingEditId &&
                        String(checkingEditId) === String(certificateId);
                      return (
                        <tr
                          key={
                            certificateId ||
                            `${certificate.certificateName}-${certificate.providerName}`
                          }
                          className="transition hover:bg-indigo-50/30"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-3">
                              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-indigo-50 text-indigo-600">
                                <Award className="h-3.5 w-3.5" />
                              </span>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-gray-800">
                                  {certificate.certificateName ||
                                    certificate.name ||
                                    "Untitled certificate"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-3.5 w-3.5 text-gray-400" />
                              <span className="truncate font-normal text-gray-800">
                                {certificate.providerName ||
                                  certificate.provider ||
                                  "Provider not available"}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {isGeneral
                                ? "General Certification"
                                : "Skill Certification"}
                            </span>
                          </td>
                          {!isGeneral ? (
                            <>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                <div className="flex flex-col gap-1">
                                  <div className="text-sm text-gray-800 truncate">
                                    {getSkillDisplayName(certificate) ||
                                      "Not mapped"}
                                  </div>
                                  <div className="text-[11px] font-normal text-gray-500 truncate">
                                    {getCategoryDisplayName(certificate) ||
                                      "Category not available"}
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span
                                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium ${getValidityTone(validity)}`}
                                >
                                  <Clock3 className="h-3 w-3" />
                                  {validity}
                                </span>
                              </td>
                            </>
                          ) : null}
                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(certificate)}
                                disabled={editChecking}
                                aria-label="Edit certificate"
                                className="rounded p-1 text-indigo-600 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                {editChecking ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Pencil className="h-4 w-4" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(certificate)}
                                aria-label="Delete certificate"
                                className="rounded p-1 text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPrevious={() =>
                      setCurrentPage((page) => Math.max(1, page - 1))
                    }
                    onNext={() =>
                      setCurrentPage((page) => Math.min(totalPages, page + 1))
                    }
                  />
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      <Transition show={formOpen} as={Fragment}>
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-slate-900/45 backdrop-blur-sm" />
          </Transition.Child>

          <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="translate-y-4 opacity-0 sm:scale-95"
              enterTo="translate-y-0 opacity-100 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="translate-y-0 opacity-100 sm:scale-100"
              leaveTo="translate-y-4 opacity-0 sm:scale-95"
            >
              <div className="relative w-full max-w-4xl overflow-visible rounded-xl bg-white shadow-2xl ring-1 ring-black/5">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  aria-label="Close add certificate form"
                  className="absolute right-4 top-4 z-10 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                >
                  <X className="h-5 w-5" />
                </button>
                <CertificateForm
                  key={mode}
                  mode={mode}
                  certificates={certificates}
                  initialCertificate={editingCertificate}
                  isEdit={Boolean(editingCertificate)}
                  onCancel={() => {
                    setFormOpen(false);
                    setEditingCertificate(null);
                  }}
                  onSaved={handleSaved}
                />
              </div>
            </Transition.Child>
          </div>
        </div>
      </Transition>

      <ConfirmationModal
        isOpen={deleteModal.open}
        title="Delete Certificate"
        message={`Are you sure you want to delete "${deleteCertificateName}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteLoading}
        onCancel={closeDeleteModal}
        onConfirm={confirmDelete}
      />
    </div>
  );
};

export default CertificateLanding;
