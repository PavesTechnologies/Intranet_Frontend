import React, { useState } from 'react';
import { exit_clearance, exit_clearance_items } from '../data/mockData';
import { ClipboardCheck, Settings, Monitor, FileKey, CheckSquare, Square } from 'lucide-react';

export default function ClearanceTab({ exit_uuid }) {
  const [clearances] = useState(exit_clearance.filter(c => c.exit_uuid === exit_uuid));
  const [items, setItems] = useState(exit_clearance_items);

  const handleToggleItem = (itemId) => {
    setItems(prev => prev.map(item => 
      item.id === itemId 
        ? { ...item, status: item.status === 'Completed' ? 'Pending' : 'Completed', updated_at: new Date().toISOString() } 
        : item
    ));
  };

  const getDeptIcon = (dept) => {
    switch(dept) {
      case 'IT': return <Monitor size={20} className="text-blue-500" />;
      case 'Admin': return <FileKey size={20} className="text-purple-500" />;
      default: return <Settings size={20} className="text-gray-500" />;
    }
  };

  if (clearances.length === 0) {
    return <div className="text-gray-500 py-12 text-center">No clearance records found for this exit profile.</div>;
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Department Clearances</h2>
        <p className="text-gray-500 mt-1">Manage asset returns, system access revocations, and department sign-offs.</p>
      </div>

      <div className="space-y-6">
        {clearances.map((clearance) => {
          const deptItems = items.filter(i => i.clearance_uuid === clearance.clearance_uuid);
          
          return (
            <div key={clearance.id} className="bg-white border text-left border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="bg-gray-50 border-b border-gray-100 p-5 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="bg-white p-2 shadow-sm rounded-lg border border-gray-100">
                    {getDeptIcon(clearance.department)}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{clearance.department} Clearance</h3>
                    <p className="text-xs text-gray-500 font-medium">Status: 
                      <span className={`ml-1 ${clearance.status === 'Approved' ? 'text-green-600' : 'text-amber-500'}`}>
                        {clearance.status}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-0">
                {deptItems.length > 0 ? (
                  <ul className="divide-y divide-gray-100">
                    {deptItems.map(item => (
                      <li key={item.id} className="p-5 hover:bg-gray-50/50 transition-colors flex items-start gap-4">
                        <button 
                          onClick={() => handleToggleItem(item.id)}
                          className="mt-0.5 text-gray-400 hover:text-blue-600 focus:outline-none transition-colors"
                        >
                          {item.status === 'Completed' ? (
                            <CheckSquare size={22} className="text-blue-600" />
                          ) : (
                            <Square size={22} />
                          )}
                        </button>
                        <div className="flex-1">
                          <p className={`font-semibold ${item.status === 'Completed' ? 'text-gray-900 line-through opacity-70' : 'text-gray-900'}`}>
                            {item.item_name}
                          </p>
                          <p className="text-sm text-gray-500 mt-1">{item.remarks}</p>
                        </div>
                        <div className="text-xs text-gray-400 font-medium whitespace-nowrap">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-6 text-center text-sm text-gray-500">
                    No specific checklist items defined. Clearance relies on general remarks.
                    <div className="mt-3 bg-gray-50 p-3 rounded-lg text-left italic border border-gray-100 max-w-lg mx-auto">
                      "{clearance.remarks}"
                    </div>
                  </div>
                )}
              </div>
              
              {clearance.status !== 'Approved' && (
                <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors shadow-sm">
                    Mark Department as Cleared
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
