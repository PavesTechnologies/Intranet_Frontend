"use client";
 
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { showStatusToast } from "../../../components/toastfy/toast.jsx";
import { ArrowLeft, User, MapPin, Check, X, Building, Wallet } from "lucide-react";
import { set } from "date-fns";
 
export default function HrProfileView() {
 
  const { user_uuid } = useParams();
  const navigate = useNavigate();
 
  const token = localStorage.getItem("token");
  const BASE_URL = import.meta.env.VITE_EMPLOYEE_ONBOARDING_URL;
 
  const tabs = ["overview", "education", "experience", "identity documents"];
 
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loadingDoc, setLoadingDoc] = useState(null);
 
  const [sectionStatus, setSectionStatus] = useState({
    overview: false,
    education: false,
    experience: false,
    "identity documents": false
  });
 
  const [docStatus, setDocStatus] = useState({});
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [finalLoading, setFinalLoading] = useState(false);
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectDocKey, setRejectDocKey] = useState(null);
  const [rejectRemarks, setRejectRemarks] = useState("");
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
 
  const getDocKey = (d, i) => d.document_uuid || d.file_path || `${i}`;
  const getDocType = (tab) => {
    switch (tab) {
      case "overview": return "personal";
      case "identity documents": return "identity";
      default: return tab;
    }
  };

  const verifyDocumentAPI = async ({
    document_uuid = null,
    doc_type,
    status,
    remarks = ""
  }) => {
    try {
      await axios.post(
        `${BASE_URL}/hr/verify-document`,
        {
          user_uuid,
          document_uuid,
          doc_type,
          status,
          remarks
        },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      return true;
    } catch (error) {
      console.error("Verification failed:", error);
      showStatusToast(error.response?.data?.message || "Verification failed", "error");
      return false;
    }
  };

  const handleApproveDocument = async (d, i) => {
    const key = getDocKey(d, i);
    const success = await verifyDocumentAPI({
      document_uuid: d.document_uuid || d.experience_uuid || null,
      doc_type: getDocType(activeTab),
      status: "Verified"
    });

    if (success) {
      setDocStatus(s => ({ ...s, [key]: true }));
      showStatusToast("Document verified", "success");
    }
  };

  useEffect(() => {
    (async () => {
 
      try {
 
        const res = await axios.get(`${BASE_URL}/hr/hr/${user_uuid}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
 
        setProfile(res.data);
        const status = res.data.offer?.offer_status;
        setVerificationStatus(status);
 
        if (status === "Verified") {
 
          setSectionStatus({
            overview: true,
            education: true,
            experience: true,
            "identity documents": true
          });
 
          const allDocs = {};
 
          [
            ...(res.data.education_documents || []),
            ...(res.data.identity_documents || []),
            ...(res.data.experience?.flatMap(e => e.documents || []) || [])
          ].forEach((d, i) => {
            allDocs[getDocKey(d, i)] = true;
          });
 
          setDocStatus(allDocs);
          setActiveTab("overview");

        } else {
          // Submitted → reset UI
          setSectionStatus({
            overview: false,
            education: false,
            experience: false,
            "identity documents": false
          });
 
          setDocStatus({});
          setActiveTab("overview");
        }
        /* restore saved verification */
 
 
        setLoadedFromStorage(true);
 
      } catch {
        showStatusToast("Failed to load profile", "error");
      } finally {
        setLoading(false);
      }
 
    })();
 
  }, [user_uuid]);



  /* open document */
  async function openFileInNewTab(url, key) {
 
    if (!url) return;
 
    setLoadingDoc(key);
 
    try {
 
      const res = await axios.get(`${BASE_URL}/hr/view_documents`, {
        params: { file_path: encodeURIComponent(url) },
        headers: { Authorization: `Bearer ${token}` }
      });
 
      const fileUrl = res.data.replace(/^"+|"+$/g, "");
 
      window.open(fileUrl, "_blank");
 
    } catch {
 
      showStatusToast("Failed to open document", "error");
 
    } finally {
 
      setLoadingDoc(null);
 
    }
 
  }
  const handleRejectDocument = async () => {

    if (!rejectRemarks.trim()) {
      showStatusToast("Please enter rejection remarks", "error");
      return;
    }

    const success = await verifyDocumentAPI({
      document_uuid: rejectDocKey,
      doc_type: getDocType(activeTab),
      status: "Rejected",
      remarks: rejectRemarks
    });

    if (success) {
      setDocStatus(s => ({
        ...s,
        [rejectDocKey]: {
          status: false,
          remarks: rejectRemarks
        }
      }));
      showStatusToast("Document rejected", "success");
    }

    setRejectModal(false);
    setRejectRemarks("");
    setRejectDocKey(null);
 
  };
 
  /* verify section */

  const verifySection = async () => {

    const currentDocs =
      activeTab === "education"
        ? profile.education_documents || []
        : activeTab === "experience"
          ? profile.experience?.flatMap(e => e.documents || []) || []
          : activeTab === "identity documents"
            ? profile.identity_documents || []
            : [];
 
    const allDocsDone =
      currentDocs.length === 0 ||
      currentDocs.every((d, i) => {
 
        const doc = docStatus[getDocKey(d, i)];
 
        if (typeof doc === "object") {
          return doc.status === true;
        }
 
        return doc === true;
 
      });
 
    if (!allDocsDone) {
      showStatusToast("Please verify all documents first", "error");
      return;
    }

    if (activeTab === "overview") {
      const types = ["personal", "address", "bank", "pf"];
      for (const type of types) {
        await verifyDocumentAPI({ doc_type: type, status: "Verified" });
      }
    }

    setSectionStatus(s => ({ ...s, [activeTab]: true }));
    showStatusToast(`${activeTab} section verified`, "success");

  };
 
  /* final verify */
 
  const allSectionsVerified = Object.values(sectionStatus).every(Boolean);
  const allDocsVerified =
    Object.values(docStatus).length > 0 &&
    Object.values(docStatus).every(d => {
      if (typeof d === "object") {
        return d.status === true;
      }
      return d === true;
    });
 
  const finalVerifyProfile = async () => {
 
    if (!allSectionsVerified || !allDocsVerified) {
 
      showStatusToast("Verify all sections & documents first", "error");
      return;
 
    }
 
    try {
 
      setFinalLoading(true);
 
      await axios.post(`${BASE_URL}/hr/verify-profile`,
        { user_uuid, status: "Verified" },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setVerificationStatus("Verified");
      setSectionStatus({
        overview: true,
        education: true,
        experience: true,
        "identity documents": true
      });
      const allDocs = {};
 
      [
        ...(profile.education_documents || []),
        ...(profile.identity_documents || []),
        ...(profile.experience?.flatMap(e => e.documents || []) || [])
      ].forEach((d, i) => {
        allDocs[getDocKey(d, i)] = true;
      });
 
      setDocStatus(allDocs);
      setShowConfirm(false);
      setShowSuccess(true);
 
      showStatusToast("Profile verified successfully", "success");
 
    } catch {
 
      showStatusToast("Final verification failed", "error");
 
    } finally {
 
      setFinalLoading(false);
 
    }
 
  };
 
  if (loading) return <CenteredMsg text="Loading profile..." />;
  if (!profile || !profile.offer)
    return <CenteredMsg text="Profile not found" error />;
 
  const {
    offer,
    personal_details,
    addresses,
    education_documents,
    experience,
    identity_documents,
    bank_details,
    pf_details
  } = profile;
 
  const groupedEducation = groupEducation(education_documents);
  const groupedExperience = groupExperience(experience);
  const groupedIdentity = groupIdentity(identity_documents);
 
  return (
 
    <div className="min-h-screen bg-[#f4f6fb]">
 
      <Header offer={offer} verificationStatus={verificationStatus} navigate={navigate} />
 
      {/* progress tracker */}
      <div className="max-w-6xl mx-auto mt-8 px-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <h2 className="text-sm font-bold text-gray-700">Verification Progress</h2>
                <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                  {Math.round((Object.values(sectionStatus).filter(Boolean).length / tabs.length) * 100)}% Complete
                </span>
              </div>
              <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500 ease-out"
                  style={{ width: `${(Object.values(sectionStatus).filter(Boolean).length / tabs.length) * 100}%` }}
                />
              </div>
            </div>
 
            <div className="flex flex-wrap gap-4 items-center">
              {tabs.map(t => (
                <div key={t} className="flex items-center gap-2 group">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm
                ${sectionStatus[t] ? "bg-emerald-500 text-white" : "bg-white border-2 border-gray-200 text-gray-400"}`}
                  >
                    {sectionStatus[t] ? <Check size={14} strokeWidth={3} /> : <span className="text-[10px] font-bold">{tabs.indexOf(t) + 1}</span>}
                  </div>
                  <span className={`text-xs font-medium capitalize ${sectionStatus[t] ? "text-gray-900" : "text-gray-400"}`}>
                    {t}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
 
      {/* navigation tabs */}
      <div className="max-w-6xl mx-auto px-6 mt-8">
        <div className="flex gap-8 border-b border-gray-200 overflow-x-auto no-scrollbar">
          {tabs.map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`pb-4 text-sm font-semibold capitalize whitespace-nowrap transition-all relative
            ${activeTab === t ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            >
              {t}
              {activeTab === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full animate-fadeIn" />
              )}
            </button>
          ))}
        </div>
      </div>
 
      {/* content */}
 
      <div className="max-w-6xl mx-auto p-6 space-y-6">
 
        {activeTab === "overview" && (
          <Section title="Personal & Contact Details" verified={sectionStatus.overview}>
            <div className="grid lg:grid-cols-2 gap-8">
              <div className="space-y-8">
                <ColorCard title="Identification & Profile" icon={<User size={18} />}>
                  <div className="flex flex-col">
                    <Info label="First Name" value={offer.first_name} />
                    <Info label="Last Name" value={offer.last_name} />
                    <Info label="Email Address" value={offer.email} />
                    <Info label="Mobile Number" value={offer.contact_number} />
                    <Info label="Date of Birth" value={personal_details?.date_of_birth} />
                    <Info label="Gender" value={personal_details?.gender} />
                    <Info label="Marital Status" value={personal_details?.marital_status} />
                    <Info label="Blood Group" value={personal_details?.blood_group} />
                    <Info label="Nationality" value={personal_details?.nationality} />
                    <Info label="Current Residence" value={personal_details?.residence} />
                  </div>
                </ColorCard>
 
                <ColorCard title="Emergency Contact" icon={<User size={18} />}>
                  <div className="flex flex-col">
                    <Info label="Contact Name" value={personal_details?.emergency_contact_name} />
                    <Info label="Phone Number" value={personal_details?.emergency_contact_phone} />
                    <Info label="Relationship" value={personal_details?.emergency_contact_relation} />
                  </div>
                </ColorCard>
 
                <ColorCard title="Bank Details" icon={<Building size={18} />}>
                  <div className="flex flex-col">
                    <Info label="Account Holder" value={bank_details?.account_holder_name} />
                    <Info label="Bank Name" value={bank_details?.bank_name} />
                    <Info label="Branch Name" value={bank_details?.branch_name} />
                    <Info label="Account Number" value={bank_details?.account_number} />
                    <Info label="IFSC Code" value={bank_details?.ifsc_code} />
                    <Info label="Account Type" value={bank_details?.account_type} />
                  </div>
                </ColorCard>
              </div>
 
              <div className="space-y-8">
                <ColorCard title="Address Details" icon={<MapPin size={18} />}>
                  <div className="space-y-6">
                    {addresses?.map((a, idx) => (
                      <div key={a.address_uuid || idx} className={`space-y-1 ${idx !== 0 ? "pt-4 border-t border-gray-100" : ""}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded uppercase">
                            {a.address_type} Address
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <Info label="Line 1" value={a.address_line1} />
                          <Info label="Line 2" value={a.address_line2} />
                          <Info label="City/Town" value={a.city} />
                          <Info label="District/Ward" value={a.district_or_ward} />
                          <Info label="State/Region" value={a.state_or_region} />
                          <Info label="Postal Code" value={a.postal_code} />
                          <Info label="Country" value={a.country} />
                        </div>
                      </div>
                    ))}
                  </div>
                </ColorCard>
 
                <ColorCard title="PF Details" icon={<Wallet size={18} />}>
                  <div className="flex flex-col">
                    <Info label="PF Member" value={pf_details?.pf_member !== undefined ? (pf_details?.pf_member ? "Yes" : "No") : ""} />
                    <Info label="UAN Number" value={pf_details?.uan_number} />
                  </div>
                </ColorCard>
              </div>
            </div>
          </Section>
        )}
 
        {activeTab === "education" &&
          Object.values(groupedEducation).map((edu, i) => (
 
            <Section key={i} title={edu.title} verified={sectionStatus.education}>
              <div>
                <p><b>Degree:</b> {edu.degree_name}</p>
                <p><b>Institution:</b> {edu.institution}</p>
                <p><b>Institution Location:</b> {edu.institute_location}</p>
                <p><b>Specialization:</b> {edu.specialization}</p>
                <p><b>Education Mode:</b> {edu.education_mode}</p>
                <p><b>Start Year:</b> {edu.start_year}</p>
                <p><b>Year of Passing:</b> {edu.year}</p>
                <p><b>Percentage / CGPA:</b> {edu.percentage_cgpa}</p>
 
                {edu.delay_reason && (
                  <p><b>Delay Reason:</b> {edu.delay_reason}</p>
                )}
              </div>
 
              <DocCard
                documents={edu.documents}
                docStatus={docStatus}
                onApprove={(d, idx) => handleApproveDocument(d, idx)}
                onView={openFileInNewTab}
                setRejectDocKey={setRejectDocKey}
                setRejectModal={setRejectModal}
                verificationStatus={verificationStatus}
                loadingDoc={loadingDoc}
              />
 
            </Section>
 
          ))}
 
        {activeTab === "experience" &&
          Object.values(groupedExperience).map((exp, i) => (
 
            <Section key={i} title={exp.title} verified={sectionStatus.experience}>
 
              <div className="text-sm text-gray-600 mb-3">
                <p><b>Company:</b> {exp.company_name}</p>
                <p><b>Role:</b> {exp.role_title}</p>
                <p><b>Employment:</b> {exp.employment_type}</p>
                <p><b>Start:</b> {exp.start_date}</p>
                <p><b>End:</b> {exp.end_date || "Current"}</p>
                <p><b>Notice period day:</b> {exp.notice_period_days}days</p>
              </div>
 
              <DocCard documents={exp.documents}
                docStatus={docStatus}
                onApprove={(d, idx) => handleApproveDocument(d, idx)}
                onView={openFileInNewTab}
                setRejectDocKey={setRejectDocKey}
                setRejectModal={setRejectModal}
                verificationStatus={verificationStatus}
                loadingDoc={loadingDoc}
              />
 
            </Section>
 
          ))}
 
        {activeTab === "identity documents" &&
          Object.values(groupedIdentity).map((doc, i) => (
 
            <Section key={i} title={doc.title} verified={sectionStatus["identity documents"]}>
 
 
 
              <DocCard documents={doc.documents}
                docStatus={docStatus}
                onApprove={(d, idx) => handleApproveDocument(d, idx)}
                onView={openFileInNewTab}
                setRejectDocKey={setRejectDocKey}
                setRejectModal={setRejectModal}
                verificationStatus={verificationStatus}
                loadingDoc={loadingDoc}
              />
            </Section>
 
          ))}
 
        {/* bottom navigation */}
        <div className="max-w-6xl mx-auto px-6 pb-20 mt-10">
          <div className="flex items-center justify-between p-6 bg-white rounded-2xl border border-gray-100 shadow-lg shadow-gray-200/50">
            <button
              disabled={activeTab === "overview"}
              onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) - 1])}
              className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent transition-all"
            >
              <ArrowLeft size={16} /> Previous
            </button>
 
            <div className="flex items-center gap-4">
              {!sectionStatus[activeTab] && verificationStatus !== "Verified" && (
                <button
                  onClick={verifySection}
                  className="flex items-center gap-2 px-8 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all transform active:scale-95"
                >
                  <Check size={18} strokeWidth={3} /> Verify {activeTab === "identity documents" ? "Documents" : activeTab}
                </button>
              )}
 
              {activeTab !== "identity documents" ? (
                <button
                  onClick={() => setActiveTab(tabs[tabs.indexOf(activeTab) + 1])}
                  className="px-10 py-3 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all transform active:scale-95"
                >
                  Continue Next
                </button>
              ) : (
                <button
                  onClick={() => setShowConfirm(true)}
                  disabled={verificationStatus === "Verified"}
                  className="px-10 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 shadow-lg shadow-gray-300 disabled:opacity-30 transition-all transform active:scale-95"
                >
                  Final Verification
                </button>
              )}
            </div>
 
            <div className="w-[120px] hidden md:block" />
          </div>
        </div>
 
      </div>
 
 
 
      {/* confirm modal */}
      {showConfirm && (
        <Modal>
          <div className="flex flex-col items-center gap-6">
            <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Check size={32} strokeWidth={2.5} />
            </div>
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Final Verification</h2>
              <p className="text-sm text-gray-500 mt-1">Are you sure you want to verify this candidate's profile? This action is permanent.</p>
            </div>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50 transition-all font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={finalVerifyProfile}
                className="flex-1 px-4 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-all font-semibold"
              >
                {finalLoading ? "Verifying..." : "Confirm Verify"}
              </button>
            </div>
          </div>
        </Modal>
      )}
 
      {showSuccess && (
        <Modal>
          <div className="flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center animate-bounce">
              <Check size={40} strokeWidth={3} />
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-gray-900">Profile Verified!</h2>
              <p className="text-sm text-gray-500 mt-2">The candidate's profile has been successfully verified and processed.</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="w-full px-6 py-3 bg-gray-900 text-white text-sm font-bold rounded-xl hover:bg-gray-800 transition-all"
            >
              Return to Dashboard
            </button>
          </div>
        </Modal>
      )}
 
      {rejectModal && (
        <Modal>
          <div className="flex flex-col gap-5">
            <div className="text-center">
              <h2 className="text-xl font-bold text-gray-900">Reject Document</h2>
              <p className="text-sm text-gray-500 mt-1">Please provide a clear reason for rejecting this document.</p>
            </div>
 
            <textarea
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="e.g., Document is blurry, Expired identity proof..."
              className="border border-gray-200 rounded-xl w-full p-4 mt-1 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all outline-none min-h-[120px]"
            />
 
            <div className="flex gap-3">
              <button
                onClick={() => setRejectModal(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 text-sm font-bold rounded-xl hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectDocument}
                className="flex-1 px-4 py-3 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200"
              >
                Reject
              </button>
            </div>
          </div>
        </Modal>
      )}
 
    </div>
 
  );
 
}
 
