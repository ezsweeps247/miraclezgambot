import { useState, useEffect, memo } from "react";
import { useCoinflip } from "@/lib/stores/useCoinflip";
import CasinoChip from "./CasinoChip";
import ActionButton from "./ActionButton";
import ResultsHistory from "./ResultsHistory";
import ProvablyFairModal from "./coinflip-modals/ProvablyFairModal";
import ClientSeedModal from "./coinflip-modals/ClientSeedModal";
import BetHistoryModal from "./coinflip-modals/BetHistoryModal";
import GameRulesModal from "./coinflip-modals/GameRulesModal";
import { useAudio } from "@/lib/stores/useAudio";

const chipValues = [1, 5, 10, 50, 100, 200, 500, 1000];

function CoinflipGame() {
  const {
    phase,
    currentBet,
    selectedChip,
    betSide,
    headsTotal,
    tailsTotal,
    countdown,
    currentRound,
    balance,
    selectChip,
    placeBet,
    cancelBet,
    setPhase,
    setCountdown,
    calculateResult,
    addBetToHistory,
    resetForNewRound,
    serverSeed,
    clientSeed,
  } = useCoinflip();
  
  const { playHit, playSuccess } = useAudio();
  
  const [showFairModal, setShowFairModal] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [result, setResult] = useState<"HEADS" | "TAILS" | null>(null);
  const [showHand, setShowHand] = useState(false);
  
  useEffect(() => {
    if (phase === "betting") {
      const timer = setInterval(() => {
        const newCountdown = countdown - 1;
        if (newCountdown <= 0) {
          clearInterval(timer);
          if (currentBet > 0) {
            setPhase("flipping");
          } else {
            resetForNewRound();
          }
          setCountdown(0);
        } else {
          setCountdown(newCountdown);
        }
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [phase, currentBet, countdown, setCountdown, setPhase, resetForNewRound]);
  
  useEffect(() => {
    if (phase === "flipping") {
      setShowHand(true);
      playHit();
      
      setTimeout(() => {
        setIsFlipping(true);
        
        setTimeout(() => {
          const gameResult = calculateResult();
          setResult(gameResult);
          setIsFlipping(false);
          setShowHand(false);
          
          const won = gameResult === betSide;
          const winAmount = won ? Math.floor(currentBet * 1.96) : 0;
          
          if (won) {
            playSuccess();
          }
          
          addBetToHistory({
            id: Date.now().toString(),
            time: new Date().toLocaleTimeString(),
            round: currentRound,
            result: gameResult,
            totalStake: currentBet,
            win: winAmount,
            serverSeed,
            clientSeed,
            betSide: betSide!,
          });
          
          setTimeout(() => {
            setResult(null);
            resetForNewRound();
          }, 3000);
        }, 2000);
      }, 500);
    }
  }, [phase]);
  
  const totalBets = headsTotal + tailsTotal || 1;
  const headsPercent = Math.round((headsTotal / totalBets) * 100);
  const tailsPercent = Math.round((tailsTotal / totalBets) * 100);
  
  const handleChipSelect = (value: number) => {
    playHit();
    selectChip(value);
  };
  
  const handlePlaceBet = (side: "HEADS" | "TAILS") => {
    if (phase === "betting") {
      const prevBet = currentBet;
      placeBet(side);
      if (currentBet !== prevBet) {
        playHit();
      }
    }
  };
  
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      <div className="flex-1 flex flex-col p-1 sm:p-2 md:p-3 overflow-hidden">
        <ResultsHistory />
        
        <div className="flex-1 relative rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden min-h-0"
          style={{
            background: "linear-gradient(90deg, rgba(30, 58, 138, 0.8) 0%, rgba(30, 58, 138, 0.9) 40%, rgba(127, 29, 29, 0.9) 60%, rgba(127, 29, 29, 0.8) 100%)",
            border: "2px solid #d4af37",
          }}
        >
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900" />
            <div className="flex-1 bg-gradient-to-br from-red-900 via-red-800 to-red-950" />
          </div>
          
          <div className="relative h-full flex flex-col">
            <div className="absolute top-1 sm:top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-30">
              <div 
                key={countdown}
                className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-yellow-400 countdown-timer"
                style={{
                  textShadow: "0 0 15px rgba(251, 191, 36, 0.8), 0 0 30px rgba(251, 191, 36, 0.4)",
                }}
              >
                {countdown.toString().padStart(2, "0")}
              </div>
            </div>
            
            <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 py-1 sm:py-2">
              <div className="text-yellow-300 font-bold text-base sm:text-lg md:text-xl lg:text-2xl drop-shadow-lg">
                {headsTotal.toLocaleString()}
              </div>
              <div className="text-yellow-300 font-bold text-base sm:text-lg md:text-xl lg:text-2xl drop-shadow-lg">
                {tailsTotal.toLocaleString()}
              </div>
            </div>
            
            <div className="flex-1 flex items-center justify-center gap-2 sm:gap-3 md:gap-4 lg:gap-8 px-2 sm:px-3 md:px-4">
              <div
                className="touch-feedback relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95"
                onClick={() => handlePlaceBet("HEADS")}
                style={{
                  background: "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)",
                  border: "3px solid #60a5fa",
                  boxShadow: betSide === "HEADS" ? "0 0 15px rgba(59, 130, 246, 0.8)" : "0 2px 8px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-0 sm:mb-1">₿</div>
                  <div className="text-white font-bold text-[10px] sm:text-xs md:text-sm">HEADS</div>
                  <div className="text-white text-[9px] sm:text-[10px] md:text-xs">0.96:1</div>
                </div>
              </div>
              
              {showHand && (
                <div className="absolute top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-4xl sm:text-6xl md:text-7xl lg:text-8xl animate-bounce z-10">
                  👋
                </div>
              )}
              
              {isFlipping && (
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-yellow-400 animate-spin"
                    style={{
                      background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 50%, #fbbf24 100%)",
                      boxShadow: "0 0 15px rgba(251, 191, 36, 0.8)",
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center text-2xl sm:text-3xl md:text-4xl">
                      ₿
                    </div>
                  </div>
                </div>
              )}
              
              {result && !isFlipping && (
                <div className="absolute top-1/3 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20">
                  <div className={`text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold ${result === "HEADS" ? "text-blue-400" : "text-red-400"} animate-pulse`}>
                    {result}!
                  </div>
                </div>
              )}
              
              <div
                className="touch-feedback relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-40 lg:h-40 xl:w-48 xl:h-48 rounded-full cursor-pointer transition-transform hover:scale-105 active:scale-95"
                onClick={() => handlePlaceBet("TAILS")}
                style={{
                  background: "linear-gradient(135deg, #7f1d1d 0%, #ef4444 100%)",
                  border: "3px solid #f87171",
                  boxShadow: betSide === "TAILS" ? "0 0 15px rgba(239, 68, 68, 0.8)" : "0 2px 8px rgba(0, 0, 0, 0.5)",
                }}
              >
                <div className="absolute inset-0 rounded-full flex flex-col items-center justify-center">
                  <div className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-0 sm:mb-1">₿</div>
                  <div className="text-white font-bold text-[10px] sm:text-xs md:text-sm">TAILS</div>
                  <div className="text-white text-[9px] sm:text-[10px] md:text-xs">0.96:1</div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 sm:gap-3 md:gap-4 px-2 sm:px-3 md:px-4 py-1 sm:py-2 md:py-3">
              <div className="text-white text-xs sm:text-sm">#{currentRound}</div>
            </div>
            
            <div className="flex items-center justify-between px-2 sm:px-3 md:px-4 pb-1 sm:pb-2 md:pb-3">
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="text-white text-xs sm:text-sm">{headsPercent}%</div>
                <div className="flex gap-0.5 sm:gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full ${i < (headsTotal > 0 ? 3 : 0) ? "bg-blue-500" : "bg-gray-600"}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <div className="flex gap-0.5 sm:gap-1">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`w-2 h-2 sm:w-2.5 sm:h-2.5 md:w-3 md:h-3 rounded-full ${i < (tailsTotal > 0 ? 3 : 0) ? "bg-red-500" : "bg-gray-600"}`} />
                  ))}
                </div>
                <div className="text-white text-xs sm:text-sm">{tailsPercent}%</div>
              </div>
            </div>
          </div>
          
          <div className="absolute top-20 sm:top-32 md:top-48 lg:top-56 left-2 sm:left-3 md:left-4 flex flex-col gap-1 sm:gap-2">
            <ActionButton icon="📊" onClick={() => setShowHistoryModal(true)} />
            <ActionButton icon="⚖️" onClick={() => setShowFairModal(true)} />
          </div>
          
          <div className="absolute top-20 sm:top-32 md:top-48 lg:top-56 right-2 sm:right-3 md:right-4 flex flex-col gap-1 sm:gap-2">
            <ActionButton icon="❌" onClick={cancelBet} />
            <ActionButton icon="❓" onClick={() => setShowRulesModal(true)} />
          </div>
        </div>
        
        <div className="mt-1 sm:mt-2 md:mt-3 bg-black bg-opacity-50 rounded-lg sm:rounded-xl p-2 sm:p-2.5 md:p-3 border-2 border-yellow-500">
          <div className="flex items-center gap-1 sm:gap-2 md:gap-3 overflow-x-auto pb-1 sm:pb-2 scrollbar-thin scrollbar-thumb-yellow-600 scrollbar-track-gray-900">
            <button className="text-yellow-400 text-lg sm:text-xl md:text-2xl flex-shrink-0">◀</button>
            <div className="flex gap-1 sm:gap-2 md:gap-3">
              {chipValues.map(value => (
                <CasinoChip
                  key={value}
                  value={value}
                  selected={selectedChip === value}
                  onClick={() => handleChipSelect(value)}
                />
              ))}
            </div>
            <button className="text-yellow-400 text-lg sm:text-xl md:text-2xl flex-shrink-0">▶</button>
          </div>
          
          <div className="mt-1 sm:mt-1.5 md:mt-2 flex items-center justify-between text-white text-xs sm:text-sm">
            <div>Balance: <span className="text-yellow-400 font-bold">{balance}</span></div>
            <div>Bet: <span className="text-green-400 font-bold">{currentBet}</span></div>
          </div>
        </div>
      </div>
      
      <ProvablyFairModal
        isOpen={showFairModal}
        onClose={() => setShowFairModal(false)}
        onOpenClientSeed={() => {
          setShowFairModal(false);
          setShowSeedModal(true);
        }}
      />
      
      <ClientSeedModal
        isOpen={showSeedModal}
        onClose={() => setShowSeedModal(false)}
      />
      
      <BetHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />
      
      <GameRulesModal
        isOpen={showRulesModal}
        onClose={() => setShowRulesModal(false)}
      />
    </div>
  );
}

export default memo(CoinflipGame);
