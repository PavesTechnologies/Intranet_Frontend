import React, { useState } from 'react';
import { exit_final_settlement } from '../data/mockData';
import { Calculator, CheckCircle2, TrendingDown, TrendingUp, HelpCircle } from 'lucide-react';

export default function SettlementTab({ exit_uuid }) {
  const [settlements] = useState(exit_final_settlement.filter(s => s.exit_uuid === exit_uuid));
  const settlement = settlements.length > 0 ? settlements[0] : null;

  if (!settlement) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="bg-gray-100 p-4 rounded-full mb-4">
          <Calculator size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">No F&F Calculation Yet</h3>
        <p className="text-gray-500 mt-1 max-w-sm">The final settlement has not been processed for this employee yet. Initiate it to calculate dues.</p>
        <button className="mt-6 bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg hover:bg-blue-700 transition-colors">
          Initiate Settlement
        </button>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-start border-b border-gray-100 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            Final Settlement (F&F)
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide border ${
              settlement.status === 'Paid' ? 'bg-green-100 text-green-700 border-green-200' :
              settlement.status === 'Approved' ? 'bg-blue-100 text-blue-700 border-blue-200' :
              'bg-amber-100 text-amber-700 border-amber-200'
            }`}>
              {settlement.status}
            </span>
          </h2>
          <p className="text-gray-500 mt-1">Review ledger for salary, leaves, bonuses, and deductions.</p>
        </div>
        
        {settlement.status !== 'Paid' && (
          <button className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2 shadow-sm transition-colors">
            <CheckCircle2 size={18} /> Mark as Paid
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
          
          <div className="p-8 space-y-6">
            <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
              Earnings
              <TrendingUp size={18} className="text-green-500" />
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-600">Pro-rated Last Salary</span>
                <span className="font-semibold text-gray-900">{formatCurrency(settlement.last_salary)}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-600 flex items-center gap-1.5">
                  Leave Encashment 
                  <HelpCircle size={14} className="text-gray-400 cursor-help" title="Based on unused privileged leaves" />
                </span>
                <span className="font-semibold text-gray-900">{formatCurrency(settlement.leave_encashment)}</span>
              </div>
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                <span className="text-sm font-medium text-gray-600">Pending Bonus / Variable</span>
                <span className="font-semibold text-gray-900">{formatCurrency(settlement.bonus)}</span>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-6 bg-gray-50/50">
            <h3 className="font-bold text-gray-900 border-b border-gray-100 pb-3 flex items-center justify-between">
              Deductions
              <TrendingDown size={18} className="text-red-500" />
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                <span className="text-sm font-medium text-gray-600">Outstanding Dues</span>
                <span className="font-semibold text-red-600">-{formatCurrency(settlement.deductions)}</span>
              </div>
            </div>
          </div>

        </div>

        <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 flex flex-col md:flex-row justify-between items-center gap-4 text-white">
          <div>
            <p className="text-gray-400 font-medium text-sm tracking-wide uppercase">Final Net Payable</p>
            <p className="text-3xl font-bold mt-1 tracking-tight">{formatCurrency(settlement.net_payable)}</p>
          </div>
          <button className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white px-6 py-3 rounded-xl font-semibold transition-all">
            Download Breakdown
          </button>
        </div>
      </div>
    </div>
  );
}
