import { useAuth } from "../../../../contexts/AuthContext";
import { useEmployeeDirectory } from "../../../expense-management/approval-engine/hooks/useEmployeeDirectory";

/**
 * Displays who raised a PR, by actual name — never "You", and never the raw requester id
 * (e.g. "5100007"). PurchaseRequisitionDTO only carries the requester's opaque id
 * (created_by), no name, so this resolves it through the same employee directory the
 * expense-management approval engine already uses to turn an id into a name (there is no
 * AP-local user/employee directory to duplicate). For the signed-in user's own PRs, the
 * JWT's own name/email claim (see AuthContext) is a reliable, zero-extra-request fallback
 * while the directory is still loading.
 * @param {{ createdBy?: string, isRequester: boolean, className?: string }} props
 */
export default function RequesterLabel({ createdBy, isRequester, className = "" }) {
  const { user } = useAuth();
  const { data: directory } = useEmployeeDirectory();

  if (!createdBy) {
    return <span className={`text-sm text-gray-400 ${className}`}>—</span>;
  }

  const directoryName = directory?.get(createdBy)?.name;
  const selfName = isRequester ? user?.name || user?.email : null;
  // Never fall back to the raw id itself — an unresolvable id renders as a neutral label
  // instead of leaking it.
  const displayName = directoryName || selfName || "Requester";

  return (
    <span className={`text-sm font-medium text-gray-900 ${className}`}>{displayName}</span>
  );
}
