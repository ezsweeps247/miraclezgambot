import { useGame } from '@/lib/stores/useGame';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface StakeSelectorProps {
  scale?: number;
  fontSize?: any;
}

export function StakeSelector({ scale = 1, fontSize }: StakeSelectorProps) {
  const cycleStake = useGame(state => state.cycleStake);
  const phase = useGame(state => state.phase);

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
      display: 'flex',
      flexDirection: 'column',
      gap: `${4 * scale}px`,
      fontFamily: "'Roboto', sans-serif",
      justifyContent: 'center'
    }}>
      <button
        {...handleTouchButton(() => cycleStake('up'))}
        disabled={phase !== 'ready'}
        style={{
          width: `${40 * scale}px`,
          height: `${32 * scale}px`,
          background: phase === 'ready' 
            ? 'linear-gradient(135deg, #FFB84D 0%, #FF8C00 100%)' 
            : 'linear-gradient(135deg, #ccc 0%, #999 100%)',
          border: 'none',
          borderRadius: `${8 * scale}px`,
          cursor: phase === 'ready' ? 'pointer' : 'not-allowed',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: phase === 'ready' 
            ? '0 4px 12px rgba(255, 140, 0, 0.4), inset 0 -2px 3px rgba(0,0,0,0.2)' 
            : '0 3px 6px rgba(0,0,0,0.2)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(255, 140, 0, 0.5), inset 0 -2px 3px rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 140, 0, 0.4), inset 0 -2px 3px rgba(0,0,0,0.2)';
          }
        }}
      >
        <ChevronUp size={18 * scale} color={phase === 'ready' ? '#fff' : '#666'} strokeWidth={3} />
      </button>
      
      <button
        {...handleTouchButton(() => cycleStake('down'))}
        disabled={phase !== 'ready'}
        style={{
          width: `${40 * scale}px`,
          height: `${32 * scale}px`,
          background: phase === 'ready' 
            ? 'linear-gradient(135deg, #FFB84D 0%, #FF8C00 100%)' 
            : 'linear-gradient(135deg, #ccc 0%, #999 100%)',
          border: 'none',
          borderRadius: `${8 * scale}px`,
          cursor: phase === 'ready' ? 'pointer' : 'not-allowed',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: phase === 'ready' 
            ? '0 4px 12px rgba(255, 140, 0, 0.4), inset 0 -2px 3px rgba(0,0,0,0.2)' 
            : '0 3px 6px rgba(0,0,0,0.2)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 6px 14px rgba(255, 140, 0, 0.5), inset 0 -2px 3px rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(255, 140, 0, 0.4), inset 0 -2px 3px rgba(0,0,0,0.2)';
          }
        }}
      >
        <ChevronDown size={18 * scale} color={phase === 'ready' ? '#fff' : '#666'} strokeWidth={3} />
      </button>
    </div>
  );
}
