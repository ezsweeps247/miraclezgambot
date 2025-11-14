import { useState, useRef } from 'react';
import { Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import miraclezLogo from '@assets/miraclez rogo_1759616620896.png';

interface WheelSpinnerProps {
  onSpin: () => void;
  isSpinning: boolean;
  disabled?: boolean;
}

// Prize segments with colors
const segments = [
  { label: '25 GC', color: '#FFD700', textColor: '#000' },
  { label: '1 SC', color: '#9333EA', textColor: '#fff' },
  { label: '50 GC', color: '#FFA500', textColor: '#000' },
  { label: '2 SC', color: '#7C3AED', textColor: '#fff' },
  { label: '100 GC', color: '#FF8C00', textColor: '#000' },
  { label: '5 SC', color: '#6D28D9', textColor: '#fff' },
  { label: '250 GC', color: '#FF7F00', textColor: '#000' },
  { label: '10 SC', color: '#5B21B6', textColor: '#fff' },
  { label: '500 GC', color: '#D4AF37', textColor: '#000' },
  { label: '25 SC', color: '#4C1D95', textColor: '#fff' },
];

export function WheelSpinner({ onSpin, isSpinning, disabled }: WheelSpinnerProps) {
  const [rotation, setRotation] = useState(0);
  const [localSpinning, setLocalSpinning] = useState(false);
  const wheelRef = useRef<SVGSVGElement>(null);

  const handleSpin = () => {
    if (disabled || localSpinning) return;
    
    // Set local spinning state before rotation to ensure correct animation timing
    setLocalSpinning(true);
    
    // Exactly 10 full revolutions + random offset for final position
    const spins = 10;
    const randomDegree = Math.random() * 360;
    const totalRotation = (rotation % 360) + (spins * 360) + randomDegree;
    
    setRotation(totalRotation);
    onSpin();
    
    // Reset local spinning after animation completes (5 seconds)
    setTimeout(() => {
      setLocalSpinning(false);
    }, 5000);
  };

  const segmentAngle = 360 / segments.length;
  const radius = 125;
  const centerX = 150;
  const centerY = 150;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Wheel Container */}
      <div className="relative">
        {/* Pointer at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[16px] border-r-[16px] border-t-[32px] border-l-transparent border-r-transparent border-t-[#D4AF37]" />
        </div>

        {/* Wheel SVG */}
        <svg
          ref={wheelRef}
          width="300"
          height="300"
          viewBox="0 0 300 300"
          className={`transition-transform ${
            localSpinning ? 'duration-[5000ms]' : 'duration-200'
          } ${disabled ? 'opacity-50' : ''}`}
          style={{ 
            transform: `rotate(${rotation}deg)`,
            transitionTimingFunction: localSpinning ? 'cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'ease'
          }}
        >
          {/* Outer ring */}
          <circle
            cx={centerX}
            cy={centerY}
            r={radius + 10}
            fill="none"
            stroke="#D4AF37"
            strokeWidth="5"
          />

          {/* Segments */}
          {segments.map((segment, index) => {
            const startAngle = (index * segmentAngle - 90) * (Math.PI / 180);
            const endAngle = ((index + 1) * segmentAngle - 90) * (Math.PI / 180);
            
            const x1 = centerX + radius * Math.cos(startAngle);
            const y1 = centerY + radius * Math.sin(startAngle);
            const x2 = centerX + radius * Math.cos(endAngle);
            const y2 = centerY + radius * Math.sin(endAngle);

            const midAngle = (startAngle + endAngle) / 2;
            const textRadius = radius * 0.7;
            const textX = centerX + textRadius * Math.cos(midAngle);
            const textY = centerY + textRadius * Math.sin(midAngle);
            
            // Calculate rotation angle for text to be radial
            const textRotation = (midAngle * 180 / Math.PI) + 90;

            return (
              <g key={index}>
                <path
                  d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2} Z`}
                  fill={segment.color}
                  stroke="#1a1a1a"
                  strokeWidth="2"
                />
                <text
                  x={textX}
                  y={textY}
                  fill={segment.textColor}
                  fontSize="14"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${textRotation}, ${textX}, ${textY})`}
                >
                  {segment.label}
                </text>
              </g>
            );
          })}

          {/* Pegs around the wheel */}
          {Array.from({ length: segments.length }).map((_, index) => {
            const pegAngle = (index * segmentAngle - 90) * (Math.PI / 180);
            const pegX = centerX + (radius + 10) * Math.cos(pegAngle);
            const pegY = centerY + (radius + 10) * Math.sin(pegAngle);
            
            return (
              <circle
                key={`peg-${index}`}
                cx={pegX}
                cy={pegY}
                r="6"
                fill="#1a1a1a"
                stroke="#D4AF37"
                strokeWidth="2"
              />
            );
          })}

          {/* Center circle with Miraclez logo */}
          <circle cx={centerX} cy={centerY} r="30" fill="#1a1a1a" stroke="#D4AF37" strokeWidth="4" />
          <image
            href={miraclezLogo}
            x={centerX - 25}
            y={centerY - 25}
            width="50"
            height="50"
            clipPath="circle(25px at 25px 25px)"
          />
        </svg>

        {/* Glow effect when disabled/spinning */}
        {localSpinning && (
          <div className="absolute inset-0 rounded-full bg-[#D4AF37]/20 blur-xl animate-pulse" />
        )}
      </div>

      {/* Spin Button */}
      <Button
        onClick={handleSpin}
        disabled={disabled || localSpinning}
        className="h-8 px-6 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90 disabled:opacity-50 disabled:cursor-not-allowed font-semibold text-sm"
        data-testid="button-spin-wheel"
      >
        <Zap className="w-4 h-4 mr-1" />
        {localSpinning ? 'Spinning...' : disabled ? 'Already Spun' : 'SPIN'}
      </Button>
    </div>
  );
}
