import React, { useState, useEffect } from "react";
import LargeModal from "./LargeModal";
import Tabs from "./Tabs";
import ProfileForm from "./ProfileForm";
import JobForm from "./JobForm";
import Button from "../../../../components/Button/Button";
import { showStatusToast } from "../../../../components/toastfy/toast";
import { EditIcon } from "../../../../components/icons/ActionIcons";

const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";

  const dateString = String(dateValue).trim();
  const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const parsedDate = new Date(dateString);

  if (Number.isNaN(parsedDate.getTime())) return "";

  return parsedDate.toISOString().slice(0, 10);
};

const getArrayPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.employees)) return payload.employees;
  if (Array.isArray(payload?.employee_details)) return payload.employee_details;
  if (Array.isArray(payload?.core_employee_details)) {
    return payload.core_employee_details;
  }
  if (payload?.data && typeof payload.data === "object") {
    return getArrayPayload(payload.data);
  }
  return [];
};

const getEmployeeId = (employee) =>
  String(
    employee?.employee_id ||
      employee?.employeeId ||
      employee?.emp_id ||
      employee?.empId ||
      "",
  ).trim();

const getEmployeeFullName = (employee) =>
  String(
    employee?.full_name ||
      employee?.fullName ||
      employee?.employee_name ||
      employee?.employeeName ||
      employee?.name ||
      [
        employee?.first_name || employee?.firstName,
        employee?.middle_name || employee?.middleName,
        employee?.last_name || employee?.lastName,
      ]
        .filter(Boolean)
        .join(" "),
  ).trim();

const resolveManagerOptionValue = (value, managerOptions = []) => {
  const normalizedValue = String(value || "").trim();
  if (!normalizedValue) return "";

  const manager = managerOptions.find((option) => {
    const optionValue = String(option.value || "").trim();
    const optionLabel = String(option.label || "").trim();
    const optionName = String(option.name || "").trim();

    return (
      optionValue === normalizedValue ||
      optionLabel === normalizedValue ||
      optionName === normalizedValue
    );
  });

  return manager?.value || normalizedValue;
};

