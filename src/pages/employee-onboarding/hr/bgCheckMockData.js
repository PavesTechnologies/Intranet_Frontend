/* =====================================================================
   MOCK DATA — BackgroundCheckPage
   To switch to real API: replace the mock* functions with axios calls
   matching the patterns in HrProfileView.jsx / CoreEmployeeDetailsDashboard.jsx
   ===================================================================== */

export const MOCK_EMPLOYEES = [
  {
    employee_uuid: "emp-001", user_uuid: "usr-001",
    employee_id: "PVT-001", first_name: "Sathwik", last_name: "Patel",
    work_email: "sathwik.patel@pavesnetworks.com", contact_number: "+91 98765 43210",
    department_name: "Engineering", designation_name: "Software Engineer",
    employment_status: "Probation", joining_date: "2024-01-15",
  },
  {
    employee_uuid: "emp-002", user_uuid: "usr-002",
    employee_id: "PVT-002", first_name: "Priya", last_name: "Sharma",
    work_email: "priya.sharma@pavesnetworks.com", contact_number: "+91 91234 56789",
    department_name: "HR", designation_name: "HR Executive",
    employment_status: "Active", joining_date: "2023-08-01",
  },
  {
    employee_uuid: "emp-003", user_uuid: "usr-003",
    employee_id: "PVT-003", first_name: "Rahul", last_name: "Verma",
    work_email: "rahul.verma@pavesnetworks.com", contact_number: "+91 87654 32109",
    department_name: "Finance", designation_name: "Finance Analyst",
    employment_status: "Probation", joining_date: "2024-03-10",
  },
  {
    employee_uuid: "emp-004", user_uuid: "usr-004",
    employee_id: "PVT-004", first_name: "Anjali", last_name: "Reddy",
    work_email: "anjali.reddy@pavesnetworks.com", contact_number: "+91 77777 88888",
    department_name: "Marketing", designation_name: "Marketing Manager",
    employment_status: "Active", joining_date: "2022-05-20",
  },
  {
    employee_uuid: "emp-005", user_uuid: "usr-005",
    employee_id: "PVT-005", first_name: "Kiran", last_name: "Kumar",
    work_email: "kiran.kumar@pavesnetworks.com", contact_number: "+91 99900 11122",
    department_name: "Engineering", designation_name: "DevOps Engineer",
    employment_status: "Probation", joining_date: "2024-02-01",
  },
];

