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
  preview: {
    headingFont: string;
    bodyFont: string;
  };
}

export const TEMPLATES: CVTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Navy serif with warm gold accents — refined and traditional',
    accentColor: '#1E3A5F',
    pdf: {
      primaryColor: [30, 58, 95],
      secondaryColor: [180, 150, 80],
      accentRgb: [180, 150, 80],
      fontName: 'Times',
      nameSize: 24,
    },
    preview: {
      headingFont: 'Playfair Display, Georgia, serif',
      bodyFont: 'Inter, Helvetica, Arial, sans-serif',
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Slate and teal — contemporary with crisp hierarchy',
    accentColor: '#0D9488',
    pdf: {
      primaryColor: [30, 41, 59],
      secondaryColor: [13, 148, 136],
      accentRgb: [13, 148, 136],
      fontName: 'helvetica',
      nameSize: 22,
    },
    preview: {
      headingFont: 'Inter, Helvetica, Arial, sans-serif',
      bodyFont: 'Inter, Helvetica, Arial, sans-serif',
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Playfair serif with generous whitespace — editorial and premium',
    accentColor: '#1E293B',
    pdf: {
      primaryColor: [30, 41, 59],
      secondaryColor: [148, 163, 184],
      accentRgb: [148, 163, 184],
      fontName: 'Times',
      nameSize: 28,
    },
    preview: {
      headingFont: 'Playfair Display, Georgia, serif',
      bodyFont: 'Playfair Display, Georgia, serif',
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Dark header with gold accents — authoritative and executive',
    accentColor: '#0F172A',
    pdf: {
      primaryColor: [15, 23, 42],
      secondaryColor: [212, 165, 60],
      accentRgb: [212, 165, 60],
      headerBgColor: [15, 23, 42],
      fontName: 'helvetica',
      nameSize: 26,
    },
    preview: {
      headingFont: 'Inter, Helvetica, Arial, sans-serif',
      bodyFont: 'Inter, Helvetica, Arial, sans-serif',
    },
  },
];
