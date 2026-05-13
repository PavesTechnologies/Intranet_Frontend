"use client";

import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";

export default function FinalOfferPreview() {
  const { offerId } = useParams();
  const [pdfUrl, setPdfUrl] = useState(null);

  useEffect(() => {
    const fetchPreview = async () => {

      const res = await axios.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/${offerId}/final-preview`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          responseType: "blob",
        },
      );

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );

      setPdfUrl(url);
    };

    fetchPreview();
  }, [offerId]);

  if (!pdfUrl) return <div className="p-10">Loading preview...</div>;

  return (
    <iframe
      src={pdfUrl}
      className="w-full h-screen"
      title="Final Offer Preview"
    />
  );
}
