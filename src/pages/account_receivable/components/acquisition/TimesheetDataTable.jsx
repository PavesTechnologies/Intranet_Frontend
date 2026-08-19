import { useState, useMemo } from "react";
import { Search, ArrowUpDown, Info, CheckCircle2, Clock, FileSpreadsheet } from "lucide-react";
import StatusBadge from "../../../../components/status/statusbadge";
import Loader from "../../../../components/ui/Loader";

export default function TimesheetDataTable({
  records = [],
  currency = "INR",
  loading = false,
  billingType = "TIME_MATERIAL",
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("workDate");
  const [sortAsc, setSortAsc] = useState(true);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = records.filter((r) => {
      if (!searchTerm) return true;
      const q = searchTerm.toLowerCase();
      return (
        (r.employee && r.employee.toLowerCase().includes(q)) ||
        (r.role && r.role.toLowerCase().includes(q)) ||
        (r.workDate && r.workDate.toLowerCase().includes(q))
      );
    });

    result.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === "string") valA = valA.toLowerCase();
      if (typeof valB === "string") valB = valB.toLowerCase();

      if (valA < valB) return sortAsc ? -1 : 1;
      if (valA > valB) return sortAsc ? 1 : -1;
      return 0;
    });

    return result;
  }, [records, searchTerm, sortField, sortAsc]);

  const totalHours = useMemo(() => {
    return records.reduce((acc, r) => acc + (Number(r.hours) || 0), 0);
  }, [records]);

  if (loading) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-3 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <Loader />
        <p className="text-xs font-medium text-slate-500">Fetching source timesheets from TMS integration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-slate-900">
            Source Timesheets
          </h3>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee / role..."
              className="w-full rounded-lg border border-slate-200 bg-white py-1 pl-8 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100"
            />
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1 font-mono text-xs font-semibold text-slate-600">
            {records.length} records ({totalHours} hrs)
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="max-h-[28rem] w-full overflow-x-auto overflow-y-auto rounded-xl border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50">
            <tr className="text-slate-600">
              <th
                onClick={() => handleSort("employee")}
                className="cursor-pointer px-4 py-3 text-left font-semibold transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  Employee <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("workDate")}
                className="cursor-pointer px-4 py-3 text-left font-semibold transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center gap-1">
                  Work Date <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
              <th
                onClick={() => handleSort("hours")}
                className="cursor-pointer px-4 py-3 text-center font-semibold transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center justify-center gap-1">
                  Hours <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-right font-semibold">Hourly Rate</th>
              <th
                onClick={() => handleSort("amount")}
                className="cursor-pointer px-4 py-3 text-right font-semibold transition-colors hover:bg-slate-100"
              >
                <div className="flex items-center justify-end gap-1">
                  Commercial Amount <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-center font-semibold">Approval Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((rec, idx) => (
                <tr key={rec.id || idx} className="transition-colors hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-semibold text-slate-900">{rec.employee || "Employee"}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-600">{rec.workDate}</td>
                  <td className="px-4 py-2.5 text-slate-500">{rec.role || "Software Engineer"}</td>
                  <td className="px-4 py-2.5 text-center font-semibold text-slate-900">{rec.hours} hrs</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-slate-700">
                    {currency} {Number(rec.rate || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold text-indigo-900">
                    {currency} {Number(rec.amount || rec.hours * rec.rate || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge label={rec.approvalStatus || "Approved"} size="sm" />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-xs text-slate-500">
                  No source timesheet records match the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
        <Info className="h-3 w-3 flex-shrink-0" />
        <span>
          TMS timesheets are automatically merged with commercial billing configuration rates during snapshot acquisition.
        </span>
      </div>
    </div>
  );
}
