/**
 * Offer Letter Service — Corvus Studio
 * Matches real Corvus Studio offer letter structure exactly:
 * - Centered logo header with "Motion that Speaks." tagline
 * - Garamond serif body text
 * - Acceptance block on second page (page-break-before: always)
 */

// Logo served from Cloudflare Pages (publicly accessible)
const LOGO_URL = 'https://leave.thecorvusstudio.com/raven_colored.png';

// ─── Document ID Generator ────────────────────────────────────────────────────
export async function generateDocumentId(db) {
  const result = await db.prepare(
    `SELECT document_id FROM offer_letters WHERE document_id LIKE 'CS%' ORDER BY id DESC LIMIT 1`
  ).first();
  let nextNum = 1;
  if (result?.document_id) {
    const match = result.document_id.match(/CS(\d+)/i);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }
  return `CS${String(nextNum).padStart(3, '0')}`;
}

// ─── Employment Type Detection ────────────────────────────────────────────────
export function detectEmploymentType(str) {
  if (!str) return 'Full-Time';
  const t = str.trim().toLowerCase();
  if (t.includes('intern')) return 'Intern';
  if (t.includes('freelance')) return 'Freelancer';
  if (t.includes('contract')) return 'Contract';
  return 'Full-Time';
}

// ─── Placeholders ─────────────────────────────────────────────────────────────
export function buildPlaceholders(employee, documentId, options = {}) {
  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : today();
  const today = () => new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  return {
    DOCUMENT_ID: documentId,
    DATE: options.issueDate || today(),
    NAME: employee.full_name || '',
    DESIGNATION: employee.designation || 'Team Member',
    DEPARTMENT: employee.department || 'Production',
    TYPE: detectEmploymentType(employee.employee_type),
    JOINING: fmt(employee.joining_date),
    STIPEND: options.salary || employee.salary || 'unpaid',
    LOCATION: options.workLocation || 'Remote',
    MANAGER: options.reportingManager || 'Raj Kishore Kumar',
  };
}

// ─── Template Selector ────────────────────────────────────────────────────────
export function selectTemplate(employee) {
  const type = detectEmploymentType(employee.employee_type);
  const role = (employee.designation || '').toLowerCase();
  if (type === 'Intern') {
    if (role.includes('concept')) return 'intern_concept';
    if (role.includes('2d')) return 'intern_2d';
    return 'intern_3d'; // default intern
  }
  if (type === 'Freelancer') return 'freelancer';
  if (type === 'Contract') return 'contract';
  return 'fulltime';
}

