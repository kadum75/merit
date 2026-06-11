import { describe, it, expect } from 'vitest';
import { generateCareerContent } from './cvGenerator';
import type { CVData } from '../types';

const sampleCV: CVData = {
  personalDetails: {
    fullName: 'Jane Smith',
    email: 'jane@example.com',
    phone: '07700 900000',
    location: 'London',
    linkedin: 'linkedin.com/in/jane',
    portfolio: '',
    country: 'United Kingdom',
  },
  professionalSummary: 'Experienced software engineer with 8 years building web applications.',
  experience: [
    {
      id: 'exp-1',
      role: 'Senior Developer',
      company: 'Tech Co',
      location: 'London',
      startDate: 'Jan 2020',
      endDate: 'Present',
      isCurrent: true,
      country: 'United Kingdom',
      achievements: 'Led a team of 5 engineers\nDelivered 3 major projects on time\n- Improved CI/CD pipeline',
    },
    {
      id: 'exp-2',
      role: 'Developer',
      company: 'Startup Inc',
      location: 'Manchester',
      startDate: '2018-03',
      endDate: '2019-12',
      isCurrent: false,
      country: 'United Kingdom',
      achievements: 'Built REST APIs\n* Wrote unit tests\n%ªReduced bugs by 40%',
    },
  ],
  education: [
    {
      id: 'edu-1',
      institution: 'University of Manchester',
      degree: 'BSc Computer Science',
      location: 'Manchester',
      graduationDate: 'Jun 2023',
      grade: 'First Class Honours',
      country: 'United Kingdom',
    },
  ],
  skills: 'JavaScript, TypeScript, React, Node.js, Python, Docker',
  jobDescription: '',
  transferableSkillsFocus: '',
};

describe('generateCareerContent', () => {
  it('generates classic template with all sections', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'classic');
    expect(result).toContain('# Jane Smith');
    expect(result).toContain('## Personal Profile');
    expect(result).toContain('Experienced software engineer');
    expect(result).toContain('## Work Experience');
    expect(result).toContain('### Senior Developer, Tech Co');
    expect(result).toContain('*London | Jan 2020 — Present*');
    expect(result).toContain('- Led a team of 5 engineers');
    expect(result).toContain('- Delivered 3 major projects on time');
    expect(result).toContain('- Improved CI/CD pipeline');
    expect(result).toContain('## Education');
    expect(result).toContain('### University of Manchester');
    expect(result).toContain('BSc Computer Science | First Class Honours | Jun 2023');
    expect(result).toContain('## Skills');
    expect(result).toContain('JavaScript, TypeScript, React');
  });

  it('includes Key Skills when transferableSkillsFocus is provided', async () => {
    const withTransferable = { ...sampleCV, transferableSkillsFocus: 'UK Employment Law, GDPR Compliance' };
    const result = await generateCareerContent(withTransferable, 'cv', false, 'classic');
    expect(result).toContain('## Key Skills');
    expect(result).toContain('UK Employment Law, GDPR Compliance');
  });

  it('renders bullet stripping correctly', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'classic');
    expect(result).not.toContain('%ª');
    expect(result).toContain('- ªReduced bugs by 40%');
  });

  it('renders "Present" for current role end date', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'classic');
    expect(result).toContain('Jan 2020 — Present');
  });

  it('converts YYYY-MM dates to UK format', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'classic');
    expect(result).toContain('Mar 2018 — Dec 2019');
  });

  it('generates Modern template', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'modern');
    expect(result).toContain('# Jane Smith');
    expect(result).toContain('## Experience');
    expect(result).toContain('## Core Skills');
  });

  it('generates Minimal template', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'minimal');
    expect(result).toContain('# Jane Smith');
    expect(result).toContain('## Work Experience');
    expect(result).not.toContain('## Personal Profile');
  });

  it('generates Professional template', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'professional');
    expect(result).toContain('# Jane Smith');
    expect(result).toContain('## Experience');
  });

  it('handles empty experience and education', async () => {
    const empty: CVData = {
      ...sampleCV,
      experience: [],
      education: [],
      skills: '',
    };
    const result = await generateCareerContent(empty, 'cv', false, 'classic');
    expect(result).toContain('# Jane Smith');
    expect(result).not.toContain('## Work Experience');
    expect(result).not.toContain('## Education');
  });

  it('prioritises skills matching job description', async () => {
    const withJd: CVData = {
      ...sampleCV,
      jobDescription: 'Looking for a React developer with TypeScript experience',
    };
    const result = await generateCareerContent(withJd, 'cv', false, 'classic');
    const skillsSection = result.split('## Skills\n\n')[1];
    const skills = skillsSection?.split('\n')[0] || '';
    const parts = skills.split(',').map(s => s.trim());
    const reactIdx = parts.indexOf('React');
    const dockerIdx = parts.indexOf('Docker');
    expect(reactIdx).toBeLessThan(dockerIdx);
  });

  it('renders education with grade', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'classic');
    expect(result).toContain('First Class Honours');
    expect(result).toContain('BSc Computer Science | First Class Honours | Jun 2023');
  });

  it('contact line includes all non-empty fields', async () => {
    const result = await generateCareerContent(sampleCV, 'cv', false, 'classic');
    expect(result).toContain('jane@example.com');
    expect(result).toContain('07700 900000');
    expect(result).toContain('London');
    expect(result).not.toContain('| |');
  });
});
