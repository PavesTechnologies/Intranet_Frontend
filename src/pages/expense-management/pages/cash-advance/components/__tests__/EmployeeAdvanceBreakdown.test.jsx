import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmployeeAdvanceBreakdown, {
  employeeBreakdown,
} from "@/pages/expense-management/pages/cash-advance/components/EmployeeAdvanceBreakdown";

const fig = (owed, consumed, outstanding, extra = {}) => ({
  requested: owed, approved: owed, disbursed: owed, carriedIn: 0, owed, consumed,
  remaining: owed - consumed, carriedForward: 0, held: 0, moved: 0,
  salaryDeducted: 0, otherRepaid: 0, outstanding, owedToEmployee: 0, ...extra,
});

const advances = [
  { id: "a1", employeeId: "E1", employeeName: "Ravi", f: fig(10000, 1000, 9000) },
  { id: "a2", employeeId: "E2", employeeName: "Anita", f: fig(5000, 5000, 0) },
  { id: "a3", employeeId: "e1", employeeName: "Ravi", f: fig(8000, 0, 8000, { salaryDeducted: 0 }) },
];
const opts = { figuresOf: (a) => a.f, nameOf: (a) => a.employeeName };

describe("employeeBreakdown", () => {
  it("groups advances per employee (id match ignores case) and sums their figures", () => {
    const rows = employeeBreakdown(advances, opts);
    expect(rows).toHaveLength(2);
    const ravi = rows.find((r) => r.name === "Ravi");
    expect(ravi.totals.count).toBe(2);
    expect(ravi.totals.owed).toBe(18000);
    expect(ravi.totals.consumed).toBe(1000);
    expect(ravi.totals.outstanding).toBe(17000);
  });

  it("puts the employee with the most outstanding first", () => {
    expect(employeeBreakdown(advances, opts).map((r) => r.name)).toEqual(["Ravi", "Anita"]);
  });
});

describe("EmployeeAdvanceBreakdown", () => {
  it("selects an employee on row click and clears on a second click", () => {
    const rows = employeeBreakdown(advances, opts);
    const onSelect = vi.fn();
    const { rerender } = render(<EmployeeAdvanceBreakdown rows={rows} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Ravi"));
    expect(onSelect).toHaveBeenLastCalledWith("e1");

    rerender(<EmployeeAdvanceBreakdown rows={rows} selectedKey="e1" onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Ravi"));
    expect(onSelect).toHaveBeenLastCalledWith("");
  });
});
