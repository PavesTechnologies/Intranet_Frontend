"use client";

import { useEffect, useState } from "react";
import api from "../../../../api/axiosInstance"
import AddCountryModal from "./AddCountryModal";
import Button from "../../../../components/Button/Button";
import GenericTable from "../../../../components/Table/table";
import StatusBadge from "../../../../components/status/statusbadge";
import { PageCard } from "../../../../components/Cards/PageCard";
import { Fonts } from "../../../../components/Fonts/Fonts";

export default function CountryManagement() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

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
  const handleToggleStatus = async (country) => {
    if (
      country.is_active &&
      !window.confirm("Are you sure you want to deactivate this country?")
    ) {
      return;
    }

    try {
      await api.put(
        `${BASE_URL}/masters/country/deactivateoractivate/${country.country_uuid}`,
        { is_active: !country.is_active },
      );

      if (window.showSuccess) window.showSuccess(
        `Country ${country.is_active ? "deactivated" : "activated"} successfully`,
      );

      // Update table instantly
      setCountries((prev) =>
        prev.map((c) =>
          c.country_uuid === country.country_uuid
            ? { ...c, is_active: !c.is_active }
            : c,
        ),
      );
    } catch (error) {
      console.error(
        "Toggle failed",
        error.response?.status,
        error.response?.data,
      );
      if (window.showError) window.showError("Failed to update country status");
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
        onClick={() => handleToggleStatus(country)}
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
    </div>
  );
}
