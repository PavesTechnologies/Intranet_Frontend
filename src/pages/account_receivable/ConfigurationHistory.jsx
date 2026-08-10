import { useEffect, useState } from "react";
import { Eye } from "lucide-react";

import PageHeader from "../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../components/Cards/PageCard";
import Button from "../../components/Button/Button";
import GenericTable from "../../components/Table/table";
import Modal from "../../components/ui/Modal";
import { Fonts } from "../../components/Fonts/Fonts";
import { getApiErrorMessage, getBillingConfigurations } from "./services/billingConfigurationService";
import { showStatusToast } from "../../components/toastfy/toast";

const TABLE_HEADERS = ["Version", "Project", "Change Summary", "Changed By", "Change Date", "Project Source", "Actions"];
const TABLE_COLUMNS = ["version", "project", "changeSummary", "changedBy", "changeDate", "source", "actions"];

export default function ConfigurationHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailsEntry, setDetailsEntry] = useState(null);

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const configurations = await getBillingConfigurations();
        setHistory(
          configurations.map((config, index) => ({
            version: config.version || `v${config.currentStep || index + 1}`,
            projectName: config.projectName,
            configId: config.id,
            changeSummary: config.changeSummary || `${config.status} configuration`,
            changedBy: config.updatedBy || "System",
            changeDate: config.lastUpdated,
            source: config.source,
            details: config.details || [],
          }))
        );
      } catch (error) {
        showStatusToast(getApiErrorMessage(error, "Failed to load configuration history."), "error");
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, []);

  const tableRows = history.map((entry) => ({
    version: <span className="font-semibold text-slate-900">{entry.version}</span>,
    project: (
      <div className="text-left">
        <div className="font-medium text-slate-900">{entry.projectName}</div>
        <div className="text-xs text-slate-400">{entry.configId}</div>
      </div>
    ),
    changeSummary: <span className="text-left">{entry.changeSummary}</span>,
    changedBy: entry.changedBy,
    changeDate: entry.changeDate,
    source: (
      <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
        {entry.source}
      </span>
    ),
    actions: (
      <Button variant="ghost" size="icon" title="View Details" onClick={() => setDetailsEntry(entry)}>
        <Eye className="h-4 w-4 text-gray-600" />
      </Button>
    ),
  }));

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Configuration History"
        subtitle="Audit trail of every change made to project billing setups, across enterprise and standalone projects."
      />

      <PageCard>
        <PageCardContent className="p-6">
          {!loading && history.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No configuration history yet.</div>
          ) : (
            <div className="w-full overflow-x-auto">
              <GenericTable
                headers={TABLE_HEADERS}
                columns={TABLE_COLUMNS}
                rows={tableRows}
                loading={loading}
              />
            </div>
          )}
        </PageCardContent>
      </PageCard>

      <Modal
        isOpen={Boolean(detailsEntry)}
        onClose={() => setDetailsEntry(null)}
        title={detailsEntry ? `${detailsEntry.version} — ${detailsEntry.projectName}` : ""}
        width="480px"
      >
        {detailsEntry ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-xs text-slate-400">Changed By</p>
                <p className="font-medium text-slate-900">{detailsEntry.changedBy}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Change Date</p>
                <p className="font-medium text-slate-900">{detailsEntry.changeDate}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Project Source</p>
                <p className="font-medium text-slate-900">{detailsEntry.source}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Configuration</p>
                <p className="font-medium text-slate-900">{detailsEntry.configId}</p>
              </div>
            </div>

            <div>
              <h4 className={Fonts.label}>Summary</h4>
              <p className="mt-1 text-sm text-slate-600">{detailsEntry.changeSummary}</p>
            </div>

            {detailsEntry.details?.length ? (
              <div>
                <h4 className={Fonts.label}>Field Changes</h4>
                <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-200">
                  {detailsEntry.details.map((change) => (
                    <div
                      key={change.label}
                      className="flex items-center justify-between px-3 py-2 text-sm"
                    >
                      <span className="text-slate-500">{change.label}</span>
                      <span className="font-medium text-slate-900">
                        {change.from} <span className="text-slate-300">→</span> {change.to}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
