import React, { useEffect, useState } from "react";

import Button from "../../../../components/Button/Button";
import FormInput from "../../../../components/forms/FormInput";
import FormTextArea from "../../../../components/forms/FormTextArea";
import Modal from "../../../../components/Modal/modal";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  createCompanyProfile,
  updateCompanyProfile,
  uploadCompanyProfileSignature,
  deleteCompanyProfileSignature,
  fetchSignatureAssetBlob,
  getCompanyProfileErrorMessage,
  validateSignatureImageFile,
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
  signatureReference: "",
  notes: "",
  termsAndConditions: "",
  paymentInstructions: "",
};

export default function CompanyProfileModal({
  isOpen,
  onClose,
  initialData = null,
  onSaved,
}) {
  const { hasRole } = useAuth();
  const isFinanceExecutive = Boolean(
    hasRole?.(["FINANCE_EXECUTIVE", "Finance_Executive"]) ?? true
  );

  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [signaturePreview, setSignaturePreview] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [pendingDeleteSignature, setPendingDeleteSignature] = useState(false);
  const createdBlobUrlRef = React.useRef(null);

  const isEditMode = Boolean(initialData && (initialData.companyProfileId || initialData.id));

  useEffect(() => {
    if (!isOpen) return;

    // Reset cleanup ref
    if (createdBlobUrlRef.current) {
      URL.revokeObjectURL(createdBlobUrlRef.current);
      createdBlobUrlRef.current = null;
    }

    if (initialData) {
      const sigRef = initialData.signatureReference || initialData.signatureUrl || "";
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
        signatureReference: sigRef,
        notes:
          initialData.defaultInvoiceNotes ||
          initialData.invoiceNotes ||
          initialData.notes ||
          initialData.additionalNotes ||
          "",
        termsAndConditions:
          initialData.defaultTermsAndConditions ||
          initialData.termsAndConditions ||
          initialData.terms ||
          "",
        paymentInstructions:
          initialData.defaultPaymentInstructions ||
          initialData.paymentInstructions ||
          initialData.paymentInstruction ||
          "",
      });

      // If existing signature reference, attempt to load preview
      if (sigRef) {
        if (sigRef.startsWith("blob:") || sigRef.startsWith("data:") || sigRef.startsWith("http")) {
          setSignaturePreview(sigRef);
        } else {
          // Fetch authenticated blob
          fetchSignatureAssetBlob(sigRef)
            .then((blob) => {
              if (blob instanceof Blob && blob.size > 0) {
                const blobUrl = URL.createObjectURL(blob);
                createdBlobUrlRef.current = blobUrl;
                setSignaturePreview(blobUrl);
              } else {
                setSignaturePreview(sigRef);
              }
            })
            .catch(() => {
              setSignaturePreview(sigRef);
            });
        }
      } else {
        setSignaturePreview(null);
      }
    } else {
      setFormData(EMPTY_FORM);
      setSignaturePreview(null);
    }
    setSignatureFile(null);
    setPendingDeleteSignature(false);
    setFormErrors({});

    return () => {
      if (createdBlobUrlRef.current) {
        URL.revokeObjectURL(createdBlobUrlRef.current);
        createdBlobUrlRef.current = null;
      }
    };
  }, [isOpen, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (formErrors[name]) {
      setFormErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (name === "signatureReference") {
      setSignaturePreview(value ? value.trim() : null);
    }
  };

  const handleSignatureFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateSignatureImageFile(file);
    if (!validation.valid) {
      setFormErrors((prev) => ({ ...prev, signatureFile: validation.error }));
      setSignatureFile(null);
      return;
    }

    setFormErrors((prev) => ({ ...prev, signatureFile: undefined, signatureReference: undefined }));
    setSignatureFile(file);
    setPendingDeleteSignature(false);

    // Revoke any previous local preview blob URL
    if (createdBlobUrlRef.current) {
      URL.revokeObjectURL(createdBlobUrlRef.current);
    }

    // Create a local blob URL for immediate preview before saving
    const localUrl = URL.createObjectURL(file);
    createdBlobUrlRef.current = localUrl;
    setSignaturePreview(localUrl);

    // If no existing managed reference URL is entered, populate with filename
    if (!formData.signatureReference) {
      setFormData((prev) => ({
        ...prev,
        signatureReference: file.name,
      }));
    }
  };

  const handleClearSignature = () => {
    if (createdBlobUrlRef.current) {
      URL.revokeObjectURL(createdBlobUrlRef.current);
      createdBlobUrlRef.current = null;
    }
    setSignatureFile(null);
    setSignaturePreview(null);
    setPendingDeleteSignature(true);
    setFormData((prev) => ({ ...prev, signatureReference: "" }));
    setFormErrors((prev) => ({ ...prev, signatureFile: undefined, signatureReference: undefined }));
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

    const notes = (formData.notes || "").trim();
    const termsAndConditions = (formData.termsAndConditions || "").trim();
    const paymentInstructions = (formData.paymentInstructions || "").trim();

    if (notes.length > 5000) {
      errors.notes = "Notes must be 5000 characters or fewer.";
    }

    if (termsAndConditions.length > 10000) {
      errors.termsAndConditions = "Terms & Conditions must be 10000 characters or fewer.";
    }

    if (paymentInstructions.length > 5000) {
      errors.paymentInstructions = "Payment Instructions must be 5000 characters or fewer.";
    }

    const sigRef = (formData.signatureReference || "").trim();
    if (sigRef && sigRef.startsWith("data:")) {
      errors.signatureReference = "Raw base64 data URLs are not permitted. Please use managed image storage or upload.";
    }

    return errors;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (submitting) return;

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    const notesVal = (formData.notes || "").trim() || null;
    const termsVal = (formData.termsAndConditions || "").trim() || null;
    const paymentVal = (formData.paymentInstructions || "").trim() || null;
    const sigRefVal = (formData.signatureReference || "").trim() || null;

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
      signatureReference: sigRefVal,
      signatureUrl: sigRefVal,
      // Support backend Company Profile DTO and dedicated content defaults fields
      defaultInvoiceNotes: notesVal,
      defaultTermsAndConditions: termsVal,
      defaultPaymentInstructions: paymentVal,
      invoiceNotes: notesVal,
      notes: notesVal,
      additionalNotes: notesVal,
      termsAndConditions: termsVal,
      paymentInstructions: paymentVal,
      isActive: true,
    };

    if ((signatureFile || pendingDeleteSignature) && !isFinanceExecutive) {
      showStatusToast(
        "Only users with the FINANCE_EXECUTIVE role can upload, replace, or delete the authorized signatory signature.",
        "error"
      );
      setSubmitting(false);
      return;
    }

    try {
      let saved = null;
      if (isEditMode) {
        const id = initialData.companyProfileId || initialData.id;
        saved = await updateCompanyProfile(id, payload);

        // Upload or delete signature via dedicated backend endpoints
        if (signatureFile) {
          try {
            const sigResp = await uploadCompanyProfileSignature(id, signatureFile);
            if (sigResp?.signatureReference) {
              saved = {
                ...saved,
                signatureReference: sigResp.signatureReference,
                signatureUrl: sigResp.signatureReference,
              };
            }
          } catch (sigErr) {
            console.error("[CompanyProfileModal] Signature upload error:", sigErr);
            const sigMsg = getCompanyProfileErrorMessage(
              sigErr,
              "Failed to upload signature image to backend."
            );
            showStatusToast(`Profile saved, but signature upload failed: ${sigMsg}`, "warning");
          }
        } else if (pendingDeleteSignature) {
          try {
            await deleteCompanyProfileSignature(id);
            saved = {
              ...saved,
              signatureReference: null,
              signatureUrl: null,
            };
          } catch (delErr) {
            console.error("[CompanyProfileModal] Signature delete error:", delErr);
            const delMsg = getCompanyProfileErrorMessage(
              delErr,
              "Failed to delete signature on backend."
            );
            showStatusToast(`Profile saved, but signature deletion failed: ${delMsg}`, "warning");
          }
        }

        showStatusToast("Company profile updated successfully.", "success");
      } else {
        saved = await createCompanyProfile(payload);
        const newId = saved?.companyProfileId || saved?.id;
        if (newId && signatureFile) {
          try {
            const sigResp = await uploadCompanyProfileSignature(newId, signatureFile);
            if (sigResp?.signatureReference) {
              saved = {
                ...saved,
                signatureReference: sigResp.signatureReference,
                signatureUrl: sigResp.signatureReference,
              };
            }
          } catch (sigErr) {
            console.error("[CompanyProfileModal] Signature upload error:", sigErr);
            const sigMsg = getCompanyProfileErrorMessage(
              sigErr,
              "Failed to upload signature image to backend."
            );
            showStatusToast(`Profile created, but signature upload failed: ${sigMsg}`, "warning");
          }
        }
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

        {/* Section: Authorized Signatory Signature (Optional) */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Authorized Signatory Signature (Optional)
            </h4>
            <span className="text-[11px] text-slate-400">Approved formats: PNG, JPG (max 2 MB)</span>
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            Upload an approved image of the authorized corporate signatory signature to appear on generated invoices and customer PDFs. Note: Displaying an image does not constitute digital signing or verified cryptographic approval; standard invoice review and approval workflows remain authoritative.
          </p>

          {!isFinanceExecutive && (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs text-amber-800 flex items-center gap-2">
              <span className="font-semibold">Role Restricted:</span> Uploading, replacing, or deleting corporate signature requires the <span className="font-mono font-bold">FINANCE_EXECUTIVE</span> role.
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start pt-1">
            {/* Left: Upload and Reference Input */}
            <div className="space-y-3">
              <div>
                <label htmlFor="signatureFile" className="text-xs font-semibold text-slate-700 block mb-1">
                  Upload Signature Image (PUT /signature)
                </label>
                <input
                  id="signatureFile"
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleSignatureFileChange}
                  disabled={submitting || !isFinanceExecutive}
                  className="block w-full text-xs text-slate-700 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-[#0A0082] file:text-white hover:file:bg-[#0A0082]/90 file:cursor-pointer cursor-pointer border border-slate-200 rounded-lg p-1 bg-white disabled:opacity-60 disabled:cursor-not-allowed"
                />
                {formErrors.signatureFile && (
                  <p className="mt-1 text-xs text-rose-500 font-medium">
                    {formErrors.signatureFile}
                  </p>
                )}
              </div>

              <FormInput
                label="Managed Signature Reference"
                name="signatureReference"
                value={formData.signatureReference}
                onChange={handleChange}
                error={formErrors.signatureReference}
                placeholder="https://storage.example.com/signatures/signatory.png"
                disabled={submitting || !isFinanceExecutive}
              />
            </div>

            {/* Right: Signature Preview Card */}
            <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-dashed border-slate-300 bg-white min-h-[120px] text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Signatory Preview
              </span>
              {signaturePreview ? (
                <div className="flex flex-col items-center space-y-2 w-full">
                  <div className="h-16 w-full flex items-center justify-center p-1.5 border border-slate-200 rounded bg-slate-50/70">
                    <img
                      src={signaturePreview}
                      alt="Signature Preview"
                      className="max-h-full max-w-[160px] object-contain"
                      onError={(e) => {
                        e.target.style.display = "none";
                      }}
                    />
                  </div>
                  {isFinanceExecutive && (
                    <button
                      type="button"
                      onClick={handleClearSignature}
                      disabled={submitting}
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium cursor-pointer"
                    >
                      Remove Signature
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 italic py-2">
                  No signature configured.
                  <span className="block text-[11px] not-italic text-slate-400 mt-0.5">
                    Clean placeholder will appear on invoices.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section: Default Invoice Content */}
        <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Default Invoice Content
            </h4>
            <span className="text-[11px] text-slate-400">
              Defaults for notes, terms, and payment instructions
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="notes" className="text-xs font-semibold text-slate-700">
                  Notes
                </label>
                <span className="text-[11px] text-slate-400">
                  {formData.notes?.length || 0}/5000
                </span>
              </div>
              <FormTextArea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Optional notes to display at the bottom of generated invoices..."
                rows={3}
                disabled={submitting}
              />
              {formErrors.notes && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{formErrors.notes}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="termsAndConditions" className="text-xs font-semibold text-slate-700">
                  Terms & Conditions
                </label>
                <span className="text-[11px] text-slate-400">
                  {formData.termsAndConditions?.length || 0}/10000
                </span>
              </div>
              <FormTextArea
                id="termsAndConditions"
                name="termsAndConditions"
                value={formData.termsAndConditions}
                onChange={handleChange}
                placeholder="Standard commercial and payment terms..."
                rows={4}
                disabled={submitting}
              />
              {formErrors.termsAndConditions && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{formErrors.termsAndConditions}</p>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="paymentInstructions" className="text-xs font-semibold text-slate-700">
                  Payment Instructions
                </label>
                <span className="text-[11px] text-slate-400">
                  {formData.paymentInstructions?.length || 0}/5000
                </span>
              </div>
              <FormTextArea
                id="paymentInstructions"
                name="paymentInstructions"
                value={formData.paymentInstructions}
                onChange={handleChange}
                placeholder="Bank account details, wire remittance instructions, or payment link..."
                rows={3}
                disabled={submitting}
              />
              {formErrors.paymentInstructions && (
                <p className="mt-1 text-xs text-rose-500 font-medium">{formErrors.paymentInstructions}</p>
              )}
            </div>
          </div>
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
