import { memo } from "react";
import { X } from "lucide-react";
import CryptoJS from "crypto-js";
import type { BetHistoryEntry } from "@/lib/stores/useCoinflip";

interface VerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: BetHistoryEntry | null;
}

function VerificationModal({ isOpen, onClose, entry }: VerificationModalProps) {
  if (!isOpen || !entry) return null;
  
  const combined = `${entry.serverSeed}${entry.clientSeed}${entry.round}`;
  const hash = CryptoJS.SHA256(combined).toString();
  const firstChar = hash.charAt(0);
  const numValue = parseInt(firstChar, 16);
  const calculatedResult = numValue % 2 === 0 ? "HEADS" : "TAILS";
  const isValid = calculatedResult === entry.result;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
      <div className="relative w-full max-w-2xl bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-indigo-800 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors z-10"
        >
          <X size={24} />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">FAIRNESS VERIFICATION</h2>
          
          <div className="space-y-4">
            <div className="bg-indigo-800 bg-opacity-50 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">Round Information</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Round ID:</span>
                  <span className="text-white font-mono">#{entry.round}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white">{entry.time}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Your Bet:</span>
                  <span className={`font-bold ${entry.betSide === "HEADS" ? "text-blue-400" : "text-red-400"}`}>
                    {entry.betSide}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Result:</span>
                  <span className={`font-bold ${entry.result === "HEADS" ? "text-blue-400" : "text-red-400"}`}>
                    {entry.result}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-indigo-800 bg-opacity-50 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">Verification Data</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Server Seed (SHA256):</span>
                  <div className="bg-indigo-900 rounded px-3 py-2 mt-1 text-white font-mono text-xs break-all">
                    {entry.serverSeed}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Client Seed:</span>
                  <div className="bg-indigo-900 rounded px-3 py-2 mt-1 text-white font-mono">
                    {entry.clientSeed}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-indigo-800 bg-opacity-50 rounded-lg p-4">
              <h3 className="text-white font-bold mb-2">Hash Calculation</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="text-gray-400">Combined String:</span>
                  <div className="bg-indigo-900 rounded px-3 py-2 mt-1 text-white font-mono text-xs break-all">
                    {combined}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">SHA256 Hash:</span>
                  <div className="bg-indigo-900 rounded px-3 py-2 mt-1 text-white font-mono text-xs break-all">
                    {hash}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">First Hex Character:</span>
                  <div className="bg-indigo-900 rounded px-3 py-2 mt-1 text-white font-mono">
                    {firstChar} = {numValue}
                  </div>
                </div>
                <div>
                  <span className="text-gray-400">Calculation:</span>
                  <div className="bg-indigo-900 rounded px-3 py-2 mt-1 text-white font-mono">
                    {numValue} % 2 = {numValue % 2} → {calculatedResult}
                  </div>
                </div>
              </div>
            </div>
            
            <div className={`rounded-lg p-4 text-center font-bold text-lg ${
              isValid 
                ? "bg-green-600 text-white" 
                : "bg-red-600 text-white"
            }`}>
              {isValid ? "✓ VERIFIED - Result is Fair" : "✗ VERIFICATION FAILED"}
            </div>
            
            <div className="text-xs text-gray-400 text-center">
              The result is calculated by combining the server seed, your client seed, and the round ID,
              then taking the SHA256 hash. The first hexadecimal character determines HEADS (even) or TAILS (odd).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(VerificationModal);
