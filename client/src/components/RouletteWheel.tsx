import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
// Using public logo.png for current format

interface RouletteWheelProps {
  isSpinning: boolean;
  winningNumber?: number;
  onSpinComplete?: () => void;
  onSpin?: () => void;
  canSpin?: boolean;
}

// Roulette wheel number sequence (European wheel)
const WHEEL_SEQUENCE = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
];

// Number colors
const NUMBER_COLORS: { [key: number]: string } = {
  0: 'green',
  1: 'red', 2: 'black', 3: 'red', 4: 'black', 5: 'red', 6: 'black', 7: 'red', 8: 'black', 9: 'red', 10: 'black',
  11: 'black', 12: 'red', 13: 'black', 14: 'red', 15: 'black', 16: 'red', 17: 'black', 18: 'red', 19: 'red', 20: 'black',
  21: 'red', 22: 'black', 23: 'red', 24: 'black', 25: 'red', 26: 'black', 27: 'red', 28: 'black', 29: 'black', 30: 'red',
  31: 'black', 32: 'red', 33: 'black', 34: 'red', 35: 'black', 36: 'red'
};

export function RouletteWheel({ isSpinning, winningNumber, onSpinComplete, onSpin, canSpin = false }: RouletteWheelProps) {
  const [wheelRotation, setWheelRotation] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [ballRadius, setBallRadius] = useState(140);
  const [showBall, setShowBall] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate the angle for a specific number on the wheel
  const getNumberAngle = (number: number) => {
    const index = WHEEL_SEQUENCE.indexOf(number);
    return (index / WHEEL_SEQUENCE.length) * 360;
  };

  useEffect(() => {
    if (isSpinning && winningNumber !== undefined && !isAnimating) {
      setIsAnimating(true);
      setShowBall(true);
      
      // Start ball at outer edge spinning fast
      setBallRadius(140);
      setBallAngle(0);
      
      // Calculate final position for the winning number
      const targetAngle = getNumberAngle(winningNumber);
      const randomSpins = 3 + Math.random() * 2; // 3-5 full spins
      const finalWheelRotation = randomSpins * 360 + targetAngle;
      
      // Animate the ball spiraling inward
      const startTime = Date.now();
      const duration = 4000; // 4 seconds total animation
      
      const animateBall = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out function for smooth deceleration
        const easeOut = 1 - Math.pow(1 - progress, 3);
        
        // Ball spins opposite to wheel initially, then slows down
        const ballSpins = (5 - 4 * easeOut) * 360;
        setBallAngle(ballSpins);
        
        // Ball spirals inward
        const startRadius = 140;
        const endRadius = 110;
        const currentRadius = startRadius - (startRadius - endRadius) * easeOut;
        setBallRadius(currentRadius);
        
        if (progress < 1) {
          requestAnimationFrame(animateBall);
        } else {
          // Ball has landed
          setTimeout(() => {
            setIsAnimating(false);
            onSpinComplete?.();
          }, 500);
        }
      };
      
      requestAnimationFrame(animateBall);
      
      // Animate wheel rotation
      setWheelRotation(finalWheelRotation);
    }
  }, [isSpinning, winningNumber]);

  // Continuous counter-clockwise rotation when not spinning
  useEffect(() => {
    if (!isSpinning && !isAnimating) {
      const interval = setInterval(() => {
        setWheelRotation(prev => prev - 0.5);
      }, 16); // ~60fps
      return () => clearInterval(interval);
    }
  }, [isSpinning, isAnimating]);

  return (
    <div className="relative w-full max-w-[400px] mx-auto aspect-square">
      <svg
        viewBox="0 0 320 320"
        className="w-full h-full"
        style={{ filter: 'drop-shadow(0 0 20px rgba(0, 0, 0, 0.5))' }}
      >
        {/* Outer rim */}
        <circle
          cx="160"
          cy="160"
          r="155"
          fill="#8B4513"
          stroke="#654321"
          strokeWidth="2"
        />
        
        {/* Wheel container */}
        <g
          style={{
            transform: `rotate(${wheelRotation}deg)`,
            transformOrigin: '160px 160px',
            transition: isAnimating ? 'transform 4s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none'
          }}
        >
          {/* Number slots */}
          {WHEEL_SEQUENCE.map((number, index) => {
            const angle = (index / WHEEL_SEQUENCE.length) * 360;
            const angleRad = (angle * Math.PI) / 180;
            const nextAngleRad = ((angle + 360 / WHEEL_SEQUENCE.length) * Math.PI) / 180;
            
            const innerRadius = 80;
            const outerRadius = 145;
            
            const x1 = 160 + innerRadius * Math.cos(angleRad - Math.PI / 2);
            const y1 = 160 + innerRadius * Math.sin(angleRad - Math.PI / 2);
            const x2 = 160 + outerRadius * Math.cos(angleRad - Math.PI / 2);
            const y2 = 160 + outerRadius * Math.sin(angleRad - Math.PI / 2);
            const x3 = 160 + outerRadius * Math.cos(nextAngleRad - Math.PI / 2);
            const y3 = 160 + outerRadius * Math.sin(nextAngleRad - Math.PI / 2);
            const x4 = 160 + innerRadius * Math.cos(nextAngleRad - Math.PI / 2);
            const y4 = 160 + innerRadius * Math.sin(nextAngleRad - Math.PI / 2);
            
            const color = NUMBER_COLORS[number];
            const fillColor = color === 'red' ? '#dc2626' : color === 'black' ? '#000000' : '#16a34a';
            
            return (
              <g key={index}>
                {/* Slot background */}
                <path
                  d={`M ${x1} ${y1} L ${x2} ${y2} A ${outerRadius} ${outerRadius} 0 0 1 ${x3} ${y3} L ${x4} ${y4} A ${innerRadius} ${innerRadius} 0 0 0 ${x1} ${y1}`}
                  fill={fillColor}
                  stroke="#FFD700"
                  strokeWidth="1"
                />
                
                {/* Number text */}
                <text
                  x={160 + 112 * Math.cos((angle + 360 / WHEEL_SEQUENCE.length / 2) * Math.PI / 180 - Math.PI / 2)}
                  y={160 + 112 * Math.sin((angle + 360 / WHEEL_SEQUENCE.length / 2) * Math.PI / 180 - Math.PI / 2)}
                  fill="white"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${angle + 360 / WHEEL_SEQUENCE.length / 2} ${160 + 112 * Math.cos((angle + 360 / WHEEL_SEQUENCE.length / 2) * Math.PI / 180 - Math.PI / 2)} ${160 + 112 * Math.sin((angle + 360 / WHEEL_SEQUENCE.length / 2) * Math.PI / 180 - Math.PI / 2)})`}
                >
                  {number}
                </text>
              </g>
            );
          })}
          
          {/* Inner decorative circle */}
          <circle
            cx="160"
            cy="160"
            r="75"
            fill="#8B4513"
            stroke="#D4AF37"
            strokeWidth="2"
          />
          
          {/* Center cone - now clickable spin button with company logo */}
          <g
            onClick={onSpin}
            style={{ cursor: canSpin && !isSpinning ? 'pointer' : 'not-allowed' }}
          >
            {/* Circular mask for logo */}
            <defs>
              <clipPath id="circularClip">
                <circle cx="160" cy="160" r="40" />
              </clipPath>
            </defs>
            
            {/* Background circle for logo */}
            <circle
              cx="160"
              cy="160"
              r="40"
              fill="#1a1d1e"
              stroke="#D4AF37"
              strokeWidth="2"
            />
            
            {/* Company logo image - circular with black background trimmed */}
            <image
              href="/miraclez-logo.png"
              x="120"
              y="120"
              width="80"
              height="80"
              clipPath="url(#circularClip)"
              style={{
                opacity: canSpin && !isSpinning ? 1 : 0.5,
                filter: canSpin && !isSpinning ? 'drop-shadow(0 0 10px rgba(212, 175, 55, 0.8))' : 'grayscale(100%)',
                transition: 'all 0.3s ease'
              }}
            />
            
            {/* Overlay text for spinning state */}
            {isSpinning && (
              <text
                x="160"
                y="160"
                fill="#FFF"
                fontSize="16"
                fontWeight="bold"
                textAnchor="middle"
                dominantBaseline="middle"
                style={{ userSelect: 'none' }}
              >
                ...
              </text>
            )}
          </g>
        </g>
        
        {/* Ball track */}
        <circle
          cx="160"
          cy="160"
          r="150"
          fill="none"
          stroke="#654321"
          strokeWidth="1"
          opacity="0.3"
        />
        
        {/* Ball */}
        {showBall && (
          <circle
            cx={160 + ballRadius * Math.cos(ballAngle * Math.PI / 180 - Math.PI / 2)}
            cy={160 + ballRadius * Math.sin(ballAngle * Math.PI / 180 - Math.PI / 2)}
            r="6"
            fill="#FFFFFF"
            stroke="#888888"
            strokeWidth="1"
            style={{
              filter: 'drop-shadow(2px 2px 2px rgba(0, 0, 0, 0.5))',
              transition: 'none'
            }}
          />
        )}
        
        {/* "Press to Spin" text on outer rim */}
        {!isSpinning && canSpin && (
          <g>
            {Array.from("press to spin.").map((letter, index) => {
              const totalLetters = "press to spin.".length;
              const anglePerLetter = 280 / totalLetters; // Spread across 280 degrees
              const angle = (index * anglePerLetter - 140) * (Math.PI / 180); // Start at top-left
              const radius = 170; // Distance from center - outside the wheel
              const x = 160 + radius * Math.cos(angle);
              const y = 160 + radius * Math.sin(angle);
              
              return (
                <text
                  key={index}
                  x={x}
                  y={y}
                  fill="#D4AF37"
                  fontSize="12"
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  transform={`rotate(${(angle * 180 / Math.PI) + 90} ${x} ${y})`}
                  style={{ 
                    userSelect: 'none',
                    filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.8))',
                    textTransform: 'uppercase'
                  }}
                >
                  {letter === " " ? "" : letter}
                </text>
              );
            })}
          </g>
        )}

        {/* Deflectors (diamonds) */}
        {[0, 45, 90, 135, 180, 225, 270, 315].map(angle => {
          const radius = 155;
          const x = 160 + radius * Math.cos(angle * Math.PI / 180);
          const y = 160 + radius * Math.sin(angle * Math.PI / 180);
          return (
            <rect
              key={angle}
              x={x - 4}
              y={y - 4}
              width="8"
              height="8"
              fill="#FFD700"
              transform={`rotate(45 ${x} ${y})`}
            />
          );
        })}
      </svg>
      
      {/* Winning number display */}
      {winningNumber !== undefined && !isAnimating && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className={cn(
            "px-4 py-2 rounded-lg font-bold text-white text-[10px] animate-pulse",
            NUMBER_COLORS[winningNumber] === 'red' ? 'bg-red-600' :
            NUMBER_COLORS[winningNumber] === 'black' ? 'bg-black' :
            'bg-green-600'
          )}>
            {winningNumber}
          </div>
        </div>
      )}
    </div>
  );
}