import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Gift,
  Star,
  Trophy,
  Crown,
  Info,
  Clock,
  TrendingUp,
  CheckCircle,
  Lock,
  Sparkles,
  Loader2
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { formatCredits } from "@/lib/utils";

interface ApiBonus {
  id: string;
  bonusType: string;
  percentage: number;
  minDeposit: number;
  wageringMultiplier: number;
  description: string;
  status: 'available' | 'claimed' | 'locked';
  eligibleOn?: number | null;
  currentDepositCount?: number;
  wageringProgress?: {
    wageredAmount: number;
    wageringRequirement: number;
    percentage: number;
  } | null;
}

interface BonusCard {
  id: string;
  bonusType: string;
  title: string;
  percentage: number;
  minDeposit: number;
  wageringRequirement: number;
  icon: React.ElementType;
  gradient: string;
  borderColor: string;
  claimed?: boolean;
  eligible?: boolean;
  wageringProgress?: {
    wageredAmount: number;
    wageringRequirement: number;
    percentage: number;
  } | null;
}

export default function Bonus() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedBonus, setSelectedBonus] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const { toast } = useToast();

  // Fetch available bonuses
  const { data: bonusData, isLoading, error, refetch } = useQuery<{
    bonuses: ApiBonus[];
    dailyDepositCount: number;
    currentDate: string;
  }>({
    queryKey: ['/api/bonuses/available']
  });

  // Map API bonuses to display cards
  const bonusCards: BonusCard[] = bonusData?.bonuses.map((bonus, index) => {
    let icon = Gift;
    let gradient = "from-green-600 to-emerald-400";
    let borderColor = "border-green-400";
    let title = "First Deposit";

    if (bonus.bonusType === 'second_deposit') {
      icon = Trophy;
      gradient = "from-blue-600 to-cyan-400";
      borderColor = "border-blue-400";
      title = "Second Deposit";
    } else if (bonus.bonusType === 'third_deposit') {
      icon = Crown;
      gradient = "from-purple-600 to-pink-400";
      borderColor = "border-purple-400";
      title = "Third Deposit";
    }

    return {
      id: bonus.id,
      bonusType: bonus.bonusType,
      title,
      percentage: bonus.percentage,
      minDeposit: bonus.minDeposit,
      wageringRequirement: bonus.wageringMultiplier,
      icon,
      gradient,
      borderColor,
      claimed: bonus.status === 'claimed',
      eligible: bonus.status === 'available',
      wageringProgress: bonus.wageringProgress
    };
  }) || [];

  const handleSelectBonus = async (bonus: BonusCard) => {
    if (bonus.claimed || !bonus.eligible || isSelecting) return;
    
    const apiBonus = bonusData?.bonuses.find(b => b.id === bonus.id);
    if (!apiBonus) return;
    
    setIsSelecting(true);
    
    try {
      const response = await apiRequest('POST', '/api/bonuses/select', {
        bonusType: apiBonus.bonusType
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "Bonus Selected!",
          description: data.message || `Make a deposit of at least ${apiBonus.minDeposit} SC to claim your bonus.`
        });
        
        // Navigate to crypto deposit page after a short delay
        setTimeout(() => {
          navigate('/crypto');
        }, 1500);
      } else {
        toast({
          title: "Selection Failed",
          description: data.error || "Failed to select bonus",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to select bonus",
        variant: "destructive"
      });
    } finally {
      setIsSelecting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="flex flex-col items-center">
          <Loader2 style={{width: '3.5px', height: '3.5px'}} className="animate-spin text-[#D4AF37]" />
          <p className="text-[8px] mt-2 text-gray-400">Loading bonuses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <p className="text-[8px] text-red-400">Failed to load bonuses</p>
          <Button 
            onClick={() => refetch()} 
            className="mt-4 bg-[#D4AF37] text-black hover:bg-yellow-500"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-purple-900/20 via-black to-black border-b border-[#1a1a1a]">
        <div className="absolute inset-0 opacity-10">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 35px, rgba(212,175,55,0.1) 35px, rgba(212,175,55,0.1) 70px)`,
              animation: 'slide 20s linear infinite'
            }}
          />
        </div>
        
        <div className="relative px-4 py-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles style={{width: '3px', height: '3px'}} className="text-[#D4AF37]" />
            <h1 className="text-[10px] md:text-[10px] font-bold bg-gradient-to-r from-[#D4AF37] via-yellow-300 to-[#D4AF37] bg-clip-text text-transparent">
              Daily Deposit Bonuses
            </h1>
            <Sparkles style={{width: '3px', height: '3px'}} className="text-[#D4AF37]" />
          </div>
          <p className="text-gray-400 text-[8px] md:text-[10px] max-w-2xl mx-auto">
            Boost your deposits with our exclusive daily bonuses! Each bonus resets at midnight UTC.
          </p>
          {bonusData && (
            <p className="text-[8px] text-gray-500 mt-2">
              Daily deposits: {bonusData.dailyDepositCount}/3
            </p>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Bonus Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {bonusCards.map((bonus, index) => {
            const Icon = bonus.icon;
            const isDisabled = bonus.claimed || !bonus.eligible;
            
            return (
              <Card
                key={bonus.id}
                className={`relative overflow-hidden bg-gradient-to-br from-gray-900 to-black border-2 transition-all duration-300 ${
                  isDisabled 
                    ? 'opacity-50 cursor-not-allowed border-gray-800' 
                    : `${bonus.borderColor} hover:shadow-lg hover:shadow-[#D4AF37]/20 hover:scale-105 cursor-pointer`
                } ${selectedBonus === bonus.id ? 'ring-2 ring-[#D4AF37]' : ''}`}
                onClick={() => !isDisabled && setSelectedBonus(bonus.id)}
                data-testid={`bonus-card-${index + 1}`}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 bg-gradient-to-br ${bonus.gradient} opacity-10`} />
                
                {/* Card Content */}
                <div className="relative p-6">
                  {/* Status Badge */}
                  {bonus.claimed && (
                    <div className="absolute top-4 right-4 bg-gray-700 px-3 py-1 rounded-full flex items-center gap-1">
                      <CheckCircle style={{width: '3px', height: '3px'}} className="" />
                      <span className="text-[8px] font-semibold">Claimed</span>
                    </div>
                  )}
                  {!bonus.eligible && !bonus.claimed && (
                    <div className="absolute top-4 right-4 bg-gray-700 px-3 py-1 rounded-full flex items-center gap-1">
                      <Lock style={{width: '3px', height: '3px'}} className="" />
                      <span className="text-[8px] font-semibold">Locked</span>
                    </div>
                  )}
                  
                  {/* Icon and Title */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`p-3 bg-gradient-to-br ${bonus.gradient} rounded-lg`}>
                      <Icon style={{width: '3.5px', height: '3.5px'}} className="text-white" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-bold text-white">{bonus.title}</h3>
                      <p className="text-[8px] text-gray-400">Bonus #{index + 1}</p>
                    </div>
                  </div>

                  {/* Bonus Percentage */}
                  <div className="text-center py-6 mb-4 bg-black/50 rounded-lg border border-[#D4AF37]/20">
                    <div className="text-[10px] font-bold text-[#D4AF37] mb-1">
                      {bonus.percentage}%
                    </div>
                    <div className="text-[8px] text-gray-400">BONUS</div>
                  </div>

                  {/* Wagering Progress (if active) */}
                  {bonus.wageringProgress && (
                    <div className="mb-4 p-3 bg-[#D4AF37]/10 rounded-lg">
                      <div className="flex justify-between text-[8px] mb-2">
                        <span className="text-gray-400">Wagering Progress</span>
                        <span className="text-[#D4AF37] font-semibold">
                          {bonus.wageringProgress.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-[#D4AF37] to-yellow-500 transition-all duration-300"
                          style={{ width: `${Math.min(100, bonus.wageringProgress.percentage)}%` }}
                        />
                      </div>
                      <p className="text-[8px] text-gray-400 mt-1">
                        {bonus.wageringProgress.wageredAmount.toFixed(2)} SC / {bonus.wageringProgress.wageringRequirement.toFixed(2)} SC
                      </p>
                    </div>
                  )}

                  {/* Requirements */}
                  <div className="space-y-3 mb-6">
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-gray-400">Min. Deposit</span>
                      <span className="text-white font-semibold">{bonus.minDeposit} SC</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-gray-400">Wagering</span>
                      <span className="text-white font-semibold">{bonus.wageringRequirement}x</span>
                    </div>
                    <div className="flex items-center justify-between text-[8px]">
                      <span className="text-gray-400">Max Bonus</span>
                      <span className="text-white font-semibold">500 SC</span>
                    </div>
                  </div>

                  {/* Select Button */}
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSelectBonus(bonus);
                    }}
                    disabled={isDisabled || isSelecting}
                    className={`w-full py-6 font-bold text-[10px] transition-all duration-300 ${
                      isDisabled || isSelecting
                        ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-[#D4AF37] to-yellow-500 text-black hover:from-yellow-500 hover:to-[#D4AF37] transform hover:scale-105'
                    }`}
                    data-testid={`select-bonus-${index + 1}`}
                  >
                    {bonus.claimed ? 'Already Claimed' : 
                     isSelecting ? 'Selecting...' : 
                     bonus.eligible ? 'Select Bonus' : 'Not Eligible'}
                  </Button>
                </div>

                {/* Decorative Elements */}
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-[#D4AF37]/20 to-transparent rounded-full blur-3xl" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl" />
              </Card>
            );
          })}
        </div>

        {/* Info Section */}
        <Card className="bg-gradient-to-br from-gray-900 to-black border-2 border-gray-800 p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-[#D4AF37]/10 rounded-lg">
              <Info style={{width: '3px', height: '3px'}} className="text-[#D4AF37]" />
            </div>
            <div className="flex-1">
              <h3 className="text-[10px] font-bold text-white mb-4">Important Information</h3>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-[8px] font-semibold text-[#D4AF37] mb-2 flex items-center gap-2">
                    <TrendingUp style={{width: '3.5px', height: '3.5px'}} className="" />
                    Wagering Requirements
                  </h4>
                  <p className="text-gray-400 text-[8px]">
                    All bonuses come with a 15x wagering requirement. This means you must wager the bonus amount 
                    15 times before you can withdraw any winnings. For example, a 100 SC bonus requires 1,500 SC in total wagers.
                  </p>
                </div>

                <div>
                  <h4 className="text-[8px] font-semibold text-[#D4AF37] mb-2 flex items-center gap-2">
                    <Clock style={{width: '3.5px', height: '3.5px'}} className="" />
                    Daily Reset
                  </h4>
                  <p className="text-gray-400 text-[8px]">
                    Bonuses reset daily at 00:00 UTC. Each day brings new opportunities to claim all three deposit bonuses. 
                    Unclaimed bonuses do not roll over to the next day.
                  </p>
                </div>

                <div>
                  <h4 className="text-[8px] font-semibold text-[#D4AF37] mb-2 flex items-center gap-2">
                    <Star style={{width: '3.5px', height: '3.5px'}} className="" />
                    Terms & Conditions
                  </h4>
                  <ul className="text-gray-400 text-[8px] space-y-1 list-disc list-inside">
                    <li>Minimum deposit of 10 SC required to claim each bonus</li>
                    <li>Maximum bonus amount is capped at 500 SC per deposit</li>
                    <li>Bonuses must be claimed in order (First, Second, then Third)</li>
                    <li>Bonus funds cannot be withdrawn until wagering requirements are met</li>
                    <li>Some games may contribute differently to wagering requirements</li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-800">
                <p className="text-[8px] text-gray-500 italic">
                  Please gamble responsibly. If you need help, visit our{' '}
                  <button 
                    onClick={() => navigate('/responsible-gaming')}
                    className="text-[#D4AF37] hover:underline"
                  >
                    Responsible Gaming
                  </button>{' '}
                  page.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>


      {/* Add slide animation keyframe */}
      <style>{`
        @keyframes slide {
          0% { transform: translateX(0); }
          100% { transform: translateX(-70px); }
        }
      `}</style>
    </div>
  );
}