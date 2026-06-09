import { CVData, WorkExperience, Education } from "../types";

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
  const { personalDetails, professionalSummary, experience, education, skills, jobDescription } = data;
  const contactLine = buildContactParts(personalDetails).join(" | ");
  const prioritisedSkills = prioritiseSkills(skills, jobDescription);

  switch (templateId) {
    case 'modern':
      return generateModern(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills);
    case 'minimal':
      return generateMinimal(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills);
    case 'professional':
      return generateProfessional(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills);
    default:
      return generateClassic(personalDetails.fullName, contactLine, professionalSummary, experience, education, prioritisedSkills);
  }
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
  if (professionalSummary) md += `## Personal Profile\n\n${professionalSummary}\n\n`;
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
  if (professionalSummary) md += `## Personal Profile\n\n${professionalSummary}\n\n`;
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

// ── CV Text Parser ──────────────────────────────────────────────
// Uses heuristics to split raw CV text into structured CVData fields.
// Handles common UK/EU CV formats with section headers.
// ─────────────────────────────────────────────────────────────────

const SECTION_HEADERS = [
  { pattern: /^(professional\s+)?(summary|profile|about me|personal statement|career objective|personal profile)/i, type: 'summary' as const },
  { pattern: /^((?:work|employment|career)\s+)?(experience|history|employment|professional experience|career history)/i, type: 'experience' as const },
  { pattern: /^(education|qualifications|academic|training|education\s+and\s+qualifications|academic background)/i, type: 'education' as const },
  { pattern: /^(technical\s+)?(skills?|core\s+competencies|expertise|technologies|key\s+skills|technical\s+skills|areas?\s+of\s+expertise|core\s+skills)/i, type: 'skills' as const },
  { pattern: /^(projects?|portfolio)/i, type: 'projects' as const },
  { pattern: /^(certifications?|licenses?|accreditations)/i, type: 'certifications' as const },
  { pattern: /^(languages)/i, type: 'languages' as const },
  { pattern: /^(interests?|hobbies)/i, type: 'interests' as const },
  { pattern: /^(references?|referees)/i, type: 'references' as const },
];

