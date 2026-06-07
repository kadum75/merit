export interface CVSample {
  name: string;
  title: string;
  email: string;
  location: string;
  linkedin: string;
  summary: string;
  experience: {
    role: string;
    company: string;
    period: string;
    location: string;
    achievements: string[];
  }[];
  skills: string[];
}

export const cvSamples: CVSample[] = [
  {
    name: 'Sarah Mitchell',
    title: 'Senior Product Manager',
    email: 'sarah.m@email.com',
    location: 'London, UK',
    linkedin: 'linkedin.com/in/sarah',
    summary: 'Results-driven Product Manager with 7+ years of experience leading B2B SaaS products from concept to launch. Proven track record of driving 40%+ revenue growth through data-informed strategy and cross-functional leadership.',
    experience: [
      {
        role: 'Senior Product Manager',
        company: 'TechCorp',
        period: '2022 — Present',
        location: 'London',
        achievements: [
          'Led product strategy for B2B platform — 40% revenue growth',
          'Managed 3 cross-functional squads across 4 time zones',
        ],
      },
      {
        role: 'Product Manager',
        company: 'Startup.io',
        period: '2019 — 2022',
        location: 'Remote',
        achievements: [
          'Shipped 15+ features resulting in 2x user retention',
          'Built product roadmap aligned with OKR framework',
        ],
      },
    ],
    skills: ['Product Strategy', 'Agile', 'Data Analytics', 'Leadership', 'Roadmapping'],
  },
  {
    name: 'James Wilson',
    title: 'Senior Software Engineer',
    email: 'j.wilson@email.com',
    location: 'Manchester, UK',
    linkedin: 'linkedin.com/in/jwilson',
    summary: 'Full-stack engineer with 8 years of experience building scalable web applications. Specialising in React, Node.js, and cloud infrastructure. Passionate about clean code and developer experience.',
    experience: [
      {
        role: 'Senior Software Engineer',
        company: 'Finova Ltd',
        period: '2021 — Present',
        location: 'Manchester',
        achievements: [
          'Architected microservices migration — 60% latency reduction',
          'Led team of 5 engineers delivering payment platform v2',
        ],
      },
      {
        role: 'Software Engineer',
        company: 'CodeLab',
        period: '2018 — 2021',
        location: 'Leeds',
        achievements: [
          'Built real-time collaboration features used by 50k+ users',
          'Reduced CI pipeline from 25min to 6min',
        ],
      },
    ],
    skills: ['React', 'Node.js', 'TypeScript', 'AWS', 'PostgreSQL', 'Docker'],
  },
  {
    name: 'Priya Patel',
    title: 'Marketing Director',
    email: 'priya.p@email.com',
    location: 'Birmingham, UK',
    linkedin: 'linkedin.com/in/priyapatel',
    summary: 'Award-winning Marketing Director with 10+ years driving brand strategy and demand generation across B2B and B2C sectors. Expert in multi-channel campaigns and marketing analytics.',
    experience: [
      {
        role: 'Marketing Director',
        company: 'GrowthWorks',
        period: '2020 — Present',
        location: 'Birmingham',
        achievements: [
          'Increased MQL volume by 180% in 18 months',
          'Led rebranding that improved brand recall by 45%',
        ],
      },
      {
        role: 'Head of Marketing',
        company: 'BrightMedia',
        period: '2016 — 2020',
        location: 'Nottingham',
        achievements: [
          'Scaled marketing spend from £200k to £2M efficiently',
          'Launched 3 product campaigns with 5:1 ROI',
        ],
      },
    ],
    skills: ['Brand Strategy', 'Demand Gen', 'SEO/SEM', 'Marketing Analytics', 'Team Leadership'],
  },
  {
    name: 'David Chen',
    title: 'Finance Analyst',
    email: 'd.chen@email.com',
    location: 'Edinburgh, UK',
    linkedin: 'linkedin.com/in/dchen',
    summary: 'Chartered accountant turned Finance Analyst with 5 years of experience in financial modelling, forecasting, and strategic planning. Adept at translating complex data into actionable business insights.',
    experience: [
      {
        role: 'Senior Finance Analyst',
        company: 'Pinnacle Group',
        period: '2022 — Present',
        location: 'Edinburgh',
        achievements: [
          'Built financial models that improved forecast accuracy by 25%',
          'Automated monthly reporting — saved 40 hours per quarter',
        ],
      },
      {
        role: 'Finance Analyst',
        company: 'CapitalCorp',
        period: '2019 — 2022',
        location: 'Glasgow',
        achievements: [
          'Conducted due diligence on £15M acquisition target',
          'Reduced departmental costs by 12% through variance analysis',
        ],
      },
    ],
    skills: ['Financial Modelling', 'Excel/VBA', 'Power BI', 'Forecasting', 'M&A'],
  },
  {
    name: 'Emma Thompson',
    title: 'HR Business Partner',
    email: 'e.thompson@email.com',
    location: 'Bristol, UK',
    linkedin: 'linkedin.com/in/emmathompson',
    summary: 'Strategic HR professional with 9 years of experience across tech and professional services. Focused on organisational design, talent management, and building inclusive workplace cultures.',
    experience: [
      {
        role: 'HR Business Partner',
        company: 'ScaleUp Ltd',
        period: '2021 — Present',
        location: 'Bristol',
        achievements: [
          'Supported 300% headcount growth across 3 offices',
          'Designed L&D programme that increased retention by 35%',
        ],
      },
      {
        role: 'HR Manager',
        company: 'Advance Partners',
        period: '2017 — 2021',
        location: 'Cardiff',
        achievements: [
          'Led DEI initiatives improving representation by 28%',
          'Implemented HRIS reducing admin time by 50%',
        ],
      },
    ],
    skills: ['Organisational Design', 'Talent Management', 'Employment Law', 'Change Management', 'HRIS'],
  },
  {
    name: 'Alex Rivera',
    title: 'Operations Manager',
    email: 'a.rivera@email.com',
    location: 'Leeds, UK',
    linkedin: 'linkedin.com/in/alexrivera',
    summary: 'Operations leader with 11 years streamlining processes and driving operational excellence across logistics and SaaS. Lean Six Sigma Black Belt with a data-driven approach to problem solving.',
    experience: [
      {
        role: 'Operations Manager',
        company: 'LogiTech UK',
        period: '2020 — Present',
        location: 'Leeds',
        achievements: [
          'Optimised supply chain — 22% cost reduction YoY',
          'Led ISO 9001 certification achieved in 8 months',
        ],
      },
      {
        role: 'Operations Lead',
        company: 'FastTrack Ltd',
        period: '2016 — 2020',
        location: 'Sheffield',
        achievements: [
          'Reduced delivery times by 35% through route optimisation',
          'Managed team of 25 across 2 warehouse sites',
        ],
      },
    ],
    skills: ['Process Optimisation', 'Supply Chain', 'Lean Six Sigma', 'Data Analysis', 'ERP Systems'],
  },
  {
    name: 'Olivia Murphy',
    title: 'Sales Director',
    email: 'o.murphy@email.com',
    location: 'Dublin, Ireland',
    linkedin: 'linkedin.com/in/oliviamurphy',
    summary: 'Enterprise sales leader with 12 years driving revenue growth in SaaS. Consistently exceeded targets by 20%+ year on year. Expert in building high-performing sales teams and strategic account management.',
    experience: [
      {
        role: 'Sales Director',
        company: 'CloudServe Ltd',
        period: '2021 — Present',
        location: 'Dublin',
        achievements: [
          'Grew ARR from £2M to £8M in 3 years',
          'Built and trained 12-person enterprise sales team',
        ],
      },
      {
        role: 'Enterprise Account Executive',
        company: 'SaaSify Ltd',
        period: '2017 — 2021',
        location: 'Dublin',
        achievements: [
          'Closed £1.5M+ enterprise deal — largest in company history',
          'Achieved President\'s Club 3 years running',
        ],
      },
    ],
    skills: ['Enterprise Sales', 'Sales Leadership', 'CRM', 'Negotiation', 'Account Planning'],
  },
  {
    name: 'Luca Bianchi',
    title: 'Lead Product Designer',
    email: 'l.bianchi@email.com',
    location: 'Brighton, UK',
    linkedin: 'linkedin.com/in/lucabianchi',
    summary: 'Senior Product Designer with 7 years crafting intuitive digital experiences. Passionate about design systems, user research, and accessible interfaces that delight users and drive business outcomes.',
    experience: [
      {
        role: 'Lead Product Designer',
        company: 'DesignStudio',
        period: '2021 — Present',
        location: 'Brighton',
        achievements: [
          'Designed design system adopted by 4 product teams',
          'Improved usability score from 62 to 91 (SUS)',
        ],
      },
      {
        role: 'UX Designer',
        company: 'WebCraft Agency',
        period: '2018 — 2021',
        location: 'Portsmouth',
        achievements: [
          'Led user research for 10+ client projects',
          'Reduced onboarding drop-off by 40% through redesign',
        ],
      },
    ],
    skills: ['Figma', 'Design Systems', 'UX Research', 'Prototyping', 'Accessibility'],
  },
  {
    name: 'Aisha Mohammed',
    title: 'Legal Counsel',
    email: 'a.mohammed@email.com',
    location: 'London, UK',
    linkedin: 'linkedin.com/in/aishamohammed',
    summary: 'Qualified solicitor with 6 years of commercial legal experience in technology and financial services. Specialises in data privacy, IP law, and regulatory compliance.',
    experience: [
      {
        role: 'Legal Counsel',
        company: 'TechLegal LLP',
        period: '2021 — Present',
        location: 'London',
        achievements: [
          'Advised on GDPR compliance for AI product launch',
          'Negotiated 100+ commercial contracts worth £30M',
        ],
      },
      {
        role: 'Associate Solicitor',
        company: 'CityLaw Partners',
        period: '2018 — 2021',
        location: 'London',
        achievements: [
          'Managed IP portfolio for 50+ tech clients',
          'Successfully resolved £5M commercial dispute',
        ],
      },
    ],
    skills: ['Data Privacy', 'IP Law', 'Contract Negotiation', 'Regulatory Compliance', 'Corporate Law'],
  },
  {
    name: 'Ryan O\'Brien',
    title: 'Data Scientist',
    email: 'r.obrien@email.com',
    location: 'Belfast, UK',
    linkedin: 'linkedin.com/in/ryanobrien',
    summary: 'Data Scientist with 5 years of experience building ML models and analytical pipelines. Skilled in Python, SQL, and cloud-based ML infrastructure. Passionate about turning data into decisions.',
    experience: [
      {
        role: 'Data Scientist',
        company: 'InsightAI',
        period: '2022 — Present',
        location: 'Belfast',
        achievements: [
          'Built churn prediction model saving £1.2M annually',
          'Deployed NLP pipeline automating 80% of support tickets',
        ],
      },
      {
        role: 'Junior Data Scientist',
        company: 'DataFirst Ltd',
        period: '2019 — 2022',
        location: 'Dublin',
        achievements: [
          'Developed recommendation engine increasing CTR by 35%',
          'Created dashboards used by C-suite for weekly reviews',
        ],
      },
    ],
    skills: ['Python', 'TensorFlow', 'SQL', 'MLOps', 'Statistics', 'Tableau'],
  },
];
