import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';
import { 
  MessageCircle, 
  HelpCircle, 
  Heart, 
  Dices, 
  Users, 
  Gift,
  Crown,
  FileText,
  Shield,
  Gavel,
  AlertTriangle
} from 'lucide-react';
import { 
  SiX, 
  SiInstagram, 
  SiFacebook, 
  SiTelegram 
} from 'react-icons/si';
import miraclezLogo from '@/assets/miraclez-logo.png';
import fbIcon from '@assets/fb_1760827661259.png';
import instaIcon from '@assets/insta_1760827661260.png';
import tgIcon from '@assets/tg_1760827661260.png';
import waIcon from '@assets/wa_1760827661260.png';
import xIcon from '@assets/x_1760827661260.png';

// Default footer links in case API fails
const defaultFooterLinks = {
  support: [
    { title: 'Live Support', url: '/support', icon: MessageCircle },
    { title: 'Help Center', url: '/help', icon: HelpCircle },
    { title: 'Self Exclusion', url: '/self-exclusion', icon: Heart }
  ],
  platform: [
    { title: 'Provably Fair', url: '/provably-fair', icon: Dices },
    { title: 'Affiliate Program', url: '/affiliate', icon: Users },
    { title: 'VIP Program', url: '/vip', icon: Crown },
    { title: 'Redeem Code', url: '/redeem-code', icon: Gift }
  ],
  policy: [
    { title: 'Terms of Service', url: '/terms', icon: FileText },
    { title: 'Privacy Policy', url: '/privacy', icon: Shield },
    { title: 'Responsible Gaming', url: '/responsible-gaming', icon: AlertTriangle },
    { title: 'Sweepstakes Rules', url: '/sweepstakes-rules', icon: Gavel }
  ],
  community: [
    { title: 'X (Twitter)', url: 'https://twitter.com/miraclez', icon: SiX, external: true },
    { title: 'Instagram', url: 'https://instagram.com/miraclez', icon: SiInstagram, external: true },
    { title: 'Facebook', url: 'https://facebook.com/miraclez', icon: SiFacebook, external: true },
    { title: 'Telegram', url: 'https://t.me/miraclez', icon: SiTelegram, external: true }
  ]
};

interface FooterLink {
  id: number;
  section: 'support' | 'platform' | 'policy' | 'community';
  title: string;
  url: string | null;
  orderIndex: number;
  isActive: boolean;
}

