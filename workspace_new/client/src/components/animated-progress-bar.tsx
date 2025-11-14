import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface AnimatedProgressBarProps {
  progress: number; // 0-100
  variant?: 'betting' | 'multiplier' | 'cashout' | 'danger';
  showPercentage?: boolean;
  animated?: boolean;
  pulseOnUpdate?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function AnimatedProgressBar({
  progress,
  variant = 'betting',
  showPercentage = false,
  animated = true,
  pulseOnUpdate = true,
  className,
  children
}: AnimatedProgressBarProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (animated) {
      // Smooth animation to new progress value
      const timer = setTimeout(() => {
        setDisplayProgress(progress);
      }, 100);
      return () => clearTimeout(timer);
    } else {
      setDisplayProgress(progress);
    }
  }, [progress, animated]);

  useEffect(() => {
    if (pulseOnUpdate && progress > 0) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 600);
      return () => clearTimeout(timer);
    }
  }, [progress, pulseOnUpdate]);

  const getVariantClasses = () => {
    switch (variant) {
      case 'betting':
        return {
          container: 'bg-casino-dark/50 border border-casino-accent/30',
          fill: 'bg-gradient-to-r from-casino-neon via-casino-gold to-casino-neon',
          glow: 'shadow-lg shadow-casino-neon/30'
        };
      case 'multiplier':
        return {
          container: 'bg-casino-dark/50 border border-casino-green/30',
          fill: 'bg-gradient-to-r from-casino-green via-casino-gold to-casino-green',
          glow: 'shadow-lg shadow-casino-green/30'
        };
      case 'cashout':
        return {
          container: 'bg-casino-dark/50 border border-casino-gold/30',
          fill: 'bg-gradient-to-r from-casino-gold via-yellow-400 to-casino-gold',
          glow: 'shadow-lg shadow-casino-gold/30'
        };
      case 'danger':
        return {
          container: 'bg-casino-dark/50 border border-red-500/30',
          fill: 'bg-gradient-to-r from-red-500 via-red-400 to-red-500',
          glow: 'shadow-lg shadow-red-500/30'
        };
      default:
        return {
          container: 'bg-casino-dark/50 border border-casino-accent/30',
          fill: 'bg-gradient-to-r from-casino-neon to-casino-gold',
          glow: 'shadow-lg shadow-casino-neon/30'
        };
    }
  };

  const variantClasses = getVariantClasses();

  return (
    <div className={cn('relative overflow-hidden rounded-lg h-3', className)}>
      {/* Background container */}
      <div className={cn(
        'absolute inset-0 rounded-lg',
        variantClasses.container
      )} />
      
      {/* Animated fill */}
      <div
        className={cn(
          'h-full rounded-lg transition-all duration-500 ease-out relative overflow-hidden',
          variantClasses.fill,
          animated && 'transition-all duration-500',
          isPulsing && 'animate-pulse',
          displayProgress > 0 && variantClasses.glow
        )}
        style={{ width: `${Math.max(0, Math.min(100, displayProgress))}%` }}
      >
        {/* Shimmer effect */}
        {displayProgress > 0 && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
        )}
        
        {/* Particle effects */}
        {displayProgress > 50 && (
          <div className="absolute inset-0 overflow-hidden">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="absolute w-1 h-1 bg-white rounded-full animate-particle opacity-60"
                style={{
                  left: `${20 + i * 30}%`,
                  animationDelay: `${i * 0.3}s`,
                  animationDuration: '2s'
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Percentage display */}
      {showPercentage && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[8px] font-bold text-white drop-shadow-lg">
            {Math.round(displayProgress)}%
          </span>
        </div>
      )}

      {/* Custom content */}
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// Betting progress component with special effects
export function BettingProgressBar({
  isActive,
  timeRemaining,
  totalTime = 10,
  onComplete,
  className
}: {
  isActive: boolean;
  timeRemaining: number;
  totalTime?: number;
  onComplete?: () => void;
  className?: string;
}) {
  const progress = isActive ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

  useEffect(() => {
    if (progress >= 100 && onComplete) {
      onComplete();
    }
  }, [progress, onComplete]);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center text-[8px]">
        <span className="text-casino-text font-medium">
          {isActive ? 'Betting Phase' : 'Waiting for next round'}
        </span>
        {isActive && (
          <span className="text-casino-neon font-bold">
            {timeRemaining.toFixed(1)}s
          </span>
        )}
      </div>
      
      <AnimatedProgressBar
        progress={progress}
        variant="betting"
        animated={true}
        pulseOnUpdate={true}
        className="h-4"
      >
        {isActive && (
          <div className="flex items-center space-x-2">
            <div style={{width: '2.5px', height: '2.5px'}} className="bg-casino-neon rounded-full animate-ping" />
            <span className="text-[8px] font-bold text-white">
              PLACE YOUR BETS!
            </span>
          </div>
        )}
      </AnimatedProgressBar>
    </div>
  );
}

// Multiplier progress bar for crash game
export function MultiplierProgressBar({
  multiplier,
  maxMultiplier = 10,
  isRunning,
  className
}: {
  multiplier: number;
  maxMultiplier?: number;
  isRunning: boolean;
  className?: string;
}) {
  const progress = Math.min((multiplier / maxMultiplier) * 100, 100);
  const variant = multiplier > 5 ? 'danger' : multiplier > 2 ? 'cashout' : 'multiplier';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex justify-between items-center">
        <span className="text-[8px] text-casino-text">Multiplier Progress</span>
        <span className={cn(
          'text-[10px] font-bold',
          isRunning ? 'text-casino-green animate-pulse' : 'text-casino-text'
        )}>
          {multiplier.toFixed(2)}x
        </span>
      </div>
      
      <AnimatedProgressBar
        progress={progress}
        variant={variant}
        animated={isRunning}
        pulseOnUpdate={isRunning}
        className="h-3"
      />
      
      {progress > 80 && (
        <div className="text-center">
          <span className="text-[8px] text-red-400 font-bold animate-pulse">
            ⚠️ DANGER ZONE ⚠️
          </span>
        </div>
      )}
    </div>
  );
}