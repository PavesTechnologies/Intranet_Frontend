export const generateHtml = (templateId, data = {}) => {
  const d = {
    firstName: data.firstName || "[First Name]",
    lastName: data.lastName || "[Last Name]",
    countryCode: data.countryCode || "91",
    contactNumber: data.contactNumber || "[Contact Number]",
    email: data.email || "[Email]",
    designation: data.designation || "[Designation]",
    totalCtc: data.totalCtc || "[Total CTC]",
    employeeType: data.employeeType || "Full-Time",
    date: data.date || "[Date]",
    relievingDate: data.relievingDate || "[Relieving Date]",
    panNumber: data.panNumber || "ABCDE1234F",
    financialYear: data.financialYear || "2025-2026",
    grossSalary: data.grossSalary || "12,00,000",
    taxDeducted: data.taxDeducted || "1,20,000",
    joiningDate: data.joiningDate || "[Joining Date]",
    department: data.department || "[Department]",
    reportingTime: data.reportingTime || "[Reporting Time]",
    location: data.location || "[Location]",
    reportingManager: data.reportingManager || "[Reporting Manager]",
    customMessage: data.customMessage || "",
    logoPath: "https://pavestechnologies.com/wp-content/uploads/2024/09/Logo.png" // Placeholder or their actual logo if available
  };

  const css = `
        /* Advanced, High-Impact Futuristic/Corporate Theme */
        :root {
            --brand-primary: #3949ab;
            --brand-secondary: #d81b60;
            --bg-color: #ffffff;
            --text-dark: #0f172a;
            --text-gray: #475569;
            --border-subtle: #cbd5e1;
            --surface-color: #f8fafc;
            --accent-gradient: linear-gradient(135deg, var(--brand-primary) 0%, var(--brand-secondary) 100%);
        }

        @page {
            size: A4 portrait;
            margin: 0;
            @top-center { content: element(header); }
            @bottom-center { content: element(footer); }
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 10.5pt;
            line-height: 1.6;
            color: var(--text-dark);
            -webkit-font-smoothing: antialiased;
            background-color: var(--bg-color);
        }

        .border-bottom-left {
            position: fixed;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }

        .border-bottom-left::before {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 25px; 
            height: 250px; 
            background: linear-gradient(to bottom, #d81b60, #3949ab);
            border-top-right-radius: 20px;
        }

        .border-bottom-left::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            height: 25px; 
            width: 100%; 
            background: #3949ab;
        }

        .border-top-right {
            position: fixed;
            top: 0;
            right: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: -1;
        }

        .border-top-right::before {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            width: 25px;
            height: 250px;
            background: linear-gradient(to bottom, #3949ab, #d81b60);
            border-bottom-left-radius: 20px;
        }

        .border-top-right::after {
            content: '';
            position: absolute;
            top: 0;
            right: 0;
            height: 25px;
            width: 100%;
            background: #3949ab;
        }

        .document-container {
            padding: 40mm 25mm 30mm 25mm;
            position: relative;
            z-index: 1;
        }

        header {
            position: running(header);
            width: 100%;
            height: 35mm;
        }

        .header-content {
            padding: 15mm 25mm 0 25mm;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }

        header table {
            border-bottom: 2px solid var(--surface-color);
            padding-bottom: 15px;
            margin-bottom: 10px;
        }

        .logo {
            height: 55px;
            object-fit: contain;
        }

        .company-info {
            text-align: right;
            font-size: 8.5pt;
            color: var(--text-gray);
            line-height: 1.5;
            border-right: 3px solid var(--brand-secondary);
            padding-right: 15px;
        }

        .company-name {
            font-size: 11pt;
            font-weight: 700;
            color: var(--brand-primary);
            letter-spacing: 0.5px;
        }

        footer {
            position: running(footer);
            width: 100%;
            height: 25mm;
        }

        .footer-badge {
            background: var(--surface-color);
            padding: 4px 12px;
            border-radius: 20px;
            color: var(--brand-primary);
            font-weight: 600;
        }

        h1 {
            font-size: 26pt;
            font-weight: 800;
            color: var(--text-dark);
            margin: 10mm 0 5mm 0;
            letter-spacing: -0.5px;
            line-height: 1.1;
        }

        h2 {
            font-size: 14pt;
            font-weight: 700;
            color: var(--brand-primary);
            margin: 25px 0 15px 0;
            display: flex;
            align-items: center;
        }

        h2::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 18px;
            background: var(--brand-secondary);
            border-radius: 2px;
            margin-right: 12px;
        }
        
        h3 {
            font-size: 11.5pt;
            font-weight: 600;
            color: var(--text-dark);
            margin: 20px 0 10px 0;
        }

        p {
            margin-bottom: 16px;
            color: var(--text-gray);
            text-align: justify;
        }

        .highlight-text {
            color: var(--brand-primary);
            font-weight: 600;
        }

        .cards-container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 15px;
            margin: 25px 0;
            page-break-inside: avoid;
        }

        .value-card {
            background: var(--surface-color);
            border-top: 3px solid var(--brand-primary);
            padding: 15px 20px;
            border-radius: 0 0 8px 8px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.04);
        }

        .card-label {
            font-size: 9pt;
            color: var(--text-gray);
            margin-bottom: 5px;
        }

        .card-value {
            font-size: 13pt;
            font-weight: 800;
            color: var(--brand-primary);
        }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            background: var(--surface-color);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 30px;
            border: 1px solid rgba(14, 165, 233, 0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.02);
        }

        .info-item {
            margin-bottom: 10px;
        }

        .info-label {
            font-size: 8pt;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 700;
            color: var(--brand-secondary);
            margin-bottom: 2px;
        }

        .info-value {
            font-size: 11pt;
            font-weight: 600;
            color: var(--text-dark);
        }

        .ctc-table {
            width: 100%;
            border-collapse: separate;
            border-spacing: 0;
            margin: 25px 0;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.03);
            border: 1px solid var(--border-subtle);
        }

        .ctc-table th {
            background: var(--surface-color);
            color: var(--brand-primary);
            font-size: 9.5pt;
            font-weight: 700;
            text-transform: uppercase;
            padding: 16px 20px;
            text-align: left;
            border-bottom: 2px solid var(--border-subtle);
        }

        .ctc-table td {
            background: var(--bg-color);
            padding: 14px 20px;
            font-size: 10pt;
            color: var(--text-gray);
            border-bottom: 1px solid var(--surface-color);
        }
            
        .ctc-table td.amount-col, .ctc-table th.amount-col {
            text-align: right;
        }

        .type-badge {
            display: inline-block;
            padding: 3px 8px;
            background: var(--bg-color);
            border: 1px solid var(--brand-secondary);
            color: var(--brand-secondary);
            border-radius: 4px;
            font-size: 8pt;
            font-weight: 600;
        }

        .ctc-total-row td {
            background: var(--brand-primary);
            color: white;
            font-weight: 700;
            font-size: 12pt;
            padding: 18px 20px;
        }

        .signature-grid {
            margin-top: 40px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 50px;
            page-break-inside: avoid;
        }

        .signature-box {
            background: var(--surface-color);
            padding: 25px 20px 20px 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px dashed var(--border-subtle);
            position: relative;
        }

        .sign-status {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: var(--brand-primary);
            color: white;
            font-size: 7.5pt;
            font-weight: 700;
            padding: 3px 10px;
            border-radius: 12px;
            text-transform: uppercase;
        }
            
        .signatory-name {
            font-weight: 700;
            font-size: 11pt;
            color: var(--brand-primary);
        }

        .modern-list {
            list-style: none;
            padding: 0;
            margin: 15px 0;
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-gap: 12px;
        }

        .modern-list li {
            position: relative;
            padding-left: 28px;
            font-size: 9.5pt;
            color: var(--text-gray);
            background: var(--surface-color);
            padding: 10px 10px 10px 35px;
            border-radius: 6px;
        }

        .modern-list li::before {
            content: '';
            position: absolute;
            left: 12px;
            top: 50%;
            transform: translateY(-50%);
            width: 14px;
            height: 14px;
            background: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23d81b60"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>') no-repeat center center;
            background-size: contain;
        }

        .page-break {
            page-break-before: always;
        }
  `;

  const compComponents = [
    { name: "Basic Salary", type: "Fixed", frequency: "Monthly", amount: Math.round((parseInt(d.totalCtc) || 0) * 0.4) || "[Basic]" },
    { name: "HRA", type: "Fixed", frequency: "Monthly", amount: Math.round((parseInt(d.totalCtc) || 0) * 0.2) || "[HRA]" },
    { name: "Special Allowance", type: "Fixed", frequency: "Monthly", amount: Math.round((parseInt(d.totalCtc) || 0) * 0.4) || "[Allowance]" }
  ];

  const getBody = () => {
    switch (templateId) {
      case "joining_letter":
        return `
    <div class="document-container">
        <div class="date-badge">Date: ${d.date}</div>

        <div style="margin-bottom: 35px;">
            <p style="margin-bottom: 8px; font-weight: 600; color: var(--text-dark);">To,</p>
            <p style="margin-bottom: 4px; font-weight: 700; font-size: 11.5pt; color: var(--brand-primary);">${d.firstName} ${d.lastName}</p>
            <p style="margin-bottom: 4px; font-size: 9.5pt; color: var(--text-gray);">Contact: +${d.countryCode} ${d.contactNumber}</p>
            <p style="margin-bottom: 0; font-size: 9.5pt; color: var(--text-gray);">Email: ${d.email}</p>
        </div>

        <h1 style="text-align: center; font-size: 24pt; margin: 20px 0 40px 0; border-bottom: 2px solid var(--brand-primary); padding-bottom: 15px; width: fit-content; margin-left: auto; margin-right: auto;">
            Joining Letter
        </h1>

        <p>Dear <span class="highlight-text">${d.firstName}</span>,</p>

        <p>We are delighted to welcome you to <strong>Paves Global Infotech Private Limited</strong>. This letter confirms your joining details and the initial reporting information for your first day with our team.</p>

        <h2>Joining Details Snapshot</h2>
        <div class="cards-container">
            <div class="value-card">
                <div class="card-label">Official Designation</div>
                <div class="card-value">${d.designation}</div>
            </div>
            <div class="value-card">
                <div class="card-label">Department</div>
                <div class="card-value">${d.department}</div>
            </div>
            <div class="value-card">
                <div class="card-label">Date of Joining</div>
                <div class="card-value">${d.joiningDate}</div>
            </div>
            <div class="value-card">
                <div class="card-label">Reporting Time</div>
                <div class="card-value">${d.reportingTime}</div>
            </div>
            <div class="value-card">
                <div class="card-label">Work Location</div>
                <div class="card-value">${d.location}</div>
            </div>
            <div class="value-card">
                <div class="card-label">Reporting Manager</div>
                <div class="card-value">${d.reportingManager}</div>
            </div>
        </div>

        <p>On your first day, please report to the HR desk at the above location. Our HR team will assist you with the joining formalities, document verification, and initial onboarding activities.</p>

        ${d.customMessage ? `
        <div style="background: var(--surface-color); border-left: 4px solid var(--brand-secondary); padding: 15px 20px; border-radius: 0 8px 8px 0; font-size: 9pt; color: var(--text-gray); margin: 25px 0;">
            <strong style="color: var(--brand-primary);">Additional Information:</strong><br>
            ${d.customMessage}
        </div>` : ""}

        <p>We wish you every success in your new role and look forward to a positive and rewarding association with you.</p>
    </div>

    <div class="page-break"></div>
    <div class="document-container">
        <h2>Mandatory Onboarding Document Submission</h2>
        <p>Kindly carry the original copies for visual verification, along with one digital or photocopy set of the following documents on your date of joining:</p>

        <ul class="modern-list">
            <li>Comprehensive updated resume</li>
            <li>Educational certificates</li>
            <li>Last 3 months' pay slips</li>
            <li>Last 6 months' bank statement</li>
            <li>Relieving letter from previous employer</li>
            <li>Passport size photographs</li>
            <li>Permanent Account Number (PAN) card</li>
            <li>Aadhaar card</li>
        </ul>

        <h2 style="margin-top: 40px; border-top: 1px solid var(--border-subtle); padding-top: 25px;">Signatures & Acknowledgement</h2>
        <p>By signing below, I acknowledge that I have received and understood the joining details and reporting instructions provided in this letter.</p>

        <div class="signature-grid">
            <div class="signature-box">
                <div class="sign-status">HR Signature</div>
                <div style="height: 50px;"></div>
                <div class="signatory-name">Paves HR</div>
            </div>
            <div class="signature-box">
                <div class="sign-status">Employee Acknowledgement</div>
                <div style="height: 50px;"></div>
                <div class="signatory-name">${d.firstName} ${d.lastName}</div>
            </div>
        </div>
    </div>
        `;
      case "nda":
        return `
    <div class="document-container">
        <h1 style="text-align: center; font-size: 24pt; margin: 20px 0 40px 0; border-bottom: 2px solid var(--brand-primary); padding-bottom: 15px; width: fit-content; margin-left: auto; margin-right: auto;">
            Non-Disclosure Agreement
        </h1>
        <p>This NON-DISCLOSURE AGREEMENT (the "Agreement") is entered into on <strong>${d.date}</strong> by and between Paves Global Infotech Private Limited and <strong>${d.firstName} ${d.lastName}</strong>.</p>
        
        <h2>1. Confidential Information</h2>
        <p>The Receiving Party acknowledges that they will have access to confidential software design, customer data, strategies, and trade secrets belonging exclusively to the Company.</p>
        
        <div class="signature-grid" style="margin-top: 60px;">
            <div class="signature-box" style="border-style: solid; border-color: var(--brand-secondary);">
                <div class="sign-status" style="background: var(--brand-secondary);">Candidate Signature</div>
                <div class="signatory-name">${d.firstName} ${d.lastName}</div>
            </div>
        </div>
    </div>
        `;
      case "policies":
        return `
    <div class="document-container">
        <h1 style="text-align: center; font-size: 24pt; margin: 20px 0 40px 0; border-bottom: 2px solid var(--brand-primary); padding-bottom: 15px; width: fit-content; margin-left: auto; margin-right: auto;">
            Corporate Policies & IT Conduct
        </h1>
        <p>Welcome to the team, <strong>${d.firstName}</strong>. As a <strong>${d.designation}</strong>, it is crucial to adhere to our standard principles.</p>
        <h2>Workplace Ethics</h2>
        <p>We believe in a transparent, robust environment free of discrimination.</p>
    </div>
        `;
      case "relieving_letter":
        return `
    <div class="document-container">
        <h1 style="text-align: center; font-size: 24pt; margin: 20px 0 40px 0; border-bottom: 2px solid var(--brand-primary); padding-bottom: 15px; width: fit-content; margin-left: auto; margin-right: auto;">
            Relieving Letter
        </h1>
        <p>Date: ${d.date}</p>
        <p>To: <strong>${d.firstName} ${d.lastName}</strong></p>
        <p>Dear ${d.firstName},</p>
        <p>This is to confirm your resignation from the role of <strong>${d.designation}</strong> has been accepted. You will be relieved of your duties at the end of the working hours on <strong>${d.relievingDate}</strong>.</p>
        <p>We wish you all the best in your future endeavors.</p>
    </div>
        `;
      case "form_16":
        return `
    <div class="document-container">
        <h1 style="text-align: center; font-size: 24pt; margin: 20px 0 20px 0; border-bottom: 2px solid var(--brand-primary); padding-bottom: 15px; width: fit-content; margin-left: auto; margin-right: auto;">
            Form 16
        </h1>
        <p style="text-align: center; margin-top: -10px; margin-bottom: 40px; font-weight: 600; color: var(--text-gray);">Certificate under Section 203 of the Income Tax Act</p>
        
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Employee Name</div>
                <div class="info-value">${d.firstName} ${d.lastName}</div>
            </div>
            <div class="info-item">
                <div class="info-label">PAN Number</div>
                <div class="info-value" style="text-transform: uppercase;">${d.panNumber}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Financial Year</div>
                <div class="info-value">${d.financialYear}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Issue Date</div>
                <div class="info-value">${d.date}</div>
            </div>
        </div>
        
        <h2>Income & Tax Details</h2>
        <table class="ctc-table">
            <thead>
                <tr>
                    <th width="70%">Description</th>
                    <th width="30%" class="amount-col">Amount (₹)</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>Gross Salary Paid</strong></td>
                    <td class="amount-col">${d.grossSalary}</td>
                </tr>
                <tr>
                    <td><strong>Total Tax Deducted at Source (TDS)</strong></td>
                    <td class="amount-col">${d.taxDeducted}</td>
                </tr>
                <tr class="ctc-total-row">
                    <td style="text-align: right; text-transform: uppercase; letter-spacing: 1px;">Net Tax Deposited</td>
                    <td class="amount-col">₹ ${d.taxDeducted}</td>
                </tr>
            </tbody>
        </table>
        
        <p style="margin-top: 40px;">This is a computer-generated Form 16 statement and does not require a physical signature. The tax deducted has been deposited to the Central Government Account.</p>
    </div>
        `;
      case "offer_letter":
        return `
    <div class="document-container">
        <div style="margin-bottom: 35px;">
            <p style="margin-bottom: 8px; font-weight: 600; color: var(--text-dark);">To,</p>
            <p style="margin-bottom: 4px; font-weight: 700; font-size: 11.5pt; color: var(--brand-primary);">${d.firstName} ${d.lastName}</p>
            <p style="margin-bottom: 0; font-size: 9.5pt; color: var(--text-gray);">Date: ${d.date}</p>
        </div>

        <h1 style="text-align: center; font-size: 24pt; margin: 20px 0 40px 0; border-bottom: 2px solid var(--brand-primary); padding-bottom: 15px; width: fit-content; margin-left: auto; margin-right: auto;">
            Letter of Offer
        </h1>

        <p>Dear <span class="highlight-text">${d.firstName}</span>,</p>

        <p>It brings us genuine pleasure to officially extend this offer of employment for the role of <strong>${d.designation}</strong> at Paves Global Infotech Private Limited. Based on our discussions, we believe your skills will positively impact our continued growth.</p>

        <h2>Offer Details</h2>
        <div class="info-grid" style="margin-bottom: 30px;">
            <div class="info-item">
                <div class="info-label">Joining Date</div>
                <div class="info-value">${d.joiningDate}</div>
            </div>
            <div class="info-item">
                <div class="info-label">Annual CTC</div>
                <div class="info-value">₹ ${d.totalCtc}</div>
            </div>
        </div>

        <p>This offer is fundamentally contingent upon the successful completion of a comprehensive background verification process and the accurate submission of all requested academic and prior employment artifacts.</p>

        <div class="signature-grid" style="margin-top: 60px;">
            <div class="signature-box" style="border-style: solid; border-color: var(--brand-secondary);">
                <div class="sign-status" style="background: var(--brand-secondary);">Candidate Acceptance</div>
                <div class="signatory-name" style="margin-top: 15px;">___________________</div>
                <div class="signatory-title" style="margin-top: 5px;">Signature</div>
            </div>
        </div>
    </div>
        `;
      case "appointment_letter":
        return `
    <div class="document-container">
        <div style="margin-bottom: 25px;">
            <p style="margin-bottom: 8px; font-weight: 600; color: var(--text-dark);">To,</p>
            <p style="margin-bottom: 4px; font-weight: 700; font-size: 11.5pt; color: var(--brand-primary);">${d.firstName} ${d.lastName}</p>
        </div>

        <h1 style="text-align: center; font-size: 24pt; margin: 20px 0 30px 0; border-bottom: 2px solid var(--brand-primary); padding-bottom: 15px; width: fit-content; margin-left: auto; margin-right: auto;">
            Appointment Order
        </h1>

        <p>Dear <span class="highlight-text">${d.firstName}</span>,</p>

        <p>Following your acceptance of our initial offer, we are pleased to formalize your appointment as <strong>${d.designation}</strong> (${d.employeeType}) at Paves Global Infotech Private Limited, effective <strong>${d.joiningDate}</strong>.</p>

        <h2>Core Terms of Appointment</h2>
        <ul class="modern-list" style="grid-template-columns: 1fr;">
            <li><strong>Probation:</strong> You shall be on probation for a period of 90 days, assessing capability and cultural fit.</li>
            <li><strong>Location & Transfer:</strong> Your initial site of posting is Hyderabad. The company reserves the constitutional right to reallocate your deployment to match operational horizons.</li>
            <li><strong>Confidentiality:</strong> Adherence to global non-disclosure standards is mandatory and supersedes tenure.</li>
            <li><strong>Termination:</strong> During probation, this engagement is severable by either party with a 15-day notice period. Post confirmation, a 60-day notice is standard.</li>
        </ul>

        <p style="margin-top: 25px;">Welcome to the organization. We are uniquely positioned to foster massive career growth during your tenure here.</p>

        <div class="signature-grid" style="margin-top: 50px;">
            <div class="signature-box">
                <div class="sign-status">Authorized Signatory</div>
                <div style="height: 60px;"></div>
            </div>
            <div class="signature-box" style="border-style: solid; border-color: var(--brand-secondary);">
                <div class="sign-status" style="background: var(--brand-secondary);">Candidate Acknowledgment</div>
                <div style="height: 60px;"></div>
            </div>
        </div>
    </div>
        `;
      default:
        return `<div class="document-container"><p>Template not found.</p></div>`;
    }
  };

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>${d.firstName} - Document</title>
    <style>${css}</style>
</head>
<body>
    <div class="border-bottom-left"></div>
    <div class="border-top-right"></div>

    <header>
        <table style="width: 100%; border-collapse: collapse; padding: 15mm 25mm 0 25mm;">
            <tr>
                <td style="vertical-align: middle; width: 40%;">
                    <h2 style="margin:0;color:#3949ab;">Paves Global</h2>
                </td>
                <td style="vertical-align: middle; text-align: right; width: 60%;">
                    <div class="company-info" style="display: inline-block; text-align: right;">
                        <div class="company-name">Paves Global Infotech Private Limited</div>
                        Office No.12, 8th Floor, Tower 1<br>
                        Vasavi Sky City, Gachibowli | Hyderabad 500032
                    </div>
                </td>
            </tr>
        </table>
    </header>

    <footer>
        <table style="width: 100%; border-collapse: collapse; margin: 0 25mm; padding-top: 5mm; border-top: 1px solid var(--border-subtle); width: calc(100% - 50mm);">
            <tr>
                <td style="vertical-align: middle; font-size: 8.5pt; color: var(--text-gray); width: 80%;">
                    <span class="footer-badge">CONFIDENTIAL</span>
                    <span style="margin-left: 15px;">www.pavestechnologies.com | careers@pavestechnologies.com</span>
                </td>
                <td style="vertical-align: middle; text-align: right; font-size: 8.5pt; color: var(--text-gray); width: 20%;">
                    <div class="page-number">Paves HR</div>
                </td>
            </tr>
        </table>
    </footer>

    ${getBody()}
</body>
</html>`;
};




