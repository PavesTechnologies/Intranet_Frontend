import { CheckCircle2, FileCheck2, Info } from "lucide-react";
import Button from "../../../../components/Button/Button";
import StatusPill from "../../vendor-intake/components/PreScreenStatusBadge";
import { formatDate } from "../../utils/formatters";
import {
  NDA_STATUS_LABEL,
  NDA_STATUS_TONE,
  isReusableNda,
} from "../constants/vendorOnboarding";

const Meta = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-[10px] uppercase tracking-wide text-gray-500">{label}</dt>
    <dd className="mt-0.5 break-words text-xs font-medium text-gray-900">{value || "—"}</dd>
  </div>
);

/**
 * Agreements already on file for this vendor that a new engagement can run on, offered before
 * a fresh one is generated.
 *
 * Only COMPLETED, in-date NDAs are listed (see isReusableNda) — an expired, rejected, sent or
 * merely signed-but-unreviewed agreement is not something a new PR may rely on, so none of
 * them appear here and the Generate flow stays the only way forward in those cases.
 *
 * Reuse is requested through the existing POST /apm/nda/generate: when a valid agreement
 * covers the vendor for this department and category, the backend returns that NDA with
 * `reused: true` rather than creating a second record. Nothing here writes to an existing
 * NDA, so reusing one never modifies it.
 *
 * @param {{ ndas?:object[], currentNdaId?:number|string|null, onReuse:()=>void,
 *   onGenerateNew?:()=>void, isReusing?:boolean, canGenerate?:boolean }} props
 */
export default function ExistingNdaReusePanel({
  ndas = [],
  currentNdaId = null,
  onReuse,
  onGenerateNew,
  isReusing = false,
  canGenerate = true,
}) {
  const reusable = (Array.isArray(ndas) ? ndas : []).filter(
    (nda) => isReusableNda(nda) && String(nda.nda_id) !== String(currentNdaId ?? ""),
  );

  if (reusable.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <div className="flex items-start gap-2">
        <FileCheck2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-emerald-800">
              Existing NDA available for this vendor
            </p>
            <StatusPill
              label={`${reusable.length} valid`}
              tone="success"
            />
          </div>
          <p className="mt-1 text-xs text-emerald-700">
            This vendor already has a completed, in-date agreement. Reuse it instead of putting
            the vendor through a second signature round.
          </p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {reusable.map((nda) => (
          <li
            key={nda.nda_id}
            className="rounded-lg border border-emerald-200 bg-white px-3 py-2"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-gray-900">NDA #{nda.nda_id}</span>
              <StatusPill
                label={NDA_STATUS_LABEL[nda.status_code] || nda.status_code}
                tone={NDA_STATUS_TONE[nda.status_code] || "neutral"}
              />
            </div>

            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
              {/* Only what the lookup actually returns — a field the API omits is simply
                  not shown rather than filled in. */}
              {nda.pr_id ? <Meta label="Originating PR" value={`#${nda.pr_id}`} /> : null}
              <Meta label="Version" value={nda.template_version} />
              <Meta
                label="Valid From"
                value={nda.valid_from ? formatDate(nda.valid_from) : null}
              />
              <Meta
                label="Valid Until"
                value={nda.valid_until ? formatDate(nda.valid_until) : null}
              />
            </dl>
          </li>
        ))}
      </ul>

      {reusable.length > 1 && (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] text-emerald-700">
          <Info className="mt-0.5 h-3 w-3 shrink-0" />
          <span>
            More than one valid agreement is on file. The server selects the one that covers
            this department and purchase category when the NDA is reused.
          </span>
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2 border-t border-emerald-200 pt-3 sm:flex-row sm:justify-end">
        {canGenerate && onGenerateNew && (
          <Button variant="outline" size="small" onClick={onGenerateNew} disabled={isReusing}>
            Generate New NDA Instead
          </Button>
        )}

        <Button
          variant="success"
          size="small"
          onClick={onReuse}
          loading={isReusing}
          loadingText="Applying..."
        >
          <CheckCircle2 className="h-3.5 w-3.5" /> Use Existing NDA
        </Button>
      </div>
    </div>
  );
}
