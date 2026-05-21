"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import Select from "react-select";
import CreatableSelect from "react-select/creatable";
import { toast } from "react-toastify";
import { User, Briefcase, FileText, Plus, Trash2 } from "lucide-react";
import Button from "../../../components/Button/Button";
import FormInput from "../../../components/forms/FormInput";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { Fonts } from "../../../components/Fonts/Fonts";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[0-9]{7,15}$/;
const INDIA_PHONE_REGEX = /^[6-9][0-9]{9}$/;
const US_PHONE_REGEX = /^[2-9][0-9]{9}$/;

export default function CreateOffer() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const userPayload = token ? JSON.parse(atob(token.split(".")[1])) : {};
  const rawRoles = userPayload.roles || "";
  const userRoles = Array.isArray(rawRoles)
    ? rawRoles
    : rawRoles.split(",").map((r) => r.trim());

  const isHR = userRoles.includes("HR");

  const [activeStep, setActiveStep] = useState(1);
  const [countries, setCountries] = useState([]);
  const [ccOptions, setCcOptions] = useState([]);
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  const [touchedComponents, setTouchedComponents] = useState({});

  const [formData, setFormData] = useState({
    first_name: "",
    middle_name: "",
    last_name: "",
    mail: "",
    country_code: "",
    contact_number: "",
    designation: "",
    employee_type: "",
    cc_emails: [],
    currency: "INR",
  });

  const [components, setComponents] = useState([
    {
      id: Date.now(),
      name: "",
      type: "",
      frequency: "",
      amount: "",
    },
  ]);

  const typeOptions = [
    { label: "Fixed", value: "Fixed" },
    { label: "Variable", value: "Variable" },
    
  ];

  const componentOptions = [
    { label: "Basic Salary", value: "Basic Salary" },
    { label: "HRA", value: "HRA" },
    { label: "Special Allowance", value: "Special Allowance" },
    { label: "Conveyance Allowance", value: "Conveyance Allowance" },
    { label: "Medical Allowance", value: "Medical Allowance" },
    { label: "LTA", value: "LTA" },
    { label: "Performance Bonus", value: "Performance Bonus" },
    { label: "Food Allowance", value: "Food Allowance" },
    { label: "Mobile Allowance", value: "Mobile Allowance" },
    { label: "Gratuity", value: "Gratuity" },
    { label: "PF (Employer Contribution)", value: "PF" },
  ];

  const frequencyOptions = [
    { label: "Monthly", value: "Monthly" },
    { label: "Quarterly", value: "Quarterly" },
    { label: "Yearly", value: "Yearly" },
  ];

  const currencyOptions = [
    { label: "INR (Rs)", value: "INR", symbol: "Rs" },
    { label: "USD ($)", value: "USD", symbol: "$" },
    { label: "EUR (EUR)", value: "EUR", symbol: "EUR" },
    { label: "GBP (GBP)", value: "GBP", symbol: "GBP" },
    { label: "AED (AED)", value: "AED", symbol: "AED" },
  ];

  const getCurrencySymbol = (code) =>
    currencyOptions.find((opt) => opt.value === code)?.symbol || "Rs";

  const steps = [
    {
      id: 1,
      title: "Basic Details",
      desc: "Candidate personal and job information",
      icon: <User size={18} />,
    },
    {
      id: 2,
      title: "Compensation",
      desc: "Salary structure and CTC breakdown",
      icon: <Briefcase size={18} />,
    },
    {
      id: 3,
      title: "Create Offer",
      desc: "Preview and generate offer letter",
      icon: <FileText size={18} />,
    },
  ];

  const progressValue =
  activeStep <= 1
    ? 0
    : Math.round(((activeStep - 1) / (steps.length - 1)) * 100);

  useEffect(() => {
    const loadCountries = async () => {
      const res = await axios.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/country`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setCountries(
        res.data
          .filter((c) => c.is_active)
          .map((c) => ({
            label: `${c.country_name} (${c.calling_code})`,
            value: c.calling_code,
          })),
      );
    };

    const loadCC = async () => {
      const res = await axios.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offer-approval/admin-users`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setCcOptions(
        res.data.map((u) => ({
          value: u.mail,
          label: `${u.name} (${u.mail})`,
        })),
      );
    };

    loadCountries();
    loadCC();
  }, []);

  const clearError = (field) => {
    setErrors((prev) => {
      if (!prev[field]) {
        return prev;
      }

      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const markFieldTouched = (field) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
  };

  const markComponentTouched = (id, field) => {
    const key = `component_${id}_${field}`;
    setTouchedComponents((prev) => ({ ...prev, [key]: true }));
  };

  const shouldShowFieldError = (field, value) => {
    const hasValue = typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    return touchedFields[field] || hasValue;
  };

  const shouldShowComponentError = (id, field, value) => {
    const key = `component_${id}_${field}`;
    const hasValue = typeof value === "string" ? value.trim().length > 0 : Boolean(value);
    return touchedComponents[key] || hasValue;
  };

  const getFieldError = (field, value, nextFormData = formData) => {
    const trimmedValue = typeof value === "string" ? value.trim() : value;

    switch (field) {
      case "first_name":
        return !trimmedValue ? "First name is required." : "";
      case "last_name":
        return !trimmedValue ? "Last name is required." : "";
      case "mail":
        if (!trimmedValue) return "Email is required.";
        return EMAIL_REGEX.test(trimmedValue) ? "" : "Enter a valid email address.";
      case "country_code":
        return !trimmedValue ? "Country code is required." : "";
      case "contact_number":
        if (!trimmedValue) return "Contact number is required.";
        if (nextFormData.country_code === "91") {
          return INDIA_PHONE_REGEX.test(trimmedValue)
            ? ""
            : "For India, enter a 10-digit number starting with 6 to 9.";
        }
        if (nextFormData.country_code === "1") {
          return US_PHONE_REGEX.test(trimmedValue)
            ? ""
            : "Enter a valid US phone number with 10 digits.";
        }
        return PHONE_REGEX.test(trimmedValue)
          ? ""
          : "Enter a valid contact number.";
      case "designation":
        return !trimmedValue ? "Designation is required." : "";
      case "employee_type":
        return !trimmedValue ? "Employee type is required." : "";
      default:
        return "";
    }
  };

  const setFieldError = (field, message) => {
    setErrors((prev) => {
      if (!message) {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      }

      return { ...prev, [field]: message };
    });
  };

  const getComponentFieldError = (field, value) => {
    const trimmedValue = typeof value === "string" ? value.trim() : value;

    switch (field) {
      case "name":
        return !trimmedValue ? "Component name is required." : "";
      case "type":
        return !trimmedValue ? "Type is required." : "";
      case "frequency":
        return !trimmedValue ? "Frequency is required." : "";
      case "amount":
        if (trimmedValue === "" || trimmedValue === null || trimmedValue === undefined) {
          return "Amount is required.";
        }
        return Number(trimmedValue) > 0 ? "" : "Amount must be greater than 0.";
      default:
        return "";
    }
  };

  const setComponentError = (id, field, message) => {
    const key = `component_${id}_${field}`;

    setErrors((prev) => {
      if (!message) {
        if (!prev[key]) {
          return prev;
        }

        const next = { ...prev };
        delete next[key];
        return next;
      }

      return { ...prev, [key]: message };
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue =
      name === "contact_number" ? value.replace(/[^\d]/g, "").slice(0, 15) : value;
    const nextFormData = { ...formData, [name]: nextValue };

    setFormData(nextFormData);
    markFieldTouched(name);
    setFieldError(
      name,
      shouldShowFieldError(name, nextValue) ? getFieldError(name, nextValue, nextFormData) : "",
    );
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    markFieldTouched(name);
    setFieldError(name, getFieldError(name, value, formData));
  };

  const handleComponentChange = (id, field, value) => {
    const nextValue =
      field === "amount" ? value.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1") : value;

    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: nextValue } : c)),
    );
    markComponentTouched(id, field);
    setComponentError(
      id,
      field,
      shouldShowComponentError(id, field, nextValue)
        ? getComponentFieldError(field, nextValue)
        : "",
    );
  };

  const addComponent = () => {
    setComponents((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: "",
        type: "",
        frequency: "",
        amount: "",
      },
    ]);
  };

  const removeComponent = (id) => {
    setComponents((prev) => prev.filter((c) => c.id !== id));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.components;
      delete next[`component_${id}_name`];
      delete next[`component_${id}_type`];
      delete next[`component_${id}_frequency`];
      delete next[`component_${id}_amount`];
      return next;
    });
  };

  const totalCTC = components.reduce((sum, c) => {
    let multiplier = 1;
    if (c.frequency === "Monthly") multiplier = 12;
    if (c.frequency === "Quarterly") multiplier = 4;
    return sum + Number(c.amount || 0) * multiplier;
  }, 0);

  const validateStepOne = () => {
    const nextErrors = {};

    ["first_name", "last_name", "mail", "country_code", "contact_number", "designation", "employee_type"].forEach(
      (field) => {
        const message = getFieldError(field, formData[field], formData);
        if (message) {
          nextErrors[field] = message;
        }
      },
    );

    return nextErrors;
  };

  const validateStepTwo = () => {
    const nextErrors = {};

    if (!components.length) {
      nextErrors.components = "Add at least one compensation component.";
      return nextErrors;
    }

    components.forEach((component) => {
      ["name", "type", "frequency", "amount"].forEach((field) => {
        const message = getComponentFieldError(field, component[field]);
        if (message) {
          nextErrors[`component_${component.id}_${field}`] = message;
        }
      });
    });

    return nextErrors;
  };

  const goToStep = (step) => {
    if (step === 2) {
      const stepOneErrors = validateStepOne();
      if (Object.keys(stepOneErrors).length) {
        toast.error("Please fill required fields.");
        return;
      }
    }

    if (step === 3) {
      const stepTwoErrors = validateStepTwo();
      if (Object.keys(stepTwoErrors).length) {
        toast.error("Please fill required fields.");
        return;
      }
    }

    setActiveStep(step);
  };

  const handleCreateOffer = async () => {
    const stepOneErrors = validateStepOne();
    const stepTwoErrors = validateStepTwo();
    const nextErrors = { ...stepOneErrors, ...stepTwoErrors };

    if (Object.keys(nextErrors).length) {
      setActiveStep(Object.keys(stepOneErrors).length ? 1 : 2);
      toast.error("Please fill required fields.");
      return;
    }

    const payload = {
      ...formData,
      first_name: formData.first_name.trim(),
      middle_name: formData.middle_name.trim(),
      last_name: formData.last_name.trim(),
      mail: formData.mail.trim(),
      designation: formData.designation.trim(),
      cc_emails: formData.cc_emails.map((c) => c.value) || [],
      compensation_components: components.map((c) => ({
        name: c.name.trim(),
        type: c.type,
        frequency: c.frequency,
        amount: Number(c.amount),
      })),
      total_ctc: Number(totalCTC),
    };

    const toastId = toast.loading("Creating offer...");

    try {
      const res = await axios.post(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/create`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      toast.update(toastId, {
        render: "Offer Created",
        type: "success",
        isLoading: false,
        autoClose: 3000,
      });

      navigate(`/employee-onboarding/offer-generated-preview/${res.data.offer_id}`);
    } catch (err) {
      toast.update(toastId, {
        render: err.response?.data?.detail || "Error",
        type: "error",
        isLoading: false,
        autoClose: 3000,
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 lg:flex-row lg:items-stretch">
        <aside className="lg:w-[320px] lg:shrink-0">
          <PageCard className="h-full overflow-hidden border-0 bg-gradient-to-b from-blue-800 to-blue-950 text-white shadow-lg">
            <PageCardContent className="flex h-full flex-col p-6 space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-100">
                  Offer Workflow
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
                  Create Offer
                </h2>
                <p className="mt-2 text-sm leading-6 text-indigo-100/85">
                  Build the offer in three guided steps and preview everything before submission.
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-indigo-100/80">
                      Progress
                    </p>
                    <p className="mt-2 text-2xl font-bold text-white">{progressValue}%</p>
                  </div>
                  <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/90">
                    Step {activeStep} of {steps.length}
                  </span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                  <div
                    className="h-full rounded-full bg-white transition-all duration-300"
                    style={{ width: `${progressValue}%` }}
                  />
                </div>
              </div>

              <div className="relative">
                <div className="space-y-8">
                  {steps.map((step) => {
                    const active = activeStep === step.id;
                    const completed = activeStep > step.id;

                    return (
                      <div
                        key={step.id}
                        className={`relative z-10 flex items-start gap-4 rounded-2xl p-1 ${
                          step.id === 3 ? "pt-6" : ""
                        }`}
                      >
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-2xl border shadow-sm transition-all duration-300 ${
                            completed
                              ? "border-emerald-400 bg-emerald-500 text-white"
                              : active
                                ? "border-white/20 bg-white text-[#0A0082]"
                                : "border-white/10 bg-white/5 text-indigo-100"
                          }`}
                        >
                          {step.icon}
                        </div>

                        <div className="min-w-0 pt-0.5">
                          <div
                            className={`text-sm font-semibold ${
                              active ? "text-white" : "text-indigo-100"
                            }`}
                          >
                            {step.title}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-indigo-100/75">
                            {step.desc}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </PageCardContent>
          </PageCard>
        </aside>

        <div className="min-w-0 flex-1">
          <PageCard className="mx-auto h-full max-w-5xl border-slate-200 bg-white">
            <PageCardContent className="space-y-6 p-6 md:p-8">
              {activeStep === 1 && (
                <>
                  <StepHeader
                    title="Candidate Info"
                    description="Provide the candidate's personal and professional details."
                  />

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                      <Input
                        label="First Name"
                        requiredMark
                        name="first_name"
                        value={formData.first_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.first_name}
                      />
                      <Input
                        label="Middle Name"
                        name="middle_name"
                        value={formData.middle_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      <Input
                        label="Last Name"
                        requiredMark
                        name="last_name"
                        value={formData.last_name}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.last_name}
                      />
                    </div>

                    <div className="mt-6">
                      <Input
                        label="Email"
                        requiredMark
                        name="mail"
                        value={formData.mail}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        type="email"
                        error={errors.mail}
                      />
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
                      <SelectInput
                        label="Country Code"
                        requiredMark
                        options={countries}
                        value={countries.find((c) => c.value === formData.country_code)}
                        onChange={(v) => {
                          const nextFormData = {
                            ...formData,
                            country_code: v?.value || "",
                          };

                          setFormData(nextFormData);
                          markFieldTouched("country_code");
                          setFieldError(
                            "country_code",
                            shouldShowFieldError("country_code", nextFormData.country_code)
                              ? getFieldError(
                                  "country_code",
                                  nextFormData.country_code,
                                  nextFormData,
                                )
                              : "",
                          );
                          setFieldError(
                            "contact_number",
                            shouldShowFieldError("contact_number", nextFormData.contact_number)
                              ? getFieldError(
                                  "contact_number",
                                  nextFormData.contact_number,
                                  nextFormData,
                                )
                              : "",
                          );
                        }}
                        error={errors.country_code}
                      />
                      <Input
                        label="Contact Number"
                        requiredMark
                        name="contact_number"
                        value={formData.contact_number}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        inputMode="numeric"
                        maxLength={15}
                        placeholder={
                          formData.country_code === "91" ? "Enter 10-digit mobile number" : ""
                        }
                        error={errors.contact_number}
                      />
                    </div>

                    <div className="mt-6">
                      <Input
                        label="Designation"
                        requiredMark
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        error={errors.designation}
                      />
                    </div>

                    <div className="mt-6 grid grid-cols-1 gap-6">
                      <SelectInput
                        label="Employee Type"
                        requiredMark
                        options={[
                          { label: "Full-Time", value: "Full-Time" },
                          { label: "Part-Time", value: "Part-Time" },
                          { label: "Contractor", value: "Contractor" },
                          { label: "Intern", value: "Intern" },
                        ]}
                        value={
                          formData.employee_type
                            ? {
                                label: formData.employee_type,
                                value: formData.employee_type,
                              }
                            : null
                        }
                        onChange={(v) => {
                          const nextValue = v?.value || "";
                          const nextFormData = {
                            ...formData,
                            employee_type: nextValue,
                          };
                          setFormData(nextFormData);
                          markFieldTouched("employee_type");
                          setFieldError(
                            "employee_type",
                            shouldShowFieldError("employee_type", nextValue)
                              ? getFieldError("employee_type", nextValue, nextFormData)
                              : "",
                          );
                        }}
                        error={errors.employee_type}
                      />

                      <SelectInput
                        label="CC Mails"
                        isMulti
                        options={ccOptions}
                        value={formData.cc_emails}
                        onChange={(v) => setFormData((prev) => ({ ...prev, cc_emails: v || [] }))}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button onClick={() => goToStep(2)} variant="primary" size="medium">
                      Continue
                    </Button>
                  </div>
                </>
              )}

              {activeStep === 2 && (
                <>
                  <StepHeader
                    title="Compensation"
                    description="Define the salary components and structure."
                  />

                  <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:p-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 items-end">
                      <SelectInput
                        label="Currency"
                        options={currencyOptions}
                        value={currencyOptions.find((opt) => opt.value === formData.currency)}
                        onChange={(v) =>
                          setFormData({ ...formData, currency: v?.value || "INR" })
                        }
                      />
                      <div className="flex min-h-[42px] items-center justify-between gap-4 rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm shadow-sm">
                        <span className="font-medium text-indigo-700">Annual CTC</span>
                        <span className="text-base font-bold text-indigo-900">
                          {getCurrencySymbol(formData.currency)} {totalCTC.toLocaleString()}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {errors.components ? (
                        <p className="text-sm font-medium text-red-500">{errors.components}</p>
                      ) : null}
                      {components.map((c, index) => (
                        <div
                          key={c.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                        >
                          <div className="mb-4 flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                Component {index + 1}
                              </p>
                              <p className="text-xs text-slate-500">
                                Add the component type, payout frequency, and amount.
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeComponent(c.id)}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-100 text-red-500 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove compensation component"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-5 items-end">
                            <CreatableSelectInput
                              label="Component"
                              requiredMark
                              options={componentOptions}
                              value={c.name ? { label: c.name, value: c.name } : null}
                              onChange={(v) =>
                                handleComponentChange(c.id, "name", v?.value || "")
                              }
                              error={errors[`component_${c.id}_name`]}
                            />
                            <SelectInput
                              label="Type"
                              requiredMark
                              options={typeOptions}
                              value={typeOptions.find((opt) => opt.value === c.type)}
                              onChange={(v) =>
                                handleComponentChange(c.id, "type", v?.value || "")
                              }
                              error={errors[`component_${c.id}_type`]}
                            />
                            <SelectInput
                              label="Frequency"
                              requiredMark
                              options={frequencyOptions}
                              value={frequencyOptions.find((opt) => opt.value === c.frequency)}
                              onChange={(v) =>
                                handleComponentChange(c.id, "frequency", v?.value || "")
                              }
                              error={errors[`component_${c.id}_frequency`]}
                            />
                            <Input
                              type="number"
                              label="Amount"
                              requiredMark
                              name={`amount_${c.id}`}
                              value={c.amount}
                              onChange={(e) =>
                                handleComponentChange(c.id, "amount", e.target.value)
                              }
                              min="0"
                              step="0.01"
                              error={errors[`component_${c.id}_amount`]}
                            />
                            <div className="hidden md:block" />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Button onClick={addComponent} variant="link" size="medium" className="w-fit">
                      <Plus size={16} /> Add Component
                    </Button>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button onClick={() => setActiveStep(1)} variant="outline" size="medium">
                      Back
                    </Button>
                    <Button onClick={() => goToStep(3)} variant="primary" size="medium">
                      Continue
                    </Button>
                  </div>
                </>
              )}

              {activeStep === 3 && (
                <>
                  <StepHeader
                    title="Create Offer"
                    description="Review the details before generating the official document."
                  />

                  <div className="space-y-5">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 md:p-6">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <SummaryItem
                          label="Candidate Name"
                          value={
                            `${formData.first_name} ${formData.middle_name} ${formData.last_name}`
                              .replace(/\s+/g, " ")
                              .trim() || "-"
                          }
                        />
                        <SummaryItem label="Email" value={formData.mail || "-"} />
                        <SummaryItem
                          label="Designation"
                          value={formData.designation || "-"}
                        />
                        <SummaryItem
                          label="Employee Type"
                          value={formData.employee_type || "-"}
                        />
                        <SummaryItem
                          label="Annual CTC"
                          value={`${getCurrencySymbol(formData.currency)} ${totalCTC.toLocaleString()}`}
                        />
                      </div>
                    </div>

                    <PageCard className="overflow-hidden border-slate-200">
                      <div className="border-b border-slate-200 bg-slate-50/80 px-5 py-4">
                        <h4 className="text-sm font-semibold text-slate-900">
                          Salary Breakdown
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          Final review of every compensation component before preview.
                        </p>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-white">
                            <tr className="border-b border-slate-200 text-left text-slate-500">
                              <th className="px-5 py-3 font-semibold">Component</th>
                              <th className="px-5 py-3 font-semibold">Type</th>
                              <th className="px-5 py-3 font-semibold">Frequency</th>
                              <th className="px-5 py-3 text-right font-semibold">Amount</th>
                            </tr>
                          </thead>
                          <tbody>
                            {components.map((c, index) => (
                              <tr
                                key={c.id}
                                className={
                                  index !== components.length - 1
                                    ? "border-b border-slate-100"
                                    : ""
                                }
                              >
                                <td className="px-5 py-3 text-slate-800">{c.name || "-"}</td>
                                <td className="px-5 py-3 text-slate-600">{c.type || "-"}</td>
                                <td className="px-5 py-3 text-slate-600">
                                  {c.frequency || "-"}
                                </td>
                                <td className="px-5 py-3 text-right font-semibold text-slate-900">
                                  {getCurrencySymbol(formData.currency)}{" "}
                                  {Number(c.amount || 0).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </PageCard>
                  </div>

                  <div className="flex justify-between pt-2">
                    <Button onClick={() => setActiveStep(2)} variant="outline" size="medium">
                      Back
                    </Button>
                    {isHR ? (
                      <Button onClick={handleCreateOffer} variant="primary" size="medium">
                        Create Offer & Preview
                      </Button>
                    ) : (
                      <div className="rounded-lg border border-red-100 bg-red-50 px-4 py-2 font-medium text-red-500">
                        You do not have permission to generate this document.
                      </div>
                    )}
                  </div>
                </>
              )}
            </PageCardContent>
          </PageCard>
        </div>
      </div>
    </div>
  );
}

function Input({ label, error, ...props }) {
  return <FormInput label={label} error={error} {...props} />;
}

function StepHeader({ title, description }) {
  return (
    <div className="mb-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-10 w-1.5 rounded-full bg-indigo-600" />
        <div>
          <h3 className={Fonts.heading3}>{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
      </div>
    </div>
  );
}

function SummaryItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function SelectInput({ label, error, requiredMark = false, ...props }) {
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "42px",
      borderRadius: "0.5rem",
      borderColor: error ? "#fca5a5" : state.isFocused ? "#3b82f6" : "#d1d5db",
      backgroundColor: "white",
      boxShadow: state.isFocused
        ? error
          ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
          : "0 0 0 2px rgba(59, 130, 246, 0.18)"
        : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      paddingLeft: "0.5rem",
      paddingRight: "0.5rem",
      fontSize: "0.875rem",
      transition: "all 0.2s ease",
      cursor: "pointer",
      "&:hover": {
        borderColor: state.isFocused ? "#3b82f6" : "#9ca3af",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 0.25rem",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#1f2937",
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "#e5e7eb",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? "#3b82f6" : "#9ca3af",
      "&:hover": {
        color: "#3b82f6",
      },
    }),
    option: (base, state) => ({
      ...base,
      fontSize: "0.875rem",
      backgroundColor: state.isSelected ? "#dbeafe" : state.isFocused ? "#eff6ff" : "white",
      color: state.isSelected ? "#1d4ed8" : "#1f2937",
      cursor: "pointer",
      padding: "10px 12px",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.5rem",
      border: "1px solid #e5e7eb",
      boxShadow:
        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#eef2ff",
      borderRadius: "6px",
      border: "1px solid #e0e7ff",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#4338ca",
      fontSize: "0.75rem",
      fontWeight: "600",
      padding: "2px 6px",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#4338ca",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "#e0e7ff",
        color: "#3730a3",
      },
    }),
  };

  return (
    <div>
      <label className={`${Fonts.label} mb-1.5 block`}>
        {label}
        {requiredMark ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <Select styles={customStyles} {...props} />
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function CreatableSelectInput({ label, error, requiredMark = false, ...props }) {
  const customStyles = {
    control: (base, state) => ({
      ...base,
      minHeight: "42px",
      borderRadius: "0.5rem",
      borderColor: error ? "#fca5a5" : state.isFocused ? "#3b82f6" : "#d1d5db",
      backgroundColor: "white",
      boxShadow: state.isFocused
        ? error
          ? "0 0 0 2px rgba(239, 68, 68, 0.15)"
          : "0 0 0 2px rgba(59, 130, 246, 0.18)"
        : "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
      paddingLeft: "0.5rem",
      paddingRight: "0.5rem",
      fontSize: "0.875rem",
      transition: "all 0.2s ease",
      cursor: "pointer",
      "&:hover": {
        borderColor: state.isFocused ? "#3b82f6" : "#9ca3af",
      },
    }),
    valueContainer: (base) => ({
      ...base,
      padding: "0 0.25rem",
    }),
    placeholder: (base) => ({
      ...base,
      color: "#9ca3af",
    }),
    singleValue: (base) => ({
      ...base,
      color: "#1f2937",
    }),
    indicatorSeparator: (base) => ({
      ...base,
      backgroundColor: "#e5e7eb",
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      color: state.isFocused ? "#3b82f6" : "#9ca3af",
      "&:hover": {
        color: "#3b82f6",
      },
    }),
    option: (base, state) => ({
      ...base,
      fontSize: "0.875rem",
      backgroundColor: state.isSelected ? "#dbeafe" : state.isFocused ? "#eff6ff" : "white",
      color: state.isSelected ? "#1d4ed8" : "#1f2937",
      cursor: "pointer",
      padding: "10px 12px",
    }),
    menu: (base) => ({
      ...base,
      borderRadius: "0.5rem",
      border: "1px solid #e5e7eb",
      boxShadow:
        "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      overflow: "hidden",
    }),
    multiValue: (base) => ({
      ...base,
      backgroundColor: "#eef2ff",
      borderRadius: "6px",
      border: "1px solid #e0e7ff",
    }),
    multiValueLabel: (base) => ({
      ...base,
      color: "#4338ca",
      fontSize: "0.75rem",
      fontWeight: "600",
      padding: "2px 6px",
    }),
    multiValueRemove: (base) => ({
      ...base,
      color: "#4338ca",
      cursor: "pointer",
      "&:hover": {
        backgroundColor: "#e0e7ff",
        color: "#3730a3",
      },
    }),
  };

  return (
    <div>
      <label className={`${Fonts.label} mb-1.5 block`}>
        {label}
        {requiredMark ? <span className="ml-1 text-red-500">*</span> : null}
      </label>
      <CreatableSelect styles={customStyles} {...props} />
      {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
