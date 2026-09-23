import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  FileText,
  Edit3,
  Plus,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

import PageHeader from "../../../../components/ui/PageHeader";
import { PageCard, PageCardContent } from "../../../../components/Cards/PageCard";
import Button from "../../../../components/Button/Button";
import Loader from "../../../../components/ui/Loader";
import StatusBadge from "../../../../components/status/statusbadge";
import BackIconButton from "../../components/common/BackIconButton";
import { showStatusToast } from "../../../../components/toastfy/toast";
import CompanyProfileModal from "../../components/master-data/CompanyProfileModal";
import {
  getActiveCompanyProfile,
  getCompanyProfileErrorMessage,
} from "../../services/companyProfileService";

export default function CompanyProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchProfile = async (isManual = false) => {
    if (isManual) setLoading(true);
    setErrorMsg("");

    try {
      const data = await getActiveCompanyProfile();
      setProfile(data);
      if (isManual) {
        showStatusToast("Company profile refreshed.", "success");
      }
    } catch (err) {
      console.error("[CompanyProfilePage] Fetch error:", err);
      const msg = getCompanyProfileErrorMessage(err, "Failed to load company profile.");
      setErrorMsg(msg);
      showStatusToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaved = (updatedProfile) => {
    if (updatedProfile) {
      setProfile(updatedProfile);
    }
    fetchProfile();
  };

  return (
    <div className="w-full space-y-6">
      {/* Header & Back Navigation */}
      <div className="flex items-center gap-3">
        <BackIconButton
          onClick={() => navigate("/account-receivable/master-data")}
          label="Back to Configurations"
        />
        <div className="flex-1">
          <PageHeader
            title="Seller Information / Company Profile"
            subtitle="Manage your organization's legal seller identity, tax credentials, and registered office details for AR invoices."
          />
        </div>
        {profile && (
          <Button
            variant="primary"
            size="small"
            onClick={() => setIsModalOpen(true)}
            className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white font-semibold flex items-center gap-1.5"
          >
            <Edit3 className="h-4 w-4" /> Edit Profile
          </Button>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex h-72 items-center justify-center">
          <Loader size="lg" text="Loading company profile..." />
        </div>
      )}

      {/* Error State */}
      {!loading && errorMsg && !profile && (
        <PageCard>
          <PageCardContent className="p-8 text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">Unable to Load Company Profile</h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">{errorMsg}</p>
            </div>
            <Button
              variant="outline"
              size="small"
              onClick={() => fetchProfile(true)}
              className="flex items-center gap-1.5 mx-auto"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
          </PageCardContent>
        </PageCard>
      )}

      {/* Empty State: No Profile Configured */}
      {!loading && !errorMsg && !profile && (
        <PageCard>
          <PageCardContent className="p-10 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0A0082]/10 text-[#0A0082]">
              <Building2 className="h-7 w-7" />
            </div>
            <div className="space-y-1.5 max-w-lg mx-auto">
              <span className="text-xs font-bold uppercase tracking-wider text-[#0A0082]">
                Seller Information
              </span>
              <h3 className="text-lg font-bold text-slate-800">No company profile has been configured yet.</h3>
              <p className="text-xs leading-relaxed text-slate-500">
                Configure the seller information used on AR invoices.
              </p>
            </div>
            <Button
              variant="primary"
              size="small"
              onClick={() => setIsModalOpen(true)}
              className="bg-[#0A0082] hover:bg-[#0A0082]/90 text-white font-semibold flex items-center gap-1.5 mx-auto"
            >
              <Plus className="h-4 w-4" /> Configure Company Profile
            </Button>
          </PageCardContent>
        </PageCard>
      )}

      {/* Existing Profile View */}
      {!loading && profile && (
        <div className="space-y-6">
          {/* Main Organization Overview Card */}
          <PageCard>
            <PageCardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-slate-100 border border-slate-200 overflow-hidden text-slate-400">
                    {profile.logoReference ? (
                      <img
                        src={profile.logoReference}
                        alt="Company Logo"
                        className="h-full w-full object-contain p-1"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <Building2 className="h-8 w-8 text-[#0A0082]" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <h2 className="text-xl font-bold text-slate-900">{profile.legalName}</h2>
                      <StatusBadge label="ACTIVE" />
                    </div>
                    <p className="text-xs text-slate-500">
                      Authoritative seller entity configured for Account Receivable billing and invoices.
                    </p>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setIsModalOpen(true)}
                  className="flex items-center gap-1.5 self-start md:self-auto"
                >
                  <Edit3 className="h-3.5 w-3.5" /> Edit Details
                </Button>
              </div>

              {/* Structured Attribute Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6">
                {/* Registration & Tax */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <FileText className="h-4 w-4 text-indigo-600" />
                    Tax & Registration
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3.5 space-y-2.5 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">GSTIN / Tax ID</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {profile.gstin || <span className="italic text-slate-400">Not provided</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Jurisdiction / State</span>
                      <span className="font-semibold text-slate-800">
                        {profile.state || <span className="italic text-slate-400">Not provided</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Mail className="h-4 w-4 text-teal-600" />
                    Contact Information
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3.5 space-y-2.5 border border-slate-200 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Business Email</span>
                      <span className="font-semibold text-slate-800 break-all">
                        {profile.email || <span className="italic text-slate-400">Not provided</span>}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Phone Number</span>
                      <span className="font-semibold text-slate-800">
                        {profile.phone || <span className="italic text-slate-400">Not provided</span>}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Registered Address */}
                <div className="space-y-3 md:col-span-2 lg:col-span-1">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <MapPin className="h-4 w-4 text-rose-600" />
                    Registered Office Address
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3.5 space-y-1.5 border border-slate-200 text-xs leading-relaxed">
                    <p className="font-semibold text-slate-800">{profile.addressLine1}</p>
                    {profile.addressLine2 && <p className="text-slate-600">{profile.addressLine2}</p>}
                    <p className="text-slate-600">
                      {[profile.city, profile.state].filter(Boolean).join(", ")}
                      {profile.postalCode ? ` - ${profile.postalCode}` : ""}
                    </p>
                    <p className="font-medium text-slate-700">{profile.country}</p>
                  </div>
                </div>
              </div>
            </PageCardContent>
          </PageCard>

          {/* Context Notice */}
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 space-y-0.5">
              <p className="font-bold">Active Organization Seller Profile</p>
              <p className="text-indigo-800/80 leading-relaxed">
                This profile is used across Invoice Generation, customer invoice PDFs, and Send to Client workflows. Historical invoices retain their original snapshot and are not altered by edits to this profile.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal Form */}
      <CompanyProfileModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={profile}
        onSaved={handleSaved}
      />
    </div>
  );
}
