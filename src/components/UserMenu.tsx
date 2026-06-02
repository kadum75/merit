import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, LogOut } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface UserMenuProps {
  user: User;
  isPro: boolean;
  onManageSubscription?: () => void;
  onSignOut: () => void;
}

export function UserMenu({ user, isPro, onManageSubscription, onSignOut }: UserMenuProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-1 sm:gap-2 p-1 pr-2 sm:pr-3 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-full transition-all"
      >
        {user.user_metadata?.avatar_url ? (
          <img src={user.user_metadata.avatar_url} alt="" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border border-white/20" />
        ) : (
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-900 dark:bg-zinc-600 flex items-center justify-center text-white text-xs font-bold">
            {user.email?.[0].toUpperCase()}
          </div>
        )}
        <span className="text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hidden sm:inline">
          {user.user_metadata?.full_name || user.email?.split('@')[0]}
        </span>
      </button>

      <AnimatePresence>
        {showMenu && (
          <motion.div
            key="shared-user-menu"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
              <p className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1">Signed in as</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{user.email}</p>
            </div>
            <div className="p-2">
              {isPro && onManageSubscription && (
                <button
                  onClick={() => { setShowMenu(false); onManageSubscription(); }}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <CreditCard className="w-4 h-4" />
                  Manage Subscription
                </button>
              )}
              <button
                onClick={() => { setShowMenu(false); onSignOut(); }}
                className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
