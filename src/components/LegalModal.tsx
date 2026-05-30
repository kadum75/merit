import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText, Mail } from 'lucide-react';

export type LegalType = 'privacy' | 'terms' | 'contact';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LegalType;
}

export function LegalModal({ isOpen, onClose, type }: LegalModalProps) {
  const content = {
    privacy: {
      title: 'Privacy Policy',
      icon: Shield,
      body: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p className="font-semibold text-white">Last Updated: April 9, 2026</p>
          <p>
            At PrimeCV, we take your privacy seriously. This policy outlines how we handle your data in compliance with UK GDPR.
          </p>
          <h4 className="text-white font-bold pt-2">1. Data We Collect</h4>
          <p>
            We collect information you provide directly: name, email, and the professional details you enter into your CV. We also collect authentication data via Supabase.
          </p>
          <h4 className="text-white font-bold pt-2">2. How We Use Your Data</h4>
          <p>
            Your data is used solely to generate your CVs and cover letters. We do not sell your personal information to third parties.
          </p>
          <h4 className="text-white font-bold pt-2">3. Data Security</h4>
          <p>
            All professional data is stored securely and processed according to strict internal standards to ensure accuracy and privacy.
          </p>
          <h4 className="text-white font-bold pt-2">4. Your Rights</h4>
          <p>
            You have the right to access, correct, or delete your data at any time via your account settings or by contacting us.
          </p>
        </div>
      )
    },
    terms: {
      title: 'Terms of Service',
      icon: FileText,
      body: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p className="font-semibold text-white">Last Updated: April 9, 2026</p>
          <p>
            By using PrimeCV, you agree to these terms. Please read them carefully.
          </p>
          <h4 className="text-white font-bold pt-2">1. Use of Service</h4>
          <p>
            PrimeCV provides automated career document generation. You are responsible for the accuracy of the information you provide.
          </p>
          <h4 className="text-white font-bold pt-2">2. Subscriptions</h4>
          <p>
            Pro features require a paid subscription. Payments are processed securely via Stripe. You can cancel your subscription at any time.
          </p>
          <h4 className="text-white font-bold pt-2">3. Intellectual Property</h4>
          <p>
            You retain ownership of the content you provide. PrimeCV owns the templates and the underlying integration logic.
          </p>
          <h4 className="text-white font-bold pt-2">4. Limitation of Liability</h4>
          <p>
            While we strive for excellence, PrimeCV does not guarantee job placement or interview success.
          </p>
        </div>
      )
    },
    contact: {
      title: 'Contact Us',
      icon: Mail,
      body: (
        <div className="space-y-6 text-zinc-300 text-sm leading-relaxed">
          <p>
            Have questions or need support? We're here to help you land your next role.
          </p>
          <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Email Support</p>
                <a href="mailto:contact@primecv.co.uk" className="text-white font-medium hover:text-blue-400 transition-colors">
                  contact@primecv.co.uk
                </a>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-500 italic">
            We typically respond to all enquiries within 24-48 hours during UK business hours.
          </p>
        </div>
      )
    }
  };

  const current = content[type];
  const Icon = current.icon;

  return (
    <AnimatePresence mode="sync">
      {isOpen && (
        <motion.div 
          key="legal-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
        >
          <motion.div
            key={`legal-modal-content-${type}`}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl"
          >
          <div className="p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-zinc-800 rounded-2xl flex items-center justify-center text-white">
                  <Icon className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-white">{current.title}</h2>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto pr-4 custom-scrollbar">
              {current.body}
            </div>

            <div className="mt-8 pt-8 border-t border-zinc-800 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
      )}
    </AnimatePresence>
  );
}
