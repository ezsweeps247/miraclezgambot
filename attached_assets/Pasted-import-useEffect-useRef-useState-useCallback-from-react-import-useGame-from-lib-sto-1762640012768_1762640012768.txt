import { useEffect, useRef, useState, useCallback } from 'react';
import { useGame } from '@/lib/stores/useGame';
import { useAudio } from '@/lib/stores/useAudio';
import { PrizeIndicators } from './PrizeIndicators';
import { GameStats } from './GameStats';
import { StakeSelector } from './StakeSelector';
import { Volume2, VolumeX } from 'lucide-react';
import { MobileGameLayout } from './MobileGameLayout';

const GRID_COLS = 7;
const GRID_ROWS = 14;

// Base dimensions for scaling
const BASE_CELL_SIZE = 40;
const BASE_CELL_SPACING = 2;
const BASE_PADDING = 10;

interface GameCanvasProps {
  isMobile?: boolean;
}

export function GameCanvas({ isMobile = false }: GameCanvasProps) {
  // Use mobile layout if on mobile
  if (isMobile) {
    return <MobileGameLayout />;
  }
  
  // Desktop layout continues below
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const lastTimeRef = useRef(Date.now());
  
  const [dimensions, setDimensions] = useState({
    cellSize: BASE_CELL_SIZE,
    cellSpacing: BASE_CELL_SPACING,
    padding: BASE_PADDING,
    scale: 1,
    canvasWidth: 320,
    canvasHeight: 600,
    fontSize: {
      title: 28,
      button: 16,
      label: 10,
      stats: 12
    }
  });

  // Calculate responsive dimensions based on viewport
  const calculateDimensions = useCallback(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    
    // Reserve space for UI elements
    const maxGameWidth = vw - 20; // 10px padding on each side
    const maxGameHeight = vh - 200; // Reserve space for header/controls
    
    // Calculate scale based on screen size
    let cellSize = BASE_CELL_SIZE;
    let cellSpacing = BASE_CELL_SPACING;
    let padding = BASE_PADDING;
    
    // For mobile devices
    if (vw < 768) {
      // Portrait mode
      const availableWidth = maxGameWidth - (padding * 2);
      const maxCellSize = availableWidth / (GRID_COLS + (GRID_COLS - 1) * 0.1);
      cellSize = Math.min(maxCellSize, 45);
      cellSpacing = Math.floor(cellSize * 0.08);
      padding = 8;
    } else if (vw < 1024) {
      // Tablet
      cellSize = 50;
      cellSpacing = 3;
      padding = 12;
    } else {
      // Desktop
      cellSize = 60;
      cellSpacing = 4;
      padding = 15;
    }
    
    const canvasWidth = GRID_COLS * cellSize + (GRID_COLS - 1) * cellSpacing + (padding * 2);
    const canvasHeight = GRID_ROWS * cellSize + (GRID_ROWS - 1) * cellSpacing + (padding * 2);
    
    // Scale down if canvas is too big for viewport
    let scale = 1;
    if (canvasWidth > maxGameWidth) {
      scale = maxGameWidth / canvasWidth;
    }
    if (canvasHeight * scale > maxGameHeight) {
      scale = maxGameHeight / canvasHeight;
    }
    
    // Calculate font sizes based on scale
    const baseFontScale = vw < 768 ? 0.7 : vw < 1024 ? 0.85 : 1;
    
    setDimensions({
      cellSize,
      cellSpacing,
      padding,
      scale,
      canvasWidth,
      canvasHeight,
      fontSize: {
        title: Math.floor(28 * baseFontScale * Math.max(scale, 0.7)),
        button: Math.floor(16 * baseFontScale * Math.max(scale, 0.7)),
        label: Math.floor(10 * baseFontScale * Math.max(scale, 0.7)),
        stats: Math.floor(12 * baseFontScale * Math.max(scale, 0.7))
      }
    });
  }, []);

  // Resize listener
  useEffect(() => {
    calculateDimensions();
    const handleResize = () => calculateDimensions();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateDimensions]);
  
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
  
  const soundMode = useAudio(state => state.soundMode);
  const cycleSoundMode = useAudio(state => state.cycleSoundMode);
  const stake = useGame(state => state.stake);
  const credits = useGame(state => state.credits);
  const start = useGame(state => state.start);
  const stopBlock = useGame(state => state.stopBlock);
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

  const { cellSize, cellSpacing, padding, scale, canvasWidth, canvasHeight, fontSize } = dimensions;

  return (
    <div ref={containerRef} style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '10px',
      boxSizing: 'border-box',
      width: '100%',
      gap: `${8 * scale}px`
    }}>
      {/* Title Container */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: `${Math.max(2, 3 * scale)}px solid rgba(255, 255, 255, 0.15)`,
        borderRadius: `${12 * scale}px`,
        padding: `${8 * scale}px ${16 * scale}px`,
        boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.5)',
        width: '100%',
        maxWidth: `${canvasWidth * scale}px`,
        boxSizing: 'border-box'
      }}>
        <div style={{
          fontSize: `${fontSize.title}px`,
          fontWeight: 'bold',
          color: '#ff0000',
          fontFamily: "'Digital-7 Mono', 'Digital-7', monospace",
          textShadow: `
            0 0 ${7 * scale}px rgba(255, 0, 0, 0.6),
            0 0 ${14 * scale}px rgba(255, 0, 0, 0.4),
            ${2 * scale}px ${2 * scale}px ${4 * scale}px rgba(0, 0, 0, 0.8)
          `,
          letterSpacing: `${8 * scale}px`,
          textAlign: 'center',
          lineHeight: '1',
          whiteSpace: 'nowrap'
        }}>
          FUNDORA BLOX
        </div>
      </div>

      <div style={{ 
        position: 'relative',
        transform: `scale(${scale})`,
        transformOrigin: 'top center'
      }}>
        <canvas
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          style={{
            border: `3px solid rgba(255, 255, 255, 0.2)`,
            borderRadius: '12px',
            backgroundColor: '#b8bcc8',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4), inset 0 0 20px rgba(0,0,0,0.1)',
            touchAction: 'none'
          }}
        />
        <PrizeIndicators scale={scale} cellSize={cellSize} />
        <GameStats scale={scale} fontSize={fontSize.stats} />
      </div>
      
      {/* Footer controls */}
      <div style={{
        width: '100%',
        maxWidth: `${canvasWidth * scale}px`,
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(16px) saturate(180%)',
        border: `${Math.max(2, 3 * scale)}px solid rgba(255, 255, 255, 0.15)`,
        borderRadius: `${12 * scale}px`,
        boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.5)',
        padding: `${12 * scale}px ${10 * scale}px`,
        display: 'grid',
        gridTemplateColumns: window.innerWidth < 480 ? '1fr' : '1fr 2fr 1fr',
        gap: `${12 * scale}px`,
        alignItems: 'center',
        boxSizing: 'border-box'
      }}>
        {/* Sound toggle */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: `${4 * scale}px`
        }}>
          <button
            {...handleTouchButton(cycleSoundMode)}
            style={{
              width: `${40 * scale}px`,
              height: `${60 * scale}px`,
              background: 'linear-gradient(to bottom, #e8e8e8 0%, #c0c0c0 50%, #a0a0a0 100%)',
              border: 'none',
              borderRadius: `${14 * scale}px`,
              cursor: 'pointer',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              boxShadow: 'inset 0 3px 6px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(255,255,255,0.5), 0 6px 12px rgba(0,0,0,0.2)',
              position: 'relative',
              padding: `${4 * scale}px`
            }}
          >
            <div style={{
              width: `${28 * scale}px`,
              height: `${36 * scale}px`,
              background: 'linear-gradient(to bottom, #d0d0d0 0%, #f0f0f0 50%, #ffffff 100%)',
              borderRadius: `${10 * scale}px`,
              boxShadow: '0 4px 8px rgba(0,0,0,0.4), inset 0 2px 3px rgba(255,255,255,0.8)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              transform: soundMode === 'MUTE' ? `translateY(${4 * scale}px)` : `translateY(-${4 * scale}px)`,
              transition: 'transform 0.2s'
            }}>
              {soundMode === 'MUTE' ? (
                <VolumeX size={16 * scale} color="#666" strokeWidth={2} />
              ) : (
                <Volume2 size={16 * scale} color="#666" strokeWidth={2} />
              )}
            </div>
          </button>
          <div style={{
            fontSize: `${fontSize.label}px`,
            fontWeight: 'bold',
            color: 'rgba(255, 255, 255, 0.9)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            textAlign: 'center',
            fontFamily: "'Roboto', sans-serif",
            textShadow: '0 1px 3px rgba(0,0,0,0.8)',
            lineHeight: '1.3'
          }}>
            {soundMode === 'MUTE' && 'MUTE'}
            {soundMode === 'ALL_ON' && <>ALL ON</>}
            {soundMode === 'SE_OFF' && <>SE OFF<br/>BG ON</>}
            {soundMode === 'BG_OFF' && <>BG OFF<br/>SE ON</>}
          </div>
        </div>

        {/* Game button */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: `${4 * scale}px`,
          gridColumn: window.innerWidth < 480 ? 'span 1' : 'span 1'
        }}>
          <button
            {...handleTouchButton(phase === 'ready' ? () => { start(); } : (phase === 'playing' ? stopBlock : () => {}))}
            disabled={phase === 'ended' || phase === 'demo' || (phase === 'ready' && stake !== 'FREE' && stake > credits)}
            style={{
              padding: `${8 * scale}px ${20 * scale}px`,
              minHeight: `${40 * scale}px`,
              width: '100%',
              maxWidth: `${220 * scale}px`,
              fontSize: `${fontSize.button}px`,
              fontWeight: 'bold',
              background: (phase === 'ended' || phase === 'demo' || (phase === 'ready' && stake !== 'FREE' && stake > credits))
                ? 'linear-gradient(to top, #999 0%, #666 100%)' 
                : 'linear-gradient(to top, #ff8888 0%, #ff5555 30%, #dd2222 70%, #990000 100%)',
              color: 'white',
              border: 'none',
              borderRadius: `${20 * scale}px`,
              cursor: (phase === 'ended' || phase === 'demo' || (phase === 'ready' && stake !== 'FREE' && stake > credits)) ? 'not-allowed' : 'pointer',
              boxShadow: '0 6px 12px rgba(0,0,0,0.4), inset 0 -3px 6px rgba(255,255,255,0.2), inset 0 3px 6px rgba(0,0,0,0.3)',
              textTransform: 'uppercase',
              fontFamily: "'Roboto', sans-serif",
              transition: 'all 0.2s'
            }}
          >
            {phase === 'ended' || phase === 'demo' ? 'PLEASE WAIT' : 
             phase === 'playing' ? 'STOP' :
             (stake !== 'FREE' && stake > credits) ? 'NO CREDITS' : 'START'}
          </button>
          <div style={{
            fontSize: `${fontSize.label}px`,
            fontWeight: 'bold',
            color: 'rgba(255, 255, 255, 0.8)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center',
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}>
            STOP BLOCKS
          </div>
        </div>

        {/* Stake selector */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: `${4 * scale}px`
        }}>
          <StakeSelector scale={scale} fontSize={fontSize} />
          <div style={{
            fontSize: `${fontSize.label}px`,
            fontWeight: 'bold',
            color: 'rgba(255, 255, 255, 0.8)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            textAlign: 'center',
            fontFamily: "'Roboto', sans-serif",
            textShadow: '0 1px 2px rgba(0,0,0,0.5)'
          }}>
            CHOOSE STAKE
          </div>
        </div>
      </div>
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D, dimensions: any) {
  const { cellSize, cellSpacing, padding } = dimensions;
  const offsetX = padding;
  const offsetY = padding;
  
  // Get current stake and blocks for prize calculations
  const state = useGame.getState();
  const stake = state.stake;
  const blocks = state.blocks;
  const isFreeMode = stake === 'FREE';
  const stakeAmount = typeof stake === 'number' ? stake : 0;
  
  // Create a set of rows that have been landed on
  const landedRows = new Set(blocks.map(block => block.row));
  
  // Prize tier configuration
  const PRIZE_TIERS = [
    { minRow: 13, color: '#cc0000', cashMultiplier: 100, freePoints: 1600 },
    { minRow: 12, color: '#ff8800', cashMultiplier: 10, freePoints: 800 },
    { minRow: 11, color: '#00ffff', cashMultiplier: 5, freePoints: 400 },
    { minRow: 10, color: '#00cc66', cashMultiplier: 2, freePoints: 200 },
    { minRow: 9, color: '#9966ff', cashMultiplier: 1, freePoints: 100 },
  ];
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = offsetX + col * (cellSize + cellSpacing);
      const y = offsetY + (GRID_ROWS - 1 - row) * (cellSize + cellSpacing);
      
      if (row === 9 || row === 13) {
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        ctx.globalAlpha = 1.0;
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.globalAlpha = 0.8;
      }
      
      const radius = Math.min(8, cellSize * 0.2);
      drawRoundedRect(ctx, x, y, cellSize, cellSize, radius);
      ctx.fill();
      
      // Add darker border for better definition
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.lineWidth = 1;
      ctx.stroke();
      
      ctx.globalAlpha = 1.0;
    }
    
    // Draw prize indicators on the right side for prize rows
    if (row >= 9 && row <= 13) {
      const tier = PRIZE_TIERS.find(t => row >= t.minRow);
      if (tier) {
        const y = offsetY + (GRID_ROWS - 1 - row) * (cellSize + cellSpacing);
        const textX = offsetX + GRID_COLS * (cellSize + cellSpacing) - cellSize * 0.15;
        const textY = y + cellSize / 2;
        
        let prizeText = '';
        if (isFreeMode) {
          prizeText = `${tier.freePoints}P`;
        } else {
          const prizeAmount = stakeAmount * tier.cashMultiplier;
          prizeText = `$${prizeAmount.toFixed(0)}`;
        }
        
        // Use bright cyan by default, change to tier color only if landed on this row
        const hasLanded = landedRows.has(row);
        const displayColor = hasLanded ? tier.color : '#00ffff';
        
        // Draw large prize text with strong glow
        ctx.font = `bold ${Math.max(16, cellSize * 0.7)}px Arial`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        
        // Draw text with strong glow effect
        ctx.shadowColor = displayColor;
        ctx.shadowBlur = 8;
        ctx.fillStyle = displayColor;
        ctx.fillText(prizeText, textX, textY);
        ctx.shadowBlur = 0;
      }
    }
  }
}

function drawRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawPlacedBlocks(ctx: CanvasRenderingContext2D, blocks: any[], dimensions: any) {
  const { cellSize, cellSpacing, padding } = dimensions;
  const offsetX = padding;
  const offsetY = padding;
  
  blocks.forEach((block) => {
    block.columns.forEach((isActive: boolean, colIndex: number) => {
      if (!isActive) return;
      
      const x = offsetX + colIndex * (cellSize + cellSpacing);
      const y = offsetY + (GRID_ROWS - 1 - block.row) * (cellSize + cellSpacing);
      
      const gradient = ctx.createLinearGradient(x, y, x, y + cellSize);
      gradient.addColorStop(0, '#dd4444');
      gradient.addColorStop(1, '#aa2222');
      
      ctx.fillStyle = gradient;
      const radius = Math.min(8, cellSize * 0.2);
      drawRoundedRect(ctx, x, y, cellSize, cellSize, radius);
      ctx.fill();
    });
  });
}

function drawMovingBlock(ctx: CanvasRenderingContext2D, block: any, position: number, dimensions: any) {
  const { cellSize, cellSpacing, padding } = dimensions;
  const offsetX = padding;
  const offsetY = padding;
  
  block.columns.forEach((isActive: boolean, colIndex: number) => {
    if (!isActive) return;
    
    const blockColumnPosition = position + colIndex;
    const gridColumn = Math.round(blockColumnPosition);
    
    if (gridColumn < 0 || gridColumn >= GRID_COLS) return;
    
    const x = offsetX + gridColumn * (cellSize + cellSpacing);
    const y = offsetY + (GRID_ROWS - 1 - block.row) * (cellSize + cellSpacing);
    
    const gradient = ctx.createLinearGradient(x, y, x, y + cellSize);
    gradient.addColorStop(0, '#ff5555');
    gradient.addColorStop(1, '#ff0000');
    
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    ctx.shadowBlur = 5;
    
    ctx.fillStyle = gradient;
    const radius = Math.min(8, cellSize * 0.2);
    drawRoundedRect(ctx, x, y, cellSize, cellSize, radius);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  });
}