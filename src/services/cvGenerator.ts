import { CVData } from "../types";

function formatUKDate(dateStr: string): string {
  if (!dateStr) return '';
  const months: Record<string, string> = {
    'january': 'Jan', 'february': 'Feb', 'march': 'Mar', 'april': 'Apr',
    'may': 'May', 'june': 'Jun', 'july': 'Jul', 'august': 'Aug',
    'september': 'Sep', 'october': 'Oct', 'november': 'Nov', 'december': 'Dec'
  };
  const lower = dateStr.toLowerCase().trim();
  for (const [full, abbr] of Object.entries(months)) {
    if (lower.includes(full)) return dateStr.replace(new RegExp(full, 'gi'), abbr);
  }
  if (/^\d{4}-\d{2}$/.test(dateStr)) {
    const [y, m] = dateStr.split('-');
    return `${months[Object.keys(months)[parseInt(m) - 1]] || m} ${y}`;
  }
  return dateStr;
}

function buildContactParts(personalDetails: CVData['personalDetails']): string[] {
  return [
    personalDetails.email,
    personalDetails.phone,
    personalDetails.location,
    personalDetails.linkedin,
    personalDetails.portfolio,
  ].filter(Boolean);
}

function renderExperienceMarkdown(experience: CVData['experience']): string {
  let md = '';
  experience.forEach((exp) => {
    const start = formatUKDate(exp.startDate);
    const end = exp.isCurrent ? "Present" : formatUKDate(exp.endDate);
    md += `### ${exp.role}, ${exp.company} (${start} - ${end})\n`;
    if (exp.location) md += `*${exp.location}*\n\n`;
    if (exp.achievements) {
      const bullets = exp.achievements.split('\n').filter(line => line.trim());
      bullets.forEach(bullet => {
        const cleanBullet = bullet.trim().replace(/^[•\-\*%ª]\s*/, '');
        md += `- ${cleanBullet}\n`;
      });
    }
    md += `\n`;
  });
  return md;
}

function renderEducationMarkdown(education: CVData['education']): string {
  let md = '';
  education.forEach((edu) => {
    md += `### ${edu.degree}, ${edu.institution} (${formatUKDate(edu.graduationDate)})\n`;
    if (edu.location || edu.grade) {
      md += `*${[edu.location, edu.grade].filter(Boolean).join(", ")}*\n`;
    }
    md += `\n`;
  });
  return md;
}

export async function generateCareerContent(
  data: CVData,
  type: 'cv',
  isPro: boolean = false,
  templateId: string = 'classic'
) {
  const { personalDetails, professionalSummary, coverLetter, experience, education, skills } = data;
  const contactLine = buildContactParts(personalDetails).join(" | ");

  switch (templateId) {
    case 'modern':
      return generateModern(personalDetails.fullName, contactLine, professionalSummary, experience, education, skills);
    case 'minimal':
      return generateMinimal(personalDetails.fullName, contactLine, professionalSummary, experience, education, skills);
    case 'professional':
      return generateProfessional(personalDetails.fullName, contactLine, professionalSummary, experience, education, skills);
    default:
      return generateClassic(personalDetails.fullName, contactLine, professionalSummary, experience, education, skills);
  }
}

export function generateCoverLetter(data: CVData): string {
  const { personalDetails, coverLetter } = data;
  const contactLine = buildContactParts(personalDetails).join(" | ");
  const location = personalDetails.location ? `\n${personalDetails.location}` : '';

  return [
    `# ${personalDetails.fullName}${location}`,
    contactLine,
    '---',
    coverLetter || 'Your cover letter content goes here.',
  ].join('\n\n');
}

function generateClassic(
  fullName: string,
  contactLine: string,
  professionalSummary: string,
  experience: CVData['experience'],
  education: CVData['education'],
  skills: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `${contactLine}\n\n`;
  if (professionalSummary) md += `## Professional Summary\n\n${professionalSummary}\n\n`;
  if (experience.length > 0) md += `## Work Experience\n\n${renderExperienceMarkdown(experience)}`;
  if (education.length > 0) md += `## Education\n\n${renderEducationMarkdown(education)}`;
  if (skills) md += `## Skills\n\n${skills}\n`;
  return md;
}

function generateModern(
  fullName: string,
  contactLine: string,
  professionalSummary: string,
  experience: CVData['experience'],
  education: CVData['education'],
  skills: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `*${contactLine}*\n\n`;
  if (professionalSummary) md += `## Professional Summary\n\n${professionalSummary}\n\n`;
  if (skills) md += `## Core Skills\n\n${skills}\n\n`;
  if (experience.length > 0) md += `## Experience\n\n${renderExperienceMarkdown(experience)}`;
  if (education.length > 0) md += `## Education\n\n${renderEducationMarkdown(education)}`;
  return md;
}

function generateMinimal(
  fullName: string,
  contactLine: string,
  professionalSummary: string,
  experience: CVData['experience'],
  education: CVData['education'],
  skills: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `${contactLine}\n\n`;
  if (professionalSummary) {
    md += `${professionalSummary}\n\n`;
  }
  if (experience.length > 0) {
    md += `## Work Experience\n\n${renderExperienceMarkdown(experience)}`;
  }
  if (education.length > 0) {
    md += `## Education\n\n${renderEducationMarkdown(education)}`;
  }
  if (skills) {
    const skillList = skills.split(',').map(s => s.trim()).filter(Boolean);
    md += `## Skills\n\n${skillList.map(s => `- ${s}`).join('\n')}\n`;
  }
  return md;
}

function generateProfessional(
  fullName: string,
  contactLine: string,
  professionalSummary: string,
  experience: CVData['experience'],
  education: CVData['education'],
  skills: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `${contactLine}\n\n`;
  if (professionalSummary) md += `${professionalSummary}\n\n`;
  if (experience.length > 0) md += `## Experience\n\n${renderExperienceMarkdown(experience)}`;
  if (education.length > 0) md += `## Education\n\n${renderEducationMarkdown(education)}`;
  if (skills) md += `## Skills\n\n${skills}\n`;
  return md;
}

export async function parseExistingCV(text: string, fileName?: string): Promise<Partial<CVData>> {
  if (!text?.trim()) return {};
  const ext = fileName?.split('.').pop()?.toLowerCase();
  const binaryExts = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'gif', 'bmp', 'zip'];
  if (binaryExts.includes(ext || '') || text.startsWith('%PDF')) return {};
  return { professionalSummary: text };
}
