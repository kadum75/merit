import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Shield, FileText, Mail, Globe } from 'lucide-react';

export type LegalType = 'privacy' | 'terms' | 'contact';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: LegalType;
  onSwitchType?: (type: LegalType) => void;
}

export function LegalModal({ isOpen, onClose, type, onSwitchType }: LegalModalProps) {
  const content = {
    privacy: {
      title: 'Privacy Policy',
      icon: Shield,
      body: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p className="font-semibold text-white">Last Updated: 3 June 2026</p>
          <p>
            Merit ("we", "our", "us") respects your privacy and is committed to protecting your
            personal data. This policy explains how we collect, use, and safeguard your information
            when you use our service at <span className="text-white">merit-cv.vercel.app</span>.
          </p>

          <h4 className="text-white font-bold pt-2">1. Who We Are & Contact</h4>
          <p>
            Merit is operated by Zenstack. Our Data Protection Officer can be reached at:{' '}
            <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a>.
            Merit is a new service in the process of registering with the Information Commissioner's Office (ICO). Until registration is complete, we operate under the direct supervision of the ICO's transitional provisions.
          </p>

          <h4 className="text-white font-bold pt-2">2. Data We Collect</h4>
          <p className="font-medium text-white">Information you provide:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account data: name, email address, password (hashed via Supabase Auth)</li>
            <li>CV content: work history, education, skills, personal summary</li>
            <li>Payment data: handled entirely by Stripe — we never see your card details</li>
            <li>Google profile data (if you sign in with Google): name, email, avatar URL</li>
          </ul>
          <p className="font-medium text-white mt-2">Information collected automatically:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Usage data: pages visited, features used, CV generation timestamps</li>
            <li>Device data: browser type, operating system, IP address (anonymised)</li>
            <li>Cookies: session tokens, preference cookies (see Section 10)</li>
          </ul>

          <h4 className="text-white font-bold pt-2">3. Legal Basis for Processing (UK & EU GDPR)</h4>
          <p>We process your personal data under the following lawful bases:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-white">Consent</span> — you explicitly agree when creating an account and accepting this policy</li>
            <li><span className="text-white">Contractual necessity</span> — processing is required to provide CV generation and storage</li>
            <li><span className="text-white">Legitimate interests</span> — service improvement, fraud prevention</li>
            <li><span className="text-white">Legal obligation</span> — tax records for paid subscriptions (6 years retention)</li>
          </ul>

          <h4 className="text-white font-bold pt-2">4. How We Use Your Data</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Generate and store your CVs and cover letters</li>
            <li>Manage your account and subscription</li>
            <li>Send service-related emails (e.g., password reset, payment receipts)</li>
            <li>Improve our templates and ATS optimisation</li>
            <li>Comply with legal obligations (tax, anti-fraud)</li>
          </ul>
          <p className="text-amber-400 text-xs mt-1">
            We DO NOT sell your personal data to third parties. We DO NOT use your CV content for training models.
          </p>

          <h4 className="text-white font-bold pt-2">5. Automated Decision-Making (Article 22 UK GDPR)</h4>
          <p>
            Merit's CV tailoring feature uses language models to re-structure and re-phrase your content 
            to match a target job description. This is a purely assistive tool — you review, edit, and 
            decide whether to use the generated output. It does not constitute solely automated 
            decision-making with legal or similarly significant effects under Article 22 UK GDPR.
          </p>
          <p className="mt-2">
            If you would like an explanation of how the generation logic works or wish to discuss 
            human intervention, contact our DPO at{' '}
            <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a>.
          </p>

          <h4 className="text-white font-bold pt-2">6. Data Retention</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Account data: retained until you delete your account or after 12 months of inactivity (no login or CV edit for 12 consecutive months)</li>
            <li>CV content: retained while your account is active; deleted within 90 days of account deletion</li>
            <li>Payment records: retained for 6 years (UK HMRC legal requirement)</li>

            <li>Cookie data: as per the cookie durations in Section 11</li>
          </ul>

          <h4 className="text-white font-bold pt-2">7. International Data Transfers</h4>
          <p>
            Your data is stored on Supabase servers (Google Cloud, europe-west2 — London, UK). 
            If we use sub-processors outside the UK/EEA, we ensure adequate safeguards via 
            UK International Data Transfer Agreements (IDTA) or EU Standard Contractual Clauses (SCCs).
          </p>

          <h4 className="text-white font-bold pt-2">8. Your Rights (UK & EU GDPR)</h4>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-white">Access</span> — request a copy of your personal data</li>
            <li><span className="text-white">Rectification</span> — correct inaccurate data</li>
            <li><span className="text-white">Erasure</span> — request deletion of your data ("right to be forgotten")</li>
            <li><span className="text-white">Restriction</span> — limit how we process your data</li>
            <li><span className="text-white">Portability</span> — receive your data in a machine-readable format</li>
            <li><span className="text-white">Objection</span> — object to processing based on legitimate interests</li>
            <li><span className="text-white">Withdraw consent</span> — at any time, without affecting the lawfulness of prior processing</li>
          </ul>
          <p className="mt-2">
            To exercise any right, email{' '}
            <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a>
            or delete your account from the User Menu (Settings). To withdraw consent for cookies,
            adjust your preferences via the Cookie Consent banner (accessible at any time).
            We will respond within 30 days. You also have the right to lodge a complaint with the ICO (UK) 
            or your local supervisory authority (EU).
          </p>

          <h4 className="text-white font-bold pt-2">9. California & US Privacy Rights (CCPA/CPRA)</h4>
          <p>
            If you are a California resident, the California Consumer Privacy Act (CCPA) as amended by the 
            California Privacy Rights Act (CPRA) grants you additional rights:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-white">Right to Know</span> — request details of data collected, used, and shared</li>
            <li><span className="text-white">Right to Delete</span> — request deletion of your personal information</li>
            <li><span className="text-white">Right to Correct</span> — correct inaccurate personal information</li>
            <li><span className="text-white">Right to Opt-Out</span> — we do not sell your data, but you may opt out of any future sale</li>
            <li><span className="text-white">Right to Non-Discrimination</span> — we will not discriminate against you for exercising CCPA rights</li>
            <li><span className="text-white">Right to Limit Use of Sensitive PI</span> — we only use sensitive data as necessary to provide the service</li>
          </ul>
          <p className="mt-2">
            We collect the following categories of personal information: identifiers (name, email), 
            professional/employment information (CV data), and internet activity (usage data). 
            We do not sell personal information, nor have we done so in the preceding 12 months.
            For CCPA requests: email <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a>.
          </p>
          <p className="mt-2">
            Similar rights apply in other US states with comprehensive privacy laws (Colorado, Connecticut, 
            Virginia, Utah, Texas, and others). Contact us to exercise your rights under applicable state law.
          </p>

          <h4 className="text-white font-bold pt-2">10. Data Security</h4>
          <p>
            We implement appropriate technical and organisational measures:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Encryption in transit (TLS 1.3) and at rest (AES-256)</li>
            <li>Row-Level Security (RLS) in Supabase — users can only access their own data</li>
            <li>Supabase Auth with PKCE flow for secure authentication</li>
            <li>Stripe for payment processing (PCI DSS Level 1 compliant)</li>
            <li>API request validation and monitoring</li>
            <li>Content Security Policy (CSP) headers</li>
            <li>Regular security audits and dependency updates</li>
            <li>Access controls — only the service owner can access production data</li>
          </ul>

          <h4 className="text-white font-bold pt-2">11. Cookies</h4>
          <p>We use the following types of cookies:</p>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Cookie</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Purpose</th>
                  <th className="text-left py-2 pr-4 text-zinc-400 font-medium">Duration</th>
                  <th className="text-left py-2 text-zinc-400 font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                <tr>
                  <td className="py-2 pr-4 text-zinc-300">sb-*-auth-token</td>
                  <td className="py-2 pr-4">Authentication session</td>
                  <td className="py-2 pr-4">Session / persistent</td>
                  <td className="py-2">Essential</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-zinc-300">merit-consent</td>
                  <td className="py-2 pr-4">Stores cookie consent preference</td>
                  <td className="py-2 pr-4">12 months</td>
                  <td className="py-2">Functional</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 text-zinc-300">merit-theme</td>
                  <td className="py-2 pr-4">Theme preference (light/dark)</td>
                  <td className="py-2 pr-4">12 months</td>
                  <td className="py-2">Functional</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2">
            You can manage or disable cookies in your browser settings. Disabling essential cookies 
            will prevent the service from functioning correctly.
          </p>

          <h4 className="text-white font-bold pt-2">12. Third-Party Processors</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-white">Supabase</span> — authentication, database, storage (Google Cloud, London, UK)</li>
            <li><span className="text-white">Stripe</span> — payment processing (PCI DSS Level 1, worldwide)</li>
            <li><span className="text-white">Vercel</span> — hosting and CDN (global edge network)</li>
            <li><span className="text-white">Google</span> — OAuth provider (if you choose Google sign-in)</li>
          </ul>
          <p>
            Each processor has been assessed for GDPR compliance. We have Data Processing Agreements 
            (DPAs) in place where required.
          </p>

          <h4 className="text-white font-bold pt-2">13. Changes to This Policy</h4>
          <p>
            We will notify you of material changes via email and/or a notice on the website. 
            Continued use after changes constitutes acceptance of the updated policy.
          </p>

          <h4 className="text-white font-bold pt-2">14. Complaints Procedure</h4>
          <p>
            Under the Data (Use and Access) Act 2025, we maintain a formal procedure for handling 
            data protection complaints. If you believe we have mishandled your personal data:
          </p>
          <ol className="list-decimal pl-5 space-y-1">
            <li>Email your complaint to{' '}
              <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a>{' '}
              with the subject "Data Protection Complaint"</li>
            <li>Include your name, a description of the issue, and any relevant reference numbers</li>
            <li>We will acknowledge receipt within 5 working days</li>
            <li>We will investigate and provide a full response within 30 calendar days</li>
            <li>If we need more time for complex cases, we will notify you with an updated timeline</li>
          </ol>
          <p className="mt-2">
            If you are unsatisfied with our response, you have the right to lodge a complaint with the 
            Information Commissioner's Office (ICO):{' '}
            <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">ico.org.uk</a> · 0303 123 1113.
            For EU users, you may complain to your local supervisory authority.
          </p>

          <h4 className="text-white font-bold pt-2">15. Contact</h4>
          <p>
            Data Protection Officer:{' '}
            <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a>
          </p>
          <p className="mt-1">
            UK ICO: <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">ico.org.uk</a> · 0303 123 1113
          </p>
          <p className="mt-1">
            EU (Lead SA — Irish DPC):{' '}
            <a href="https://www.dataprotection.ie" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">dataprotection.ie</a>
          </p>
        </div>
      )
    },
    terms: {
      title: 'Terms of Service',
      icon: FileText,
      body: (
        <div className="space-y-4 text-zinc-300 text-sm leading-relaxed">
          <p className="font-semibold text-white">Last Updated: 3 June 2026</p>
          <p>
            These Terms of Service ("Terms") govern your use of Merit (the "Service"), operated by 
            Zenstack ("we", "our", "us"). By creating an account or using the Service, you agree to 
            these Terms. If you do not agree, do not use the Service.
          </p>

          <h4 className="text-white font-bold pt-2">1. Eligibility</h4>
          <p>
            You must be at least 16 years old to use the Service. If you are under 18, you confirm 
            that a parent or guardian has reviewed and agreed to these Terms on your behalf.
          </p>

          <h4 className="text-white font-bold pt-2">2. Account Registration</h4>
          <p>
            You are responsible for maintaining the confidentiality of your login credentials. 
            You must provide accurate, complete, and up-to-date information. You must notify us 
            immediately of any unauthorised use of your account.
          </p>

          <h4 className="text-white font-bold pt-2">3. Free Tier</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>You may create and preview CVs without charge</li>
            <li>PDF/DOC download requires a Pro subscription</li>
            <li>Free tier CVs may include a watermark or footer</li>
            <li>We reserve the right to limit the number of free CVs created per month</li>
            <li>
              Full ATS optimisation is a Pro feature. Free CVs follow standard formatting but may 
              not bypass all Applicant Tracking Systems
            </li>
          </ul>

          <h4 className="text-white font-bold pt-2">4. Pro Subscriptions</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>Pro features require a paid subscription billed monthly or annually</li>
            <li>Payments are processed securely by Stripe — we do not store payment card details</li>
            <li>Subscription renews automatically unless cancelled before the renewal date</li>
            <li>You may cancel at any time from your account settings. Access continues until the end of the billing period</li>
            <li>No pro-rata refunds for partial billing periods</li>
            <li>Prices are in GBP (£) and inclusive of applicable VAT</li>
            <li>We may change pricing with 30 days' notice via email</li>
          </ul>

          <h4 className="text-white font-bold pt-2">5. Acceptable Use</h4>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Upload false, misleading, or illegal content</li>
            <li>Attempt to circumvent paywalls, rate limits, or security measures</li>
            <li>Use the Service for any unlawful purpose or in violation of any applicable law</li>
            <li>Reverse-engineer, scrape, or automated-access the Service without written permission</li>
            <li>Impersonate another person or entity</li>
            <li>Upload malware, viruses, or malicious code</li>
          </ul>

          <h4 className="text-white font-bold pt-2">6. Intellectual Property</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="text-white">Your content</span> — you retain full ownership of the CV content, work history, and personal information you provide</li>
            <li><span className="text-white">Our IP</span> — Merit templates, design, branding, software, and underlying technology are owned by Zenstack</li>
            <li><span className="text-white">License</span> — you grant us a limited license to process, store, and display your content solely to provide the Service</li>
            <li><span className="text-white">Model training</span> — we do not use your CV content to train AI or machine learning models</li>
          </ul>

          <h4 className="text-white font-bold pt-2">7. Data Protection & GDPR</h4>
          <p>
            Our data processing practices are detailed in our{' '}
            <button type="button" onClick={() => onSwitchType?.('privacy')} className="text-blue-400 underline">Privacy Policy</button>.
            By using the Service, you acknowledge our processing of your personal data as described therein.
          </p>

          <h4 className="text-white font-bold pt-2">8. Limitation of Liability</h4>
          <ul className="list-disc pl-5 space-y-1">
            <li>The Service is provided "as is" without warranties of any kind, express or implied</li>
            <li>We do not guarantee job placement, interview success, or that your CV will pass any particular ATS</li>
            <li>We are not liable for any indirect, incidental, or consequential damages</li>
            <li>Our total liability is limited to the amount you have paid us in the 12 months preceding the claim</li>
            <li>Nothing in these Terms excludes liability for death, personal injury, fraud, or other liability that cannot be excluded by law</li>
          </ul>

          <h4 className="text-white font-bold pt-2">9. Termination</h4>
          <p>
            We may suspend or terminate your account at any time for violation of these Terms. 
            You may delete your account at any time by contacting us. Upon termination, your data 
            will be deleted within 90 days (subject to legal retention requirements for financial records).
          </p>

          <h4 className="text-white font-bold pt-2">10. Governing Law & Dispute Resolution</h4>
          <p>
            These Terms are governed by the laws of England and Wales. Any disputes shall first be 
            attempted to be resolved through informal negotiation. If unresolved, disputes shall be 
            subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
          <p className="mt-2">
            <span className="text-white">For EU users:</span> Nothing in these Terms deprives you of the 
            protection of mandatory consumer protection laws in your country of residence. You may also 
            use the EU Online Dispute Resolution platform at{' '}
            <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">ec.europa.eu/consumers/odr</a>.
          </p>
          <p className="mt-2">
            <span className="text-white">For US users:</span> Disputes may be brought in your local 
            jurisdiction. We will cooperate in good faith to resolve any claim informally before 
            formal proceedings.
          </p>

          <h4 className="text-white font-bold pt-2">11. Copyright</h4>
          <p>
            <span className="text-white">UK (Copyright, Designs and Patents Act 1988):</span> If you 
            believe content on Merit infringes your copyright, contact{' '}
            <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a> 
            with details of the work and proof of ownership. We will respond promptly.
          </p>
          <p className="mt-2">
            <span className="text-white">US (DMCA):</span> If you are a US resident and believe your 
            copyright has been infringed, send a DMCA notice to{' '}
            <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a> 
            with: (a) identification of the copyrighted work, (b) proof of ownership, 
            (c) your contact information, and (d) a statement of good faith belief.
          </p>

          <h4 className="text-white font-bold pt-2">12. Changes to Terms</h4>
          <p>
            We may update these Terms from time to time. Material changes will be notified via email 
            and/or a prominent notice on the website. Continued use after the effective date constitutes 
            acceptance of the updated Terms.
          </p>

          <p className="pt-4 text-xs text-zinc-500 border-t border-zinc-800">
            These Terms were drafted with reference to UK consumer law, the EU Consumer Rights Directive, 
            and the California Consumer Privacy Act (CCPA). For questions, contact{' '}
            <a href="mailto:rjcosta@gmail.com" className="text-blue-400 underline">rjcosta@gmail.com</a>.
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
            Have questions, need support, or want to exercise your data protection rights? 
            We're here to help.
          </p>
          <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-green-500/10 rounded-xl flex items-center justify-center text-green-400">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Website</p>
                <a href="https://merit-cv.vercel.app/#" target="_blank" rel="noopener noreferrer" className="text-white font-medium hover:text-blue-400 transition-colors">
                  merit-cv.vercel.app
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-400">
                <Mail className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Email</p>
                <a href="mailto:rjcosta@gmail.com" className="text-white font-medium hover:text-blue-400 transition-colors">
                  rjcosta@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-400">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider">Data Protection</p>
                <p className="text-white font-medium">DPO: rjcosta@gmail.com</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-800/50 p-6 rounded-2xl border border-zinc-700/50 space-y-3">
            <p className="font-semibold text-white">Your Privacy Rights</p>
            <p className="text-xs">
              To exercise any of your rights under UK GDPR, EU GDPR, or CCPA/CPRA — 
              including access, rectification, erasure, portability, or to opt out of data sales — 
              simply email us. We will respond within 30 days (UK/EU) or 45 days (California).
            </p>
          </div>

          <div className="text-xs space-y-2">
            <p className="text-zinc-400">Regulatory bodies:</p>
            <ul className="list-disc pl-5 text-zinc-500 space-y-1">
              <li>
                UK: Information Commissioner's Office —{' '}
                <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">ico.org.uk</a> · 0303 123 1113
              </li>
              <li>
                EU: European Data Protection Board —{' '}
                <a href="https://edpb.europa.eu" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">edpb.europa.eu</a>
              </li>
              <li>
                US: California Privacy Protection Agency —{' '}
                <a href="https://cppa.ca.gov" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">cppa.ca.gov</a>
              </li>
            </ul>
          </div>

          <p className="text-xs text-zinc-500 italic">
            We typically respond to all enquiries within 24-48 hours during UK business hours (GMT/BST).
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
