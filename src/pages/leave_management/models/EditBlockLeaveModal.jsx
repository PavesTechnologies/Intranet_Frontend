import React, { useState, useMemo, useEffect } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { format } from "date-fns";
import { toast } from "react-toastify";
import DateRangePicker from "./DateRangePicker";
import Button from "../../../components/Button/Button";
import FormTextArea from "../../../components/forms/FormTextArea";

export default function EditBlockLeaveModal({
  isOpen,
  onClose,
  block,
  allLeaveTypes,
  allProjectMembers,
  onSave, // parent handler
}) {
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // statusState = current state (true => ACTIVE/blocked, false => INACTIVE/free)
  const [statusState, setStatusState] = useState({});
  // initialStatusState = snapshot of what we loaded from block (used to compute diffs)
  const [initialStatusState, setInitialStatusState] = useState({});

  useEffect(() => {
    if (block) {
      setReason(block.reason || "");
      setStartDate(block.startDate || "");
      setEndDate(block.endDate || "");

      // build initial state from block.blockedMappings and using ALL leave types
      const init = {};
      const members = block.memberIds || [];

      // create structure: for every member, create entry for every leave type we have
      members.forEach((emp) => {
        init[emp] = {};
        (allLeaveTypes || []).forEach((lt) => {
          // default to false (INACTIVE / Free)
          init[emp][String(lt.value)] = false;
        });
      });

      // apply blockedMappings (where status === "ACTIVE")
      (block.blockedMappings || []).forEach((m) => {
        if (!init[m.employeeId]) init[m.employeeId] = {};
        init[m.employeeId][m.leaveTypeId] = m.status === "ACTIVE";
      });

      setStatusState(JSON.parse(JSON.stringify(init)));
      setInitialStatusState(JSON.parse(JSON.stringify(init)));
    } else {
      setStatusState({});
      setInitialStatusState({});
      setReason("");
      setStartDate("");
      setEndDate("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, allLeaveTypes]); // include allLeaveTypes so newly loaded leave types are picked up

  // Now show ALL leave types in the table columns (not only block.leaveTypeIds)
  const leaveTypesInBlock = useMemo(() => {
    return allLeaveTypes || [];
  }, [allLeaveTypes]);

  const membersInBlock = useMemo(() => {
    const memberIds = new Set(block?.memberIds || []);
    return (allProjectMembers || []).filter((m) =>
      memberIds.has(String(m.value))
    );
  }, [block, allProjectMembers]);

  const getCellStatus = (empId, ltId) =>
    !!(statusState?.[empId] && statusState[empId][ltId]);

  const handleCellToggle = (empId, ltId, checked) => {
    setStatusState((prev) => ({
      ...prev,
      [empId]: {
        ...(prev[empId] || {}),
        [ltId]: checked,
      },
    }));
  };

  // Unblock All: when checked -> set all to INACTIVE (false). unchecked -> restore initial
  const handleEmployeeUnblockAll = (empId, isChecked) => {
    if (isChecked) {
      setStatusState((prev) => {
        const updated = { ...(prev || {}) };
        updated[empId] = { ...(updated[empId] || {}) };
        (leaveTypesInBlock || []).forEach((lt) => {
          updated[empId][String(lt.value)] = false;
        });
        return updated;
      });
    } else {
      setStatusState((prev) => {
        const updated = { ...(prev || {}) };
        updated[empId] = JSON.parse(
          JSON.stringify(initialStatusState[empId] || {})
        );
        return updated;
      });
    }
  };

  const getEmployeeCheckState = (empId) => {
    const ltIds = leaveTypesInBlock.map((lt) => String(lt.value));
    const current = statusState[empId] || {};
    const checkedCount = ltIds.filter((lt) => !!current[lt]).length;
    if (checkedCount === 0) return false;
    if (checkedCount < ltIds.length) return "indeterminate";
    return true;
  };

  // compute diffs and build payload; then call onSave(payload)
  const handleSaveClick = async () => {
    if (!block) return;
    setSubmitting(true);

    try {
      const payload = { blockId: block.id };
      let hasNormalUpdates = false;
      let hasUnblocks = false;

      /* ---------------------- 1) DATE + REASON CHANGES ---------------------- */
      const dateChanged =
        (startDate || "") !== (block.startDate || "") ||
        (endDate || "") !== (block.endDate || "");
      const reasonChanged = (reason || "") !== (block.reason || "");

      if (dateChanged || reasonChanged) {
        hasNormalUpdates = true;
        payload.updates = {};
        if (dateChanged) {
          payload.updates.startDate = startDate;
          payload.updates.endDate = endDate;
        }
        if (reasonChanged) {
          payload.updates.reason = reason;
        }
      }

      /* ---------------------- 2) MAPPING CHANGES (TOGGLES) ---------------------- */
      const unblockedMapTemp = {};
      const updatedMappings = [];

      const members = membersInBlock || [];
      const lts = leaveTypesInBlock || [];

      members.forEach((member) => {
        const empId = String(member.value);
        lts.forEach((lt) => {
          const ltId = String(lt.value);

          const initial = !!(initialStatusState?.[empId]?.[ltId]);
          const current = !!(statusState?.[empId]?.[ltId]);

          if (initial !== current) {
            if (initial === true && current === false) {
              // ACTIVE → INACTIVE = unblock request
              hasUnblocks = true;
              if (!unblockedMapTemp[empId]) unblockedMapTemp[empId] = [];
              unblockedMapTemp[empId].push(ltId);
            } else {
              // INACTIVE → ACTIVE or other change (this includes newly added blocks)
              hasNormalUpdates = true;
              updatedMappings.push({
                employeeId: empId,
                leaveTypeId: ltId,
                status: current ? "ACTIVE" : "INACTIVE",
              });
            }
          }
        });
      });

      if (updatedMappings.length > 0) {
        payload.mappingUpdates = updatedMappings;
      }

      const unblockRequests = Object.entries(unblockedMapTemp).map(
        ([employeeId, leaveTypeIds]) => ({ employeeId, leaveTypeIds })
      );

      if (unblockRequests.length > 0) {
        payload.unblockedRequests = unblockRequests;
      }

      /* ---------------------- 3) SET TYPE FIELD ---------------------- */
      if (hasUnblocks && !hasNormalUpdates) {
        payload.type = "UNBLOCK";
      } else {
        payload.type = "UPDATE"; // default if updating OR mixed
      }

      /* ---------------------- 4) Prevent Empty Submit ---------------------- */
      // We expect at least blockId + something else (type only is not a change)
      const meaningfulKeys = Object.keys(payload).filter((k) => k !== "blockId");
      if (meaningfulKeys.length === 0) {
        toast.info("No changes detected.");
        setSubmitting(false);
        return;
      }

      /* ---------------------- 5) Send to Parent Handler ---------------------- */
      onSave(payload);
      onClose();
    } catch (err) {
      console.error("Modal save error:", err);
      toast.error("Failed to prepare changes. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !block) return null;

  return (
    <div className="relative z-50" aria-modal="true">
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75"></div>
      <div className="fixed inset-0 z-10 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div className="relative w-full max-w-6xl rounded-lg bg-white shadow-xl">
            {/* Header */}
            <div className="flex justify-between items-center border-b px-6 py-4 bg-gray-50">
              <h2 className="text-lg font-semibold">
                Edit Leave Block –{" "}
                <span className="text-indigo-600">{block.projectName}</span>
              </h2>
              <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close">
                <XMarkIcon className="h-6 w-6 text-gray-500 hover:text-gray-700" />
              </Button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6">
              <FormTextArea
                label="Reason"
                name="blockReason"
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date range
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DateRangePicker
                    label="Start Date"
                    defaultDate={
                      startDate ? new Date(startDate + "T00:00:00") : undefined
                    }
                    onChange={(date) => {
                      const formatted = format(date, "yyyy-MM-dd");
                      // validate
                      if (endDate && new Date(endDate) < new Date(formatted)) {
                        toast.warn("End date cannot be before start date.");
                        setEndDate("");
                      }
                      setStartDate(formatted);
                    }}
                    disabledDays={[
                      { dayOfWeek: [0, 6] },
                      ...(block.holidays || []),
                    ]}
                  />
                  <DateRangePicker
                    label="End Date"
                    defaultDate={
                      endDate ? new Date(endDate + "T00:00:00") : undefined
                    }
                    onChange={(date) => {
                      const formatted = format(date, "yyyy-MM-dd");
                      if (
                        startDate &&
                        new Date(formatted) < new Date(startDate)
                      ) {
                        toast.error("End date cannot be before start date.");
                        return;
                      }
                      setEndDate(formatted);
                    }}
                    disabledDays={[
                      { dayOfWeek: [0, 6] },
                      ...(block.holidays || []),
                    ]}
                    align="right"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Manage Blocked Employees &amp; Leave Types
                </label>

                <div className="overflow-x-auto border rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                          Employee
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">
                          Unblock All
                        </th>
                        {leaveTypesInBlock.map((lt) => (
                          <th
                            key={lt.value}
                            className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500"
                          >
                            {lt.label}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100 bg-white">
                      {membersInBlock.map((member) => {
                        const empId = String(member.value);
                        const mainState = getEmployeeCheckState(empId);
                        return (
                          <tr key={empId}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-800">
                              {member.label}
                            </td>

                            <td className="px-4 py-3 text-center">
                              <input
                                type="checkbox"
                                checked={
                                  mainState === false
                                    ? false
                                    : mainState === true
                                }
                                ref={(el) => {
                                  if (!el) return;
                                  el.indeterminate =
                                    mainState === "indeterminate";
                                }}
                                onChange={(e) =>
                                  handleEmployeeUnblockAll(
                                    empId,
                                    e.target.checked
                                  )
                                }
                                className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
                              />
                            </td>

                            {leaveTypesInBlock.map((lt) => {
                              const ltId = String(lt.value);
                              const checked = getCellStatus(empId, ltId);
                              const initiallyBlocked = !!(
                                initialStatusState?.[empId]?.[ltId]
                              );
                              const isNewlyBlocked = checked && !initiallyBlocked;

                              return (
                                <td
                                  key={ltId}
                                  className="px-4 py-3 text-center text-sm"
                                >
                                  <div className="flex justify-center items-center gap-2">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={(e) =>
                                          handleCellToggle(
                                            empId,
                                            ltId,
                                            e.target.checked
                                          )
                                        }
                                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                      />
                                    </div>

                                    {/* Labels: Blocked (existing) = red, New Block = yellow, Free = green */}
                                    {checked ? (
                                      initiallyBlocked ? (
                                        <span className="text-xs text-red-500 font-medium">
                                          Blocked
                                        </span>
                                      ) : (
                                        <span className="text-xs text-yellow-600 font-semibold">
                                          New Block
                                        </span>
                                      )
                                    ) : (
                                      <span className="text-xs text-green-500 font-medium">
                                        Free
                                      </span>
                                    )}
                                  </div>
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 border-t bg-gray-50 px-6 py-4">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSaveClick}
                disabled={submitting}
              >
                {submitting ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
