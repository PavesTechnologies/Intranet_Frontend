"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../../../api/axiosInstance";

export default function OfferGeneratedPreview() {
  const { offerId } = useParams();

  const [pdfUrl, setPdfUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPreview = async () => {
      try {

        const res = await api.get(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/${offerId}/generate-preview`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            responseType: "blob",
          },
        );

        const fileURL = window.URL.createObjectURL(res.data);

        setPdfUrl(fileURL);
      } catch (err) {
        console.error("Preview failed", err);

        alert("Failed to load preview");
      } finally {
        setLoading(false);
      }
    };

    if (offerId) loadPreview();
  }, [offerId]);

  if (loading) {
    return <div className="p-10">Loading Offer Preview...</div>;
  }

  return (
    <iframe src={pdfUrl} className="w-full h-screen" title="Offer Preview" />
  );
}