export default function Footer() {
  // Fetch footer links from API
  const { data: footerLinks } = useQuery<FooterLink[]>({
    queryKey: ['/api/footer-links'],
    retry: false,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  // Process footer links from API or use defaults
  const getLinksForSection = (section: string) => {
    if (footerLinks) {
      const sectionLinks = footerLinks
        .filter(link => link.section === section && link.isActive)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      
      if (sectionLinks.length > 0) {
        return sectionLinks.map(link => ({
          title: link.title,
          url: link.url || '#',
        }));
      }
    }
    
    // Fallback to default links
    return defaultFooterLinks[section as keyof typeof defaultFooterLinks];
  };

  const renderLink = (link: any) => {
    const Icon = link.icon;
    const isExternal = link.external || link.url?.startsWith('http');
    const isLiveSupport = link.title === 'Live Support';
    
    // Handle Live Support with Zendesk
    if (isLiveSupport) {
      return (
        <button
          onClick={() => {
            import('@/utils/zendesk').then(({ openZendeskChat }) => {
              openZendeskChat();
            });
          }}
          style={{ fontFamily: 'inherit' }}
          className="flex items-center gap-2 text-white hover:text-purple-500 transition-colors font-bold text-base text-left"
          data-testid="button-live-support"
        >
          {Icon && <Icon className="w-6 h-6" />}
          <span>{link.title}</span>
        </button>
      );
    }
    
    if (isExternal) {
      return (
        <a 
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-white hover:text-purple-500 transition-colors font-bold text-base text-left"
          data-testid={`link-footer-${link.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {Icon && <Icon className="w-6 h-6" />}
          <span>{link.title}</span>
        </a>
      );
    }
    
    return (
      <Link 
        href={link.url || '#'}
        className="flex items-center gap-2 text-white hover:text-purple-500 transition-colors font-bold text-base text-left"
        data-testid={`link-footer-${link.title.toLowerCase().replace(/\s+/g, '-')}`}
      >
        {Icon && <Icon className="w-6 h-6" />}
        <span>{link.title}</span>
      </Link>
    );
  };

  return (
    <footer className="bg-[#0f0f0f] border-t border-gray-700 mt-20">
      <div className="container mx-auto px-4 py-12">
        {/* Logo and description */}
        <div className="mb-8">
          <img 
            src={miraclezLogo} 
            alt="MIRACLEZ Logo" 
            className="h-16 w-auto mb-4"
          />
          <p className="text-gray-400 max-w-md font-medium text-sm text-center">
            The ultimate online gaming experience with provably fair games and instant payouts.
          </p>
        </div>

        {/* Two column layout with sections side by side */}
        <div className="grid grid-cols-2 gap-x-16 gap-y-8 mb-8">
          {/* Support Section - Top Left */}
          <div>
            <h3 className="text-white mb-4 bg-[transparent] text-left text-lg font-bold">Support</h3>
            <div className="flex flex-col gap-1">
              {getLinksForSection('support').map((link, index) => (
                <div key={index}>
                  {renderLink(link)}
                </div>
              ))}
            </div>
          </div>

          {/* Platform Section - Top Right */}
          <div>
            <h3 className="text-white mb-4 text-left text-lg font-bold">Platform</h3>
            <div className="flex flex-col gap-1">
              {getLinksForSection('platform').map((link, index) => (
                <div key={index}>
                  {renderLink(link)}
                </div>
              ))}
            </div>
          </div>

          {/* Policy Section - Bottom Left */}
          <div>
            <h3 className="text-white mb-4 text-left text-lg font-bold">Policy</h3>
            <div className="flex flex-col gap-1">
              {getLinksForSection('policy').map((link, index) => (
                <div key={index}>
                  {renderLink(link)}
                </div>
              ))}
            </div>
          </div>

          {/* Community Section - Bottom Right */}
          <div>
            <h3 className="text-white mb-4 text-left text-lg font-bold">Community</h3>
            <div className="flex flex-col gap-1">
              {getLinksForSection('community').map((link, index) => (
                <div key={index}>
                  {renderLink(link)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Social Media Icons */}
        <div className="flex items-center justify-center gap-4 mt-8 mb-8">
          <a 
            href="https://facebook.com/miraclez" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            data-testid="link-social-facebook"
          >
            <img src={fbIcon} alt="Facebook" className="w-12 h-12" />
          </a>
          <a 
            href="https://instagram.com/miraclez" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            data-testid="link-social-instagram"
          >
            <img src={instaIcon} alt="Instagram" className="w-12 h-12" />
          </a>
          <a 
            href="https://t.me/miraclez" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            data-testid="link-social-telegram"
          >
            <img src={tgIcon} alt="Telegram" className="w-12 h-12" />
          </a>
          <a 
            href="https://wa.me/miraclez" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            data-testid="link-social-whatsapp"
          >
            <img src={waIcon} alt="WhatsApp" className="w-12 h-12" />
          </a>
          <a 
            href="https://twitter.com/miraclez" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity"
            data-testid="link-social-x"
          >
            <img src={xIcon} alt="X (Twitter)" className="w-12 h-12" />
          </a>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-gray-700 pt-8 mt-8">
          <p className="text-gray-400 text-center mb-4 text-sm">
            NO PURCHASE IS NECESSARY to play. PROMOTIONS ARE VOID WHERE PROHIBITED BY LAW. To see detailed rules, refer to Terms of Use and our Sweepstakes Rules. Miraclez is a play-for-fun website intended for amusement purposes only. Miraclez does not offer "real-money gambling." Miraclez is a Social Gaming Platform and is only open to Eligible Participants, who at at least eighteen (18) years old or the age of majority in their jurisdiction (whichever occurs later) at the time of entry.
          </p>
          <div className="text-center">
            <p className="text-gray-400 font-medium text-sm">
              © {new Date().getFullYear()} MIRACLEZ. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}