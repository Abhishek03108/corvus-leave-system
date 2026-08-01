/**
 * Offer Letter Service — Corvus Studio
 * EXACT match to Canva design:
 * - Top: Full-width grey stripe + black square top-right
 * - Header: C-mark logo + "CORVUS STUDIO" (DM Sans Bold) | "Motion that Speaks." (DM Sans 15.4pt) + Date
 * - Body: Times New Roman 11pt, justified
 * - Footer: Black bg, white YASH CORPORATION text
 * - 2 pages total: Page 1 = letter, Page 2 = acceptance
 */

const LOGO_MARK = 'https://leave.thecorvusstudio.com/corvus-logo-full.png'; // C-mark only

// ─── Helpers ──────────────────────────────────────────────────────────────────
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
    DOC_ID:   docId,
    DATE:     opts.issueDate || today(),
    NAME:     emp.full_name   || '',
    ROLE:     emp.designation || 'Team Member',
    DEPT:     emp.department  || 'Production',
    JOINING:  fmt(emp.joining_date),
    END_DATE: (() => { try { const d = new Date(emp.joining_date); d.setMonth(d.getMonth()+4); return d.toLocaleDateString('en-GB',{day:'2-digit',month:'long',year:'numeric'}); } catch { return today(); } })(),
    STIPEND:  opts.salary || emp.salary || 'unpaid',
    LOCATION: opts.workLocation    || 'Remote',
    MANAGER:  opts.reportingManager || 'Raj Kishore Kumar',
  };
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { background: #fff; color: #1a1a1a; }

/* ── Page Layout ── */
.page {
  width: 794px; /* A4 at 96dpi */
  min-height: 1123px;
  margin: 0 auto;
  padding: 0 0 60px 0;
  position: relative;
  font-family: 'Times New Roman', Times, serif;
  font-size: 11pt;
  background: #fff;
}

/* ── Top Stripe: grey bar + black square right ── */
.top-stripe {
  width: 100%;
  height: 20px;
  background: #b0b0b0;
  position: relative;
  margin-bottom: 0;
}
.top-stripe::after {
  content: '';
  position: absolute;
  right: 0; top: 0;
  width: 48px; height: 100%;
  background: #1a1a1a;
}

/* ── Header area ── */
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 36px 10px 36px;
}
.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}
.header-logo {
  height: 68px; width: 68px;
  object-fit: contain;
}
.header-studio {
  font-family: 'DM Sans', Arial, sans-serif;
  font-size: 17pt;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 0.5px;
}
.header-right {
  text-align: right;
}
.header-tagline {
  font-family: 'DM Sans', Arial, sans-serif;
  font-size: 15.4pt;
  font-weight: 400;
  color: #1a1a1a;
  line-height: 1.2;
}
.header-tagline b { font-weight: 700; }
.header-date {
  font-family: 'DM Sans', Arial, sans-serif;
  font-size: 10pt;
  color: #333;
  margin-top: 5px;
}
.header-line {
  border: none;
  border-top: 1px solid #888;
  margin: 0 36px 14px 36px;
}

/* ── Watermark ── */
.wm {
  position: absolute;
  top: 50%; left: 50%;
  transform: translate(-50%, -50%);
  width: 300px; height: 300px;
  opacity: 0.055;
  object-fit: contain;
  pointer-events: none;
  z-index: 0;
}

/* ── Content body ── */
.content {
  padding: 0 36px;
  position: relative;
  z-index: 1;
}

/* ── Title ── */
.offer-title {
  text-align: center;
  font-family: 'Times New Roman', serif;
  font-size: 13.5pt;
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 3px;
  margin-bottom: 2px;
}
.offer-sub {
  text-align: center;
  font-family: 'Times New Roman', serif;
  font-size: 10.5pt;
  font-style: italic;
  color: #333;
  margin-bottom: 14px;
}

/* ── Body ── */
.body p {
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.5;
  text-align: justify;
  margin-bottom: 9px;
  color: #1a1a1a;
}
.body p.salutation {
  text-align: left;
  margin-bottom: 9px;
}
.co { font-weight: bold; } /* Corvus Studio */

