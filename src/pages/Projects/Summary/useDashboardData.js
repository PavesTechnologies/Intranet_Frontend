// Summary/useDashboardData.js
import { useEffect, useState, useRef } from "react";
import axios from "axios";
import { getCache, setCache, getPending, setPending } from "./apiCache";

const DEFAULT_TTL = 30_000; // 30 seconds cache

export default function useDashboardData(projectId) {
  const [data, setData] = useState({
    epics: null,
    stories: null,
    tasks: null,
    bugs: null,
    statuses: null,
    users: null,
    stage: null,
  });

  const [loading, setLoading] = useState({
    epics: true,
    stories: true,
    tasks: true,
    bugs: true,
    statuses: true,
    users: true,
    stage: true,
  });

  const controllersRef = useRef({});

  useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const base = window.__APP_CONFIG__.PMS_BASE_URL || "";

    if (!projectId || !token) return;

    /**
     * Fetch Helper with:
     * - Cache
     * - Pending dedupe
     * - Abort support
     * - Silent cancellation
     */
    const fetchWithCache = (
      key,
      url,
      transformStage = false,
      ttl = DEFAULT_TTL,
    ) => {
      const cacheKey = `${key}:${url}`;

      /** ---------- 1) Cache hit ---------- */
      const cached = getCache(cacheKey);
      if (cached) {
        setData((prev) => ({ ...prev, [key]: cached }));
        setLoading((prev) => ({ ...prev, [key]: false }));
        return Promise.resolve(cached);
      }

      /** ---------- 2) Pending Promise dedupe ---------- */
      const pending = getPending(cacheKey);
      if (pending) {
        return pending
          .then((res) => {
            setData((prev) => ({ ...prev, [key]: res }));
            setLoading((prev) => ({ ...prev, [key]: false }));
            return res;
          })
          .catch((err) => {
            /** ignore canceled — no console noise */
            if (axios.isCancel(err) || err?.code === "ERR_CANCELED") return;
            console.error("fetch error", key, err?.message);
          });
      }

      /** ---------- 3) Fresh Request ---------- */
      const controller = new AbortController();
      controllersRef.current[key] = controller;

      const promise = axios
        .get(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        })
        .then((res) => {
          const payload = transformStage
            ? res.data?.currentStage || res.data || "INITIATION"
            : res.data || [];

          setCache(cacheKey, payload, ttl);
          setData((prev) => ({ ...prev, [key]: payload }));
          setLoading((prev) => ({ ...prev, [key]: false }));

          return payload;
        })
        .catch((err) => {
          if (axios.isCancel(err) || err?.code === "ERR_CANCELED") {
            /** silently ignore aborts */
            return;
          }

          console.error("fetch error", key, err?.message);

          setData((prev) => ({ ...prev, [key]: [] }));
          setLoading((prev) => ({ ...prev, [key]: false }));

          return [];
        });

      setPending(cacheKey, promise);
      return promise;
    };

    /** ---------- Fire parallel requests ---------- */
    fetchWithCache("stage", `${base}/api/projects/${projectId}`, true);
    fetchWithCache("epics", `${base}/api/projects/${projectId}/epics`);
    fetchWithCache("stories", `${base}/api/projects/${projectId}/stories`);
    fetchWithCache("tasks", `${base}/api/projects/${projectId}/tasks`);
    fetchWithCache(
      "bugs",
      `${base}/api/testing/bugs/projects/${projectId}/summaries`,
    );
    fetchWithCache("statuses", `${base}/api/projects/${projectId}/statuses`);
    fetchWithCache(
      "users",
      `${base}/api/projects/${projectId}/members-with-owner`,
    );

    /** ---------- Cleanup ---------- */
    return () => {
      Object.values(controllersRef.current).forEach((ctrl) => {
        try {
          ctrl.abort();
        } catch {}
      });
      controllersRef.current = {};
    };
  }, [projectId]);

  return { data, loading };
}
