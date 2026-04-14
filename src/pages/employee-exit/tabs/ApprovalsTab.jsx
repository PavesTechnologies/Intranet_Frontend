import React, { useState } from 'react';
import { exit_approvals } from '../data/mockData';
import { UserCheck, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function ApprovalsTab({ exit_uuid }) {
  const [approvals, setApprovals] = useState(
    exit_approvals.filter(a => a.exit_uuid === exit_uuid)
  );

  const handleAction = (id, newStatus) => {
    setApprovals(prev => prev.map(a => 
      a.id === id ? { ...a, status: newStatus, approved_at: new Date().toISOString() } : a
    ));
  };

  if (approvals.length === 0) {
    return <div className="text-gray-500 py-12 text-center">No approval requests found for this exit profile.</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Sign-off Approvals</h2>
        <p className="text-gray-500 mt-1">Review and manage required approvals from department heads and HR.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {approvals.map((approval) => (
          <div key={approval.id} className="border border-gray-200 rounded-2xl p-6 bg-white hover:border-gray-300 transition-colors shadow-sm">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${
                  approval.approval_type === 'HR' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <UserCheck size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{approval.approval_type} Approval</h3>
                  <p className="text-xs text-gray-400 font-medium tracking-wide uppercase mt-0.5">Required Sign-off</p>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                approval.status === 'Approved' ? 'bg-green-100 text-green-700 border-green-200' :
                approval.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                'bg-amber-100 text-amber-700 border-amber-200'
              }`}>
                {approval.status}
              </span>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-5 border border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-1">Remarks</p>
              <p className="text-sm text-gray-600 italic">
                {approval.remarks ? `"${approval.remarks}"` : 'No remarks provided yet.'}
              </p>
            </div>

            <div className="flex items-center justify-between mt-auto pt-2">
              <div className="text-xs text-gray-400 flex items-center gap-1.5 font-medium">
                <Clock size={14} />
                {approval.approved_at ? new Date(approval.approved_at).toLocaleString() : 'Pending action'}
              </div>
              
              {approval.status === 'Pending' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAction(approval.id, 'Rejected')}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Reject"
                  >
                    <XCircle size={20} />
                  </button>
                  <button 
                    onClick={() => handleAction(approval.id, 'Approved')}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Approve"
                  >
                    <CheckCircle2 size={20} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
