import { useState, useMemo } from "react";
import PageHeader from "../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../components/Cards/PageCard";
import { KPICard } from "../../../components/kpi/KPI";
import Button from "../../../components/Button/Button";
import {
  Coins,
  Clock,
  TrendingUp,
  FileText,
  FileCheck,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Eye,
  Check,
  Mail,
  UserCheck,
  CreditCard,
  Settings,
  HelpCircle,
  FileX,
  Send,
  Calendar
} from "lucide-react";

// Mock Data representing PMS, TMS, RMS source systems
const MOCK_SOURCE_BILLABLES = [
  { id: "SRC-001", client: "ABC Technologies", project: "ERP Modernization", type: "TMS", source: "Approved Timesheets (120 hrs)", amount: 18000, desc: "April 2026 Timesheet entry (120 billable hours at standard rate)" },
  { id: "SRC-002", client: "ABC Technologies", project: "ERP Modernization", type: "PMS", source: "Milestone: Design Sign-off", amount: 25000, desc: "Contract milestone payment - Requirements & Design sign-off" },
  { id: "SRC-003", client: "Zenith Manufacturing", project: "HR Portal", type: "RMS", source: "Resource License Allocation", amount: 4500, desc: "3x Designer IDE Licenses allocation (April 2026 billing cycle)" },
  { id: "SRC-004", client: "Zenith Manufacturing", project: "HR Portal", type: "TMS", source: "Approved Timesheets (80 hrs)", amount: 9600, desc: "April 2026 Timesheet entry (80 billable hours at standard rate)" },
  { id: "SRC-005", client: "Global Retail", project: "E-Commerce Integration", type: "PMS", source: "Milestone: UAT Complete", amount: 40000, desc: "Project milestone payment - User Acceptance Testing completion" },
];

const MOCK_TAX_RULES = [
  { id: "TR-001", state: "Karnataka", rateType: "CGST_SGST", taxRate: 18, desc: "Standard 18% GST (9% CGST + 9% SGST) for domestic service delivery" },
  { id: "TR-002", state: "Export", rateType: "EXPORT_ZERO", taxRate: 0, desc: "Zero-rated export services (SEZ / International Clients)" },
  { id: "TR-003", state: "Exempted", rateType: "EXEMPT", taxRate: 0, desc: "Tax exempt services under government regulations" },
];

const INITIAL_INVOICES = [
  { id: "INV-2026-001", client: "ABC Technologies", project: "ERP Modernization", amount: 43000, tax: 7740, grandTotal: 50740, date: "2026-04-05", dueDate: "2026-05-05", status: "Partially Paid", paidAmount: 20000, remaining: 30740, aging: "0-30 Days", paymentHistory: [{ date: "2026-04-20", amount: 20000, method: "Bank Transfer" }] },
  { id: "INV-2026-002", client: "Zenith Manufacturing", project: "HR Portal", amount: 14100, tax: 2538, grandTotal: 16638, date: "2026-03-10", dueDate: "2026-04-10", status: "Overdue", paidAmount: 0, remaining: 16638, aging: "61-90 Days", paymentHistory: [] },
  { id: "INV-2026-003", client: "Global Retail", project: "E-Commerce Integration", amount: 40000, tax: 0, grandTotal: 40000, date: "2026-02-15", dueDate: "2026-03-15", status: "Overdue", paidAmount: 10000, remaining: 30000, aging: "90+ Days", paymentHistory: [{ date: "2026-03-01", amount: 10000, method: "Credit Card" }] },
  { id: "INV-2026-004", client: "Nexa Labs", project: "Cloud Migration", amount: 15000, tax: 2700, grandTotal: 17700, date: "2026-04-28", dueDate: "2026-05-28", status: "Paid", paidAmount: 17700, remaining: 0, aging: "0-30 Days", paymentHistory: [{ date: "2026-05-02", amount: 17700, method: "ACH Transfer" }] },
];

