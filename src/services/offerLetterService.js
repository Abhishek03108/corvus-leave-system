/**
 * Offer Letter Service — Corvus Studio
 * EXACT match to Canva design:
 * - Top: Full-width grey stripe + black square top-right
 * - Header: C-mark logo + "CORVUS STUDIO" (DM Sans Bold) | "Motion that Speaks." (DM Sans 15.4pt) + Date
 * - Body: Times New Roman 11pt, justified
 * - Footer: Black bg, white YASH CORPORATION text
 * - 2 pages total: Page 1 = letter, Page 2 = acceptance
 */

const LOGO_FULL = 'data:image/png;base64,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'; // full logo (C-mark + CORVUS STUDIO text)
const LOGO_MARK = 'data:image/png;base64,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SMpIlg2eus9JkybJjko8AuYsye8zUteuXStfxq8wkJTBQPKAShdn8wU4m4l2pYeVK1fKl/ErDCRlMJA8YNmyZc3BgwdlZyUeAcuPy+80EhUtTcJAUgYDySPOnz9fdlbiIfr162d9p+H62Wefyc37FQaSMhhIHhELKRJvM2DAAOt7DUcGEvElSUlJHGXnEVHME8VDibeZMmWKU4lcfr+hyEAivqRcuXKch+QhlRXW9C0YJYclLuT3G6yff/653KRfYSBpolatWsn58uWzGjx1p6VLlzZ79uyRnZZ4kBMnTpiBAwda33Ewfvnll3JzfoWBpIkWLVqwlp3HvOmmm2SnJR4Gte+SkpKs7zknv/32W7kZv8JA0kS3bt2SsbqmbPDU3Q4bNkx2XOJhsGx9sGWGcM933bp1chN+hYGkibvvvju5aNGiVqOn7hfLdis6MPmer776KqgzJfyA/O233+TT/QoDSRNPP/10csmSJa1GT70hDk4PPvig7MTEo+DynfyOpeiviu4jMpA08c477ySfeeaZVqOn3hKTLnGTnHifG264wfp+M3r22WebY8eOyaf5FQaSJr766qvkatWqWY2eessCBQqYP//8U3Zm4kFwOS6nS3cXXnihfIqfYSBpYseOHcnnnXee1eipt8SclrS0NNmZSRzZuXOn+eCDD8yECRPMk08+6dSvmzNnjlm9erXZu3evfHiO9OjRw/qO023fvr18uJ9hIGkiLS0tuUWLFlajp94S81lIYsAQ7L59+zr3duT3km65cuVM69atnft9ixYtMgcOHJCbycQnn3xibSPd22+/XT7czzCQNIFAuuaaa6xGT71l48aNZUcmMQbBguXl5XcRjBUqVHBqE+KM6tChQ3LT5q+//sp2GDjOvhTBQNIEAqlnz55Wo6feE5dyVq1axcENMQYhcumll1r7P1wxSGHIkCHmxx9/zPQ6TZo0sR4LZ82alelxPoeBpAkE0v333281eupda9asaS677DLTsWNHx3bt2pkrr7zSjBkzRnb2kNm2bZtTh03b/arjx4+bGTNmmIsvvtja39ESFVOuu+46s3z5cuc1b775ZusxcM2aNfLt+RkGkiYQSLgJKxs99Z/44REuKSkpzn2SVq1aWb/k/cyuXbvM+PHjTd26da39GUvvuOMO07VrV+v/S5UqZfbt2yffpp9hIGkCgTR79myr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'; // C-mark only (watermark)

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
  width: 420px; height: 420px;
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
