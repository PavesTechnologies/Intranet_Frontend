import { useCallback, useEffect, useRef, useState } from "react";
import { getApiErrorMessage } from "../../services/billingConfigurationService";
import { getProjectMilestones, toPmsProjectId } from "../../services/projectMilestoneService";

const MISSING_PMS_PROJECT_MESSAGE =
  "This project is not linked to a PMS project, so its milestones cannot be loaded.";

// Loads the PMS milestones of one PMS project from the backend.
//  - refetches when `pmsProjectId` changes and on reload() (the "Sync" button / retry);
//  - a response that arrives after the project changed, or after a newer
//    request started, is discarded (and the stale request is aborted);
//  - status is one of "idle" (no PMS project to load), "loading", "success",
//    "error". A failure keeps the error message and never substitutes
//    stored or sample data; a successful empty list is still "success".
export function useProjectMilestones(pmsProjectIdInput, { enabled = true } = {}) {
  const pmsProjectId = toPmsProjectId(pmsProjectIdInput);
  const [state, setState] = useState({ status: "idle", milestones: [], error: "", loadedFor: null });
  const latestRequest = useRef(0);
  const controllerRef = useRef(null);

  const load = useCallback(() => {
    latestRequest.current += 1;
    const requestId = latestRequest.current;
    controllerRef.current?.abort();
    controllerRef.current = null;

    if (!enabled) {
      setState({ status: "idle", milestones: [], error: "", loadedFor: null });
      return;
    }
    if (pmsProjectId === null) {
      setState({ status: "error", milestones: [], error: MISSING_PMS_PROJECT_MESSAGE, loadedFor: null });
      return;
    }

    const controller = typeof AbortController === "function" ? new AbortController() : null;
    controllerRef.current = controller;
    // Drop the previous project's rows immediately so they can never be shown
    // (or selected) under the new project while its request is in flight.
    setState({ status: "loading", milestones: [], error: "", loadedFor: pmsProjectId });

    getProjectMilestones(pmsProjectId, { signal: controller?.signal })
      .then((milestones) => {
        if (requestId !== latestRequest.current) return;
        setState({ status: "success", milestones, error: "", loadedFor: pmsProjectId });
      })
      .catch((error) => {
        if (requestId !== latestRequest.current) return;
        setState({
          status: "error",
          milestones: [],
          error: getApiErrorMessage(error, "Unable to load milestones from PMS."),
          loadedFor: pmsProjectId,
        });
      });
  }, [enabled, pmsProjectId]);

  useEffect(() => {
    load();
    return () => {
      latestRequest.current += 1; // anything still in flight is stale after unmount / project change
      controllerRef.current?.abort();
    };
  }, [load]);

  return {
    pmsProjectId,
    status: state.status,
    milestones: state.milestones,
    error: state.error,
    loadedFor: state.loadedFor,
    isLoading: state.status === "loading",
    reload: load,
  };
}
