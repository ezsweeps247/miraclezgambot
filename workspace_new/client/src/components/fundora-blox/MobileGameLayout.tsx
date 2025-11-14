import { useRef, useEffect, useState } from 'react';
import { useGame } from '@/lib/stores/useGame';
import { useAudio } from '@/lib/stores/useAudio';
import { Volume2, VolumeX, ChevronUp, ChevronDown, Menu, X, Home } from 'lucide-react';

const GRID_COLS = 7;
const GRID_ROWS = 14;

const PRIZE_TIERS = [
  { minRow: 13, color: '#cc0000', multiplier: 100, cashMultiplier: 100, freePoints: 1600 },
  { minRow: 12, color: '#ff8800', multiplier: 10, cashMultiplier: 10, freePoints: 800 },
  { minRow: 11, color: '#cccc00', multiplier: 5, cashMultiplier: 5, freePoints: 400 },
  { minRow: 10, color: '#00cc66', multiplier: 2, cashMultiplier: 2, freePoints: 200 },
  { minRow: 9, color: '#9966ff', multiplier: 1, cashMultiplier: 1, freePoints: 100 },
  { minRow: 8, color: '#0099cc', multiplier: 0 },
  { minRow: 7, color: '#666666', multiplier: 0 },
  { minRow: 6, color: '#ffffff', multiplier: 0 },
];

function getPrizeTier(row: number) {
  for (const tier of PRIZE_TIERS) {
    if (row >= tier.minRow) {
      return tier;
    }
  }
  return PRIZE_TIERS[PRIZE_TIERS.length - 1];
}

const getFixedPoints = (row: number, stake: number | 'FREE'): number => {
  const stakeMultiplier = (stake === 'FREE' || stake === 0) ? 1 : stake;
  
  if (row === 8) return 75 * stakeMultiplier;
  if (row === 7) return 50 * stakeMultiplier;
  if (row === 6) return 25 * stakeMultiplier;
  return 0;
};

function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toString();
}