export const MOCK_PROFILES = {
  "usr-001": {
    offer: {
      first_name: "Sathwik", last_name: "Patel",
      email: "sathwik.patel@pavesnetworks.com", contact_number: "+91 98765 43210",
      designation: "Software Engineer",
    },
    personal_details: {
      date_of_birth: "2000-06-12", gender: "Male", marital_status: "Single",
      blood_group: "O+", nationality: "Indian", residence: "Hyderabad",
      emergency_contact_name: "Ramesh Patel", emergency_contact_phone: "+91 94400 12345",
      emergency_contact_relation: "Father",
    },
    addresses: [
      {
        address_type: "Present",
        address_line1: "Flat 302, Green Residency", address_line2: "Near Metro",
        city: "Hyderabad", state_or_region: "Telangana", postal_code: "500032", country: "India",
      },
      {
        address_type: "Permanent",
        address_line1: "12-3-456, Gandhi Nagar", address_line2: "",
        city: "Guntur", state_or_region: "Andhra Pradesh", postal_code: "522001", country: "India",
      },
    ],
    bank_details: {
      account_holder_name: "Sathwik Patel", bank_name: "State Bank of India",
      branch_name: "Hyderabad Main", account_number: "XXXX XXXX 7890",
      ifsc_code: "SBIN0001234", account_type: "Savings",
    },
    pf_details: { pf_member: true, uan_number: "100987654321" },
    education_documents: [
      {
        education_level: "B.Tech", degree_name: "Bachelor of Technology",
        specialization: "Computer Science", institution_name: "JNTU Hyderabad",
        institute_location: "Hyderabad", education_mode: "Regular",
        start_year: "2018", year_of_passing: "2022", percentage_cgpa: "8.5",
        file_path: null, document_name: "B.Tech Degree Certificate",
      },
      {
        education_level: "Intermediate", degree_name: "12th Standard",
        specialization: "MPC", institution_name: "Narayana Junior College",
        year_of_passing: "2018", percentage_cgpa: "96%",
        document_name: "12th Marksheet",
      },
      {
        education_level: "SSC", degree_name: "10th Standard",
        specialization: "General", institution_name: "Z.P High School",
        year_of_passing: "2016", percentage_cgpa: "9.8 CGPA",
        document_name: "10th Marksheet",
      },
    ],
    experience: [
      {
        company_name: "Paves Networks", role_title: "Software Engineer",
        employment_type: "Full-time", start_date: "2024-01-15",
        end_date: "Present", notice_period_days: 0,
      },
      {
        company_name: "TCS", role_title: "Assistant System Engineer",
        employment_type: "Full-time", start_date: "2022-07-01",
        end_date: "2023-12-31", notice_period_days: 30,
        documents: [{ document_name: "Relieving Letter", file_path: null }],
      },
    ],
    identity_documents: [
      { identity_type: "Aadhaar", identity_file_number: "1234 5678 9012", file_path: null, document_name: "Aadhaar Card", uploaded_at: "2024-01-10" },
      { identity_type: "PAN", identity_file_number: "ABCDE1234F", file_path: null, document_name: "PAN Card", uploaded_at: "2024-01-10" },
      { identity_type: "Passport", identity_file_number: "N1234567", file_path: null, document_name: "Passport", uploaded_at: "2024-01-12" },
      { identity_type: "Driving Licence", identity_file_number: "TS09 2023 123456", file_path: null, document_name: "Driving Licence", uploaded_at: "2024-01-15" },
    ],
  },
  "usr-002": {
    offer: {
      first_name: "Priya", last_name: "Sharma",
      email: "priya.sharma@pavesnetworks.com", contact_number: "+91 91234 56789",
      designation: "HR Executive",
    },
    personal_details: {
      date_of_birth: "1995-03-22", gender: "Female", marital_status: "Married",
      blood_group: "A+", nationality: "Indian", residence: "Bangalore",
    },
    addresses: [
      { address_type: "Present", address_line1: "Block B, Prestige Towers", city: "Bangalore", state_or_region: "Karnataka", postal_code: "560001", country: "India" },
    ],
    bank_details: {
      account_holder_name: "Priya Sharma", bank_name: "HDFC Bank",
      branch_name: "Bangalore MG Road", account_number: "XXXX XXXX 4321",
      ifsc_code: "HDFC0001001", account_type: "Savings",
    },
    pf_details: { pf_member: true, uan_number: "100123456789" },
    education_documents: [
      {
        education_level: "MBA", degree_name: "Master of Business Administration",
        specialization: "Human Resources", institution_name: "Symbiosis Institute",
        year_of_passing: "2019", percentage_cgpa: "7.8", file_path: null, document_name: "MBA Certificate",
      },
    ],
    experience: [],
    identity_documents: [
      { identity_type: "Aadhaar", identity_file_number: "9876 5432 1098", file_path: null, document_name: "Aadhaar Card", uploaded_at: "2023-08-05" },
      { identity_type: "PAN", identity_file_number: "PQRST5678G", file_path: null, document_name: "PAN Card", uploaded_at: "2023-08-05" },
      { identity_type: "Passport", identity_file_number: "M9876543", file_path: null, document_name: "Passport", uploaded_at: "2023-08-07" },
    ],
  },
};

// Default profile for users without specific mock data
export const DEFAULT_PROFILE = (emp) => ({
  offer: {
    first_name: emp.first_name, last_name: emp.last_name,
    email: emp.work_email, contact_number: emp.contact_number,
    designation: emp.designation_name,
  },
  personal_details: { date_of_birth: "—", gender: "—", nationality: "Indian" },
  addresses: [],
  bank_details: null,
  pf_details: null,
  education_documents: [],
  experience: [],
  identity_documents: [],
});

