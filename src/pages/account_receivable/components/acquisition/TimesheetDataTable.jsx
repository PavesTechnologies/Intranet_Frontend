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
      <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center space-y-3">
        <Loader />
        <p className="text-xs font-semibold text-slate-500">Fetching source timesheets from TMS integration...</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              Acquired Source Data (Timesheets)
            </h3>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Verified billable records synchronized from Time Management System (TMS).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-48">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search employee / role..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-100"
            />
          </div>
          <div className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 font-mono">
            {records.length} records ({totalHours} hrs)
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="w-full overflow-x-auto border border-slate-200/80 rounded-xl shadow-2xs max-h-72 overflow-y-auto">
        <table className="min-w-full divide-y divide-slate-200 text-xs">
          <thead className="bg-slate-100/90 sticky top-0 z-10 backdrop-blur-xs">
            <tr className="text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <th
                onClick={() => handleSort("employee")}
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Employee <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th
                onClick={() => handleSort("workDate")}
                className="px-4 py-3 text-left cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center gap-1">
                  Work Date <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-left">Role</th>
              <th
                onClick={() => handleSort("hours")}
                className="px-4 py-3 text-center cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center justify-center gap-1">
                  Hours <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-right">Hourly Rate</th>
              <th
                onClick={() => handleSort("amount")}
                className="px-4 py-3 text-right cursor-pointer hover:bg-slate-200/60 transition-colors"
              >
                <div className="flex items-center justify-end gap-1">
                  Commercial Amount <ArrowUpDown className="h-3 w-3 text-slate-400" />
                </div>
              </th>
              <th className="px-4 py-3 text-center">Approval Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {filteredAndSorted.length > 0 ? (
              filteredAndSorted.map((rec, idx) => (
                <tr key={rec.id || idx} className="hover:bg-indigo-50/40 transition-colors">
                  <td className="px-4 py-2.5 font-bold text-slate-900">{rec.employee || "Employee"}</td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono text-[11px]">{rec.workDate}</td>
                  <td className="px-4 py-2.5 text-slate-500 font-medium text-[11px]">{rec.role || "Software Engineer"}</td>
                  <td className="px-4 py-2.5 text-center font-bold text-slate-900">{rec.hours} hrs</td>
                  <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                    {currency} {Number(rec.rate || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-right font-extrabold text-indigo-900 font-mono">
                    {currency} {Number(rec.amount || rec.hours * rec.rate || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge label={rec.approvalStatus || "Approved"} size="sm" />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs italic">
                  No source timesheet records match the criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
        <Info className="h-4 w-4 text-indigo-600 flex-shrink-0" />
        <span>
          TMS timesheets are automatically merged with commercial billing configuration rates during snapshot acquisition.
        </span>
      </div>
    </div>
  );
}
