import { useEffect, useState } from "react";
import { getUnknownSkillJds } from "../services/skillOntologyService";

// For the unknown skills about to be deleted: which active JDs list each one
// as a CORE skill. Deleting such a skill also resolves it, so the JD becomes
// VERIFIED without that core skill - a hard requirement silently removed.
// `enabled` lets a caller run the lookup only while its delete dialog is open.
// `activeOnly` (default) limits the core check to active JD versions; a global
// dismiss checks every JD that has the skill. `jds` is every JD found, each
// with its tier there (for the dismiss dialog's list).
export default function useCoreSkillUsage(unknownSkillIds, enabled = true, { activeOnly = true } = {}) {
  const [state, setState] = useState({ loading: false, error: false, usages: [], jds: [] });
  const key = (unknownSkillIds || []).join(",");

  useEffect(() => {
    if (!enabled || !key) {
      setState({ loading: false, error: false, usages: [], jds: [] });
      return undefined;
    }
    let cancelled = false;
    setState({ loading: true, error: false, usages: [], jds: [] });

    Promise.all(
      key.split(",").map(async (id) => {
        const jds = await getUnknownSkillJds(id);
        return {
          unknownSkillId: id,
          jds,
          coreJds: jds.filter((jd) => (!activeOnly || jd.is_active_version)
            && String(jd.tier || jd.importance || "").toUpperCase() === "CORE"),
        };
      }),
    )
      .then((results) => {
        if (!cancelled) {
          setState({
            loading: false, error: false, usages: results.filter((r) => r.coreJds.length > 0),
            jds: results.flatMap((r) => r.jds.map((jd) => ({ ...jd, unknownSkillId: r.unknownSkillId }))),
          });
        }
      })
      .catch(() => {
        if (!cancelled) setState({ loading: false, error: true, usages: [], jds: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [key, enabled, activeOnly]);

  return state;
}
