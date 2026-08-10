import React, { useMemo } from "react";
import TransferList from "@/pages/expense-management/components/policy/common/TransferList";

export default function MemberManagement({ employees = [], memberIds = [], onChange, disabled = false }) {
  const memberIdSet = useMemo(() => new Set(memberIds), [memberIds]);

  const available = useMemo(
    () =>
      employees
        .filter((e) => !memberIdSet.has(e.employeeId))
        .map((e) => ({ id: e.employeeId, label: e.name, sublabel: e.email, department: e.department })),
    [employees, memberIdSet]
  );

  const assigned = useMemo(
    () =>
      employees
        .filter((e) => memberIdSet.has(e.employeeId))
        .map((e) => ({ id: e.employeeId, label: e.name, sublabel: e.email, department: e.department })),
    [employees, memberIdSet]
  );

  const handleAssign = (ids) => onChange([...memberIds, ...ids.filter((id) => !memberIdSet.has(id))]);
  const handleUnassign = (ids) => onChange(memberIds.filter((id) => !ids.includes(id)));

  return (
    <TransferList available={available} assigned={assigned} onAssign={handleAssign} onUnassign={handleUnassign} disabled={disabled} />
  );
}
