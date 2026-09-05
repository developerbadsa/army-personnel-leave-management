import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

function generateManual() {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const secondaryColor: [number, number, number] = [51, 65, 85]; // Slate 700
  const accentColor: [number, number, number] = [30, 41, 59]; // Slate 800

  // ==================== COVER / HEADER ====================
  // Top Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 42, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text("ARMY PERSONNEL & LEAVE MANAGEMENT SYSTEM", 14, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(203, 213, 225);
  doc.text("Official End-User Operation & Workflow Manual", 14, 26);
  doc.text("Live Portal: https://lmtopu.rahimbadsa.me", 14, 33);

  // Metadata block
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(8);
  doc.text("Document Version: 1.0.0 | Security Classification: Restricted Internal Use", 14, 48);

  let yPos = 56;

  // Helper function for section headings
  const addSectionHeader = (title: string, y: number) => {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y - 5, 182, 8, "F");
    doc.setTextColor(...primaryColor);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(title, 16, y);
    return y + 8;
  };

  // ==================== SECTION 1: SYSTEM ROLES & ACCESS ====================
  yPos = addSectionHeader("1. SYSTEM ROLES & ACCESS OVERVIEW", yPos);

  autoTable(doc, {
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: [["Role / Authority", "Designation / Context", "Primary Scope & Capabilities"]],
    body: [
      [
        "ADMIN",
        "System Administrator",
        "Full control: User & personnel management, units, leave policies, audit logs, system configuration.",
      ],
      [
        "MODERATOR",
        "Unit / Section In-charge",
        "Reviews leave applications of assigned personnel, adds remarks, recommends or returns for correction.",
      ],
      [
        "USER",
        "Army Personnel / Soldier",
        "Self-service portal: Applies for leave, uploads documents, tracks application status, views balance & calendar.",
      ],
      [
        "COMMANDER / QM",
        "Designated Approval Authority",
        "Gives final statutory approval or rejection for recommended leave applications.",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: primaryColor, textColor: 255, fontStyle: "bold", fontSize: 9 },
    bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 36 },
      1: { cellWidth: 44 },
      2: { cellWidth: 102 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ==================== SECTION 2: ACCESSING THE SYSTEM ====================
  yPos = addSectionHeader("2. SYSTEM ACCESS & LOGIN PROCEDURE", yPos);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);

  const loginSteps = [
    "1. Access the web application via browser: https://lmtopu.rahimbadsa.me/login",
    "2. Enter your registered institutional email address (e.g., Sowmentopu@gmail.com).",
    "3. Enter your confidential account password.",
    "4. Click 'Sign In' to enter the main operations dashboard.",
    "5. Note: User accounts are created and authorized strictly by administrators; public self-registration is restricted.",
  ];

  loginSteps.forEach((step) => {
    doc.text(step, 16, yPos);
    yPos += 5.5;
  });

  yPos += 4;

  // ==================== SECTION 3: LEAVE APPLICATION WORKFLOW ====================
  yPos = addSectionHeader("3. LEAVE APPLICATION PROCEDURE (USER GUIDE)", yPos);

  const applySteps = [
    "Step 1 - Navigation: Click 'Leave' -> 'Apply Leave' on the sidebar navigation menu.",
    "Step 2 - Category Selection: Select appropriate leave type (Annual, Casual, Medical, Earned, Emergency).",
    "Step 3 - Date Selection: Choose 'Start Date' and 'End Date'. Total duration calculates automatically.",
    "Step 4 - Statement of Reason: Enter clear, concise justification for absence.",
    "Step 5 - Emergency Details: Provide active contact telephone and whereabouts during the leave period.",
    "Step 6 - Supporting Documents: Attach medical certificates or relevant official documentation (PDF / JPG / PNG).",
    "Step 7 - Submission: Click 'Submit Leave Request'. The status immediately transitions to 'Pending Review'.",
  ];

  applySteps.forEach((step) => {
    doc.text(step, 16, yPos);
    yPos += 5.5;
  });

  // ==================== PAGE 2 ====================
  doc.addPage();

  // Top header on page 2
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 14, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("ARMY PERSONNEL & LEAVE MANAGEMENT SYSTEM — USER MANUAL (PAGE 2)", 14, 9);

  yPos = 24;

  // ==================== SECTION 4: LEAVE APPROVAL LIFECYCLE ====================
  yPos = addSectionHeader("4. COMPLETE LEAVE APPROVAL LIFECYCLE", yPos);

  autoTable(doc, {
    startY: yPos,
    margin: { left: 14, right: 14 },
    head: [["Stage", "Action Required", "Responsible Party", "Status Indicator"]],
    body: [
      [
        "1. Application",
        "Personnel submits leave request with dates & documents",
        "Applicant",
        "Pending Review",
      ],
      [
        "2. Review",
        "Review details, check duty conflicts, submit recommendation",
        "Moderator / In-charge",
        "Recommended / Returned",
      ],
      [
        "3. Final Approval",
        "Statutory review & sign-off",
        "Commander / Quarter Master",
        "Approved / Rejected",
      ],
      [
        "4. Duty Execution",
        "Member proceeds on leave upon formal approval",
        "Personnel",
        "On Leave",
      ],
      [
        "5. Return Tracking",
        "Mark physical return to duty on resumption date",
        "Admin / In-charge",
        "Returned / Overdue",
      ],
    ],
    theme: "grid",
    headStyles: { fillColor: accentColor, textColor: 255, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 30 },
      1: { cellWidth: 70 },
      2: { cellWidth: 44 },
      3: { cellWidth: 38 },
    },
  });

  yPos = (doc as any).lastAutoTable.finalY + 10;

  // ==================== SECTION 5: BALANCES, CALENDAR & REPORTS ====================
  yPos = addSectionHeader("5. MONITORING BALANCES, CALENDAR & REPORTS", yPos);

  const monitoringItems = [
    "• Leave Balances: Access 'Leave' -> 'Balances' to view yearly entitlement, utilized days, and remaining balance.",
    "• Operational Calendar: Access 'Calendar' to inspect scheduled absences across units to prevent duty overlap.",
    "• Individual Statements: Generate and export formal PDF leave statements under 'Reports' -> 'Individual Statements'.",
    "• Overdue Tracking: Automated flags appear under 'Reports' -> 'Overdue' if an individual fails to return on schedule.",
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...secondaryColor);

  monitoringItems.forEach((item) => {
    doc.text(item, 16, yPos);
    yPos += 5.5;
  });

  yPos += 4;

  // ==================== SECTION 6: PROFILE MANAGEMENT ====================
  yPos = addSectionHeader("6. PROFILE & CREDENTIAL MANAGEMENT", yPos);

  const profileItems = [
    "• Profile Overview: Access 'My Profile' from the top-right account menu to view official service records.",
    "• Updating Details: Click 'Edit Profile' to modify contact number, blood group, or address details.",
    "• Profile Photograph: Click the camera icon over your avatar to upload a professional service photo.",
    "• Password Security: Maintain credential confidentiality; notify system administrators immediately if compromised.",
  ];

  profileItems.forEach((item) => {
    doc.text(item, 16, yPos);
    yPos += 5.5;
  });

  yPos += 6;

  // ==================== OFFICIAL FOOTER NOTE ====================
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.rect(14, yPos, 182, 22, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...primaryColor);
  doc.text("Official Notice:", 18, yPos + 6);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...secondaryColor);
  doc.text(
    "All leave applications, recommendations, approvals, and audit trails recorded in this system are legally binding and permanent records under institutional regulations.",
    18,
    yPos + 12,
    { maxWidth: 174 }
  );

  // Output file
  const uploadsDir = join(process.cwd(), "public");
  if (!existsSync(uploadsDir)) {
    mkdirSync(uploadsDir, { recursive: true });
  }

  const outputPath = join(uploadsDir, "Army_Leave_Management_User_Manual.pdf");
  const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
  writeFileSync(outputPath, pdfBuffer);

  console.log(`✅ User manual PDF successfully generated at: ${outputPath}`);
}

generateManual();
