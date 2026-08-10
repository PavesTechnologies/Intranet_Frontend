import React, { useMemo, useState } from "react";
import { Search, ChevronRight, ChevronLeft } from "lucide-react";
import Button from "@/components/Button/Button";

const Pane = ({ title, items, search, onSearchChange, departmentOptions, departmentFilter, onDepartmentFilterChange, selectedIds, onToggle, onToggleAll, emptyText }) => {
  const allSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));

  return (
    <div className="flex h-96 flex-col rounded-lg border border-gray-200">
      <div className="space-y-1.5 border-b border-gray-100 p-2">
        <div className="flex items-center justify-between px-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            {title} ({items.length})
          </p>
          {items.length > 0 && (
            <label className="flex items-center gap-1 text-[11px] text-gray-500">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleAll(items, !allSelected)}
                className="h-3 w-3 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]"
              />
              Select all
            </label>
          )}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="w-full rounded-md border border-gray-200 py-1.5 pl-8 pr-2 text-xs outline-none focus:border-[#0A0082]"
          />
        </div>
        {departmentOptions.length > 0 && (
          <select
            value={departmentFilter}
            onChange={(e) => onDepartmentFilterChange(e.target.value)}
            className="w-full rounded-md border border-gray-200 py-1.5 px-2 text-xs text-gray-600 outline-none focus:border-[#0A0082]"
          >
            <option value="">All Departments</option>
            {departmentOptions.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-1.5">
        {items.length === 0 ? (
          <p className="p-3 text-center text-xs text-gray-400">{emptyText}</p>
        ) : (
          <ul className="space-y-0.5">
            {items.map((item) => (
              <li key={item.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(item.id)}
                    onChange={() => onToggle(item.id)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-[#0A0082] focus:ring-[#0A0082]"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-gray-800">{item.label}</span>
                    {item.sublabel && <span className="block truncate text-[11px] text-gray-400">{item.sublabel}</span>}
                  </span>
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

/**
 * Generic available/assigned dual-pane multi-select. Fully controlled:
 * the caller owns the two item lists and receives the ids to move.
 * Items may optionally carry a `department` field to power the filter.
 */
export default function TransferList({ available, assigned, onAssign, onUnassign, disabled = false }) {
  const [searchAvailable, setSearchAvailable] = useState("");
  const [searchAssigned, setSearchAssigned] = useState("");
  const [deptAvailable, setDeptAvailable] = useState("");
  const [deptAssigned, setDeptAssigned] = useState("");
  const [selectedAvailable, setSelectedAvailable] = useState(new Set());
  const [selectedAssigned, setSelectedAssigned] = useState(new Set());

  const departmentOptions = useMemo(() => {
    const set = new Set();
    [...available, ...assigned].forEach((i) => {
      if (i.department) set.add(i.department);
    });
    return Array.from(set).sort();
  }, [available, assigned]);

  const filteredAvailable = useMemo(() => {
    const q = searchAvailable.trim().toLowerCase();
    return available.filter((i) => (!q || i.label.toLowerCase().includes(q)) && (!deptAvailable || i.department === deptAvailable));
  }, [available, searchAvailable, deptAvailable]);

  const filteredAssigned = useMemo(() => {
    const q = searchAssigned.trim().toLowerCase();
    return assigned.filter((i) => (!q || i.label.toLowerCase().includes(q)) && (!deptAssigned || i.department === deptAssigned));
  }, [assigned, searchAssigned, deptAssigned]);

  const toggle = (setFn) => (id) =>
    setFn((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = (setFn) => (items, shouldSelect) =>
    setFn((prev) => {
      const next = new Set(prev);
      items.forEach((i) => (shouldSelect ? next.add(i.id) : next.delete(i.id)));
      return next;
    });

  const moveToAssigned = () => {
    if (selectedAvailable.size === 0) return;
    onAssign(Array.from(selectedAvailable));
    setSelectedAvailable(new Set());
  };

  const moveToAvailable = () => {
    if (selectedAssigned.size === 0) return;
    onUnassign(Array.from(selectedAssigned));
    setSelectedAssigned(new Set());
  };

  return (
    <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
      <Pane
        title="Available Employees"
        items={filteredAvailable}
        search={searchAvailable}
        onSearchChange={setSearchAvailable}
        departmentOptions={departmentOptions}
        departmentFilter={deptAvailable}
        onDepartmentFilterChange={setDeptAvailable}
        selectedIds={selectedAvailable}
        onToggle={toggle(setSelectedAvailable)}
        onToggleAll={toggleAll(setSelectedAvailable)}
        emptyText="No employees found."
      />

      <div className="flex flex-row items-center justify-center gap-2 sm:flex-col">
        <Button type="button" variant="outline" size="small" onClick={moveToAssigned} disabled={disabled || selectedAvailable.size === 0}>
          Add <ChevronRight size={14} />
        </Button>
        <Button type="button" variant="outline" size="small" onClick={moveToAvailable} disabled={disabled || selectedAssigned.size === 0}>
          <ChevronLeft size={14} /> Remove
        </Button>
      </div>

      <Pane
        title="Assigned Members"
        items={filteredAssigned}
        search={searchAssigned}
        onSearchChange={setSearchAssigned}
        departmentOptions={departmentOptions}
        departmentFilter={deptAssigned}
        onDepartmentFilterChange={setDeptAssigned}
        selectedIds={selectedAssigned}
        onToggle={toggle(setSelectedAssigned)}
        onToggleAll={toggleAll(setSelectedAssigned)}
        emptyText="No members assigned yet."
      />
    </div>
  );
}
