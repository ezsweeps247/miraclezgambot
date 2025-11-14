import { memo, useState } from "react";
import { useCoinflip } from "@/lib/stores/useCoinflip";
import { X, Copy, HelpCircle } from "lucide-react";

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenClientSeed: () => void;
}

function ProvablyFairModal({ isOpen, onClose, onOpenClientSeed }: ProvablyFairModalProps) {
  const [copied, setCopied] = useState(false);
  const { serverSeed, clientSeed, useRandomSeed, setUseRandomSeed } = useCoinflip();
  
  if (!isOpen) return null;
  
  const handleCopy = () => {
    navigator.clipboard.writeText(serverSeed);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
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
          <div className="flex items-center gap-2 mb-4">
            <h2 className="text-2xl font-bold text-white">PROVABLY FAIR SETTINGS</h2>
            <HelpCircle size={20} className="text-gray-400" />
          </div>
          
          <p className="text-gray-300 text-sm mb-4">
            The final result is determined by combining the Server Seed, your Client Seed, and the Round ID using SHA256 hashing.
          </p>
          
          <p className="text-gray-300 text-sm mb-6">
            You can change your Client Seed value at any time and verify the fairness of any game result from Bet History by clicking the "Verify" button.
          </p>
          
          <div className="bg-indigo-800 bg-opacity-50 rounded-lg p-6 mb-6">
            <h3 className="text-white font-bold text-lg mb-4">CLIENT SEED</h3>
            
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={useRandomSeed}
                  onChange={() => setUseRandomSeed(true)}
                  className="w-5 h-5 accent-orange-500"
                />
                <span className="text-white">Random</span>
                <div className="flex-1 bg-indigo-900 rounded-full px-4 py-2 text-center text-white font-mono">
                  {clientSeed}
                </div>
              </label>
              
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  checked={!useRandomSeed}
                  onChange={() => setUseRandomSeed(false)}
                  className="w-5 h-5 accent-orange-500"
                />
                <span className="text-white">Manual input</span>
                <div className="flex-1 bg-indigo-900 rounded-full px-4 py-2 text-center text-gray-500">
                  {!useRandomSeed ? clientSeed : ""}
                </div>
                <button
                  onClick={onOpenClientSeed}
                  className="px-6 py-2 rounded-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-bold transition-all"
                >
                  CHANGE
                </button>
              </label>
            </div>
          </div>
          
          <div>
            <h3 className="text-white font-bold text-sm mb-2">SERVER SEED SHA256</h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-indigo-800 bg-opacity-50 rounded-lg px-4 py-3 text-white font-mono text-xs break-all">
                {serverSeed}
              </div>
              <button
                onClick={handleCopy}
                className="p-3 rounded-lg bg-purple-600 hover:bg-purple-500 transition-colors"
              >
                {copied ? (
                  <span className="text-white text-xs">✓</span>
                ) : (
                  <Copy size={18} className="text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ProvablyFairModal);
