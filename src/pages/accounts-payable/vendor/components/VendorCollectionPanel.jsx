import { RefreshCw } from "lucide-react";

import Button from "../../../../components/Button/Button";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * Rows of shimmer placeholders, shown while a vendor collection is loading. Preferred over a
 * spinner here because the tab already knows it is about to render a table.
 */
const TableSkeleton = ({ rows = 4 }) => (
  <div className="space-y-2" role="status" aria-label="Loading">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-10 animate-pulse rounded-lg bg-gray-100" />
    ))}
  </div>
);

/**
 * The shared loading / error / empty shell for the vendor-scoped collection tabs (PO, GRN, NDA,
 * Documents).
 *
 * An EMPTY collection is a normal result — the backend returns 200 with `count: 0` and reserves
 * 404 for the vendor itself — so it renders as "No ... found", never as an error. Only a real
 * request failure gets the error state, and that one offers a retry.
 *
 * @param {{ title: string, count?: number, isLoading?: boolean, isError?: boolean,
 *   error?: unknown, onRetry?: () => void, isEmpty?: boolean, emptyMessage: string,
 *   errorMessage?: string, actions?: React.ReactNode, children: React.ReactNode }} props
 */
export default function VendorCollectionPanel({
  title,
  count,
  isLoading = false,
  isError = false,
  error,
  onRetry,
  isEmpty = false,
  emptyMessage,
  errorMessage = "Unable to load this list right now.",
  actions,
  children,
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-gray-900">
          {title}
          {/* The count comes from the response's own `count` field, not from the rendered rows. */}
          {!isLoading && !isError && typeof count === "number" ? (
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {count}
            </span>
          ) : null}
        </h2>

        {actions ? <div className="flex gap-2">{actions}</div> : null}
      </div>

      {isError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-6 text-center">
          <p className="text-sm text-red-700">{getApiErrorMessage(error, errorMessage)}</p>

          {onRetry ? (
            <Button variant="outline" size="small" className="mt-3" onClick={onRetry}>
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </Button>
          ) : null}
        </div>
      ) : isLoading ? (
        <TableSkeleton />
      ) : isEmpty ? (
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        children
      )}
    </div>
  );
}
