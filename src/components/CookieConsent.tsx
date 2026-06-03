import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cookie, X, Settings, Check } from 'lucide-react';

const CONSENT_KEY = 'merit-consent';

interface ConsentPreferences {
  essential: boolean;
  functional: boolean;
}

const DEFAULT_PREFS: ConsentPreferences = {
  essential: true,
  functional: true,
};

export function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [prefs, setPrefs] = useState<ConsentPreferences>(DEFAULT_PREFS);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (!stored) {
      setShowBanner(true);
    } else {
      try {
        setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(stored) });
      } catch {
        setShowBanner(true);
      }
    }
  }, []);

  const saveConsent = (newPrefs: ConsentPreferences) => {
    setPrefs(newPrefs);
    localStorage.setItem(CONSENT_KEY, JSON.stringify(newPrefs));
    setShowBanner(false);
    setShowDetails(false);
  };

  const acceptAll = () => saveConsent({ essential: true, functional: true });
  const acceptEssential = () => saveConsent({ essential: true, functional: false });
  const savePreferences = () => saveConsent(prefs);

  if (!showBanner) return null;

  return (
    <AnimatePresence mode="sync">
      <motion.div
        key="cookie-consent"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[200] p-4"
      >
        <div className="max-w-7xl mx-auto">
          {showDetails ? (
            <motion.div
              key="cookie-details"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 max-w-lg ml-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-zinc-500" />
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">Cookie Preferences</h3>
                </div>
                <button onClick={() => setShowDetails(false)} className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 mb-4">
                <label className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">Essential</p>
                    <p className="text-xs text-zinc-500">Authentication & security</p>
                  </div>
                  <input type="checkbox" checked={prefs.essential} disabled className="w-4 h-4 accent-zinc-900" />
                </label>
                <label className="flex items-center justify-between p-3 bg-zinc-50 dark:bg-zinc-800 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-zinc-900 dark:text-white">Functional</p>
                    <p className="text-xs text-zinc-500">Theme & preference cookies</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={prefs.functional}
                    onChange={e => setPrefs(p => ({ ...p, functional: e.target.checked }))}
                    className="w-4 h-4 accent-zinc-900"
                  />
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={acceptEssential}
                  className="flex-1 px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Reject All
                </button>
                <button
                  onClick={savePreferences}
                  className="flex-1 px-4 py-2 text-sm font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="cookie-banner"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4"
            >
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center shrink-0">
                  <Cookie className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">We use cookies</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                    Merit uses essential cookies for authentication and security. 
                    We also use functional cookies for your preferences. 
                    See our{' '}
                    <a href="#" onClick={(e) => { e.preventDefault(); setShowBanner(false); window.dispatchEvent(new CustomEvent('open-privacy')); }} className="underline hover:text-zinc-900 dark:hover:text-white transition-colors">
                      Privacy Policy
                    </a>{' '}
                    for details.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                <button
                  onClick={() => setShowDetails(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  <Settings className="w-3.5 h-3.5" />
                  Customise
                </button>
                <button
                  onClick={acceptEssential}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
                >
                  Reject All
                </button>
                <button
                  onClick={acceptAll}
                  className="px-5 py-2 text-xs font-bold text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white rounded-xl transition-colors"
                >
                  Accept All
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
