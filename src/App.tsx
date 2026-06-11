import React, { useState, useRef, useEffect } from 'react';
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  Wrench, 
  FileText, 
  Plus, 
  Trash2, 
  Download, 
  Sparkles, 
  Star,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
  Loader2,
  Lock,
  FolderOpen, 
  X, 
  Pencil,
  Shield
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { CVData, WorkExperience, Education, SavedCV } from './types';
import { generateCareerContent } from './services/cvGenerator';
import { TEMPLATES } from './data/templates';
import { cn } from './lib/utils';
import LandingPage from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { LegalModal, LegalType } from './components/LegalModal';
import { CookieConsent } from './components/CookieConsent';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useToast } from './components/ToastContext';
import { supabase, getCurrentMonthString, handleSupabaseError, OperationType, isSupabaseConfigValid, syncUserDocument, missingConfigVars } from './supabase';
import { UK_LOCATIONS } from './data/uk-locations';
import { COUNTRY_NAMES, getCitiesForCountry } from './data/countries';
import { getCountrySkillTips } from './data/transferableSkillsByCountry';
import { SKILLS } from './data/skills';
import { STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_PRICE_DONATION } from './lib/pricing';

const GENERAL_SKILLS = [
  'Leadership', 'Team Management', 'Project Management', 'Communication',
  'Problem Solving', 'Critical Thinking', 'Time Management', 'Attention to Detail',
  'Customer Service', 'Sales', 'Marketing', 'Data Analysis',
  'Microsoft Office', 'Excel', 'Public Speaking', 'Negotiation',
  'Conflict Resolution', 'Decision Making', 'Strategic Planning', 'Budgeting',
  'Agile', 'Scrum', 'Python', 'JavaScript', 'SQL', 'Git', 'Docker',
  'AWS', 'REST APIs', 'React', 'Node.js', 'TypeScript',
];

const INITIAL_DATA: CVData = {
  personalDetails: {
    fullName: '',
    email: '',
    phone: '',
    location: '',
    country: '',
    linkedin: '',
    portfolio: '',
    portfolios: [],
    usefulLinks: [],
  },
  professionalSummary: '',
  experience: [],
  education: [],
  skills: '',
  jobDescription: '',
  transferableSkillsFocus: '',
};

const CV_STORAGE_KEY = 'merit-cvs';
const ACTIVE_CV_KEY = 'merit-active-cv-id';

const SAMPLE_DATA: CVData = {
  personalDetails: {
    fullName: 'Alex Thompson',
    email: 'alex.thompson@example.co.uk',
    phone: '+44 7700 900123',
    location: 'Manchester, UK',
    linkedin: 'linkedin.com/in/alexthompson-pm',
    portfolio: 'alexthompson.design',
    portfolios: ['alexthompson.design'],
    usefulLinks: [
      { label: 'GitHub', url: 'github.com/alexthompson' },
      { label: 'Stack Overflow', url: 'stackoverflow.com/users/alexthompson' },
    ],
  },
  professionalSummary: 'Results-driven Project Manager with experience in delivering complex software solutions. Expert in Agile methodologies and stakeholder management.',
  experience: [{
    id: '1',
    company: 'TechFlow Solutions',
    role: 'Senior Project Manager',
    location: 'London',
    startDate: '01/2020',
    endDate: 'Present',
    isCurrent: true,
    achievements: 'Led a cross-functional team of 15 to launch a new SaaS platform\nManaged a budget of £1.2M with 10% cost savings\nImplemented Jira workflows that improved team velocity by 25%',
  }],
  education: [{
    id: '1',
    institution: 'University of Manchester',
    degree: 'BSc Computer Science',
    location: 'Manchester',
    graduationDate: '2018',
    grade: 'First Class Honours',
  }],
  skills: 'Agile, Scrum, Prince2, Stakeholder Management, Risk Mitigation, Budgeting, Jira, Confluence',
  jobDescription: 'We are looking for a Senior Project Manager to lead our digital transformation initiatives. The ideal candidate will have experience in Agile delivery, budget management, and leading high-performing teams.',
  transferableSkillsFocus: 'Highlight my leadership and team management skills from my time as a sports captain and my retail management experience.',
};

function generateId() {
  return Math.random().toString(36).substring(2, 11);
}

