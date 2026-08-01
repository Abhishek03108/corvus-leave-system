/**
 * Offer Letter Service — Corvus Studio
 * Templates based on actual Corvus Studio offer letters.
 * Selects template by employment type + designation/department.
 */

// ─── Document ID Generator ────────────────────────────────────────────────────

export async function generateDocumentId(db) {
  const result = await db.prepare(
    `SELECT document_id FROM offer_letters WHERE document_id LIKE 'CS%' ORDER BY id DESC LIMIT 1`
  ).first();

  let nextNum = 1;
  if (result && result.document_id) {
    const match = result.document_id.match(/CS(\d+)/i);
    if (match) nextNum = parseInt(match[1], 10) + 1;
  }

  return `CS${String(nextNum).padStart(3, '0')}`;
}

// ─── Employment Type Detection ────────────────────────────────────────────────

export function detectEmploymentType(employeeTypeStr) {
  if (!employeeTypeStr) return 'Full-Time';
  const t = employeeTypeStr.trim().toLowerCase();
  if (t.includes('intern')) return 'Intern';
  if (t.includes('contract')) return 'Contract';
  if (t.includes('freelance')) return 'Freelancer';
  return 'Full-Time';
}

// ─── Placeholders ─────────────────────────────────────────────────────────────

export function buildPlaceholders(employee, documentId, options = {}) {
  const todayStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
  const joiningFormatted = employee.joining_date
    ? new Date(employee.joining_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
    : todayStr;

  return {
    DOCUMENT_ID: documentId,
    DATE: options.issueDate || todayStr,
    EMPLOYEE_NAME: employee.full_name || '',
    DESIGNATION: employee.designation || 'Team Member',
    DEPARTMENT: employee.department || 'Production',
    EMPLOYMENT_TYPE: detectEmploymentType(employee.employee_type),
    JOINING_DATE: joiningFormatted,
    STIPEND: options.salary || employee.salary || 'unpaid',
    WORK_LOCATION: options.workLocation || 'Remote',
    REPORTING_MANAGER: options.reportingManager || 'Raj Kishore Kumar',
  };
}

// ─── Template Selector ────────────────────────────────────────────────────────

export function selectTemplate(employee) {
  const type = detectEmploymentType(employee.employee_type);
  const designation = (employee.designation || '').toLowerCase();
  const department = (employee.department || '').toLowerCase();

  if (type === 'Intern') {
    // Role-specific intern templates
    if (designation.includes('concept')) return 'intern_concept_artist';
    if (designation.includes('2d')) return 'intern_2d_artist';
    if (designation.includes('3d') || designation.includes('modell') || designation.includes('artist')) return 'intern_3d_artist';
    if (department.includes('creative')) return 'intern_creative';
    return 'intern_3d_artist'; // fallback intern
  }

  if (type === 'Freelancer') return 'freelancer';
  if (type === 'Contract') return 'contract';
  return 'fulltime';
}

// ─── CSS Shared Styles ────────────────────────────────────────────────────────

const SHARED_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Cormorant+Garamond:wght@400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'EB Garamond', Georgia, 'Times New Roman', serif;
    font-size: 11.5pt;
    line-height: 1.75;
    color: #1a1a1a;
    background: #fff;
    padding: 0;
    margin: 0;
  }
  .page {
    max-width: 720px;
    margin: 0 auto;
    padding: 52px 60px 60px;
    min-height: 100vh;
  }
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 14px;
    border-bottom: 2px solid #1a1a1a;
    margin-bottom: 28px;
  }
  .studio-name {
    font-family: 'Cormorant Garamond', 'EB Garamond', serif;
    font-size: 22pt;
    font-weight: 700;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #0a0a0a;
    line-height: 1.1;
  }
  .studio-tagline {
    font-size: 8.5pt;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: #666;
    margin-top: 3px;
  }
  .doc-ref {
    text-align: right;
    font-size: 9pt;
    color: #444;
    line-height: 1.6;
  }
  .doc-ref strong { color: #1a1a1a; }
  .letter-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 15pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 2px;
    text-align: center;
    margin-bottom: 22px;
    color: #0a0a0a;
  }
  .letter-body p {
    margin-bottom: 13px;
    text-align: justify;
  }
  .letter-body p strong { font-weight: 600; }
  .clause-heading {
    font-weight: 700;
    display: inline;
  }
  .signature-block {
    margin-top: 42px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .sig-col { width: 46%; }
  .sig-line {
    border-top: 1px solid #1a1a1a;
    padding-top: 6px;
    margin-top: 36px;
    font-size: 10pt;
    color: #1a1a1a;
  }
  .acceptance-block {
    margin-top: 46px;
    padding-top: 22px;
    border-top: 1px dashed #aaa;
  }
  .acceptance-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 13pt;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    margin-bottom: 14px;
  }
  .acceptance-body p { margin-bottom: 10px; text-align: justify; }
  .acceptance-fields { margin-top: 24px; }
  .acceptance-field {
    display: flex;
    align-items: flex-end;
    margin-bottom: 18px;
    gap: 12px;
  }
  .acceptance-field label { font-size: 10pt; white-space: nowrap; min-width: 100px; }
  .field-line { flex: 1; border-bottom: 1px solid #666; height: 18px; }
  .footer-note {
    margin-top: 38px;
    padding-top: 14px;
    border-top: 1px solid #ccc;
    font-size: 9pt;
    color: #555;
    text-align: center;
    line-height: 1.5;
  }
  @media print {
    body { padding: 0; }
    .page { padding: 30px 40px; }
  }
`;

// ─── Template: Intern (3D Artist / Production) — Master Template ──────────────

function templateIntern3DArtist(p) {
  return renderPage(`
    <div class="letterhead">
      <div>
        <div class="studio-name">Corvus Studio</div>
        <div class="studio-tagline">Creative Production Studio</div>
      </div>
      <div class="doc-ref">
        <div>Ref: <strong>${p.DOCUMENT_ID}</strong></div>
        <div>${p.DATE}</div>
        <div>Confidential</div>
      </div>
    </div>

    <div class="letter-title">Offer Letter<br>${p.DESIGNATION} Internship</div>

    <div class="letter-body">
      <p>Dear ${p.EMPLOYEE_NAME},</p>

      <p>On behalf of Corvus Studio, we are pleased to offer you the position of <strong>${p.DESIGNATION}</strong>, working remotely with our production team, effective from <strong>${p.JOINING_DATE}</strong>. This internship is intended to provide you with practical, production-oriented experience within our character art pipeline.</p>

      <p>This is an unpaid, portfolio-building internship for a period of four (4) months, unless terminated earlier in accordance with the notice provision below. This engagement is a voluntary internship and does not constitute an offer of employment, a freelance engagement, or a volunteer programme. Nothing in this letter shall be construed as creating an employer-employee relationship between you and the Studio.</p>

      <p>You are expected to contribute approximately fifteen (15) to twenty (20) hours per week towards your responsibilities under this internship. Your schedule with the Studio will be arranged flexibly, based on mutual availability and the requirements of ongoing projects.</p>

      <p>Your responsibilities will include character modelling, sculpting, retopology, texturing, and asset development, along with contribution to internal studio projects and collaboration within the broader production pipeline, and any other related tasks reasonably assigned in connection with the role.</p>

      <p><span class="clause-heading">Confidentiality.</span> As part of this internship, you may have access to internal assets, workflows, project concepts, and other proprietary materials. You are required to maintain strict confidentiality in respect of all such studio-related information, files, and materials, both during and after the internship, and must not share any of it externally without the Studio's prior written permission. Failure to comply may result in immediate termination of this engagement.</p>

      <p><span class="clause-heading">Intellectual Property.</span> All work, models, sculpts, textures, and other creative output produced by you in connection with Corvus Studio projects during this internship shall remain the sole and exclusive property of Corvus Studio, and may not be used, reproduced, or claimed by you, in whole or in part, without the Studio's prior written consent.</p>

      <p><span class="clause-heading">Portfolio Use.</span> Subject to prior written approval from Corvus Studio, you may showcase approved and publicly released work in your personal portfolio, resume, and showreel, and on platforms such as ArtStation and LinkedIn.</p>

      <p><span class="clause-heading">Professional Conduct.</span> We expect professional conduct throughout the internship, including respectful communication with the team and adherence to agreed deadlines and studio processes.</p>

      <p><span class="clause-heading">Notice Period.</span> Either party may discontinue this collaboration at any time by providing a minimum notice period of seven (7) days, in writing, through email, to allow for an orderly transition of ongoing work.</p>

      <p><span class="clause-heading">Completion Certificate.</span> Upon satisfactory completion of the internship term, Corvus Studio will issue an Internship Completion Certificate acknowledging your role, duration, and contribution.</p>

      <p><span class="clause-heading">Future Opportunities.</span> As Corvus Studio grows into a more established production environment, there may be opportunities for future paid engagements based on performance, reliability, and contribution. This internship does not entitle you to, and does not guarantee, any future employment, engagement, or compensation with the Studio.</p>

      <p>We look forward to building disciplined, technically strong, and production-ready creative work together.</p>

      <p>Sincerely,</p>
    </div>

    <div class="signature-block">
      <div class="sig-col">
        <div class="sig-line">
          Authorized Signatory<br>
          <strong>Corvus Studio</strong>
        </div>
      </div>
    </div>

    ${acceptanceBlock(p, 'internship')}

    <div class="footer-note">
      This offer letter is issued on behalf of Corvus Studio. For queries, contact <strong>soumya@thecorvusstudio.com</strong>.
    </div>
  `);
}

// ─── Template: Intern (2D Artist / Creative) ──────────────────────────────────

function templateIntern2DArtist(p) {
  return renderPage(`
    <div class="letterhead">
      <div>
        <div class="studio-name">Corvus Studio</div>
        <div class="studio-tagline">Creative Production Studio</div>
      </div>
      <div class="doc-ref">
        <div>Ref: <strong>${p.DOCUMENT_ID}</strong></div>
        <div>${p.DATE}</div>
        <div>Confidential</div>
      </div>
    </div>

    <div class="letter-title">Offer Letter<br>${p.DESIGNATION} Internship</div>

    <div class="letter-body">
      <p>Dear ${p.EMPLOYEE_NAME},</p>

      <p>On behalf of Corvus Studio, we are pleased to offer you the position of <strong>${p.DESIGNATION}</strong> within our creative team, working remotely, effective from <strong>${p.JOINING_DATE}</strong>. This internship is designed to immerse you in a production-grade creative environment and build practical skills in 2D design and illustration.</p>

      <p>This is an unpaid, portfolio-building internship for a duration of four (4) months, unless concluded earlier per the notice terms below. This engagement is a voluntary internship and shall not be interpreted as an offer of employment, a freelance arrangement, or a paid creative contract. Nothing herein creates an employer-employee relationship between you and Corvus Studio.</p>

      <p>You are expected to dedicate approximately fifteen (15) to twenty (20) hours per week to your responsibilities. Your working hours will be agreed upon flexibly based on project requirements and mutual availability.</p>

      <p>Your responsibilities will include 2D illustration, concept development, character design, visual asset creation, and contribution to live studio projects, along with any other tasks reasonably assigned in connection with your role.</p>

      <p><span class="clause-heading">Confidentiality.</span> You will maintain strict confidentiality regarding all internal assets, project briefs, stylesheets, concepts, and proprietary materials accessed during this internship. Breach of confidentiality may result in immediate termination and potential legal action.</p>

      <p><span class="clause-heading">Intellectual Property.</span> All creative work produced during this internship in connection with Corvus Studio projects is and shall remain the sole intellectual property of Corvus Studio. You may not reproduce, claim, or distribute such work without prior written consent from the Studio.</p>

      <p><span class="clause-heading">Portfolio Use.</span> With prior written approval, you may feature publicly released and approved work in your personal portfolio, showreel, ArtStation, and LinkedIn profiles.</p>

      <p><span class="clause-heading">Professional Conduct.</span> You are expected to maintain respectful communication, meet agreed deadlines, and uphold the creative standards of the Studio throughout your internship.</p>

      <p><span class="clause-heading">Notice Period.</span> Either party may conclude this engagement with a minimum of seven (7) days written notice via email, to allow for proper transition of work.</p>

      <p><span class="clause-heading">Completion Certificate.</span> Upon satisfactory completion, Corvus Studio will issue a formal Internship Completion Certificate recognising your contribution and role.</p>

      <p>We are excited to have you join our creative team and look forward to growing together.</p>

      <p>Sincerely,</p>
    </div>

    <div class="signature-block">
      <div class="sig-col">
        <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
      </div>
    </div>

    ${acceptanceBlock(p, 'internship')}

    <div class="footer-note">
      This offer letter is issued on behalf of Corvus Studio. For queries, contact <strong>soumya@thecorvusstudio.com</strong>.
    </div>
  `);
}

// ─── Template: Intern (Concept Artist / Creative) ─────────────────────────────

function templateInternConceptArtist(p) {
  return renderPage(`
    <div class="letterhead">
      <div>
        <div class="studio-name">Corvus Studio</div>
        <div class="studio-tagline">Creative Production Studio</div>
      </div>
      <div class="doc-ref">
        <div>Ref: <strong>${p.DOCUMENT_ID}</strong></div>
        <div>${p.DATE}</div>
        <div>Confidential</div>
      </div>
    </div>

    <div class="letter-title">Offer Letter<br>${p.DESIGNATION} Internship</div>

    <div class="letter-body">
      <p>Dear ${p.EMPLOYEE_NAME},</p>

      <p>On behalf of Corvus Studio, we are pleased to offer you the position of <strong>${p.DESIGNATION}</strong>, contributing to our creative and visual development pipeline, working remotely, effective from <strong>${p.JOINING_DATE}</strong>.</p>

      <p>This is an unpaid, portfolio-building internship for a period of four (4) months, unless concluded earlier per the notice provision below. This engagement is a voluntary arrangement and shall not be construed as employment, freelance work, or a paid creative engagement. Nothing herein creates an employer-employee relationship.</p>

      <p>You are expected to contribute approximately fifteen (15) to twenty (20) hours per week. Scheduling will be arranged flexibly in line with project requirements and your availability.</p>

      <p>Your responsibilities will include concept ideation, visual development, environment and character design reference creation, style guide contribution, and any other creative tasks reasonably assigned within the scope of your role.</p>

      <p><span class="clause-heading">Confidentiality.</span> All internal concepts, visual references, project briefs, style guides, and proprietary creative materials must be kept strictly confidential during and after the internship. Breach of this obligation may result in immediate termination.</p>

      <p><span class="clause-heading">Intellectual Property.</span> All concepts, artwork, visual designs, and other creative outputs produced under this internship for Corvus Studio projects shall remain the exclusive property of Corvus Studio and may not be claimed, distributed, or reproduced without prior written consent.</p>

      <p><span class="clause-heading">Portfolio Use.</span> Subject to prior written approval, you may feature approved and publicly released creative work in your personal portfolio, ArtStation, and LinkedIn.</p>

      <p><span class="clause-heading">Professional Conduct.</span> You are expected to maintain respectful, professional communication, meet agreed-upon deadlines, and contribute positively to the studio culture.</p>

      <p><span class="clause-heading">Notice Period.</span> Either party may discontinue this engagement with a minimum of seven (7) days prior written notice by email.</p>

      <p><span class="clause-heading">Completion Certificate.</span> Upon satisfactory completion, Corvus Studio will issue a formal Internship Completion Certificate acknowledging your role and contribution.</p>

      <p>We look forward to developing bold, original visual work together.</p>

      <p>Sincerely,</p>
    </div>

    <div class="signature-block">
      <div class="sig-col">
        <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
      </div>
    </div>

    ${acceptanceBlock(p, 'internship')}

    <div class="footer-note">
      This offer letter is issued on behalf of Corvus Studio. For queries, contact <strong>soumya@thecorvusstudio.com</strong>.
    </div>
  `);
}

// ─── Template: Freelancer ─────────────────────────────────────────────────────

function templateFreelancer(p) {
  return renderPage(`
    <div class="letterhead">
      <div>
        <div class="studio-name">Corvus Studio</div>
        <div class="studio-tagline">Creative Production Studio</div>
      </div>
      <div class="doc-ref">
        <div>Ref: <strong>${p.DOCUMENT_ID}</strong></div>
        <div>${p.DATE}</div>
        <div>Confidential</div>
      </div>
    </div>

    <div class="letter-title">Freelance Engagement Letter<br>${p.DESIGNATION}</div>

    <div class="letter-body">
      <p>Dear ${p.EMPLOYEE_NAME},</p>

      <p>On behalf of Corvus Studio, we are pleased to engage you as a <strong>${p.DESIGNATION}</strong> on a project-based freelance basis, effective from <strong>${p.JOINING_DATE}</strong>. This letter formalises the terms of your engagement with the Studio.</p>

      <p>You will be engaged as an independent contractor and not as an employee of Corvus Studio. This arrangement does not create an employer-employee relationship, and you will not be entitled to any employment benefits, statutory entitlements, or rights arising from an employment contract.</p>

      <p>Your remuneration for services rendered will be <strong>${p.STIPEND}</strong>, payable as mutually agreed upon completion of milestones or at the end of agreed billing cycles. Specific deliverables, timelines, and payment terms will be communicated on a project-by-project basis.</p>

      <p>Your scope of work will include responsibilities pertaining to <strong>${p.DESIGNATION}</strong> functions within the <strong>${p.DEPARTMENT}</strong> team, along with any additional tasks reasonably assigned in connection with active studio projects.</p>

      <p><span class="clause-heading">Confidentiality.</span> You agree to maintain strict confidentiality with respect to all internal project materials, client assets, workflows, technical specifications, and proprietary studio information, both during and after your engagement with Corvus Studio.</p>

      <p><span class="clause-heading">Intellectual Property.</span> All deliverables, creative outputs, models, renders, and other work products produced in connection with Corvus Studio projects shall be the sole and exclusive intellectual property of Corvus Studio upon submission and payment. You may not reproduce, distribute, or retain copies of such work without prior written consent.</p>

      <p><span class="clause-heading">Portfolio Use.</span> You may display publicly released and approved project work in your personal portfolio and professional profiles upon receiving written approval from Corvus Studio.</p>

      <p><span class="clause-heading">Notice Period.</span> Either party may conclude this engagement with a minimum of fourteen (14) days prior written notice by email, subject to completion of any outstanding deliverables.</p>

      <p>We are glad to have you contributing to Corvus Studio's growing portfolio of work. We look forward to a productive and professional collaboration.</p>

      <p>Sincerely,</p>
    </div>

    <div class="signature-block">
      <div class="sig-col">
        <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
      </div>
    </div>

    ${acceptanceBlock(p, 'freelance')}

    <div class="footer-note">
      This engagement letter is issued on behalf of Corvus Studio. For queries, contact <strong>soumya@thecorvusstudio.com</strong>.
    </div>
  `);
}

// ─── Template: Full-Time ──────────────────────────────────────────────────────

function templateFullTime(p) {
  return renderPage(`
    <div class="letterhead">
      <div>
        <div class="studio-name">Corvus Studio</div>
        <div class="studio-tagline">Creative Production Studio</div>
      </div>
      <div class="doc-ref">
        <div>Ref: <strong>${p.DOCUMENT_ID}</strong></div>
        <div>${p.DATE}</div>
        <div>Confidential</div>
      </div>
    </div>

    <div class="letter-title">Offer of Employment<br>${p.DESIGNATION}</div>

    <div class="letter-body">
      <p>Dear ${p.EMPLOYEE_NAME},</p>

      <p>On behalf of Corvus Studio, we are delighted to extend this formal offer of employment for the position of <strong>${p.DESIGNATION}</strong> within the <strong>${p.DEPARTMENT}</strong> team, effective from <strong>${p.JOINING_DATE}</strong>. You will be reporting to <strong>${p.REPORTING_MANAGER}</strong>.</p>

      <p>Your monthly compensation for this role will be <strong>${p.STIPEND}</strong>, payable in accordance with the Studio's standard payroll cycle. This offer is conditional upon the successful completion of any applicable background verification and onboarding documentation.</p>

      <p>Your work location will be <strong>${p.WORK_LOCATION}</strong>. Your standard working hours and schedule will be communicated separately by your reporting manager as part of the onboarding process.</p>

      <p>Your responsibilities will encompass the full scope of your designated role within the <strong>${p.DEPARTMENT}</strong> team, including any related functions, cross-departmental collaboration, and any other tasks reasonably assigned to you in connection with your designation.</p>

      <p><span class="clause-heading">Probation Period.</span> Your employment will begin with a probationary period of three (3) months from your date of joining. During this period, either party may terminate this engagement with a minimum notice of fifteen (15) days. Upon successful completion of the probationary period, your employment will be confirmed in writing.</p>

      <p><span class="clause-heading">Confidentiality.</span> You agree to maintain strict confidentiality regarding all proprietary studio information, client data, internal workflows, financial information, and any other materials of a sensitive nature, both during and after the term of your employment with Corvus Studio. Breach of this obligation may result in disciplinary action, including immediate termination.</p>

      <p><span class="clause-heading">Intellectual Property.</span> All work produced by you in the course of your employment with Corvus Studio, including creative assets, technical outputs, and strategic documentation, shall be the sole intellectual property of Corvus Studio and may not be used, reproduced, or shared externally without prior written authorisation.</p>

      <p><span class="clause-heading">Leave Entitlements.</span> You will be entitled to leave benefits as per the Studio's Leave Policy in force from time to time, communicated through our internal leave management system.</p>

      <p><span class="clause-heading">Notice Period.</span> Post-probation, either party may terminate this employment by providing a minimum notice period of thirty (30) days, in writing. The Studio reserves the right to make payment in lieu of notice at its discretion.</p>

      <p>We believe you will make a meaningful contribution to Corvus Studio's vision and culture. We look forward to welcoming you to the team.</p>

      <p>Sincerely,</p>
    </div>

    <div class="signature-block">
      <div class="sig-col">
        <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
      </div>
    </div>

    ${acceptanceBlock(p, 'employment')}

    <div class="footer-note">
      This offer letter is issued on behalf of Corvus Studio. For queries, contact <strong>soumya@thecorvusstudio.com</strong>.
    </div>
  `);
}

// ─── Template: Contract ───────────────────────────────────────────────────────

function templateContract(p) {
  return renderPage(`
    <div class="letterhead">
      <div>
        <div class="studio-name">Corvus Studio</div>
        <div class="studio-tagline">Creative Production Studio</div>
      </div>
      <div class="doc-ref">
        <div>Ref: <strong>${p.DOCUMENT_ID}</strong></div>
        <div>${p.DATE}</div>
        <div>Confidential</div>
      </div>
    </div>

    <div class="letter-title">Contract Engagement Letter<br>${p.DESIGNATION}</div>

    <div class="letter-body">
      <p>Dear ${p.EMPLOYEE_NAME},</p>

      <p>On behalf of Corvus Studio, we are pleased to offer you a fixed-term contract engagement as <strong>${p.DESIGNATION}</strong> within the <strong>${p.DEPARTMENT}</strong> team, commencing from <strong>${p.JOINING_DATE}</strong>. You will be reporting to <strong>${p.REPORTING_MANAGER}</strong>.</p>

      <p>Your engagement will be on a contractual basis for a defined project or duration, which will be communicated separately. This engagement does not constitute permanent employment and shall not be construed as creating an employer-employee relationship beyond the scope of this contract.</p>

      <p>Your compensation for this engagement will be <strong>${p.STIPEND}</strong>, payable as agreed upon achievement of defined milestones or at the end of the contract period.</p>

      <p>Your responsibilities will include the full scope of duties associated with the role of <strong>${p.DESIGNATION}</strong>, and any other tasks reasonably assigned by your reporting manager during the engagement period.</p>

      <p><span class="clause-heading">Confidentiality.</span> You are required to maintain the confidentiality of all proprietary materials, project files, client information, and internal assets accessed during this engagement. This obligation continues beyond the term of your contract.</p>

      <p><span class="clause-heading">Intellectual Property.</span> All work created in connection with Corvus Studio projects during this engagement shall be the exclusive property of Corvus Studio. You may not reproduce, share, or claim ownership of such work without prior written consent.</p>

      <p><span class="clause-heading">Notice Period.</span> Either party may terminate this engagement early with a minimum of fourteen (14) days written notice, subject to settlement of outstanding deliverables and compensation.</p>

      <p>We look forward to working with you on this engagement and trust this will be a productive collaboration for both parties.</p>

      <p>Sincerely,</p>
    </div>

    <div class="signature-block">
      <div class="sig-col">
        <div class="sig-line">Authorized Signatory<br><strong>Corvus Studio</strong></div>
      </div>
    </div>

    ${acceptanceBlock(p, 'contract')}

    <div class="footer-note">
      This engagement letter is issued on behalf of Corvus Studio. For queries, contact <strong>soumya@thecorvusstudio.com</strong>.
    </div>
  `);
}

// ─── Acceptance Block ─────────────────────────────────────────────────────────

function acceptanceBlock(p, type) {
  const typeLabel = {
    internship: `I understand that this is a voluntary, unpaid internship for a duration of four (4) months and does not constitute an employment contract. Either party may conclude this engagement with the prior notice period mentioned above.`,
    freelance: `I understand that this is a freelance engagement on a project basis and does not constitute an employment contract.`,
    employment: `I understand and accept the terms of employment as outlined in this offer letter, including the probationary period and notice terms.`,
    contract: `I understand that this is a fixed-term contract engagement and does not constitute permanent employment.`,
  }[type] || '';

  return `
    <div class="acceptance-block">
      <div class="acceptance-title">Acceptance</div>
      <div class="acceptance-body">
        <p>I, <strong>${p.EMPLOYEE_NAME}</strong>, accept the role of <strong>${p.DESIGNATION}</strong> with Corvus Studio under the terms outlined in this offer letter. ${typeLabel}</p>
        <p>I look forward to contributing meaningfully to Corvus Studio's creative and production goals.</p>
      </div>
      <div class="acceptance-fields">
        <div class="acceptance-field">
          <label>Signature:</label>
          <div class="field-line"></div>
        </div>
        <div class="acceptance-field">
          <label>Name:</label>
          <div class="field-line"></div>
        </div>
        <div class="acceptance-field">
          <label>Date:</label>
          <div class="field-line"></div>
        </div>
      </div>
    </div>
    <div style="margin-top:28px">
      <p style="font-size:10.5pt;text-align:justify">We are glad to have you join Corvus Studio, and look forward to building thoughtful, production-ready creative work together.</p>
      <p style="margin-top:12px;font-size:10.5pt">Sincerely,</p>
      <div class="sig-line" style="margin-top:36px;width:46%;border-top:1px solid #1a1a1a;padding-top:6px;font-size:10pt">
        Authorized Signatory<br><strong>Corvus Studio</strong>
      </div>
    </div>
  `;
}

// ─── HTML Page Wrapper ────────────────────────────────────────────────────────

function renderPage(content) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Offer Letter — Corvus Studio</title>
  <style>${SHARED_CSS}</style>
</head>
<body>
  <div class="page">
    ${content}
  </div>
</body>
</html>`;
}

// ─── Main Export: Generate Offer Letter HTML ──────────────────────────────────

export function generateOfferLetterHtml(employee, documentId, options = {}) {
  const p = buildPlaceholders(employee, documentId, options);
  const template = selectTemplate(employee);

  switch (template) {
    case 'intern_3d_artist':    return templateIntern3DArtist(p);
    case 'intern_2d_artist':    return templateIntern2DArtist(p);
    case 'intern_concept_artist': return templateInternConceptArtist(p);
    case 'intern_creative':     return templateIntern2DArtist(p);
    case 'freelancer':          return templateFreelancer(p);
    case 'contract':            return templateContract(p);
    case 'fulltime':
    default:                    return templateFullTime(p);
  }
}
