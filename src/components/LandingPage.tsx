import React from 'react';
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
  Coffee,
  Heart,
  Lock,
  ScrollText,
  Home,
} from 'lucide-react';
import { motion } from 'motion/react';
import { LegalModal, LegalType } from './LegalModal';
import { STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_PRICE_DONATION, STRIPE_PRICE_ORG } from '../lib/pricing';

interface LandingPageProps {
  onStart: () => void;
  isPro: boolean;
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
      {!isStripeConfigured && (
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
              <p className="text-white/40 text-xs text-center sm:text-left italic">
                Note: Full ATS optimization is a Pro feature. Free CVs are not guaranteed to bypass all ATS systems.
              </p>

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

          <div className="relative hidden lg:block">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#3B82F6]/20 to-transparent rounded-full blur-3xl" />
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
          <p className="text-zinc-400 text-xs italic">
            Note: Full ATS optimization is a Pro feature. Free CVs are not guaranteed to bypass all ATS systems.
          </p>
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
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg">Join thousands of professionals who have landed their dream roles using Merit.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                quote: 'Got three interviews in my first week. Merit tailored my CV perfectly for each role.',
                name: 'Sarah M.',
                title: 'Software Engineer, London'
              },
              {
                quote: 'Finally a CV tool that understands what employers are looking for.',
                name: 'James T.',
                title: 'Project Manager, Manchester'
              },
              {
                quote: 'Uploaded my old CV, Merit rewrote it completely. Landed a new role within 2 weeks.',
                name: 'Priya K.',
                title: 'Marketing Executive, Birmingham'
              }
            ].map((testimonial, i) => (
              <div key={`testimonial-item-${i}`} className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-sm border border-zinc-100 dark:border-zinc-700 space-y-6">
                <div className="flex gap-1 text-yellow-400">
                  {[...Array(5)].map((_, starIdx) => <Star key={`testimonial-star-${i}-${starIdx}`} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 italic leading-relaxed">"{testimonial.quote}"</p>
                <div className="pt-4 border-t border-zinc-50 dark:border-zinc-700">
                  <p className="font-bold text-[#0F172A] dark:text-white">{testimonial.name}</p>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">{testimonial.title}</p>
                </div>
              </div>
            ))}
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
                  { text: 'ATS-optimised format', included: true },
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
                <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight italic">
                  Note: Full ATS optimization is a Pro feature. Free CVs are not guaranteed to bypass all ATS systems.
                </p>
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
                  { text: 'Priority support', star: false },
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

            {/* ORGANISATIONS Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-10 rounded-3xl space-y-8 relative overflow-hidden flex flex-col">
              <div className="absolute top-5 right-5 bg-[#3B82F6] text-white text-xs font-bold px-3 py-1 rounded-full">
                Best for teams
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold dark:text-white">Organisations</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">£29.99</span>
                  <span className="text-zinc-500 dark:text-zinc-400">/month</span>
                </div>
              </div>
              <ul className="space-y-4 flex-1">
                {[
                  { text: 'Everything in Pro', star: false },
                  { text: 'Up to 10 team seats', star: false },
                  { text: 'Shared CV templates & branding', star: false },
                  { text: 'Bulk CV download & analytics', star: false },
                  { text: 'Candidate notes per CV', star: false },
                  { text: 'Dedicated account manager', star: false },
                ].map((feature, i) => (
                  <li key={`row-org-features-${i}`} className="flex items-start gap-3 text-zinc-600 dark:text-zinc-400 text-sm">
                    <CheckCircle2 className="w-5 h-5 text-[#3B82F6] flex-shrink-0" />
                    {feature.text}
                  </li>
                ))}
              </ul>
              <div className="space-y-3">
                <button 
                  onClick={() => handleCheckout(STRIPE_PRICE_ORG, "org")}
                  className="w-full py-4 bg-[#3B82F6] hover:bg-[#2563EB] text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                >
                  Get Organisations – £29.99/mo
                </button>
                <p className="text-center text-xs text-zinc-400">Cancel anytime · Billed monthly</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SUPPORT US SECTION */}
      <section id="support-section" className="py-24 px-6 lg:px-16 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold tracking-tight dark:text-white">Support Merit</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-2xl mx-auto text-lg">Help us keep Merit free for all job seekers. Your support helps us cover hosting and infrastructure costs.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Donation Card */}
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
                  <p className="text-[10px] text-amber-600 mt-1">Donations are purely for support and do not grant Pro access.</p>
                </div>
              </div>
              <button 
                onClick={() => handleCheckout(STRIPE_PRICE_DONATION, "donation")}
                className="w-full py-4 bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold rounded-xl transition-all shadow-lg shadow-orange-500/20"
              >
                Donate
              </button>
            </div>

            {/* Pro Plan Card */}
            <div className="bg-white dark:bg-zinc-900 border-2 border-[#3B82F6] p-10 rounded-3xl space-y-8 flex flex-col shadow-xl shadow-blue-500/10">
              <div className="space-y-2">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-[#3B82F6] mb-4">
                  <Zap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold dark:text-white">Merit Pro</h3>
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
          <p className="text-center text-xs text-zinc-400 dark:text-zinc-500">Secure payments powered by Stripe (Zenstack account)</p>
        </div>
      </section>

      {/* 7. FINAL CTA BANNER */}
      <section className="py-20 px-6 lg:px-16 bg-[#3B82F6] text-white overflow-hidden relative" aria-label="Call to action">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="max-w-7xl mx-auto text-center space-y-8 relative z-10">
          <div className="space-y-4">
            <h2 className="text-4xl md:text-5xl font-extrabold">Ready to land your next role?</h2>
            <p className="text-xl text-white/80 max-w-2xl mx-auto">Join thousands of job seekers building better CVs with Merit.</p>
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
            
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-8">
              <p className="text-sm">© 2026 <a href="https://webpagemain-pink.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">Zenstack</a>. All rights reserved.</p>
              <div className="flex flex-wrap justify-center gap-6">
              {[
                { icon: ShieldCheck, label: 'ATS Compatible' },
                { icon: Zap, label: 'GDPR Compliant' }
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
