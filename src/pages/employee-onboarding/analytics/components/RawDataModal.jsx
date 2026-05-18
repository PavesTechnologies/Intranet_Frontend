import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import Modal from "../../../../components/ui/Modal";

export default function RawDataModal({ title, data, onClose }) {
  if (!data) return null;

  const keys = Object.keys(data[0] || {});
  const headers = keys.map((key) =>
    key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase()),
  );
  const rows = (data || []).map((item) =>
    keys.reduce((accumulator, key) => {
      accumulator[key] = item[key] ?? "-";
      return accumulator;
    }, {}),
  );

  return (
    <Modal
      isOpen={Boolean(data)}
      onClose={onClose}
      title={`${title} - Raw Data`}
      width="min(900px, calc(100vw - 2rem))"
    >
      <div className="max-h-[70vh] overflow-y-auto">
        <GenericTable headers={headers} columns={keys} rows={rows} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={onClose} variant="outline" className="border-slate-200">
          Close
        </Button>
      </div>
    </Modal>
  );
}
