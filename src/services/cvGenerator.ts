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
  const mmYyMatch = dateStr.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYyMatch) {
    const m = parseInt(mmYyMatch[1], 10);
    const y = mmYyMatch[2];
    const monthAbbr = Object.values(months)[m - 1] || mmYyMatch[1];
    return `${monthAbbr} ${y}`;
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
    const title = [exp.role, exp.company].filter(Boolean).join(', ') || exp.role || exp.company;
    md += `### ${title}\n`;
    const meta = [exp.location, `${start} — ${end}`].filter(Boolean).join(' | ');
    if (meta) md += `*${meta}*\n`;
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
    const title = edu.institution || edu.degree || 'Education';
    md += `### ${title}\n`;
    const meta = [edu.degree, edu.grade, edu.graduationDate].filter(Boolean).join(' | ');
    if (meta) md += `*${meta}*\n`;
    if (edu.location) md += `*${edu.location}*\n`;
    md += `\n`;
  });
  return md;
}

function extractJdKeywords(jobDescription: string): Set<string> {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'need',
    'must', 'about', 'between', 'through', 'during', 'before', 'after',
    'above', 'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why',
    'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
    'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
    'than', 'too', 'very', 'just', 'because', 'also', 'if', 'into',
    'your', 'our', 'their', 'its', 'this', 'that', 'these', 'those',
  ]);
  const words = jobDescription.toLowerCase().split(/[^a-zA-Z0-9+#.-]+/).filter(Boolean);
  return new Set(words.filter(w => w.length > 2 && !stopWords.has(w)));
}

function scoreSkillAgainstJd(skill: string, jdKeywords: Set<string>): number {
  const skillWords = skill.toLowerCase().split(/[\s/]+/);
  let score = 0;
  for (const word of skillWords) {
    if (jdKeywords.has(word)) score += 3;
    for (const kw of jdKeywords) {
      if (kw.includes(word) || word.includes(kw)) score += 1;
    }
  }
  return score;
}

function prioritiseSkills(skills: string, jobDescription: string): string {
  if (!skills || !jobDescription) return skills;
  const jdKeywords = extractJdKeywords(jobDescription);
  if (jdKeywords.size === 0) return skills;
  const items = skills.split(',').map(s => s.trim()).filter(Boolean);
  if (items.length === 0) return skills;
  const ranked = items
    .map(s => ({ skill: s, score: scoreSkillAgainstJd(s, jdKeywords) }))
    .sort((a, b) => b.score - a.score);
  const matched = ranked.filter(r => r.score > 0).map(r => r.skill);
  const unmatched = ranked.filter(r => r.score === 0).map(r => r.skill);
  return [...matched, ...unmatched].join(', ');
}

export async function generateCareerContent(
  data: CVData,
  type: 'cv',
  isPro: boolean = false,
  templateId: string = 'classic'
) {
  const { personalDetails, professionalSummary, experience, education, skills, jobDescription, transferableSkillsFocus } = data;
  const contactLine = buildContactParts(personalDetails).join(" | ");
  const prioritisedSkills = prioritiseSkills(skills, jobDescription);

  switch (templateId) {
    case 'modern':
      return generateModern(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills, transferableSkillsFocus);
    case 'minimal':
      return generateMinimal(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills, transferableSkillsFocus);
    case 'professional':
      return generateProfessional(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills, transferableSkillsFocus);
    default:
      return generateClassic(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills, transferableSkillsFocus);
  }
}

function generateClassic(
  fullName: string,
  contactLine: string,
  professionalSummary: string,
  experience: CVData['experience'],
  education: CVData['education'],
  skills: string,
  transferableSkillsFocus?: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `${contactLine}\n\n`;
  if (professionalSummary) md += `## Personal Profile\n\n${professionalSummary}\n\n`;
  if (transferableSkillsFocus) md += `## Key Skills\n\n${transferableSkillsFocus}\n\n`;
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
  transferableSkillsFocus?: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `*${contactLine}*\n\n`;
  if (professionalSummary) md += `## Personal Profile\n\n${professionalSummary}\n\n`;
  if (transferableSkillsFocus) md += `## Key Skills\n\n${transferableSkillsFocus}\n\n`;
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
  transferableSkillsFocus?: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `${contactLine}\n\n`;
  if (professionalSummary) {
    md += `${professionalSummary}\n\n`;
  }
  if (transferableSkillsFocus) {
    md += `## Key Skills\n\n${transferableSkillsFocus}\n\n`;
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
  transferableSkillsFocus?: string,
): string {
  let md = `# ${fullName}\n\n`;
  md += `${contactLine}\n\n`;
  if (professionalSummary) md += `${professionalSummary}\n\n`;
  if (transferableSkillsFocus) md += `## Key Skills\n\n${transferableSkillsFocus}\n\n`;
  if (experience.length > 0) md += `## Experience\n\n${renderExperienceMarkdown(experience)}`;
  if (education.length > 0) md += `## Education\n\n${renderEducationMarkdown(education)}`;
  if (skills) md += `## Skills\n\n${skills}\n`;
  return md;
}


