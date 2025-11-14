import { useGame } from '@/lib/stores/useGame';
import { ChevronUp, ChevronDown } from 'lucide-react';

export function StakeSelector() {
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
      gap: '10px',
      fontFamily: "'Roboto', sans-serif",
      justifyContent: 'center'
    }}>
      <button
        {...handleTouchButton(() => cycleStake('down'))}
        disabled={phase !== 'ready'}
        style={{
          width: '45px',
          height: '45px',
          background: phase === 'ready' 
            ? 'linear-gradient(135deg, #FFB84D 0%, #FF8C00 100%)' 
            : 'linear-gradient(135deg, #ccc 0%, #999 100%)',
          border: 'none',
          borderRadius: '10px',
          cursor: phase === 'ready' ? 'pointer' : 'not-allowed',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: phase === 'ready' 
            ? '0 3px 8px rgba(255, 140, 0, 0.4), inset 0 -1px 2px rgba(0,0,0,0.2)' 
            : '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 140, 0, 0.5), inset 0 -1px 2px rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 3px 8px rgba(255, 140, 0, 0.4), inset 0 -1px 2px rgba(0,0,0,0.2)';
          }
        }}
      >
        <ChevronDown size={22} color={phase === 'ready' ? '#fff' : '#666'} strokeWidth={3} />
      </button>
      
      <button
        {...handleTouchButton(() => cycleStake('up'))}
        disabled={phase !== 'ready'}
        style={{
          width: '45px',
          height: '45px',
          background: phase === 'ready' 
            ? 'linear-gradient(135deg, #FFB84D 0%, #FF8C00 100%)' 
            : 'linear-gradient(135deg, #ccc 0%, #999 100%)',
          border: 'none',
          borderRadius: '10px',
          cursor: phase === 'ready' ? 'pointer' : 'not-allowed',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: phase === 'ready' 
            ? '0 3px 8px rgba(255, 140, 0, 0.4), inset 0 -1px 2px rgba(0,0,0,0.2)' 
            : '0 2px 4px rgba(0,0,0,0.2)',
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 4px 10px rgba(255, 140, 0, 0.5), inset 0 -1px 2px rgba(0,0,0,0.2)';
          }
        }}
        onMouseLeave={(e) => {
          if (phase === 'ready') {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 3px 8px rgba(255, 140, 0, 0.4), inset 0 -1px 2px rgba(0,0,0,0.2)';
          }
        }}
      >
        <ChevronUp size={22} color={phase === 'ready' ? '#fff' : '#666'} strokeWidth={3} />
      </button>
    </div>
  );
}
