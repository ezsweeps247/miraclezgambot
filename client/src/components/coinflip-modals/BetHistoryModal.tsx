import { memo, useState } from "react";
import { useCoinflip, type BetHistoryEntry } from "@/lib/stores/useCoinflip";
import { X } from "lucide-react";
import VerificationModal from "./VerificationModal";

interface BetHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function BetHistoryModal({ isOpen, onClose }: BetHistoryModalProps) {
  const betHistory = useCoinflip((state) => state.betHistory);
  const [verifyEntry, setVerifyEntry] = useState<BetHistoryEntry | null>(null);
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70">
      <div className="relative w-full max-w-4xl bg-gradient-to-br from-gray-900 to-black rounded-xl shadow-2xl overflow-hidden border-4 border-yellow-600">
        <div
          className="text-center py-3 text-yellow-400 text-xl font-bold"
          style={{
            background: "linear-gradient(to bottom, #1a1a1a, #000)",
            borderBottom: "2px solid #d4af37",
          }}
        >
          BET HISTORY
        </div>
        
        <button
          onClick={onClose}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-yellow-600 hover:bg-yellow-500 flex items-center justify-center text-white transition-colors z-10"
        >
          <X size={18} />
        </button>
        
        <div className="p-4 overflow-auto max-h-96">
          <table className="w-full">
            <thead>
              <tr className="text-yellow-400 border-b border-gray-700">
                <th className="px-3 py-2 text-left">Time</th>
                <th className="px-3 py-2 text-left">Round</th>
                <th className="px-3 py-2 text-left">Result</th>
                <th className="px-3 py-2 text-left">Total Stake</th>
                <th className="px-3 py-2 text-left">Win</th>
                <th className="px-3 py-2 text-left">Fairness</th>
              </tr>
            </thead>
            <tbody>
              {betHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-500">
                    No bet history yet
                  </td>
                </tr>
              ) : (
                betHistory.map((entry) => (
                  <tr key={entry.id} className="border-b border-gray-800 hover:bg-gray-900">
                    <td className="px-3 py-2 text-gray-300 text-sm">{entry.time}</td>
                    <td className="px-3 py-2 text-gray-300 text-sm">#{entry.round}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${
                          entry.result === "HEADS"
                            ? "bg-blue-600 text-white"
                            : "bg-red-600 text-white"
                        }`}
                      >
                        {entry.result}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-gray-300 text-sm">{entry.totalStake}</td>
                    <td className="px-3 py-2 text-sm">
                      <span
                        className={entry.win > 0 ? "text-green-400 font-bold" : "text-gray-500"}
                      >
                        {entry.win > 0 ? `+${entry.win}` : "0"}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      <button 
                        onClick={() => setVerifyEntry(entry)}
                        className="text-xs bg-indigo-600 hover:bg-indigo-500 px-2 py-1 rounded text-white active:scale-95 transition-transform"
                      >
                        Verify
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        <VerificationModal
          isOpen={!!verifyEntry}
          onClose={() => setVerifyEntry(null)}
          entry={verifyEntry}
        />
      </div>
    </div>
  );
}

export default memo(BetHistoryModal);
