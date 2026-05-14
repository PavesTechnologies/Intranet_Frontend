// src/pages/Projects/Testmanagement/TestDesign/panels/StepsPanel.jsx
import React from "react";
import{jwtDecode} from "jwt-decode";
const token = localStorage.getItem("token");
  
  let canCreateTest = false;
  
  if (token) {
    const decoded = jwtDecode(token);
  
    const roles = decoded?.roles || [];
  
    canCreateTest =
      roles.includes("Tester") ||
      roles.includes("Project_Manager");
  }

export default function StepsPanel({ step }) {
  if (!step) return null;

  return (
    <div className="bg-white rounded-xl border p-6 shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-slate-800">Step Details</h3>
      
      <div className="space-y-4">
        {/* ACTION */}
        <div>
          <strong className="text-sm text-slate-900 block mb-1">Action:</strong>
          <div className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
            {step.action || "No action specified."}
          </div>
        </div>
        
        {/* EXPECTED RESULT */}
        <div>
          <strong className="text-sm text-slate-900 block mb-1">Expected Result:</strong>
          {/* ⭐ whitespace-pre-wrap is the magic class that allows multiple lines */}
          <div className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-3 rounded-lg border border-slate-100">
            {step.expected || "No expected result specified."}
          </div>
        </div>
      </div>
      
    </div>
  );
}