/* ── Signature ── */
.sig {
  margin-top: 10px;
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
}
.sig-gap { height: 36px; }
.sig-line {
  width: 220px;
  border-top: 1px solid #1a1a1a;
  padding-top: 5px;
  margin-top: 0;
}
.sig-line p { font-size: 10.5pt; line-height: 1.5; }

/* ── Footer (Black bg, white text — from real letterhead) ── */
.footer {
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: #1a1a1a;
  color: #fff;
  text-align: center;
  font-family: 'Times New Roman', serif;
  font-size: 7.8pt;
  padding: 6px 20px 7px;
  line-height: 1.6;
  z-index: 100;
}
.footer strong { font-size: 8.5pt; letter-spacing: 0.5px; }

/* ── Page 2 (Acceptance) ── */
.page-2 {
  page-break-before: always;
  width: 794px;
  min-height: 1123px;
  margin: 0 auto;
  padding: 0 0 60px 0;
  position: relative;
  background: #fff;
}
.acc-title {
  text-align: center;
  font-family: 'Times New Roman', serif;
  font-size: 13.5pt;
  font-weight: bold;
  text-decoration: underline;
  text-underline-offset: 3px;
  margin-bottom: 14px;
}
.acc-body p {
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
  line-height: 1.5;
  text-align: justify;
  margin-bottom: 9px;
}
.acc-field {
  display: flex;
  align-items: flex-end;
  margin-bottom: 14px;
  gap: 8px;
  font-family: 'Times New Roman', serif;
  font-size: 11pt;
}
.acc-field label { white-space: nowrap; min-width: 80px; }
.field-line {
  flex: 1;
  border-bottom: 1px solid #555;
  height: 18px;
  min-width: 180px;
}

@media print {
  html, body { margin: 0; padding: 0; }
  .page, .page-2 { width: 100%; }
  .footer { position: fixed; bottom: 0; left: 0; right: 0; }
  .wm { position: absolute; }
}
`;

// ─── Header Block (used on both pages) ───────────────────────────────────────
function headerBlock(date) {
  return `
<div class="top-stripe"></div>
<div class="header">
  <div class="header-left">
    <img src="${LOGO_MARK}" class="header-logo" alt="Corvus Studio">
    <span class="header-studio">CORVUS STUDIO</span>
  </div>
  <div class="header-right">
    <div class="header-tagline">Motion that <b>Speaks.</b></div>
    <div class="header-date">${date}</div>
  </div>
</div>
<hr class="header-line">`;
}

// ─── Footer Block ─────────────────────────────────────────────────────────────
const FOOTER = `
<div class="footer">
  <strong>YASH CORPORATION</strong><br>
  Shop No - 04, ALPHONNE COMPLEX, NR PRIMARY SCHOOL, JHALIRAJDA, Junagadh, Gujarat, 360022
</div>`;

// ─── Page 2: Acceptance ───────────────────────────────────────────────────────
function acceptancePage(p, note) {
  return `
<div class="page-2">
  <img src="${LOGO_MARK}" class="wm" alt="">
  ${headerBlock(p.DATE)}
  <div class="content">
    <div class="acc-title">ACCEPTANCE</div>
    <div class="acc-body">
      <p><strong>I, ${p.NAME}</strong>, accept the role of <strong>${p.ROLE}</strong> with <span class="co">Corvus Studio</span> under the terms outlined in this offer letter. ${note}</p>
      <p>I look forward to contributing meaningfully to Corvus Studio's creative and production goals, and to growing through this collaborative experience.</p>
      <p>Sincerely,</p>
    </div>
    <div style="margin-top:18px">
      <div class="acc-field">
        <label>Signature:</label>
        <div class="field-line"></div>
      </div>
      <div class="acc-field" style="align-items:center">
        <label>Name:</label>
        <strong style="font-size:11pt">${p.NAME}</strong>
      </div>
      <div class="acc-field">
        <label>Date:</label>
        <div class="field-line"></div>
      </div>
    </div>
    <div class="sig" style="margin-top:22px">
      <p>We are glad to have you join <span class="co">Corvus Studio</span>, and look forward to building thoughtful, production-ready creative work together.</p>
      <p style="margin-top:8px">Sincerely,</p>
      <div class="sig-gap"></div>
      <div class="sig-line">
        <p><strong>Authorized Signatory</strong></p>
        <p>Corvus Studio</p>
      </div>
    </div>
  </div>
