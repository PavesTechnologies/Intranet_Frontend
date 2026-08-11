import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import PageHeader from "../../../../components/ui/PageHeader";
import Breadcrumb from "../../../../components/Breadcrumb/Breadcrumb";
import Button from "../../../../components/Button/Button";
import LoadingSpinner from "../../../../components/LoadingSpinner";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import { getApiErrorMessage } from "../../utils/apiError";
import { AP_ROUTES } from "../../constants/routes";
import useVendorDetail from "../hooks/useVendorDetail";
import { useUpdateVendor } from "../hooks/useVendorMutations";
import VendorForm, { DEFAULT_VENDOR_FORM } from "../components/VendorForm";

/** Route: /accounts-payable/vendors/:vendorId/edit */
export default function VendorUpdatePage() {
  const { vendorId } = useParams();
  const navigate = useNavigate();

  const { vendor, isLoading, isError, error } = useVendorDetail(vendorId);
  const updateVendorMutation = useUpdateVendor(vendorId);

  const [formData, setFormData] = useState(DEFAULT_VENDOR_FORM);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!vendor) return;
    setFormData({
      vendor_name: vendor.vendor_name || "",
      vendor_code: vendor.vendor_code || "",
      country_id: vendor.country_id || "",
      payment_term_id: vendor.payment_term_id || "",
      currency_id: vendor.currency_id || "",
      pan_number: vendor.pan_number || "",
      phone_number: vendor.phone_number || "",
      email: vendor.email || "",
      status_id: vendor.status_id || "",
    });
  }, [vendor]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.vendor_name?.trim()) {
      setErrors({ vendor_name: "This field is required." });
      return;
    }

    try {
      await updateVendorMutation.mutateAsync({
        vendor_name: formData.vendor_name.trim(),
        vendor_code: formData.vendor_code?.trim() || null,
        country_id: formData.country_id ? Number(formData.country_id) : undefined,
        payment_term_id: formData.payment_term_id ? Number(formData.payment_term_id) : null,
        currency_id: formData.currency_id ? Number(formData.currency_id) : null,
        pan_number: formData.pan_number?.trim() || null,
        phone_number: formData.phone_number?.trim() || null,
        email: formData.email?.trim() || null,
        status_id: formData.status_id ? Number(formData.status_id) : undefined,
      });
      toast.success("Vendor updated.");
      navigate(AP_ROUTES.VENDOR_DETAIL(vendorId));
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update vendor."));
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <LoadingSpinner text="Loading vendor..." size="lg" />
      </div>
    );
  }

  if (isError || !vendor) {
    return (
      <div className="p-6">
        <PageHeader title="Update Vendor" />
        <div className="rounded-lg border border-gray-200 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-gray-700">
            {error?.status === 404 ? "Vendor not found" : "Something went wrong"}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            {error?.status === 404
              ? "This vendor doesn't exist or may have been removed."
              : getApiErrorMessage(error, "Unable to load this vendor right now.")}
          </p>
          <Button variant="outline" className="mt-4" onClick={() => navigate(AP_ROUTES.VENDOR_LIST)}>
            Back to Vendors
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb
        items={[
          { label: "Vendors", to: AP_ROUTES.VENDOR_LIST },
          { label: vendor.vendor_name, to: AP_ROUTES.VENDOR_DETAIL(vendorId) },
          { label: "Edit" },
        ]}
      />

      <PageHeader title={`Edit ${vendor.vendor_name}`} subtitle={`Vendor #${vendor.vendor_id}`} />

      <form onSubmit={handleSubmit} className="space-y-6">
        <PageCard>
          <PageCardContent>
            <VendorForm formData={formData} errors={errors} onChange={handleChange} mode="edit" />
          </PageCardContent>
        </PageCard>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate(AP_ROUTES.VENDOR_DETAIL(vendorId))}>
            Cancel
          </Button>
          <Button type="submit" loading={updateVendorMutation.isPending} loadingText="Saving...">
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
