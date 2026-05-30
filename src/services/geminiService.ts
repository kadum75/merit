import { CVData } from "../types";

/**
 * Generates a professional UK-standard CV using static template logic.
 * This ensures the app remains functional for all users with consistent formatting.
 */
export async function generateCareerContent(data: CVData, type: 'cv', isPro: boolean = false) {
  // Clone data to avoid mutating original state
  const generationData = { ...data };

  const { personalDetails, professionalSummary, experience, education, skills, jobDescription, transferableSkillsFocus } = generationData;

  let markdown = `# ${personalDetails.fullName}\n\n`;
  
  const contactParts = [
    personalDetails.email,
    personalDetails.phone,
    personalDetails.location,
    personalDetails.linkedin
  ].filter(Boolean);
  
  markdown += `${contactParts.join(" | ")}\n\n`;

  let summarySection = professionalSummary || '';
  if (transferableSkillsFocus) {
    summarySection += summarySection ? `\n\n${transferableSkillsFocus}` : transferableSkillsFocus;
  }
  if (summarySection) {
    markdown += `## PROFESSIONAL SUMMARY\n\n${summarySection}\n\n`;
  }

  if (experience && experience.length > 0) {
    markdown += `## WORK EXPERIENCE\n\n`;
    experience.forEach((exp) => {
      markdown += `### ${exp.role}, ${exp.company} (${exp.startDate} - ${exp.isCurrent ? "Present" : exp.endDate})\n`;
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
    markdown += `## EDUCATION\n\n`;
    education.forEach((edu) => {
      markdown += `### ${edu.degree}, ${edu.institution} (${edu.graduationDate})\n`;
      if (edu.location || edu.grade) {
        markdown += `*${[edu.location, edu.grade].filter(Boolean).join(", ")}*\n`;
      }
      markdown += `\n`;
    });
  }

  if (skills) {
    markdown += `## SKILLS\n\n${skills}\n`;
  }

  if (jobDescription) {
    markdown += `\n## TARGET ROLE\n\n${jobDescription.split('\n').filter(l => l.trim()).slice(0, 3).map(l => `- ${l.trim()}`).join('\n')}\n`;
  }

  markdown += `\n---\nCreated with PrimeCV Free · Remove watermark at primecv.co.uk/pro`;

  return markdown;
}

/**
 * Parsing function for processing uploaded documents.
 * In the current version, automatic extraction is disabled in favour of manual data entry.
 */
export async function parseExistingCV(fileBase64: string, mimeType: string): Promise<Partial<CVData>> {
  console.info("Automatic document extraction is disabled.");
  return {};
}
