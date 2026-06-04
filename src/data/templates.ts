export interface CVTemplate {
  id: string;
  name: string;
  description: string;
  previewClass: string;
  accentColor: string;
  pdf: {
    primaryColor: [number, number, number];
    secondaryColor: [number, number, number];
    headerBgColor?: [number, number, number];
    fontName: string;
    nameSize: number;
  };
}

export const TEMPLATES: CVTemplate[] = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Traditional full-width layout with blue accents',
    previewClass: 'template-classic',
    accentColor: '#3B82F6',
    pdf: {
      primaryColor: [59, 130, 246],
      secondaryColor: [30, 64, 175],
      fontName: 'helvetica',
      nameSize: 22,
    },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Clean design with green accents and compact headers',
    previewClass: 'template-modern',
    accentColor: '#10B981',
    pdf: {
      primaryColor: [16, 185, 129],
      secondaryColor: [4, 120, 87],
      fontName: 'helvetica',
      nameSize: 20,
    },
  },
  {
    id: 'minimal',
    name: 'Minimal',
    description: 'Monochrome, light spacing, minimal borders',
    previewClass: 'template-minimal',
    accentColor: '#6B7280',
    pdf: {
      primaryColor: [107, 114, 128],
      secondaryColor: [55, 65, 81],
      fontName: 'helvetica',
      nameSize: 20,
    },
  },
  {
    id: 'professional',
    name: 'Professional',
    description: 'Dark header band, navy accents, two-column feel',
    previewClass: 'template-professional',
    accentColor: '#1E293B',
    pdf: {
      primaryColor: [30, 41, 59],
      secondaryColor: [100, 116, 139],
      headerBgColor: [30, 41, 59],
      fontName: 'helvetica',
      nameSize: 24,
    },
  },
];
