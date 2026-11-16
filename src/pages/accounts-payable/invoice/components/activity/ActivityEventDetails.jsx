import { formatDateTime } from "../../../utils/formatters";

function DetailRow({ label, children }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-[11rem_1fr] sm:gap-3">
      <dt className="text-xs font-medium text-gray-500">{label}</dt>
      <dd className="min-w-0 break-words text-xs text-gray-800">{children}</dd>
    </div>
  );
}

function Value({ value }) {
  if (Array.isArray(value)) {
    return (
      <ul className="list-disc space-y-0.5 pl-4">
        {value.map((entry, index) => (
          <li key={index}>{entry}</li>
        ))}
      </ul>
    );
  }
  return value;
}

/**
 * Expanded view of one timeline item. Every row is conditional on the API having returned that
 * field — nothing is filled in or guessed.
 * @param {{item: ReturnType<import("../../utils/invoiceActivityEvents").mapActivityEvent> & {occurrences: string[]}}} props
 */
export default function ActivityEventDetails({ item }) {
  const { details } = item;
  const repeated = item.occurrences.length > 1;

  return (
    <dl className="space-y-2 rounded-lg border border-gray-100 bg-gray-50/70 p-3">
      {item.description && <DetailRow label="Description">{item.description}</DetailRow>}
      <DetailRow label="Performed by">
        {item.actor.name}
        {item.actor.isSystem && <span className="ml-1 text-gray-500">(automated)</span>}
      </DetailRow>
      <DetailRow label={repeated ? `Recorded (${item.occurrences.length} times)` : "Date and time"}>
        {repeated ? (
          <Value value={item.occurrences.map((timestamp) => formatDateTime(timestamp))} />
        ) : (
          formatDateTime(item.timestamp)
        )}
      </DetailRow>
      {details.changes.map((change) => (
        <DetailRow key={`change-${change.key}`} label={change.label}>
          <span className="text-gray-500 line-through decoration-gray-300">{change.before ?? "—"}</span>
          <span className="mx-1.5 text-gray-400" aria-label="changed to">
            →
          </span>
          <span className="font-medium">{change.after ?? "—"}</span>
        </DetailRow>
      ))}
      {details.references.map((ref) => (
        <DetailRow key={`ref-${ref.key}`} label={ref.label}>
          {ref.value}
        </DetailRow>
      ))}
      {details.metadata.map((field) => (
        <DetailRow key={`meta-${field.key}`} label={field.label}>
          <Value value={field.value} />
        </DetailRow>
      ))}
    </dl>
  );
}
