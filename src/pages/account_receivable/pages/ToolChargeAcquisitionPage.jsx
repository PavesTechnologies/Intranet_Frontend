import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, FileSearch } from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import FilterCard from "../../../components/ui/FilterCard";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import FormDatePicker from "../../../components/forms/FormDatePicker";
import GenericTable from "../../../components/Table/table";
import { KPICard } from "../../../components/kpi/KPI";
import { showStatusToast } from "../../../components/toastfy/toast";
import SearchableSelect from "../components/common/SearchableSelect";
import { BILLING_BASIS_OPTIONS } from "../data/toolCatalogOptions";
import { formatCurrency, formatDisplayDate } from "../utils/format";
import { fetchActiveEnterpriseProjects } from "../services/billingConfigService";
import { previewCharges } from "../services/toolChargeAcquisitionService";

const INITIAL_FILTERS = { projectId: "", billingPeriodStart: "", billingPeriodEnd: "" };

const TABLE_HEADERS = [
  "Project",
  "Tool Code",
  "Tool Name",
  "Billing Basis",
  "Quantity",
  "Unit Price",
  "Calculated Amount",
  "Currency",
  "Billing Period",
];
const TABLE_COLUMNS = [
  "project",
  "toolCode",
  "toolName",
  "billingBasis",
  "quantity",
  "unitPrice",
  "calculatedAmount",
  "currency",
  "billingPeriod",
];

const BILLING_BASIS_LABELS = BILLING_BASIS_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option.label;
  return acc;
}, {});

const BREADCRUMB_ITEMS = [
  { label: "Account Receivable", to: "/account-receivable/dashboard" },
  { label: "Billing Data Acquisition", to: "/account-receivable/billing-data-acquisition" },
  { label: "Tool Charges", to: null },
];

// Project/Start/End required, End must not be earlier than Start — mirrors the touched/errors
// pattern already used across this module (see ManualProjectCreationStep.jsx,
// ToolCatalogFormDialog.jsx, ProjectToolAssignmentFormDialog.jsx).
function validate(filters) {
  const errors = {};

  if (!filters.projectId) errors.projectId = "This field is required.";
  if (!filters.billingPeriodStart) errors.billingPeriodStart = "This field is required.";
  if (!filters.billingPeriodEnd) errors.billingPeriodEnd = "This field is required.";
  if (
    filters.billingPeriodStart &&
    filters.billingPeriodEnd &&
    filters.billingPeriodEnd < filters.billingPeriodStart
  ) {
    errors.billingPeriodEnd = "Billing Period End must not be earlier than Billing Period Start.";
  }

  return errors;
}

