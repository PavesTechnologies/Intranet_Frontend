import React, { useEffect, useState } from "react";

import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import {
  createCompanyProfile,
  updateCompanyProfile,
  getCompanyProfileErrorMessage,
} from "../../services/companyProfileService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const EMPTY_FORM = {
  legalName: "",
  gstin: "",
  email: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  country: "",
  postalCode: "",
  logoReference: "",
};

export default function CompanyProfileModal({
  isOpen,
  onClose,
  initialData = null,
  onSaved,
}) {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const isEditMode = Boolean(initialData && (initialData.companyProfileId || initialData.id));

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setFormData({
        legalName: initialData.legalName || "",
        gstin: initialData.gstin || "",
        email: initialData.email || "",
        phone: initialData.phone || "",
        addressLine1: initialData.addressLine1 || "",
        addressLine2: initialData.addressLine2 || "",
        city: initialData.city || "",
        state: initialData.state || "",
        country: initialData.country || "",
        postalCode: initialData.postalCode || "",
        logoReference: initialData.logoReference || "",
      });
    } else {
      setFormData(EMPTY_FORM);
    }
    setFormErrors({});
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const validateForm = () => {
    const errors = {};
    const legalName = (formData.legalName || "").trim();
    const email = (formData.email || "").trim();
    const addressLine1 = (formData.addressLine1 || "").trim();
    const addressLine2 = (formData.addressLine2 || "").trim();
    const city = (formData.city || "").trim();
    const state = (formData.state || "").trim();
    const country = (formData.country || "").trim();
    const postalCode = (formData.postalCode || "").trim();
    const gstin = (formData.gstin || "").trim();
    const phone = (formData.phone || "").trim();

    if (!legalName) {
      errors.legalName = "Legal company name is required.";
    } else if (legalName.length > 150) {
      errors.legalName = "Must be 150 characters or fewer.";
    }

    if (email) {
      if (!EMAIL_REGEX.test(email)) {
        errors.email = "Please enter a valid email address.";
      } else if (email.length > 100) {
        errors.email = "Must be 100 characters or fewer.";
      }
    }

    if (addressLine1.length > 200) {
      errors.addressLine1 = "Must be 200 characters or fewer.";
    }

    if (addressLine2.length > 200) {
      errors.addressLine2 = "Must be 200 characters or fewer.";
    }

    if (city.length > 100) {
      errors.city = "Must be 100 characters or fewer.";
    }

    if (state.length > 100) {
      errors.state = "Must be 100 characters or fewer.";
    }

    if (country.length > 100) {
      errors.country = "Must be 100 characters or fewer.";
    }

    if (postalCode.length > 20) {
      errors.postalCode = "Must be 20 characters or fewer.";
    }

    if (gstin.length > 30) {
      errors.gstin = "Must be 30 characters or fewer.";
    }

    if (phone.length > 25) {
      errors.phone = "Must be 25 characters or fewer.";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    const payload = {
      legalName: formData.legalName.trim(),
      gstin: (formData.gstin || "").trim() || null,
      email: (formData.email || "").trim() || null,
      phone: (formData.phone || "").trim() || null,
      addressLine1: (formData.addressLine1 || "").trim() || null,
      addressLine2: (formData.addressLine2 || "").trim() || null,
      city: (formData.city || "").trim() || null,
      state: (formData.state || "").trim() || null,
      country: (formData.country || "").trim() || null,
      postalCode: (formData.postalCode || "").trim() || null,
      logoReference: (formData.logoReference || "").trim() || null,
      isActive: true,
    };

    try {
      let saved = null;
      if (isEditMode) {
        const id = initialData.companyProfileId || initialData.id;
        saved = await updateCompanyProfile(id, payload);
        showStatusToast("Company profile updated successfully.", "success");
      } else {
        saved = await createCompanyProfile(payload);
        showStatusToast("Company profile configured successfully.", "success");
      }

      onSaved?.(saved);
      onClose();
    } catch (error) {
      console.error("[CompanyProfileModal] Save error:", error);
      const msg = getCompanyProfileErrorMessage(
        error,
        isEditMode ? "Failed to update company profile." : "Failed to create company profile."
      );
      showStatusToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => !submitting && onClose()}
      title={isEditMode ? "Edit Company Profile" : "Configure Company Profile"}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          {isEditMode
            ? "Update your organization's legal seller and contact details. Future invoices will reflect these updated details."
            : "Enter your organization's legal seller and contact details. This information will appear on generated invoices."}
        </p>

        {/* Section: Legal & Tax Identity */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Legal & Tax Identity
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
              label="Legal / Company Name"
              name="legalName"
              value={formData.legalName}
              onChange={handleChange}
              error={formErrors.legalName}
              placeholder="e.g. Paves Technologies Pvt Ltd"
              required
              disabled={submitting}
            />
            <FormInput
              label="GSTIN / Tax ID"
              name="gstin"
              value={formData.gstin}
              onChange={handleChange}
              error={formErrors.gstin}
              placeholder="e.g. 36AAACA1234A1Z5"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Section: Contact Information */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Contact Information
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <FormInput
              label="Business Email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              error={formErrors.email}
              placeholder="billing@example.com"
              disabled={submitting}
            />
            <FormInput
              label="Phone Number"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              error={formErrors.phone}
              placeholder="+91 40 1234 5678"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Section: Registered Address */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Registered Address
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <FormInput
                label="Address Line 1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                error={formErrors.addressLine1}
                placeholder="Building, Street, Suite / Floor"
                disabled={submitting}
              />
            </div>
            <div className="md:col-span-2">
              <FormInput
                label="Address Line 2 (Optional)"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                error={formErrors.addressLine2}
                placeholder="Locality, Landmark"
                disabled={submitting}
              />
            </div>
            <FormInput
              label="City"
              name="city"
              value={formData.city}
              onChange={handleChange}
              error={formErrors.city}
              placeholder="e.g. Hyderabad"
              disabled={submitting}
            />
            <FormInput
              label="State / Province"
              name="state"
              value={formData.state}
              onChange={handleChange}
              error={formErrors.state}
              placeholder="e.g. Telangana"
              disabled={submitting}
            />
            <FormInput
              label="Postal / Zip Code"
              name="postalCode"
              value={formData.postalCode}
              onChange={handleChange}
              error={formErrors.postalCode}
              placeholder="e.g. 500081"
              disabled={submitting}
            />
            <FormInput
              label="Country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              error={formErrors.country}
              placeholder="e.g. India"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Section: Branding (Optional) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Branding (Optional)
          </h4>
          <FormInput
            label="Logo Reference / URL"
            name="logoReference"
            value={formData.logoReference}
            onChange={handleChange}
            error={formErrors.logoReference}
            placeholder="https://cdn.example.com/logo.png"
            disabled={submitting}
          />
        </div>

        {/* Action Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="small"
            disabled={submitting}
            className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white font-semibold"
          >
            {submitting ? "Saving..." : isEditMode ? "Save Changes" : "Save Profile"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
