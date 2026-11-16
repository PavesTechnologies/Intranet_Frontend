import { useEffect, useState } from "react";
import { fetchSignatureAssetBlob } from "../services/companyProfileService";

/**
 * useSignatureImage Hook
 *
 * Fetches protected signature asset images using the application's authenticated API client.
 * Converts the returned binary Blob into a temporary Blob URL for rendering in <img> tags.
 * Automatically revokes object URLs on unmount or when signatureRef changes to prevent memory leaks.
 *
 * @param {string|null} signatureRef - The managed signature asset reference or URL
 * @returns {{ imageUrl: string|null, loading: boolean, error: Error|null }}
 */
export function useSignatureImage(signatureRef) {
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(signatureRef));
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!signatureRef || typeof signatureRef !== "string" || !signatureRef.trim()) {
      setImageUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    const trimmed = signatureRef.trim();

    // If already a local blob URL or inline data URL, use directly without network fetch
    if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
      setImageUrl(trimmed);
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;
    let createdBlobUrl = null;

    setLoading(true);
    setError(null);

    fetchSignatureAssetBlob(trimmed)
      .then((blob) => {
        if (!isMounted) return;
        if (blob instanceof Blob && blob.size > 0) {
          createdBlobUrl = URL.createObjectURL(blob);
          setImageUrl(createdBlobUrl);
        } else {
          // If response wasn't a valid blob, fall back gracefully if it was a direct URL
          if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            setImageUrl(trimmed);
          } else {
            setImageUrl(null);
          }
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err);
        // Best-effort fallback if ref was an absolute URL
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          setImageUrl(trimmed);
        } else {
          setImageUrl(null);
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [signatureRef]);

  return { imageUrl, loading, error };
}

export default useSignatureImage;
