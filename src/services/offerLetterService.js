/**
 * Offer Letter Service — Corvus Studio
 * Exact match to real issued offer letters:
 * - Header: C-mark logo left + CORVUS STUDIO text + Motion that Speaks. right
 * - C9C9C9 bottom border on header
 * - Calibri 11pt justified body
 * - Watermark: C-mark faint in page center
 * - Footer: YASH CORPORATION address on every page
 * - Acceptance always on page 2
 */

// Logos served from Cloudflare Pages static assets
const LOGO_MARK  = 'https://leave.thecorvusstudio.com/corvus-logo-full.png'; // C-mark only (header + watermark)

// ─── Helpers ─────────────────────────────────────────────────────────────────
export async function generateDocumentId(db) {
  const r = await db.prepare(
    `SELECT document_id FROM offer_letters WHERE document_id LIKE 'CS%' ORDER BY id DESC LIMIT 1`
  ).first();
  let n = 1;
  if (r?.document_id) { const m = r.document_id.match(/CS(\d+)/i); if (m) n = parseInt(m[1]) + 1; }
  return `CS${String(n).padStart(3, '0')}`;
}

export function detectEmploymentType(str) {
  if (!str) return 'Full-Time';
  const t = str.toLowerCase();
  if (t.includes('intern'))    return 'Intern';
  if (t.includes('freelance')) return 'Freelancer';
  if (t.includes('contract'))  return 'Contract';
  return 'Full-Time';
}

export function selectTemplate(emp) {
  const type = detectEmploymentType(emp.employee_type);
  const role = ((emp.designation || '') + ' ' + (emp.department || '')).toLowerCase();
  if (type === 'Intern') {
    if (role.includes('concept') || role.includes('2d')) return 'intern_generic';
    return 'intern_3d';
  }
  if (type === 'Freelancer') return 'freelancer';
  if (type === 'Contract')   return 'contract';
  return 'fulltime';
}

export function buildPlaceholders(emp, docId, opts = {}) {
  const today = () => new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' });
  const fmt = d => { try { return new Date(d).toLocaleDateString('en-GB', { day:'2-digit', month:'long', year:'numeric' }); } catch { return today(); } };
  return {
    DOC_ID:    docId,
    DATE:      opts.issueDate || today(),
    NAME:      emp.full_name    || '',
    ROLE:      emp.designation  || 'Team Member',
    DEPT:      emp.department   || 'Production',
    JOINING:   fmt(emp.joining_date),
    STIPEND:   opts.salary || emp.salary || 'unpaid',
    LOCATION:  opts.workLocation    || 'Remote',
    MANAGER:   opts.reportingManager || 'Raj Kishore Kumar',
  };
}

// ─── CSS (exact DOCX measurements) ───────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Cabin:wght@400;500;600;700&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{font-family:Calibri,'Cabin',Arial,sans-serif;font-size:11pt;color:#171717;background:#fff}

/* Page container */
.page{
  max-width:740px;margin:0 auto;
  padding:0 52px 80px;
  position:relative;overflow:hidden;
}

/* Watermark */
.wm{
  position:fixed;top:50%;left:50%;
  transform:translate(-50%,-50%);
  width:340px;height:340px;
  opacity:0.06;pointer-events:none;z-index:0;
  object-fit:contain;
}

