import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { AlertTriangle, Eye, Pencil, Search, Trash2 } from "lucide-react";
import Button from "../../../components/Button/Button";

export const categorySchema = yup.object({
  categoryCode: yup.string().trim().required("Category Code Is Required"),
  categoryName: yup.string().trim().required("Category Name Is Required"),
  description: yup.string().nullable(),
  displayOrder: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .nullable()
    .min(0, "Display Order Cannot Be Negative"),
  activeFlag: yup.boolean(),
});

export const typeSchema = yup.object({
  categoryId: yup.string().required("Category Is Required"),
  typeCode: yup.string().trim().required("Type Code Is Required"),
  typeName: yup.string().trim().required("Type Name Is Required"),
  description: yup.string().nullable(),
  displayOrder: yup
    .number()
    .transform((value, originalValue) => (originalValue === "" ? null : value))
    .nullable()
    .min(0, "Display Order Cannot Be Negative"),
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
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
      active ? "bg-emerald-500" : "bg-gray-300"
    } disabled:cursor-wait disabled:opacity-60`}
    title={active ? "Disable" : "Enable"}
  >
    <span
      className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${
        active ? "translate-x-5" : "translate-x-1"
      } ${loading ? "animate-pulse" : ""}`}
    />
  </button>
);

const FieldError = ({ message }) =>
  message ? <span className="text-xs font-medium text-red-500">{message}</span> : null;

const TextField = React.forwardRef(
  ({ label, required, error, readOnly, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        ref={ref}
        {...props}
        readOnly={readOnly}
        className={`rounded-lg border px-4 py-2.5 text-sm transition-all ${
          readOnly
            ? "bg-gray-100 text-gray-600"
            : error
              ? "border-red-400 bg-red-50/20 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-100"
              : "border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
        }`}
      />
      <FieldError message={error?.message} />
    </div>
  )
);

const TextArea = React.forwardRef(({ label, error, readOnly, ...props }, ref) => (
  <div className="flex flex-col gap-1.5 sm:col-span-2">
    <label className="text-xs font-bold uppercase tracking-wide text-gray-500">
      {label}
    </label>
    <textarea
      ref={ref}
      {...props}
      readOnly={readOnly}
      rows={3}
      className={`resize-none rounded-lg border px-4 py-2.5 text-sm transition-all ${
        readOnly
          ? "bg-gray-100 text-gray-600"
          : "border-gray-200 bg-gray-50 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-100"
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
    formState: { errors },
  } = useForm({
    resolver: yupResolver(categorySchema),
    defaultValues: {
      categoryCode: "",
      categoryName: "",
      description: "",
      displayOrder: "",
      activeFlag: true,
    },
  });

  useEffect(() => {
    reset({
      categoryCode: initialData?.categoryCode || "",
      categoryName: initialData?.categoryName || "",
      description: initialData?.description || "",
      displayOrder: initialData?.displayOrder ?? "",
      activeFlag: initialData?.activeFlag ?? true,
    });
  }, [initialData, reset]);

  return (
    <form
  onSubmit={handleSubmit(
    (data) => {
      console.log("VALID DATA:", data);
      onSubmit(data);
    },
    (errors) => {
      console.log("FORM ERRORS:", errors);
    }
  )} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField label="Category Code" required error={errors.categoryCode} readOnly={readOnly} {...register("categoryCode")} />
        <TextField label="Category Name" required error={errors.categoryName} readOnly={readOnly} {...register("categoryName")} />
        <TextField label="Display Order" type="number" min="0" error={errors.displayOrder} readOnly={readOnly} {...register("displayOrder")} />
        <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Active Flag
          </span>
          <input type="checkbox" disabled={readOnly} className="h-4 w-4 rounded border-gray-300 text-indigo-600" {...register("activeFlag")} />
        </label>
        <TextArea label="Description" error={errors.description} readOnly={readOnly} {...register("description")} />
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
    formState: { errors },
  } = useForm({
    resolver: yupResolver(typeSchema),
    defaultValues: {
      categoryId: "",
      typeCode: "",
      typeName: "",
      description: "",
      displayOrder: "",
      activeFlag: true,
    },
  });

  useEffect(() => {
    reset({
      categoryId: initialData?.categoryId || "",
      typeCode: initialData?.typeCode || "",
      typeName: initialData?.typeName || "",
      description: initialData?.description || "",
      displayOrder: initialData?.displayOrder ?? "",
      activeFlag: initialData?.activeFlag ?? true,
    });
  }, [initialData, reset]);

  return (
    <form
  onSubmit={handleSubmit(
    (data) => {
      console.log("VALID DATA:", data);
      onSubmit(data);
    },
    (errors) => {
      console.log("FORM ERRORS:", errors);
    }
  )} className="space-y-5">
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
        <TextField label="Display Order" type="number" min="0" error={errors.displayOrder} readOnly={readOnly} {...register("displayOrder")} />
        <label className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5">
          <span className="text-xs font-bold uppercase tracking-wide text-gray-500">
            Active Flag
          </span>
          <input type="checkbox" disabled={readOnly} className="h-4 w-4 rounded border-gray-300 text-indigo-600" {...register("activeFlag")} />
        </label>
        <TextArea label="Description" error={errors.description} readOnly={readOnly} {...register("description")} />
      </div>

      <div className="flex justify-end gap-3 border-t border-gray-100 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          {readOnly ? "Close" : "Cancel"}
        </Button>
        {!readOnly && (
          <Button type="submit"
          onClick={()=>console.log("clicked")} variant="primary" loading={saving} loadingText="Saving...">
            Save
          </Button>
        )}
      </div>
    </form>
  );
};
