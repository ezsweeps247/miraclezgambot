import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';

export type GameMode = 'real' | 'fun';

interface GameModeContextType {
  gameMode: GameMode;
  setGameMode: (mode: GameMode) => void;
  toggleGameMode: () => void;
}

const GameModeContext = createContext<GameModeContextType | undefined>(undefined);

interface GameModeProviderProps {
  children: ReactNode;
}

interface BalanceData {
  balanceMode: 'GC' | 'SC';
}

export function GameModeProvider({ children }: GameModeProviderProps) {
  const [gameMode, setGameMode] = useState<GameMode>('fun'); // Default to fun mode

  // Fetch balance data to sync with backend balanceMode
  const { data: balance } = useQuery<BalanceData>({
    queryKey: ['/api/balance'],
    staleTime: 1000,
    refetchInterval: 3000,
  });

  // Sync gameMode with balanceMode from API: GC='fun', SC='real'
  useEffect(() => {
    if (balance?.balanceMode) {
      const newMode = balance.balanceMode === 'SC' ? 'real' : 'fun';
      setGameMode(newMode);
    }
  }, [balance?.balanceMode]);

  const toggleGameMode = () => {
    setGameMode(prev => prev === 'real' ? 'fun' : 'real');
  };

  return (
    <GameModeContext.Provider value={{ gameMode, setGameMode, toggleGameMode }}>
      {children}
    </GameModeContext.Provider>
  );
}

export function useGameMode() {
  const context = useContext(GameModeContext);
  if (context === undefined) {
    throw new Error('useGameMode must be used within a GameModeProvider');
  }
  return context;
}