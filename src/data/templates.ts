export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  accentColor: string;
  pdf: {
    primaryColor: [number, number, number];
    secondaryColor: [number, number, number];
    accentRgb?: [number, number, number];
    headerBgColor?: [number, number, number];
    fontName: string;
    nameSize: number;
  };
}

export const TEMPLATES: CVTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Navy with refined gold accents and balanced proportions',
    accentColor: '#1E3A5F',
    pdf: {
      primaryColor: [30, 58, 95],
      secondaryColor: [71, 85, 105],
      accentRgb: [30, 58, 95],
      fontName: 'helvetica',
      nameSize: 22,
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean slate and teal with generous whitespace and crisp hierarchy',
    accentColor: '#0D9488',
    pdf: {
      primaryColor: [30, 41, 59],
      secondaryColor: [13, 148, 136],
      accentRgb: [13, 148, 136],
      fontName: 'helvetica',
      nameSize: 20,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Editorial typography-first design with generous whitespace',
    accentColor: '#1E293B',
    pdf: {
      primaryColor: [30, 41, 59],
      secondaryColor: [148, 163, 184],
      accentRgb: [148, 163, 184],
      fontName: 'helvetica',
      nameSize: 24,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Executive dark header with refined gold accents and structured tiers',
    accentColor: '#0F172A',
    pdf: {
      primaryColor: [15, 23, 42],
      secondaryColor: [212, 165, 60],
      accentRgb: [212, 165, 60],
      headerBgColor: [15, 23, 42],
      fontName: 'helvetica',
      nameSize: 24,
    },
  },
];
