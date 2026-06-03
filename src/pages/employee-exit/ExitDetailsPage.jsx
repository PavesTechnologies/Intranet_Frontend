import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Circle,
  FileText,
  UserCheck,
  ClipboardCheck,
  CreditCard,
  MessageSquare,
  ClipboardList,
  CalendarDays
} from 'lucide-react';
import { exit_list, employees } from './data/mockData';
import LoadingSpinner from '../../components/LoadingSpinner';

import ApprovalsTab from './tabs/ApprovalsTab';
import ClearanceTab from './tabs/ClearanceTab';
import DocumentsTab from './tabs/DocumentsTab';
import SettlementTab from './tabs/SettlementTab';
import InterviewTab from './tabs/InterviewTab';
import FeedbackSurveyTab from './tabs/FeedbackSurveyTab';
import NoticePeriodTab from './tabs/NoticePeriodTab';

const TABS = [
  { id: 'approvals', label: 'Approvals', icon: UserCheck },
  { id: 'notice_period', label: 'Notice Period', icon: CalendarDays },
  { id: 'clearance', label: 'Clearance', icon: ClipboardCheck },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'settlement', label: 'Settlement', icon: CreditCard },
  { id: 'interview', label: 'Exit Interview', icon: MessageSquare },
  { id: 'survey', label: 'Feedback Survey', icon: ClipboardList },
];

export default function ExitDetailsPage() {
  const { exit_uuid } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('approvals');
  const [exitData, setExitData] = useState(null);

  useEffect(() => {
    const rawExit = exit_list.find(e => e.exit_uuid === exit_uuid);
    if (rawExit) {
      const emp = employees.find(e => e.employee_uuid === rawExit.employee_uuid);
      setExitData({ ...rawExit, employee: emp });
    }
  }, [exit_uuid]);

  if (!exitData) return <LoadingSpinner text="Loading exit details..." />;

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'approvals': return <ApprovalsTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
      case 'notice_period': return <NoticePeriodTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
      case 'clearance': return <ClearanceTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
      case 'documents': return <DocumentsTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
      case 'settlement': return <SettlementTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
      case 'interview': return <InterviewTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
      case 'survey': return <FeedbackSurveyTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
      default: return <ApprovalsTab exit_uuid={exit_uuid} employee_uuid={exitData.employee_uuid} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-12">
      {/* Header Profile Banner */}
      <div className="bg-white border-b border-gray-200 px-8 pt-8 pb-0">
        <button 
          onClick={() => navigate('/employee-exit')}
          className="flex items-center text-sm font-medium text-gray-500 hover:text-blue-600 transition-colors mb-6"
        >
          <ArrowLeft size={16} className="mr-1.5" /> Back to Exit Dashboard
        </button>

        <div className="flex items-end justify-between mb-8">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-3xl text-white font-bold shadow-lg">
              {exitData.employee?.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 leading-tight flex items-center gap-3">
                {exitData.employee?.name}
                <span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full font-semibold tracking-wide uppercase border border-gray-200">
                  {exitData.status}
                </span>
              </h1>
              <p className="text-gray-500 font-medium mt-1">
                {exitData.employee?.designation} • {exitData.department}
              </p>
              <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
                <span>Exit Date: <strong className="text-gray-600">{new Date(exitData.exit_date).toLocaleDateString()}</strong></span>
                <span>•</span>
                <span>UUID: <span className="font-mono text-xs">{exitData.employee_uuid}</span></span>
              </p>
            </div>
          </div>
        </div>

        {/* Stepper / Tabs */}
        <div className="flex gap-8 overflow-x-auto border-b border-gray-100 hide-scrollbar">
          {TABS.map((tab, idx) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            // Mock logic for "completed" tabs: we'll say previous tabs are visually completed
            const currentIdx = TABS.findIndex(t => t.id === activeTab);
            const isCompleted = idx < currentIdx;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`group flex items-center gap-2 pb-4 pt-2 border-b-2 transition-all whitespace-nowrap ${
                  isActive 
                    ? 'border-blue-600 text-blue-700' 
                    : 'border-transparent text-gray-500 hover:text-gray-800 hover:border-gray-300'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={18} className={isActive ? "text-blue-600" : "text-green-500"} />
                ) : isActive ? (
                  <Circle size={18} fill="currentColor" className="text-blue-600" />
                ) : (
                  <Circle size={18} className="text-gray-300 group-hover:text-gray-400" />
                )}
                <span className={`font-semibold ${isActive ? '' : 'font-medium'}`}>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content Area */}
      <div className="p-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
          {renderActiveTab()}
        </div>
      </div>
    </div>
  );
}
