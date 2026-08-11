import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { AlertTriangle, Eye, Pencil, Search, Sparkles, Trash2 } from "lucide-react";
import Button from "../../../components/Button/Button";

const normalizeCategoryCode = (value) =>
  (value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const generateCategoryCode = (name) => {
  const prefix = normalizeCategoryCode(name) || "CATEGORY";
  return `${prefix}_001`;
};

export const categorySchema = yup.object({
  categoryCode: yup.string().trim().required("Category code is required"),
  categoryName: yup.string().trim().required("Category name is required"),
  assetNature: yup
    .string()
    .oneOf(["IT", "Non-IT"], "Asset nature must be IT or Non-IT")
    .required("Asset nature is required"),
  requiresSerialNumber: yup.boolean(),
  description: yup.string().nullable(),
  activeFlag: yup.boolean(),
});

export const typeSchema = yup.object({
  categoryId: yup.string().required("Category is required"),
  typeCode: yup.string().trim().required("Type code is required"),
  typeName: yup.string().trim().required("Type name is required"),
  manufacturer: yup.string().trim().required("Manufacturer or brand is required"),
  model: yup.string().trim().nullable(),
  description: yup.string().nullable(),
  activeFlag: yup.boolean(),
});

export const StatusBadge = ({ active }) => (
  <span
    className={`inline-flex min-w-[74px] items-center justify-center rounded-md border px-2.5 py-1 text-xs font-semibold ${
      active
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-gray-200 bg-gray-50 text-gray-600"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

export const SortHeader = ({ label, field, sort, onSort }) => {
  const active = sort.sortBy === field;
  const direction = active && sort.sortDirection === "desc" ? "↓" : "↑";

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 font-semibold"
    >
      {label}
      <span className={active ? "opacity-100" : "opacity-40"}>{direction}</span>
    </button>
  );
};

export const SearchInput = ({ value, onChange, placeholder }) => (
  <div className="relative w-full sm:w-72">
    <Search
      className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      size={16}
    />
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm transition-all focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
    />
  </div>
);

export const EmptyOrError = ({ message, isError }) => (
  <div className="flex min-h-[180px] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white p-8 text-center">
    <div>
      {isError && (
        <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-amber-500" />
      )}
      <p className="text-sm font-medium text-gray-600">{message}</p>
    </div>
  </div>
);

export const ActionButtons = ({ onView, onEdit, onDelete, deleteDisabled }) => (
  <div className="flex justify-end gap-2">
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onView();
      }}
      className="rounded-lg p-2 text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
      title="View"
    >
      <Eye size={16} />
    </button>
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onEdit();
      }}
      className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 hover:text-indigo-800"
      title="Edit"
    >
      <Pencil size={16} />
    </button>
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      disabled={deleteDisabled}
      className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 hover:text-red-800 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
      title="Delete"
    >
      <Trash2 size={16} />
    </button>
  </div>
);

export const ActiveToggle = ({ active, loading, onClick }) => (
  <button
    type="button"
    disabled={loading}
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={`relative inline-flex h-6 w-11 items-center rounded-full border transition-all duration-200 disabled:cursor-wait disabled:opacity-60 ${
      active
        ? "border-emerald-500 bg-emerald-500"
        : "border-slate-200 bg-slate-200"
    }`}
    title={active ? "Disable" : "Enable"}
  >
    <span
      className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${
        active ? "translate-x-6" : "translate-x-1"
      } ${loading ? "animate-pulse" : ""}`}
    />
  </button>
);

const FieldError = ({ message }) =>
  message ? <span className="text-xs font-medium text-red-500">{message}</span> : null;

const TextField = React.forwardRef(
  ({ label, required, error, readOnly, action, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-semibold text-slate-700">
          {label} {required && <span className="ml-1 text-red-500">*</span>}
        </label>
        {action}
      </div>
      <input
        ref={ref}
        {...props}
        readOnly={readOnly}
        className={`rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all duration-200 ${
          readOnly
            ? "bg-slate-100 text-slate-600"
            : error
              ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
              : "border-slate-200 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
        }`}
      />
      <FieldError message={error?.message} />
    </div>
  )
);

const TextArea = React.forwardRef(({ label, error, readOnly, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 sm:col-span-2">
    <label className="text-sm font-semibold text-slate-700">{label}</label>
    <textarea
      ref={ref}
      {...props}
      readOnly={readOnly}
      rows={4}
      className={`resize-none rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all duration-200 ${
        readOnly
          ? "bg-slate-100 text-slate-600"
          : "border-slate-200 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
      }`}
    />
    <FieldError message={error?.message} />
  </div>
));

export const CategoryForm = ({ mode, initialData, onSubmit, onCancel, saving }) => {
  const readOnly = mode === "view";
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      categoryCode: "",
      categoryName: "",
      assetNature: "IT",
      requiresSerialNumber: false,
      description: "",
      activeFlag: true,
    },
  });

  const categoryName = watch("categoryName");
  const categoryCodeValue = watch("categoryCode");
  const assetNatureValue = watch("assetNature");
  const requiresSerialNumberValue = watch("requiresSerialNumber");

  useEffect(() => {
    reset({
      categoryCode: initialData?.categoryCode || "",
      categoryName: initialData?.categoryName || "",
      assetNature: initialData?.assetNature || initialData?.nature || "IT",
      requiresSerialNumber:
        initialData?.requiresSerialNumber ?? initialData?.serialNumberRequired ?? false,
      description: initialData?.description || "",
      activeFlag: initialData?.activeFlag ?? true,
    });
    setValue("activeFlag", initialData?.activeFlag ?? true);
  }, [initialData, reset, setValue]);

  useEffect(() => {
    if (mode !== "create") return;
    const name = categoryName?.trim();
    if (!name) {
      if (categoryCodeValue) setValue("categoryCode", "");
      return;
    }
    if (!categoryCodeValue) {
      setValue("categoryCode", generateCategoryCode(name));
    }
  }, [categoryName, categoryCodeValue, mode, setValue]);

  const activeFlag = watch("activeFlag");
  const categoryCodeRegister = register("categoryCode", {
    onChange: (event) => {
      const normalized = normalizeCategoryCode(event.target.value);
      setValue("categoryCode", normalized, { shouldDirty: true, shouldValidate: true });
    },
  });

  const handleGenerateCode = () => {
    const generatedCode = generateCategoryCode(categoryName || "");
    setValue("categoryCode", generatedCode, { shouldDirty: true, shouldValidate: true });
  };

  return (
    <form
      onSubmit={handleSubmit(
        (data) => onSubmit(data),
        (errors) => console.log("FORM ERRORS:", errors)
      )}
      className="space-y-3"
    >
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <TextField
          label="Category Name"
          required
          error={errors.categoryName}
          readOnly={readOnly}
          {...register("categoryName")}
        />
        <TextField
          label="Category Code"
          required
          error={errors.categoryCode}
          readOnly={readOnly}
          action={
            !readOnly && (
              <button
                type="button"
                onClick={handleGenerateCode}
                className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 transition-colors hover:bg-indigo-100"
              >
                <Sparkles size={12} /> Generate
              </button>
            )
          }
          {...categoryCodeRegister}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">
            Asset Nature <span className="ml-1 text-red-500">*</span>
          </label>
          <select
            {...register("assetNature")}
            disabled={readOnly}
            className={`w-full rounded-2xl border px-4 py-3 text-sm shadow-sm transition-all duration-200 ${
              readOnly
                ? "bg-slate-100 text-slate-600"
                : errors.assetNature
                  ? "border-red-400 bg-red-50/40 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
                  : "border-slate-200 bg-white focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
            }`}
          >
            <option value="IT">IT Asset</option>
            <option value="Non-IT">Non-IT Asset</option>
          </select>
          <FieldError message={errors.assetNature?.message} />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-slate-700">
            Requires serial number
          </label>
          <div
            className={`flex rounded-2xl border p-1.5 shadow-sm ${
              readOnly ? "border-slate-200 bg-slate-100" : "border-slate-200 bg-slate-50"
            }`}
          >
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((option) => {
              const active = requiresSerialNumberValue === option.value;
              return (
                <button
                  key={option.label}
                  type="button"
                  disabled={readOnly}
                  onClick={() => setValue("requiresSerialNumber", option.value, { shouldDirty: true, shouldValidate: true })}
                  className={`flex-1 rounded-xl px-3 py-2 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-white text-indigo-700 shadow-sm"
                      : "text-slate-500 hover:bg-white/80"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <FieldError message={errors.requiresSerialNumber?.message} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <TextArea
          label="Description"
          error={errors.description}
          readOnly={readOnly}
          placeholder="Add a concise summary of the asset category, purpose, and usage guidelines."
          {...register("description")}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
        <div className="flex items-center gap-2.5">
          <span className="text-sm font-semibold text-slate-700">Active</span>
          <ActiveToggle
            active={Boolean(activeFlag)}
            loading={false}
            onClick={() => setValue("activeFlag", !activeFlag, { shouldDirty: true })}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onCancel} disabled={saving}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button type="submit" variant="primary" loading={saving} loadingText="Creating...">
              {mode === "create" ? "Create Category" : "Save Changes"}
            </Button>
          )}
        </div>
      </div>
    </form>
  );
};

export const TypeForm = ({
  mode,
  initialData,
  categories,
  categoriesLoading,
  onSubmit,
  onCancel,
  saving,
}) => {
  const readOnly = mode === "view";
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(typeSchema),
    defaultValues: {
      categoryId: "",
      typeCode: "",
      typeName: "",
      manufacturer: "",
      model: "",
      description: "",
      activeFlag: true,
    },
  });

  const activeFlag = watch("activeFlag");
  const resolvedManufacturer =
    initialData?.manufacturer ??
    initialData?.brand ??
    initialData?.manufacturerName ??
    initialData?.brandName ??
    initialData?.manufacturerBrand ??
    "";
  const resolvedModel =
    initialData?.model ?? initialData?.modelName ?? initialData?.modelNumber ?? "";

  useEffect(() => {
    reset({
      categoryId: initialData?.categoryId || initialData?.assetCategoryId || "",
      typeCode: initialData?.typeCode || "",
      typeName: initialData?.typeName || "",
      manufacturer: resolvedManufacturer,
      model: resolvedModel,
      description: initialData?.description || "",
      activeFlag: initialData?.activeFlag ?? true,
    });
    setValue("activeFlag", initialData?.activeFlag ?? true);
  }, [initialData, reset, setValue, resolvedManufacturer, resolvedModel]);

  return (
    <form
      onSubmit={handleSubmit(
        (data) => onSubmit(data),
        (errors) => console.log("FORM ERRORS:", errors)
      )}
      className="space-y-5"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            disabled={readOnly || categoriesLoading}
            className={`rounded-lg border px-4 py-2.5 text-sm transition-all ${
              errors.categoryId
                ? "border-red-400 bg-red-50/20"
                : "border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
            }`}
            {...register("categoryId")}
          >
            <option value="">{categoriesLoading ? "Loading..." : "Select Category"}</option>
            {categories.map((category) => (
              <option key={category.categoryId} value={category.categoryId}>
                {category.categoryCode} - {category.categoryName}
              </option>
            ))}
          </select>
          <FieldError message={errors.categoryId?.message} />
        </div>
        <TextField label="Type Code" required error={errors.typeCode} readOnly={readOnly} {...register("typeCode")} />
        <TextField label="Type Name" required error={errors.typeName} readOnly={readOnly} {...register("typeName")} />
        <TextField
          label="Manufacturer / Brand"
          required
          error={errors.manufacturer}
          readOnly={readOnly}
          placeholder="e.g. Dell"
          {...register("manufacturer")}
        />
        <TextField
          label="Model"
          error={errors.model}
          readOnly={readOnly}
          placeholder="Optional"
          {...register("model")}
        />

        <div className="sm:col-span-2 grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,0.4fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <label className="text-xs font-bold uppercase tracking-wide text-gray-500">Active</label>
            <div className="mt-3">
              <ActiveToggle
                active={Boolean(activeFlag)}
                loading={false}
                onClick={() => setValue("activeFlag", !activeFlag, { shouldDirty: true, shouldValidate: true })}
              />
            </div>
          </div>
          <div className="rounded-2xl border border-gray-100 bg-gray-50/70 p-4">
            <TextArea label="Description" error={errors.description} readOnly={readOnly} placeholder="Add helpful context about the asset type." {...register("description")} />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly && (
          <Button type="submit" variant="primary" loading={saving} loadingText="Saving...">
            Save
          </Button>
        )}
      </div>
    </form>
  );
};
