import React, { useMemo, useState } from "react";
import PageHeader from "../../../../components/ui/PageHeader";
import StatCard from "../../../../components/Cards/StatCard";
import Pagination from "../../../../components/Pagination/pagination";
import { useExceptions } from "../hooks/useExceptions";
import ExceptionFilterPanel from "../components/ExceptionFilterPanel";
import ExceptionTable from "../components/ExceptionTable";
import ExceptionResolutionModal from "../components/ExceptionResolutionModal";
import { daysBetween } from "../../utils/formatters";

const PAGE_SIZE = 8;

export default function ExceptionCenterPage() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("All");
  const [page, setPage] = useState(1);
  const [selectedException, setSelectedException] = useState(null);

  const { data: exceptions = [], isLoading, isError, error } = useExceptions({ search, type });

  const stats = useMemo(() => {
    if (exceptions.length === 0) {
      return { total: 0, oldestDays: 0, topType: "—" };
    }
    const oldestDays = Math.max(...exceptions.map((e) => daysBetween(e.submittedDate)));
    const typeCounts = exceptions.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] || 0) + 1;
      return acc;
    }, {});
    const topType = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
    return { total: exceptions.length, oldestDays, topType };
  }, [exceptions]);

  const totalPages = Math.max(1, Math.ceil(exceptions.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedExceptions = exceptions.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(1);
  };

  const handleTypeChange = (value) => {
    setType(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exception Center"
        subtitle="Invoices requiring manual resolution before they can proceed"
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard title="Total Open Exceptions" value={stats.total} textColor="text-amber-600" />
        <StatCard
          title="Oldest Exception Age"
          value={`${stats.oldestDays} ${stats.oldestDays === 1 ? "day" : "days"}`}
          textColor="text-rose-600"
        />
        <StatCard title="Most Common Type" value={stats.topType} textColor="text-indigo-700" />
      </div>

      <ExceptionFilterPanel
        search={search}
        onSearchChange={handleSearchChange}
        type={type}
        onTypeChange={handleTypeChange}
      />

      {isError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Failed to load exceptions{error?.message ? `: ${error.message}` : "."}
        </div>
      )}

      <ExceptionTable
        exceptions={pagedExceptions}
        loading={isLoading}
        onResolve={setSelectedException}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPrevious={() => setPage((p) => Math.max(1, p - 1))}
        onNext={() => setPage((p) => Math.min(totalPages, p + 1))}
      />

      <ExceptionResolutionModal
        isOpen={Boolean(selectedException)}
        onClose={() => setSelectedException(null)}
        exception={selectedException}
      />
    </div>
  );
}
