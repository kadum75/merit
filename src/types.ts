export interface WorkExperience {
  id: string;
  company: string;
  role: string;
  location: string;
  country?: string;
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
  country?: string;
  graduationDate: string;
  grade?: string;
}

export interface CVData {
  personalDetails: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    country?: string;
    linkedin?: string;
    portfolio?: string;
    portfolios?: string[];
    usefulLinks?: { label: string; url: string }[];
  };
  professionalSummary: string;
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
