/**
 * Offer Letter Service
 * Handles unique Document ID generation (CS001, CS002...),
 * employment type detection, and template placeholder replacement.
 */

export async function generateDocumentId(db) {
  const result = await db.prepare(
    `SELECT document_id FROM offer_letters WHERE document_id LIKE 'CS%' ORDER BY id DESC LIMIT 1`
  ).first();

  let nextNum = 1;
  if (result && result.document_id) {
    const match = result.document_id.match(/CS(\d+)/i);
    if (match) {
      nextNum = parseInt(match[1], 10) + 1;
    }
  }

  const paddedNum = String(nextNum).padStart(3, '0');
  return `CS${paddedNum}`;
}

export function detectEmploymentType(employeeTypeStr) {
  if (!employeeTypeStr) return 'Full-Time';
  const type = employeeTypeStr.trim().toLowerCase();
  if (type.includes('intern')) return 'Intern';
  if (type.includes('contract')) return 'Contract';
  if (type.includes('freelance')) return 'Freelancer';
  return 'Full-Time';
}

export function buildPlaceholders(employee, documentId, options = {}) {
  const todayStr = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  return {
    '{{Document ID}}': documentId || 'CS001',
    '{{Date}}': options.issueDate || todayStr,
    '{{Employee Name}}': employee.full_name || '',
    '{{Designation}}': employee.designation || 'Team Member',
    '{{Department}}': employee.department || 'General',
    '{{Employment Type}}': detectEmploymentType(employee.employee_type),
    '{{Joining Date}}': employee.joining_date || todayStr,
    '{{Salary}}': options.salary || employee.salary || 'As per agreement',
    '{{Work Location}}': options.workLocation || 'Remote / Studio',
    '{{Reporting Manager}}': options.reportingManager || 'Raj Kishore Kumar',
    '{{Company Name}}': 'Corvus Studio',
    '{{HR Details}}': 'Soumya Muralidhar Achari (HR)',
    '{{Personal Email}}': employee.personal_email || employee.work_email || ''
  };
}

export function substitutePlaceholders(templateContent, placeholders) {
  let content = templateContent;
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    content = content.replace(regex, value);
  }
  return content;
}
