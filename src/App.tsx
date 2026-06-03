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
  Mail,
  Phone,
  MapPin,
  Linkedin,
  Globe,
  Loader2,
  Upload,
  Lock,
  FolderOpen, 
  Edit3, 
  X, 
  Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import jsPDF, { GState } from 'jspdf';
import html2canvas from 'html2canvas';
import { CVData, WorkExperience, Education, SavedCV } from './types';
import { generateCareerContent, parseExistingCV } from './services/geminiService';
import { cn } from './lib/utils';
import LandingPage from './components/LandingPage';
import { AuthModal } from './components/AuthModal';
import { CookieConsent } from './components/CookieConsent';
import { Header } from './components/Header';
import { ErrorBoundary } from './components/ErrorBoundary';
import { supabase, getCurrentMonthString, handleSupabaseError, OperationType, isSupabaseConfigValid, syncUserDocument, missingConfigVars } from './supabase';
import { UK_LOCATIONS } from './data/uk-locations';
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
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export default function App() {
  const [currentView, setCurrentView] = useState<'home' | 'builder'>('home');
  const [user, setUser] = useState<any>(null);
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [resetPasswordMode, setResetPasswordMode] = useState(false);
  const [cvs, setCVs] = useState<SavedCV[]>(() => loadCVs());
  const [activeCVId, setActiveCVId] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
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
  const previewRef = useRef<HTMLDivElement>(null);
  const [blurred, setBlurred] = useState(false);

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
  const data: CVData = activeCV?.data ?? INITIAL_DATA;
  const generatedContent: string | null = activeCV?.generatedContent ?? null;

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
    if (d.professionalSummary) sections.push(`## Professional Summary\n\n${d.professionalSummary}`);
    if (d.experience?.length) {
      sections.push('## Work Experience');
      d.experience.forEach(exp => {
        const dates = `${formatDate(exp.startDate)} — ${exp.isCurrent ? 'Present' : formatDate(exp.endDate)}`;
        sections.push(`### ${exp.role} at ${exp.company}\n*${exp.location} | ${dates}*`);
        if (exp.achievements) sections.push(exp.achievements.split('\n').map(a => `- ${a}`).join('\n'));
      });
    }
    if (d.education?.length) {
      sections.push('## Education');
      d.education.forEach(edu => {
        const parts = [`**${edu.degree}** — ${edu.institution}`];
        if (edu.location) parts.push(`*${edu.location}*`);
        if (edu.graduationDate) parts.push(`*${formatDate(edu.graduationDate)}*`);
        if (edu.grade) parts.push(`*${edu.grade}*`);
        sections.push(parts.join('  \n'));
      });
    }
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

  function switchCV(id: string) {
    setActiveCVId(id);
    setStep(0);
    setCVMenuOpen(false);
  }

  function handleCreateCV(role: string) {
    const trimmed = role.trim();
    if (!trimmed) return;
    if (cvs.length >= 4) return;
    const newCV = createSavedCV(trimmed);
    const next = [...cvs, newCV];
    setCVs(next);
    saveCVs(next);
    setActiveCVId(newCV.id);
    setShowNewCVInput(false);
    setNewCVRole('');
    setStep(0);
    setGeneratedContent(null);
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

  // Auto-select first CV if none active
  useEffect(() => {
    if (!activeCVId && cvs.length > 0) {
      setActiveCVId(cvs[0].id);
    }
  }, [cvs, activeCVId]);

  // Auto-create first CV
  useEffect(() => {
    if (cvs.length === 0) {
      const first = createSavedCV('General');
      setCVs([first]);
      saveCVs([first]);
      setActiveCVId(first.id);
    }
  }, []);

  // Auth: handle PKCE exchange, session recovery, and auth state changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
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
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) setUser(user);
        }).catch((err) => {
          console.error('Failed to get user after code exchange:', err);
        });
      });
    } else if (authError) {
      console.error('OAuth error:', authError);
      window.history.replaceState({}, '', window.location.pathname);
    } else {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) setUser(user);
      }).catch((err) => {
        console.error('Failed to get user on page load:', err);
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
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        await syncUserDocument(currentUser);
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
    try {
      const { priceId, planType } = JSON.parse(pending);
      handleCheckout(priceId, planType);
    } catch {
      pendingCheckoutRef.current = false;
    }
  }, [user]);

  // Supabase User Data Listener (for isPro status)
  useEffect(() => {
    if (!user) {
      setIsPro(false);
      return;
    }

    // Admin account gets full Pro access
    if (user.email === 'rjcosta@gmail.com') {
      setIsPro(true);
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

    fetchUserData();

    // Poll for changes every 60 seconds as a lightweight realtime alternative
    const interval = setInterval(fetchUserData, 60000);
    return () => clearInterval(interval);
  }, [user]);

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
    { id: 'summary', title: 'Professional Summary', icon: FileText },
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

    if (!isPro) {
      // Check for monthly reset using string format YYYY-MM
      const currentMonth = getCurrentMonthString();
      let currentCount = previewCount;
      let shouldReset = false;

      if (lastPreviewReset !== currentMonth) {
        shouldReset = true;
        currentCount = 0;
      }

      if (currentCount >= 3) {
        setShowUpgradeModal(true);
        return;
      }

      // Update Supabase usage
      try {
        const { error } = await supabase
          .from('users')
          .update({
            preview_count: currentCount + 1,
            last_preview_reset: currentMonth
          })
          .eq('uid', user.id);

        if (error) {
          console.error('Failed to update preview count:', error);
          handleSupabaseError(error, OperationType.WRITE, `users/${user.id}`);
        } else {
          setPreviewCount(currentCount + 1);
          setLastPreviewReset(currentMonth);
        }
      } catch (err: any) {
        console.error('Failed to update preview count:', err);
      }
    }

    setIsGenerating(true);
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Generation timed out after 60 seconds. Please try again.')), 60000);
    });

    try {
      // Race the generation against the timeout
      const content = await Promise.race([
        generateCareerContent(data, 'cv', isPro),
        timeoutPromise
      ]) as string;

      if (!content) throw new Error('No content received');
      setGeneratedContent(content);
    } catch (error: any) {
      console.error('Generation failed:', error);
      const message = error?.message || 'Failed to generate content. Please try again.';
      alert(`Error: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const parsedData = await parseExistingCV(base64, file.type);
      
      if (parsedData && Object.keys(parsedData).length > 0) {
        setData(prev => ({
          ...prev,
          ...parsedData,
          personalDetails: {
            ...prev.personalDetails,
            ...(parsedData.personalDetails || {})
          },
          experience: (parsedData.experience || []).map((exp: any) => ({
            ...exp,
            id: Math.random().toString(36).substring(2, 11)
          })),
          education: (parsedData.education || []).map((edu: any) => ({
            ...edu,
            id: Math.random().toString(36).substring(2, 11)
          }))
        }));
        alert('CV parsed successfully! Please review the fields.');
      } else {
        alert('Could not extract data from this file. Please try a different file or fill manually.');
      }
    } catch (error) {
      console.error('Parsing failed:', error);
      alert('Failed to parse CV. Please try again or fill manually.');
    } finally {
      setIsParsing(false);
      // Reset input so same file can be uploaded again
      e.target.value = '';
    }
  };

  const downloadPDF = async () => {
    if (!previewRef.current) return;
    if (!isPro) { setShowUpgradeModal(true); return; }
    const content = generatedContent || livePreview;
    if (!content) return;
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    pdf.setProperties({
      title: 'Merit Generated CV',
      subject: `ATS-Optimised CV - Generated on ${new Date().toLocaleDateString('en-GB')}`,
      author: 'Zenstack',
      keywords: 'Zenstack, ATS-Optimised',
      creator: 'Merit',
      producer: isPro ? 'Merit Pro' : 'Merit Free Tier'
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPos = margin;

    // Helper to add text with wrapping
    const addWrappedText = (text: string, fontSize: number, fontStyle: string = 'normal', marginBottom: number = 5) => {
      pdf.setFont('helvetica', fontStyle);
      pdf.setFontSize(fontSize);
      const lines = pdf.splitTextToSize(text, contentWidth);
      
      if (yPos + (lines.length * (fontSize * 0.32)) > pdf.internal.pageSize.getHeight() - margin) {
        pdf.addPage();
        yPos = margin;
        if (!isPro) addWatermark(pdf);
      }

      pdf.text(lines, margin, yPos);
      yPos += (lines.length * (fontSize * 0.32)) + marginBottom;
    };

    const addWatermark = (doc: jsPDF) => {
      const pWidth = doc.internal.pageSize.getWidth();
      const pHeight = doc.internal.pageSize.getHeight();
      
      doc.saveGraphicsState();
      doc.setFillColor(243, 244, 246);
      doc.rect(0, pHeight - 15, pWidth, 15, 'F');
      
      doc.setTextColor(107, 114, 128);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.text('⚡ Created with Merit Free — Upgrade to Pro to remove this watermark', pWidth / 2, pHeight - 7, { align: 'center' });
      
      doc.setGState(new GState({ opacity: 0.06 }));
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(60);
      doc.setFont('helvetica', 'bold');
      doc.text('MERIT FREE', pWidth / 2, pHeight / 2, { align: 'center', angle: 45 });
      doc.restoreGraphicsState();
    };

    // Simple Markdown Parser for jsPDF
    const lines = content.split('\n');

    if (!isPro) addWatermark(pdf);

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) {
        yPos += 2;
        return;
      }

      if (trimmed.startsWith('# ')) {
        yPos += 3;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(22);
        const name = trimmed.replace('# ', '');
        pdf.text(name, pageWidth / 2, yPos, { align: 'center' });
        yPos += 10;
        pdf.setLineWidth(0.5);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 6;
      } else if (trimmed.startsWith('## ')) {
        yPos += 6;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        const heading = trimmed.replace('## ', '');
        pdf.text(heading, margin, yPos);
        yPos += 1;
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 5;
      } else if (trimmed.startsWith('### ')) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        const subHeading = trimmed.replace('### ', '');
        pdf.text(subHeading, margin, yPos);
        yPos += 5;
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        const bulletText = trimmed.substring(2);
        const bulletLines = pdf.splitTextToSize(bulletText, contentWidth - 5);

        if (yPos + (bulletLines.length * 3.5) > pdf.internal.pageSize.getHeight() - margin) {
          pdf.addPage();
          yPos = margin;
          if (!isPro) addWatermark(pdf);
        }

        pdf.text('•', margin, yPos);
        pdf.text(bulletLines, margin + 5, yPos);
        yPos += (bulletLines.length * 3.5) + 1.5;
      } else {
        const isContactInfo = yPos < 50 && trimmed.includes('|');
        if (isContactInfo) {
          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(100, 100, 100);
          pdf.text(trimmed, pageWidth / 2, yPos, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
          yPos += 8;
        } else {
          addWrappedText(trimmed, 9, 'normal', 3);
        }
      }
    });

    pdf.save(`${data.personalDetails.fullName.replace(/\s+/g, '_')}_CV.pdf`);
  };

  const clearAll = () => {
    if (window.confirm('Are you sure you want to clear all data? This cannot be undone.')) {
      setData(INITIAL_DATA);
      setGeneratedContent(null);
      setStep(0);
    }
  };

  const copyToClipboard = async () => {
    const text = generatedContent || livePreview;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      alert('Copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
      alert('Failed to copy to clipboard.');
    }
  };

  const downloadDOC = () => {
    if (!isPro) { setShowUpgradeModal(true); return; }
    const content = generatedContent || livePreview;
    if (!content) return;
    
    // Very basic markdown to simple HTML conversion for better Word compatibility
    const htmlContent = content
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^\* (.*$)/gm, '<li>$1</li>')
      .replace(/^- (.*$)/gm, '<li>$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>');

    const fullHtml = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head><meta charset='utf-8'></head>
      <body>
        <style>
          body { font-family: Calibri, Arial, sans-serif; line-height: 1.5; }
          h1 { color: #111827; font-size: 24pt; border-bottom: 1pt solid #e5e7eb; }
          h2 { color: #111827; font-size: 18pt; margin-top: 20pt; }
          h3 { color: #111827; font-size: 14pt; margin-top: 15pt; }
          li { margin-bottom: 5pt; }
        </style>
        ${htmlContent}
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff', fullHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.personalDetails.fullName.replace(/\s+/g, '_')}_CV.doc`;
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
    if (!token) { alert('Session expired. Please sign in again.'); return; }
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
        alert(data.error || 'Could not open subscription management. Please try again.');
      }
    } catch (err) {
      console.error('Portal error:', err);
      alert('Something went wrong. Please try again later.');
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

  const handleCheckout = async (priceId: string, planType: string) => {
    if (!isStripeConfigured) {
      alert("Payments coming soon - please check back shortly!");
      return;
    }

    if (!user) {
      sessionStorage.setItem('merit-pending-checkout', JSON.stringify({ priceId, planType }));
      setIsAuthModalOpen(true);
      return;
    }

    const token = await getAuthToken();
    if (!token) { alert('Session expired. Please sign in again.'); return; }

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
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error) {
      console.error("Checkout error:", error);
      pendingCheckoutRef.current = false;
      alert("Something went wrong with the checkout. Please try again later.");
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
                  <span className="text-[10px] text-zinc-400 font-bold">{cvs.length}/4</span>
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
                        {cvs.map(cv => (
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
                        ))}
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
                      ) : (
                        cvs.length < 4 && (
                          <div className="border-t border-zinc-100 dark:border-zinc-800 p-2">
                            <button
                              onClick={() => setShowNewCVInput(true)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                              New CV
                            </button>
                          </div>
                        )
                      )}
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
                    setData({
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
                    });
                    setStep(5);
                  }}
                  className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors uppercase tracking-widest px-2 sm:px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-full"
                >
                  Load Sample
                </button>
                <label className="text-[10px] sm:text-xs font-bold text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors uppercase tracking-widest px-2 sm:px-3 py-1 border border-zinc-200 dark:border-zinc-700 rounded-full cursor-pointer flex items-center gap-1">
                  {isParsing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                  {isParsing ? 'Parsing...' : 'Upload CV'}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    disabled={isParsing}
                  />
                </label>
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
                        <label className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Location</label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                          <input
                            list="uk-locations"
                            name="location"
                            value={data.personalDetails.location}
                            onChange={handlePersonalChange}
                            placeholder="Search UK locations..."
                            className="w-full pl-10 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all"
                          />
                          <datalist id="uk-locations">
                            {UK_LOCATIONS.map(loc => (
                              <option key={loc} value={loc} />
                            ))}
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
                    <h2 className="text-2xl font-bold dark:text-zinc-100">Professional Summary</h2>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">Briefly describe your career goals and key strengths (2-3 sentences).</p>
                    <textarea 
                      value={data.professionalSummary}
                      onChange={(e) => setData(prev => ({ ...prev, professionalSummary: e.target.value }))}
                      placeholder="e.g. Highly motivated Project Manager with 5+ years of experience in the tech sector..."
                      className="w-full h-40 p-4 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-900/10 focus:border-zinc-900 dark:focus:border-zinc-100 transition-all resize-none"
                    />
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
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Company</label>
                              <input 
                                value={exp.company}
                                onChange={(e) => updateExperience(exp.id, 'company', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Role</label>
                              <input 
                                value={exp.role}
                                onChange={(e) => updateExperience(exp.id, 'role', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Start Date</label>
                              <input 
                                value={exp.startDate}
                                onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)}
                                placeholder="MM/YYYY"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">End Date</label>
                              <input 
                                value={exp.endDate}
                                disabled={exp.isCurrent}
                                onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)}
                                placeholder={exp.isCurrent ? 'Present' : 'MM/YYYY'}
                                className="w-full px-3 py-2 bg-white border border-zinc-200 rounded-lg focus:outline-none focus:border-zinc-900 disabled:bg-zinc-100"
                              />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Location</label>
                            <input
                              list="exp-uk-locations"
                              value={exp.location}
                              onChange={(e) => updateExperience(exp.id, 'location', e.target.value)}
                              placeholder="London, UK"
                              className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                            />
                            <datalist id="exp-uk-locations">
                              {UK_LOCATIONS.map(loc => (
                                <option key={loc} value={loc} />
                              ))}
                            </datalist>
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
                          <div className="space-y-1">
                            <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Key Achievements (One per line)</label>
                            <textarea 
                              value={exp.achievements}
                              onChange={(e) => updateExperience(exp.id, 'achievements', e.target.value)}
                              placeholder="e.g. Managed a team of 10 to deliver a £500k project 2 weeks ahead of schedule..."
                              className="w-full h-24 p-3 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100 resize-none"
                            />
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
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Institution</label>
                              <input 
                                value={edu.institution}
                                onChange={(e) => updateEducation(edu.id, 'institution', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Degree/Qualification</label>
                              <input 
                                value={edu.degree}
                                onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)}
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Location</label>
                              <input
                                list="edu-uk-locations"
                                value={edu.location}
                                onChange={(e) => updateEducation(edu.id, 'location', e.target.value)}
                                placeholder="Manchester, UK"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
                              <datalist id="edu-uk-locations">
                                {UK_LOCATIONS.map(loc => (
                                  <option key={loc} value={loc} />
                                ))}
                              </datalist>
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Graduation Date</label>
                              <input 
                                value={edu.graduationDate}
                                onChange={(e) => updateEducation(edu.id, 'graduationDate', e.target.value)}
                                placeholder="YYYY"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-xs font-bold uppercase text-zinc-500 dark:text-zinc-400">Grade (Optional)</label>
                              <input 
                                value={edu.grade}
                                onChange={(e) => updateEducation(edu.id, 'grade', e.target.value)}
                                placeholder="e.g. 2:1, Merit"
                                className="w-full px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:border-zinc-900 dark:focus:border-zinc-100"
                              />
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

                      <div className="space-y-2">
                      <h3 className="text-sm font-bold text-zinc-700 dark:text-zinc-300">Transferable Skills Focus (Optional)</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Pick skills from the list or type your own. These help the AI highlight relevant experience.</p>
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
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-zinc-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {data.jobDescription ? 'Generate Tailored CV' : 'Generate General CV'}
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
                  ⚡ Free version — Upgrade to Pro to download your CV as a PDF.
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
                <div className="markdown-body">
                  <Markdown>{generatedContent}</Markdown>
                </div>
                )
              ) : hasFormData ? (
                blurred ? (
                  <div className="h-full flex flex-col items-center justify-center py-40 text-center space-y-4">
                    <Lock className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400 dark:text-zinc-500">Preview hidden — switch back to view</p>
                  </div>
                ) : (
                <div className="markdown-body">
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
                    <p className="text-sm text-[#6b7280] dark:text-zinc-400 max-w-xs mx-auto">Fill in your details and target job description to generate your professional UK CV.</p>
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
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <p className="text-sm text-zinc-500">© 2026 <a href="https://webpagemain-pink.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">Zenstack</a>. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6">
            {[
              { icon: CheckCircle2, label: 'ATS Compatible' },
            ].map((item, i) => (
              <div key={`footer-badge-${i}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
                <item.icon className="w-3 h-3 text-green-500" />
                {item.label}
              </div>
            ))}
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
            <div className="p-8 text-center space-y-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                <Star className="w-8 h-8 text-amber-600 fill-current" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">Pro Feature</h3>
                <p className="text-zinc-600 dark:text-zinc-400">
                  Tailoring your CV to job descriptions and downloading as a PDF are Pro features.
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
