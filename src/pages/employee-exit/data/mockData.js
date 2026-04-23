// src/pages/employee-exit/data/mockData.js

export const employees = [
  {
    employee_uuid: "emp-001",
    name: "Alex Johnson",
    email: "alex.j@pavestechnologies.com",
    department: "Engineering",
    designation: "Senior Frontend Developer",
  },
  {
    employee_uuid: "emp-002",
    name: "Sarah Miller",
    email: "sarah.m@pavestechnologies.com",
    department: "Marketing",
    designation: "Marketing Manager",
  },
  {
    employee_uuid: "emp-003",
    name: "David Chen",
    email: "david.c@pavestechnologies.com",
    department: "Finance",
    designation: "Financial Analyst",
  }
];

export const exit_list = [
  {
    exit_uuid: "exit-101",
    employee_uuid: "emp-001",
    exit_date: "2026-04-15",
    status: "Clearance", // Pending, Approvals, Clearance, Documents, Settlement, Completed
    department: "Engineering",
    created_at: "2026-03-10T10:00:00Z"
  },
  {
    exit_uuid: "exit-102",
    employee_uuid: "emp-002",
    exit_date: "2026-04-20",
    status: "Approvals",
    department: "Marketing",
    created_at: "2026-03-15T11:30:00Z"
  },
  {
    exit_uuid: "exit-103",
    employee_uuid: "emp-003",
    exit_date: "2026-03-30",
    status: "Completed",
    department: "Finance",
    created_at: "2026-02-28T09:15:00Z"
  }
];

export const exit_approvals = [
  {
    id: 1,
    approval_uuid: "app-001",
    exit_uuid: "exit-101",
    approval_type: "Manager",
    status: "Approved",
    remarks: "Alex has completed handover. Approved.",
    approved_by: 45,
    approved_at: "2026-03-12T14:00:00Z",
    created_at: "2026-03-10T10:00:00Z"
  },
  {
    id: 2,
    approval_uuid: "app-002",
    exit_uuid: "exit-101",
    approval_type: "HR",
    status: "Approved",
    remarks: "Notice period accepted. Process initiated.",
    approved_by: 88,
    approved_at: "2026-03-13T09:00:00Z",
    created_at: "2026-03-10T10:00:00Z"
  },
  {
    id: 3,
    approval_uuid: "app-003",
    exit_uuid: "exit-102",
    approval_type: "Manager",
    status: "Pending",
    remarks: "",
    approved_by: null,
    approved_at: null,
    created_at: "2026-03-15T11:30:00Z"
  }
];

export const exit_clearance = [
  {
    id: 1,
    clearance_uuid: "clr-001",
    exit_uuid: "exit-101",
    employee_uuid: "emp-001",
    department: "IT",
    status: "Pending",
    remarks: "Awaiting laptop collection.",
    approved_by: null,
    approved_at: null,
    created_at: "2026-03-14T10:00:00Z",
    updated_at: "2026-03-14T10:00:00Z"
  },
  {
    id: 2,
    clearance_uuid: "clr-002",
    exit_uuid: "exit-101",
    employee_uuid: "emp-001",
    department: "Finance",
    status: "Approved",
    remarks: "No outstanding dues.",
    approved_by: 12,
    approved_at: "2026-03-15T11:00:00Z",
    created_at: "2026-03-14T10:00:00Z",
    updated_at: "2026-03-15T11:00:00Z"
  }
];

export const exit_clearance_items = [
  {
    id: 1,
    clearance_item_uuid: "ci-001",
    clearance_uuid: "clr-001", // Maps to IT
    item_name: "Laptop returned",
    status: "Completed",
    remarks: "Macbook Pro M2 returned in good condition.",
    created_at: "2026-03-14T10:00:00Z",
    updated_at: "2026-03-18T10:00:00Z"
  },
  {
    id: 2,
    clearance_item_uuid: "ci-002",
    clearance_uuid: "clr-001",
    item_name: "Access systems revoked",
    status: "Pending",
    remarks: "Still needs GitHub revocation on last day.",
    created_at: "2026-03-14T10:00:00Z",
    updated_at: "2026-03-14T10:00:00Z"
  }
];

export const exit_documents = [
  {
    id: 1,
    document_uuid: "doc-001",
    exit_uuid: "exit-103",
    employee_uuid: "emp-003",
    document_type: "Relieving Letter",
    file_name: "david_chen_relieving_letter.pdf",
    file_path: "/uploads/exits/doc-001.pdf",
    uploaded_by: 88,
    created_at: "2026-03-31T10:00:00Z"
  },
  {
    id: 2,
    document_uuid: "doc-002",
    exit_uuid: "exit-103",
    employee_uuid: "emp-003",
    document_type: "Full & Final",
    file_name: "david_chen_fnf_statement.pdf",
    file_path: "/uploads/exits/doc-002.pdf",
    uploaded_by: 12,
    created_at: "2026-03-31T11:00:00Z"
  }
];

export const exit_final_settlement = [
  {
    id: 1,
    settlement_uuid: "set-001",
    exit_uuid: "exit-103",
    employee_uuid: "emp-003",
    last_salary: 12000.00,
    leave_encashment: 1500.00,
    bonus: 2000.00,
    deductions: 500.00,
    net_payable: 15000.00,
    status: "Paid",
    approved_by: 12,
    approved_at: "2026-03-30T16:00:00Z",
    created_at: "2026-03-29T10:00:00Z"
  },
  {
    id: 2,
    settlement_uuid: "set-002",
    exit_uuid: "exit-101",
    employee_uuid: "emp-001",
    last_salary: 8000.00,
    leave_encashment: 400.00,
    bonus: 0.00,
    deductions: 0.00,
    net_payable: 8400.00,
    status: "Pending",
    approved_by: null,
    approved_at: null,
    created_at: "2026-04-01T10:00:00Z"
  }
];

export const exit_interview = [
  {
    id: 1,
    interview_uuid: "int-001",
    exit_uuid: "exit-103",
    employee_uuid: "emp-003",
    reason_for_leaving: "Found an opportunity with higher compensation.",
    company_feedback: "Great work environment, but limited upward mobility in my specific vertical.",
    manager_feedback: "Supportive manager, always provided good guidance.",
    rating: 4,
    submitted_at: "2026-03-25T14:30:00Z"
  }
];

export const notice_period = [
  {
    notice_id: 1,
    exit_uuid: "exit-101",
    start_date: "2026-03-15",
    end_date: "2026-04-15",
    notice_period_days: 30,
    served_days: 30,
    remaining_days: 0,
    buyout_option: false,
    buyout_amount: 0.00,
    kt_status: "In Progress",
    kt_notes: "Handover to team members started. Need to document the remaining APIs.",
    created_at: "2026-03-10T10:00:00Z"
  },
  {
    notice_id: 2,
    exit_uuid: "exit-102",
    start_date: "2026-03-20",
    end_date: "2026-04-20",
    notice_period_days: 30,
    served_days: 20,
    remaining_days: 10,
    buyout_option: true,
    buyout_amount: 5000.00,
    kt_status: "Not Started",
    kt_notes: "KT scheduled for next week.",
    created_at: "2026-03-15T11:30:00Z"
  },
  {
    notice_id: 3,
    exit_uuid: "exit-103",
    start_date: "2026-03-01",
    end_date: "2026-03-30",
    notice_period_days: 30,
    served_days: 30,
    remaining_days: 0,
    buyout_option: false,
    buyout_amount: 0.00,
    kt_status: "Completed",
    kt_notes: "All tasks and knowledge fully transferred.",
    created_at: "2026-02-28T09:15:00Z"
  }
];
