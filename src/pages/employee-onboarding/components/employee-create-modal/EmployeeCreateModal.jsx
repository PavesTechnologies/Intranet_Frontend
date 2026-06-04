import React, { useState, useEffect } from "react";
import LargeModal from "./LargeModal";
import Tabs from "./Tabs";
import ProfileForm from "./ProfileForm";
import JobForm from "./JobForm";
import Button from "../../../../components/Button/Button";
import { showStatusToast } from "../../../../components/toastfy/toast";
import api from "../../../../api/axiosInstance";

const formatDateForInput = (dateValue) => {
  if (!dateValue) return "";

  const dateString = String(dateValue).trim();
  const dateOnlyMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);

  if (dateOnlyMatch) {
    return `${dateOnlyMatch[1]}-${dateOnlyMatch[2]}-${dateOnlyMatch[3]}`;
  }

  const parsedDate = new Date(dateString);

  if (isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toISOString().split("T")[0];
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

const getEmployeeFormValues = (
  data = {},
  {
    matchedUserUuid,
    offerLetter,
    personalDetails,
    firstName,
    middleName,
    lastName,
  } = {},
) => {
  const reportingManagerValue =
    data.reporting_manager_uuid || offerLetter?.reporting_manager || "";

  return {
    personalUuid: personalDetails?.personal_uuid,
    userUuid: data.user_uuid || matchedUserUuid,
    empId: data.employee_id,
    email: data.work_email,
    empFirstName: data.first_name || offerLetter?.first_name || firstName || "",
    empMiddleName:
      data.middle_name || offerLetter?.middle_name || middleName || "",
    empLastName: data.last_name || offerLetter?.last_name || lastName || "",
    empDob: data.date_of_birth || personalDetails?.date_of_birth || "",
    contact:
      data.contact_number ||
      personalDetails?.contact_number ||
      offerLetter?.contact_number ||
      "",
    departmentUuid: data.department_uuid,
    designationUuid: data.designation_uuid,
    reportingManagerUuid:
      data.reporting_manager_uuid ||
      offerLetter?.reporting_manager_uuid ||
      reportingManagerValue,
    employeeType:
      data.employment_type || data.employee_type || offerLetter?.employee_type,
    mail: offerLetter?.mail || "",
    countryCode: offerLetter?.country_code || "",
    designation: offerLetter?.designation || "",
    currency: offerLetter?.currency || "",
    compensationComponents: offerLetter?.compensation_components || [],
    totalCtc: offerLetter?.total_ctc || 0,
    joiningDate: formatDateForInput(
      data.joining_date || offerLetter?.joining_date || "",
    ),
    location: data.location || "",
    workMode: data.work_mode || "",
    employmentStatus: data.employment_status || "",
    bloodGroup: data.blood_group || personalDetails?.blood_group || "",
    gender: data.gender || personalDetails?.gender || "",
    maritalStatus:
      data.marital_status || personalDetails?.marital_status || "",
    nationalityCountryUuid: personalDetails?.nationality_country_uuid || "",
    residenceCountryUuid: personalDetails?.residence_country_uuid || "",
    emergencyContactRelationUuid:
      personalDetails?.emergency_contact_relation_uuid || "",
    emergencyContactName: personalDetails?.emergency_contact_name || "",
    emergencyContactNumber: personalDetails?.emergency_contact_phone || "",
    totalExperience: data.total_experience,
  };
};

export default function EmployeeCreateModal({
  isOpen,
  onClose,
  userUuid,
  employeeUuid,
  initialEmployee,
  initialDepartments = [],
  initialDesignations = [],
  firstName,
  middleName,
  lastName,
}) {
  const [activeTab, setActiveTab] = useState("Profile");
  const [form, setForm] = useState({});
  const [isGenerated, setIsGenerated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState("");
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [managerOptions, setManagerOptions] = useState([]);


  const isEditMode = !!employeeUuid;

  const fetchDepartments = async () => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/departments/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      setDepartments(Array.isArray(res.data) ? res.data : res.data?.data || []);
    } catch (err) {
      console.error("Failed to fetch departments", err);
    }
  };

  const fetchDesignations = async (departmentUuid) => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/masters/designations/department/${departmentUuid}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const designationList = Array.isArray(res.data)
        ? res.data
        : Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data?.designations)
        ? res.data.designations
        : [];

      setDesignations(designationList);
    } catch (err) {
      console.error("Failed to fetch designations", err);
    }
  };

  const fetchManagers = async () => {
    try {
      const res = await api.get(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const managers = getArrayPayload(res.data)
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
    if (initialDepartments.length) {
      setDepartments(initialDepartments);
    }
    if (initialDesignations.length) {
      setDesignations(initialDesignations);
    }
    fetchDepartments();
    fetchManagers();
  }, [isOpen, initialDepartments, initialDesignations]);

  useEffect(() => {
    if (!isOpen || !initialEmployee) return;

    setForm((prev) => ({
      ...prev,
      ...getEmployeeFormValues(initialEmployee, {
        matchedUserUuid: initialEmployee.user_uuid || userUuid,
        firstName,
        middleName,
        lastName,
      }),
    }));

    if (initialEmployee.department_uuid) {
      fetchDesignations(initialEmployee.department_uuid);
    }
  }, [isOpen, initialEmployee, userUuid, firstName, middleName, lastName]);

  useEffect(() => {
    if (!isOpen || (!userUuid && !employeeUuid)) return;

    const fetchEmployee = async () => {
      try {
        let data = {};
        let matchedUserUuid = userUuid;

        if (employeeUuid) {
          const res = await api.get(
            `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/${employeeUuid}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );

          data = res.data;

          matchedUserUuid =
            data.user_uuid || userUuid;
        }
       
        let offerLetter = null;

        try {
          const offerRes = await api.get(
            `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/offerletters/offer/${matchedUserUuid}`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );

          offerLetter = offerRes.data;
        } catch (offerError) {
          console.error("Failed to fetch offer letter details", offerError);
        }

        let personalDetails = null;

        try {
          const personalListRes = await api.get(
            `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/employee-details`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            },
          );

          personalDetails = (personalListRes.data || []).find(
            (item) =>
              String(item.user_uuid).trim() ===
              String(matchedUserUuid).trim()
          );
        } catch (personalError) {
          console.error(
            "Failed to fetch personal details",
            personalError
          );
        }

        setForm((prev) => ({
          ...prev,
          ...getEmployeeFormValues(data, {
            matchedUserUuid,
            offerLetter,
            personalDetails,
            firstName,
            middleName,
            lastName,
          }),
        }));

        fetchDesignations(data.department_uuid);
      } catch (error) {
        console.error("Failed to fetch employee", error);
      }
    };

    fetchEmployee();
  }, [isOpen, employeeUuid, userUuid, firstName, middleName, lastName]);

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

      const response = await api.post(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/`,
        {
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
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      const data = response.data;

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

  const handleUpdate = async () => {
    if (!employeeUuid) return;

    try {
      setUpdating(true);
      setError("");

      if (
        !form.empFirstName ||
        !form.empLastName ||
        !form.empDob ||
        !form.contact ||
        !form.departmentUuid ||
        !form.designationUuid ||
        !form.employeeType ||
        !form.joiningDate ||
        !form.employmentStatus
      ) {
        setError("Please fill all required fields.");
        showStatusToast("Please fill all required fields", "info");
        return;
      }

      await api.put(
        `${window.__APP_CONFIG__.EMPLOYEE_ONBOARDING_URL}/permanent-employee/core-employee-details/${employeeUuid}`,
        {
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
          total_experience: Number(form.totalExperience) || 0,
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        },
      );

      showStatusToast("Employee updated successfully", "success");
      onClose();
    } catch (err) {
      console.error("Failed to update employee", err);
      setError("Something went wrong while updating employee.");
      showStatusToast("Failed to update employee", "error");
    } finally {
      setUpdating(false);
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
          <ProfileForm
            form={form}
            handleChange={handleChange}
            isGenerated={isGenerated}
          />
          <div className="flex justify-end gap-3 mt-6">
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
    />

    <div className="flex justify-end gap-3 mt-6">

      {/* ---------------- CREATE MODE ---------------- */}

      {!isEditMode && !isGenerated && (
        <Button
          variant="primary"
          size="small"
          onClick={handleGenerate}
          disabled={loading}
        >
          {loading
            ? "Generating..."
            : "Generate Credentials"}
        </Button>
      )}

      {!isEditMode && isGenerated && (
        <>
          <Button
            variant="secondary"
            size="small"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={onClose}
          >
            Save
          </Button>
        </>
      )}

      {isEditMode && (
        <>
          <Button
            variant="secondary"
            size="small"
            onClick={onClose}
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            size="small"
            onClick={handleUpdate}
            disabled={updating}
          >
            {updating ? "Updating..." : "Update"}
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