// ─── Shared CSS ───────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:'EB Garamond',Georgia,serif;font-size:11.5pt;line-height:1.8;color:#1a1a1a;background:#fff}
.page{max-width:700px;margin:0 auto;padding:48px 56px 56px}
/* Header */
.lh{text-align:center;padding-bottom:16px;border-bottom:2px solid #111;margin-bottom:30px}
.lh img{height:64px;object-fit:contain;display:block;margin:0 auto 6px}
.lh-name{font-family:'EB Garamond',serif;font-size:20pt;font-weight:700;letter-spacing:4px;text-transform:uppercase;color:#0a0a0a;line-height:1}
.lh-tag{font-size:8.5pt;letter-spacing:3px;text-transform:uppercase;color:#666;margin-top:4px}
.lh-ref{font-size:9pt;color:#444;margin-top:10px;line-height:1.5}
/* Title */
.title{text-align:center;margin-bottom:26px}
.title h1{font-size:14pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#0a0a0a}
.title p{font-size:11pt;color:#333;margin-top:3px;font-style:italic}
/* Body */
.body p{margin-bottom:14px;text-align:justify}
.body p strong{font-weight:600}
.cl{font-weight:700}
/* Signature */
.sig{margin-top:44px}
.sig p{margin-bottom:4px}
.sig-line{border-top:1px solid #111;padding-top:8px;margin-top:42px;font-size:10pt;width:46%}
/* Acceptance – always starts on page 2 */
.acceptance{page-break-before:always;padding-top:48px}
.acc-title{font-size:13pt;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px;border-bottom:1px solid #111;padding-bottom:8px}
.acc-body p{margin-bottom:11px;text-align:justify}
.acc-fields{margin-top:28px}
.acc-field{display:flex;align-items:flex-end;margin-bottom:22px;gap:12px}
.acc-field label{font-size:10pt;white-space:nowrap;min-width:90px}
.field-line{flex:1;border-bottom:1px solid #555;height:18px}
/* Footer */
.footer{margin-top:36px;padding-top:12px;border-top:1px solid #ccc;font-size:8.5pt;color:#555;text-align:center}
@media print{body{padding:0}.page{padding:30px 40px}}
`;

// ─── Header Component ─────────────────────────────────────────────────────────
function header(p) {
  return `
<div class="lh">
  <img src="${LOGO_URL}" alt="Corvus Studio Logo">
  <div class="lh-name">Corvus Studio</div>
  <div class="lh-tag">Motion that Speaks.</div>
  <div class="lh-ref">Ref: <strong>${p.DOCUMENT_ID}</strong> &nbsp;|&nbsp; ${p.DATE} &nbsp;|&nbsp; Confidential</div>
</div>`;
}

// ─── Acceptance Block Component ───────────────────────────────────────────────
function acceptance(p, typeNote) {
  return `
<div class="acceptance">
  <div class="lh" style="margin-bottom:26px">
    <img src="${LOGO_URL}" alt="Corvus Studio Logo">
    <div class="lh-name">Corvus Studio</div>
    <div class="lh-tag">Motion that Speaks.</div>
  </div>

  <div class="acc-title">Acceptance</div>
  <div class="acc-body">
    <p>I, <strong>${p.NAME}</strong>, accept the role of <strong>${p.DESIGNATION}</strong> with Corvus Studio under the terms outlined in this offer letter. ${typeNote}</p>
    <p>I look forward to contributing meaningfully to Corvus Studio's creative and production goals, and to growing through this collaborative experience.</p>
  </div>
  <div class="acc-fields">
    <div class="acc-field"><label>Signature:</label><div class="field-line"></div></div>
    <div class="acc-field"><label>Name:</label><div class="field-line"></div></div>
    <div class="acc-field"><label>Date:</label><div class="field-line"></div></div>
  </div>

  <div class="sig" style="margin-top:40px">
    <p>We are glad to have you join Corvus Studio, and look forward to building thoughtful, production-ready creative work together.</p>
    <p style="margin-top:10px">Sincerely,</p>
    <div class="sig-line">
      Authorized Signatory<br><strong>Corvus Studio</strong>
    </div>
  </div>

  <div class="footer">
    Corvus Studio &mdash; thecorvusstudio.com &nbsp;|&nbsp; soumya@thecorvusstudio.com
  </div>
</div>`;
}

// ─── Page Wrapper ─────────────────────────────────────────────────────────────
function wrap(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Offer Letter — Corvus Studio</title>
<style>${CSS}</style>
</head>
<body><div class="page">${content}</div></body>
</html>`;
}

// ─── Template: Intern (3D Artist) — Master ────────────────────────────────────
function intern3d(p) {
  return wrap(`
${header(p)}
<div class="title">
  <h1>Offer Letter</h1>
  <p>${p.DESIGNATION} Internship</p>
</div>
<div class="body">
<p>Dear ${p.NAME},</p>
<p>On behalf of Corvus Studio, we are pleased to offer you the position of <strong>${p.DESIGNATION}</strong>, working remotely with our production team, effective from <strong>${p.JOINING}</strong>. This internship is intended to provide you with practical, production-oriented experience within our character art pipeline.</p>
<p>This is an unpaid, portfolio-building internship for a period of four (4) months, concluding unless terminated earlier in accordance with the notice provision below. This engagement is a voluntary internship and does not constitute an offer of employment, a freelance engagement, or a volunteer programme. Nothing in this letter shall be construed as creating an employer-employee relationship between you and the Studio.</p>
<p>You are expected to contribute approximately fifteen (15) to twenty (20) hours per week towards your responsibilities under this internship. Your schedule with the Studio will be arranged flexibly, based on mutual availability and the requirements of ongoing projects.</p>
<p>Your responsibilities will include character modelling, sculpting, retopology, texturing, and asset development, along with contribution to internal studio projects and collaboration within the broader production pipeline, and any other related tasks reasonably assigned in connection with the role.</p>
<p><span class="cl">Confidentiality.</span> As part of this internship, you may have access to internal assets, workflows, project concepts, and other proprietary materials. You are required to maintain strict confidentiality in respect of all such studio-related information, files, and materials, both during and after the internship, and must not share any of it externally without the Studio's prior written permission. Failure to comply may result in immediate termination of this engagement.</p>
<p><span class="cl">Intellectual Property.</span> All work, models, sculpts, textures, and other creative output produced by you in connection with Corvus Studio projects during this internship shall remain the sole and exclusive property of Corvus Studio, and may not be used, reproduced, or claimed by you, in whole or in part, without the Studio's prior written consent.</p>
<p><span class="cl">Portfolio Use.</span> Subject to prior written approval from Corvus Studio, you may showcase approved and publicly released work in your personal portfolio, resume, and showreel, and on platforms such as ArtStation and LinkedIn.</p>
<p><span class="cl">Professional Conduct.</span> We expect professional conduct throughout the internship, including respectful communication with the team and adherence to agreed deadlines and studio processes.</p>
<p><span class="cl">Notice Period.</span> Either party may discontinue this collaboration at any time by providing a minimum notice period of seven (7) days, in writing, through email, to allow for an orderly transition of ongoing work.</p>
<p><span class="cl">Completion Certificate.</span> Upon satisfactory completion of the internship term, Corvus Studio will issue an Internship Completion Certificate acknowledging your role, duration, and contribution.</p>
<p><span class="cl">Future Opportunities.</span> As Corvus Studio grows into a more established production environment, there may be opportunities for future paid engagements based on performance, reliability, and contribution. This internship does not entitle you to, and does not guarantee, any future employment, engagement, or compensation with the Studio.</p>
<p>We look forward to building disciplined, technically strong, and production-ready creative work together.</p>
<p>Sincerely,</p>
</div>
<div class="sig">
  <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
</div>
${acceptance(p, "I understand that this is a voluntary, unpaid internship for a duration of four (4) months and does not constitute an employment contract. Either party may conclude this engagement with the prior notice period mentioned above.")}
`);
}

// ─── Template: Intern (2D Artist) ────────────────────────────────────────────
function intern2d(p) {
  return wrap(`
${header(p)}
<div class="title">
  <h1>Offer Letter</h1>
  <p>${p.DESIGNATION} Internship</p>
</div>
<div class="body">
<p>Dear ${p.NAME},</p>
<p>On behalf of Corvus Studio, we are pleased to offer you the position of <strong>${p.DESIGNATION}</strong> within our creative team, working remotely, effective from <strong>${p.JOINING}</strong>. This internship is designed to immerse you in a production-grade creative environment and build practical skills in 2D design and illustration.</p>
<p>This is an unpaid, portfolio-building internship for a duration of four (4) months, unless concluded earlier per the notice terms below. This engagement is a voluntary internship and shall not be interpreted as an offer of employment, a freelance arrangement, or a paid creative contract. Nothing herein creates an employer-employee relationship between you and Corvus Studio.</p>
<p>You are expected to dedicate approximately fifteen (15) to twenty (20) hours per week to your responsibilities. Your working hours will be agreed upon flexibly based on project requirements and mutual availability.</p>
<p>Your responsibilities will include 2D illustration, concept development, character design, visual asset creation, and contribution to live studio projects, along with any other tasks reasonably assigned in connection with your role.</p>
<p><span class="cl">Confidentiality.</span> You will maintain strict confidentiality regarding all internal assets, project briefs, stylesheets, concepts, and proprietary materials accessed during this internship. Breach of confidentiality may result in immediate termination.</p>
<p><span class="cl">Intellectual Property.</span> All creative work produced during this internship in connection with Corvus Studio projects is and shall remain the sole intellectual property of Corvus Studio. You may not reproduce, claim, or distribute such work without prior written consent from the Studio.</p>
<p><span class="cl">Portfolio Use.</span> With prior written approval, you may feature publicly released and approved work in your personal portfolio, showreel, ArtStation, and LinkedIn profiles.</p>
<p><span class="cl">Professional Conduct.</span> You are expected to maintain respectful communication, meet agreed deadlines, and uphold the creative standards of the Studio throughout your internship.</p>
<p><span class="cl">Notice Period.</span> Either party may conclude this engagement with a minimum of seven (7) days written notice via email, to allow for proper transition of work.</p>
<p><span class="cl">Completion Certificate.</span> Upon satisfactory completion, Corvus Studio will issue a formal Internship Completion Certificate recognising your contribution and role.</p>
<p>We are excited to have you join our creative team and look forward to growing together.</p>
<p>Sincerely,</p>
</div>
<div class="sig">
  <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
</div>
${acceptance(p, "I understand that this is a voluntary, unpaid internship for a duration of four (4) months and does not constitute an employment contract.")}
`);
}

// ─── Template: Freelancer ─────────────────────────────────────────────────────
function freelancer(p) {
  return wrap(`
${header(p)}
<div class="title">
  <h1>Freelance Engagement Letter</h1>
  <p>${p.DESIGNATION}</p>
</div>
<div class="body">
<p>Dear ${p.NAME},</p>
<p>On behalf of Corvus Studio, we are pleased to engage you as a <strong>${p.DESIGNATION}</strong> on a project-based freelance basis, effective from <strong>${p.JOINING}</strong>. This letter formalises the terms of your engagement with the Studio.</p>
<p>You will be engaged as an independent contractor and not as an employee of Corvus Studio. This arrangement does not create an employer-employee relationship, and you will not be entitled to any employment benefits, statutory entitlements, or rights arising from an employment contract.</p>
<p>Your remuneration for services rendered will be <strong>${p.STIPEND}</strong>, payable as mutually agreed upon completion of milestones or at the end of agreed billing cycles. Specific deliverables, timelines, and payment terms will be communicated on a project-by-project basis.</p>
<p>Your scope of work will include responsibilities pertaining to <strong>${p.DESIGNATION}</strong> functions within the <strong>${p.DEPARTMENT}</strong> team, along with any additional tasks reasonably assigned in connection with active studio projects.</p>
<p><span class="cl">Confidentiality.</span> You agree to maintain strict confidentiality with respect to all internal project materials, client assets, workflows, technical specifications, and proprietary studio information, both during and after your engagement with Corvus Studio.</p>
<p><span class="cl">Intellectual Property.</span> All deliverables, creative outputs, models, renders, and other work products produced in connection with Corvus Studio projects shall be the sole and exclusive intellectual property of Corvus Studio upon submission and payment.</p>
<p><span class="cl">Portfolio Use.</span> You may display publicly released and approved project work in your personal portfolio and professional profiles upon receiving written approval from Corvus Studio.</p>
<p><span class="cl">Notice Period.</span> Either party may conclude this engagement with a minimum of fourteen (14) days prior written notice by email, subject to completion of any outstanding deliverables.</p>
<p>We look forward to a productive and professional collaboration.</p>
<p>Sincerely,</p>
</div>
<div class="sig">
  <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
</div>
${acceptance(p, "I understand that this is a freelance engagement on a project basis and does not constitute an employment contract.")}
`);
}

// ─── Template: Full-Time ──────────────────────────────────────────────────────
function fulltime(p) {
  return wrap(`
${header(p)}
<div class="title">
  <h1>Offer of Employment</h1>
  <p>${p.DESIGNATION} &mdash; ${p.DEPARTMENT}</p>
</div>
<div class="body">
<p>Dear ${p.NAME},</p>
<p>On behalf of Corvus Studio, we are delighted to extend this formal offer of employment for the position of <strong>${p.DESIGNATION}</strong> within the <strong>${p.DEPARTMENT}</strong> team, effective from <strong>${p.JOINING}</strong>. You will be reporting to <strong>${p.MANAGER}</strong>.</p>
<p>Your monthly compensation for this role will be <strong>${p.STIPEND}</strong>, payable in accordance with the Studio's standard payroll cycle. This offer is conditional upon the successful completion of any applicable background verification and onboarding documentation.</p>
<p>Your work location will be <strong>${p.LOCATION}</strong>. Your standard working hours and schedule will be communicated separately by your reporting manager as part of the onboarding process.</p>
<p>Your responsibilities will encompass the full scope of your designated role within the <strong>${p.DEPARTMENT}</strong> team, including any related functions, cross-departmental collaboration, and any other tasks reasonably assigned to you in connection with your designation.</p>
<p><span class="cl">Probation Period.</span> Your employment will begin with a probationary period of three (3) months from your date of joining. During this period, either party may terminate this engagement with a minimum notice of fifteen (15) days. Upon successful completion of the probationary period, your employment will be confirmed in writing.</p>
<p><span class="cl">Confidentiality.</span> You agree to maintain strict confidentiality regarding all proprietary studio information, client data, internal workflows, financial information, and any other materials of a sensitive nature, both during and after the term of your employment with Corvus Studio.</p>
<p><span class="cl">Intellectual Property.</span> All work produced by you in the course of your employment with Corvus Studio shall be the sole intellectual property of Corvus Studio and may not be used, reproduced, or shared externally without prior written authorisation.</p>
<p><span class="cl">Leave Entitlements.</span> You will be entitled to leave benefits as per the Studio's Leave Policy, communicated through our internal leave management system.</p>
<p><span class="cl">Notice Period.</span> Post-probation, either party may terminate this employment by providing a minimum notice period of thirty (30) days, in writing.</p>
<p>We look forward to welcoming you to the team.</p>
<p>Sincerely,</p>
</div>
<div class="sig">
  <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
</div>
${acceptance(p, "I understand and accept the terms of employment as outlined in this offer letter, including the probationary period and notice terms.")}
`);
}

// ─── Template: Contract ───────────────────────────────────────────────────────
function contract(p) {
  return wrap(`
${header(p)}
<div class="title">
  <h1>Contract Engagement Letter</h1>
  <p>${p.DESIGNATION}</p>
</div>
<div class="body">
<p>Dear ${p.NAME},</p>
<p>On behalf of Corvus Studio, we are pleased to offer you a fixed-term contract engagement as <strong>${p.DESIGNATION}</strong> within the <strong>${p.DEPARTMENT}</strong> team, commencing from <strong>${p.JOINING}</strong>. You will be reporting to <strong>${p.MANAGER}</strong>.</p>
<p>Your engagement will be on a contractual basis for a defined project or duration, which will be communicated separately. This engagement does not constitute permanent employment.</p>
<p>Your compensation for this engagement will be <strong>${p.STIPEND}</strong>, payable as agreed upon achievement of defined milestones or at the end of the contract period.</p>
<p><span class="cl">Confidentiality.</span> You are required to maintain the confidentiality of all proprietary materials, project files, client information, and internal assets accessed during this engagement.</p>
<p><span class="cl">Intellectual Property.</span> All work created in connection with Corvus Studio projects during this engagement shall be the exclusive property of Corvus Studio.</p>
<p><span class="cl">Notice Period.</span> Either party may terminate this engagement early with a minimum of fourteen (14) days written notice.</p>
<p>We look forward to a productive collaboration.</p>
<p>Sincerely,</p>
</div>
<div class="sig">
  <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
</div>
${acceptance(p, "I understand that this is a fixed-term contract engagement and does not constitute permanent employment.")}
`);
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function generateOfferLetterHtml(employee, documentId, options = {}) {
  const p = buildPlaceholders(employee, documentId, options);
  switch (selectTemplate(employee)) {
    case 'intern_2d':    return intern2d(p);
    case 'intern_concept': return intern2d(p); // same style as 2d
    case 'freelancer':   return freelancer(p);
    case 'contract':     return contract(p);
    case 'fulltime':     return fulltime(p);
    default:             return intern3d(p);
  }
}
