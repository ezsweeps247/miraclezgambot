import { memo, useMemo } from "react";
import { useCoinflip, type GameSide } from "@/lib/stores/useCoinflip";

function ResultsHistory() {
  const gameHistory = useCoinflip((state) => state.gameHistory);
  
  const { headsCount, tailsCount, headsPercentage, tailsPercentage } = useMemo(() => {
    const headsCount = gameHistory.filter(result => result === "HEADS").length;
    const tailsCount = gameHistory.filter(result => result === "TAILS").length;
    const total = headsCount + tailsCount || 1;
    
    return {
      headsCount,
      tailsCount,
      headsPercentage: Math.round((headsCount / total) * 100),
      tailsPercentage: Math.round((tailsCount / total) * 100),
    };
  }, [gameHistory]);
  
  const displayHistory = gameHistory.slice(0, 60);
  
  const rows = 3;
  const cols = 20;
  const gridItems: (GameSide | null)[] = Array(rows * cols).fill(null);
  
  displayHistory.forEach((result, index) => {
    if (index < gridItems.length) {
      gridItems[index] = result;
    }
  });
  
  return (
    <div className="w-full bg-gradient-to-r from-gray-900 to-gray-800 rounded-lg sm:rounded-xl p-2 sm:p-3 md:p-4 mb-2 sm:mb-3 md:mb-4 border sm:border-2 border-yellow-500">
      <div className="flex items-stretch gap-1 sm:gap-2 md:gap-3">
        <div className="flex flex-col justify-center gap-0.5 sm:gap-1">
          <div className="bg-gradient-to-r from-blue-700 to-blue-900 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded text-white font-bold text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
            HEADS<br/>{headsPercentage}%
          </div>
          <div className="bg-gradient-to-r from-red-700 to-red-900 px-1.5 sm:px-2 md:px-3 py-0.5 sm:py-1 md:py-1.5 rounded text-white font-bold text-[10px] sm:text-xs md:text-sm whitespace-nowrap">
            TAILS<br/>{tailsPercentage}%
          </div>
        </div>
        
        <div className="flex-1 relative overflow-hidden rounded"
          style={{
            background: "linear-gradient(to right, rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.5))",
            backgroundImage: `
              repeating-linear-gradient(
                0deg,
                rgba(100, 100, 100, 0.1) 0px,
                rgba(100, 100, 100, 0.1) 1px,
                transparent 1px,
                transparent 100%
              ),
              repeating-linear-gradient(
                90deg,
                rgba(100, 100, 100, 0.1) 0px,
                rgba(100, 100, 100, 0.1) 1px,
                transparent 1px,
                transparent 100%
              )
            `,
            backgroundSize: `${100 / cols}% ${100 / rows}%`,
          }}
        >
          <div className="grid gap-0 h-10 sm:h-[50px] md:h-[60px]" style={{
            gridTemplateColumns: `repeat(${cols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}>
            {gridItems.map((result, index) => (
              <div key={index} className="flex items-center justify-center p-0.5">
                {result && (
                  <div
                    className={`rounded-full w-full h-full ${
                      result === "HEADS" ? "bg-blue-500" : "bg-red-500"
                    }`}
                    style={{
                      boxShadow: result === "HEADS" 
                        ? "0 0 4px rgba(59, 130, 246, 0.8)" 
                        : "0 0 4px rgba(239, 68, 68, 0.8)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(ResultsHistory);