const EMAIL_RE = /[\w.-]+@[\w.-]+\.\w{2,}/;
const PHONE_RE = /(\+44[\s\-]?\d{4}[\s\-]?\d{3}[\s\-]?\d{3}|\+44[\s\-]?\d{3}[\s\-]?\d{3,4}[\s\-]?\d{4}|0\d{4}[\s\-]?\d{3}[\s\-]?\d{3}|0\d{3}[\s\-]?\d{3,4}[\s\-]?\d{4}|07\d{3}[\s\-]?\d{3}[\s\-]?\d{3}|0\d{4}[\s\-]?\d{6})/;
const LINKEDIN_RE = /linkedin\.com\/in\/[\w-]+/i;
const DATE_RANGE_RE = /(\w+\s+\d{4})\s*[–\-–—to]*\s*(\w+\s+\d{4}|present|current|now)|(\d{4})\s*[–\-–—to]*\s*(\d{4}|present|current|now)|(\d{1,2}\/\d{4})\s*[–\-–—to]*\s*(\d{1,2}\/\d{4}|present|current|now)/i;
const YEAR_RE = /\b(?:19|20)\d{2}\b/;
const UK_CITIES = /\b(london|manchester|birmingham|leeds|glasgow|edinburgh|bristol|liverpool|cardiff|belfast|newcastle|sheffield|oxford|cambridge|nottingham|southampton|portsmouth|leicester|brighton|aberdeen|dundee|reading|bath|york|exeter|norwich|northampton|derby|wolverhampton|swansea|coventry|hull|stoke|plymouth|milton\s*keynes|watford|slough|bournemouth|luton)\b/i;
const DEGREE_KEYWORDS = /\b(BA|BSc|BEng|BEd|LLB|MA|MSc|MEng|MBA|MPhil|MRes|PhD|DPhil|EngD|PGCE|PGDip|PGCert|PGDE|BTEC|HND|HNC|NVQ|GNVQ|FdSc|FdA|A[\s-]Levels?|AS[\s-]Levels?|GCSE|Bachelor|Master'?s?|Doctorate|Degree|Diploma|Foundation|Certificate|Access\s+to|Higher\s+National|National\s+(Diploma|Certificate))\b/i;
const GRADE_KEYWORDS = /\b(First|Second|Third|Upper|Lower|2:1|2\.1|2:2|2\.2|1st|2nd|3rd|Merit|Distinction|Pass|Honours?)\b/i;
const INSTITUTION_KEYWORDS = /\b(University|College|School|Institute|Academy|Polytechnic|Conservatoire)\b/i;

function parseCVText(text: string): Partial<CVData> {
  const personalDetails: Partial<CVData['personalDetails']> = {};
  const result = {
    personalDetails,
    professionalSummary: '',
    experience: [],
    education: [],
    skills: '',
  } as Partial<CVData>;

  const lines = text.split('\n');
  const trimmedLines = lines.map(l => l.trim());

  // ── 1. Detect section boundaries ──

  interface Section { type: string; start: number; end: number }
  const sections: Section[] = [];

  for (let i = 0; i < trimmedLines.length; i++) {
    const line = trimmedLines[i];
    if (!line) continue;
    const cleanLine = line.replace(/^\d+[\.\)]\s*/, '').replace(/:+$/, '').replace(/[_\-]{3,}/g, '').trim();
    if (!cleanLine) continue;
    const match = SECTION_HEADERS.find(s => s.pattern.test(cleanLine));
    if (match) {
      const prev = sections[sections.length - 1];
      if (prev) prev.end = i;
      sections.push({ type: match.type, start: i, end: trimmedLines.length });
    }
  }
  if (sections.length > 0) sections[sections.length - 1].end = trimmedLines.length;

  const before = sections.length > 0 ? trimmedLines.slice(0, sections[0].start).filter(Boolean) : trimmedLines.filter(Boolean);
  const getSection = (type: string) => {
    const s = sections.find(x => x.type === type);
    if (!s) return [] as string[];
    return trimmedLines.slice(s.start + 1, s.end);
  };

  // ── 2. Personal details ──

  const emailMatch = text.match(EMAIL_RE);
  if (emailMatch) personalDetails.email = emailMatch[0];

  const phoneMatch = text.match(PHONE_RE);
  if (phoneMatch) personalDetails.phone = phoneMatch[0].trim();

  const linkedinMatch = text.match(LINKEDIN_RE);
  if (linkedinMatch) personalDetails.linkedin = linkedinMatch[0];

  // Name: first non-contact, non-URL line before first section that looks like a real name
  const contactLines = new Set([emailMatch?.[0], phoneMatch?.[0], linkedinMatch?.[0]].filter(Boolean));
  let nameFallback = '';
  for (const line of before) {
    if (contactLines.has(line)) continue;
    const lower = line.toLowerCase();
    if (lower.includes('linkedin') || lower.startsWith('http')) continue;
    if (line.length > 1 && line.length < 45) {
      if (/^[A-Z][a-zà-ü']+(?:[\s-][A-Z][a-zà-ü'.]+){1,3}$/.test(line)) {
        personalDetails.fullName = line;
        nameFallback = '';
        break;
      }
      // Reject lines that look like contact info (email, phone, pipe-separated, @)
      if (!lower.includes('@') && !PHONE_RE.test(line) && !line.includes('|')) {
        if (!nameFallback) nameFallback = line;
      }
    }
  }
  if (!personalDetails.fullName && nameFallback) personalDetails.fullName = nameFallback;

  // Location: last contact-info line before first section (contains comma, known city, or UK country)
  const locationCandidates = before.filter(l => {
    const lower = l.toLowerCase();
    if (contactLines.has(l)) return false;
    if (lower.startsWith('http') || lower.includes('linkedin')) return false;
    return l.includes(',') || UK_CITIES.test(l) || /\b(uk|united kingdom|england|scotland|wales|northern ireland|europe)\b/i.test(l);
  });
  personalDetails.location = locationCandidates[locationCandidates.length - 1]?.trim() || '';

  // ── 3. Personal Profile ──

  const summaryLines = getSection('summary');
  if (summaryLines.length > 0) {
    result.professionalSummary = summaryLines.join(' ').replace(/\s{2,}/g, ' ').trim();
  }
  // Fallback: if no summary section, use text between name/contact and first section header
  if (!result.professionalSummary && before.length > 2) {
    const afterContact = before.filter(l => {
      const lower = l.toLowerCase();
      if (contactLines.has(l)) return false;
      if (l === personalDetails.fullName) return false;
      if (PHONE_RE.test(l) || EMAIL_RE.test(l)) return false;
      if (lower.startsWith('http')) return false;
      if (UK_CITIES.test(l) || /\b(uk|united kingdom|england)\b/i.test(l)) return false;
      return true;
    });
    if (afterContact.length >= 1) {
      const maybeSummary = afterContact.join(' ').trim();
      if (maybeSummary.length > 15) result.professionalSummary = maybeSummary;
    }
  }

  // ── 4. Experience ──

  const expLines = getSection('experience');
  if (expLines.length > 0) {
    result.experience = parseExperienceSection(expLines);
  }

  // ── 5. Education ──

  const eduLines = getSection('education');
  if (eduLines.length > 0) {
    result.education = parseEducationSection(eduLines);
  }

  // ── 6. Skills ──

  const skillsLines = getSection('skills').map(l => l.trim()).filter(Boolean);
  if (skillsLines.length > 0) {
    const raw = skillsLines
      .join(', ')
      .replace(/[•·●\-–—∙◦‣⁃]\s*/g, ', ')
      .replace(/\s*\|\s*/g, ', ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    result.skills = raw.replace(/^,+\s*/, '').replace(/,\s*,+/g, ',').trim();
  }

  // ── 7. Fallback: if no sections found, treat as raw text ──
  if (sections.length === 0 && text.length > 100) {
    result.professionalSummary = text.trim();
  }

  return result;
}

