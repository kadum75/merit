import React from 'react';
import { Moon, Sun, ScrollText } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { UserMenu } from './UserMenu';
import { STRIPE_PRICE_MONTHLY, STRIPE_PRICE_ANNUAL, STRIPE_PRICE_DONATION } from '../lib/pricing';

interface HeaderProps {
  user: User | null;
  isPro: boolean;
  isStripeConfigured: boolean;
  theme: 'light' | 'dark';
  currentView: 'home' | 'builder';
  onNavigateHome: () => void;
  onSignInClick: () => void;
  onSignOut: () => void;
  onManageSubscription?: () => void;
  onCheckout: (priceId: string, planType: string) => void;
  onToggleTheme: () => void;
}

export function Header({
  user, isPro, isStripeConfigured, theme, currentView,
  onNavigateHome, onSignInClick, onSignOut, onManageSubscription,
  onCheckout, onToggleTheme,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
      <div className="max-w-7xl mx-auto px-4 lg:px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-3">
          {currentView === 'builder' && (
            <button
              onClick={onNavigateHome}
              className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              title="Home"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </button>
          )}
          <button onClick={onNavigateHome} className="flex items-center gap-1.5 lg:gap-2 group">
            <div className="bg-[#3B82F6] p-1 rounded-md" aria-hidden="true">
              <ScrollText className="text-white w-4 h-5" />
            </div>
            <span className="text-zinc-900 dark:text-white font-bold text-lg tracking-tight">Merit</span>
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex gap-1 sm:gap-1.5">
            <button
              onClick={() => onCheckout(STRIPE_PRICE_MONTHLY, 'monthly')}
              className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold px-2 sm:px-2.5 py-1 rounded-full border border-blue-500/30 text-blue-600 dark:text-blue-400 hover:border-blue-500 hover:text-blue-700 dark:hover:text-blue-300 transition-all"
            >
              Pro Monthly
            </button>
            <button
              onClick={() => onCheckout(STRIPE_PRICE_ANNUAL, 'annual')}
              className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold px-2 sm:px-2.5 py-1 rounded-full border border-amber-500/30 text-amber-600 dark:text-amber-400 hover:border-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-all"
            >
              Pro Annual
            </button>
            <button
              onClick={() => onCheckout(STRIPE_PRICE_DONATION, 'donation')}
              className="text-[9px] sm:text-[10px] uppercase tracking-widest font-bold px-2 sm:px-2.5 py-1 rounded-full border border-green-500/30 text-green-600 dark:text-green-400 hover:border-green-500 hover:text-green-700 dark:hover:text-green-300 transition-all"
            >
              Donate
            </button>
          </div>

          {user ? (
            <UserMenu
              user={user}
              isPro={isPro}
              onManageSubscription={onManageSubscription}
              onSignOut={onSignOut}
            />
          ) : (
            <button
              onClick={onSignInClick}
              className="px-4 py-1.5 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors"
            >
              Sign In
            </button>
          )}

          <button
            onClick={onToggleTheme}
            className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
}
