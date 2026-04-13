// useLeaveDropdownOptions.js
import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const BASE_URL = window.__APP_CONFIG__.BASE_URL;

const GENDER_BASED_IDS = ["L-ML", "L-PL"];

export function useLeaveDropdownOptions(balances) {
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [hasFetched, setHasFetched] = useState(false);

  useEffect(() => {
    if (hasFetched) return;
    const fetchLeaveTypes = async () => {
      try {
        const res = await axios.get(`${BASE_URL}/api/leave/types`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setLeaveTypes(res.data);
        setHasFetched(true);
      } catch (err) {
        toast.error(
          err?.response?.data?.message || "Failed to load leave type details.",
        );
      }
    };
    fetchLeaveTypes();
  }, []);

  return useMemo(() => {
    console.log("useLeaveDropdownOptions", { balances, leaveTypes });
    if (!balances || balances.length === 0 || leaveTypes.length === 0)
      return [];

    return balances.map((balance) => {
      const leaveTypeId = balance.leaveType.leaveTypeId;
      const originalName = balance.leaveType.leaveName.replace(/^L-/, "");
      const matchingType = leaveTypes.find(
        (type) => type.name === balance.leaveType.leaveName,
      );
      const leaveName = matchingType ? matchingType.label : originalName;

      // ✅ Gender-based leaves use remainingDays, all others use remainingLeaves
      const isGenderBased = GENDER_BASED_IDS.includes(leaveTypeId);
      const remaining = isGenderBased
        ? balance.remainingDays
        : balance.remainingLeaves;

      let availableText;
      let isInfinite = false;

      if (
        leaveTypeId === "L-UP" ||
        leaveName.toLowerCase().includes("unpaid")
      ) {
        availableText = "infinite balance";
        isInfinite = true;
      } else if (remaining > 0) {
        availableText = `${remaining} days available`;
      } else {
        availableText = "Not Available";
      }

      return {
        balanceId: balance.balanceId,
        leaveTypeId,
        leaveName,
        availableText,
        availableDays: isInfinite ? Infinity : remaining, // ✅
        isInfinite,
        disabled: (!isInfinite && remaining <= 0) || balance.isBlocked, // ✅
        allowHalfDay: !!balance.leaveType.allowHalfDay,
        requiresDocumentation: !!balance.leaveType.requiresDocumentation,
        weekendsAndHolidaysAllowed:
          !!balance.leaveType?.weekendsAndHolidaysAllowed,
        raw: balance,
      };
    });
  }, [balances, leaveTypes]);
}
