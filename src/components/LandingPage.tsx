import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  User, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  Star,
  ArrowRight,
  ShieldCheck,
  Zap,
  Building2,
  Coffee,
  Heart,
  Lock,
  ScrollText,
  Home,
  Mail,
  Bell,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LegalModal, LegalType } from './LegalModal';
import { SocialShare } from './SocialShare';
import { STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_PRICE_DONATION, STRIPE_DONATION_ENABLED } from '../lib/pricing';
import { cvSamples } from '../data/cvSamples';
import { supabase } from '../supabase';

interface LandingPageProps {
  onStart: () => void;
  isPro: boolean;
  isDemo: boolean;
  user: any;
  onSignInClick: () => void;
  onSignOut: () => void;
  onManageSubscription: () => void;
  isStripeConfigured: boolean;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  handleCheckout: (priceId: string, planType: string) => Promise<void>;
}

export default function LandingPage({ 
  onStart, 
  isPro, 
  isDemo,
  user, 
  onSignInClick, 
  onSignOut, 
  onManageSubscription,
  isStripeConfigured,
  theme,
  onToggleTheme,
  handleCheckout
}: LandingPageProps) {
  const [legalModal, setLegalModal] = React.useState<{ isOpen: boolean; type: LegalType }>({
    isOpen: false,
    type: 'privacy'
  });

  const [sampleIndex, setSampleIndex] = useState(() => Math.floor(Math.random() * cvSamples.length));
  useEffect(() => {
    const id = setInterval(() => setSampleIndex(i => (i + 1) % cvSamples.length), 300000);
    return () => clearInterval(id);
  }, []);

  const [email, setEmail] = useState('');
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [emailStatus, setEmailStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [emailError, setEmailError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }
    setEmailStatus('submitting');
    try {
      const { error } = await supabase.from('email_subscribers').insert({
        email: email.toLowerCase().trim(),
        source: 'landing_page',
        marketing_consent: marketingConsent,
      });
      if (error) {
        if (error.code === '23505') {
          setEmailError('You are already subscribed!');
        } else {
          setEmailError('Something went wrong. Please try again.');
        }
        setEmailStatus('error');
        return;
      }
      setEmailStatus('success');
      setEmail('');
      setMarketingConsent(false);
    } catch {
      setEmailError('Something went wrong. Please try again.');
      setEmailStatus('error');
    }
  };

  const openLegal = (type: LegalType) => {
    setLegalModal({ isOpen: true, type });
  };

  React.useEffect(() => {
    const handler = () => openLegal('privacy');
    window.addEventListener('open-privacy', handler);
    return () => window.removeEventListener('open-privacy', handler);
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 font-sans text-[#0F172A] dark:text-zinc-100">
      {isDemo && (
        <div className="bg-emerald-500 text-white text-center py-1 text-xs font-bold tracking-wider">
          Demo Mode — All Pro features enabled for testing
        </div>
      )}
      {false && (
        <div className="bg-amber-500 text-white text-center py-2 text-sm font-bold">
          Payment system not yet configured - contact the site owner
        </div>
      )}

      {/* 2. HERO SECTION */}
      <section className="bg-[#0F172A] pt-20 pb-32 px-6 lg:px-16 overflow-hidden" aria-label="Hero">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-[1.1]">
                Land Your Next Job Faster.
              </h1>
              <p className="text-xl text-white/70 max-w-xl leading-relaxed">
                Merit helps you write, structure and optimise your CV for every role you apply for — in minutes.
              </p>
            </div>

            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <button 
                  onClick={onStart}
                  className="group flex items-center justify-center gap-3 bg-[#3B82F6] hover:bg-[#2563EB] text-white text-lg font-bold px-8 py-4 rounded-xl transition-all shadow-xl shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
                >
                  {user ? 'Build My CV' : 'Build My CV — Free'}
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleCheckout(STRIPE_PRICE_MONTHLY, 'monthly')}
                  className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-white/20 text-white/50 hover:border-white/40 hover:text-white transition-all"
                >
                  Go Pro Monthly
                </button>
                <button
                  onClick={() => handleCheckout(STRIPE_PRICE_ANNUAL, 'annual')}
                  className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-white/20 text-white/50 hover:border-white/40 hover:text-white transition-all"
                >
                  Go Pro Annual
                </button>
                <button
                  onClick={() => {
                    if (!isStripeConfigured) {
                      document.getElementById('support-section')?.scrollIntoView({ behavior: 'smooth' });
                    } else {
                      handleCheckout(STRIPE_PRICE_DONATION, "donation");
                    }
                  }}
                  className="text-[10px] uppercase tracking-widest font-bold px-3 py-1.5 rounded-full border border-amber-500/20 text-amber-500/50 hover:border-amber-500/40 hover:text-amber-500 transition-all"
                >
                  Donate
                </button>
              </div>
              <div className="flex flex-wrap gap-6">
                {[
                  'ATS-Optimised',
                  'A4 PDF',
                  'Free to try'
                ].map((badge, i) => (
                  <div key={`hero-badge-item-${i}`} className="flex items-center gap-2 text-white/60 text-sm font-medium">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    {badge}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="relative hidden lg:flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#3B82F6]/20 to-transparent rounded-full blur-3xl" />
            <div className="relative w-[420px] bg-white rounded-2xl shadow-2xl shadow-black/30 overflow-hidden transform rotate-[1.5deg] hover:rotate-0 transition-transform duration-500">
              <div className="h-2 bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6]" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={sampleIndex}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.4 }}
                  className="px-8 py-7 space-y-5"
                >
                  <div className="text-center space-y-0.5">
                    <div className="text-xl font-bold text-zinc-900 tracking-tight">{cvSamples[sampleIndex].name}</div>
                    <div className="text-[11px] text-zinc-500 font-medium">{cvSamples[sampleIndex].title}</div>
                    <div className="flex items-center justify-center gap-3 mt-1.5">
                      <span className="text-[9px] text-zinc-400">{cvSamples[sampleIndex].email}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="text-[9px] text-zinc-400">{cvSamples[sampleIndex].location}</span>
                      <span className="w-1 h-1 rounded-full bg-zinc-300" />
                      <span className="text-[9px] text-zinc-400">{cvSamples[sampleIndex].linkedin}</span>
                    </div>
                  </div>
                  <div className="h-px bg-gradient-to-r from-zinc-100 via-zinc-200 to-zinc-100" />
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">Personal Profile</div>
                    <p className="text-[10px] text-zinc-500 leading-relaxed">{cvSamples[sampleIndex].summary}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">Experience</div>
                    <div className="space-y-2">
                      {cvSamples[sampleIndex].experience.slice(0, 2).map((exp, i) => (
                        <div key={i} className={`pl-3 border-l-2 ${i === 0 ? 'border-[#3B82F6]/40' : 'border-zinc-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-semibold text-zinc-800">{exp.role}</span>
                            <span className="text-[8px] text-zinc-400">{exp.period}</span>
                          </div>
                          <span className="text-[9px] text-zinc-500">{exp.company} · {exp.location}</span>
                          {exp.achievements.length > 0 && (
                            <ul className="mt-1 space-y-0.5">
                              {exp.achievements.slice(0, 2).map((a, j) => (
                                <li key={j} className="flex items-start gap-1.5 text-[9px] text-zinc-500">
                                  <span className="text-[#3B82F6] mt-0.5">●</span>
                                  {a}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-700">Skills</div>
                    <div className="flex flex-wrap gap-1.5">
                      {cvSamples[sampleIndex].skills.map(s => (
                        <span key={s} className="px-2 py-0.5 bg-blue-50 text-[#3B82F6] rounded text-[8px] font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
          </div>
        </div>
      </div>
      </section>

      {/* 3. HOW IT WORKS SECTION */}
      <section className="py-24 px-6 lg:px-16 bg-white dark:bg-zinc-950" aria-label="How it works">
        <div className="max-w-7xl mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold tracking-tight dark:text-white">Three steps to your perfect CV</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg">Our guided process makes it easier than ever to create a professional CV that gets results.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {[
              {
                step: 1,
                icon: User,
                title: 'Fill in your details',
                body: 'Enter your experience, skills and education in our simple guided form. Takes about 2 minutes.'
              },
              {
                step: 2,
                icon: Sparkles,
                title: 'Paste the job description',
                body: 'Add the role you are applying for and Merit helps format your CV to match the specific requirements.'
              },
              {
                step: 3,
                icon: Download,
                title: 'Download your PDF',
                body: 'Get a polished, ATS-ready A4 PDF instantly. Ready to attach and send to any employer.'
              }
            ].map((item, i) => (
              <div key={`how-it-works-step-${i}`} className="relative space-y-6 group">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#3B82F6] group-hover:scale-110 transition-transform duration-300">
                      <item.icon className="w-8 h-8" />
                    </div>
                    <div className="absolute -top-3 -right-3 w-8 h-8 bg-[#3B82F6] text-white rounded-full flex items-center justify-center font-bold text-sm border-4 border-white dark:border-zinc-950">
                      {item.step}
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-xl font-bold dark:text-white">{item.title}</h3>
                  <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={onStart}
            className="inline-flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-500/20"
          >
            {user ? 'Build Your CV' : 'Get Started Now'}
            <ArrowRight className="w-5 h-5" />
          </button>

        </div>
      </section>

      {/* 4. FEATURES SECTION */}
      <section className="py-24 px-6 lg:px-16 bg-[#0F172A] text-white" aria-label="Features">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight">Everything you need to stand out</h2>
            <p className="text-white/60 max-w-2xl mx-auto text-lg">Powerful features designed to give you a competitive edge in every application.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: Sparkles,
                iconColor: 'text-yellow-400',
                title: 'Structured Writing',
                body: 'Merit helps structure your professional summary, experience bullets and skills section — tailored to your target role.'
              },
              {
                icon: CheckCircle2,
                iconColor: 'text-green-400',
                title: 'ATS-Optimised',
                body: 'Your CV is structured to pass automated screening systems used by major recruiters and employers.'
              },
              {
                icon: Download,
                iconColor: 'text-blue-400',
                title: 'Instant PDF Export',
                body: 'Download a high-resolution A4 PDF with professional margins and typography, ready to send immediately.'
              }
            ].map((feature, i) => (
              <div key={`feature-item-${i}`} className="bg-white/5 border border-white/10 p-8 rounded-2xl space-y-6 hover:bg-white/[0.08] dark:hover:bg-white/[0.12] transition-colors">
                <feature.icon className={`w-10 h-10 ${feature.iconColor}`} />
                <div className="space-y-3">
                  <h3 className="text-xl font-bold dark:text-white">{feature.title}</h3>
                  <p className="text-white/60 leading-relaxed">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. SOCIAL PROOF SECTION */}
      <section className="py-24 px-6 lg:px-16 bg-zinc-50 dark:bg-zinc-900" aria-label="Testimonials">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight dark:text-white">Trusted by job seekers</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg">Professionals who have built their CVs with Merit.</p>
          </div>

          <div className="max-w-3xl mx-auto text-center">
            <p className="text-zinc-500 dark:text-zinc-400 text-lg leading-relaxed">
              Merit is a new CV builder. We're focused on building the best tools for professionals — 
              no fake reviews, just honest work.
            </p>
          </div>
        </div>
      </section>

      {/* 6. PRICING SECTION */}
      <section className="py-24 px-6 lg:px-16 bg-white dark:bg-zinc-950" aria-label="Pricing">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight dark:text-white">Simple, honest pricing</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg">Start for free and upgrade only when you need more power.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* STARTER Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-3xl space-y-8 relative overflow-hidden flex flex-col">
              <div className="space-y-2">
                <h3 className="text-xl font-bold dark:text-white">Starter</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">£0</span>
                  <span className="text-zinc-500 dark:text-zinc-400">/month</span>
                </div>
              </div>
              <ul className="space-y-4 flex-1">
                {[
                  { text: 'Professional formatting', included: true },
                  { text: 'Basic single template only', included: true },
                  { text: 'CV structure generation', included: true },
                  { text: 'ATS-friendly formatting', included: true },
                  { text: 'PDF Download', included: false },
                  { text: 'No job description tailoring', included: false },
                  { text: 'No template choices', included: false },
                ].map((feature, i) => (
                  <li key={`row-free-features-${i}`} className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400 text-sm">
                    {feature.included ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                    ) : (
                      <span className="text-red-500 font-bold w-5 h-5 flex items-center justify-center text-lg leading-none">✗</span>
                    )}
                    {feature.text}
                  </li>
                ))}
              </ul>
              <div className="space-y-3">
                <button 
                  onClick={onStart}
                  className="w-full py-4 border-2 border-[#3B82F6] text-[#3B82F6] dark:text-blue-400 font-bold rounded-xl hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                >
                  Start Free CV
                </button>
                <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">No credit card required</p>
              </div>
            </div>

            {/* PRO Card */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-[#3B82F6] p-10 rounded-3xl space-y-8 relative overflow-hidden shadow-xl shadow-blue-500/10 flex flex-col">
              <div className="space-y-2">
                <h3 className="text-xl font-bold dark:text-white">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">£9.99</span>
                  <span className="text-zinc-500">/month</span>
                </div>
              </div>
              <ul className="space-y-4 flex-1">
                {[
                  { text: 'Unlimited CV downloads', star: false },
                  { text: 'Full job description tailoring', star: true },
                  { text: 'Save and manage multiple CVs', star: false },
                ].map((feature, i) => (
                  <li key={`row-pro-features-${i}`} className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-[#3B82F6] flex-shrink-0" />
                    <span className="flex items-center gap-1.5">
                      {feature.text}
                      {feature.star && <span className="text-yellow-500">⭐</span>}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="space-y-3">
                <button 
                  onClick={() => isPro ? onManageSubscription() : handleCheckout(STRIPE_PRICE_MONTHLY, "monthly")}
                  className="w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  {isPro ? 'Manage Subscription' : 'Go Pro – £9.99/mo'}
                </button>
                {!isPro && (
                  <button 
                    onClick={() => handleCheckout(STRIPE_PRICE_ANNUAL, "annual")}
                    className="w-full py-3 border border-[#3B82F6] text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold rounded-xl transition-all text-sm"
                  >
                    Go Pro Annual – £79.99/yr
                  </button>
                )}
              </div>
            </div>

            {/* Organisations Card — Coming Soon */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-3xl space-y-8 flex flex-col shadow-sm relative opacity-70">
              <div className="absolute -top-3 right-6">
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-300 px-4 py-1.5 rounded-full">Coming Soon</span>
              </div>
              <div className="space-y-2">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900/30 rounded-2xl flex items-center justify-center text-violet-600 dark:text-violet-400 mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">Organisations</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">Custom</span>
                  <span className="text-zinc-400 text-sm font-normal"> / per team</span>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  For teams and employers who want to manage multiple candidates' CVs in one place.
                </p>
                <div className="p-3 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-100 dark:border-violet-800">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-violet-700 flex items-center gap-1.5">
                    <Star className="w-3 h-3" /> Coming Soon
                  </p>
                  <p className="text-[10px] text-violet-600 mt-1">Team dashboards and bulk CV management.</p>
                </div>
              </div>
              <button 
                disabled
                className="w-full py-4 bg-zinc-200 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 font-bold rounded-xl cursor-not-allowed"
              >
                Coming Soon
              </button>
            </div>

          </div>

          <div className="flex flex-col items-center gap-3 pt-8">
            <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500">Share Merit with your network</p>
            <SocialShare label={false} />
          </div>
        </div>
      </section>

      {/* EMAIL CAPTURE SECTION */}
      <section className="py-24 px-6 lg:px-16 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800" aria-label="Stay updated">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <div className="space-y-4">
            <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto">
              <Bell className="w-7 h-7 text-[#3B82F6]" />
            </div>
            <h2 className="text-4xl font-bold tracking-tight dark:text-white">Stay Updated</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-xl mx-auto">
              Get UK-specific CV tips, ATS insights, and new template announcements straight to your inbox.
            </p>
          </div>

          {emailStatus === 'success' ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-8 bg-green-50 dark:bg-green-900/20 rounded-2xl border border-green-200 dark:border-green-800"
            >
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-green-700 dark:text-green-300">You're subscribed!</p>
              <p className="text-sm text-green-600 dark:text-green-400 mt-1">We'll send you UK-specific CV tips and updates.</p>
            </motion.div>
          ) : (
            <form onSubmit={handleEmailSubmit} className="space-y-5">
              <div className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                <div className="relative flex-1">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setEmailError(''); }}
                    placeholder="your@email.com"
                    disabled={emailStatus === 'submitting'}
                    className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#3B82F6] focus:border-transparent disabled:opacity-50 dark:text-white placeholder-zinc-400"
                  />
                </div>
                <button
                  type="submit"
                  disabled={emailStatus === 'submitting'}
                  className="px-6 py-3.5 bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 shrink-0"
                >
                  {emailStatus === 'submitting' ? (
                    <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Subscribing...</span>
                  ) : (
                    'Subscribe'
                  )}
                </button>
              </div>

              {emailError && (
                <p className="text-sm text-red-500 dark:text-red-400 flex items-center justify-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" /> {emailError}
                </p>
              )}

              <label className="flex items-start justify-center gap-2.5 max-w-lg mx-auto cursor-pointer group">
                <input
                  type="checkbox"
                  checked={marketingConsent}
                  onChange={e => setMarketingConsent(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#3B82F6] rounded"
                />
                <span className="text-xs text-zinc-500 dark:text-zinc-400 text-left leading-relaxed group-hover:text-zinc-700 dark:group-hover:text-zinc-300 transition-colors">
                  I agree to receive career tips and product updates. You can unsubscribe at any time. See our{' '}
                  <button type="button" onClick={() => openLegal('privacy')} className="underline hover:text-zinc-900 dark:hover:text-white transition-colors">Privacy Policy</button>.
                </span>
              </label>
            </form>
          )}
        </div>
      </section>

      {/* SUPPORT US SECTION */}
      <section id="support-section" className="py-24 px-6 lg:px-16 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight dark:text-white">Support Merit</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg">Help us keep Merit free and growing for everyone.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {STRIPE_DONATION_ENABLED && (
            /* Donation Card */
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-3xl space-y-8 flex flex-col shadow-sm">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400 mb-4">
                  <Coffee className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">One-time Donation</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">£1+</span>
                  <span className="text-zinc-400 text-sm font-normal"> / any amount</span>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  Support the development of Merit with a contribution of any amount. This helps us maintain our platform for everyone.
                </p>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-800">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-amber-700 flex items-center gap-1.5">
                    <Star className="w-3 h-3" /> Note: No features unlocked
                  </p>
                  <p className="text-[10px] text-amber-600 mt-1">Donations are purely for support.</p>
                </div>
              </div>
              <button 
                onClick={() => handleCheckout(STRIPE_PRICE_DONATION, "donation")}
                className="w-full py-4 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20"
              >
                Donate
              </button>
            </div>
            )}

            {/* Pro Plan Card */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-[#3B82F6] p-10 rounded-3xl space-y-8 flex flex-col shadow-xl shadow-blue-500/10">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#3B82F6] mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">Pro</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">£9.99</span>
                  <span className="text-zinc-500 text-sm font-normal">/month</span>
                </div>
              </div>
              <div className="space-y-4 flex-1">
                <p className="text-zinc-600 dark:text-zinc-400 text-sm">
                  Unlimited CV downloads, full job description tailoring, for active job seekers.
                </p>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                  <p className="text-[10px] uppercase tracking-widest font-bold text-blue-700 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> All Features Unlocked
                  </p>
                  <p className="text-[10px] text-blue-600 mt-1">No watermark, no limits — built for active job seekers.</p>
                </div>
              </div>
              <div className="space-y-3">
                <button 
                  onClick={() => isPro ? onManageSubscription() : handleCheckout(STRIPE_PRICE_MONTHLY, "monthly")}
                  className="w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  {isPro ? 'Manage Subscription' : 'Upgrade to Pro – £9.99/mo'}
                </button>
                {!isPro && (
                  <button 
                    onClick={() => handleCheckout(STRIPE_PRICE_ANNUAL, "annual")}
                    className="w-full py-3 border border-[#3B82F6] text-[#3B82F6] hover:bg-blue-50 dark:hover:bg-blue-900/20 font-bold rounded-xl transition-all text-sm"
                  >
                    Go Annual – £79.99/yr
                  </button>
                )}
              </div>
            </div>

          </div>
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">Secure payments powered by Stripe (Merit account)</p>
        </div>
      </section>

      {/* 7. FINAL CTA BANNER */}
      <section className="py-20 px-6 lg:px-16 bg-[#3B82F6] text-white overflow-hidden relative" aria-label="Call to action">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold">Ready to land your next role?</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">Build a better CV for your next role.</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button 
              onClick={onStart}
              className="bg-white text-[#3B82F6] hover:bg-blue-50 text-lg font-bold px-10 py-5 rounded-xl transition-all shadow-xl hover:scale-[1.02] active:scale-[0.98] w-full sm:w-auto"
            >
              {user ? 'Build Your CV' : 'Build My CV Now'}
            </button>
          </div>
          <p className="text-white/60 text-xs italic">
            Note: Full ATS optimization is a Pro feature. Free CVs are not guaranteed to bypass all ATS systems.
          </p>
        </div>
      </section>

      {/* 8. FOOTER */}
      <footer className="bg-[#0F172A] text-white/60 py-16 px-6 lg:px-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-white/10 p-1.5 rounded-md">
                <ScrollText className="text-white w-5 h-5" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">Merit</span>
            </div>
            <div className="flex gap-8 text-sm font-medium">
              <button onClick={() => openLegal('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
              <button onClick={() => openLegal('terms')} className="hover:text-white transition-colors">Terms of Service</button>
              <button onClick={() => openLegal('contact')} className="hover:text-white transition-colors">Contact</button>
            </div>
          </div>
          
          <div className="pt-12 border-t border-white/5 flex flex-col items-center gap-8">
            {STRIPE_DONATION_ENABLED && (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={() => handleCheckout(STRIPE_PRICE_DONATION, 'donation')}
                className="inline-flex items-center gap-2 bg-[#F59E0B] hover:bg-[#D97706] text-white text-sm font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-orange-500/10"
              >
                <Coffee className="w-4 h-4" />
                Support Merit
              </button>
              <p className="text-xs text-white/40">Help keep Merit free for all job seekers</p>
            </div>
            )}
            
            <div className="flex items-center gap-6">
              <SocialShare variant="muted" />
            </div>

            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col items-center md:items-start gap-1">
                <p className="text-sm">© 2026 Merit. All rights reserved.</p>
                <p className="text-xs text-white/40">ZenGale Ltd · 71-75 Shelton Street, London, WC2H 9JQ · Company No. 15646884</p>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-white/50">
                <button type="button" onClick={() => openLegal('privacy')} className="hover:text-white transition-colors">Privacy Policy</button>
                <button type="button" onClick={() => openLegal('terms')} className="hover:text-white transition-colors">Terms of Service</button>
                <button type="button" onClick={() => openLegal('contact')} className="hover:text-white transition-colors">Contact</button>
                {[
                  { icon: ShieldCheck, label: 'ATS Compatible' },
                  { icon: Zap, label: 'Privacy-First' }
                ].map((item, i) => (
                  <div key={`row-footer-badges-${i}`} className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
                    <item.icon className="w-3 h-3" />
                    {item.label}
                  </div>
                ))}
              </div>
          </div>
        </div>
      </div>
    </footer>

      <LegalModal 
        isOpen={legalModal.isOpen} 
        onClose={() => setLegalModal({ ...legalModal, isOpen: false })} 
        type={legalModal.type} 
        onSwitchType={(type) => setLegalModal({ isOpen: true, type })}
      />
    </div>
  );
}
