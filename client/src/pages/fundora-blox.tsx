import { useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGameMode } from "@/contexts/GameModeContext";
import { useFundoraBloxStore, EndGameData } from "@/lib/stores/fundora-blox-store";
import { GameCanvas } from "@/components/fundora-blox/GameCanvas";
import { GameUI } from "@/components/fundora-blox/GameUI";
import { SoundManager } from "@/components/fundora-blox/SoundManager";

export default function FundoraBlox() {
  const { toast } = useToast();
  const { gameMode } = useGameMode();
  
  const phase = useFundoraBloxStore(state => state.phase);
  const stake = useFundoraBloxStore(state => state.stake);
  const startGame = useFundoraBloxStore(state => state.start);
  
  // Get user balance
  const { data: balance } = useQuery<{ 
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
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to start game",
        description: error.message || "Please try again",
      });
      useFundoraBloxStore.getState().restart();
    },
  });

  // End game mutation - ALWAYS called for ALL games (FREE, paid, win, loss)
  const endGameMutation = useMutation({
    mutationFn: async (data: EndGameData) => {
      const response = await apiRequest("POST", "/api/fundora-blox/end", data);
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

  // Create end callback that ALWAYS calls the API
  const createEndCallback = useCallback(() => {
    return async (data: EndGameData) => {
      await endGameMutation.mutateAsync(data);
    };
  }, [endGameMutation]);

  // Handle start button click from GameUI
  const handleStart = useCallback(async () => {
    const endCallback = createEndCallback();
    
    if (stake === 'FREE') {
      // Start game immediately for FREE mode
      startGame(endCallback);
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
        startGame(endCallback);
      } catch (error) {
        // Error handled in mutation
      }
    }
  }, [stake, balance, createEndCallback, startGame, startGameMutation, toast]);

  // Make handleStart available to GameUI through the store
  // We need to attach it as a click handler to the START button
  // For now, the GameUI component will handle the button, but we need to make this function available
  
  // Update: We'll use a different approach - pass the handler through a custom event or context
  // For simplicity, we'll modify GameUI to access these functions directly
  
  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      position: 'relative', 
      overflow: 'hidden',
      background: '#f8f8f8'
    }}>
      <GameCanvas />
      <GameUI />
      <SoundManager />
    </div>
  );
}
