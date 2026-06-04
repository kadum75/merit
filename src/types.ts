export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  achievements: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  location: string;
  graduationDate: string;
  grade?: string;
}

export interface CVData {
  personalDetails: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin?: string;
    portfolio?: string;
    portfolios?: string[];
    usefulLinks?: { label: string; url: string }[];
  };
  professionalSummary: string;
  coverLetter: string;
  experience: WorkExperience[];
  education: Education[];
  skills: string;
  jobDescription: string;
  transferableSkillsFocus?: string;
}

export type GenerationType = 'cv';

export interface SavedCV {
  id: string;
  jobRole: string;
  data: CVData;
  generatedContent: string | null;
  templateId: string;
  createdAt: string;
  updatedAt: string;
}
