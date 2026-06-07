import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Mail, Lock, LogIn, UserPlus, Chrome, AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase, isSupabaseConfigValid, syncUserDocument } from '../supabase';
import { LegalModal, LegalType } from './LegalModal';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

async function checkPasswordPwned(password: string): Promise<number> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);
  const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
  if (!res.ok) return 0;
  const text = await res.text();
  for (const line of text.split('\n')) {
    const [hashSuffix, count] = line.split(':');
    if (hashSuffix === suffix) return parseInt(count, 10);
  }
  return 0;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  resetPasswordMode?: boolean;
  onPasswordReset?: () => void;
  onSignUp?: () => void;
}

declare const turnstile: {
  render: (container: HTMLElement, opts: {
    sitekey: string;
    callback?: (token: string) => void;
    'error-callback'?: () => void;
    'expired-callback'?: () => void;
    theme?: 'light' | 'dark' | 'auto';
    size?: 'normal' | 'compact' | 'flexible' | 'invisible';
  }) => string | undefined;
  remove: (id: string) => void;
  reset: (id: string) => void;
};

export function AuthModal({ isOpen, onClose, resetPasswordMode, onPasswordReset, onSignUp }: AuthModalProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(isSupabaseConfigValid ? null : 'Supabase is not configured. Please set credentials in environment variables.');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);
  const [confirmedEmail, setConfirmedEmail] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const turnstileContainerRef = useRef<HTMLDivElement>(null);
  const captchaReadyRef = useRef(false);

  const resetTurnstile = useCallback(() => {
    setCaptchaToken('');
    captchaReadyRef.current = false;
    const container = turnstileContainerRef.current;
    if (container && typeof turnstile !== 'undefined') {
      try { turnstile.reset(container.id || ''); } catch {}
    }
  }, []);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !turnstileContainerRef.current) return;

    const container = turnstileContainerRef.current;
    const id = `turnstile-${Date.now()}`;
    container.id = id;

    const renderWidget = () => {
      if (typeof turnstile === 'undefined') return;
      try {
        turnstile.render(container, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: (token: string) => {
            setCaptchaToken(token);
            captchaReadyRef.current = true;
          },
          'error-callback': () => {
            setCaptchaToken('');
            captchaReadyRef.current = false;
          },
          'expired-callback': () => {
            setCaptchaToken('');
            captchaReadyRef.current = false;
          },
        });
      } catch {}
    };

    if (typeof turnstile !== 'undefined') {
      renderWidget();
    } else {
      const existing = document.getElementById('cf-turnstile-script');
      if (existing && typeof turnstile !== 'undefined') {
        renderWidget();
        return;
      }
      if (existing) return;

      const script = document.createElement('script');
      script.id = 'cf-turnstile-script';
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__cfOnLoad';
      script.async = true;
      script.defer = true;
      (window as any).__cfOnLoad = () => {
        delete (window as any).__cfOnLoad;
        renderWidget();
      };
      document.head.appendChild(script);
    }

    return () => {
      if (typeof turnstile !== 'undefined') {
        try { turnstile.remove(id); } catch {}
      }
    };
  }, [TURNSTILE_SITE_KEY, isSignIn]);
  
  // Consent flags
  const [agreeToTerms, setAgreeToTerms] = useState(false);

  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: LegalType }>({
    isOpen: false,
    type: 'privacy'
  });

  const openLegal = (type: LegalType) => {
    setLegalModal({ isOpen: true, type });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignIn) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
          ...(captchaToken ? { options: { captchaToken } } : {}),
        });
        if (error) throw error;
        onClose();
      } else {
        if (!agreeToTerms) {
          throw new Error('You must agree to the Privacy Policy and Terms of Service.');
        }
        const breachCount = await checkPasswordPwned(password);
        if (breachCount > 0) {
          throw new Error(
            `This password has appeared in ${breachCount.toLocaleString()} data ` +
            `${breachCount === 1 ? 'breach' : 'breaches'} and is not secure. ` +
            `Please choose a different password.`
          );
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: 'https://merit-cv.vercel.app?signin=confirmed',
            ...(captchaToken ? { captchaToken } : {}),
          },
        });
        resetTurnstile();
        if (error) throw error;
        if (data.session) {
          await syncUserDocument(data.user, agreeToTerms);
          onSignUp?.();
          onClose();
        } else if (!data.user) {
          const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email, password,
            ...(captchaToken ? { options: { captchaToken } } : {}),
          });
          if (signInError || !signInData.user) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          await syncUserDocument(signInData.user);
          onSignUp?.();
          onClose();
        } else {
          setConfirmedEmail(email);
          setShowEmailConfirmation(true);
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://merit-cv.vercel.app',
        }
      });

      if (error) throw error;
      if (!data?.url) {
        throw new Error('Failed to get OAuth URL');
      }
      window.location.href = data.url;
    } catch (err: any) {
      console.error('Google Sign-in Error:', err);
      setError(`Sign-in failed: ${err.message}`);
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address first.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
        ...(captchaToken ? { captchaToken } : {}),
      });
      if (error) throw error;
      setResetSent(true);
      setTimeout(() => setResetSent(false), 5000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      onPasswordReset?.();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence mode="sync">
      {isOpen && (
        <motion.div 
          key="auth-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 dark:bg-zinc-950 backdrop-blur-sm"
        >
          <motion.div
            key="auth-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl"
          >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
                {resetPasswordMode ? 'Set New Password' : (isSignIn ? 'Welcome Back' : 'Create Account')}
              </h2>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {resetPasswordMode ? (
              <form onSubmit={handleUpdatePassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">New Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600 transition-all"
                      placeholder="New password"
                      required minLength={6}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600 transition-all"
                      placeholder="Confirm new password"
                      required minLength={6}
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-500 text-xs">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                  ) : (
                    'Update Password'
                  )}
                </button>
              </form>
            ) : showEmailConfirmation ? (
              <>
                <div className="relative rounded-2xl overflow-hidden">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl opacity-75 blur-sm" />
                  <div className="relative bg-white dark:bg-zinc-900 rounded-2xl p-8 flex flex-col items-center text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    >
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-blue-500/20 mb-6">
                        <Mail className="w-10 h-10 text-white" />
                      </div>
                    </motion.div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white mb-2">
                      Verify Your Email
                    </h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4 max-w-xs">
                      We sent a confirmation link to:
                    </p>
                    <div className="px-4 py-2 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-900 dark:text-white mb-6 w-full max-w-xs truncate">
                      {confirmedEmail}
                    </div>
                    <button
                      onClick={() => {
                        setShowEmailConfirmation(false);
                        setIsSignIn(true);
                      }}
                      className="w-full py-3 px-4 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold rounded-xl transition-all"
                    >
                      I've Confirmed — Sign In
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const { error } = await supabase.auth.resend({
                            type: 'signup',
                            email: confirmedEmail,
                          });
                          if (error) throw error;
                        } catch (err: any) {
                          setError(err.message);
                        }
                      }}
                      className="mt-4 text-sm text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
                    >
                      Didn't get it? <span className="underline underline-offset-2">Resend</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
            <><div className="flex p-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl mb-6">
              <button
                onClick={() => {
                  setIsSignIn(true);
                  resetTurnstile();
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  isSignIn ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => {
                  setIsSignIn(false);
                  resetTurnstile();
                }}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                  !isSignIn ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm' : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading || !isSupabaseConfigValid}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-zinc-900 dark:bg-white hover:bg-zinc-800 dark:hover:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded-xl transition-all mb-6 disabled:opacity-50"
            >
              <Chrome className="w-5 h-5" />
              Continue with Google
            </button>

            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-200 dark:border-zinc-800"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-zinc-900 px-2 text-zinc-400 dark:text-zinc-500">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600 transition-all"
                    placeholder="name@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Password
                  </label>
                  {isSignIn && (
                    <button
                      type="button"
                      onClick={handleForgotPassword}
                      className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 transition-colors"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl py-2.5 pl-10 pr-4 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-600 transition-all"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              {!isSignIn && (
                <div className="space-y-3 pt-2">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative flex items-center pt-0.5">
                      <input
                        type="checkbox"
                        checked={agreeToTerms}
                        onChange={(e) => setAgreeToTerms(e.target.checked)}
                        className="peer h-4 w-4 rounded border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900 dark:focus:ring-zinc-600"
                      />
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed group-hover:text-zinc-900 dark:group-hover:text-zinc-300 transition-colors">
                      I agree to the <button type="button" onClick={() => openLegal('privacy')} className="text-zinc-700 dark:text-zinc-300 underline underline-offset-2">Privacy Policy</button> and <button type="button" onClick={() => openLegal('terms')} className="text-zinc-700 dark:text-zinc-300 underline underline-offset-2">Terms of Service</button>. *
                    </span>
                  </label>
                </div>
              )}

              {TURNSTILE_SITE_KEY && (
                <div className="flex justify-center">
                  <div ref={turnstileContainerRef} />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl text-red-600 dark:text-red-500 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {resetSent && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 rounded-xl text-green-600 dark:text-green-500 text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <p>Password reset email sent! Check your inbox.</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !isSupabaseConfigValid}
                className="w-full py-3 px-4 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-800 dark:hover:bg-white text-white dark:text-zinc-900 font-bold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/20 dark:border-zinc-900/20 border-t-white dark:border-t-zinc-900 rounded-full animate-spin" />
                ) : (
                  <>
                    {isSignIn ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {isSignIn ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>
            </>
            )}
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>

    <LegalModal 
      key="auth-legal-modal"
      isOpen={legalModal.isOpen} 
      onClose={() => setLegalModal({ ...legalModal, isOpen: false })} 
      type={legalModal.type} 
      onSwitchType={(type) => setLegalModal({ isOpen: true, type })}
    />
  </>
);
}
