import React, { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarClock } from "lucide-react";
import FilterListbox from "@/components/filter/FilterListbox";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorState from "@/pages/airs/skill-ontology/components/ErrorState";
import { getAllCampaigns } from "../campaigns/services/campaignservice";
import InterviewCalendarTab from "../campaigns/components/InterviewCalendarTab";

// Same "just get me every campaign I'm allowed to see" call
// CampaignPickerModal.jsx uses for its own campaign picker — the backend
// already scopes the result to the caller's role, so this needs no
// isHRAdmin/isRecruiter branching of its own (unlike Campaigns.jsx's list
// page, which branches for its own pagination/search UI, not relevant here).
async function loadCampaignOptions() {
  const res = await getAllCampaigns({ show_closed: true });
  const list = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
  return list.map((c) => ({ value: c.id, label: c.name }));
}

// Was a tab inside CampaignDetails.jsx, scoped to whichever campaign's
// detail page happened to be open. GET /campaigns/{campaign_id}/interviews
// is still per-campaign (no "all campaigns" endpoint), so this standalone
// page adds its own campaign selector — ?campaign= in the URL, matching
// CandidateRankingPage.jsx's pattern, so the page is deep-linkable straight
// into one campaign's calendar without picking from the dropdown first.
export default function InterviewCalendarPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const campaignId = searchParams.get("campaign") || "";

  const [options, setOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [optionsError, setOptionsError] = useState(null);

  const fetchOptions = useCallback(() => {
    setLoadingOptions(true);
    setOptionsError(null);
    loadCampaignOptions()
      .then(setOptions)
      .catch(setOptionsError)
      .finally(() => setLoadingOptions(false));
  }, []);

  useEffect(() => { fetchOptions(); }, [fetchOptions]);

  const handleSelectCampaign = (nextId) => {
    setSearchParams(nextId ? { campaign: nextId } : {}, { replace: true });
  };

  return (
    <div className="p-8 bg-[#F8FAFC] min-h-screen text-slate-900 font-sans">
      <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-slate-500" />
            Interview Calendar
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Every scheduled interview for a campaign, in one calendar.
          </p>
        </div>

        <div className="w-64 shrink-0">
          {loadingOptions ? (
            <LoadingSpinner size="sm" text="Loading campaigns..." />
          ) : optionsError ? (
            // The full ErrorState card is built for a full-width empty
            // page, not this narrow header slot — a compact inline message
            // fits better here, right next to a title it'd otherwise dwarf.
            <div className="text-[11.5px] text-rose-600 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
              Couldn't load campaigns.{" "}
              <button type="button" onClick={fetchOptions} className="font-semibold underline hover:no-underline">
                Retry
              </button>
            </div>
          ) : (
            <FilterListbox
              options={options}
              value={campaignId}
              onChange={handleSelectCampaign}
              placeholder="Select a campaign"
            />
          )}
        </div>
      </div>

      {campaignId ? (
        <InterviewCalendarTab campaignId={campaignId} />
      ) : (
        !loadingOptions &&
        !optionsError && (
          <ErrorState
            title="No campaign selected"
            message="Choose a campaign above to see its interview calendar."
          />
        )
      )}
    </div>
  );
}