export default function AccountReceivableDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  // Invoices & Drafts State
  const [invoices, setInvoices] = useState(INITIAL_INVOICES);
  const [drafts, setDrafts] = useState([
    { id: "DFT-001", client: "Delta Corp", project: "BI Analytics", amount: 15000, taxRate: 18, tax: 2700, grandTotal: 17700, status: "Draft", taxRule: "Standard 18% GST" },
    { id: "DFT-002", client: "Apex Systems", project: "API Gateway", amount: 35000, taxRate: 0, tax: 0, grandTotal: 35000, status: "Under Review", taxRule: "Zero-rated export" },
  ]);

  // Adjustments & Settings State
  const [adjustments, setAdjustments] = useState([
    { id: "ADJ-001", type: "Credit Note", invoiceId: "INV-2026-001", client: "ABC Technologies", amount: 5000, reason: "Volume Discount Adjustment", status: "Approved" },
    { id: "ADJ-002", type: "Debit Note", invoiceId: "INV-2026-003", client: "Global Retail", amount: 2500, reason: "Additional hosting charges adjustment", status: "Draft" },
  ]);

  // Active Draft Invoice Creation Form State
  const [selectedSource, setSelectedSource] = useState(MOCK_SOURCE_BILLABLES[0].id);
  const [selectedTaxRule, setSelectedTaxRule] = useState(MOCK_TAX_RULES[0].id);
  const [generatedDraft, setGeneratedDraft] = useState(null);

  // Payment Recording Modal State
  const [activePaymentInvoice, setActivePaymentInvoice] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");

  // Dynamic calculations for Overview Metrics
  const metrics = useMemo(() => {
    const totalOutstanding = invoices.reduce((sum, inv) => sum + inv.remaining, 0);
    const totalCollected = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalInvoiced = invoices.reduce((sum, inv) => sum + inv.grandTotal, 0);
    const collectionRate = totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;
    const overdueCount = invoices.filter(inv => inv.status === "Overdue" && inv.remaining > 0).length;

    return { totalOutstanding, totalCollected, totalInvoiced, collectionRate, overdueCount };
  }, [invoices]);

  // Source object resolver
  const sourceObj = useMemo(() => {
    return MOCK_SOURCE_BILLABLES.find(s => s.id === selectedSource);
  }, [selectedSource]);

  // Tax rule object resolver
  const taxRuleObj = useMemo(() => {
    return MOCK_TAX_RULES.find(t => t.id === selectedTaxRule);
  }, [selectedTaxRule]);

  // Handle Invoicing Draft Generation simulation
  const handleGenerateInvoice = () => {
    if (!sourceObj || !taxRuleObj) return;

    const baseAmount = sourceObj.amount;
    const calculatedTax = Math.round((baseAmount * taxRuleObj.taxRate) / 100);
    const grandTotal = baseAmount + calculatedTax;

    setGeneratedDraft({
      id: `DFT-${Math.floor(100 + Math.random() * 900)}`,
      client: sourceObj.client,
      project: sourceObj.project,
      amount: baseAmount,
      taxRate: taxRuleObj.taxRate,
      tax: calculatedTax,
      grandTotal: grandTotal,
      taxRule: taxRuleObj.desc,
      status: "Draft",
    });
  };

  const handleSaveDraft = () => {
    if (!generatedDraft) return;
    setDrafts(prev => [...prev, generatedDraft]);
    setGeneratedDraft(null);
  };

  // Submit invoice draft for approval
  const handleSubmitApproval = (draftId) => {
    setDrafts(prev =>
      prev.map(d => d.id === draftId ? { ...d, status: "Under Review" } : d)
    );
  };

  // Finance approval sequence
  const handleApproveDraft = (draftId) => {
    const draft = drafts.find(d => d.id === draftId);
    if (!draft) return;

    // Remove from drafts, add to invoices
    setDrafts(prev => prev.filter(d => d.id !== draftId));
    setInvoices(prev => [
      ...prev,
      {
        id: `INV-2026-${Math.floor(100 + Math.random() * 900)}`,
        client: draft.client,
        project: draft.project,
        amount: draft.amount,
        tax: draft.tax,
        grandTotal: draft.grandTotal,
        date: new Date().toISOString().split("T")[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        status: "Overdue",
        paidAmount: 0,
        remaining: draft.grandTotal,
        aging: "0-30 Days",
        paymentHistory: [],
      }
    ]);
  };

  // Record Payment implementation
  const handleSavePayment = () => {
    if (!activePaymentInvoice || !paymentAmount) return;

    const pAmount = parseFloat(paymentAmount);
    if (isNaN(pAmount) || pAmount <= 0) return;

    setInvoices(prev =>
      prev.map(inv => {
        if (inv.id === activePaymentInvoice.id) {
          const newPaidAmount = inv.paidAmount + pAmount;
          const newRemaining = Math.max(0, inv.grandTotal - newPaidAmount);
          const newStatus = newRemaining === 0 ? "Paid" : "Partially Paid";

          return {
            ...inv,
            paidAmount: newPaidAmount,
            remaining: newRemaining,
            status: newStatus,
            paymentHistory: [
              ...inv.paymentHistory,
              { date: new Date().toISOString().split("T")[0], amount: pAmount, method: paymentMethod }
            ]
          };
        }
        return inv;
      })
    );

    setActivePaymentInvoice(null);
    setPaymentAmount("");
  };

  // Create Credit / Debit Note
  const handleCreateAdjustment = (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const newAdj = {
      id: `ADJ-${Math.floor(100 + Math.random() * 900)}`,
      type: fd.get("type"),
      invoiceId: fd.get("invoiceId"),
      client: fd.get("client"),
      amount: parseFloat(fd.get("amount")),
      reason: fd.get("reason"),
      status: "Draft",
    };
    setAdjustments(prev => [...prev, newAdj]);
    e.target.reset();
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Accounts Receivable Hub"
        subtitle="End-to-end Invoice Generation, Dynamic Tax calculations, Approvals, and Outstanding Payment tracking."
      />

      {/* Tabs Menu Navigation */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-white p-2 rounded-t-lg shadow-sm">
        {[
          { id: "overview", label: "Dashboard Overview", icon: Coins },
          { id: "billing-tax", label: "Invoice Generation & Tax", icon: TrendingUp },
          { id: "approvals", label: "Review & Approval", icon: FileCheck },
          { id: "receivables", label: "Outstanding Receivables", icon: Clock },
          { id: "reminders-adjustments", label: "Reminders & Adjustments", icon: Settings },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab.id
                ? "bg-slate-900 text-white shadow"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-55"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW & ANALYTICS */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              label="Outstanding Balance"
              value={`₹${metrics.totalOutstanding.toLocaleString()}`}
              icon={<Clock className="h-5 w-5" />}
              color="bg-red-600 text-white animate-pulse"
            />
            <KPICard
              label="Collected Revenue"
              value={`₹${metrics.totalCollected.toLocaleString()}`}
              icon={<Coins className="h-5 w-5" />}
              color="bg-emerald-600 text-white"
            />
            <KPICard
              label="Collection Rate"
              value={`${metrics.collectionRate}%`}
              icon={<TrendingUp className="h-5 w-5" />}
              color="bg-indigo-600 text-white"
            />
            <KPICard
              label="Overdue Invoices"
              value={metrics.overdueCount}
              icon={<AlertTriangle className="h-5 w-5" />}
              color="bg-amber-500 text-white"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Outstanding Receivables Aging Analysis */}
            <PageCard>
              <PageCardContent className="p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Receivables Aging Analysis</h3>
                <div className="space-y-4">
                  {[
                    { label: "0-30 Days", amount: invoices.filter(i => i.aging === "0-30 Days" && i.status !== "Paid").reduce((s, i) => s + i.remaining, 0), color: "bg-blue-500" },
                    { label: "31-60 Days", amount: invoices.filter(i => i.aging === "31-60 Days" && i.status !== "Paid").reduce((s, i) => s + i.remaining, 0), color: "bg-teal-500" },
                    { label: "61-90 Days", amount: invoices.filter(i => i.aging === "61-90 Days" && i.status !== "Paid").reduce((s, i) => s + i.remaining, 0), color: "bg-amber-500" },
                    { label: "90+ Days", amount: invoices.filter(i => i.aging === "90+ Days" && i.status !== "Paid").reduce((s, i) => s + i.remaining, 0), color: "bg-red-500" },
                  ].map((bar) => {
                    const pct = metrics.totalOutstanding > 0 ? (bar.amount / metrics.totalOutstanding) * 100 : 0;
                    return (
                      <div key={bar.label} className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-slate-600">{bar.label}</span>
                          <span className="text-slate-900 font-bold">₹{bar.amount.toLocaleString()} ({Math.round(pct)}%)</span>
                        </div>
                        <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${bar.color}`} style={{ width: `${pct}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </PageCardContent>
            </PageCard>

            {/* Collection Activities */}
            <PageCard>
              <PageCardContent className="p-6">
                <h3 className="text-base font-semibold text-slate-900 mb-4">Latest Collection Activities</h3>
                <div className="relative border-l border-slate-200 pl-4 space-y-4">
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-1 bg-amber-500 h-2.5 w-2.5 rounded-full border border-white"></div>
                    <p className="text-xs text-slate-500">2 hours ago</p>
                    <p className="text-sm font-medium text-slate-800">Auto Overdue WhatsApp Reminder sent to Zenith Manufacturing</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-1 bg-emerald-500 h-2.5 w-2.5 rounded-full border border-white"></div>
                    <p className="text-xs text-slate-500">1 day ago</p>
                    <p className="text-sm font-medium text-slate-800">Payment of ₹20,000 recorded for invoice INV-2026-001</p>
                  </div>
                  <div className="relative">
                    <div className="absolute -left-[21px] mt-1 bg-indigo-500 h-2.5 w-2.5 rounded-full border border-white"></div>
                    <p className="text-xs text-slate-500">3 days ago</p>
                    <p className="text-sm font-medium text-slate-800">New invoice draft generated via Dynamic Tax Resolver for Delta Corp</p>
                  </div>
                </div>
              </PageCardContent>
            </PageCard>
          </div>
        </div>
      )}

      {/* TAB 2: INVOICE GENERATION & TAX ENGINE */}
      {activeTab === "billing-tax" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <PageCard>
              <PageCardContent className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">1. Select Source Billables</h3>
                <p className="text-xs text-slate-500">Select data compiled from PMS (projects), TMS (timesheets), or RMS (licenses).</p>

                <div className="space-y-2">
                  {MOCK_SOURCE_BILLABLES.map((bill) => (
                    <label
                      key={bill.id}
                      className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedSource === bill.id
                          ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800 uppercase">
                          {bill.type}
                        </span>
                        <span className="text-sm font-bold text-slate-900">₹{bill.amount.toLocaleString()}</span>
                      </div>
                      <span className="text-sm font-medium mt-1 text-slate-800">{bill.project}</span>
                      <span className="text-xs text-slate-500">{bill.source}</span>
                      <input
                        type="radio"
                        name="sourceBillable"
                        value={bill.id}
                        checked={selectedSource === bill.id}
                        onChange={() => setSelectedSource(bill.id)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>

                <h3 className="text-base font-bold text-slate-900 pt-2">2. Apply Dynamic Tax Rules</h3>
                <div className="space-y-2">
                  {MOCK_TAX_RULES.map((tax) => (
                    <label
                      key={tax.id}
                      className={`flex flex-col p-3 rounded-lg border cursor-pointer transition-all ${
                        selectedTaxRule === tax.id
                          ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-slate-800">{tax.state}</span>
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">{tax.taxRate}% tax</span>
                      </div>
                      <span className="text-xs text-slate-500 mt-1">{tax.desc}</span>
                      <input
                        type="radio"
                        name="taxRule"
                        value={tax.id}
                        checked={selectedTaxRule === tax.id}
                        onChange={() => setSelectedTaxRule(tax.id)}
                        className="sr-only"
                      />
                    </label>
                  ))}
                </div>

                <Button variant="primary" className="w-full mt-4" onClick={handleGenerateInvoice}>
                  Run Dynamic Tax &amp; Preview
                </Button>
              </PageCardContent>
            </PageCard>
          </div>

          <div className="lg:col-span-2">
            <PageCard className="h-full">
              <PageCardContent className="p-6 flex flex-col justify-between h-full">
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-4">Invoice Total Calculator &amp; Preview</h3>

                  {generatedDraft ? (
                    <div className="border border-slate-200 rounded-lg p-6 space-y-6 bg-slate-50/50">
                      <div className="flex justify-between border-b pb-4">
                        <div>
                          <h4 className="text-lg font-bold text-slate-900">{generatedDraft.client}</h4>
                          <p className="text-sm text-slate-500">{generatedDraft.project}</p>
                        </div>
                        <div className="text-right">
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-800">
                            {generatedDraft.status}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">Ref ID: {generatedDraft.id}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dynamic Tax Engine Resolution</h5>
                        <p className="text-sm text-slate-800 font-medium">Applied rule: <span className="text-blue-700">{generatedDraft.taxRule}</span></p>
                      </div>

                      <div className="space-y-2 border-t pt-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Base Amount</span>
                          <span className="font-semibold text-slate-900">₹{generatedDraft.amount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Resolved Tax ({generatedDraft.taxRate}%)</span>
                          <span className="font-semibold text-slate-900">₹{generatedDraft.tax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold border-t pt-2 text-slate-950">
                          <span>Grand Total</span>
                          <span>₹{generatedDraft.grandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                      <HelpCircle className="h-12 w-12 stroke-1 mb-2 text-slate-300" />
                      <p className="text-sm">Select source parameters and click "Run Dynamic Tax" to view calculation results.</p>
                    </div>
                  )}
                </div>

                {generatedDraft && (
                  <div className="flex gap-3 mt-6">
                    <Button variant="outline" className="flex-1" onClick={() => setGeneratedDraft(null)}>
                      Reset
                    </Button>
                    <Button variant="primary" className="flex-1" onClick={handleSaveDraft}>
                      Save Invoice Draft
                    </Button>
                  </div>
                )}
              </PageCardContent>
            </PageCard>
          </div>
        </div>
      )}

      {/* TAB 3: REVIEW & APPROVAL */}
      {activeTab === "approvals" && (
        <PageCard>
          <PageCardContent className="p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Invoice Draft Reviews</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600 font-medium">
                <thead>
                  <tr className="border-b bg-slate-50 text-xs uppercase font-bold text-slate-500">
                    <th className="px-4 py-3">Draft ID</th>
                    <th className="px-4 py-3">Client &amp; Project</th>
                    <th className="px-4 py-3">Base Amount</th>
                    <th className="px-4 py-3">Resolved Tax</th>
                    <th className="px-4 py-3">Total Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {drafts.map((draft) => (
                    <tr key={draft.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-semibold text-slate-950">{draft.id}</td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{draft.client}</div>
                        <div className="text-xs text-slate-500">{draft.project}</div>
                      </td>
                      <td className="px-4 py-3">₹{draft.amount.toLocaleString()}</td>
                      <td className="px-4 py-3">₹{draft.tax.toLocaleString()} ({draft.taxRate}%)</td>
                      <td className="px-4 py-3 font-bold text-slate-900">₹{draft.grandTotal.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                          draft.status === "Draft" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {draft.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-2">
                        {draft.status === "Draft" ? (
                          <Button variant="outline" size="sm" onClick={() => handleSubmitApproval(draft.id)}>
                            Submit for Approval
                          </Button>
                        ) : (
                          <Button variant="primary" size="sm" onClick={() => handleApproveDraft(draft.id)}>
                            Finance Approve
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {drafts.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        No invoice drafts requiring approval.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </PageCardContent>
        </PageCard>
      )}

      {/* TAB 4: OUTSTANDING RECEIVABLES & LEDGER */}
      {activeTab === "receivables" && (
        <div className="space-y-6">
          <PageCard>
            <PageCardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-base font-bold text-slate-900">Outstanding Invoices</h3>
                <span className="text-xs text-slate-500">Aging is calculated from invoice issue date</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-slate-600">
                  <thead>
                    <tr className="border-b bg-slate-50 text-xs uppercase font-bold text-slate-500">
                      <th className="px-4 py-3">Invoice ID</th>
                      <th className="px-4 py-3">Client</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Paid</th>
                      <th className="px-4 py-3">Remaining Balance</th>
                      <th className="px-4 py-3">Aging Bracket</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-semibold text-slate-900">{inv.id}</td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900">{inv.client}</div>
                          <div className="text-xs text-slate-500">{inv.project}</div>
                        </td>
                        <td className="px-4 py-3">₹{inv.grandTotal.toLocaleString()}</td>
                        <td className="px-4 py-3 text-emerald-600 font-medium">₹{inv.paidAmount.toLocaleString()}</td>
                        <td className="px-4 py-3 font-bold text-red-600">₹{inv.remaining.toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                            inv.aging === "0-30 Days" ? "bg-blue-50 text-blue-800" :
                            inv.aging === "31-60 Days" ? "bg-teal-50 text-teal-800" :
                            inv.aging === "61-90 Days" ? "bg-amber-50 text-amber-800" :
                            "bg-red-50 text-red-800 font-bold"
                          }`}>
                            {inv.aging}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                            inv.status === "Paid" ? "bg-emerald-100 text-emerald-800" :
                            inv.status === "Partially Paid" ? "bg-indigo-100 text-indigo-800" :
                            "bg-rose-100 text-rose-800"
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {inv.remaining > 0 && (
                            <Button variant="primary" size="sm" onClick={() => setActivePaymentInvoice(inv)}>
                              Record Payment
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </PageCardContent>
          </PageCard>

          {/* Payment Modal */}
          {activePaymentInvoice && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
                <h4 className="text-lg font-bold text-slate-900 border-b pb-2">Record Payment for {activePaymentInvoice.id}</h4>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Invoice Total:</span>
                    <span className="font-bold">₹{activePaymentInvoice.grandTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Outstanding Balance:</span>
                    <span className="font-bold text-red-600">₹{activePaymentInvoice.remaining.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Payment Amount (₹)</label>
                    <input
                      type="number"
                      max={activePaymentInvoice.remaining}
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      placeholder={`e.g. ${activePaymentInvoice.remaining}`}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-slate-950"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg bg-white focus:outline-none"
                    >
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="ACH Transfer">ACH Transfer</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Debit Note Adjustment">Debit Note Offset</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="outline" onClick={() => setActivePaymentInvoice(null)}>Cancel</Button>
                  <Button variant="primary" onClick={handleSavePayment}>Apply Payment</Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: REMINDERS, ADJUSTMENTS & SETTINGS */}
      {activeTab === "reminders-adjustments" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <PageCard>
              <PageCardContent className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Create Adjustment Note</h3>
                <form onSubmit={handleCreateAdjustment} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Adjustment Type</label>
                    <select name="type" className="w-full px-3 py-2 border rounded-lg bg-white focus:outline-none">
                      <option value="Credit Note">Credit Note (Reduce balance)</option>
                      <option value="Debit Note">Debit Note (Increase balance)</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Reference Invoice ID</label>
                    <input name="invoiceId" placeholder="e.g. INV-2026-001" className="w-full px-3 py-2 border rounded-lg focus:outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Client Name</label>
                    <input name="client" placeholder="e.g. ABC Technologies" className="w-full px-3 py-2 border rounded-lg focus:outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Amount (₹)</label>
                    <input name="amount" type="number" placeholder="e.g. 1500" className="w-full px-3 py-2 border rounded-lg focus:outline-none" required />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase">Adjustment Reason</label>
                    <textarea name="reason" placeholder="Brief explanation..." className="w-full px-3 py-2 border rounded-lg focus:outline-none h-20" required></textarea>
                  </div>
                  <Button type="submit" variant="primary" className="w-full">Create Note</Button>
                </form>
              </PageCardContent>
            </PageCard>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <PageCard>
              <PageCardContent className="p-6">
                <h3 className="text-base font-bold text-slate-900 mb-4">Adjustments Ledgers</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-600">
                    <thead>
                      <tr className="border-b bg-slate-50 text-xs uppercase font-bold text-slate-500">
                        <th className="px-4 py-3">Ref ID</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3">Invoice Ref</th>
                        <th className="px-4 py-3">Client</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Reason</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {adjustments.map((adj) => (
                        <tr key={adj.id} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-950">{adj.id}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              adj.type === "Credit Note" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                            }`}>
                              {adj.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">{adj.invoiceId}</td>
                          <td className="px-4 py-3 font-medium text-slate-900">{adj.client}</td>
                          <td className="px-4 py-3 font-bold text-slate-900">₹{adj.amount.toLocaleString()}</td>
                          <td className="px-4 py-3 text-xs text-slate-500">{adj.reason}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 text-xs font-semibold rounded ${
                              adj.status === "Approved" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                            }`}>
                              {adj.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PageCardContent>
            </PageCard>

            <PageCard>
              <PageCardContent className="p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900">Communication &amp; Reminders Config</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-800">Email Reminder Schedule</span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">Active</span>
                    </div>
                    <p className="text-xs text-slate-500">Automatically sends payment reminders to clients 3 days before due date, on due date, and every 7 days post due date.</p>
                  </div>
                  <div className="p-4 border rounded-lg bg-slate-50/50 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-slate-800">WhatsApp Overdue Alerts</span>
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">Active</span>
                    </div>
                    <p className="text-xs text-slate-500">Escalates payment alerts directly to client point of contacts on WhatsApp when invoices pass 30 days overdue status.</p>
                  </div>
                </div>
              </PageCardContent>
            </PageCard>
          </div>
        </div>
      )}
    </div>
  );
}
