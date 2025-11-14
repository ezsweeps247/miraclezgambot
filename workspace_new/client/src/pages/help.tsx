import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Search, HelpCircle, MessageCircle, ArrowLeft, User, Copy } from 'lucide-react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface FAQItem {
  question: string;
  answer: string;
  category: string;
}

interface UserProfile {
  id: string;
  username?: string;
  firstName: string;
  lastName?: string;
  telegramId: number;
}

export default function HelpCenterPage() {
  useEffect(() => {
    document.title = 'Help Center - Miraclez Gaming';
  }, []);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showUserInfo, setShowUserInfo] = useState(false);
  const { toast } = useToast();

  // Fetch user profile for displaying user info
  const { data: userProfile } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
    retry: false,
    staleTime: 30 * 1000, // Cache for 30 seconds
  });

  // Copy user info to clipboard
  const copyUserInfo = async () => {
    if (!userProfile) return;
    
    const userInfo = `User ID: ${userProfile.id}
Username: ${userProfile.username || 'N/A'}
Name: ${userProfile.firstName}${userProfile.lastName ? ' ' + userProfile.lastName : ''}
Telegram ID: ${userProfile.telegramId}`;

    try {
      await navigator.clipboard.writeText(userInfo);
      toast({
        title: "User info copied!",
        description: "Your user information has been copied to clipboard for support.",
      });
    } catch (err) {
      toast({
        title: "Copy failed",
        description: "Please manually copy your user information.",
        variant: "destructive",
      });
    }
  };

  // Toggle user info display
  const toggleUserInfo = () => {
    setShowUserInfo(!showUserInfo);
    if (!showUserInfo && userProfile) {
      toast({
        title: "User info displayed",
        description: "Include this information when contacting support for faster assistance.",
      });
    }
  };

  const faqData: FAQItem[] = [
    {
      question: "How do I register and create an account?",
      answer: "To create your Miraclez Gaming account, simply click the 'Sign Up' button and fill in the required fields. Make sure to provide accurate information as this will be used for account verification and withdrawals.",
      category: "account"
    },
    {
      question: "What games are available on Miraclez Gaming?",
      answer: "Miraclez Gaming offers a wide variety of games including Slots, Dice, Crash, Miracoaster, Plinko, Keno, Tower Defense, Mines, Blackjack, Roulette, HiLo, Limbo, and our puzzle game Enigma. All games use our provably fair system to ensure transparency.",
      category: "games"
    },
    {
      question: "How does the provably fair system work?",
      answer: "Our provably fair system uses cryptographic methods to ensure that game outcomes cannot be manipulated. Each game uses server seeds, client seeds, and a nonce to generate truly random results that can be independently verified. Visit our Provably Fair page for detailed technical information.",
      category: "games"
    },
    {
      question: "How do I deposit credits to my account?",
      answer: "You can deposit credits through our secure payment system. Go to your Wallet and select 'Top Up' to choose from various payment methods including cryptocurrency options through our integrated payment processor.",
      category: "payments"
    },
    {
      question: "How do I withdraw my winnings?",
      answer: "To withdraw winnings, visit your Wallet and select 'Withdraw'. You may need to complete identity verification (KYC) for larger withdrawals. Withdrawal methods include various cryptocurrencies and traditional payment options.",
      category: "payments"
    },
    {
      question: "What is the VIP program and how do I join?",
      answer: "The Miraclez Gaming VIP program offers exclusive benefits including higher bonuses, reduced wagering requirements, personal account managers, and priority support. VIP levels are earned based on your gaming activity and loyalty.",
      category: "vip"
    },
    {
      question: "How do daily login bonuses work?",
      answer: "Log in daily to claim your streak bonuses! Each consecutive day you log in increases your bonus amount. If you miss a day, your streak resets, so make sure to claim your daily rewards regularly.",
      category: "bonuses"
    },
    {
      question: "What is KYC verification and why is it required?",
      answer: "KYC (Know Your Customer) verification is a security measure to verify your identity and comply with gaming regulations. You'll need to provide government-issued ID and proof of address for certain activities like large withdrawals.",
      category: "account"
    },
    {
      question: "How can I set responsible gaming limits?",
      answer: "Miraclez Gaming is committed to responsible gaming. You can set deposit limits, session time limits, and cooling-off periods in your account settings. We also offer self-exclusion options if needed.",
      category: "account"
    },
    {
      question: "What should I do if I experience technical issues?",
      answer: "If you encounter technical issues, try refreshing your browser first. Clear your cache and cookies if problems persist. For ongoing issues, contact our support team with details about the problem and your browser/device information.",
      category: "technical"
    },
    {
      question: "How do I change my account settings and preferences?",
      answer: "Access your account settings through the user menu in the top right corner. Here you can update your profile information, change password, set gaming limits, and manage notification preferences.",
      category: "account"
    },
    {
      question: "What is the difference between Real Mode and Fun Mode?",
      answer: "Real Mode uses Sweeps Cash (SC) for real prizes and withdrawals. Fun Mode uses Gold Coins (GC) for entertainment purposes only. Both modes offer the same great games with our provably fair system.",
      category: "games"
    },
    {
      question: "How do I join the affiliate program?",
      answer: "Join our affiliate program to earn commissions by referring new players. Visit the Affiliate section in your account dashboard to sign up, get your unique referral links, and track your earnings.",
      category: "affiliate"
    },
    {
      question: "Are there any geographic restrictions?",
      answer: "Miraclez Gaming complies with local gambling laws and regulations. Some jurisdictions may be restricted from accessing our services. The platform will automatically detect your location and inform you of any restrictions.",
      category: "legal"
    },
    {
      question: "How do I contact customer support?",
      answer: "Our customer support team is available 24/7 through multiple channels: Live Chat (fastest response) and email at support@miraclezgaming.com. We're here to help with any questions or issues.",
      category: "support"
    },
    {
      question: "How can I delete or disable my account?",
      answer: "For security and regulatory compliance, accounts cannot be permanently deleted. However, you can disable your account by contacting customer support. We'll help you set up appropriate restrictions or cooling-off periods as needed.",
      category: "account"
    },
    {
      question: "What happens if a game disconnects during play?",
      answer: "If you experience a disconnection during gameplay, don't worry! Our system automatically saves your game state. Simply refresh the page or restart the game to continue where you left off. Any bets in progress are protected.",
      category: "technical"
    },
    {
      question: "How do I enable two-factor authentication for extra security?",
      answer: "Enhance your account security by enabling two-factor authentication in your account settings. This adds an extra layer of protection by requiring a verification code from your mobile device when logging in.",
      category: "security"
    }
  ];

  const categories = [
    { id: 'all', name: 'All Categories' },
    { id: 'account', name: 'Account & Profile' },
    { id: 'games', name: 'Games & Gameplay' },
    { id: 'payments', name: 'Deposits & Withdrawals' },
    { id: 'bonuses', name: 'Bonuses & Rewards' },
    { id: 'vip', name: 'VIP Program' },
    { id: 'technical', name: 'Technical Support' },
    { id: 'security', name: 'Security' },
    { id: 'affiliate', name: 'Affiliate Program' },
    { id: 'legal', name: 'Legal & Compliance' },
    { id: 'support', name: 'Customer Support' }
  ];

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f0f0f] to-[#1a1a1a]">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <HelpCircle className=" text-purple-500"style={{width: '3.5px', height: '3.5px'}} />
            <h1 className="text-[10px] md:text-[10px] font-bold text-white">
              Help Center
            </h1>
          </div>
          <p className="text-gray-400 text-[10px] mb-6">
            Find answers to frequently asked questions about Miraclez Gaming
          </p>

          {/* Search */}
          <div className="relative max-w-md mx-auto mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 "style={{width: '3px', height: '3px'}} />
            <Input
              type="text"
              placeholder="Search for answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-[#1a1a1a] border-gray-700 text-white"
              data-testid="input-search-faq"
            />
          </div>

          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 justify-center">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className={selectedCategory === category.id 
                  ? "bg-gradient-to-r from-purple-500 to-pink-500" 
                  : "border-gray-600 text-gray-400 hover:text-white"}
                data-testid={`button-category-${category.id}`}
              >
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-4">
          {filteredFAQs.length === 0 ? (
            <Card className="bg-[#1a1a1a] border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400">
                  <Search className=" mx-auto mb-4 opacity-50"style={{width: '3.5px', height: '3.5px'}} />
                  <p className="text-[10px] font-medium mb-2">No results found</p>
                  <p>Try adjusting your search terms or selecting a different category.</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            filteredFAQs.map((faq, index) => (
              <Collapsible key={index}>
                <Card className="bg-[#1a1a1a] border-gray-800 hover:border-gray-600 transition-colors">
                  <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-gray-800/50 transition-colors">
                      <CardTitle className="flex items-center justify-between text-white text-[10px]">
                        <span className="text-left" data-testid={`text-question-${index}`}>
                          {faq.question}
                        </span>
                        <ChevronDown className=" text-gray-400 transition-transform duration-200 group-data-[state=open]:rotate-180"style={{width: '3px', height: '3px'}} />
                      </CardTitle>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-6">
                      <div className="border-t border-gray-700 pt-4">
                        <p className="text-gray-300 leading-relaxed" data-testid={`text-answer-${index}`}>
                          {faq.answer}
                        </p>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            ))
          )}
        </div>

        {/* Contact Support Section */}
        <Card className="bg-[#1a1a1a] border-gray-800 mt-12">
          <CardContent className="p-8 text-center">
            <MessageCircle className=" mx-auto mb-4 text-purple-500"style={{width: '3.5px', height: '3.5px'}} />
            <h3 className="text-[10px] font-bold text-white mb-4">Still need help?</h3>
            <p className="text-gray-400 mb-6">
              Can't find the answer you're looking for? Our support team is here to help you 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                data-testid="button-live-chat"
              >
                <MessageCircle className=" mr-2"style={{width: '3px', height: '3px'}} />
                Start Live Chat
              </Button>
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-400 hover:text-white"
                onClick={toggleUserInfo}
                data-testid="button-email-support"
              >
                <User className=" mr-2"style={{width: '3px', height: '3px'}} />
                {showUserInfo ? 'Hide User Info' : 'Email Support'}
              </Button>
            </div>
            
            {/* User Info Section - Togglable */}
            {showUserInfo && userProfile && (
              <div className="mt-6 p-4 bg-[#0a0a0a] rounded-lg border border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-white font-semibold">Your Account Information</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={copyUserInfo}
                    className="border-gray-600 text-gray-400 hover:text-white"
                    data-testid="button-copy-user-info"
                  >
                    <Copy className=" mr-1"style={{width: '2.5px', height: '2.5px'}} />
                    Copy
                  </Button>
                </div>
                <div className="space-y-2 text-[8px]">
                  <div className="flex justify-between">
                    <span className="text-gray-400">User ID:</span>
                    <span className="text-gray-300 font-mono">{userProfile.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Username:</span>
                    <span className="text-gray-300">{userProfile.username || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Name:</span>
                    <span className="text-gray-300">{userProfile.firstName}{userProfile.lastName ? ' ' + userProfile.lastName : ''}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Telegram ID:</span>
                    <span className="text-gray-300 font-mono">{userProfile.telegramId}</span>
                  </div>
                </div>
                <p className="text-[8px] text-gray-500 mt-3">
                  Include this information when contacting support for faster assistance.
                </p>
              </div>
            )}
            
            <div className="mt-6 text-[8px] text-gray-500">
              <p>Email: <a href="mailto:support@miraclezgaming.com" className="text-purple-400 hover:text-purple-300">support@miraclezgaming.com</a></p>
            </div>
          </CardContent>
        </Card>
        
        {/* Back to Home Button */}
        <div className="flex justify-center py-6">
          <Link href="/">
            <Button 
              variant="outline" 
              size="sm"
              className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-colors rounded-lg"
              data-testid="button-back-home-bottom"
            >
              <ArrowLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}