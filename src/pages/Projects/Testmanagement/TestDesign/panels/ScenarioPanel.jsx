import React from "react";
import {
  Plus,
  ListTodo,
  ClipboardList,
  ListChecks,
  ArrowRight,
  Edit,      // ⭐ ADDED IMPORT
  Trash2     // ⭐ ADDED IMPORT
} from "lucide-react";
import Button from "../../../../../components/Button/Button";
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


export default function ScenarioPanel({
  selectedScenario,
  selectedCase,
  onSelectCase,
  onAddCase,
  onAddSteps,
  onEditCase,   // ⭐ ADDED PROP
  onDeleteCase  // ⭐ ADDED PROP
}) {
  
  // -----------------------------
  // EMPTY STATE: No Scenario Selected
  // -----------------------------
  if (!selectedScenario) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 bg-gray-50/50">
        <ClipboardList className="w-16 h-16 mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-700">No Scenario Selected</h3>
        <p className="text-sm mt-1">Select a scenario from the sidebar to view its test cases.</p>
      </div>
    );
  }

  // -----------------------------
  // HELPER FOR PRIORITY COLORS
  // -----------------------------
  const getPriorityColor = (priority) => {
    switch (priority?.toUpperCase()) {
      case "HIGH": return "bg-red-50 text-red-700 border-red-200";
      case "MEDIUM": return "bg-amber-50 text-amber-700 border-amber-200";
      case "LOW": return "bg-green-50 text-green-700 border-green-200";
      default: return "bg-gray-100 text-gray-600 border-gray-200";
    }
  };

  return (
    <div className="h-full flex flex-col">
      
      {/* ----------------------------- */}
      {/* SCENARIO HEADER */}
      {/* ----------------------------- */}
      <div className="px-8 py-6 border-b border-gray-100 bg-white shrink-0">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide">
                Scenario
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {selectedScenario.title}
            </h2>
            <p className="text-sm text-gray-500 mt-2 flex items-center gap-2">
              <ListTodo size={14} />
              {selectedScenario.cases?.length || 0} Test Cases Maped
            </p>
          </div>

          {canCreateTest && (
            <Button variant="primary" size="small" onClick={() => onAddCase(selectedScenario)}>
              <Plus size={16} /> Add Test Case
            </Button>
          )}
        </div>
      </div>

      {/* ----------------------------- */}
      {/* SPLIT CONTENT AREA */}
      {/* ----------------------------- */}
      <div className="flex flex-1 overflow-hidden bg-gray-50/30">
        
        {/* LEFT COLUMN: TEST CASES LIST */}
        <div className="w-1/3 min-w-[300px] border-r border-gray-100 overflow-y-auto bg-white p-4">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-1">
            Test Cases
          </h3>

          {!selectedScenario.cases || selectedScenario.cases.length === 0 ? (
            <div className="text-center p-6 border border-dashed border-gray-200 rounded-xl bg-gray-50">
              <p className="text-sm text-gray-500 mb-3">No test cases created yet.</p>
              {canCreateTest && (
                <Button variant="link" size="small" onClick={() => onAddCase(selectedScenario)}>
                  + Create the first case
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {selectedScenario.cases.map((testCase) => {
                const isSelected = selectedCase?.id === testCase.id;
                
                return (
                  <div
                    key={testCase.id}
                    onClick={() => onSelectCase(testCase)}
                    className={`group relative p-4 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-50/50 border-blue-300 shadow-sm ring-1 ring-blue-300"
                        : "bg-white border-gray-200 hover:border-blue-200 hover:shadow-sm"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-3">
                      <h4 className={`text-sm font-semibold leading-snug ${isSelected ? 'text-blue-900' : 'text-gray-800'}`}>
                        {testCase.title}
                      </h4>
                      
                      {/* ⭐ ACTION BUTTONS ADDED HERE ⭐ */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {canCreateTest && (
+                        <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevents row click
                            if (onEditCase) onEditCase(testCase);
                          }}
                          className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          title="Edit Case"
                        >
                          <Edit size={14} />
                        </button>
                       {/* Delete Case Button */}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation(); // Prevents row click
                            console.log("🗑️ Clicked delete on:", testCase.title); // <-- Trace log
                            
                            if (onDeleteCase) {
                              onDeleteCase(testCase);
                            } else {
                              console.error("onDeleteCase prop is missing!");
                            }
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded relative z-10"
                          title="Delete Case"
                        >
                          <Trash2 size={14} />
                        </button>
                        </>
                        )}
                      </div>
                      {/* ⭐ END ACTION BUTTONS ⭐ */}

                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getPriorityColor(testCase.priority)}`}>
                          {testCase.priority || "Medium"}
                        </span>
                        <span className="text-xs text-gray-500 font-medium">
                          {testCase.steps?.length || 0} Steps
                        </span>
                      </div>
                      
                      {/* Only show arrow if selected, to guide the eye to the right panel */}
                      {isSelected && <ArrowRight size={14} className="text-blue-500" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: STEP DETAILS */}
        <div className="flex-1 overflow-y-auto p-8">
          {!selectedCase ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <ListChecks className="w-12 h-12 mb-3 text-gray-300" />
              <p className="text-sm">Select a test case to view its execution steps.</p>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              
              {/* Selected Case Header */}
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{selectedCase.title}</h3>
                  <p className="text-sm text-gray-500">Execution Steps</p>
                </div>
                {canCreateTest && (
                  
                <Button variant="secondary" size="small" onClick={() => onAddSteps(selectedCase)}>
                  <Plus size={14} /> Add Step
                </Button>
                )}
              </div>

              {/* Steps List */}
              <div className="space-y-4">
                {!selectedCase.steps || selectedCase.steps.length === 0 ? (
                  <div className="text-center p-10 border border-dashed border-gray-200 rounded-xl bg-white">
                    <p className="text-sm text-gray-500 mb-3">No execution steps added yet.</p>
                    <Button variant="link" size="small" onClick={() => onAddSteps(selectedCase)}>
                      + Add the first step
                    </Button>
                  </div>
                ) : (
                  selectedCase.steps.map((step, index) => (
                    <div
                      key={step.id}
                      className="flex gap-4 p-5 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                      {/* Step Number Indicator */}
                      <div className="absolute top-0 left-0 bottom-0 w-1 bg-blue-500"></div>
                      
                      <div className="flex-shrink-0 mt-0.5">
                        <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>
                      
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Action Area */}
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Action
                          </span>
                          <div className="text-sm text-gray-800 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                            {step.action}
                          </div>
                        </div>

                        {/* Expected Result Area */}
                        <div>
                          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">
                            Expected Result
                          </span>
                          <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100 whitespace-pre-wrap">
                            {step.expectedResult}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}