export default function ToolChargeAcquisitionPage() {
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(true);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  const [previewing, setPreviewing] = useState(false);
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const [records, setRecords] = useState([]);

  useEffect(() => {
    let isMounted = true;
    setProjectsLoading(true);

    fetchActiveEnterpriseProjects()
      .then((result) => {
        if (isMounted) setProjects(Array.isArray(result) ? result : []);
      })
      .catch(() => {
        if (isMounted) {
          showStatusToast("Unable to load the project lookup.", "error");
          setProjects([]);
        }
      })
      .finally(() => {
        if (isMounted) setProjectsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const projectOptions = useMemo(
    () => projects.map((project) => ({ value: project.id, label: `${project.projectCode} — ${project.projectName}` })),
    [projects]
  );
  const selectedProject = useMemo(
    () => projects.find((project) => project.id === filters.projectId) || null,
    [projects, filters.projectId]
  );

  const errors = validate(filters);
  const showError = (field) => (touched[field] || submitted) && errors[field];

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handlePreview = async () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;

    setPreviewing(true);
    try {
      const result = await previewCharges({
        projectId: filters.projectId,
        billingPeriodStart: filters.billingPeriodStart,
        billingPeriodEnd: filters.billingPeriodEnd,
      });
      setRecords(Array.isArray(result) ? result : []);
      setHasPreviewed(true);
    } catch (error) {
      const message = error?.response?.data?.message || "Unable to preview tool charges. Please try again.";
      showStatusToast(message, "error");
    } finally {
      setPreviewing(false);
    }
  };

  // Summary cards sum the amounts the backend already calculated per record — no charge
  // amount is computed or recalculated on the frontend.
  const totalCharges = records.length;
  const totalQuantity = records.reduce((sum, record) => sum + (Number(record.quantity) || 0), 0);
  const totalAmount = records.reduce((sum, record) => sum + (Number(record.calculatedAmount) || 0), 0);
  const summaryCurrency = records[0]?.currency;

  const tableRows = useMemo(
    () =>
      records.map((record) => {
        const periodStart = record.billingPeriodStart || filters.billingPeriodStart;
        const periodEnd = record.billingPeriodEnd || filters.billingPeriodEnd;

        return {
          project: (
            <div className="text-left">
              <div className="font-semibold text-slate-900">
                {record.projectName || selectedProject?.projectName || "—"}
              </div>
              <div className="text-xs text-slate-400">{selectedProject?.projectCode || record.projectId}</div>
            </div>
          ),
          toolCode: record.toolCode,
          toolName: record.toolName,
          billingBasis: BILLING_BASIS_LABELS[record.billingBasis] || record.billingBasis,
          quantity: record.quantity,
          unitPrice: formatCurrency(record.unitPrice, record.currency),
          calculatedAmount: formatCurrency(record.calculatedAmount, record.currency),
          currency: record.currency,
          billingPeriod: `${formatDisplayDate(periodStart)} – ${formatDisplayDate(periodEnd)}`,
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [records, selectedProject]
  );

  return (
    <div className="space-y-6 p-6">
      <nav className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500">
        {BREADCRUMB_ITEMS.map((item, index) => (
          <span key={item.label} className="flex items-center gap-2">
            {item.to ? (
              <Link to={item.to} className="hover:text-slate-800">
                {item.label}
              </Link>
            ) : (
              <span className="text-slate-900">{item.label}</span>
            )}
            {index < BREADCRUMB_ITEMS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" />}
          </span>
        ))}
      </nav>

      <PageHeader
        title="Tool Charge Acquisition"
        subtitle="Preview backend-calculated tool and software charges for a project and billing period."
      />

      <FilterCard title="Filters" description="Select a project and billing period, then preview charges.">
        <div className="w-full sm:w-64">
          <SearchableSelect
            label="Project"
            requiredMark
            name="projectId"
            value={filters.projectId}
            onChange={handleFieldChange}
            options={projectOptions}
            placeholder={projectsLoading ? "Loading projects..." : "Select project"}
            disabled={projectsLoading}
          />
          {showError("projectId") && <p className="text-xs text-red-500">{errors.projectId}</p>}
        </div>
        <div className="w-full sm:w-48">
          <FormDatePicker
            label="Billing Period Start"
            name="billingPeriodStart"
            value={filters.billingPeriodStart}
            onChange={handleFieldChange}
          />
          {showError("billingPeriodStart") && <p className="text-xs text-red-500">{errors.billingPeriodStart}</p>}
        </div>
        <div className="w-full sm:w-48">
          <FormDatePicker
            label="Billing Period End"
            name="billingPeriodEnd"
            value={filters.billingPeriodEnd}
            onChange={handleFieldChange}
            min={filters.billingPeriodStart || undefined}
          />
          {showError("billingPeriodEnd") && <p className="text-xs text-red-500">{errors.billingPeriodEnd}</p>}
        </div>
        <Button variant="primary" onClick={handlePreview} loading={previewing} loadingText="Previewing...">
          Preview Charges
        </Button>
      </FilterCard>

      {hasPreviewed && (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KPICard label="Total Charges" value={totalCharges} className="h-full w-full bg-white shadow-sm" />
            <KPICard label="Total Quantity" value={totalQuantity} className="h-full w-full bg-white shadow-sm" />
            <KPICard
              label="Total Amount"
              value={formatCurrency(totalAmount, summaryCurrency)}
              className="h-full w-full bg-white shadow-sm"
            />
          </div>

          <PageCard>
            <PageCardContent className="p-6">
              {records.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                    <FileSearch className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="mb-1 text-sm font-semibold text-slate-900">No billable Tool Charges found.</h3>
                  <p className="text-xs text-slate-500">Try a different project or billing period.</p>
                </div>
              ) : (
                <div className="w-full overflow-x-auto">
                  <GenericTable headers={TABLE_HEADERS} columns={TABLE_COLUMNS} rows={tableRows} loading={previewing} />
                </div>
              )}
            </PageCardContent>
          </PageCard>
        </>
      )}
    </div>
  );
}
