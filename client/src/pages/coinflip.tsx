import { useState, useEffect } from "react";
import { useCoinflip } from "@/lib/stores/useCoinflip";
import { Link } from "wouter";
import { Home, Volume2, VolumeX } from "lucide-react";
import CoinflipGame from "@/components/CoinflipGame";

export default function CoinFlipPage() {
  const { balance } = useCoinflip();
  const [soundEnabled, setSoundEnabled] = useState(true);

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {/* Header */}
      <div className="bg-black/80 border-b border-yellow-600/30 px-4 py-2">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-full text-white text-sm font-medium transition-all duration-200 backdrop-blur-sm border border-white/20">
                <Home className="w-3.5 h-3.5" />
                <span>Home</span>
              </button>
            </Link>
            
            <div className="text-yellow-400 font-bold text-lg">
              COIN FLIP
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Balance Display */}
            <div className="bg-black/60 px-4 py-2 rounded-lg border border-yellow-600/30">
              <div className="text-xs text-gray-400">Balance</div>
              <div className="text-yellow-400 font-bold">
                ${balance.toLocaleString()}
              </div>
            </div>

            {/* Sound Toggle */}
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              data-testid="button-sound-toggle"
            >
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-yellow-400" />
              ) : (
                <VolumeX className="w-5 h-5 text-gray-400" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Game Content */}
      <div className="flex-1 overflow-hidden">
        <CoinflipGame />
      </div>
    </div>
  );
}