function loadCVs(): SavedCV[] {
  try {
    const raw = localStorage.getItem(CV_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCVs(cvs: SavedCV[]) {
  localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(cvs));
}

function createSavedCV(jobRole: string): SavedCV {
  return {
    id: generateId(),
    jobRole,
    data: { ...INITIAL_DATA, personalDetails: { ...INITIAL_DATA.personalDetails } },
    generatedContent: null,
    templateId: 'classic',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

async function loadServerCVs(userId: string): Promise<SavedCV[]> {
  try {
    const { data, error } = await supabase
      .from('cvs')
      .select('*')
      .eq('user_uid', userId);
    if (error) {
      console.error('Failed to load CVs from server:', error);
      return [];
    }
    return (data || []).map(row => ({
      id: row.cv_id,
      jobRole: row.job_role,
      data: row.data,
      generatedContent: row.generated_content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    console.error('Failed to load CVs from server:', err);
    return [];
  }
}

async function saveServerCVs(cvs: SavedCV[], userId: string) {
  if (cvs.length === 0) return;
  try {
    const rows = cvs.map(cv => ({
      user_uid: userId,
      cv_id: cv.id,
      job_role: cv.jobRole,
      data: cv.data,
      generated_content: cv.generatedContent,
      created_at: cv.createdAt,
      updated_at: cv.updatedAt,
    }));
    const { error } = await supabase
      .from('cvs')
      .upsert(rows, { onConflict: 'user_uid,cv_id' });
    if (error) {
      console.error('Failed to save CVs to server:', error);
    }
  } catch (err) {
    console.error('Failed to save CVs to server:', err);
  }
}

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'builder'>('home');
  const [user, setUser] = useState<any>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showDonationToast, setShowDonationToast] = useState(false);
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: LegalType }>({ isOpen: false, type: 'privacy' });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [cvs, setCVs] = useState<SavedCV[]>([]);
  const [cvsInitialized, setCVsInitialized] = useState(false);
  const [activeCVId, setActiveCVId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(ACTIVE_CV_KEY);
    } catch {
      return null;
    }
  });
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewCount, setPreviewCount] = useState(0);
  const [lastPreviewReset, setLastPreviewReset] = useState<any>(null);
  const [isStripeConfigured, setIsStripeConfigured] = useState(true);
  const [cvMenuOpen, setCVMenuOpen] = useState(false);
  const [editingCVId, setEditingCVId] = useState<string | null>(null);
  const [editRoleValue, setEditRoleValue] = useState('');
  const [newCVRole, setNewCVRole] = useState('');
  const [showNewCVInput, setShowNewCVInput] = useState(false);
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('merit-theme');
    return (saved === 'dark' || saved === 'light') ? saved : 'dark';
  });
  const { toast } = useToast();
  const accessTokenRef = useRef<string | null>(null);
  const pendingOnboardingRef = useRef(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const [blurred, setBlurred] = useState(false);
  const [showSummaryGuide, setShowSummaryGuide] = useState(false);

  useEffect(() => {
    const onVisibilityChange = () => setBlurred(document.hidden);
    const onBlur = () => setBlurred(true);
    const onFocus = () => setBlurred(false);
    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('blur', onBlur);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('merit-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  const activeCV = cvs.find(c => c.id === activeCVId) ?? null;
  const data: CVData = activeCV?.data ? { ...INITIAL_DATA, ...activeCV.data, personalDetails: { ...INITIAL_DATA.personalDetails, ...activeCV.data.personalDetails } } : INITIAL_DATA;
  const generatedContent: string | null = activeCV?.generatedContent ?? null;
  const activeTemplateId: string = activeCV?.templateId ?? 'classic';
  const activeTemplate = TEMPLATES.find(t => t.id === activeTemplateId) ?? TEMPLATES[0];

  const formatDate = (dateStr: string): string => {
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
  };

  const buildLivePreview = (d: CVData): string => {
    const sections: string[] = [];
    const pd = d.personalDetails;
    if (pd.fullName) sections.push(`# ${pd.fullName}`);
    const contact = [pd.email, pd.phone, pd.location].filter(Boolean).join(' | ');
    if (contact) sections.push(contact);
    const links = [pd.linkedin && `LinkedIn: ${pd.linkedin}`, ...(pd.portfolios ?? []).filter(Boolean).map(u => `Web: ${u}`)].filter(Boolean);
    if (links.length) sections.push(links.join(' | '));
    if (pd.usefulLinks?.length) sections.push(pd.usefulLinks.filter(l => l.label && l.url).map(l => `${l.label}: ${l.url}`).join(' | '));
    sections.push('---');
    if (d.professionalSummary) sections.push(`## Personal Profile\n\n${d.professionalSummary}`);
    if (d.experience?.length) {
      sections.push('## Work Experience');
      d.experience.forEach(exp => {
        const dates = `${formatDate(exp.startDate)} — ${exp.isCurrent ? 'Present' : formatDate(exp.endDate)}`;
        const title = [exp.role, exp.company].filter(Boolean).join(', ') || exp.role || exp.company;
        sections.push(`### ${title}\n*${[exp.location, dates].filter(Boolean).join(' | ')}*`);
        if (exp.achievements) sections.push(exp.achievements.split('\n').map(a => `- ${a.trim().replace(/^[•\-\*%ª]\s*/, '')}`).join('\n'));
      });
    }
    if (d.education?.length) {
      sections.push('## Education');
      d.education.forEach(edu => {
        const title = edu.institution || edu.degree || 'Education';
        sections.push(`### ${title}`);
        const meta = [edu.degree, edu.grade, edu.graduationDate].filter(Boolean).join(' | ');
        if (meta) sections.push(`*${meta}*`);
        if (edu.location && !meta.includes(edu.location)) sections.push(`*${edu.location}*`);
      });
    }
    if (d.transferableSkillsFocus) sections.push(`## Key Skills\n\n${d.transferableSkillsFocus}`);
    if (d.skills) sections.push(`## Skills\n\n${d.skills.split(',').map(s => s.trim()).filter(Boolean).join(', ')}`);
    return sections.join('\n\n');
  };

  const livePreview = React.useMemo(() => buildLivePreview(data), [data]);

  const hasFormData = data.personalDetails.fullName || data.professionalSummary || data.experience.length > 0 || data.education.length > 0 || data.skills;

  function setData(update: CVData | ((prev: CVData) => CVData)) {
    setCVs(prev => {
      const next = [...prev];
      const idx = next.findIndex(c => c.id === activeCVId);
      if (idx === -1) return prev;
      const newData = typeof update === 'function' ? update(next[idx].data) : update;
      next[idx] = { ...next[idx], data: newData, updatedAt: new Date().toISOString() };
      saveCVs(next);
      return next;
    });
  }

  function setGeneratedContent(content: string | null | ((prev: string | null) => string | null)) {
    setCVs(prev => {
      const next = [...prev];
      const idx = next.findIndex(c => c.id === activeCVId);
      if (idx === -1) return prev;
      const newContent = typeof content === 'function' ? content(next[idx].generatedContent) : content;
      next[idx] = { ...next[idx], generatedContent: newContent, updatedAt: new Date().toISOString() };
      saveCVs(next);
      return next;
    });
  }

  function setTemplateId(templateId: string) {
    setCVs(prev => {
      const next = [...prev];
      const idx = next.findIndex(c => c.id === activeCVId);
      if (idx === -1) return prev;
      next[idx] = { ...next[idx], templateId, updatedAt: new Date().toISOString() };
      saveCVs(next);
      return next;
    });
  }

  function switchCV(id: string) {
    setActiveCVId(id);
    setStep(0);
    setCVMenuOpen(false);
  }

  function handleCreateCV(role: string) {
    const trimmed = role.trim();
    if (!trimmed) return;
    if (!isDemo && cvs.length >= 4) return;
    const newCV = createSavedCV(trimmed);
    const next = [...cvs, newCV];
    setCVs(next);
    saveCVs(next);
    setActiveCVId(newCV.id);
    setShowNewCVInput(false);
    setNewCVRole('');
    setEditingCVId(null);
    setStep(0);
  }

  function handleDeleteCV(id: string) {
    if (cvs.length <= 1) return;
    const next = cvs.filter(c => c.id !== id);
    setCVs(next);
    saveCVs(next);
    if (activeCVId === id) {
      const target = next[0]?.id ?? null;
      setActiveCVId(target);
    }
    setCVMenuOpen(false);
  }

  function handleRenameCV(id: string) {
    const trimmed = editRoleValue.trim();
    if (!trimmed) return;
    setCVs(prev => {
      const next = [...prev];
      const idx = next.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      next[idx] = { ...next[idx], jobRole: trimmed };
      saveCVs(next);
      return next;
    });
    setEditingCVId(null);
    setEditRoleValue('');
  }

  function startRename(cv: SavedCV) {
    setEditingCVId(cv.id);
    setEditRoleValue(cv.jobRole);
  }

  // Auto-select first CV if none active; validate persisted ID still exists
  useEffect(() => {
    if (cvs.length === 0) {
      setActiveCVId(null);
    } else if (activeCVId) {
      if (!cvs.some(c => c.id === activeCVId)) {
        setActiveCVId(cvs[0].id);
      }
    } else {
      setActiveCVId(cvs[0].id);
    }
  }, [cvs]);

  // Persist active CV across page refreshes
  useEffect(() => {
    if (activeCVId) {
      localStorage.setItem(ACTIVE_CV_KEY, activeCVId);
    } else {
      localStorage.removeItem(ACTIVE_CV_KEY);
    }
  }, [activeCVId]);

  // Load CVs: Supabase for signed-in users, localStorage fallback for everyone
  useEffect(() => {
    let cancelled = false;
    if (user?.id) {
      loadServerCVs(user.id).then(serverCVs => {
        if (cancelled) return;
        if (serverCVs.length > 0) {
          setCVs(serverCVs);
          localStorage.setItem(CV_STORAGE_KEY, JSON.stringify(serverCVs));
        } else {
          const localCVs = loadCVs();
          setCVs(localCVs);
          if (localCVs.length > 0) {
            saveServerCVs(localCVs, user.id);
          }
        }
        setCVsInitialized(true);
      }).catch(() => {
        const localCVs = loadCVs();
        if (!cancelled) {
          setCVs(localCVs);
          setCVsInitialized(true);
        }
      });
    } else {
      const localCVs = loadCVs();
      setCVs(localCVs);
      setCVsInitialized(true);
    }
    return () => { cancelled = true; };
  }, [user?.id]);

  // Auto-create first CV only after initial load completes
  useEffect(() => {
    if (cvsInitialized && cvs.length === 0) {
      const first = createSavedCV('General');
      setCVs([first]);
      saveCVs([first]);
      setActiveCVId(first.id);
      if (pendingOnboardingRef.current) {
        pendingOnboardingRef.current = false;
        setTimeout(() => {
          setData(SAMPLE_DATA);
          setStep(5);
        }, 100);
      }
    }
  }, [cvsInitialized, cvs.length]);

  // Debounced server sync whenever CVs change and user is logged in
  const serverSyncTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (!user?.id) return;
    clearTimeout(serverSyncTimer.current);
    serverSyncTimer.current = setTimeout(() => {
      saveServerCVs(cvs, user.id);
    }, 1500);
    return () => clearTimeout(serverSyncTimer.current);
  }, [cvs, user?.id]);

  // Auth: handle PKCE exchange, session recovery, and auth state changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    if (urlParams.has('demo')) {
      setIsDemo(true);
      setIsPro(true);
      setCurrentView('builder');
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    const authCode = urlParams.get('code');
    const authError = urlParams.get('error') || urlParams.get('error_description');

    if (authCode) {
      setIsExchangingCode(true);
      supabase.auth.exchangeCodeForSession(authCode).catch((err) => {
        console.error('Auth code exchange failed (code may be expired):', err);
        if (urlParams.get('signin') === 'confirmed') {
          window.history.replaceState({}, '', window.location.pathname);
          setIsAuthModalOpen(true);
        }
      }).finally(() => {
        window.history.replaceState({}, '', window.location.pathname);
        setIsExchangingCode(false);
        supabase.auth.getUser().then(async ({ data: { user } }) => {
          if (user) {
            setUser(user);
          }
        }).catch((err) => {
          console.error('Failed to get user after code exchange:', err);
        });
        supabase.auth.getSession().then(({ data: { session } }) => {
          accessTokenRef.current = session?.access_token ?? null;
        });
      });
    } else if (authError) {
      console.error('OAuth error:', authError);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          setUser(user);
          setCurrentView('builder');
        }
      }).catch((err) => {
        console.error('Failed to get user on page load:', err);
      });
      supabase.auth.getSession().then(({ data: { session } }) => {
        accessTokenRef.current = session?.access_token ?? null;
      });
    }

    if (urlParams.get('signin') === 'confirmed') {
      // If there's an auth code, the exchange will handle auto-sign-in,
      // and the modal will open in the async chain if it fails.
      // If there's no auth code, open the modal immediately.
      if (!authCode) {
        window.history.replaceState({}, '', window.location.pathname);
        setIsAuthModalOpen(true);
      }
    }

    if (urlParams.get('checkout_success') === 'true') {
      window.history.replaceState({}, '', window.location.pathname);
      toast('Welcome to Pro! You can now download unlimited CVs.', 'success');
    }

    if (urlParams.get('view') === 'builder') {
      setCurrentView('builder');
      window.history.replaceState({}, '', window.location.pathname);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setResetPasswordMode(true);
        setIsAuthModalOpen(true);
        return;
      }
      accessTokenRef.current = session?.access_token ?? null;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        syncUserDocument(currentUser);
        if (currentView === 'home') setCurrentView('builder');
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  // Handle pending checkout after sign-in
  const pendingCheckoutRef = useRef(false);
  useEffect(() => {
    if (!user || pendingCheckoutRef.current) return;
    const pending = sessionStorage.getItem('merit-pending-checkout');
    if (!pending) return;
    pendingCheckoutRef.current = true;
    (async () => {
      try {
        const { priceId, planType, donationAmount } = JSON.parse(pending);
        await handleCheckout(priceId, planType, donationAmount);
      } catch {
        pendingCheckoutRef.current = false;
        sessionStorage.removeItem('merit-pending-checkout');
      }
    })();
  }, [user]);

  // Supabase User Data Listener (for isPro status)
  useEffect(() => {
    if (isDemo) {
      setIsPro(true);
      return;
    }
    if (!user) {
      setIsPro(false);
      return;
    }

    const fetchUserData = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('uid', user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
        console.error('Supabase fetch error:', error);
        handleSupabaseError(error, OperationType.GET, `users/${user.id}`);
        return;
      }

      if (data) {
        const currentMonth = getCurrentMonthString();
        if (data.last_preview_reset !== currentMonth) {
          setPreviewCount(0);
          setLastPreviewReset(currentMonth);
        } else {
          setPreviewCount(data.preview_count || 0);
          setLastPreviewReset(data.last_preview_reset);
        }
        setIsPro(data.is_pro || false);
      }
    };

    fetchUserData().catch(console.error);

    // Poll for changes every 60 seconds as a lightweight realtime alternative
    const interval = setInterval(fetchUserData, 60000);
    return () => clearInterval(interval);
  }, [user, isDemo]);

  // Check Stripe Config
  useEffect(() => {
    fetch('/api/config')
      .then(res => res.json())
      .then(data => {
        setIsStripeConfigured(data.isStripeConfigured);
      })
      .catch(err => console.error('Failed to fetch config:', err));
  }, []);

  const steps = [
    { id: 'personal', title: 'Personal Details', icon: User },
    { id: 'summary', title: 'Personal Profile', icon: FileText },
    { id: 'experience', title: 'Work Experience', icon: Briefcase },
    { id: 'education', title: 'Education', icon: GraduationCap },
    { id: 'skills', title: 'Skills', icon: Wrench },
    { id: 'job', title: 'Target Job', icon: Sparkles },
  ];

  const handlePersonalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setData(prev => ({
      ...prev,
      personalDetails: { ...prev.personalDetails, [name]: value }
    }));
  };

  const addExperience = () => {
    const newExp: WorkExperience = {
      id: Math.random().toString(36).substring(2, 11),
      company: '',
      role: '',
      location: '',
      startDate: '',
      endDate: '',
      isCurrent: false,
      achievements: '',
    };
    setData(prev => ({ ...prev, experience: [...prev.experience, newExp] }));
  };

  const updateExperience = (id: string, field: keyof WorkExperience, value: any) => {
    setData(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const removeExperience = (id: string) => {
    setData(prev => ({ ...prev, experience: prev.experience.filter(exp => exp.id !== id) }));
  };

  const addEducation = () => {
    const newEdu: Education = {
      id: Math.random().toString(36).substring(2, 11),
      institution: '',
      degree: '',
      location: '',
      graduationDate: '',
    };
    setData(prev => ({ ...prev, education: [...prev.education, newEdu] }));
  };

  const updateEducation = (id: string, field: keyof Education, value: any) => {
    setData(prev => ({
      ...prev,
      education: prev.education.map(edu => edu.id === id ? { ...edu, [field]: value } : edu)
    }));
  };

  const removeEducation = (id: string) => {
    setData(prev => ({ ...prev, education: prev.education.filter(edu => edu.id !== id) }));
  };

  const handlePortfolioChange = (index: number, value: string) => {
    setData(prev => {
      const portfolios = [...(prev.personalDetails.portfolios ?? [])];
      if (!portfolios[index]) return prev;
      portfolios[index] = value;
      return { ...prev, personalDetails: { ...prev.personalDetails, portfolios } };
    });
  };

  const addPortfolio = () => {
    setData(prev => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        portfolios: [...(prev.personalDetails.portfolios ?? []), ''],
      },
    }));
  };

  const removePortfolio = (index: number) => {
    setData(prev => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        portfolios: (prev.personalDetails.portfolios ?? []).filter((_, i) => i !== index),
      },
    }));
  };

  const addUsefulLink = () => {
    setData(prev => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        usefulLinks: [...(prev.personalDetails.usefulLinks ?? []), { label: '', url: '' }],
      },
    }));
  };

  const updateUsefulLink = (index: number, field: 'label' | 'url', value: string) => {
    setData(prev => {
      const links = [...(prev.personalDetails.usefulLinks ?? [])];
      if (!links[index]) return prev;
      links[index] = { ...links[index], [field]: value };
      return { ...prev, personalDetails: { ...prev.personalDetails, usefulLinks: links } };
    });
  };

  const removeUsefulLink = (index: number) => {
    setData(prev => ({
      ...prev,
      personalDetails: {
        ...prev.personalDetails,
        usefulLinks: (prev.personalDetails.usefulLinks ?? []).filter((_, i) => i !== index),
      },
    }));
  };

  const addSkill = (skill: string) => {
    const trimmed = skill.trim();
    if (!trimmed) return;
    setData(prev => {
      const current = prev.skills ? prev.skills.split(',').map(s => s.trim()) : [];
      if (current.includes(trimmed)) return prev;
      current.push(trimmed);
      return { ...prev, skills: current.join(', ') };
    });
  };

  const removeSkill = (skill: string) => {
    setData(prev => {
      const current = prev.skills ? prev.skills.split(',').map(s => s.trim()) : [];
      return { ...prev, skills: current.filter(s => s !== skill).join(', ') };
    });
  };

  const [skillInput, setSkillInput] = useState('');
  const [filteredSkills, setFilteredSkills] = useState<string[]>([]);
  const [transferableSkillInput, setTransferableSkillInput] = useState('');
  const [transferableFilteredSkills, setTransferableFilteredSkills] = useState<string[]>(GENERAL_SKILLS);

  const handleTransferableSkillInput = (value: string) => {
    setTransferableSkillInput(value);
    if (value.trim()) {
      const lower = value.toLowerCase();
      setTransferableFilteredSkills(SKILLS.filter(s => s.toLowerCase().includes(lower)).slice(0, 20));
    } else {
      setTransferableFilteredSkills(GENERAL_SKILLS);
    }
  };

  const handleSkillInputChange = (value: string) => {
    setSkillInput(value);
    if (value.trim()) {
      const lower = value.toLowerCase();
      setFilteredSkills(SKILLS.filter(s => s.toLowerCase().includes(lower)).slice(0, 20));
    } else {
      setFilteredSkills(GENERAL_SKILLS);
    }
  };

  const handleGenerate = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    setIsGenerating(true);

    if (!isPro) {
      try {
        const token = accessTokenRef.current;
        if (!token) {
          setIsGenerating(false);
          setIsAuthModalOpen(true);
          return;
        }
        const response = await fetch('/api/increment-preview', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });
        const result = await response.json();
        if (!result.allowed) {
          setIsGenerating(false);
          setShowUpgradeModal(true);
          return;
        }
        if (result.remaining >= 0) {
          setPreviewCount(3 - result.remaining);
        }
      } catch (err) {
        console.error('Preview check failed:', err);
      }
    }
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Generation timed out after 60 seconds. Please try again.')), 60000);
    });

    try {
      // Race the generation against the timeout
      const content = await Promise.race([
        generateCareerContent(data, 'cv', isPro, activeTemplateId),
        timeoutPromise
      ]) as string;

      if (!content) throw new Error('No content received');
      setGeneratedContent(content);
      setShowDonationToast(true);
    } catch (error: any) {
      console.error('Generation failed:', error);
      const message = error?.message || 'Failed to generate content. Please try again.';
      toast(message, 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPDF = async () => {
    try {
    if (!previewRef.current) return;
    if (!isPro) { setShowUpgradeModal(true); return; }
    const content = generatedContent || livePreview;
    if (!content) return;
    
    const { default: jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    pdf.setProperties({
      title: 'Merit Generated CV',
      subject: `ATS-Optimised CV - Generated on ${new Date().toLocaleDateString('en-GB')}`,
      author: 'ZenGale',
      keywords: 'ZenGale, ATS-Optimised',
      creator: 'Merit'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;
    const tpl = activeTemplate.pdf;

    // Helper to add text with wrapping
    const addWrappedText = (text: string, fontSize: number, fontStyle: string = 'normal', marginBottom: number = 5) => {
      pdf.setFont(tpl.fontName, fontStyle);
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, contentWidth);
      
      if (yPos + (lines.length * (fontSize * 0.32)) > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPos = margin;
      }

      pdf.text(lines, margin, yPos);
      yPos += (lines.length * (fontSize * 0.32)) + marginBottom;
    };

    // Simple Markdown Parser for jsPDF — template-aware
    const lines = content.split('\n');

    const isProTemplate = activeTemplateId === 'professional';
    const isModernTemplate = activeTemplateId === 'modern';
    const isMinimalTemplate = activeTemplateId === 'minimal';
    const isClassicTemplate = activeTemplateId === 'classic';

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        yPos += isMinimalTemplate ? 4 : 2;
        return;
      }

      if (trimmed.startsWith('# ')) {
        yPos += 3;
        const name = trimmed.replace('# ', '');

        if (isProTemplate) {
          // Professional: dark header band + gold underline
          pdf.setFillColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
          pdf.rect(margin, yPos - 2, contentWidth, 14, 'F');
          pdf.setTextColor(255, 255, 255);
          pdf.setFont(tpl.fontName, 'bold');
          pdf.setFontSize(tpl.nameSize);
          pdf.text(name, margin + 4, yPos + 9);
          pdf.setDrawColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
          pdf.setLineWidth(1.5);
          pdf.line(margin, yPos + 12, pageWidth - margin, yPos + 12);
          pdf.setTextColor(0, 0, 0);
          pdf.setDrawColor(0, 0, 0);
          yPos += 20;
        } else if (isModernTemplate) {
          // Modern: left accent bar
          pdf.setFillColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
          pdf.rect(margin, yPos, 4, 12, 'F');
          pdf.setTextColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
          pdf.setFont(tpl.fontName, 'bold');
          pdf.setFontSize(tpl.nameSize);
          pdf.text(name, margin + 10, yPos + 9);
          pdf.setTextColor(0, 0, 0);
          yPos += 14;
        } else if (isMinimalTemplate) {
          // Minimal: left-aligned, no border, light weight
          pdf.setFont(tpl.fontName, 'normal');
          pdf.setFontSize(tpl.nameSize);
          pdf.setTextColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
          pdf.text(name, margin, yPos);
          pdf.setTextColor(0, 0, 0);
          yPos += 12;
        } else {
          // Classic: thick top border + thin bottom
          pdf.setDrawColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
          pdf.setLineWidth(1.5);
          pdf.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
          pdf.setFont(tpl.fontName, 'bold');
          pdf.setFontSize(tpl.nameSize);
          pdf.text(name, pageWidth / 2, yPos + 6, { align: 'center' });
          yPos += 8;
          pdf.setLineWidth(0.3);
          pdf.line(margin, yPos, pageWidth - margin, yPos);
          pdf.setDrawColor(0, 0, 0);
          yPos += 6;
        }
      } else if (trimmed.startsWith('## ')) {
        yPos += isMinimalTemplate ? 4 : 6;
        const heading = trimmed.replace('## ', '');

        if (isClassicTemplate) {
          // Classic: thin top border line
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin, yPos - 2, pageWidth - margin, yPos - 2);
          pdf.setFont(tpl.fontName, 'bold');
          pdf.setFontSize(11);
          pdf.setTextColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
          pdf.text(heading.toUpperCase(), margin, yPos + 4);
          pdf.setTextColor(0, 0, 0);
          yPos += 8;
        } else if (isModernTemplate) {
          // Modern: inline underline
          pdf.setFont(tpl.fontName, 'bold');
          pdf.setFontSize(9);
          pdf.setTextColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
          pdf.text(heading.toUpperCase(), margin, yPos);
          const tw = pdf.getTextWidth(heading.toUpperCase());
          pdf.setDrawColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
          pdf.setLineWidth(0.5);
          pdf.line(margin, yPos + 1, margin + tw, yPos + 1);
          pdf.setTextColor(0, 0, 0);
          pdf.setDrawColor(0, 0, 0);
          yPos += 8;
        } else if (isMinimalTemplate) {
          // Minimal: no border, just bold
          pdf.setFont(tpl.fontName, 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
          pdf.text(heading, margin, yPos);
          pdf.setTextColor(0, 0, 0);
          yPos += 6;
        } else {
          // Professional: gold left border
          pdf.setFillColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
          pdf.rect(margin, yPos - 3, 3, 10, 'F');
          pdf.setFont(tpl.fontName, 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
          pdf.text(heading.toUpperCase(), margin + 8, yPos + 3);
          pdf.setTextColor(0, 0, 0);
          yPos += 8;
        }
      } else if (trimmed.startsWith('### ')) {
        pdf.setFont(tpl.fontName, 'bold');
        pdf.setFontSize(10);
        const subHeading = trimmed.replace('### ', '');
        if (isModernTemplate) {
          pdf.setTextColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
        } else if (isClassicTemplate) {
          pdf.setTextColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
        } else if (isProTemplate) {
          pdf.setTextColor(tpl.accentRgb![0], tpl.accentRgb![1], tpl.accentRgb![2]);
        }
        pdf.text(subHeading, margin, yPos);
        pdf.setTextColor(0, 0, 0);
        yPos += 5;
        pdf.setDrawColor(0, 0, 0);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        pdf.setFont(tpl.fontName, 'normal');
        pdf.setFontSize(9);
        const bulletText = trimmed.substring(2);
        const bulletLines = pdf.splitTextToSize(bulletText, contentWidth - 5);

        if (yPos + (bulletLines.length * 3.5) > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPos = margin;
        }

        const bulletChar = isClassicTemplate ? '▪' : isProTemplate ? '▸' : isMinimalTemplate ? '—' : '•';
        if (isClassicTemplate) {
          pdf.setTextColor(tpl.primaryColor[0], tpl.primaryColor[1], tpl.primaryColor[2]);
        } else if (isProTemplate) {
          pdf.setTextColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
        } else if (isModernTemplate) {
          pdf.setTextColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
        } else {
          pdf.setTextColor(tpl.secondaryColor[0], tpl.secondaryColor[1], tpl.secondaryColor[2]);
        }
        pdf.text(bulletChar, margin, yPos);
        pdf.setTextColor(0, 0, 0);
        pdf.text(bulletLines, margin + 5, yPos);
        yPos += (bulletLines.length * 3.5) + 1.5;
      } else if (/^\*\*(.+)\*\*$/.test(trimmed)) {
        const boldText = trimmed.replace(/^\*\*(.+)\*\*$/, '$1');
        addWrappedText(boldText, 9, 'bold', 2);
      } else if (/^\*(.+)\*$/.test(trimmed) && !trimmed.startsWith('* ')) {
        const italicText = trimmed.replace(/^\*(.+)\*$/, '$1');
        addWrappedText(italicText, 9, 'italic', 2);
      } else {
        const isContactInfo = yPos < 50 && trimmed.includes('|');
        if (isContactInfo) {
          if (isMinimalTemplate || isModernTemplate) {
            pdf.setFont(tpl.fontName, 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(160, 174, 192);
            pdf.text(trimmed, margin, yPos);
          } else if (isProTemplate) {
            pdf.setFont(tpl.fontName, 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(120, 120, 120);
            pdf.text(trimmed, margin + 18, yPos);
          } else {
            pdf.setFont(tpl.fontName, 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(100, 100, 100);
            pdf.text(trimmed, pageWidth / 2, yPos, { align: 'center' });
          }
          pdf.setTextColor(0, 0, 0);
          yPos += 8;
        } else {
          if (isMinimalTemplate) {
            addWrappedText(trimmed, 9, 'normal', 4);
          } else {
            addWrappedText(trimmed, 9, 'normal', 3);
          }
        }
      }
    });

    const name = data.personalDetails.fullName.replace(/\s+/g, '_') || 'My_CV';
    pdf.save(`${name}_CV.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      toast('Failed to generate PDF. Please try again.', 'error');
    }
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setData(INITIAL_DATA);
      setGeneratedContent(null);
      setStep(0);
    }
  };

  const copyToClipboard = async () => {
    if (!isPro) { setShowUpgradeModal(true); return; }
    const text = generatedContent || livePreview;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast('Copied to clipboard!', 'success');
    } catch (err) {
      console.error('Failed to copy:', err);
      toast('Failed to copy to clipboard.', 'error');
    }
  };

  const downloadDOC = async () => {
    if (!isPro) { setShowUpgradeModal(true); return; }
    const content = generatedContent || livePreview;
    if (!content) return;

    const {
      Document, Packer, Paragraph, TextRun,
      HeadingLevel, AlignmentType, BorderStyle,
    } = await import('docx');

    const tpl = activeTemplate.pdf;
    const rgb = (c: [number, number, number]) => '#' + c.map(v => v.toString(16).padStart(2, '0')).join('');
    const primaryHex = rgb(tpl.primaryColor);
    const secondaryHex = rgb(tpl.secondaryColor);
    const fontName = tpl.fontName;

    function parseInline(text: string) {
      const parts: (string | import('docx').TextRun)[] = [];
      const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
      let last = 0;
      for (const m of text.matchAll(regex)) {
        if (m.index > last) parts.push(text.slice(last, m.index));
        if (m[2]) parts.push(new TextRun({ text: m[2], bold: true, font: fontName, size: 20 }));
        if (m[3]) parts.push(new TextRun({ text: m[3], italics: true, font: fontName, size: 20 }));
        last = m.index + m[0].length;
      }
      if (last < text.length) parts.push(text.slice(last));
      return parts;
    }

    function runs(text: string) {
      return parseInline(text).map(p => typeof p === 'string'
        ? new TextRun({ text: p, font: fontName, size: 20 })
        : p
      );
    }

    const lines = content.split('\n');
    const children: any[] = [];
    let listBuffer: any[] | null = null;

    function flushList() {
      if (listBuffer) { children.push(...listBuffer); listBuffer = null; }
    }

    for (const raw of lines) {
      const trimmed = raw.trim();
      if (!trimmed) { flushList(); continue; }

      // H1 — Name
      const h1 = trimmed.match(/^# (.+)/);
      if (h1) {
        flushList();
        children.push(new Paragraph({
          children: [new TextRun({ text: h1[1], bold: true, size: 52, font: fontName, color: primaryHex })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
        }));
        continue;
      }

      // H2 — Section title
      const h2 = trimmed.match(/^## (.+)/);
      if (h2) {
        flushList();
        children.push(new Paragraph({
          children: [new TextRun({ text: h2[1], bold: true, size: 28, font: fontName, color: primaryHex })],
          spacing: { before: 300, after: 100 },
          border: { bottom: { color: primaryHex, size: 6, style: BorderStyle.SINGLE } },
        }));
        continue;
      }

      // H3 — Job title, institution
      const h3 = trimmed.match(/^### (.+)/);
      if (h3) {
        flushList();
        children.push(new Paragraph({
          children: [new TextRun({ text: h3[1], bold: true, size: 24, font: fontName, color: secondaryHex })],
          spacing: { before: 200, after: 60 },
        }));
        continue;
      }

      // Bullet point
      const bullet = trimmed.match(/^[-•·●]\s+(.+)/);
      if (bullet) {
        listBuffer = listBuffer || [];
        listBuffer.push(new Paragraph({
          children: runs(bullet[1]),
          spacing: { after: 40 },
          bullet: { level: 0 },
        }));
        continue;
      }

      // Italic whole-line (meta: dates, location)
      const italicLine = trimmed.match(/^\*(.+)\*$/);
      if (italicLine) {
        flushList();
        children.push(new Paragraph({
          children: [new TextRun({ text: italicLine[1], italics: true, size: 20, font: fontName, color: '666666' })],
          spacing: { after: 100 },
        }));
        continue;
      }

      // Regular paragraph
      flushList();
      children.push(new Paragraph({
        children: runs(trimmed),
        spacing: { after: 80 },
      }));
    }

    flushList();

    const doc = new Document({
      sections: [{
        properties: {},
        children,
      }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.personalDetails.fullName.replace(/\s+/g, '_')}_CV.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getAuthToken = async (): Promise<string | null> => {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.access_token ?? null;
    } catch (err) {
      console.error('Failed to get auth session:', err);
      return null;
    }
  };

  const handleManageSubscription = async () => {
    if (!user) return;
    const token = await getAuthToken();
    if (!token) { toast('Session expired. Please sign in again.', 'error'); return; }
    try {
      const response = await fetch('/api/create-portal-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ uid: user.id }),
      });
      const data = await response.json();
      if (data.url) {
        pendingCheckoutRef.current = true;
        sessionStorage.removeItem('merit-pending-checkout');
        window.location.href = data.url;
      } else {
        toast(data.error || 'Could not open subscription management. Please try again.', 'error');
      }
    } catch (err) {
      console.error('Portal error:', err);
      toast('Something went wrong. Please try again later.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 3000)),
      ]);
    } catch (err) {
      console.error('Sign out error:', err);
    }
    // Clear Supabase session from local storage regardless
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    }
    window.location.href = '/';
  };

  const handleCheckout = async (priceId: string, planType: string, donationAmount?: string) => {
    if (!isStripeConfigured) {
      toast("Payments coming soon - please check back shortly!", 'info');
      return;
    }

    if (!user) {
      sessionStorage.setItem('merit-pending-checkout', JSON.stringify({ priceId, planType, donationAmount }));
      setIsAuthModalOpen(true);
      return;
    }

    const token = accessTokenRef.current;
    if (!token) {
      console.warn('[Checkout] no valid session token');
      toast('Session expired. Please sign in again.', 'error');
      return;
    }

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          uid: user.id,
          email: user.email,
          priceId,
          planType,
          donationAmount,
          returnView: currentView
        }),
      });

      const data = await response.json();
      if (data.url) {
        pendingCheckoutRef.current = true;
        sessionStorage.removeItem('merit-pending-checkout');
        sessionStorage.setItem('merit-previous-view', currentView);
        window.location.href = data.url;
      } else {
        console.error('[Checkout] API returned no URL:', data);
        toast('Checkout error: ' + (data.error || 'No checkout URL returned. Please try again.'), 'error');
      }
    } catch (error) {
      console.error('[Checkout] fetch error:', error);
      pendingCheckoutRef.current = false;
      toast('Something went wrong with the checkout. Please try again later.', 'error');
    }
  };

  return (
    <ErrorBoundary>
    <>
      <CookieConsent />

      {isExchangingCode && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-zinc-200 dark:border-zinc-700 border-t-zinc-900 dark:border-t-zinc-100 rounded-full animate-spin" />
            <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Signing you in...</p>
          </div>
        </div>
      )}

       {!isSupabaseConfigValid && (
         <div className="bg-red-600 text-white py-2 px-4 text-center text-sm font-bold sticky top-0 z-[100] flex flex-col items-center justify-center gap-1">
           <div className="flex items-center gap-2">
             <Lock className="w-4 h-4" />
             Supabase is not configured.
           </div>
           <div className="text-[10px] opacity-90 font-normal">
             Missing: {Object.entries(missingConfigVars).filter(([_, missing]) => missing).map(([name]) => name).join(', ')}
           </div>
         </div>
       )}

      <Header
        user={user}
        isPro={isPro}
        isDemo={isDemo}
        isStripeConfigured={isStripeConfigured}
        theme={theme}
        currentView={currentView}
        onNavigateHome={() => setCurrentView('home')}
        onSignInClick={() => setIsAuthModalOpen(true)}
        onSignOut={handleSignOut}
        onManageSubscription={handleManageSubscription}
        onCheckout={handleCheckout}
        onToggleTheme={toggleTheme}
      />

      <AnimatePresence mode="sync">
      {currentView === 'home' ? (
        <motion.div
          key="home"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LandingPage 
            onStart={() => setCurrentView('builder')} 
            isPro={isPro}
            isDemo={isDemo}
            user={user}
            onSignInClick={() => setIsAuthModalOpen(true)}
            onSignOut={handleSignOut}
            onManageSubscription={handleManageSubscription}
            isStripeConfigured={isStripeConfigured}
            theme={theme}
            onToggleTheme={toggleTheme}
            handleCheckout={handleCheckout}
          />
        </motion.div>
      ) : (
        <motion.div
          key="builder"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col"
        >
          {/* Builder secondary bar */}
          <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 sm:px-6 py-2">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-2">
              {/* CV Selector */}
              <div className="relative">
                <button
                  onClick={() => setCVMenuOpen(!cvMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  <span className="max-w-[120px] truncate">{activeCV?.jobRole ?? 'CV'}</span>
                  <span className="text-[10px] text-zinc-400 font-bold">{cvsInitialized ? cvs.length : '...'}</span>
                </button>

                <AnimatePresence>
                  {cvMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      className="absolute left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50"
                    >
                      <div className="p-2 space-y-1">
                        {!cvsInitialized ? (
                          <div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-zinc-400">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading CVs...
                          </div>
                        ) : (
                          cvs.map(cv => (
                            <div key={cv.id} className="group relative">
                              {editingCVId === cv.id ? (
                                <div className="flex items-center gap-1 p-1">
                                  <input
                                    value={editRoleValue}
                                    onChange={e => setEditRoleValue(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleRenameCV(cv.id); if (e.key === 'Escape') setEditingCVId(null); }}
                                    className="flex-1 px-2 py-1 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                                    autoFocus
                                  />
                                  <button onClick={() => handleRenameCV(cv.id)} className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                                    <CheckCircle2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => setEditingCVId(null)} className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => switchCV(cv.id)}
                                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                                    cv.id === activeCVId
                                      ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-semibold'
                                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                                  }`}
                                >
                                  <FileText className="w-4 h-4 shrink-0" />
                                  <span className="flex-1 truncate text-left">{cv.jobRole}</span>
                                  <span className="text-[10px] text-zinc-400">{cv.generatedContent ? '✓' : ''}</span>
                                  <button
                                    onClick={e => { e.stopPropagation(); startRename(cv); }}
                                    className="p-1 text-zinc-300 hover:text-zinc-600 dark:hover:text-zinc-300 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    <Pencil className="w-3 h-3" />
                                  </button>
                                  {cvs.length > 1 && (
                                    <button
                                      onClick={e => { e.stopPropagation(); if (confirm(`Delete "${cv.jobRole}"?`)) handleDeleteCV(cv.id); }}
                                      className="p-1 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  )}
                                </button>
                              )}
                            </div>
                          ))
                        )}
                      </div>

                      {showNewCVInput ? (
                        <div className="border-t border-zinc-100 dark:border-zinc-800 p-2">
                          <div className="flex items-center gap-1">
                            <input
                              value={newCVRole}
                              onChange={e => setNewCVRole(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') handleCreateCV(newCVRole); if (e.key === 'Escape') { setShowNewCVInput(false); setNewCVRole(''); } }}
                              placeholder="Job role (e.g. Senior Dev)"
                              className="flex-1 px-2 py-1 text-sm bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded focus:outline-none focus:ring-1 focus:ring-zinc-900 dark:focus:ring-zinc-100"
                              autoFocus
                            />
                            <button onClick={() => { setShowNewCVInput(false); setNewCVRole(''); }} className="p-1 text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ) : cvsInitialized && (isDemo || cvs.length < 4) ? (
                          <div className="border-t border-zinc-100 dark:border-zinc-800 p-2">
                            <button
                              onClick={() => setShowNewCVInput(true)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              New CV
                            </button>
                          </div>
                        ) : cvsInitialized && !isDemo && !isPro ? (
                          <div className="border-t border-zinc-100 dark:border-zinc-800 p-2">
                            <button
                              onClick={() => setShowUpgradeModal(true)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-colors"
                            >
                              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                              </svg>
                              Upgrade to Pro
                            </button>
                          </div>
                        ) : null
                      }
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block" />

              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                <button 
                  onClick={clearAll}
                  className="text-[10px] sm:text-xs font-bold text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors uppercase tracking-widest px-2 sm:px-3 py-1 border border-red-200 dark:border-red-900 rounded-full"
                >
                  Clear All
                </button>
                <button 
                   onClick={() => {
                     setData(SAMPLE_DATA);
                     setStep(5);
                   }}
                  className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors uppercase tracking-widest px-2 sm:px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-full"
                >
                  Load Sample
                </button>
              </div>

              {(generatedContent || isPro) && (
                <div className="flex flex-wrap gap-1.5 sm:gap-2 items-center ml-auto">
                  {isPro ? (
                    <>
                      <button 
                        onClick={downloadPDF}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-[11px] sm:text-sm font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> PDF
                      </button>
                      <button 
                        onClick={downloadDOC}
                        className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 rounded-lg text-[11px] sm:text-sm font-medium transition-colors"
                      >
                        <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> DOC
                      </button>
                    </>
                  ) : generatedContent ? (
                    <button 
                      onClick={() => handleCheckout(STRIPE_PRICE_MONTHLY, 'monthly')}
                      className="flex items-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white rounded-lg text-[11px] sm:text-sm font-bold transition-all shadow-lg shadow-amber-500/20"
                    >
                      <Star className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> Go Pro to Download
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </div>

      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
        {/* Left Column: Form */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
          {/* Progress Bar */}
          <div className="flex border-b border-zinc-100 dark:border-zinc-800">
            {steps.map((s, i) => (
              <button
                key={`row-steps-${i}`}
                onClick={() => setStep(i)}
                className={cn(
                  "flex-1 py-3 flex flex-col items-center gap-1 transition-colors relative",
                  step === i ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <s.icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold uppercase tracking-tighter hidden sm:block">{s.title}</span>
                {step === i && (
                  <motion.div 
                    layoutId="activeStep"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-900 dark:bg-zinc-100"
                  />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-8">
            {/* Step Navigation Header */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <button 
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <div className="flex gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={cn(
                      "w-2 h-2 rounded-full transition-all",
                      step === i
                        ? "bg-zinc-900 dark:bg-zinc-100 w-5"
                        : "bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600"
                    )}
                  />
                ))}
              </div>
              <button 
                onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
                disabled={step === steps.length - 1}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 disabled:cursor-default transition-colors"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                {step === 0 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold dark:text-zinc-100">Personal Details</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Full Name</label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            name="fullName"
                            value={data.personalDetails.fullName}
                            onChange={handlePersonalChange}
                            placeholder="John Smith"
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Email Address</label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            name="email"
                            type="email"
                            value={data.personalDetails.email}
                            onChange={handlePersonalChange}
                            placeholder="john.smith@example.com"
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Phone Number</label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            name="phone"
                            value={data.personalDetails.phone}
                            onChange={handlePersonalChange}
                            placeholder="+44 7700 900000"
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Country</label>
                        <div className="relative">
                          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <select
                            value={data.personalDetails.country || ''}
                            onChange={(e) => setData(prev => ({ ...prev, personalDetails: { ...prev.personalDetails, country: e.target.value } }))}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                          >
                            <option value="">Select country</option>
                            {COUNTRY_NAMES.map(c => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Location</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            list="uk-locations"
                            name="location"
                            value={data.personalDetails.location}
                            onChange={handlePersonalChange}
                            placeholder={(data.personalDetails.country && data.personalDetails.country !== 'United Kingdom') ? 'Search cities...' : 'Search UK locations...'}
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                          />
                          <datalist id="uk-locations">
                            {(!data.personalDetails.country || data.personalDetails.country === 'United Kingdom')
                              ? UK_LOCATIONS.map(loc => <option key={loc} value={loc} />)
                              : getCitiesForCountry(data.personalDetails.country).map(city => <option key={city} value={city} />)
                            }
                          </datalist>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">LinkedIn URL</label>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input 
                            name="linkedin"
                            value={data.personalDetails.linkedin}
                            onChange={handlePersonalChange}
                            placeholder="linkedin.com/in/johnsmith"
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                          />
                        </div>
                      </div>
                      <div className="space-y-3 sm:col-span-2">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Portfolios / Websites</label>
                          <button
                            onClick={addPortfolio}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
                          >
                            <Plus className="w-3 h-3" /> Add Website
                          </button>
                        </div>
                        {(data.personalDetails.portfolios ?? []).length === 0 ? (
                          <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No websites added yet.</p>
                        ) : (
                        <div className="space-y-2">
                          {(data.personalDetails.portfolios ?? []).map((url, i) => (
                            <div key={i} className="flex items-center gap-2 group">
                              <div className="relative flex-1">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                  value={url}
                                  onChange={e => handlePortfolioChange(i, e.target.value)}
                                  placeholder={`Website ${i + 1} (e.g. johnsmith.com)`}
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                              <button
                                onClick={() => removePortfolio(i)}
                                className="p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                        )}
                      </div>
                    </div>

                    {/* Useful Links */}
                    <div className="space-y-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Useful Links</label>
                        <button
                          onClick={addUsefulLink}
                          className="flex items-center gap-1 px-2 py-1 text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add Link
                        </button>
                      </div>
                      {(data.personalDetails.usefulLinks ?? []).length === 0 ? (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">No links added yet. Add links to GitHub, Stack Overflow, Dribbble, etc.</p>
                      ) : (
                        <div className="space-y-2">
                          {(data.personalDetails.usefulLinks ?? []).map((link, i) => (
                            <div key={i} className="flex items-center gap-2 group">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
                                <input
                                  value={link.label}
                                  onChange={e => updateUsefulLink(i, 'label', e.target.value)}
                                  placeholder="Label (e.g. GitHub)"
                                  className="sm:col-span-2 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                                <input
                                  value={link.url}
                                  onChange={e => updateUsefulLink(i, 'url', e.target.value)}
                                  placeholder="URL (e.g. github.com/johnsmith)"
                                  className="sm:col-span-3 px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                              <button
                                onClick={() => removeUsefulLink(i)}
                                className="p-1.5 text-zinc-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold dark:text-zinc-100">Personal Profile</h2>
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">
                      A strong personal profile is the first thing recruiters read. Write 3–5 sentences covering who you are, what you've achieved, and what you're looking for.
                    </p>
                    <textarea 
                      value={data.professionalSummary}
                      onChange={(e) => setData(prev => ({ ...prev, professionalSummary: e.target.value }))}
                      placeholder={`[Role] with [X+] years of experience in [industry/domain].\nExpert in [skill 1], [skill 2], and [skill 3], having [key achievement / metric].\nSeeking to [career goal / value proposition].`}
                      className="w-full h-52 p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all resize-none"
                    />
                    <div className="flex items-center justify-between text-xs">
                      <span className={
                        data.professionalSummary.trim() ? (
                          data.professionalSummary.trim().split(/\s+/).length < 20
                            ? 'text-amber-500 font-medium'
                            : data.professionalSummary.trim().split(/\s+/).length > 80
                            ? 'text-amber-500 font-medium'
                            : 'text-green-600 dark:text-green-400 font-medium'
                        ) : 'text-zinc-400 dark:text-zinc-500'
                      }>
                        {data.professionalSummary.trim() ? `${data.professionalSummary.trim().split(/\s+/).length} words (aim for 30–60)` : '0 words'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowSummaryGuide(!showSummaryGuide)}
                        className="flex items-center gap-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors"
                      >
                        {showSummaryGuide ? 'Hide' : 'Show'} writing guide
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showSummaryGuide ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                    {showSummaryGuide && (
                      <div className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl p-5 space-y-5 text-sm">
                        <div>
                          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Suggested structure</h4>
                          <ol className="space-y-2 text-zinc-600 dark:text-zinc-400 list-decimal list-inside">
                            <li><strong className="text-zinc-800 dark:text-zinc-200">Who you are</strong> — Role title, years of experience, industry</li>
                            <li><strong className="text-zinc-800 dark:text-zinc-200">What you bring</strong> — 2–3 key skills or specialities with a notable achievement</li>
                            <li><strong className="text-zinc-800 dark:text-zinc-200">What you want</strong> — Career goal or value proposition for the next role</li>
                          </ol>
                        </div>
                        <div>
                          <h4 className="font-semibold text-zinc-800 dark:text-zinc-200 mb-2">Examples by role</h4>
                          <div className="space-y-3">
                            <details className="group">
                              <summary className="cursor-pointer text-zinc-700 dark:text-zinc-300 font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Project Manager</summary>
                              <p className="mt-2 pl-4 text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-300 dark:border-zinc-600 italic leading-relaxed">
                                "Results-driven Project Manager with 8+ years of experience delivering enterprise software solutions across finance and healthcare sectors. Expert in Agile and Waterfall methodologies, having led cross-functional teams of 15+ to deliver £2M+ programmes on time and under budget. Seeking to leverage deep project leadership and stakeholder management skills at a forward-thinking organisation."
                              </p>
                            </details>
                            <details className="group">
                              <summary className="cursor-pointer text-zinc-700 dark:text-zinc-300 font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Software Engineer</summary>
                              <p className="mt-2 pl-4 text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-300 dark:border-zinc-600 italic leading-relaxed">
                                "Full-stack Software Engineer with 6 years of experience building scalable web applications using React, Node.js, and AWS. Proven track record of designing systems serving 500k+ daily active users while reducing infrastructure costs by 40%. Passionate about clean architecture, developer experience, and mentoring junior engineers."
                              </p>
                            </details>
                            <details className="group">
                              <summary className="cursor-pointer text-zinc-700 dark:text-zinc-300 font-medium hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Marketing Manager</summary>
                              <p className="mt-2 pl-4 text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-300 dark:border-zinc-600 italic leading-relaxed">
                                "Creative Marketing Manager with 7+ years of experience driving brand growth and demand generation for B2B SaaS companies. Specialist in content marketing, SEO strategy, and paid acquisition — delivering 3x pipeline growth and 150% YoY organic traffic increase. Adept at building and leading high-performing marketing teams in fast-paced scale-up environments."
                              </p>
                            </details>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold dark:text-zinc-100">Work Experience</h2>
                      <button 
                        onClick={addExperience}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Role
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {data.experience.map((exp, idx) => (
                        <div key={`row-experience-${idx}`} className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-4 relative group">
                          <button 
                            onClick={() => removeExperience(exp.id)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Company</label>
                              <div className="relative">
                                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input 
                                  value={exp.company}
                                  onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                  placeholder="e.g. Balfour Beatty"
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Role</label>
                              <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input 
                                  value={exp.role}
                                  onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                                  placeholder="e.g. Senior Project Manager"
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Start Date</label>
                              <div className="relative">
                                <input 
                                  value={exp.startDate}
                                  onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                  placeholder="MM/YYYY"
                                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">End Date</label>
                              <div className="relative">
                                <input 
                                  value={exp.endDate}
                                  disabled={exp.isCurrent}
                                  onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                  placeholder={exp.isCurrent ? 'Present' : 'MM/YYYY'}
                                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                              </div>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Country</label>
                            <div className="relative">
                              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <select
                                value={exp.country || ''}
                                onChange={(e) => updateExperience(exp.id, 'country', e.target.value)}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                              >
                                <option value="">Select country</option>
                                {COUNTRY_NAMES.map(c => (
                                  <option key={c} value={c}>{c}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Location</label>
                            <div className="relative">
                              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                              <input
                                list="exp-uk-locations"
                                value={exp.location}
                                onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                                placeholder={exp.country && exp.country !== 'United Kingdom' ? 'Search cities...' : 'London, UK'}
                                className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                              />
                              <datalist id="exp-uk-locations">
                                {(!exp.country || exp.country === 'United Kingdom')
                                  ? UK_LOCATIONS.map(loc => <option key={loc} value={loc} />)
                                  : getCitiesForCountry(exp.country).map(city => <option key={city} value={city} />)
                                }
                              </datalist>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              checked={exp.isCurrent}
                              onChange={(e) => updateExperience(exp.id, 'isCurrent', e.target.checked)}
                              id={`current-${exp.id}`}
                              className="rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                            />
                            <label htmlFor={`current-${exp.id}`} className="text-sm text-zinc-600 dark:text-zinc-400">I currently work here</label>
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Key Achievements</label>
                            <div className="relative">
                              <FileText className="absolute left-3 top-3 w-4 h-4 text-zinc-400" />
                              <textarea 
                                value={exp.achievements}
                                onChange={(e) => updateExperience(exp.id, 'achievements', e.target.value)}
                                placeholder="e.g. Led delivery of a £4.2M railway upgrade programme, completed 3 weeks ahead of schedule"
                                className="w-full pl-10 pr-4 py-2 h-24 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all resize-none"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                      {data.experience.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-xl">
                          <Briefcase className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                          <p className="text-zinc-500 dark:text-zinc-400">No work experience added yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold dark:text-zinc-100">Education</h2>
                      <button 
                        onClick={addEducation}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 text-white rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> Add Education
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {data.education.map((edu, idx) => (
                        <div key={`row-education-${idx}`} className="p-6 bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 rounded-xl space-y-4 relative group">
                          <button 
                            onClick={() => removeEducation(edu.id)}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Institution</label>
                              <div className="relative">
                                <GraduationCap className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input 
                                  value={edu.institution}
                                  onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                  placeholder="e.g. University of Manchester"
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Degree/Qualification</label>
                              <div className="relative">
                                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input 
                                  value={edu.degree}
                                  onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                  placeholder="e.g. BEng Civil Engineering"
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Country</label>
                              <div className="relative">
                                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <select
                                  value={edu.country || ''}
                                  onChange={(e) => updateEducation(edu.id, 'country', e.target.value)}
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                >
                                  <option value="">Select country</option>
                                  {COUNTRY_NAMES.map(c => (
                                    <option key={c} value={c}>{c}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Location</label>
                              <div className="relative">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input
                                  list="edu-uk-locations"
                                  value={edu.location}
                                  onChange={(e) => updateEducation(edu.id, 'location', e.target.value)}
                                  placeholder={edu.country && edu.country !== 'United Kingdom' ? 'Search cities...' : 'Manchester, UK'}
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                                <datalist id="edu-uk-locations">
                                  {(!edu.country || edu.country === 'United Kingdom')
                                    ? UK_LOCATIONS.map(loc => <option key={loc} value={loc} />)
                                    : getCitiesForCountry(edu.country).map(city => <option key={city} value={city} />)
                                  }
                                </datalist>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Graduation Date</label>
                              <div className="relative">
                                <input 
                                  value={edu.graduationDate}
                                  onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                                  placeholder="YYYY"
                                  className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Grade (Optional)</label>
                              <div className="relative">
                                <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                                <input 
                                  value={edu.grade}
                                  onChange={(e) => updateEducation(edu.id, 'grade', e.target.value)}
                                  placeholder="e.g. 2:1, Merit"
                                  className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {data.education.length === 0 && (
                        <div className="text-center py-12 border-2 border-dashed border-zinc-200 rounded-xl">
                          <GraduationCap className="w-12 h-12 text-zinc-300 mx-auto mb-4" />
                          <p className="text-zinc-500 dark:text-zinc-400">No education history added yet.</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-6">
                    <h2 className="text-2xl font-bold dark:text-zinc-100">Skills</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Search and select your key skills from the list, or type custom ones.</p>

                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                        <input
                          value={skillInput}
                          onChange={e => handleSkillInputChange(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput); setSkillInput(''); setFilteredSkills(GENERAL_SKILLS); }
                            if (e.key === ',' || e.key === 'Tab') { e.preventDefault(); addSkill(skillInput.replace(/,/g, '')); setSkillInput(''); setFilteredSkills(GENERAL_SKILLS); }
                          }}
                          placeholder="Type a skill (e.g. Python, Leadership, First Aid)"
                          className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                        />
                        {filteredSkills.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">{skillInput.trim() ? 'Suggestions' : 'General Skills'}</div>
                            {filteredSkills.map(s => {
                              const currentSkills = data.skills ? data.skills.split(',').map(x => x.trim()) : [];
                              const alreadyAdded = currentSkills.includes(s);
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => { if (!alreadyAdded) { addSkill(s); } setSkillInput(''); setFilteredSkills(GENERAL_SKILLS); }}
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                    alreadyAdded
                                      ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                  }`}
                                >
                                  <span>{s}</span>
                                  {alreadyAdded ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 text-zinc-300 group-hover:text-zinc-600" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => { addSkill(skillInput); setSkillInput(''); setFilteredSkills(GENERAL_SKILLS); }}
                        disabled={!skillInput.trim()}
                        className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 text-white disabled:text-zinc-400 dark:disabled:text-zinc-600 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" /> Add
                      </button>
                    </div>

                    {/* Skill Chips with count */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Added Skills</span>
                        {data.skills && <span className="text-xs text-zinc-400 dark:text-zinc-500">{data.skills.split(',').filter(Boolean).length} selected</span>}
                      </div>
                      {data.skills ? (
                        <div className="flex flex-wrap gap-2">
                          {data.skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                            <span
                              key={skill}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-full text-sm font-medium group"
                            >
                              {skill}
                              <button
                                type="button"
                                onClick={() => removeSkill(skill)}
                                className="p-0.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-colors"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-xl">
                          <Wrench className="w-8 h-8 text-zinc-300 dark:text-zinc-600 mx-auto mb-2" />
                          <p className="text-sm text-zinc-400 dark:text-zinc-500">No skills added yet</p>
                          <p className="text-xs text-zinc-300 dark:text-zinc-600 mt-1">Type above and press <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-mono">Enter</kbd> or click <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-[10px] font-mono">Add</kbd></p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {step === 5 && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-2xl font-bold dark:text-zinc-100">Target Job Description</h2>
                    </div>
                    
                    <div className="relative">
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">Paste the job description you are applying for. This helps ensure your CV matches the specific requirements.</p>
                      <textarea 
                        value={data.jobDescription}
                        onChange={(e) => setData(prev => ({ ...prev, jobDescription: e.target.value }))}
                        placeholder="Paste job description here..."
                        className="w-full h-40 p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Choose Template</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {TEMPLATES.map(t => (
                          <button
                            key={t.id}
                            onClick={() => setTemplateId(t.id)}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${
                              activeTemplateId === t.id
                                ? 'border-zinc-900 dark:border-zinc-100 bg-zinc-50 dark:bg-zinc-800'
                                : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
                            }`}
                          >
                            <div
                              className="w-full h-8 rounded-md mb-2 flex items-center justify-center text-[8px] font-bold text-white"
                              style={{ backgroundColor: t.accentColor }}
                            >
                              CV
                            </div>
                            <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">{t.name}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">{t.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Transferable Skills Focus (Optional)</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Choose skills from the list or type your own to highlight relevant experience.</p>
                      <div className="relative">
                        <input
                          value={transferableSkillInput}
                          onChange={e => handleTransferableSkillInput(e.target.value)}
                          onKeyDown={e => {
                            if ((e.key === 'Enter' || e.key === 'Tab') && transferableFilteredSkills.length > 0) {
                              e.preventDefault();
                              const skill = transferableFilteredSkills[0];
                              const current = data.transferableSkillsFocus || '';
                              const alreadyIncluded = current.toLowerCase().includes(skill.toLowerCase());
                              if (!alreadyIncluded) {
                                setData(prev => ({ ...prev, transferableSkillsFocus: current ? `${current}, ${skill}` : skill }));
                              }
                              setTransferableSkillInput('');
                              setTransferableFilteredSkills(GENERAL_SKILLS);
                            }
                          }}
                          placeholder="Search skills to highlight..."
                          className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                        />
                        {transferableFilteredSkills.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">{transferableSkillInput.trim() ? 'Suggestions' : 'General Skills'}</div>
                            {transferableFilteredSkills.map(s => {
                              const current = data.transferableSkillsFocus || '';
                              const alreadyAdded = current.toLowerCase().includes(s.toLowerCase());
                              return (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => {
                                    if (!alreadyAdded) {
                                      setData(prev => ({ ...prev, transferableSkillsFocus: current ? `${current}, ${s}` : s }));
                                    }
                                    setTransferableSkillInput('');
                                    setTransferableFilteredSkills(GENERAL_SKILLS);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center justify-between ${
                                    alreadyAdded
                                      ? 'text-zinc-300 dark:text-zinc-600 cursor-not-allowed'
                                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                                  }`}
                                >
                                  <span>{s}</span>
                                  {alreadyAdded ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                                  ) : (
                                    <Plus className="w-3.5 h-3.5 text-zinc-300" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <textarea 
                        value={data.transferableSkillsFocus}
                        onChange={(e) => setData(prev => ({ ...prev, transferableSkillsFocus: e.target.value }))}
                        placeholder="e.g. Highlight my stakeholder management skills developed in my previous customer-facing roles..."
                        disabled={!isPro}
                        className="w-full h-24 p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all resize-none disabled:bg-zinc-50/50 dark:disabled:bg-zinc-800/50"
                      />
                      {data.personalDetails.country && (() => {
                        const tips = getCountrySkillTips(data.personalDetails.country!);
                        if (tips.length === 0) return null;
                        return (
                          <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                            <div className="flex items-start gap-2">
                              <Globe className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                                  {data.personalDetails.country}-Specific Transferable Skills
                                </p>
                                <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
                                  Employers in <strong>{data.personalDetails.country}</strong> often value: {tips.join(', ')}.
                                </p>
                                <p className="text-[10px] text-amber-600 dark:text-amber-500 mt-1">
                                  These are especially relevant if you're relocating or new to the {data.personalDetails.country} market.
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {'Generate CV'}
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Footer */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
            <button 
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div key={`step-indicator-dot-${i}`} className={cn("w-1.5 h-1.5 rounded-full transition-colors", step === i ? "bg-zinc-900 dark:bg-zinc-100" : "bg-zinc-200 dark:bg-zinc-700")} />
              ))}
            </div>
            <button 
              onClick={() => setStep(s => Math.min(steps.length - 1, s + 1))}
              disabled={step === steps.length - 1}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg disabled:opacity-30 transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Preview */}
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/50">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">Live Preview</span>
              {!isPro && (
                <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-tighter">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  {3 - previewCount} Previews left this month
                </div>
              )}
              {(generatedContent || hasFormData) && (
                <button 
                  onClick={copyToClipboard}
                  className="ml-2 p-1 text-zinc-400 hover:text-zinc-900 transition-colors"
                  title="Copy to clipboard"
                >
                  <FileText className="w-3 h-3" />
                </button>
              )}
            </div>
            {(generatedContent || hasFormData) && (
              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-tighter">
                Curriculum Vitae
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-12 bg-zinc-100/50 dark:bg-zinc-800/50">
            <div className="shadow-xl mx-auto w-full max-w-full sm:max-w-[210mm]">
              {!isPro && (
                <div className="bg-[#FEF3C7] dark:bg-[#451a03] text-[#92400E] dark:text-[#fbbf24] py-2 px-4 text-[10px] font-bold text-center border-b border-[#FDE68A] dark:border-[#78350f] uppercase tracking-wider">
                   Free version — Upgrade to Pro to download your CV as a PDF.
                </div>
              )}
              <div 
                ref={previewRef}
                className="bg-white w-full min-h-[297mm] p-[20mm] cv-preview select-none"
                onCopy={(e) => e.preventDefault()}
                onCut={(e) => e.preventDefault()}
                onContextMenu={(e) => e.preventDefault()}
              >
              {isGenerating ? (
                <div className="h-full flex flex-col items-center justify-center py-40 space-y-4">
                  <Loader2 className="w-12 h-12 text-[#111827] animate-spin" />
                  <p className="text-[#6b7280] dark:text-zinc-400 font-medium animate-pulse">Generating your professional CV...</p>
                </div>
              ) : generatedContent ? (
                blurred ? (
                  <div className="h-full flex flex-col items-center justify-center py-40 text-center space-y-4">
                    <Lock className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Preview hidden — switch back to view</p>
                  </div>
                ) : (
                <div className="h-full flex flex-col">
                  {showDonationToast && (
                    <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border-b border-amber-200 dark:border-amber-800 shrink-0">
                      <p className="text-xs font-medium text-amber-800 dark:text-amber-300">
                        Loved your CV? <button onClick={() => handleCheckout(STRIPE_PRICE_DONATION, "donation", "3")} className="underline font-bold hover:text-amber-900 dark:hover:text-amber-200">Support Merit</button> to keep it free for everyone
                      </p>
                      <button onClick={() => setShowDonationToast(false)} className="p-1 rounded-md hover:bg-amber-200/50 dark:hover:bg-amber-800/50 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      </button>
                    </div>
                  )}
                  <div className={`markdown-body ${activeTemplateId} flex-1 overflow-y-auto`}>
                    <Markdown>{generatedContent}</Markdown>
                  </div>
                </div>
                )
              ) : hasFormData ? (
                blurred ? (
                  <div className="h-full flex flex-col items-center justify-center py-40 text-center space-y-4">
                    <Lock className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Preview hidden — switch back to view</p>
                  </div>
                ) : (
                <div className={`markdown-body ${activeTemplateId}`}>
                  <Markdown>{livePreview}</Markdown>
                </div>
                )
              ) : (
                <div className="h-full flex flex-col items-center justify-center py-40 text-center space-y-4">
                  <div className="w-16 h-16 bg-[#f4f4f5] rounded-full flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-[#d4d4d8]" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#111827] dark:text-zinc-100">No content yet</h3>
                    <p className="text-sm text-[#6b7280] dark:text-zinc-400 max-w-xs mx-auto">Fill in your details and target job description to generate your professional CV.</p>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col items-center md:items-start gap-1">
            <p className="text-sm text-zinc-500">© 2026 Merit. All rights reserved.</p>
            <p className="text-xs text-zinc-400">ZenGale Ltd · 71-75 Shelton Street, London, WC2H 9JQ · Company No. 15646884</p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-xs font-medium text-zinc-500">
            <button onClick={() => setLegalModal({ isOpen: true, type: 'privacy' })} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacy Policy</button>
            <button onClick={() => setLegalModal({ isOpen: true, type: 'terms' })} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Terms of Service</button>
            <button onClick={() => setLegalModal({ isOpen: true, type: 'contact' })} className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Contact</button>
          </div>
        </div>
      </footer>
        </motion.div>
      )}
    </AnimatePresence>

    <AuthModal 
        key="global-auth-modal"
        isOpen={isAuthModalOpen} 
        onClose={() => { setIsAuthModalOpen(false); setResetPasswordMode(false); }}
        resetPasswordMode={resetPasswordMode}
        onPasswordReset={() => setResetPasswordMode(false)}
        onSignUp={() => {
          pendingOnboardingRef.current = true;
          setCurrentView('builder');
          toast('Welcome to Merit! Edit or generate your CV right away.', 'success');
        }}
    />

    <LegalModal
      isOpen={legalModal.isOpen}
      onClose={() => setLegalModal({ ...legalModal, isOpen: false })}
      type={legalModal.type}
      onSwitchType={(type) => setLegalModal({ isOpen: true, type })}
    />

    <AnimatePresence mode="popLayout">
      {showUpgradeModal && (
        <motion.div 
          key="upgrade-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              key="upgrade-modal-content"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="relative p-8 text-center space-y-6">
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="absolute top-4 right-4 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Star className="w-8 h-8 text-amber-600 fill-current" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Pro Feature</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Unlimited CV downloads, full job description tailoring, for active job seekers.
                </p>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => {
                    setShowUpgradeModal(false);
                    handleCheckout(STRIPE_PRICE_ANNUAL, 'annual');
                  }}
                  className="w-full py-4 bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-white rounded-xl font-bold shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-5 h-5" />
                  Upgrade to Pro — £79.99/yr
                </button>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setShowUpgradeModal(false);
                      handleCheckout(STRIPE_PRICE_MONTHLY, 'monthly');
                    }}
                    className="flex-1 py-3 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl font-medium transition-all text-sm"
                  >
                    £9.99/month
                  </button>
                  <button 
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1 py-3 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 font-medium transition-all text-sm"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
            
            <div className="bg-zinc-50 dark:bg-zinc-800/50 p-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-center gap-4">
              <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> No Watermark
              </div>
              <div className="flex items-center gap-1 text-[10px] font-bold text-zinc-400 uppercase tracking-widest">
                <CheckCircle2 className="w-3 h-3 text-green-500" /> Unlimited Downloads
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  </>
  </ErrorBoundary>
);
}