/* Header 2-col table */
.lh{padding-top:20px;position:relative;z-index:1}
.lh table{width:100%;border-collapse:collapse}
.lh-left{width:60%;vertical-align:middle;padding:4px 0}
.lh-right{width:40%;vertical-align:middle;text-align:right;padding:4px 0}
.lh-logo-row{display:flex;align-items:center;gap:10px}
.lh-mark{height:56px;width:56px;object-fit:contain}
.lh-name{font-size:15pt;font-weight:700;color:#171717;letter-spacing:0.3px}
.lh-tagline{font-size:9.5pt;color:#5a5a5a;line-height:1.4}
.lh-tagline b{font-weight:700}
.lh-date{font-size:9.5pt;color:#5a5a5a;margin-top:6px}
.lh-border{border-bottom:1.5px solid #c9c9c9;margin:10px 0 18px}

/* Title */
.title{text-align:center;margin:16px 0 4px;position:relative;z-index:1}
.title h1{font-size:14pt;font-weight:700;text-decoration:underline;text-underline-offset:4px;letter-spacing:0.5px}
.title .sub{font-size:10.5pt;font-style:italic;color:#333;margin-top:4px}

/* Body */
.body{position:relative;z-index:1}
.body p{margin-bottom:11px;text-align:justify;line-height:1.65;font-size:11pt}

/* Signature */
.sig{margin-top:32px;position:relative;z-index:1}
.sig-line{width:240px;border-top:1px solid #171717;margin-top:38px;padding-top:6px}
.sig-line p{font-size:10.5pt;line-height:1.5}

/* Footer — YASH CORPORATION (from real letterhead) */
.footer{
  position:fixed;bottom:0;left:0;right:0;
  text-align:center;
  font-size:7.5pt;color:#444;
  padding:6px 0 8px;
  border-top:1px solid #d0d0d0;
  background:#fff;
  z-index:10;
  line-height:1.5;
}

/* PAGE 2 — acceptance — always new page */
.acceptance{page-break-before:always;position:relative;overflow:hidden}
.acc-title{text-align:center;font-size:13pt;font-weight:700;text-decoration:underline;text-underline-offset:4px;margin:22px 0 16px;position:relative;z-index:1}
.acc-body{position:relative;z-index:1}
.acc-body p{margin-bottom:10px;text-align:justify;line-height:1.65;font-size:11pt}
.acc-fields{margin-top:24px;position:relative;z-index:1}
.acc-field{display:flex;align-items:flex-end;margin-bottom:18px;gap:8px}
.acc-field label{font-size:10.5pt;white-space:nowrap;padding-bottom:1px}
.field-line{flex:1;border-bottom:1px solid #555;min-width:200px;height:18px}
.acc-field .prefilled{font-weight:700;font-size:10.5pt;padding-bottom:1px}

@media print{
  html,body{padding:0}
  .page{padding:0 40px 80px;max-width:100%}
  .wm{position:fixed}
  .footer{position:fixed;bottom:0;left:0;right:0}
}`;

// ─── Footer (exact from real letter) ────────────────────────────────────────
const FOOTER = `
<div class="footer">
  <strong>YASH CORPORATION</strong><br>
  Shop No - 04, ALPHONNE COMPLEX, NR PRIMARY SCHOOL, JHALIRAJDA, Junagadh, Gujarat, 360022
</div>`;

// ─── Header Component (C-mark + CORVUS STUDIO text + Motion that Speaks.) ────
function lh(date) {
  return `
<div class="lh">
  <table><tr>
    <td class="lh-left">
      <div class="lh-logo-row">
        <img src="${LOGO_MARK}" class="lh-mark" alt="Corvus Studio">
        <span class="lh-name">CORVUS STUDIO</span>
      </div>
    </td>
    <td class="lh-right">
      <div class="lh-tagline">Motion that <b>Speaks.</b></div>
      <div class="lh-date">${date}</div>
    </td>
  </tr></table>
  <div class="lh-border"></div>
</div>`;
}

// ─── Watermark ────────────────────────────────────────────────────────────────
const WM = `<img src="${LOGO_MARK}" class="wm" alt="">`;

// ─── Acceptance page ──────────────────────────────────────────────────────────
function acceptance(p, note) {
  return `
<div class="acceptance">
  ${WM}
  ${lh(p.DATE)}

  <div class="acc-title">ACCEPTANCE</div>
  <div class="acc-body">
    <p><strong>I, ${p.NAME}</strong>, accept the role of <strong>${p.ROLE}</strong> with Corvus Studio under the terms outlined in this offer letter. ${note}</p>
    <p>I look forward to contributing meaningfully to Corvus Studio's creative and production goals, and to growing through this collaborative experience.</p>
    <p>Sincerely,</p>
  </div>

  <div class="acc-fields">
    <div class="acc-field"><label>Signature:</label><div class="field-line"></div></div>
    <div class="acc-field"><label>Name:</label><span class="prefilled">${p.NAME}</span></div>
    <div class="acc-field"><label>Date:</label><div class="field-line"></div></div>
  </div>

  <div class="sig" style="margin-top:36px">
    <p style="font-size:11pt;margin-bottom:6px">We are glad to have you join Corvus Studio, and look forward to building thoughtful, production-ready creative work together.</p>
    <p style="font-size:11pt;margin-bottom:0">Sincerely,</p>
    <div class="sig-line">
      <p style="margin-bottom:0"><strong>Authorized Signatory</strong></p>
      <p>Corvus Studio</p>
    </div>
  </div>
</div>`;
}

// ─── Page Wrap ────────────────────────────────────────────────────────────────
function wrap(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Offer Letter — Corvus Studio</title>
<style>${CSS}</style>
</head>
<body>
${FOOTER}
<div class="page">
  ${WM}
  ${content}
</div>
</body>
</html>`;
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE: INTERN 3D (master — exact DOCX paragraph order)
// ═══════════════════════════════════════════════════════════════════
function intern3d(p) {
  return wrap(`
${lh(p.DATE)}
<div class="title">
  <h1>OFFER LETTER</h1>
  <div class="sub">${p.ROLE} Internship</div>
</div>

<div class="body">
<p>Dear <strong>${p.NAME}</strong>,</p>

<p>On behalf of <strong>Corvus Studio</strong>, we are pleased to offer you the position of <strong>${p.ROLE}</strong>, working remotely with our production team, effective from <strong>${p.JOINING}</strong>. This internship is intended to provide you with practical, production-oriented experience within our character art pipeline.</p>

<p>This is an unpaid, portfolio-building internship for a period of four (4) months, concluding on <strong>${p.JOINING}</strong>, unless terminated earlier in accordance with the notice provision below. This engagement is a voluntary internship and does not constitute an offer of employment, a freelance engagement, or a volunteer programme. Nothing in this letter shall be construed as creating an employer-employee relationship between you and the Studio.</p>

<p>You are expected to contribute approximately <strong>twenty (20) hours</strong> per week towards your responsibilities under this internship. Your schedule with the Studio will be arranged flexibly, based on mutual availability and the requirements of ongoing projects.</p>

<p>Your responsibilities will include character modelling, sculpting, retopology, texturing, and asset development, along with contribution to internal studio projects and collaboration within the broader production pipeline, and any other related tasks reasonably assigned in connection with the role.</p>

<p>As part of this internship, you may have access to internal assets, workflows, project concepts, and other proprietary materials. You are required to maintain strict confidentiality in respect of all such studio-related information, files, and materials, both during and after the internship, and must not share any of it externally without the Studio's prior written permission. Failure to comply may result in immediate termination of this engagement.</p>

<p>All work, models, sculpts, textures, and other creative output produced by you in connection with Corvus Studio projects during this internship shall remain the sole and exclusive property of Corvus Studio, and may not be used, reproduced, or claimed by you, in whole or in part, without the Studio's prior written consent.</p>

<p>Subject to prior written approval from Corvus Studio, you may showcase approved and publicly released work in your personal portfolio, resume, and showreel, and on platforms such as ArtStation and LinkedIn.</p>

<p>We expect professional conduct throughout the internship, including respectful communication with the team and adherence to agreed deadlines and studio processes.</p>

<p>Either party may discontinue this collaboration at any time by providing a minimum notice period of <strong>seven (7) days</strong>, in writing, through email, to allow for an orderly transition of ongoing work.</p>

<p>Upon satisfactory completion of the internship term, Corvus Studio will issue an <strong>Internship Completion Certificate</strong> acknowledging your role, duration, and contribution.</p>

<p>As Corvus Studio grows into a more established production environment, there may be opportunities for future paid engagements based on performance, reliability, and contribution. This internship does not entitle you to, and does not guarantee, any future employment, engagement, or compensation with the Studio.</p>

<p>We look forward to building disciplined, technically strong, and production-ready creative work together.</p>

<p>Sincerely,</p>
</div>

<div class="sig">
  <div class="sig-line">
    <p style="margin-bottom:0"><strong>Authorized Signatory</strong></p>
    <p>Corvus Studio</p>
  </div>
</div>

${acceptance(p, 'I understand that this is a voluntary, unpaid internship for a duration of four (4) months and does not constitute an employment contract. Either party may conclude this engagement with the prior notice period mentioned above.')}
`);
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE: INTERN GENERIC (2D / Concept / HR)
// ═══════════════════════════════════════════════════════════════════
function internGeneric(p) {
  return wrap(`
${lh(p.DATE)}
<div class="title">
  <h1>OFFER LETTER</h1>
  <div class="sub">${p.ROLE} Internship</div>
</div>

<div class="body">
<p>Dear <strong>${p.NAME}</strong>,</p>

<p>On behalf of <strong>Corvus Studio</strong>, we are pleased to offer you the position of <strong>${p.ROLE}</strong>, working remotely with our creative team, effective from <strong>${p.JOINING}</strong>. This internship is designed to provide you with hands-on, production-grade creative experience.</p>

<p>This is an unpaid, portfolio-building internship for a duration of four (4) months, unless concluded earlier per the notice terms below. This engagement is a voluntary internship and shall not be interpreted as an offer of employment, a freelance arrangement, or a paid creative contract. Nothing herein creates an employer-employee relationship between you and Corvus Studio.</p>

<p>You are expected to dedicate approximately <strong>fifteen (15) to twenty (20) hours</strong> per week to your responsibilities. Your working hours will be agreed upon flexibly based on project requirements and mutual availability.</p>

<p>Your responsibilities will include creative tasks aligned with your role as <strong>${p.ROLE}</strong>, contribution to studio projects, and any other tasks reasonably assigned in connection with your designation.</p>

<p>You will maintain strict confidentiality regarding all internal assets, project briefs, concepts, and proprietary materials accessed during this internship. Breach of confidentiality may result in immediate termination.</p>

<p>All creative work produced during this internship in connection with Corvus Studio projects is and shall remain the sole intellectual property of Corvus Studio. You may not reproduce, claim, or distribute such work without prior written consent from the Studio.</p>

<p>With prior written approval, you may feature publicly released and approved work in your personal portfolio, showreel, ArtStation, and LinkedIn profiles.</p>

<p>You are expected to maintain respectful communication, meet agreed deadlines, and uphold the creative standards of the Studio throughout your internship.</p>

<p>Either party may conclude this engagement with a minimum of <strong>seven (7) days</strong> written notice via email.</p>

<p>Upon satisfactory completion, Corvus Studio will issue a formal <strong>Internship Completion Certificate</strong> recognising your contribution and role.</p>

<p>We are excited to have you join our creative team and look forward to growing together.</p>

<p>Sincerely,</p>
</div>

<div class="sig">
  <div class="sig-line">
    <p style="margin-bottom:0"><strong>Authorized Signatory</strong></p>
    <p>Corvus Studio</p>
  </div>
</div>

${acceptance(p, 'I understand that this is a voluntary, unpaid internship for a duration of four (4) months and does not constitute an employment contract. Either party may conclude this engagement with the prior notice period mentioned above.')}
`);
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE: FREELANCER
// ═══════════════════════════════════════════════════════════════════
function freelancer(p) {
  return wrap(`
${lh(p.DATE)}
<div class="title">
  <h1>FREELANCE ENGAGEMENT LETTER</h1>
  <div class="sub">${p.ROLE} &mdash; ${p.DEPT}</div>
</div>

<div class="body">
<p>Dear <strong>${p.NAME}</strong>,</p>

<p>On behalf of <strong>Corvus Studio</strong>, we are pleased to engage you as a <strong>${p.ROLE}</strong> on a project-based freelance basis, effective from <strong>${p.JOINING}</strong>. This letter formalises the terms of your engagement with the Studio.</p>

<p>You will be engaged as an independent contractor and not as an employee of Corvus Studio. This arrangement does not create an employer-employee relationship, and you will not be entitled to any employment benefits, statutory entitlements, or rights arising from an employment contract.</p>

<p>Your remuneration for services rendered will be <strong>${p.STIPEND}</strong>, payable as mutually agreed upon completion of milestones or at the end of agreed billing cycles. Specific deliverables, timelines, and payment terms will be communicated on a project-by-project basis.</p>

<p>Your scope of work will include responsibilities pertaining to <strong>${p.ROLE}</strong> functions within the <strong>${p.DEPT}</strong> team, along with any additional tasks reasonably assigned in connection with active studio projects.</p>

<p>You agree to maintain strict confidentiality with respect to all internal project materials, client assets, workflows, technical specifications, and proprietary studio information, both during and after your engagement with Corvus Studio.</p>

<p>All deliverables, creative outputs, models, renders, and other work products produced in connection with Corvus Studio projects shall be the sole and exclusive intellectual property of Corvus Studio upon submission and payment.</p>

<p>You may display publicly released and approved project work in your personal portfolio and professional profiles upon receiving written approval from Corvus Studio.</p>

<p>Either party may conclude this engagement with a minimum of <strong>fourteen (14) days</strong> prior written notice by email, subject to completion of any outstanding deliverables.</p>

<p>We look forward to a productive and professional collaboration.</p>

<p>Sincerely,</p>
</div>

<div class="sig">
  <div class="sig-line">
    <p style="margin-bottom:0"><strong>Authorized Signatory</strong></p>
    <p>Corvus Studio</p>
  </div>
</div>

${acceptance(p, 'I understand that this is a freelance engagement on a project basis and does not constitute an employment contract. Either party may conclude this engagement with a minimum of fourteen (14) days written notice.')}
`);
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE: FULL-TIME
// ═══════════════════════════════════════════════════════════════════
function fulltime(p) {
  return wrap(`
${lh(p.DATE)}
<div class="title">
  <h1>OFFER OF EMPLOYMENT</h1>
  <div class="sub">${p.ROLE} &mdash; ${p.DEPT}</div>
</div>

<div class="body">
<p>Dear <strong>${p.NAME}</strong>,</p>

<p>On behalf of <strong>Corvus Studio</strong>, we are delighted to extend this formal offer of employment for the position of <strong>${p.ROLE}</strong> within the <strong>${p.DEPT}</strong> team, effective from <strong>${p.JOINING}</strong>. You will be reporting to <strong>${p.MANAGER}</strong>.</p>

<p>Your monthly compensation for this role will be <strong>${p.STIPEND}</strong>, payable in accordance with the Studio's standard payroll cycle. This offer is conditional upon the successful completion of any applicable background verification and onboarding documentation.</p>

<p>Your work location will be <strong>${p.LOCATION}</strong>. Your standard working hours and schedule will be communicated separately by your reporting manager as part of the onboarding process.</p>

<p>Your responsibilities will encompass the full scope of your designated role within the <strong>${p.DEPT}</strong> team, including any related functions, cross-departmental collaboration, and any other tasks reasonably assigned to you in connection with your designation.</p>

<p>Your employment will begin with a probationary period of <strong>three (3) months</strong> from your date of joining. During this period, either party may terminate this engagement with a minimum notice of fifteen (15) days. Upon successful completion of the probationary period, your employment will be confirmed in writing.</p>

<p>You agree to maintain strict confidentiality regarding all proprietary studio information, client data, internal workflows, financial information, and any other materials of a sensitive nature, both during and after the term of your employment with Corvus Studio.</p>

<p>All work produced by you in the course of your employment with Corvus Studio shall be the sole intellectual property of Corvus Studio and may not be used, reproduced, or shared externally without prior written authorisation.</p>

<p>You will be entitled to leave benefits as per the Studio's Leave Policy, communicated through our internal leave management system.</p>

<p>Post-probation, either party may terminate this employment by providing a minimum notice period of <strong>thirty (30) days</strong>, in writing.</p>

<p>We look forward to welcoming you to the team.</p>

<p>Sincerely,</p>
</div>

<div class="sig">
  <div class="sig-line">
    <p style="margin-bottom:0"><strong>Authorized Signatory</strong></p>
    <p>Corvus Studio</p>
  </div>
</div>

${acceptance(p, 'I understand and accept the terms of employment outlined in this offer letter, including the probationary period and notice period.')}
`);
}

// ═══════════════════════════════════════════════════════════════════
// TEMPLATE: CONTRACT
// ═══════════════════════════════════════════════════════════════════
function contract(p) {
  return wrap(`
${lh(p.DATE)}
<div class="title">
  <h1>CONTRACT ENGAGEMENT LETTER</h1>
  <div class="sub">${p.ROLE} &mdash; ${p.DEPT}</div>
</div>

<div class="body">
<p>Dear <strong>${p.NAME}</strong>,</p>

<p>On behalf of <strong>Corvus Studio</strong>, we are pleased to offer you a fixed-term contract engagement as <strong>${p.ROLE}</strong> within the <strong>${p.DEPT}</strong> team, commencing from <strong>${p.JOINING}</strong>. You will be reporting to <strong>${p.MANAGER}</strong>.</p>

<p>Your engagement will be on a contractual basis for a defined project or duration, which will be communicated separately. This engagement does not constitute permanent employment with Corvus Studio.</p>

<p>Your compensation for this engagement will be <strong>${p.STIPEND}</strong>, payable as agreed upon achievement of defined milestones or at the end of the contract period.</p>

<p>You are required to maintain the confidentiality of all proprietary materials, project files, client information, and internal assets accessed during this engagement.</p>

<p>All work created in connection with Corvus Studio projects during this engagement shall be the exclusive property of Corvus Studio.</p>

<p>Either party may terminate this engagement early with a minimum of <strong>fourteen (14) days</strong> written notice via email.</p>

<p>We look forward to a productive collaboration.</p>

<p>Sincerely,</p>
</div>

<div class="sig">
  <div class="sig-line">
    <p style="margin-bottom:0"><strong>Authorized Signatory</strong></p>
    <p>Corvus Studio</p>
  </div>
</div>

${acceptance(p, 'I understand that this is a fixed-term contract engagement and does not constitute permanent employment.')}
`);
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export function generateOfferLetterHtml(employee, documentId, options = {}) {
  const p = buildPlaceholders(employee, documentId, options);
  switch (selectTemplate(employee)) {
    case 'intern_generic': return internGeneric(p);
    case 'freelancer':     return freelancer(p);
    case 'contract':       return contract(p);
    case 'fulltime':       return fulltime(p);
    default:               return intern3d(p);
  }
}