function looksLikeJobTitle(text: string): boolean {
  return /\b(Senior|Junior|Lead|Head|Chief|Principal|Staff|Associate|Assistant|Manager|Director|Engineer|Developer|Designer|Analyst|Consultant|Specialist|Coordinator|Administrator|Officer|Executive|Supervisor|Technician|Architect|Scientist|Researcher|Lecturer|Professor|Instructor|Advisor|Representative|Agent|Operative|Worker|Intern|Trainee|Apprentice|CEO|CTO|CFO|COO|VP|SVP|President|Founder|Co.?Founder|Contractor|Freelancer|Volunteer|Chairman|Chairwoman|Trustee)\b/i.test(text);
}

function looksLikeGenericSkill(text: string): boolean {
  const singleWords = new Set([
    'communication', 'leadership', 'management', 'problem', 'teamwork',
    'organisation', 'planning', 'analysis', 'research', 'creativity',
    'innovation', 'negotiation', 'presentation', 'mentoring', 'coaching',
    'budgeting', 'forecasting', 'reporting', 'strategy', 'marketing',
    'sales', 'support', 'training', 'development', 'testing',
    'engineering', 'accounting', 'finance', 'operations', 'logistics',
    'procurement', 'recruitment', 'compliance', 'auditing', 'quality',
  ]);
  const lower = text.toLowerCase().trim();
  return singleWords.has(lower) || /^(?:soft|hard|technical|analytical|interpersonal)\s+skill/i.test(text);
}