export function MobileGameLayout() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef(Date.now());
  const [showStats, setShowStats] = useState(false);
  
  const phase = useGame(state => state.phase);
  const highestRow = useGame(state => state.highestRow);
  const stake = useGame(state => state.stake);
  const credits = useGame(state => state.credits);
  const bonusPoints = useGame(state => state.bonusPoints);
  const start = useGame(state => state.start);
  const stopBlock = useGame(state => state.stopBlock);
  const cycleStake = useGame(state => state.cycleStake);
  const restart = useGame(state => state.restart);
  const soundMode = useAudio(state => state.soundMode);
  const cycleSoundMode = useAudio(state => state.cycleSoundMode);
  
  // Calculate dimensions based on viewport
  const [dimensions, setDimensions] = useState({
    cellSize: 40,
    cellSpacing: 2,
    padding: 5,
    canvasWidth: 300,
    canvasHeight: 600,
  });

  useEffect(() => {
    const calculateDimensions = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // Reserve space for top bar (60px), balance bar (45px), and bottom controls (120px)
      const availableHeight = vh - 225;
      const availableWidth = vw - 20; // 10px padding on each side
      
      // Calculate cell size to fit the game board
      const maxCellWidth = availableWidth / (GRID_COLS + (GRID_COLS - 1) * 0.05);
      const maxCellHeight = availableHeight / (GRID_ROWS + (GRID_ROWS - 1) * 0.05);
      
      const cellSize = Math.floor(Math.min(maxCellWidth, maxCellHeight, 60));
      const cellSpacing = Math.max(1, Math.floor(cellSize * 0.05));
      const padding = 5;
      
      const canvasWidth = GRID_COLS * cellSize + (GRID_COLS - 1) * cellSpacing + (padding * 2);
      const canvasHeight = GRID_ROWS * cellSize + (GRID_ROWS - 1) * cellSpacing + (padding * 2);
      
      setDimensions({ cellSize, cellSpacing, padding, canvasWidth, canvasHeight });
    };

    calculateDimensions();
    window.addEventListener('resize', calculateDimensions);
    window.addEventListener('orientationchange', calculateDimensions);
    
    return () => {
      window.removeEventListener('resize', calculateDimensions);
      window.removeEventListener('orientationchange', calculateDimensions);
    };
  }, []);

  // Draw functions
  const drawGrid = (ctx: CanvasRenderingContext2D, dims: typeof dimensions) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = dims.padding + col * (dims.cellSize + dims.cellSpacing);
        const y = dims.padding + row * (dims.cellSize + dims.cellSpacing);
        
        ctx.fillRect(x, y, dims.cellSize, dims.cellSize);
      }
    }
  };

  const drawPrizeIndicators = (ctx: CanvasRenderingContext2D, dims: typeof dimensions, currentStake: number | 'FREE') => {
    PRIZE_TIERS.forEach(tier => {
      const y = dims.padding + (GRID_ROWS - 1 - tier.minRow) * (dims.cellSize + dims.cellSpacing);
      
      ctx.fillStyle = tier.color;
      ctx.globalAlpha = 0.3;
      ctx.fillRect(dims.padding, y, dims.canvasWidth - dims.padding * 2, dims.cellSize);
      ctx.globalAlpha = 1.0;
    });
  };

  const drawPlacedBlocks = (ctx: CanvasRenderingContext2D, blocks: any[], dims: typeof dimensions) => {
    blocks.forEach(block => {
      const x = dims.padding + block.column * (dims.cellSize + dims.cellSpacing);
      const y = dims.padding + (GRID_ROWS - 1 - block.row) * (dims.cellSize + dims.cellSpacing);
      
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(x, y, dims.cellSize, dims.cellSize);
      
      // Add a slight border for better visibility
      ctx.strokeStyle = '#cc0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, dims.cellSize, dims.cellSize);
    });
  };

  const drawMovingBlock = (ctx: CanvasRenderingContext2D, block: any, position: number, dims: typeof dimensions) => {
    const x = dims.padding + position * (dims.cellSize + dims.cellSpacing);
    const y = dims.padding + (GRID_ROWS - 1 - block.row) * (dims.cellSize + dims.cellSpacing);
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(x, y, dims.cellSize, dims.cellSize);
    
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, dims.cellSize, dims.cellSize);
  };

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      
      const state = useGame.getState();
      const { phase, updateBlockPosition, blocks, currentBlock, currentBlockPosition } = state;
      
      if (phase === 'playing' || phase === 'demo') {
        updateBlockPosition(delta);
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawPrizeIndicators(ctx, dimensions, state.stake);
      drawGrid(ctx, dimensions);
      drawPlacedBlocks(ctx, blocks, dimensions);
      
      if (currentBlock && (phase === 'playing' || phase === 'demo')) {
        drawMovingBlock(ctx, currentBlock, currentBlockPosition, dimensions);
      }
      
      animationRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [dimensions]);

  // Get current prize display
  const getCurrentPrizeDisplay = () => {
    const row = Math.max(highestRow + 1, 6); // Show next row prize or minimum row 6
    const tier = getPrizeTier(row);
    const isFreeMode = stake === 'FREE';
    const stakeAmount = typeof stake === 'number' ? stake : 0;
    
    let displayText = '';
    
    if (row <= 8) {
      const points = getFixedPoints(row, stake);
      displayText = points % 1 === 0 ? `${points}P` : `${points.toFixed(1)}P`;
    } 
    else if (row === 9 && isFreeMode) {
      displayText = '100P';
    }
    else if (row >= 10 && isFreeMode && 'freePoints' in tier) {
      displayText = `${tier.freePoints}P`;
    }
    else if ('cashMultiplier' in tier && tier.cashMultiplier !== undefined) {
      const prizeAmount = stakeAmount * tier.cashMultiplier;
      displayText = `$${prizeAmount.toFixed(2)}`;
    }
    
    return { text: displayText, color: tier.color, row };
  };

  const currentPrize = getCurrentPrizeDisplay();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      background: 'linear-gradient(135deg, #4a5568 0%, #2d3748 100%)',
    }}>
      {/* Top Bar with Prize Indicator */}
      <div style={{
        height: '60px',
        background: 'linear-gradient(180deg, rgba(80,80,85,0.95) 0%, rgba(50,50,55,0.95) 45%, rgba(35,35,40,0.95) 55%, rgba(25,25,30,0.98) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '2px solid rgba(255, 255, 255, 0.2)',
        borderBottomLeftRadius: '24px',
        borderBottomRightRadius: '24px',
        boxShadow: '0 4px 30px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.3)',
        display: 'grid',
        gridTemplateColumns: '50px 1fr 50px',
        alignItems: 'center',
        padding: '0 10px',
        position: 'relative',
        gap: '8px',
      }}>
        {/* Home Button */}
        <button
          onClick={restart}
          style={{
            background: 'linear-gradient(145deg, rgba(60,60,65,0.8), rgba(40,40,45,0.8))',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            color: '#fff',
            width: '40px',
            height: '40px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}
        >
          <Home size={20} />
        </button>
        
        {/* Center: Title */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {/* Title */}
          <div style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#ff0000',
            fontFamily: "'Digital-7 Mono', monospace",
            letterSpacing: '2px',
            textShadow: '0 0 10px rgba(255, 0, 0, 0.6), 0 0 20px rgba(255, 0, 0, 0.4)',
            lineHeight: '1',
          }}>
            FUNDORA BLOX
          </div>
        </div>
        
        {/* Empty space for balance */}
        <div style={{ width: '40px' }}></div>
      </div>
      
      {/* Balance Bar - Always Visible */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(55,55,60,0.95) 0%, rgba(45,45,50,0.95) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        borderBottomLeftRadius: '16px',
        borderBottomRightRadius: '16px',
        padding: '14px 20px',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.05)',
      }}>
        {/* Credits */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
          flex: 1,
          position: 'relative',
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Credits
          </div>
          <div style={{
            fontSize: '24px',
            color: '#ff3333',
            fontWeight: 'bold',
            fontFamily: "'Digital-7 Mono', monospace",
            letterSpacing: '0.5px',
            textShadow: '0 0 12px rgba(255, 51, 51, 0.4)',
          }}>
            ${credits.toFixed(2)}
          </div>
          <div style={{
            fontSize: '16px',
            color: '#ffaa00',
            fontWeight: 'bold',
            fontFamily: "'Digital-7 Mono', monospace",
            letterSpacing: '0.5px',
            textShadow: '0 0 8px rgba(255, 170, 0, 0.4)',
            marginTop: '2px',
          }}>
            {formatNumber(bonusPoints)}P
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #ff3333, transparent)',
            opacity: 0.4,
          }}></div>
        </div>

        {/* Vertical Separator */}
        <div style={{
          width: '1px',
          height: '40px',
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.15), transparent)',
        }}></div>

        {/* Current Prize Display */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          flex: 1,
          position: 'relative',
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Row {currentPrize.row}
          </div>
          <div style={{
            fontSize: '24px',
            color: currentPrize.color,
            fontWeight: 'bold',
            fontFamily: "'Digital-7 Mono', monospace",
            letterSpacing: '0.5px',
            textShadow: `0 0 12px ${currentPrize.color}60`,
          }}>
            {currentPrize.text}
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${currentPrize.color}, transparent)`,
            opacity: 0.5,
          }}></div>
        </div>

        {/* Vertical Separator */}
        <div style={{
          width: '1px',
          height: '40px',
          background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.15), transparent)',
        }}></div>

        {/* Bonus Points */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
          flex: 1,
          position: 'relative',
        }}>
          <div style={{
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.5)',
            fontWeight: '600',
            letterSpacing: '1px',
            textTransform: 'uppercase',
          }}>
            Points
          </div>
          <div style={{
            fontSize: '24px',
            color: '#ffaa00',
            fontWeight: 'bold',
            fontFamily: "'Digital-7 Mono', monospace",
            letterSpacing: '0.5px',
            textShadow: '0 0 12px rgba(255, 170, 0, 0.4)',
          }}>
            {formatNumber(bonusPoints)}P
          </div>
          <div style={{
            position: 'absolute',
            bottom: '-2px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '2px',
            background: 'linear-gradient(90deg, transparent, #ffaa00, transparent)',
            opacity: 0.4,
          }}></div>
        </div>
      </div>
      
      {/* Game Canvas Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '10px',
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          width={dimensions.canvasWidth}
          height={dimensions.canvasHeight}
          style={{
            background: '#1a1a1a',
            borderRadius: '8px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.5)',
            border: '2px solid rgba(255,255,255,0.1)',
          }}
        />
      </div>
      
      {/* Bottom Control Panel */}
      <div style={{
        height: '120px',
        background: 'linear-gradient(0deg, rgba(80,80,85,0.95) 0%, rgba(50,50,55,0.95) 45%, rgba(35,35,40,0.95) 55%, rgba(25,25,30,0.98) 100%)',
        backdropFilter: 'blur(20px) saturate(180%)',
        borderTop: '2px solid rgba(255, 255, 255, 0.2)',
        borderTopLeftRadius: '24px',
        borderTopRightRadius: '24px',
        boxShadow: '0 -4px 30px rgba(0,0,0,0.7), inset 0 1px 1px rgba(255,255,255,0.15), inset 0 -1px 1px rgba(0,0,0,0.3)',
        display: 'grid',
        gridTemplateColumns: '1fr 2fr 1fr',
        gap: '10px',
        padding: '10px',
        alignItems: 'center',
      }}>
        {/* Sound Control */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '5px',
        }}>
          <button
            onClick={cycleSoundMode}
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'linear-gradient(145deg, rgba(70,70,75,0.9), rgba(45,45,50,0.9))',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 1px rgba(255,255,255,0.1)',
            }}
          >
            {soundMode === 'MUTE' ? <VolumeX size={24} /> : <Volume2 size={24} />}
          </button>
          <div style={{
            fontSize: '9px',
            color: '#999',
            textAlign: 'center',
          }}>
            {soundMode === 'MUTE' ? 'MUTED' : 'SOUND'}
          </div>
        </div>
        
        {/* Main Button */}
        <button
          onClick={phase === 'ready' ? start : (phase === 'playing' ? stopBlock : () => {})}
          disabled={phase === 'ended' || phase === 'demo' || (phase === 'ready' && stake !== 'FREE' && stake > credits)}
          style={{
            height: '60px',
            fontSize: '20px',
            fontWeight: 'bold',
            background: (phase === 'ended' || phase === 'demo' || (phase === 'ready' && stake !== 'FREE' && stake > credits))
              ? 'linear-gradient(145deg, rgba(60,60,65,0.9), rgba(40,40,45,0.9))'
              : phase === 'playing'
              ? 'linear-gradient(145deg, rgba(180,60,60,0.95), rgba(140,40,40,0.95))'
              : 'linear-gradient(145deg, rgba(60,140,60,0.95), rgba(40,100,40,0.95))',
            color: '#fff',
            border: '2px solid rgba(255, 255, 255, 0.25)',
            borderRadius: '30px',
            cursor: (phase === 'ended' || phase === 'demo' || (phase === 'ready' && stake !== 'FREE' && stake > credits))
              ? 'not-allowed' 
              : 'pointer',
            boxShadow: '0 6px 16px rgba(0, 0, 0, 0.5), inset 0 1px 2px rgba(255,255,255,0.2)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {phase === 'ended' || phase === 'demo' ? 'WAIT' : 
           phase === 'playing' ? 'STOP' :
           (stake !== 'FREE' && stake > credits) ? 'NO $$' : 'START'}
        </button>
        
        {/* Stake Control */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
        }}>
          <button
            onClick={() => cycleStake('up')}
            disabled={phase !== 'ready'}
            style={{
              width: '50px',
              height: '25px',
              background: phase === 'ready' 
                ? 'linear-gradient(145deg, rgba(90,90,95,0.95), rgba(60,60,65,0.95))' 
                : 'linear-gradient(145deg, #555, #444)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px 12px 0 0',
              color: '#fff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: phase === 'ready' ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.15)',
            }}
          >
            <ChevronUp size={16} />
          </button>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            padding: '4px 10px',
            fontSize: '14px',
            color: stake === 'FREE' ? '#ffaa00' : '#00ff00',
            fontWeight: 'bold',
            borderRadius: '6px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: 'inset 0 1px 2px rgba(0, 0, 0, 0.3)',
            minWidth: '50px',
            textAlign: 'center',
          }}>
            {stake === 'FREE' ? 'FREE' : `$${stake}`}
          </div>
          <button
            onClick={() => cycleStake('down')}
            disabled={phase !== 'ready'}
            style={{
              width: '50px',
              height: '25px',
              background: phase === 'ready' 
                ? 'linear-gradient(145deg, rgba(90,90,95,0.95), rgba(60,60,65,0.95))' 
                : 'linear-gradient(145deg, #555, #444)',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '0 0 12px 12px',
              color: '#fff',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              cursor: phase === 'ready' ? 'pointer' : 'not-allowed',
              boxShadow: '0 2px 10px rgba(0, 0, 0, 0.4), inset 0 1px 1px rgba(255,255,255,0.15)',
            }}
          >
            <ChevronDown size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}