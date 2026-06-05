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
    description: 'Navy-toned traditional layout with refined borders',
    accentColor: '#1B2A4A',
    pdf: {
      primaryColor: [27, 42, 74],
      secondaryColor: [71, 85, 105],
      accentRgb: [27, 42, 74],
      fontName: 'helvetica',
      nameSize: 22,
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Contemporary slate design with teal accents and clean headers',
    accentColor: '#319795',
    pdf: {
      primaryColor: [45, 55, 72],
      secondaryColor: [49, 151, 149],
      accentRgb: [49, 151, 149],
      fontName: 'helvetica',
      nameSize: 20,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Clean, left-aligned editorial design with generous whitespace',
    accentColor: '#1A202C',
    pdf: {
      primaryColor: [26, 32, 44],
      secondaryColor: [160, 174, 192],
      accentRgb: [160, 174, 192],
      fontName: 'helvetica',
      nameSize: 22,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Executive dark header with gold accents and structured layout',
    accentColor: '#111827',
    pdf: {
      primaryColor: [17, 24, 39],
      secondaryColor: [214, 158, 46],
      accentRgb: [214, 158, 46],
      headerBgColor: [17, 24, 39],
      fontName: 'helvetica',
      nameSize: 24,
    },
  },
];