export default function EmployeeCreateModal({
  isOpen,
  onClose,
  userUuid,
  employeeUuid,
  firstName,
  middleName,
  lastName,
}) {
  const [activeTab, setActiveTab] = useState("Profile");
  const [form, setForm] = useState({});
  const [isGenerated, setIsGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);
  const [isProfileEditable, setIsProfileEditable] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  
  const isEditMode = !!employeeUuid;

  const fetchDepartments = async () => {
    try {
      const res = await fetch(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await res.json();
      setDepartments(Array.isArray(data) ? data : data.data || []);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchDesignations = async (departmentUuid) => {
    try {
      const res = await fetch(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/designations/department/${departmentUuid}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await res.json();
      setDesignations(data);
    } catch (err) {
      console.error("Failed to fetch designations", err);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await fetch(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = await res.json();
      const managers = getArrayPayload(data)
        .map((employee) => {
          const employeeId = getEmployeeId(employee);
          const fullName = getEmployeeFullName(employee);

          if (!employeeId || !fullName) return null;

          return {
            label: fullName,
            value: employeeId,
            name: fullName,
          };
        })
        .filter(Boolean);

      setManagerOptions(managers);
    } catch (err) {
      console.error("Failed to fetch managers", err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;

    setActiveTab("Profile");
    setError("");
    setIsProfileEditable(false);
    fetchDepartments();
    fetchManagers();
  }, [isOpen]);

  useEffect(() => {
    if (!employeeUuid) return;

    const fetchEmployee = async () => {
      try {
        const res = await fetch(
          `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/${employeeUuid}`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          },
        );

        const data = await res.json();
        const matchedUserUuid = data.user_uuid || userUuid;
        let offerLetter = null;

        try {
          const offerRes = await fetch(
            `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/offer/${matchedUserUuid}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );

          if (offerRes.ok) {
            offerLetter = await offerRes.json();
            // const offerData = await offerRes.json();
            // offerLetter = getArrayPayload(offerData).find(
            //   (offer) => String(offer.user_uuid) === String(matchedUserUuid),
            // );
          }
        } catch (offerError) {
          console.error("Failed to fetch offer letter details", offerError);
        }

        let personalDetails = null;

try {
  const personalListRes = await fetch(
    `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/employee-details`,
    {
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    },
  );

  if (personalListRes.ok) {
    const personalListData =
      await personalListRes.json();

    const personalRecords = Array.isArray(personalListData)
      ? personalListData
      : getArrayPayload(personalListData);

    personalDetails = personalRecords.find(
      (item) =>
        String(item.user_uuid).trim() ===
        String(matchedUserUuid).trim()
    );

    if (!personalDetails) {
      console.warn(
        "No personal details found for user:",
        matchedUserUuid
      );
    }
  }
} catch (personalError) {
  console.error(
    "Failed to fetch personal details",
    personalError
  );
}

        const reportingManagerValue =
          offerLetter?.reporting_manager || data.reporting_manager_uuid || "";

        setForm((prev) => ({
          ...prev,
          userUuid: data.user_uuid,
          empId: data.employee_id,
          email: data.work_email,
          empFirstName: data.first_name,
          empMiddleName: data.middle_name,
          empLastName: data.last_name,
          empDob: personalDetails?.date_of_birth || data.date_of_birth || "",
          contact: data.contact_number,
          departmentUuid: data.department_uuid,
          designationUuid: data.designation_uuid,
          reportingManagerUuid: resolveManagerOptionValue(
            reportingManagerValue,
            managerOptions,
          ),
          employeeType:
            offerLetter?.employee_type || data.employee_type || data.employment_type,
          joiningDate: formatDateForInput(
            offerLetter?.joining_date || data.joining_date,
          ),
          location: data.location,
          workMode: data.work_mode,
          employmentStatus: data.employment_status,
          bloodGroup: personalDetails?.blood_group || data.blood_group || "",
          gender: personalDetails?.gender || data.gender || "",
          maritalStatus: personalDetails?.marital_status || data.marital_status || "",
          emergencyContactName: personalDetails?.emergency_contact_name || "",
          emergencyContactNumber: personalDetails?.emergency_contact_phone || "",
          totalExperience: data.total_experience,
        }));

        fetchDesignations(data.department_uuid);
      } catch (error) {
        console.error("Failed to fetch employee", error);
      }
    };

    fetchEmployee();
  }, [employeeUuid, managerOptions, userUuid]);

  useEffect(() => {
    if (!managerOptions.length) return;

    setForm((prev) => {
      const resolvedManagerId = resolveManagerOptionValue(
        prev.reportingManagerUuid,
        managerOptions,
      );

      if (!resolvedManagerId || resolvedManagerId === prev.reportingManagerUuid) {
        return prev;
      }

      return {
        ...prev,
        reportingManagerUuid: resolvedManagerId,
      };
    });
  }, [managerOptions]);

  useEffect(() => {
    if (!userUuid || isEditMode) return;

    setForm({
      userUuid,
      empFirstName: firstName || "",
      empMiddleName: middleName || "",
      empLastName: lastName || "",
      empDob: "",
      contact: "",
      gender: "",
      bloodGroup: "",
      maritalStatus: "",
      emergencyContactName: "",
      emergencyContactNumber: "",
    });
    setIsGenerated(false);
  }, [userUuid, firstName, middleName, lastName, isEditMode]);

  useEffect(() => {
    setIsGenerated(!!employeeUuid);
  }, [employeeUuid]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "departmentUuid") {
      fetchDesignations(value);
    }
  };

  const handleGenerate = async () => {
    try {
      setLoading(true);
      setError("");

      if (
        !form.empFirstName ||
        !form.empLastName ||
        !form.empDob ||
        !form.gender ||
        !form.bloodGroup ||
        !form.maritalStatus ||
        !form.contact ||
        !form.departmentUuid ||
        !form.designationUuid ||
        !form.employeeType ||
        !form.joiningDate ||
        !form.employmentStatus ||
        !form.emergencyContactName ||
        !form.emergencyContactNumber
      ) {
        setError("Please fill all required Profile fields.");
        showStatusToast("Please fill all required fields", "info");
        return;
      }

      const response = await fetch(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify({
            user_uuid: userUuid,
            first_name: form.empFirstName,
            middle_name: form.empMiddleName || "",
            last_name: form.empLastName || "",
            date_of_birth: form.empDob,
            contact_number: form.contact,
            department_uuid: form.departmentUuid,
            designation_uuid: form.designationUuid,
            reporting_manager_uuid: form.reportingManagerUuid || "",
            employment_type: form.employeeType || "Full-Time",
            joining_date: form.joiningDate,
            location: form.location || "",
            work_mode: form.workMode || "Office",
            employment_status: form.employmentStatus || "Probation",
            blood_group: form.bloodGroup || "",
            gender: form.gender || "",
            marital_status: form.maritalStatus || "",
            total_experience: Number(form.totalExperience) || 0,
          }),
        },
      );

      if (response.status === 422) {
        setError("Validation error. Please check required fields.");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to create employee");
      }

      const data = await response.json();

      setForm((prev) => ({
        ...prev,
        employeeUuid: data.employee_uuid,
        empId: data.employee_id,
        email: data.work_email,
      }));

      setIsGenerated(true);
      showStatusToast("Employee crentials generated successfully", "success");
    } catch (err) {
      console.error(err);
      setError("Something went wrong while creating employee.");
      showStatusToast("Failed to generate employee credentials", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async ({ closeAfterSave = true } = {}) => {
    try {
      const payload = {
        first_name: form.empFirstName,
        middle_name: form.empMiddleName || "",
        last_name: form.empLastName,
        date_of_birth: form.empDob,
        contact_number: form.contact,
        department_uuid: form.departmentUuid,
        designation_uuid: form.designationUuid,
        reporting_manager_uuid: form.reportingManagerUuid || null,
        employment_type: form.employeeType,
        joining_date: form.joiningDate,
        location: form.location || "",
        work_mode: form.workMode || "",
        employment_status: form.employmentStatus,
        blood_group: form.bloodGroup || "",
        gender: form.gender || "",
        marital_status: form.maritalStatus || "",
        emergency_contact_name: form.emergencyContactName || "",
        emergency_contact_phone:form.emergencyContactNumber || "",
        total_experience: Number(form.totalExperience) || 0,
      };

      const response = await fetch(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/${employeeUuid}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error("Update failed");
      }

      showStatusToast("Employee updated successfully", "success");
      if (closeAfterSave) {
        onClose();
      }
      return true;
    } catch (err) {
      console.error(err);
      showStatusToast("Failed to update employee", "error");
      return false;
    }
  };

  const handleToggleProfileEdit = () => {
    setIsProfileEditable((prev) => !prev);
  };

  const handleSaveProfileChanges = async () => {
    try {
      setSavingProfile(true);
      const saved = await handleUpdate({ closeAfterSave: false });
      if (saved) {
        setIsProfileEditable(false);
      }
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <LargeModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? "Update Employee" : "Create Employee"}
      subtitle="Fill out the form to create a new employee profile."
    >
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {activeTab === "Profile" && (
        <>
          {isEditMode && (
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Profile Details
                </h3>
                <p className="text-xs text-slate-500">
                  Review and update employee profile details.
                </p>
              </div>

              <Button
                type="button"
                onClick={handleToggleProfileEdit}
                variant="outline"
                size="small"
                className="rounded-xl px-3 py-2"
              >
                <EditIcon size={14} />
                {isProfileEditable ? "Cancel Edit" : "Edit"}
              </Button>
            </div>
          )}

          <ProfileForm
            form={form}
            handleChange={handleChange}
            isGenerated={isGenerated}
            isEditMode={isEditMode}
            isProfileEditable={isProfileEditable}
          />
          <div className="flex justify-end gap-3 mt-6">
            {isEditMode && isProfileEditable && (
              <Button
                variant="outline"
                size="small"
                onClick={handleSaveProfileChanges}
                loading={savingProfile}
                loadingText="Saving..."
              >
                Save Changes
              </Button>
            )}

            <Button
              variant="primary"
              size="small"
              onClick={() => setActiveTab("Job")}
            >
              Next
            </Button>
          </div>
        </>
      )}

      {activeTab === "Job" && (
        <>
          <JobForm
            form={form}
            handleChange={handleChange}
            departments={departments}
            designations={designations}
            managerOptions={managerOptions}
            isEditMode={isEditMode}
          />

          <div className="flex justify-end gap-3 mt-6">
            {!isEditMode && !isGenerated && (
              <Button
                variant="primary"
                size="small"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? "Generating..." : "Generate Credentials"}
              </Button>
            )}

            {!isEditMode && isGenerated && (
              <>
                <Button variant="secondary" size="small" onClick={onClose}>
                  Cancel
                </Button>

                <Button variant="primary" size="small" onClick={onClose}>
                  Save
                </Button>
              </>
            )}

            {isEditMode && (
              <>
                <Button variant="secondary" size="small" onClick={onClose}>
                  Cancel
                </Button>

                <Button variant="primary" size="small" onClick={handleUpdate}>
                  Update
                </Button>
              </>
            )}
          </div>
        </>
      )}

      {error && <p className="text-red-600 mt-3 text-sm">{error}</p>}
    </LargeModal>
  );
}