function looksLikeEntryHeader(line: string): boolean {
  if (!line || line.length < 3) return false;
  if (DATE_RANGE_RE.test(line)) return true;
  if (looksLikeJobTitle(line)) return true;
  if (line.includes('|')) return true;
  if (/[–—]/.test(line)) return true;
  return false;
}

function parseExperienceSection(lines: string[]): WorkExperience[] {
  if (lines.length === 0) return [];

  // Step 1: Process all non-empty lines, build an array of { text, index } entries
  const allLines = lines.map((l, i) => ({ text: l.trim(), lineIdx: i, isEntryHeader: false }))
    .filter(l => l.text.length > 0);

  // Step 2: Identify entry headers
  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i];
    const nextLine = i + 1 < allLines.length ? allLines[i + 1].text : '';
    const hasDate = DATE_RANGE_RE.test(line.text);
    const isJobTitle = looksLikeJobTitle(line.text);
    const hasPipe = line.text.includes('|');
    const nextIsDate = nextLine.length > 0 && DATE_RANGE_RE.test(nextLine);
    const isShortLine = line.text.length < 60;

    if (isShortLine && (hasDate || isJobTitle || hasPipe || nextIsDate)) {
      allLines[i].isEntryHeader = true;
    }
  }

  // Second pass: mark remaining substantial lines as headers
  // (catches entries whose first line doesn't match header heuristics)
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].isEntryHeader) continue;
    if (allLines[i].text.length >= 15 && !allLines[i].text.startsWith('-') && !allLines[i].text.startsWith('*')) {
      allLines[i].isEntryHeader = true;
    }
  }

  // Step 3: Group lines into entries (one header + following lines)
  const entries: WorkExperience[] = [];

  for (let i = 0; i < allLines.length; ) {
    if (!allLines[i].isEntryHeader) { i++; continue; }

    // Collect all lines from this header to just before the next header
    const entryLines: string[] = [];
    entryLines.push(allLines[i].text);
    let j = i + 1;
    while (j < allLines.length && !allLines[j].isEntryHeader) {
      entryLines.push(allLines[j].text);
      j++;
    }

    if (entryLines.length === 0) { i = j; continue; }

    const entry: WorkExperience = {
      id: '', company: '', role: '', location: '',
      startDate: '', endDate: '', isCurrent: false, achievements: '',
    };

    const blockText = entryLines.join('\n');

    // Extract date range
    const dateMatch = blockText.match(DATE_RANGE_RE);
    if (dateMatch) {
      entry.startDate = (dateMatch[1] || dateMatch[3] || dateMatch[5] || '').trim();
      entry.endDate = (dateMatch[2] || dateMatch[4] || dateMatch[6] || '').trim();
      entry.isCurrent = /present|current|now/i.test(entry.endDate);
    }

    // Parse first line for role/company/location
    const firstLine = entryLines[0];
    const cleanFirst = firstLine.replace(DATE_RANGE_RE, '').replace(/[–\-–—]\s*(present|current|now)/i, '').trim();

    const pipeSplit = cleanFirst.split('|').map(s => s.trim()).filter(Boolean);
    const dashSplit = cleanFirst.split(/[–—]\s*/).map(s => s.trim()).filter(Boolean);
    let parsed = false;

    if (pipeSplit.length >= 3) {
      if (looksLikeJobTitle(pipeSplit[0])) {
        entry.role = pipeSplit[0];
        entry.company = pipeSplit[1];
        entry.location = pipeSplit.slice(2).filter(l => !looksLikeJobTitle(l)).join(', ');
      } else {
        entry.company = pipeSplit[0];
        entry.role = pipeSplit[1];
        entry.location = pipeSplit.slice(2).filter(l => !looksLikeJobTitle(l)).join(', ');
      }
      parsed = true;
    } else if (pipeSplit.length === 2) {
      if (looksLikeJobTitle(pipeSplit[0])) {
        entry.role = pipeSplit[0];
        entry.company = pipeSplit[1];
      } else {
        entry.company = pipeSplit[0];
        entry.role = pipeSplit[1];
      }
      parsed = true;
    } else if (dashSplit.length >= 3) {
      if (looksLikeJobTitle(dashSplit[0])) {
        entry.role = dashSplit[0];
        entry.company = dashSplit[1];
        entry.location = dashSplit.slice(2).filter(l => !looksLikeJobTitle(l)).join(', ');
      } else {
        entry.company = dashSplit[0];
        entry.role = dashSplit[1];
        entry.location = dashSplit.slice(2).filter(l => !looksLikeJobTitle(l)).join(', ');
      }
      parsed = true;
    } else if (dashSplit.length === 2) {
      if (looksLikeJobTitle(dashSplit[0])) {
        entry.role = dashSplit[0];
        entry.company = dashSplit[1];
      } else {
        entry.company = dashSplit[0];
        entry.role = dashSplit[1];
      }
      parsed = true;
    }

    if (!parsed) {
      const atSplit = cleanFirst.split(/\s+(?:at|for|with|@)\s+/i);
      if (atSplit.length >= 2) {
        entry.role = atSplit.slice(0, -1).join(' ');
        entry.company = atSplit[atSplit.length - 1];
        parsed = true;
      }
    }

    if (!parsed) {
      // Try comma-separated "Role, Company"
      const commaSplit = cleanFirst.split(/\s*,\s*/).filter(Boolean);
      if (commaSplit.length >= 2 && commaSplit[0].length < 40 && commaSplit[1].length < 40) {
        if (looksLikeJobTitle(commaSplit[0]) && !looksLikeJobTitle(commaSplit[1]) && !looksLikeGenericSkill(commaSplit[1])) {
          entry.role = commaSplit[0];
          entry.company = commaSplit[1];
          parsed = true;
        }
      }
    }

    if (!parsed) {
      entry.role = cleanFirst || firstLine;
    }

    // Scan remaining lines for company/location (if not found in header)
    const consumedIndices = new Set<number>();
    consumedIndices.add(0);

    const dataLines: { index: number; trimmed: string }[] = [];
    for (let k = 1; k < entryLines.length; k++) {
      const trimmed = entryLines[k].replace(/^\d+[\.\)]\s*/, '').replace(/^[•·●\-–—\*]\s*/, '').trim();
      if (trimmed.length > 0 && !DATE_RANGE_RE.test(entryLines[k])) {
        dataLines.push({ index: k, trimmed });
      }
    }

    for (const { index, trimmed } of dataLines) {
      if (!entry.company && trimmed.length < 40 && !looksLikeJobTitle(trimmed) && !looksLikeGenericSkill(trimmed)
          && !DATE_RANGE_RE.test(trimmed) && !UK_CITIES.test(trimmed)) {
        entry.company = trimmed;
        consumedIndices.add(index);
        continue;
      }
      if (!entry.location && trimmed.length < 40 && !looksLikeJobTitle(trimmed)
          && (UK_CITIES.test(trimmed) || /\b(uk|united kingdom|england|scotland|wales)\b/i.test(trimmed))) {
        // Only treat as location if trimmed text IS primarily a location, not a company name containing a city
        const cityMatch = trimmed.match(UK_CITIES);
        if (cityMatch) {
          const city = cityMatch[0];
          const extra = trimmed.replace(city, '').replace(/[,;()]/g, '').trim();
          // If there's significant extra text beyond the city, it's probably a company name
          if (extra.length > 4) continue; // has significant extra text → probably a company name, not a location
        }
        entry.location = trimmed.replace(/[,;].*/, '').trim();
        consumedIndices.add(index);
        continue;
      }
    }

    // Mark date lines as consumed
    for (let k = 0; k < entryLines.length; k++) {
      if (DATE_RANGE_RE.test(entryLines[k])) consumedIndices.add(k);
    }

    // Achievements: lines not consumed
    const achievementLines: string[] = [];
    for (let k = 1; k < entryLines.length; k++) {
      if (consumedIndices.has(k)) continue;
      const trimmed = entryLines[k].replace(/^\d+[\.\)]\s*/, '').replace(/^[•·●\-–—\*]\s*/, '').trim();
      if (trimmed.length > 0) achievementLines.push(trimmed);
    }

    if (achievementLines.length > 0) {
      entry.achievements = achievementLines.join('\n');
    }

    entries.push(entry);
    i = j;
  }

  return entries;
}

