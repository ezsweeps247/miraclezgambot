import { memo } from "react";

interface ActionButtonProps {
  icon: string;
  onClick: () => void;
  className?: string;
}

function ActionButton({ icon, onClick, className = "" }: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`touch-feedback relative w-10 h-10 sm:w-11 sm:h-11 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 border-2 sm:border-3 border-yellow-700 shadow-md hover:scale-110 active:scale-95 transition-transform duration-200 flex items-center justify-center text-lg sm:text-xl md:text-2xl ${className}`}
      style={{
        boxShadow: "0 2px 6px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)",
      }}
    >
      <span className="filter drop-shadow-md">{icon}</span>
      
      <div className="absolute inset-0 rounded-full border border-yellow-300 opacity-20" />
    </button>
  );
}

export default memo(ActionButton);
