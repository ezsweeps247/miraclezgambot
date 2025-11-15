import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGameMode } from "@/contexts/GameModeContext";
import { useGame } from "@/lib/stores/useGame";
import { GameCanvas } from "@/components/fundora-blox/GameCanvas";
import { GameUI } from "@/components/fundora-blox/GameUI";
import { MobileGameLayout } from "@/components/fundora-blox/MobileGameLayout";
import { SoundManager } from "@/components/fundora-blox/SoundManager";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import "@fontsource/roboto";

interface MobileContext {
  isMobile: boolean;
  screenWidth: number;
  screenHeight: number;
}

export default function FundoraBloxGame() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { gameMode } = useGameMode();
  
  const [scale, setScale] = useState(1);
  const [mobileContext, setMobileContext] = useState<MobileContext>({
    isMobile: false,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
  });
  
  const phase = useGame(state => state.phase);
  const stake = useGame(state => state.stake);
  const credits = useGame(state => state.credits);
  const bonusPoints = useGame(state => state.bonusPoints);
  const start = useGame(state => state.start);
  const setStake = useGame(state => state.setStake);
  
  // Get user balance
  const { data: balance, refetch: refetchBalance } = useQuery<{ 
    available: number; 
    locked: number; 
    currency: string; 
    total: number; 
    sweepsCashTotal: number; 
    sweepsCashRedeemable: number; 
    balanceMode: string 
  }>({
    queryKey: ["/api/balance"],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // Update credits in the game store when balance changes
  useEffect(() => {
    if (balance && balance.available !== undefined) {
      // Update the game store with current balance
      useGame.setState({ credits: balance.available });
    }
  }, [balance]);

  // Start game mutation
  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/fundora-blox/start", {
        stake: stake === 'FREE' ? 0 : stake,
      });
      return response.json() as Promise<{ success: boolean; balanceMode: string; message: string }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      // Start the game after successful API call
      start();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to start game",
        description: error.message || "Please try again",
      });
    },
  });

  // End game mutation
  const endGameMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/fundora-blox/end", {
        stake: data.stake === 'FREE' ? 0 : data.stake,
        highestRow: data.highestRow,
        blocksStacked: data.blocksStacked,
        prize: data.prize || 0,
        prizeType: data.prizeType || 'points',
        score: data.score || 0,
        bonusPoints: data.bonusPoints || 0,
      });
      return response.json() as Promise<{ success: boolean; result: string; stake: number; prize: number; profit: number }>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      
      if (data.prize > 0) {
        toast({
          title: "Congratulations!",
          description: `You won $${data.prize.toFixed(2)}!`,
        });
      }
    },
    onError: (error: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/balance"] });
      toast({
        variant: "destructive",
        title: "Failed to end game",
        description: error.message || "Your progress was saved",
      });
    },
  });

  // Subscribe to game end events
  useEffect(() => {
    const unsubscribe = useGame.subscribe(
      (state) => state.phase,
      (phase) => {
        if (phase === "ended") {
          const gameState = useGame.getState();
          const prizeInfo = gameState.getPotentialPrize();
          
          // Send end game data to server
          endGameMutation.mutate({
            stake: gameState.stake,
            highestRow: gameState.highestRow,
            blocksStacked: gameState.blocksStacked,
            prize: prizeInfo.amount,
            prizeType: prizeInfo.type,
            score: gameState.score,
            bonusPoints: gameState.bonusPoints,
          });
        }
      }
    );
    
    return unsubscribe;
  }, []);

  // Handle start button click
  const handleStart = useCallback(async () => {
    if (stake === 'FREE') {
      // Start game immediately for FREE mode
      start();
    } else {
      // Check balance
      if (!balance || balance.available < stake) {
        toast({
          variant: "destructive",
          title: "Insufficient balance",
          description: "Please add funds to play",
        });
        return;
      }
      
      // Start real game with API call
      try {
        await startGameMutation.mutateAsync();
      } catch (error) {
        // Error handled in mutation
      }
    }
  }, [stake, balance, start, startGameMutation, toast]);

  // Mobile detection and scaling
  useEffect(() => {
    const calculateScale = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // More aggressive mobile detection
      const isMobile = vw <= 900 || vh <= 600 || 'ontouchstart' in window || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      setMobileContext({
        isMobile,
        screenWidth: vw,
        screenHeight: vh,
      });
      
      if (isMobile) {
        // For mobile, we want to use 100% of the screen
        setScale(1); // We'll handle scaling within the mobile layout itself
      } else {
        // Desktop - original logic
        const designWidth = 2050;
        const designHeight = 1700;
        
        let scaleX = vw / designWidth;
        let scaleY = vh / designHeight;
        
        const newScale = Math.min(scaleX, scaleY, 1);
        setScale(newScale);
      }
    };

    calculateScale();
    window.addEventListener('resize', calculateScale);
    window.addEventListener('orientationchange', calculateScale);
    
    // Trigger recalculation after a short delay to handle initial load
    setTimeout(calculateScale, 100);
    
    return () => {
      window.removeEventListener('resize', calculateScale);
      window.removeEventListener('orientationchange', calculateScale);
    };
  }, []);

  // Mobile layout - use the optimized MobileGameLayout component
  if (mobileContext.isMobile) {
    return (
      <>
        <MobileGameLayout />
        <SoundManager />
        <style>{`
          /* Fundora Blox minimalistic scrollbar styling */
          ::-webkit-scrollbar {
            width: 4px;
            height: 4px;
          }
          ::-webkit-scrollbar-track {
            background: #2a2a2e;
          }
          ::-webkit-scrollbar-thumb {
            background: #444;
            border-radius: 2px;
          }
          ::-webkit-scrollbar-thumb:hover {
            background: #00CED1;
          }
          * {
            scrollbar-width: thin;
            scrollbar-color: #444 #2a2a2e;
          }
        `}</style>
      </>
    );
  }

  // Desktop layout - scaled
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center',
      background: '#2a2a2e'
    }}>
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        zIndex: 1000
      }}>
        <button
          onClick={() => setLocation('/')}
          className="inline-flex items-center justify-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-r from-[#B8941A] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F4D06F] text-black font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm gap-2"
          data-testid="button-back-home"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
      </div>
      <div 
        style={{ 
          transform: `scale(${scale})`,
          width: '2050px',
          height: '1700px',
          transformOrigin: 'center',
          position: 'relative'
        }}
      >
        <GameCanvas isMobile={false} />
        <GameUI isMobile={false} />
        <SoundManager />
      </div>
      <style>{`
        /* Fundora Blox minimalistic scrollbar styling */
        ::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        ::-webkit-scrollbar-track {
          background: #2a2a2e;
        }
        ::-webkit-scrollbar-thumb {
          background: #444;
          border-radius: 2px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: #00CED1;
        }
        * {
          scrollbar-width: thin;
          scrollbar-color: #444 #2a2a2e;
        }
      `}</style>
    </div>
  );
}