function parseEducationSection(lines: string[]): Education[] {
  const allLines = lines.map(l => l.trim()).filter(Boolean);
  if (allLines.length === 0) return [];

  const entries: Education[] = [];
  let currentBlock: string[] = [];

  function flushBlock() {
    if (currentBlock.length === 0) return;
    const blockLines = currentBlock;
    const entry: Education = {
      id: '', institution: '', degree: '', location: '', graduationDate: '',
    };
    const blockText = blockLines.join(' ');

    // Extract year
    const yearMatch = blockText.match(DATE_RANGE_RE);
    if (yearMatch) {
      entry.graduationDate = (yearMatch[2] || yearMatch[4] || yearMatch[6] || '').trim();
    }
    if (!entry.graduationDate) {
      const singleYear = blockText.match(YEAR_RE);
      if (singleYear) entry.graduationDate = singleYear[0];
    }

    // Find degree
    for (const line of blockLines) {
      if (DEGREE_KEYWORDS.test(line)) {
        entry.degree = line.trim().replace(DATE_RANGE_RE, '').replace(YEAR_RE, '').replace(/[–\-–—]\s*(present|current|now)/i, '').replace(/[,;]\s*$/, '').trim();
        break;
      }
    }

    // Find institution
    for (const line of blockLines) {
      if (INSTITUTION_KEYWORDS.test(line) || /(?:of|in)\s+[A-Z][A-Za-z]/.test(line)) {
        const candidate = line.trim();
        if (candidate === entry.degree) {
          const parts = candidate.split(/,(?=[^,]*\b(?:University|College|School|Institute|Academy)\b)/i);
          if (parts.length > 1) {
            entry.degree = parts[0].trim();
            entry.institution = parts.slice(1).join(',').trim();
            break;
          }
          const dashSplit = candidate.split(/[–—]/);
          if (dashSplit.length > 1 && INSTITUTION_KEYWORDS.test(dashSplit[1])) {
            entry.degree = dashSplit[0].trim();
            entry.institution = dashSplit[1].trim();
            break;
          }
        }
        entry.institution = candidate;
        break;
      }
    }

    if (!entry.institution) {
      const nonDegree = blockLines.filter(l => l !== entry.degree);
      if (nonDegree.length > 0) {
        entry.institution = nonDegree[0];
        if (YEAR_RE.test(entry.institution) || DATE_RANGE_RE.test(entry.institution)) {
          entry.institution = nonDegree[1] || nonDegree[0];
        }
      }
    }

    // Find grade
    for (const line of blockLines) {
      if (GRADE_KEYWORDS.test(line)) {
        const trimmed = line.replace(DATE_RANGE_RE, '').replace(YEAR_RE, '').trim();
        if (trimmed.length < 40 && !INSTITUTION_KEYWORDS.test(trimmed) && !DEGREE_KEYWORDS.test(trimmed)) {
          entry.grade = trimmed;
          break;
        }
        const parenGrade = trimmed.match(/\(([^)]*?(?:First|Second|Third|2:1|2\.1|2:2|2\.2|1st|2nd|3rd|Honours?|Merit|Distinction)[^)]*)\)/i);
        if (parenGrade) {
          entry.grade = parenGrade[1].trim();
          break;
        }
      }
    }

    // Scan remaining lines for location
    if (!entry.location) {
      for (const line of blockLines) {
        if (line === entry.institution || line === entry.degree) continue;
        const trimmed = line.replace(YEAR_RE, '').replace(DATE_RANGE_RE, '').trim();
        if (trimmed.length > 0 && trimmed.length < 40 &&
            (UK_CITIES.test(trimmed) || /\b(uk|united kingdom|england|scotland|wales)\b/i.test(trimmed))) {
          entry.location = trimmed.replace(/[,;].*/, '').trim();
          break;
        }
      }
    }

    // Extract location from institution line if comma-separated
    const instParts = entry.institution.split(',').map((s: string) => s.trim());
    if (instParts.length > 1) {
      for (let i = 0; i < instParts.length; i++) {
        if (!INSTITUTION_KEYWORDS.test(instParts[i]) && !DEGREE_KEYWORDS.test(instParts[i]) &&
            (UK_CITIES.test(instParts[i]) || /\b(uk|united kingdom|england|scotland|wales|northern ireland|ireland)\b/i.test(instParts[i]))) {
          entry.location = instParts[i];
          entry.institution = instParts.slice(0, i).join(', ');
          break;
        }
      }
    }
    entry.institution = entry.institution.replace(DATE_RANGE_RE, '').replace(YEAR_RE, '').replace(/[–\-–—]\s*(present|current|now)/i, '').replace(/[,;]\s*$/, '').trim();

    entries.push(entry);
    currentBlock = [];
  }

  for (const line of allLines) {
    const isNewBlock = (DEGREE_KEYWORDS.test(line) || INSTITUTION_KEYWORDS.test(line))
      && line.length < 80;
    if (isNewBlock && currentBlock.length > 0) {
      flushBlock();
    }
    currentBlock.push(line);
  }
  flushBlock();

  return entries;
}

