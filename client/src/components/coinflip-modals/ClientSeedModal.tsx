import { memo, useState } from "react";
import { useCoinflip } from "@/lib/stores/useCoinflip";
import { X } from "lucide-react";

interface ClientSeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function ClientSeedModal({ isOpen, onClose }: ClientSeedModalProps) {
  const { clientSeed, setClientSeed } = useCoinflip();
  const [tempSeed, setTempSeed] = useState(clientSeed.toString());
  
  if (!isOpen) return null;
  
  const handleNumberClick = (num: number) => {
    const newSeed = tempSeed + num.toString();
    if (parseInt(newSeed) <= 9999) {
      setTempSeed(newSeed);
    }
  };
  
  const handleClear = () => {
    setTempSeed("");
  };
  
  const handleBackspace = () => {
    setTempSeed(tempSeed.slice(0, -1));
  };
  
  const handleSave = () => {
    const seedValue = parseInt(tempSeed) || 0;
    setClientSeed(Math.min(seedValue, 9999));
    onClose();
  };
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
      <div className="relative w-full max-w-md bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-xl shadow-2xl overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-indigo-800 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors z-10"
        >
          <X size={24} />
        </button>
        
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">NEW CLIENT SEED</h2>
          
          <div className="flex items-center gap-3 mb-4">
            <span className="text-white">Your seed:</span>
            <div className="flex-1 bg-indigo-900 rounded-lg px-4 py-2 text-white font-mono text-center">
              {tempSeed || "0"}
            </div>
            <button
              onClick={handleClear}
              className="px-6 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white font-bold transition-colors"
            >
              CLEAR
            </button>
          </div>
          
          <p className="text-gray-400 text-sm mb-6 text-center">0 - 9999</p>
          
          <div className="bg-indigo-800 bg-opacity-50 rounded-xl p-4">
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-2xl font-bold transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              
              {[4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-2xl font-bold transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="aspect-square rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 hover:from-orange-400 hover:to-orange-500 text-white text-xl font-bold transition-all active:scale-95"
              >
                ⌫
              </button>
              
              {[6, 7, 8].map((num) => (
                <button
                  key={num}
                  onClick={() => handleNumberClick(num)}
                  className="aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-2xl font-bold transition-all active:scale-95"
                >
                  {num}
                </button>
              ))}
              
              <button
                onClick={() => handleNumberClick(9)}
                className="aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-2xl font-bold transition-all active:scale-95"
              >
                9
              </button>
              <button
                onClick={() => handleNumberClick(0)}
                className="aspect-square rounded-2xl bg-gradient-to-br from-indigo-500 to-indigo-600 hover:from-indigo-400 hover:to-indigo-500 text-white text-2xl font-bold transition-all active:scale-95"
              >
                0
              </button>
              <button
                onClick={handleSave}
                className="aspect-square rounded-2xl bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-white text-sm font-bold transition-all active:scale-95"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ClientSeedModal);