export const MOCK_CHECKS = {
  "usr-001": [
    { check_uuid: "chk-1-01", check_type: "identity_aadhaar",       status: "VERIFIED",  details: { "ID Type": "Aadhaar", "Number": "1234 5678 9012" }, notes: "" },
    { check_uuid: "chk-1-01b", check_type: "identity_pan",          status: "VERIFIED",  details: { "ID Type": "PAN", "Number": "ABCDE1234F" }, notes: "" },
    { check_uuid: "chk-1-01c", check_type: "identity_passport",     status: "PENDING",   details: { "ID Type": "Passport", "Number": "N1234567" }, notes: "" },
    { check_uuid: "chk-1-02", check_type: "professional_reference",  status: "PENDING",   details: { "Name": "Rajesh Kumar", "Email": "rajesh@tcs.com" }, notes: "" },
    { check_uuid: "chk-1-03", check_type: "address_digital",         status: "IN_REVIEW", details: { "Address": "Flat 302, Green Residency, Hyderabad" }, notes: "" },
    { check_uuid: "chk-1-04", check_type: "global_compliance",       status: "PENDING",   details: { "Result": "Awaiting" }, notes: "" },
    { check_uuid: "chk-1-05", check_type: "experience_0",            status: "VERIFIED",  details: { "Company": "TCS", "Period": "2022-07-01 – 2023-12-31" }, notes: "" },
    { check_uuid: "chk-1-06", check_type: "criminal_record",         status: "PENDING",   details: { "Result": "Pending" }, notes: "" },
    { check_uuid: "chk-1-07", check_type: "education_0",             status: "VERIFIED",  details: { "Degree": "B.Tech", "Institution": "JNTU Hyderabad" }, notes: "" },
    { check_uuid: "chk-1-08", check_type: "cibil_check",             status: "IN_REVIEW", details: { "Score": "Checking..." }, notes: "" },
    { check_uuid: "chk-1-09", check_type: "address_physical",        status: "PENDING",   details: { "Agent": "Not Assigned" }, notes: "" },
    { check_uuid: "chk-1-10", check_type: "bank_statement",          status: "PENDING",   details: { "Bank": "SBI" }, notes: "Awaiting statement upload." },
  ],
  "usr-002": [
    { check_uuid: "chk-2-01", check_type: "identity_aadhaar",       status: "VERIFIED",  details: { "ID Type": "Aadhaar" }, notes: "" },
    { check_uuid: "chk-2-01b", check_type: "identity_pan",          status: "VERIFIED",  details: { "ID Type": "PAN" }, notes: "" },
    { check_uuid: "chk-2-01c", check_type: "identity_passport",     status: "VERIFIED",  details: { "ID Type": "Passport" }, notes: "" },
    { check_uuid: "chk-2-02", check_type: "professional_reference",  status: "VERIFIED",  details: { "Name": "Amit Roy" }, notes: "" },
    { check_uuid: "chk-2-03", check_type: "address_digital",         status: "VERIFIED",  details: { "Status": "Verified" }, notes: "" },
    { check_uuid: "chk-2-04", check_type: "global_compliance",       status: "VERIFIED",  details: { "Result": "Clear" }, notes: "" },
    // Education: MBA, Degree at usr-002 (Education tab index 0)
    { check_uuid: "chk-2-07", check_type: "education_0",             status: "VERIFIED",  details: { "Degree": "MBA", "Institution": "Symbiosis" }, notes: "" },
    { check_uuid: "chk-2-08", check_type: "cibil_check",             status: "VERIFIED",  details: { "Score": "780" }, notes: "" },
    { check_uuid: "chk-2-09", check_type: "address_physical",        status: "VERIFIED",  details: { "Status": "Verified" }, notes: "" },
    { check_uuid: "chk-2-10", check_type: "bank_statement",          status: "VERIFIED",  details: { "Bank": "HDFC" }, notes: "" },
  ],
};

// Default checks for employees not in MOCK_CHECKS
export const DEFAULT_CHECKS = [
  { check_uuid: "d-01", check_type: "id_verification",        status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-02", check_type: "professional_reference",  status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-03", check_type: "address_digital",         status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-04", check_type: "global_compliance",       status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-05", check_type: "employment_record",       status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-06", check_type: "criminal_record",         status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-07", check_type: "education_record",        status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-08", check_type: "cibil_check",             status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-09", check_type: "address_physical",        status: "PENDING", details: {}, notes: "" },
  { check_uuid: "d-10", check_type: "bank_statement",          status: "PENDING", details: {}, notes: "" },
];
