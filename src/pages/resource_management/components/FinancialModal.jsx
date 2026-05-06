import React, { useState } from "react";
import {
  Lock,
  Wallet,
  PieChart,
  TrendingDown,
} from "lucide-react";
import Pagination from "../../../components/Pagination/pagination";

export default function ProjectFinancialsInline() {
  const financialData = {
    totalBudget: 2500000,
    allocatedBudget: 1850000,
    remainingBudget: 650000,
    approvalStatus: "APPROVED",
  };

  const costBreakdown = [
    { role: "Backend Developer", headcount: 6, monthlyCost: 9000, months: 10 },
    { role: "Frontend Developer", headcount: 4, monthlyCost: 7500, months: 10 },
    { role: "QA Engineer", headcount: 3, monthlyCost: 6000, months: 8 },
    { role: "Project Manager", headcount: 1, monthlyCost: 10000, months: 12 },
    { role: "DevOps Engineer", headcount: 2, monthlyCost: 9500, months: 9 },
    { role: "UI/UX Designer", headcount: 1, monthlyCost: 7000, months: 6 },
  ];

  const usd = (value) => `$${value.toLocaleString("en-US")}`;

  // Pagination (INLINE – NO NAVIGATION)
  const ITEMS_PER_PAGE = 3;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(costBreakdown.length / ITEMS_PER_PAGE);

  const paginatedData = costBreakdown.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const totalEstimatedCost = costBreakdown.reduce(
    (sum, r) => sum + r.headcount * r.monthlyCost * r.months,
    0
  );

  return (
    <div className="bg-gray-50/50 p-6 space-y-6 font-sans text-slate-900">
      {/* ================= Financial Summary ================= */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase">Total Budget</p>
            <p className="text-2xl font-bold">{usd(financialData.totalBudget)}</p>
          </div>
          <Wallet className="w-6 h-6 text-blue-600" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase">Allocated</p>
            <p className="text-2xl font-bold">{usd(financialData.allocatedBudget)}</p>
          </div>
          <PieChart className="w-6 h-6 text-amber-600" />
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex justify-between">
          <div>
            <p className="text-xs text-gray-500 uppercase">Remaining</p>
            <p
              className={`text-2xl font-bold ${financialData.remainingBudget < 500000 ? "text-red-600" : ""
                }`}
            >
              {usd(financialData.remainingBudget)}
            </p>
          </div>
          <TrendingDown className="w-6 h-6 text-green-600" />
        </div>
      </div>

      {/* ================= Financial Governance ================= */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-50">
          <Lock className="w-3 h-3 text-gray-400" />
          <span className="text-xs font-bold text-gray-400 uppercase">
            Financial Governance
          </span>
        </div>

        <div className="p-6 space-y-6">
          {/* Approval Status */}
          <div>
            <p className="text-xs text-gray-400">Budget Approval Status</p>
            <span className="inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              {financialData.approvalStatus}
            </span>
          </div>

          {/* ================= Cost Breakdown ================= */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-400 uppercase">
              Cost Breakdown
            </h3>

            <div className="overflow-hidden rounded-lg border border-gray-100">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="px-6 py-3">Role</th>
                    <th className="px-6 py-3">Headcount</th>
                    <th className="px-6 py-3">Monthly Cost</th>
                    <th className="px-6 py-3">Months</th>
                    <th className="px-6 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {paginatedData.map((item, idx) => (
                    <tr key={idx}>
                      <td className="px-6 py-4 font-medium">{item.role}</td>
                      <td className="px-6 py-4">{item.headcount}</td>
                      <td className="px-6 py-4">{usd(item.monthlyCost)}</td>
                      <td className="px-6 py-4">{item.months}</td>
                      <td className="px-6 py-4 text-right font-medium">
                        {usd(item.headcount * item.monthlyCost * item.months)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ================= Pagination ================= */}
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="py-2"
            />

            {/* ================= Total ================= */}
            <div className="flex justify-end font-semibold">
              Total Estimated Cost: {usd(totalEstimatedCost)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}