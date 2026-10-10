export default function AcquisitionHeader({ lastSync }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {lastSync && <span className="text-xs text-slate-500">Last synced {lastSync}</span>}
    </div>
  );
}
