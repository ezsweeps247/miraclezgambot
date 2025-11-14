import React from 'react';
import { useGame } from '@/lib/stores/useGame';
import { GameFeed } from './GameFeed';

interface GameStatsProps {
  scale?: number;
  fontSize?: number;
}

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

function DisplayBox({ label, value, unit, scale = 1 }: { label: string; value: string; unit: string; scale?: number }) {
  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.06)',
      backdropFilter: 'blur(12px) saturate(180%)',
      border: `${Math.max(1.5, 2 * scale)}px solid rgba(255, 255, 255, 0.12)`,
      borderRadius: `${8 * scale}px`,
      padding: `${5 * scale}px ${7 * scale}px`,
      minWidth: `${150 * scale}px`,
      boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.3)',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div style={{
        fontSize: `${9 * scale}px`,
        fontWeight: '900',
        color: '#fff',
        marginBottom: `${2.5 * scale}px`,
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
      }}>
        {label}
      </div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: `${4 * scale}px`
      }}>
        <div style={{
          fontSize: `${20 * scale}px`,
          fontWeight: 'bold',
          color: '#ff0000',
          backgroundColor: '#000',
          padding: `${3 * scale}px ${6 * scale}px`,
          borderRadius: `${4 * scale}px`,
          fontFamily: "'Digital-7 Mono', 'Digital-7', monospace",
          letterSpacing: `${0.75 * scale}px`,
          flex: '1',
          textShadow: '0 0 2px #ff0000'
        }}>
          {value}
        </div>
        {unit && (
          <div style={{
            fontSize: `${11 * scale}px`,
            fontWeight: 'bold',
            color: '#fff',
            fontFamily: "'Roboto', sans-serif",
            paddingRight: `${2 * scale}px`,
            textShadow: '-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000'
          }}>
            {unit}
          </div>
        )}
      </div>
    </div>
  );
}

export function GameStats({ scale = 1, fontSize = 12 }: GameStatsProps) {
  const credits = useGame(state => state.credits);
  const bonusPoints = useGame(state => state.bonusPoints);
  const stake = useGame(state => state.stake);
  
  const handleTouchButton = (callback: () => void) => {
    return {
      onClick: callback,
      onTouchStart: (e: React.TouchEvent) => {
        e.preventDefault();
        callback();
      }
    };
  };
  
  return (
    <div style={{
      position: 'absolute',
      left: `calc(100% + ${8 * scale}px)`,
      top: `${-4 * scale}px`,
      display: 'flex',
      flexDirection: 'column',
      gap: `${7 * scale}px`,
      pointerEvents: 'auto',
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(16px) saturate(180%)',
      border: `${Math.max(2, 3 * scale)}px solid rgba(255, 255, 255, 0.15)`,
      borderRadius: `${12 * scale}px`,
      padding: `${10 * scale}px`,
      boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.5)',
      width: `${170 * scale}px`
    }}>
      <button
        {...handleTouchButton(() => {
          window.history.back();
        })}
        style={{
          padding: `${5 * scale}px ${7 * scale}px`,
          fontSize: `${fontSize * 0.75}px`,
          fontWeight: 'bold',
          fontFamily: "'Roboto', sans-serif",
          color: '#ffffff',
          background: 'linear-gradient(to bottom, #555 0%, #333 100%)',
          border: `${Math.max(1, scale)}px solid #444`,
          borderRadius: `${4 * scale}px`,
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
          transition: 'all 0.2s ease',
          letterSpacing: '0.5px',
          width: '100%'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.3)';
        }}
      >
        BACK TO CASINO
      </button>
      <DisplayBox label="CREDITS" value={credits.toFixed(2)} unit="$" scale={scale} />
      <DisplayBox label="BONUS POINTS" value={formatNumber(bonusPoints)} unit="P" scale={scale} />
      <GameFeed scale={scale} />
      <DisplayBox 
        label="STAKE" 
        value={stake === 'FREE' ? 'FREE' : stake.toFixed(2)} 
        unit={stake === 'FREE' ? '' : '$'} 
        scale={scale}
      />
    </div>
  );
}
