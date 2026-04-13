import { useState, useEffect, useRef } from "react";
import StatusBadge from "../../../../components/status/statusbadge";
import { formatOfferStatusLabel } from "../../components/offerStatus";

export default function OfferStatusCell({
  employee,
  displayStatus,
  joiningCommentsByUser,
  loadingStatusCommentUserId,
  fetchJoiningCommentForUser,
}) {
  return (
    <div className="flex items-center justify-center gap-1.5 align-middle">
      <StatusBadge label={formatOfferStatusLabel(displayStatus)} size="sm" />
    </div>
  );
}
