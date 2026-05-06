"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";

export default function OfferPreview() {
  const { offerId } = useParams();
  const [previewUrl, setPreviewUrl] = useState(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await axios.get(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/${offerId}/docusign-preview`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        setPreviewUrl(res.data.preview_url);
      } catch (err) {
        console.error("Preview load failed", err);
      }
    };

    if (offerId) fetchPreview();
  }, [offerId]);

  if (!previewUrl)
    return <div className="p-10">Loading DocuSign preview...</div>;

  return (
    <div className="h-screen w-full bg-gray-100 flex flex-col">
      <div className="p-4 bg-white shadow flex justify-between">
        <h2 className="text-lg font-semibold">DocuSign Preview</h2>

        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Back
        </button>
      </div>

      <iframe
        src={previewUrl}
        title="DocuSign Preview"
        className="flex-1 w-full"
      />
    </div>
  );
}
