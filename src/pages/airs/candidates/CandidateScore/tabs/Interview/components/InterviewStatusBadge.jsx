import React from "react";
import { Badge } from "@/components/ui/badge";
import { STATUS_TONE, STATUS_LABEL } from "../interviewMock";

export default function InterviewStatusBadge({ status }) {
  const tone = STATUS_TONE[status] || STATUS_TONE.PENDING;
  return <Badge className={`${tone} font-bold px-3 py-1 text-xs`}>{STATUS_LABEL[status] || status}</Badge>;
}
