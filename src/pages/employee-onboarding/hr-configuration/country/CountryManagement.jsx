"use client";

import { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance"
import AddCountryModal from "./AddCountryModal";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import StatusBadge from "../../../../components/status/statusbadge";
import { PageCard } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";
import ConfirmationModal from "../../../../components/confirmation_modal/ConfirmationModal";

export default function CountryManagement() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
const [selectedCountry, setSelectedCountry] = useState(null);
const [isUpdating, setIsUpdating] = useState(false);

  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* -------------------- FETCH COUNTRIES -------------------- */
  const fetchCountries = async () => {
    try {
      setLoading(true);
      const res = await api.get(`${BASE_URL}/masters/country`);
      setCountries(res.data);
    } catch (error) {
      console.error("Failed to fetch countries", error);
      if (window.showError) window.showError("Failed to load countries");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCountries();
  }, []);

  /* -------------------- ACTIVATE / DEACTIVATE -------------------- */
  const confirmToggleStatus = async () => {
  if (!selectedCountry) return;

  try {
    setIsUpdating(true);

    await api.put(
      `${BASE_URL}/masters/country/deactivateoractivate/${selectedCountry.country_uuid}`,
      null,
      {
        params: {
          is_active: !selectedCountry.is_active,
        },
      }
    );

    setCountries((prev) =>
      prev.map((c) =>
        c.country_uuid === selectedCountry.country_uuid
          ? { ...c, is_active: !c.is_active }
          : c
      )
    );

    window.showSuccess?.(
      `Country ${selectedCountry.is_active ? "deactivated" : "activated"} successfully`
    );

    setIsConfirmOpen(false);
    setSelectedCountry(null);
  } catch (error) {
    console.error(error);
    window.showError?.("Failed to update country status");
  } finally {
    setIsUpdating(false);
  }
};
  const tableHeaders = ["Country Name", "Calling Code", "Status", "Action"];
  const tableColumns = ["country_name", "calling_code", "status_badge", "action_button"];
  const tableRows = countries.map(country => ({
    country_name: country.country_name,
    calling_code: `+${country.calling_code}`,
    status_badge: <StatusBadge label={country.is_active ? "Active" : "Inactive"} size="sm" />,
    action_button: (
      <Button
        onClick={() => {
  setSelectedCountry(country);
  setIsConfirmOpen(true);
}}
        variant={country.is_active ? "danger" : "success"}
        size="small"
      >
        {country.is_active ? "Deactivate" : "Activate"}
      </Button>
    )
  }));

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={Fonts.heading3}>
            Country Management
          </h1>
          <p className={Fonts.paragraph}>
            Manage countries used in onboarding & compliance
          </p>
        </div>

        <Button onClick={() => setShowModal(true)} variant="primary">
          + Add Country
        </Button>
      </div>

      {/* Table */}
      <PageCard>
        <GenericTable
          headers={tableHeaders}
          columns={tableColumns}
          rows={tableRows}
          loading={loading}
        />
      </PageCard>

      {/* Add Country Modal */}
      {showModal && (
        <AddCountryModal
          onClose={() => setShowModal(false)}
          onSuccess={(newCountry) =>
            setCountries((prev) => [newCountry, ...prev])
          }
          BASE_URL={BASE_URL}
        />
      )}
      <ConfirmationModal
  isOpen={isConfirmOpen}
  onClose={() => {
    setIsConfirmOpen(false);
    setSelectedCountry(null);
  }}
  onConfirm={confirmToggleStatus}
  title={`${selectedCountry?.is_active ? "Deactivate" : "Activate"} Country`}
  message={`Are you sure you want to ${
    selectedCountry?.is_active ? "deactivate" : "activate"
  } this country?`}
  confirmText={selectedCountry?.is_active ? "Deactivate" : "Activate"}
  cancelText="Cancel"
  confirmVariant={selectedCountry?.is_active ? "danger" : "success"}
  loading={isUpdating}
/>
    </div>
  );
}
