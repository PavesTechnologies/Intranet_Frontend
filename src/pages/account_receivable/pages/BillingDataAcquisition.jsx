import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  Search,
  Calendar,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowLeft,
  AlertCircle,
  TrendingUp,
  Clock,
  Sparkles,
  Info,
  RefreshCw
} from "lucide-react";

import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import Button from "../../../components/Button/Button";
import Loader from "../../../components/ui/Loader";
import FormInput from "../../../components/forms/FormInput";
import { showStatusToast } from "../../../components/toastfy/toast";
import {
  fetchActiveBillingConfigurations,
  acquireBillingData,
  generateInvoiceDraft
} from "../services/billingDataAcquisitionService";
import { BILLING_MODE_LABELS } from "../data/wizardOptions";

const BILLING_TYPE_LABELS = {
  TIME_MATERIAL: "Time & Material",
  FIXED_PRICE: "Fixed Price",
  MILESTONE: "Milestone",
  RECURRING: "Recurring",
};

const frequencyLabel = (freq) => {
  if (!freq) return "—";
  return freq.charAt(0) + freq.slice(1).toLowerCase();
};

export default function BillingDataAcquisition() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isWorkspacePath = pathname.endsWith("/workspace");

  // View state for post-workspace screens: "WORKSPACE" | "DRAFT"
  // (We use router paths for Dashboard vs Workspace, and local state for final invoice draft preview)
  const [subView, setSubView] = useState("WORKSPACE");

  const [activeConfigs, setActiveConfigs] = useState([]);
  const [loadingConfigs, setLoadingConfigs] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterGeneration, setFilterGeneration] = useState("");

  // Target config & period for manual date overrides
  const [selectedConfig, setSelectedConfig] = useState(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  // Active acquisition workflow state
  const [currentConfig, setCurrentConfig] = useState(null);
  const [acquisitionResults, setAcquisitionResults] = useState(null);
  const [acquiring, setAcquiring] = useState(false);
  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [reminderSent, setReminderSent] = useState(null);
  const [showGatingModal, setShowGatingModal] = useState(false);

  const handleSendReminder = () => {
    const now = new Date();
    const formatted = now.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }) + " " + now.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit"
    });
    setReminderSent(formatted);
    showStatusToast("Billing Approval Required notification sent successfully.", "success");
  };

  useEffect(() => {
    fetchActiveBillingConfigurations().then((configs) => {
      setActiveConfigs(configs);
      setLoadingConfigs(false);
    });
  }, []);

  const handleAcquireClick = (config) => {
    if (config.invoiceGeneration === "MANUAL") {
      setSelectedConfig(config);
      setPeriodStart(config.periodStart);
      setPeriodEnd(config.periodEnd);
      setShowPeriodModal(true);
    } else {
      startAcquisition(config, config.periodStart, config.periodEnd);
    }
  };

  const handleModalProceed = () => {
    setShowPeriodModal(false);
    startAcquisition(selectedConfig, periodStart, periodEnd);
  };

  const startAcquisition = (config, start, end) => {
    setCurrentConfig({
      ...config,
      periodStart: start,
      periodEnd: end,
      billingPeriod: `${start} - ${end}`
    });
    setAcquiring(true);
    setSubView("WORKSPACE");
    navigate("/account-receivable/billing-data-acquisition/workspace");

    acquireBillingData(config, start, end).then((results) => {
      setAcquisitionResults(results);
      setAcquiring(false);
      showStatusToast("Billing records acquired from source systems.", "success");
    });
  };

  const reAcquire = () => {
    if (!currentConfig) return;
    setAcquiring(true);
    acquireBillingData(currentConfig, currentConfig.periodStart, currentConfig.periodEnd).then((results) => {
      setAcquisitionResults(results);
      setAcquiring(false);
      showStatusToast("Re-acquired latest records from source systems.", "success");
    });
  };

  const handleContinueToTax = () => {
    setGenerating(true);
    generateInvoiceDraft(currentConfig, acquisitionResults).then((result) => {
      setDraft(result);
      setGenerating(false);
      setSubView("DRAFT");
    });
  };

  const handleSaveInvoiceDraft = () => {
    showStatusToast("Invoice Draft generated and stored in billing history.", "success");
    setAcquisitionResults(null);
    setDraft(null);
    setCurrentConfig(null);
    navigate("/account-receivable/billing-data-acquisition");
  };

  // Filter logic
  const filteredConfigs = activeConfigs.filter((config) => {
    const matchesSearch =
      config.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      config.projectCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClient = !filterClient || config.client === filterClient;
    const matchesStatus = !filterStatus || config.billingStatus === filterStatus;
    const matchesType = !filterType || config.billingType === filterType;
    const matchesGeneration = !filterGeneration || config.invoiceGeneration === filterGeneration;
    return matchesSearch && matchesClient && matchesStatus && matchesType && matchesGeneration;
  });

  const uniqueClients = [...new Set(activeConfigs.map((c) => c.client))];

  if (loadingConfigs) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader />
      </div>
    );
  }

  // --- RENDER DRAFT VIEW ---
  if (isWorkspacePath && subView === "DRAFT" && draft && currentConfig) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Invoice Draft Generated</h2>
            <p className="text-sm text-slate-500">Draft Number: <span className="font-mono text-slate-700 font-semibold">{draft.draftNumber}</span></p>
          </div>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
            Draft
          </span>
        </div>

        <PageCard className="border-slate-200 bg-white">
          <PageCardContent className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm border-b border-slate-100 pb-6">
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Client</div>
                <div className="mt-1 font-bold text-slate-800">{currentConfig.client}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase">Project Name</div>
                <div className="mt-1 font-bold text-slate-800">{currentConfig.projectName}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase mt-3">Billing Period</div>
                <div className="mt-1 font-medium text-slate-800">{currentConfig.billingPeriod}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 font-semibold uppercase mt-3">Currency</div>
                <div className="mt-1 font-bold text-slate-800">{currentConfig.currency}</div>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500 font-medium">Subtotal (Acquired Sum)</span>
                <span className="font-bold text-slate-800">{currentConfig.currency} {draft.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-slate-100 pb-3">
                <span className="text-slate-500 font-medium">Estimated Tax (Dynamic Engine - GST 18%)</span>
                <span className="font-bold text-slate-800">{currentConfig.currency} {draft.estimatedTax.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-lg font-extrabold text-slate-900 pt-2">
                <span>Grand Total</span>
                <span>{currentConfig.currency} {draft.estimatedGrandTotal.toLocaleString()}</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 flex gap-3 text-xs text-slate-500 items-start">
              <Sparkles className="h-5 w-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-indigo-700 block mb-1">Dynamic Tax Engine Calculation</span>
                Applicable GST has been calculated automatically using dynamic tax engines based on the client billing registration and corporate settings.
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setSubView("WORKSPACE")}
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Workspace
              </button>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setAcquisitionResults(null);
                    setDraft(null);
                    setCurrentConfig(null);
                    navigate("/account-receivable/billing-data-acquisition");
                  }}
                >
                  Discard
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSaveInvoiceDraft}
                >
                  Save & Activate
                </Button>
              </div>
            </div>
          </PageCardContent>
        </PageCard>
      </div>
    );
  }

  // --- RENDER ACQUISITION WORKSPACE VIEW ---
  if (isWorkspacePath) {
    if (!currentConfig) {
      return (
        <div className="space-y-6 p-6">
          <PageHeader
            title="Acquisition Workspace"
            subtitle="Process source data acquisition and calculate pre-tax commercial records."
          />
          <PageCard>
            <PageCardContent className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-500">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No Project Selected</h3>
              <p className="max-w-md text-sm text-slate-500">
                Please select an active project billing configuration from the Dashboard to start data acquisition.
              </p>
              <Button variant="primary" onClick={() => navigate("/account-receivable/billing-data-acquisition")}>
                Go to Dashboard
              </Button>
            </PageCardContent>
          </PageCard>
        </div>
      );
    }

    return (
      <div className="space-y-6 p-6">
        {/* Workspace Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">{currentConfig.projectName}</h2>
            <p className="text-sm text-slate-500">{currentConfig.client} • {currentConfig.projectCode}</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs font-mono text-slate-600 bg-slate-50 border border-slate-200 rounded-xl p-3">
            <div>
              <span className="font-semibold text-slate-400">Type:</span> {BILLING_TYPE_LABELS[currentConfig.billingType]}
            </div>
            <div>
              <span className="font-semibold text-slate-400">Frequency:</span> {frequencyLabel(currentConfig.billingFrequency)}
            </div>
            <div>
              <span className="font-semibold text-slate-400">Period:</span> {currentConfig.billingPeriod}
            </div>
            <div>
              <span className="font-semibold text-slate-400">Status:</span> {currentConfig.billingStatus}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Section 1 - Billing Summary */}
            <PageCard className="border-slate-200">
              <PageCardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Section 1 – Billing Summary
                </h3>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 text-sm">
                  <div>
                    <span className="text-slate-400 block text-xs">Billing Type</span>
                    <span className="font-semibold text-slate-800">{BILLING_TYPE_LABELS[currentConfig.billingType]}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Billing Frequency</span>
                    <span className="font-semibold text-slate-800">{frequencyLabel(currentConfig.billingFrequency)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Rate Model</span>
                    <span className="font-semibold text-slate-800">
                      {currentConfig.billingType === "TIME_MATERIAL" ? "Role-Based Rates" : "Standard Retainer"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-xs">Currency</span>
                    <span className="font-semibold text-slate-800">{currentConfig.currency}</span>
                  </div>
                </div>
              </PageCardContent>
            </PageCard>

            {/* Section 2 - Source Data */}
            <PageCard className="border-slate-200">
              <PageCardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Section 2 – Source Data
                </h3>

                {acquiring ? (
                  <div className="flex justify-center py-8"><Loader /></div>
                ) : (
                  <div>
                    {/* T&M Source Data (Timesheets) */}
                    {currentConfig.billingType === "TIME_MATERIAL" && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <Info className="h-4 w-4" /> Source: Time Management System (Approved Billable Hours)
                        </div>
                        <div className="w-full overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                              <tr className="text-slate-700 font-semibold">
                                <th className="px-4 py-2 text-left">Employee</th>
                                <th className="px-4 py-2 text-left">Role</th>
                                <th className="px-4 py-2 text-center">Approved Billable Hours</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              <tr>
                                <td className="px-4 py-2 font-medium">Ajay</td>
                                <td className="px-4 py-2 text-slate-500">Developer</td>
                                <td className="px-4 py-2 text-center font-bold">80</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 font-medium">Ravi</td>
                                <td className="px-4 py-2 text-slate-500">Tester</td>
                                <td className="px-4 py-2 text-center font-bold">60</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Milestone Source Data */}
                    {currentConfig.billingType === "MILESTONE" && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <Info className="h-4 w-4" /> Source: Project Management System (Completed Milestones)
                        </div>
                        <div className="w-full overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                              <tr className="text-slate-700 font-semibold">
                                <th className="px-4 py-2 text-left">Milestone Name</th>
                                <th className="px-4 py-2 text-center">Completion Status</th>
                                <th className="px-4 py-2 text-right">Approved Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              <tr>
                                <td className="px-4 py-2 font-medium">Claims Intake Module Go-Live</td>
                                <td className="px-4 py-2 text-center">
                                  <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">Completed</span>
                                </td>
                                <td className="px-4 py-2 text-right font-bold">{currentConfig.currency} 2,100,000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Recurring Retainer Source Data */}
                    {currentConfig.billingType === "RECURRING" && (
                      <div className="space-y-3">
                        <div className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                          <Info className="h-4 w-4" /> Source: Recurring Billing Configuration
                        </div>
                        <div className="w-full overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                              <tr className="text-slate-700 font-semibold">
                                <th className="px-4 py-2 text-left">Recurring Cycle</th>
                                <th className="px-4 py-2 text-right">Configured Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              <tr>
                                <td className="px-4 py-2 font-medium">Monthly Retainer billing period</td>
                                <td className="px-4 py-2 text-right font-bold">{currentConfig.currency} 200,000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </PageCardContent>
            </PageCard>

            {/* Section 3 - Commercial Calculation */}
            <PageCard className="border-slate-200">
              <PageCardContent className="p-5 space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Section 3 – Commercial Calculation
                </h3>

                {acquiring ? (
                  <div className="flex justify-center py-8"><Loader /></div>
                ) : (
                  <div className="space-y-4">
                    {/* Time & Material Calculations */}
                    {currentConfig.billingType === "TIME_MATERIAL" && (
                      <div className="space-y-3">
                        <div className="w-full overflow-x-auto border border-slate-100 rounded-lg">
                          <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                              <tr className="text-slate-700 font-semibold">
                                <th className="px-4 py-2 text-left">Role</th>
                                <th className="px-4 py-2 text-center">Hours</th>
                                <th className="px-4 py-2 text-right">Rate</th>
                                <th className="px-4 py-2 text-right">Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                              <tr>
                                <td className="px-4 py-2 font-medium">Developer</td>
                                <td className="px-4 py-2 text-center">80</td>
                                <td className="px-4 py-2 text-right">{currentConfig.currency} 1,800</td>
                                <td className="px-4 py-2 text-right font-bold">{currentConfig.currency} 144,000</td>
                              </tr>
                              <tr>
                                <td className="px-4 py-2 font-medium">Tester</td>
                                <td className="px-4 py-2 text-center">60</td>
                                <td className="px-4 py-2 text-right">{currentConfig.currency} 1,500</td>
                                <td className="px-4 py-2 text-right font-bold">{currentConfig.currency} 90,000</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                        <div className="flex justify-between items-center text-sm font-bold text-slate-900 pt-2 px-2">
                          <span>Subtotal</span>
                          <span>{currentConfig.currency} 234,000</span>
                        </div>
                      </div>
                    )}

                    {/* Milestone Calculations */}
                    {currentConfig.billingType === "MILESTONE" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-100 pt-2 px-2">
                          <span>Subtotal</span>
                          <span>{currentConfig.currency} 2,100,000</span>
                        </div>
                      </div>
                    )}

                    {/* Recurring Calculations */}
                    {currentConfig.billingType === "RECURRING" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-sm font-bold text-slate-900 border-t border-slate-100 pt-2 px-2">
                          <span>Subtotal</span>
                          <span>{currentConfig.currency} 200,000</span>
                        </div>
                      </div>
                    )}

                    <div className="rounded-lg bg-slate-50 p-3 border border-slate-200 text-xs text-slate-400">
                      ℹ️ Note: No tax calculations or GST adjustments are applied in this workspace. Calculated totals represent commercial pre-tax subtotals.
                    </div>
                  </div>
                )}
              </PageCardContent>
            </PageCard>
          </div>

          {/* Section 4 - Billing Readiness & Footer actions */}
          <div className="space-y-6">
            <PageCard className="border-slate-200 bg-slate-50/50">
              <PageCardContent className="p-5 space-y-5">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Section 4 – Billing Readiness
                </h3>

                {/* Validation Summary Checklist */}
                <div className="space-y-3 pt-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-700 font-medium">Billing Period validated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-700 font-medium">Commercial calculation completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-700 font-medium">Duplicate billing check passed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <span className="text-slate-700 font-medium">Approved billable records acquired</span>
                  </div>
                  {currentConfig.billingType === "TIME_MATERIAL" && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="font-semibold">12 billable hours are still awaiting approval</span>
                    </div>
                  )}
                </div>

                {/* Pending Approval Handling (Billing Decision Card) */}
                {currentConfig.billingType === "TIME_MATERIAL" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                      <AlertCircle className="h-4 w-4" /> Billing Decision
                    </div>
                    <p className="text-xs text-amber-700 font-medium leading-relaxed">
                      12 billable hours are still awaiting approval. These records were excluded from the current acquisition.
                    </p>
                    <p className="text-xs text-amber-600 leading-relaxed">
                      If you continue now, the invoice will contain only approved billable records. The excluded records can only be billed after approval in a future billing cycle or supplementary invoice.
                    </p>
                  </div>
                )}

                {/* Reminder Status */}
                {currentConfig.billingType === "TIME_MATERIAL" && (
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs">
                    <div>
                      <span className="text-slate-400 font-semibold uppercase tracking-wider">Reminder Status:</span>{" "}
                      {reminderSent ? (
                        <span className="font-bold text-emerald-600">Reminder Sent</span>
                      ) : (
                        <span className="font-bold text-slate-700">Not Sent</span>
                      )}
                      {reminderSent && <div className="text-slate-400 mt-0.5 text-[10px] font-mono">{reminderSent}</div>}
                    </div>
                    {!reminderSent && (
                      <button
                        onClick={handleSendReminder}
                        className="px-2.5 py-1 text-xs font-bold text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-300 rounded bg-white transition-colors"
                      >
                        Send Reminder
                      </button>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="pt-4 border-t border-slate-200 space-y-3">
                  <Button
                    variant="primary"
                    className="w-full flex items-center justify-center gap-1.5"
                    disabled={acquiring || generating}
                    onClick={() => {
                      if (currentConfig.billingType === "TIME_MATERIAL") {
                        setShowGatingModal(true);
                      } else {
                        handleContinueToTax();
                      }
                    }}
                  >
                    Continue to Tax Calculation <ArrowRight className="h-4 w-4" />
                  </Button>



                  <Button
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-1.5"
                    onClick={reAcquire}
                    disabled={acquiring}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${acquiring ? 'animate-spin' : ''}`} /> Re-Acquire
                  </Button>

                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => {
                      setAcquisitionResults(null);
                      setCurrentConfig(null);
                      navigate("/account-receivable/billing-data-acquisition");
                    }}
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </PageCardContent>
            </PageCard>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER DEFAULT DASHBOARD VIEW ---
  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Billing Data Acquisition Dashboard"
        subtitle="Review billing readiness, trigger data acquisition, and initiate automated calculations based on active commercial agreements."
      />

      {/* KPI Header Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Billing Setups</span>
            <h4 className="text-2xl font-bold text-slate-900">{activeConfigs.length}</h4>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <FolderKanban className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ready to Bill</span>
            <h4 className="text-2xl font-bold text-emerald-600">
              {activeConfigs.filter((c) => c.billingStatus === "Ready").length}
            </h4>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice Cycles Auto Run</span>
            <h4 className="text-2xl font-bold text-indigo-600">
              {activeConfigs.filter((c) => c.invoiceGeneration === "AUTOMATIC").length}
            </h4>
          </div>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <PageCard className="border-slate-200">
        <PageCardContent className="p-4 space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search project..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
              />
            </div>

            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
            >
              <option value="">All Clients</option>
              {uniqueClients.map((client) => (
                <option key={client} value={client}>
                  {client}
                </option>
              ))}
            </select>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
            >
              <option value="">All Billing Types</option>
              <option value="TIME_MATERIAL">Time & Material</option>
              <option value="FIXED_PRICE">Fixed Price</option>
              <option value="MILESTONE">Milestone</option>
              <option value="RECURRING">Recurring</option>
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
            >
              <option value="">All Statuses</option>
              <option value="Ready">Ready</option>
              <option value="Waiting for Source Data">Waiting</option>
              <option value="Already Billed">Already Billed</option>
              <option value="Acquisition Failed">Failed</option>
            </select>

            <select
              value={filterGeneration}
              onChange={(e) => setFilterGeneration(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-shadow"
            >
              <option value="">All Gen Modes</option>
              <option value="MANUAL">Manual</option>
              <option value="AUTOMATIC">Automatic</option>
            </select>
          </div>
        </PageCardContent>
      </PageCard>

      {/* Main Grid */}
      <PageCard className="border-slate-200 overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold">
                <th className="px-6 py-4 text-left">Project</th>
                <th className="px-6 py-4 text-left">Client</th>
                <th className="px-6 py-4 text-left">Billing Type</th>
                <th className="px-6 py-4 text-left">Frequency</th>
                <th className="px-6 py-4 text-left">Billing Period</th>
                <th className="px-6 py-4 text-left">Generation</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Last Invoice</th>
                <th className="px-6 py-4 text-left">Generated On</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredConfigs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-500">
                    No active billing configurations matched the filters.
                  </td>
                </tr>
              ) : (
                filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">
                      <div>{config.projectName}</div>
                      <div className="text-xs text-slate-400">{config.projectCode}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{config.client}</td>
                    <td className="px-6 py-4 text-slate-600">
                      {BILLING_TYPE_LABELS[config.billingType] || config.billingType}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {frequencyLabel(config.billingFrequency)}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {config.billingPeriod}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.invoiceGeneration === "AUTOMATIC"
                            ? "bg-indigo-50 text-indigo-700"
                            : "bg-slate-100 text-slate-700"
                          }`}
                      >
                        {config.invoiceGeneration}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${config.billingStatus === "Ready"
                            ? "bg-emerald-50 text-emerald-700"
                            : config.billingStatus === "Already Billed"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700"
                          }`}
                      >
                        {config.billingStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-slate-600">
                      {config.lastInvoice || "—"}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono text-xs">
                      {config.generatedOn || "—"}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {config.billingStatus === "Already Billed" ? (
                        <button
                          onClick={() => {
                            setCurrentConfig(config);
                            setGenerating(true);
                            generateInvoiceDraft(config, {}).then((result) => {
                              setDraft(result);
                              setGenerating(false);
                              setSubView("DRAFT");
                              navigate("/account-receivable/billing-data-acquisition/workspace");
                            });
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
                        >
                          <FileText className="h-3 w-3" /> View Invoice
                        </button>
                      ) : config.billingStatus === "Waiting for Source Data" ? (
                        <button
                          disabled
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-lg cursor-not-allowed"
                        >
                          <Play className="h-3 w-3 fill-current text-slate-300" /> Acquire
                        </button>
                      ) : (
                        <button
                          onClick={() => handleAcquireClick(config)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          <Play className="h-3 w-3 fill-current" /> Acquire
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </PageCard>

      {/* Manual Date Period Config Modal */}
      {showPeriodModal && selectedConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Define Manual Billing Period</h3>
              <p className="text-xs text-slate-500 mt-1">
                This project configuration requires manual billing period approval. Review or adjust dates.
              </p>
            </div>

            <div className="space-y-4">
              <FormInput
                label="Billing Start Date *"
                name="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
              />
              <FormInput
                label="Billing End Date *"
                name="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => setShowPeriodModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleModalProceed}
              >
                Acquire Billing Data
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Pending approvals gating dialog modal */}
      {showGatingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-slate-200 space-y-6">
            <div className="flex gap-3">
              <AlertCircle className="h-6 w-6 text-amber-600 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">Pending Billable Records Detected</h3>
                <p className="text-xs text-slate-500 mt-1">
                  12 billable hours are still awaiting approval.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs text-slate-600">
              <div className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">•</span>
                <span>Only approved records will be included.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">•</span>
                <span>Pending records will be excluded.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-slate-400 font-bold">•</span>
                <span>Additional invoices may be required later.</span>
              </div>
            </div>

            <p className="text-sm font-semibold text-slate-700">Do you want to continue?</p>

            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <Button
                variant="secondary"
                onClick={() => setShowGatingModal(false)}
              >
                Wait
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setShowGatingModal(false);
                  handleContinueToTax();
                }}
              >
                Continue Anyway
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