export async function parseExistingCV(buffer: ArrayBuffer, fileName?: string): Promise<Partial<CVData>> {
  if (!buffer || buffer.byteLength === 0) return {};
  const ext = fileName?.split('.').pop()?.toLowerCase();

  try {
    let text = '';

    if (ext === 'pdf') {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
      const doc = await pdfjs.getDocument({ data: buffer }).promise;
      const pages: string[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const items = content.items
          .filter((item: any) => 'str' in item && item.str.trim())
          .map((item: any) => ({
            str: item.str,
            x: item.transform[4],
            y: item.transform[5],
          }))
          .sort((a: any, b: any) => b.y - a.y || a.x - b.x);
        if (items.length === 0) { pages.push(''); continue; }
        const lines: string[] = [];
        let currentLine: { str: string; x: number }[] = [{ str: items[0].str, x: items[0].x }];
        for (let j = 1; j < items.length; j++) {
          const prev = items[j - 1];
          const curr = items[j];
          if (Math.abs(prev.y - curr.y) < 8) {
            currentLine.push({ str: curr.str, x: curr.x });
          } else {
            currentLine.sort((a, b) => a.x - b.x);
            lines.push(currentLine.map(l => l.str).join(' '));
            // Insert blank line if y-gap >= 20 (likely paragraph break)
            const gap = Math.abs(prev.y - curr.y);
            if (gap >= 20) lines.push('');
            currentLine = [{ str: curr.str, x: curr.x }];
          }
        }
        if (currentLine.length > 0) {
          currentLine.sort((a, b) => a.x - b.x);
          lines.push(currentLine.map(l => l.str).join(' '));
        }
        pages.push(lines.join('\n'));
      }
      text = pages.join('\n\n');
    } else if (ext === 'docx') {
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer: buffer });
      text = result.value;
    } else if (ext === 'doc') {
      console.error('Parse error: .doc files (old Word format) are not supported. Use .docx instead.');
      return {};
    } else {
      text = new TextDecoder().decode(buffer);
    }

    text = text.trim();
    if (!text) return {};
    return parseCVText(text);

  } catch (error) {
    console.error('Parse error:', error);
    return {};
  }
}
