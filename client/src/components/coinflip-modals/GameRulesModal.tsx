import { memo } from "react";
import { X } from "lucide-react";

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function GameRulesModal({ isOpen, onClose }: GameRulesModalProps) {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-70 overflow-auto">
      <div className="relative w-full max-w-3xl bg-gradient-to-br from-indigo-900 to-indigo-950 rounded-xl shadow-2xl my-8">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-10 h-10 rounded-full bg-indigo-800 hover:bg-indigo-700 flex items-center justify-center text-white transition-colors z-10"
        >
          <X size={24} />
        </button>
        
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          <h2 className="text-3xl font-bold text-white mb-6 text-center">GAME RULES</h2>
          
          <section className="mb-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-3">Introduction</h3>
            <p className="text-gray-300 leading-relaxed">
              Coin Toss is an easy game in which players guess the coin face is Heads or Tails. 
              Players win if the guess is correct.
            </p>
          </section>
          
          <section className="mb-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-3">Game Rules</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300">
              <li>Players select the desired chip value and place it on the available options shown on the game table.</li>
              <li>Heads wins if the coin face is the front side of bitcoin.</li>
              <li>Tails wins if the coin face is the back side of bitcoin.</li>
              <li>Players can only place bets on Heads or Tails in a game round.</li>
              <li>Note that all bets must be placed before betting time expires, and the placed bets cannot be canceled.</li>
              <li>When the betting time expires, the game result will be shown.</li>
            </ul>
          </section>
          
          <section className="mb-6">
            <h3 className="text-xl font-bold text-yellow-400 mb-3">Payouts</h3>
            <p className="text-gray-300 mb-3">
              All winning amounts are instantly added to your account balance when bets are settled.
              The Payouts include the initial stake. The winning amount is calculated according to the betting odds.
            </p>
            
            <div className="bg-indigo-800 bg-opacity-50 rounded-lg overflow-hidden">
              <table className="w-full text-gray-300">
                <thead className="bg-indigo-900">
                  <tr>
                    <th className="px-4 py-3 text-left">Bet Option</th>
                    <th className="px-4 py-3 text-left">Odds</th>
                    <th className="px-4 py-3 text-left">Bet Limit (Min-Max)</th>
                    <th className="px-4 py-3 text-left">Max Total Stake Per Round</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-indigo-700">
                    <td className="px-4 py-2">Heads</td>
                    <td className="px-4 py-2">0.96:1</td>
                    <td className="px-4 py-2">1 - 1,000</td>
                    <td className="px-4 py-2">1,000</td>
                  </tr>
                  <tr className="border-t border-indigo-700">
                    <td className="px-4 py-2">Tails</td>
                    <td className="px-4 py-2">0.96:1</td>
                    <td className="px-4 py-2">1 - 1,000</td>
                    <td className="px-4 py-2">1,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
          
          <section>
            <h3 className="text-xl font-bold text-yellow-400 mb-3">Terms and Conditions</h3>
            <ul className="list-disc list-inside space-y-2 text-gray-300 text-sm">
              <li>
                The Company reserves the right to cancel or void any bets because of a force majeure event 
                including but not limited to any technical errors, network service failures, power failures.
              </li>
              <li>
                The Company reserves the right to cancel or void any bets of players we believe to be involved 
                in fraud, money laundering, or any other form of illegal or suspicious activities.
              </li>
              <li>
                The Company reserves the right to cancel or void any bets when there is an error (caused by human 
                or any other factors), or a system failure resulting in the wrong betting odds.
              </li>
              <li>
                All accepted bets will still be effective even if the member subsequently logs out or is disconnected 
                from the site for any reason.
              </li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

export default memo(GameRulesModal);