</div>`;
}

// ─── Full Page Wrap ───────────────────────────────────────────────────────────
function wrap(page1Content, p) {
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
  <img src="${LOGO_MARK}" class="wm" alt="">
  ${headerBlock(p.DATE)}
  <div class="content">
${page1Content}
  </div>
</div>
${acceptancePage(p, 'I understand that this is a voluntary, unpaid internship for a duration of four (4) months and does not constitute an employment contract. Either party may conclude this engagement with the prior notice period mentioned above.')}
</body>
</html>`;
}

// ─── Signature block ──────────────────────────────────────────────────────────
function sigBlock() {
  return `
<div class="sig">
  <p>Sincerely,</p>
  <div class="sig-gap"></div>
  <div class="sig-line">
    <p><strong>Authorized Signatory</strong></p>
    <p>Corvus Studio</p>
  </div>
</div>`;
}

// ═══════════════════════════════════════════════════════════════════
// INTERN 3D (exact DOCX paragraph order, Times New Roman body)
// ═══════════════════════════════════════════════════════════════════
function intern3d(p) {
  const page1 = `
<div class="offer-title">OFFER LETTER</div>
<div class="offer-sub">${p.ROLE} Internship</div>
<div class="body">
<p class="salutation">Dear <strong>${p.NAME}</strong>,</p>
<p>On behalf of <span class="co">Corvus Studio</span>, we are pleased to offer you the position of <strong>${p.ROLE}</strong>, working remotely with our production team, effective from <strong>${p.JOINING}</strong>. This internship is intended to provide you with practical, production-oriented experience within our character art pipeline.</p>
<p>This is an unpaid, portfolio-building internship for a period of four (4) months, concluding on <strong>${p.END_DATE}</strong>, unless terminated earlier in accordance with the notice provision below. This engagement is a voluntary internship and does not constitute an offer of employment, a freelance engagement, or a volunteer programme. Nothing in this letter shall be construed as creating an employer-employee relationship between you and the Studio.</p>
<p>You are expected to contribute approximately <strong>twenty (20) hours</strong> per week towards your responsibilities under this internship. Your schedule with the Studio will be arranged flexibly, based on mutual availability and the requirements of ongoing projects.</p>
<p>Your responsibilities will include character modelling, sculpting, retopology, texturing, and asset development, along with contribution to internal studio projects and collaboration within the broader production pipeline, and any other related tasks reasonably assigned in connection with the role.</p>
<p>As part of this internship, you may have access to internal assets, workflows, project concepts, and other proprietary materials. You are required to maintain strict confidentiality in respect of all such studio-related information, files, and materials, both during and after the internship, and must not share any of it externally without the Studio's prior written permission. Failure to comply may result in immediate termination of this engagement.</p>
<p>All work, models, sculpts, textures, and other creative output produced by you in connection with <span class="co">Corvus Studio</span> projects during this internship shall remain the sole and exclusive property of <span class="co">Corvus Studio</span>, and may not be used, reproduced, or claimed by you, in whole or in part, without the Studio's prior written consent.</p>
<p>Subject to prior written approval from <span class="co">Corvus Studio</span>, you may showcase approved and publicly released work in your personal portfolio, resume, and showreel, and on platforms such as ArtStation and LinkedIn.</p>
<p>We expect professional conduct throughout the internship, including respectful communication with the team and adherence to agreed deadlines and studio processes.</p>
<p>Either party may discontinue this collaboration at any time by providing a minimum notice period of <strong>seven (7) days</strong>, in writing, through email, to allow for an orderly transition of ongoing work.</p>
<p>Upon satisfactory completion of the internship term, <span class="co">Corvus Studio</span> will issue an <strong>Internship Completion Certificate</strong> acknowledging your role, duration, and contribution.</p>
<p>As <span class="co">Corvus Studio</span> grows into a more established production environment, there may be opportunities for future paid engagements based on performance, reliability, and contribution. This internship does not entitle you to, and does not guarantee, any future employment, engagement, or compensation with the Studio.</p>
<p>We look forward to building disciplined, technically strong, and production-ready creative work together.</p>
</div>
${sigBlock()}`;
  return wrap(page1, p);
}

