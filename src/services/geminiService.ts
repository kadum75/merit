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

export async function generateCareerContent(data: CVData, type: 'cv', isPro: boolean = false) {
  const generationData = { ...data };
  const { personalDetails, professionalSummary, experience, education, skills } = generationData;

  let markdown = `# ${personalDetails.fullName}\n\n`;

  const contactParts = [
    personalDetails.email,
    personalDetails.phone,
    personalDetails.location,
    personalDetails.linkedin
  ].filter(Boolean);

  markdown += `${contactParts.join(" | ")}\n\n`;

  if (professionalSummary) {
    markdown += `## Professional Summary\n\n${professionalSummary}\n\n`;
  }

  if (experience && experience.length > 0) {
    markdown += `## Work Experience\n\n`;
    experience.forEach((exp) => {
      const start = formatUKDate(exp.startDate);
      const end = exp.isCurrent ? "Present" : formatUKDate(exp.endDate);
      markdown += `### ${exp.role}, ${exp.company} (${start} - ${end})\n`;
      if (exp.location) markdown += `*${exp.location}*\n\n`;

      if (exp.achievements) {
        const bullets = exp.achievements.split('\n').filter(line => line.trim());
        bullets.forEach(bullet => {
          const cleanBullet = bullet.trim().replace(/^[•\-\*]\s*/, '');
          markdown += `- ${cleanBullet}\n`;
        });
      }
      markdown += `\n`;
    });
  }

  if (education && education.length > 0) {
    markdown += `## Education\n\n`;
    education.forEach((edu) => {
      markdown += `### ${edu.degree}, ${edu.institution} (${formatUKDate(edu.graduationDate)})\n`;
      if (edu.location || edu.grade) {
        markdown += `*${[edu.location, edu.grade].filter(Boolean).join(", ")}*\n`;
      }
      markdown += `\n`;
    });
  }

  if (skills) {
    markdown += `## Skills\n\n${skills}\n`;
  }

  return markdown;
}

export async function parseExistingCV(fileBase64: string, mimeType: string): Promise<Partial<CVData>> {
  console.info("Automatic document extraction is disabled.");
  return {};
}
