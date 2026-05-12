// useLeaveDropdownOptions.js
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const GENDER_BASED_IDS = ["L-ML", "L-PL"];

export function useLeaveDropdownOptions(balances = []) {
  return useMemo(() => {
    return balances.map((balance) => {
      // ✅ Handle BOTH formats (flat + nested)
      const leaveTypeId =
        balance.leaveTypeId || balance.leaveType?.leaveTypeId;

      const leaveNameRaw =
        balance.leaveName || balance.leaveType?.leaveName || "Unknown";

      // ✅ Normalize remaining
      const remaining =
        balance.remaining ??
        balance.remainingDays ??
        balance.remainingLeaves ??
        0;

      // ✅ Clean label
      const leaveName = leaveNameRaw
        .replace(/_/g, " ")
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // ✅ Infinite logic
      const isInfinite =
        leaveTypeId === "L-UP" ||
        leaveNameRaw.toLowerCase().includes("unpaid");

      let availableText;
      if (isInfinite) {
        availableText = "Infinite balance";
      } else if (remaining > 0) {
        availableText = `${remaining} days available`;
      } else {
        availableText = "Not Available";
      }

      return {
        leaveTypeId,
        leaveName,
        availableText,
        availableDays: isInfinite ? Infinity : remaining,
        isInfinite,
        disabled: (!isInfinite && remaining <= 0) || balance.isBlocked,
        allowHalfDay:
          balance.allowHalfDay ??
          balance.leaveType?.allowHalfDay ??
          false,
        requiresDocumentation:
          balance.requiresDocumentation ??
          balance.leaveType?.requiresDocumentation ??
          false,
      };
    });
  }, [balances]);
}