// ═══════════════════════════════════════════════════════════════════
// INTERN GENERIC (2D / Concept / HR)
// ═══════════════════════════════════════════════════════════════════
function internGeneric(p) {
  const page1 = `
<div class="offer-title">OFFER LETTER</div>
<div class="offer-sub">${p.ROLE} Internship</div>
<div class="body">
<p class="salutation">Dear <strong>${p.NAME}</strong>,</p>
<p>On behalf of <span class="co">Corvus Studio</span>, we are pleased to offer you the position of <strong>${p.ROLE}</strong>, working remotely with our creative team, effective from <strong>${p.JOINING}</strong>. This internship is designed to provide you with hands-on, production-grade creative experience.</p>
<p>This is an unpaid, portfolio-building internship for a duration of four (4) months, concluding on <strong>${p.END_DATE}</strong>, unless terminated earlier per the notice terms below. This engagement is a voluntary internship and does not constitute an offer of employment, a freelance arrangement, or a paid creative contract.</p>
<p>You are expected to dedicate approximately <strong>fifteen (15) to twenty (20) hours</strong> per week to your responsibilities. Your working hours will be agreed upon flexibly based on project requirements and mutual availability.</p>
<p>Your responsibilities will include creative tasks aligned with your role as <strong>${p.ROLE}</strong>, contribution to studio projects, and any other tasks reasonably assigned in connection with your designation.</p>
<p>You will maintain strict confidentiality regarding all internal assets, project briefs, concepts, and proprietary materials accessed during this internship. Breach of confidentiality may result in immediate termination.</p>
<p>All creative work produced during this internship in connection with <span class="co">Corvus Studio</span> projects is and shall remain the sole intellectual property of <span class="co">Corvus Studio</span>. You may not reproduce, claim, or distribute such work without prior written consent from the Studio.</p>
<p>With prior written approval, you may feature publicly released and approved work in your personal portfolio, showreel, ArtStation, and LinkedIn profiles.</p>
<p>You are expected to maintain respectful communication, meet agreed deadlines, and uphold the creative standards of the Studio throughout your internship.</p>
<p>Either party may conclude this engagement with a minimum of <strong>seven (7) days</strong> written notice via email.</p>
<p>Upon satisfactory completion, <span class="co">Corvus Studio</span> will issue a formal <strong>Internship Completion Certificate</strong> recognising your contribution and role.</p>
<p>We are excited to have you join our creative team and look forward to growing together.</p>
</div>
${sigBlock()}`;
  return wrap(page1, p);
}

// ═══════════════════════════════════════════════════════════════════
// FREELANCER
// ═══════════════════════════════════════════════════════════════════
function freelancer(p) {
  const page1 = `
<div class="offer-title">FREELANCE ENGAGEMENT LETTER</div>
<div class="offer-sub">${p.ROLE} &mdash; ${p.DEPT}</div>
<div class="body">
<p class="salutation">Dear <strong>${p.NAME}</strong>,</p>
<p>On behalf of <span class="co">Corvus Studio</span>, we are pleased to engage you as a <strong>${p.ROLE}</strong> on a project-based freelance basis, effective from <strong>${p.JOINING}</strong>. This letter formalises the terms of your engagement with the Studio.</p>
<p>You will be engaged as an independent contractor and not as an employee of <span class="co">Corvus Studio</span>. This arrangement does not create an employer-employee relationship, and you will not be entitled to any employment benefits or statutory entitlements.</p>
<p>Your remuneration for services rendered will be <strong>${p.STIPEND}</strong>, payable as mutually agreed upon completion of milestones or at the end of agreed billing cycles. Specific deliverables, timelines, and payment terms will be communicated on a project-by-project basis.</p>
<p>Your scope of work will include responsibilities pertaining to <strong>${p.ROLE}</strong> functions within the <strong>${p.DEPT}</strong> team, along with any additional tasks reasonably assigned in connection with active studio projects.</p>
<p>You agree to maintain strict confidentiality with respect to all internal project materials, client assets, workflows, and proprietary studio information, both during and after your engagement.</p>
<p>All deliverables and creative outputs produced in connection with <span class="co">Corvus Studio</span> projects shall be the sole and exclusive intellectual property of <span class="co">Corvus Studio</span> upon submission and payment.</p>
<p>You may display publicly released and approved project work in your personal portfolio and professional profiles upon receiving written approval from <span class="co">Corvus Studio</span>.</p>
<p>Either party may conclude this engagement with a minimum of <strong>fourteen (14) days</strong> prior written notice by email, subject to completion of any outstanding deliverables.</p>
<p>We look forward to a productive and professional collaboration.</p>
</div>
${sigBlock()}`;
  return wrap(page1, p);
}

