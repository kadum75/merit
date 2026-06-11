import { Linkedin, Twitter, Facebook, Send } from 'lucide-react';

const SHARE_URL = 'https://merit-cv.vercel.app';
const SHARE_TEXT = 'Build your ATS-optimised CV with Merit — free to try';

const platforms = [
  {
    name: 'LinkedIn',
    icon: Linkedin,
    href: () => `https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(SHARE_URL)}`,
    color: 'text-[#0A66C2] hover:text-[#004182]',
    bg: 'bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20',
  },
  {
    name: 'X (Twitter)',
    icon: Twitter,
    href: () => `https://twitter.com/intent/tweet?text=${encodeURIComponent(SHARE_TEXT)}&url=${encodeURIComponent(SHARE_URL)}`,
    color: 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white',
    bg: 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700',
  },
  {
    name: 'Facebook',
    icon: Facebook,
    href: () => `https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(SHARE_URL)}`,
    color: 'text-[#1877F2] hover:text-[#0d65d9]',
    bg: 'bg-[#1877F2]/10 hover:bg-[#1877F2]/20',
  },
  {
    name: 'WhatsApp',
    icon: Send,
    href: () => `https://wa.me/?text=${encodeURIComponent(SHARE_TEXT + ' ' + SHARE_URL)}`,
    color: 'text-[#25D366] hover:text-[#1da851]',
    bg: 'bg-[#25D366]/10 hover:bg-[#25D366]/20',
  },
];

export function SocialShare({ label = true, variant = 'default' }: { label?: boolean; variant?: 'default' | 'muted' }) {
  const handleShare = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    window.open(href, '_blank', 'width=600,height=500,noopener,noreferrer');
  };

  const isMuted = variant === 'muted';

  return (
    <div className="flex items-center gap-2">
      {label && (
        <span className={`text-xs font-medium mr-1 ${isMuted ? 'text-white/40' : 'text-zinc-400 dark:text-zinc-500'}`}>Share:</span>
      )}
      {platforms.map((p) => {
        const Icon = p.icon;
        return (
          <a
            key={p.name}
            href={p.href()}
            onClick={(e) => handleShare(e, p.href())}
            target="_blank"
            rel="noopener noreferrer"
            title={`Share on ${p.name}`}
            className={`p-2 rounded-xl transition-all ${isMuted ? 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white' : `${p.bg} ${p.color}`}`}
          >
            <Icon className="w-4 h-4" />
          </a>
        );
      })}
    </div>
  );
}
