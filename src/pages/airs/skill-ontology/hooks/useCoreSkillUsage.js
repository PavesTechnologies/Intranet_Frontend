import { useEffect, useState } from "react";
import { getUnknownSkillJds } from "../services/skillOntologyService";

// For the unknown skills about to be deleted: which active JDs list each one
// as a CORE skill. Deleting such a skill also resolves it, so the JD becomes
// VERIFIED without that core skill - a hard requirement silently removed.
// `enabled` lets a caller run the lookup only while its delete dialog is open.
export default function useCoreSkillUsage(unknownSkillIds, enabled = true) {
  const [state, setState] = useState({ loading: false, error: false, usages: [] });
  const key = (unknownSkillIds || []).join(",");

  useEffect(() => {
    if (!enabled || !key) {
      setState({ loading: false, error: false, usages: [] });
      return undefined;
    }
    let cancelled = false;
    setState({ loading: true, error: false, usages: [] });

    Promise.all(
      key.split(",").map(async (id) => {
        const jds = await getUnknownSkillJds(id);
        return {
          unknownSkillId: id,
          coreJds: jds.filter((jd) => jd.is_active_version && String(jd.importance || "").toUpperCase() === "CORE"),
        };
      }),
    )
      .then((results) => {
        if (!cancelled) setState({ loading: false, error: false, usages: results.filter((r) => r.coreJds.length > 0) });
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: true, usages: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [key, enabled]);

  return state;
}
