import { useEffect, useState } from "react";
import { vendorService } from "../services/vendorService";

/**
 * Searches vendors by name and lets the caller pick one. There's no dedicated "find vendor"
 * endpoint, so this reuses GET /apm/vendor's existing `search` query param. Shared by the OCR
 * review correction form and the Payment creation form — both need to resolve a vendor_id from
 * a name, since neither the review-queue row nor InvoiceDetailsResponse carries one directly.
 */
export default function VendorPicker({ vendorId, vendorLabel, onSelect, initialQuery = "" }) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return undefined;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const data = await vendorService.getVendors({ search: query.trim(), limit: 8 });
        setResults(Array.isArray(data) ? data : []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  return (
    <div className="space-y-1">
      <label className="block text-sm font-medium text-gray-700">
        Vendor<span className="ml-1 text-red-500">*</span>
      </label>
      {vendorId ? (
        <div className="flex items-center justify-between rounded-lg border border-gray-300 px-3 py-2 text-sm">
          <span>{vendorLabel || `Vendor #${vendorId}`}</span>
          <button
            type="button"
            className="text-xs font-medium text-[#0A0082] hover:underline"
            onClick={() => onSelect(null, "")}
          >
            Change
          </button>
        </div>
      ) : (
        <>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search vendor by name..."
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm outline-none transition focus:border-[#0A0082] focus:ring-2 focus:ring-[#0A0082]/20"
          />
          {searching && <p className="text-xs text-gray-400">Searching…</p>}
          {results.length > 0 && (
            <ul className="max-h-40 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200">
              {results.map((v) => (
                <li key={v.vendor_id}>
                  <button
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                    onClick={() => {
                      onSelect(v.vendor_id, v.vendor_name);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    {v.vendor_name} <span className="text-xs text-gray-400">#{v.vendor_id}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
