import { GSTR2B_SOURCE_TYPES, importModeSpec, importSpec } from "../../constants/gstItc";
import { formatDate, formatDateTime } from "../../utils/formatters";
import { Empty } from "../../dashboard/components/insights";
import { useGstr2bImports } from "../hooks/useGstItc";
import { periodLabel } from "../utils/gstFormat";
import { ErrorBlock, LoadingBlock, SectionCard, StatusPill } from "./GstUi";

/**
 * Every GSTR-2B import of a financial year (current, replaced and failed) - GET /gstr2b/imports.
 * importMode ALL lists official and demo imports together; demo rows carry a DEMO badge.
 */
export default function Gstr2bImportHistory({ financialYear, importMode }) {
  const { data, isLoading, isError, error } = useGstr2bImports({ financialYear, importMode });

  return (
    <SectionCard title={`Import history${financialYear ? ` · FY ${financialYear}` : ""}`}>
      {isLoading ? (
        <LoadingBlock text="Loading the import history..." />
      ) : isError ? (
        <div className="p-4"><ErrorBlock error={error} fallback="Could not load the import history." /></div>
      ) : !data?.length ? (
        <Empty text="No GSTR-2B imported in this financial year yet." />
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500">
              <tr>
                {["Return period", "File", "Uploaded", "Imported", "Skipped", "Failed", "Status", "Version"].map((h) => (
                  <th key={h} scope="col" className={`px-3 py-2 ${["Imported", "Skipped", "Failed"].includes(h) ? "text-right" : ""}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((i) => (
                <tr key={i.import_id} className={i.is_current ? "" : "text-slate-500"}>
                  <td className="whitespace-nowrap px-3 py-2">
                    {periodLabel(i.return_period)}
                    <div className="text-xs text-slate-400">FY {i.financial_year}</div>
                  </td>
                  <td className="max-w-[14rem] px-3 py-2">
                    <span className="flex items-center gap-1.5">
                      {i.is_demo && <StatusPill spec={importModeSpec("DEMO")} />}
                      <span className="block truncate" title={i.file_name}>{i.file_name || "—"}</span>
                    </span>
                    <span className="text-xs text-slate-400">
                      {GSTR2B_SOURCE_TYPES[i.source_type] || i.source_format}{i.generated_on ? ` · generated ${formatDate(i.generated_on)}` : ""}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-xs">
                    {formatDateTime(i.imported_at)}
                    <div className="text-slate-400" title="Uploaded by">{i.imported_by || "—"}</div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">{i.success_records ?? 0}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{i.skipped_records ?? 0}</td>
                  <td className={`px-3 py-2 text-right tabular-nums ${i.failed_records ? "text-rose-600" : ""}`}>{i.failed_records ?? 0}</td>
                  <td className="px-3 py-2"><StatusPill spec={importSpec(i.import_status)} /></td>
                  <td className="px-3 py-2 text-xs">{i.is_current ? <span className="font-medium text-emerald-700">Current</span> : i.import_status === "FAILED" ? "Not applied" : "Replaced (history)"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
