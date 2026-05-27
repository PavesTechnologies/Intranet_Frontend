"use client";

import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Table from "../../../components/Table/table";
import Pagination from "../../../components/Pagination/pagination";
import Button from "../../../components/Button/Button";
import api from "../../../api/axiosInstance";
import { showStatusToast } from "../../../components/toastfy/toast";
import StatusBadge from "../../../components/status/statusbadge";
import { CheckIcon, ViewIcon } from "../../../components/icons/ActionIcons";
import {
  formatOfferStatusLabel,
  getNormalizedStatus,
  getOfferDisplayStatus,
} from "./offerStatus";

const PAGE_SIZE = 5;

function ActionButtons({ onView, onVerify, showVerify }) {
  return (
    <div className="flex items-center justify-center gap-2">
      <button
        type="button"
        onClick={onView}
        className="rounded-md bg-gray-100 p-1.5 text-gray-700 transition hover:bg-gray-200 hover:text-gray-900"
        aria-label="View offer"
        title="View offer"
      >
        <ViewIcon className="h-4 w-4" />
      </button>

      {showVerify && (
        <button
          type="button"
          onClick={onVerify}
          className="rounded-md bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-800"
          aria-label="Verify offer"
          title="Verify offer"
        >
          <CheckIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export default function OffersTable({
  offers = [],
  employeeUserIds = [],
  loading = false,
}) {
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [sending, setSending] = useState(false);

  const totalPages = Math.ceil(offers.length / PAGE_SIZE);

  const toggleSelect = (userUuid) => {
    setSelectedIds((prev) =>
      prev.includes(userUuid)
        ? prev.filter((id) => id !== userUuid)
        : [...prev, userUuid],
    );
  };

  const cancelBulk = () => {
    setBulkMode(false);
    setSelectedIds([]);
  };

  const handleBulkSend = async () => {
    if (selectedIds.length === 0) return;

    try {
      setSending(true);

      const res = await api.post(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/bulk-send`,
        {
          user_uuid_list: selectedIds,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        },
      );

      showStatusToast(
        `Bulk Send Complete\n\nSuccessful: ${res.data.successful}\nFailed: ${res.data.failed}`,
      );
      cancelBulk();
    } catch (error) {
      console.error("Bulk send failed", error);
      showStatusToast("Bulk send failed");
    } finally {
      setSending(false);
    }
  };

  const headers = [
    bulkMode ? "Select" : null,
    "Candidate Name",
    "Email",
    "Contact",
    "Role",
    "Employee Type",
    "Status",
    "Action",
  ].filter(Boolean);

  const columns = [
    bulkMode ? "select" : null,
    "candidate_name",
    "mail",
    "contact",
    "designation",
    "employee_type",
    "status",
    "action",
  ].filter(Boolean);

  const rows = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;

    return offers.slice(startIndex, startIndex + PAGE_SIZE).map((offer) => {
      const displayStatus = getOfferDisplayStatus(offer, employeeUserIds);
      const normalizedStatus = getNormalizedStatus(offer.status);
      const isStatusCreated = normalizedStatus === "CREATED";
      const isSubmitted = displayStatus === "SUBMITTED";
      const isCheckboxEnabled = bulkMode && isStatusCreated;

      return {
        ...(bulkMode && {
          select: (
            <input
              type="checkbox"
              disabled={!isCheckboxEnabled}
              checked={selectedIds.includes(offer.user_uuid)}
              onChange={() =>
                isCheckboxEnabled && toggleSelect(offer.user_uuid)
              }
              className={`h-4 w-4 ${isCheckboxEnabled
                  ? "cursor-pointer"
                  : "cursor-not-allowed opacity-40"
                }`}
            />
          ),
        }),
        candidate_name:
          [offer.first_name, offer.middle_name, offer.last_name]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .trim() || "—",
        mail: offer.mail ? offer.mail.toLowerCase() : "—",
        contact: offer.contact_number || "—",
        designation: offer.designation
          ? offer.designation
            .toLowerCase()
            .replace(/\b\w/g, (c) => c.toUpperCase())
          : "—",
        employee_type: offer.employee_type || "—",
        status: displayStatus ? (
          <StatusBadge
            label={formatOfferStatusLabel(displayStatus)}
            size="sm"
          />
        ) : (
          "—"
        ),
        action: (
          <ActionButtons
            onView={() =>
              navigate(`/employee-onboarding/offer/${offer.user_uuid}`)
            }
            onVerify={() =>
              navigate(`/employee-onboarding/hr/profile/${offer.user_uuid}`)
            }
            showVerify={isSubmitted}
          />
        ),
      };
    });
  }, [offers, currentPage, bulkMode, selectedIds, navigate, employeeUserIds]);

  return (
    <div className="bg-white rounded-xl shadow-sm relative overflow-visible">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-gray-800">Recent Offer Letters</h2>

        <div className="flex items-center gap-3">
          {!bulkMode ? (
            <Button
              varient="primary"
              size="small"
              onClick={() => setBulkMode(true)}
            >
              Bulk Offer
            </Button>
          ) : (
            <div className="flex gap-3">
              <Button
                varient="primary"
                size="small"
                disabled={selectedIds.length === 0 || sending}
                onClick={handleBulkSend}
              >
                {sending ? "Sending..." : `Send (${selectedIds.length})`}
              </Button>

              <Button varient="secondary" size="small" onClick={cancelBulk}>
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>

      <Table
        headers={headers}
        columns={columns}
        rows={rows}
        loading={loading}
      />

      {offers.length > PAGE_SIZE && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPrevious={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          onNext={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
        />
      )}
    </div>
  );
}