// ═══════════════════════════════════════════════════════════════════
// FULL-TIME
// ═══════════════════════════════════════════════════════════════════
function fulltime(p) {
  const page1 = `
<div class="offer-title">OFFER OF EMPLOYMENT</div>
<div class="offer-sub">${p.ROLE} &mdash; ${p.DEPT}</div>
<div class="body">
<p class="salutation">Dear <strong>${p.NAME}</strong>,</p>
<p>On behalf of <span class="co">Corvus Studio</span>, we are delighted to extend this formal offer of employment for the position of <strong>${p.ROLE}</strong> within the <strong>${p.DEPT}</strong> team, effective from <strong>${p.JOINING}</strong>. You will be reporting to <strong>${p.MANAGER}</strong>.</p>
<p>Your monthly compensation for this role will be <strong>${p.STIPEND}</strong>, payable in accordance with the Studio's standard payroll cycle. This offer is conditional upon the successful completion of any applicable background verification and onboarding documentation.</p>
<p>Your work location will be <strong>${p.LOCATION}</strong>. Your standard working hours and schedule will be communicated separately by your reporting manager as part of the onboarding process.</p>
<p>Your responsibilities will encompass the full scope of your designated role within the <strong>${p.DEPT}</strong> team, including cross-departmental collaboration and any other tasks reasonably assigned to you in connection with your designation.</p>
<p>Your employment will begin with a probationary period of <strong>three (3) months</strong> from your date of joining. During this period, either party may terminate this engagement with a minimum notice of fifteen (15) days. Upon successful completion of probation, your employment will be confirmed in writing.</p>
<p>You agree to maintain strict confidentiality regarding all proprietary studio information, client data, internal workflows, and any materials of a sensitive nature, both during and after the term of your employment.</p>
<p>All work produced by you in the course of your employment shall be the sole intellectual property of <span class="co">Corvus Studio</span>.</p>
<p>You will be entitled to leave benefits as per the Studio's Leave Policy communicated through our internal leave management system.</p>
<p>Post-probation, either party may terminate this employment by providing a minimum notice period of <strong>thirty (30) days</strong>, in writing.</p>
<p>We look forward to welcoming you to the team.</p>
</div>
${sigBlock()}`;
  return wrap(page1, p);
}

// ═══════════════════════════════════════════════════════════════════
// CONTRACT
// ═══════════════════════════════════════════════════════════════════
function contract(p) {
  const page1 = `
<div class="offer-title">CONTRACT ENGAGEMENT LETTER</div>
<div class="offer-sub">${p.ROLE} &mdash; ${p.DEPT}</div>
<div class="body">
<p class="salutation">Dear <strong>${p.NAME}</strong>,</p>
<p>On behalf of <span class="co">Corvus Studio</span>, we are pleased to offer you a fixed-term contract engagement as <strong>${p.ROLE}</strong> within the <strong>${p.DEPT}</strong> team, commencing from <strong>${p.JOINING}</strong>. You will be reporting to <strong>${p.MANAGER}</strong>.</p>
<p>Your engagement will be on a contractual basis for a defined project or duration to be communicated separately. This engagement does not constitute permanent employment with <span class="co">Corvus Studio</span>.</p>
<p>Your compensation for this engagement will be <strong>${p.STIPEND}</strong>, payable as agreed upon achievement of defined milestones or at the end of the contract period.</p>
<p>You are required to maintain the confidentiality of all proprietary materials, project files, client information, and internal assets accessed during this engagement.</p>
<p>All work created in connection with <span class="co">Corvus Studio</span> projects during this engagement shall be the exclusive property of <span class="co">Corvus Studio</span>.</p>
<p>Either party may terminate this engagement early with a minimum of <strong>fourteen (14) days</strong> written notice via email.</p>
<p>We look forward to a productive collaboration.</p>
</div>
${sigBlock()}`;
  return wrap(page1, p);
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
