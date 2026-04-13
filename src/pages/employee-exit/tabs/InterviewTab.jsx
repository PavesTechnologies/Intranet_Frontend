import React, { useState } from 'react';
import { exit_interview } from '../data/mockData';
import { Star, MessageCircle, Building2, User } from 'lucide-react';

export default function InterviewTab({ exit_uuid }) {
  const [interviews] = useState(exit_interview.filter(i => i.exit_uuid === exit_uuid));
  const interview = interviews.length > 0 ? interviews[0] : null;

  if (!interview) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center bg-gray-50/50 rounded-2xl border border-dashed border-gray-300">
        <div className="bg-white p-4 rounded-full mb-4 shadow-sm border border-gray-100">
          <MessageCircle size={32} className="text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Exit Interview Pending</h3>
        <p className="text-gray-500 mt-1 max-w-sm">The employee has not submitted their exit interview feedback yet. You can send them a reminder.</p>
        <button className="mt-6 bg-white border border-gray-200 text-gray-700 font-semibold py-2 px-6 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
          Send Reminder Email
        </button>
      </div>
    );
  }

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star 
        key={index} 
        size={24} 
        className={index < rating ? "text-amber-400 fill-amber-400 drop-shadow-sm" : "text-gray-200 fill-gray-100"} 
      />
    ));
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="mb-6 border-b border-gray-100 pb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Exit Interview Feedback</h2>
          <p className="text-gray-500 mt-1">Review the employee's final ratings, reasons for leaving, and feedback.</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-medium text-gray-500 mb-1">Submitted On</p>
          <p className="font-semibold text-gray-900">{new Date(interview.submitted_at).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-center gap-4 border-b border-gray-100 pb-6 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center border border-amber-100 shadow-inner">
            <h1 className="text-2xl font-bold text-amber-600">{interview.rating}.0</h1>
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Overall Experience Rating</h3>
            <div className="flex gap-1 mt-1">
              {renderStars(interview.rating)}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-2">
              <MessageCircle size={18} className="text-blue-500" /> Reason for Leaving
            </h4>
            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100/50 text-gray-700 italic">
              "{interview.reason_for_leaving}"
            </div>
          </div>

          <div>
            <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-2">
              <Building2 size={18} className="text-purple-500" /> Company Feedback
            </h4>
            <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100/50 text-gray-700">
              {interview.company_feedback}
            </div>
          </div>

          <div>
            <h4 className="flex items-center gap-2 font-bold text-gray-900 mb-2">
              <User size={18} className="text-emerald-500" /> Manager Feedback
            </h4>
            <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100/50 text-gray-700">
              {interview.manager_feedback}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
