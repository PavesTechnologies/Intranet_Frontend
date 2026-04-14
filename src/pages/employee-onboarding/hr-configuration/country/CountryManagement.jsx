"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import AddCountryModal from "./AddCountryModal";

export default function CountryManagement() {
  const [countries, setCountries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const token = localStorage.getItem("token");
  const BASE_URL = window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL;

  /* -------------------- FETCH COUNTRIES -------------------- */
  const fetchCountries = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BASE_URL}/masters/country`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCountries(res.data);
    } catch (error) {
      console.error("Failed to fetch countries", error);
      toast.error("Failed to load countries");
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
      await axios.put(
        `${BASE_URL}/masters/country/deactivateoractivate/${country.country_uuid}`,
        null,
        {
          params: { is_active: country.is_active ? "false" : "true" },
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: (status) => status >= 200 && status < 300,
        },
      );

      toast.success(
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
      toast.error("Failed to update country status");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Country Management
          </h1>
          <p className="text-gray-600">
            Manage countries used in onboarding & compliance
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg transition-all duration-100 ease-in-out
          active:translate-y-[1px]
          disabled:opacity-60 disabled:cursor-not-allowed
          flex items-center justify-center gap-2"
        >
          + Add Country
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        {loading ? (
          <div className="p-6 text-center text-gray-600">
            Loading countries...
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead className="bg-blue-900 text-white">
              <tr>
                <th className="px-6 py-3 text-left">Country Name</th>
                <th className="px-6 py-3 text-left">Calling Code</th>
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {countries.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="px-6 py-6 text-center text-gray-500"
                  >
                    No countries found
                  </td>
                </tr>
              ) : (
                countries.map((country) => (
                  <tr
                    key={country.country_uuid}
                    className="border-b hover:bg-gray-50"
                  >
                    <td className="px-6 py-3">{country.country_name}</td>
                    <td className="px-6 py-3">+{country.calling_code}</td>
                    <td className="px-6 py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          country.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {country.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <button
                        onClick={() => handleToggleStatus(country)}
                        className={`px-3 py-1 rounded text-white text-sm ${
                          country.is_active
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-green-600 hover:bg-green-700"
                        }`}
                      >
                        {country.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Country Modal */}
      {showModal && (
        <AddCountryModal
          onClose={() => setShowModal(false)}
          onSuccess={(newCountry) =>
            setCountries((prev) => [newCountry, ...prev])
          }
          BASE_URL={BASE_URL}
          token={token}
        />
      )}
    </div>
  );
}