/* components */
 
const Header = ({ offer, verificationStatus, navigate }) => (
  <header className="bg-white border-b sticky top-0 z-30">
    <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600"
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center text-lg font-bold shadow-md">
          {offer.first_name?.[0]}
          {offer.last_name?.[0]}
        </div>
        <div>
          <h1 className="text-lg font-bold text-gray-900 leading-tight">
            {offer.first_name} {offer.last_name}
          </h1>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>{offer.designation}</span>
 
 
          </div>
        </div>
      </div>
 
      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Status</p>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold mt-0.5 ${verificationStatus === "Verified"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-amber-100 text-amber-700"
            }`}>
            {verificationStatus || "Pending Verification"}
          </span>
        </div>
      </div>
    </div>
  </header>
);
 
const DocCard = ({
  documents = [],
  onView,
  docStatus,
  onApprove,
  setRejectDocKey,
  setRejectModal,
  verificationStatus,
  loadingDoc
}) => (
  <div className="grid gap-4">
    {documents.map((d, i) => {
      const key = d.document_uuid || d.file_path || `${i}`;
      const statusData = docStatus[key];
      const isVerified = typeof statusData === "object" ? statusData.status === true : statusData === true;
      const remarks = typeof statusData === "object" ? statusData.remarks : null;
 
      return (
        <div key={key} className="group border border-gray-100 rounded-xl p-5 flex flex-col sm:flex-row justify-between sm:items-center bg-white transition-all hover:border-indigo-100 hover:shadow-sm">
          <div className="flex gap-4 items-center">
            <div className={`p-3 rounded-lg flex items-center justify-center ${isVerified ? "bg-emerald-50 text-emerald-600" : "bg-indigo-50 text-indigo-600"}`}>
              <User size={20} />
            </div>
            <div>
              <p className="font-bold text-gray-900 text-base">
                {d.document_name || d.doc_type || d.identity_type}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-1.5 items-center">
                {d.identity_file_number && (
                  <div className="flex items-center gap-2 px-2 py-1 bg-indigo-50 border border-indigo-100 rounded-md">
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-tight">
                      {/aadhar|aadhaar/i.test(d.identity_type || "") ? "Aadhar Number" : "ID Number"}
                    </span>
                    <span className="text-sm font-bold text-indigo-900 tabular-nums">
                      {d.identity_file_number}
                    </span>
                  </div>
                )}
                {d.uploaded_at && (
                  <p className="text-xs text-gray-400 font-medium whitespace-nowrap">
                    Uploaded: {new Date(d.uploaded_at).toLocaleDateString()}
                  </p>
                )}
              </div>
              {remarks && (
                <div className="mt-2 flex items-start gap-1 p-2 bg-red-50 rounded text-red-700 border border-red-100">
                  <X size={14} className="mt-0.5 shrink-0" />
                  <p className="text-[11px] font-medium leading-normal">Rejection Reason: {remarks}</p>
                </div>
              )}
            </div>
          </div>
 
          <div className="flex items-center gap-4 mt-4 sm:mt-0 justify-end border-t sm:border-t-0 pt-3 sm:pt-0">
            <button
              onClick={() => onView(d.file_path, key)}
              className={`text-xs font-bold px-4 py-2 rounded-lg transition-all ${loadingDoc === key ? "bg-gray-100 text-gray-400" : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                }`}
              disabled={loadingDoc === key}
            >
              {loadingDoc === key ? "Opening..." : "View Document"}
            </button>
 
            <div className="flex items-center gap-2 border-l border-gray-100 pl-4 ml-2">
              {verificationStatus === "Verified" || isVerified ? (
                <div className="flex items-center gap-1.5 text-emerald-600">
                  <Check size={18} strokeWidth={3} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">Verified</span>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onApprove(d, i)}
                    className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                    title="Approve"
                  >
                    <Check size={20} strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={() => {
                      setRejectDocKey(key);
                      setRejectModal(true);
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                    title="Reject"
                  >
                    <X size={20} strokeWidth={2.5} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      );
    })}
  </div>
);
 
const Modal = ({ children }) => (
  <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
    <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border border-gray-100 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />
      {children}
    </div>
  </div>
);
 
const Section = ({ title, children, verified }) => (
  <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm space-y-4 transition-all hover:shadow-md">
    <div className="flex justify-between items-center pb-2 border-b border-gray-50">
      <h3 className="font-bold text-xl text-gray-900 tracking-tight">{title}</h3>
      {verified && (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold border border-emerald-100">
          <Check size={14} strokeWidth={3} /> Verified
        </span>
      )}
    </div>
    <div className="animate-fadeIn">{children}</div>
  </div>
);
 
const ColorCard = ({ title, icon, children }) => (
  <div className="bg-gray-50/50 rounded-2xl p-5 border border-gray-100 shadow-sm transition-all hover:bg-white hover:shadow-md">
    <div className="flex items-center gap-2 mb-3">
      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
        {icon}
      </div>
      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-widest">{title}</h4>
    </div>
    <div>{children}</div>
  </div>
);
 
const Info = ({ label, value }) => (
  <div className="flex items-center gap-4 py-1 border-b border-gray-50/50 last:border-0 group/info transition-all duration-200">
    <div className="w-1/3 min-w-[140px] shrink-0">
      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{label}</span>
    </div>
    <div className="flex items-center gap-2 flex-1">
      <span className="text-gray-300 font-normal">:</span>
      <p className="text-sm font-medium text-gray-800 break-words" title={value || "—"}>
        {value || <span className="text-gray-300 font-normal italic">Not provided</span>}
      </p>
    </div>
  </div>
);
 
const CenteredMsg = ({ text, error }) => (
  <div className={`p-20 text-center ${error ? "text-red-600" : ""}`}>
    {text}
  </div>
);
 
/* grouping */
const groupEducation = (l = []) =>
  l.reduce((a, e) => {
 
    const k = `${e.education_level} - ${e.specialization}`;
 
    a[k] ||= {
      title: k,
      degree_name: e.degree_name,
      institution: e.institution_name,
      institute_location: e.institute_location,
      specialization: e.specialization,
      education_mode: e.education_mode,
      start_year: e.start_year,
      year: e.year_of_passing,
      percentage_cgpa: e.percentage_cgpa,
      delay_reason: e.delay_reason,
      documents: []
    };
 
    a[k].documents.push(e);
 
    return a;
 
  }, {});
 
const groupExperience = (l = []) =>
  l.reduce((a, e) => {
 
    const k = `${e.company_name} - ${e.role_title}`;
 
    a[k] ||= {
      title: k,
      company_name: e.company_name,
      role_title: e.role_title,
      employment_type: e.employment_type,
      start_date: e.start_date,
      end_date: e.end_date,
      notice_period_days: e.notice_period_days,
      documents: []
    };

    a[k].documents.push(
      ...(e.documents || []).map((d) => ({ ...d, experience_uuid: e.experience_uuid }))
    );

    return a;
 
  }, {});
 
const groupIdentity = (l = []) =>
  l.reduce((a, d) => {
 
    a[d.identity_type] ||= { title: d.identity_type, documents: [] };
 
    a[d.identity_type].documents.push(d);
 
    return a;
 
  }, {});
 
