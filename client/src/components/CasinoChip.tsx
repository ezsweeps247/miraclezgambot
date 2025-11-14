import { memo } from "react";

interface CasinoChipProps {
  value: number;
  selected?: boolean;
  onClick?: () => void;
}

const chipColors: Record<number, { primary: string; secondary: string; text: string; border: string }> = {
  1: {
    primary: "linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #f5f5f5 100%)",
    secondary: "linear-gradient(45deg, #ffd700, #ffed4e, #ffd700, #ff6b6b, #9b59b6)",
    text: "#333",
    border: "#d4af37",
  },
  5: {
    primary: "linear-gradient(135deg, #4a90e2 0%, #357abd 50%, #5ca3ef 100%)",
    secondary: "#2a5f8f",
    text: "#fff",
    border: "#1e4d7a",
  },
  10: {
    primary: "linear-gradient(135deg, #9e9e9e 0%, #757575 50%, #b0b0b0 100%)",
    secondary: "#616161",
    text: "#fff",
    border: "#424242",
  },
  50: {
    primary: "linear-gradient(135deg, #4caf50 0%, #388e3c 50%, #66bb6a 100%)",
    secondary: "#2e7d32",
    text: "#fff",
    border: "#1b5e20",
  },
  100: {
    primary: "linear-gradient(135deg, #ff9800 0%, #f57c00 50%, #ffb74d 100%)",
    secondary: "#e65100",
    text: "#fff",
    border: "#bf360c",
  },
  200: {
    primary: "linear-gradient(135deg, #e91e63 0%, #c2185b 50%, #f06292 100%)",
    secondary: "#ad1457",
    text: "#fff",
    border: "#880e4f",
  },
  500: {
    primary: "linear-gradient(135deg, #2196f3 0%, #1976d2 50%, #42a5f5 100%)",
    secondary: "#0d47a1",
    text: "#ffd700",
    border: "#01579b",
  },
  1000: {
    primary: "linear-gradient(135deg, #00bcd4 0%, #0097a7 50%, #26c6da 100%)",
    secondary: "#006064",
    text: "#fff",
    border: "#004d40",
  },
};

function CasinoChip({ value, selected = false, onClick }: CasinoChipProps) {
  const colors = chipColors[value] || chipColors[1];
  const displayValue = value >= 1000 ? `${value / 1000}K` : value;
  
  return (
    <div
      onClick={onClick}
      className={`touch-feedback relative flex items-center justify-center cursor-pointer transition-all duration-200 flex-shrink-0 ${
        selected ? "scale-110" : "scale-100 hover:scale-105 active:scale-95"
      } w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-[70px] lg:h-[70px]`}
      style={{
        filter: selected ? "drop-shadow(0 0 8px rgba(255, 215, 0, 0.8))" : "drop-shadow(0 2px 3px rgba(0, 0, 0, 0.3))",
      }}
    >
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: colors.primary,
          border: `2px solid ${colors.border}`,
        }}
      />
      
      <div
        className="absolute inset-[6px] sm:inset-[7px] md:inset-[8px] rounded-full flex items-center justify-center"
        style={{
          background: colors.secondary,
          border: "1px solid rgba(255, 255, 255, 0.3)",
        }}
      >
        <span
          className="font-bold text-xs sm:text-sm md:text-base lg:text-xl"
          style={{ color: colors.text, textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)" }}
        >
          {displayValue}
        </span>
      </div>
      
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <div
          key={angle}
          className="absolute w-0.5 h-0.5 sm:w-1 sm:h-1 rounded-full bg-white opacity-50"
          style={{
            transform: `rotate(${angle}deg) translateY(-18px)`,
          }}
        />
      ))}
    </div>
  );
}

export default memo(CasinoChip);
