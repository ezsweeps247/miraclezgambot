import { useEffect, useRef } from 'react';
import { useGame } from '@/lib/stores/useGame';
import { PrizeIndicators } from './PrizeIndicators';

const GRID_COLS = 7;
const GRID_ROWS = 14;
const CELL_SIZE = 38;
const CELL_SPACING = 2;
const GRID_WIDTH = GRID_COLS * CELL_SIZE + (GRID_COLS - 1) * CELL_SPACING;
const GRID_HEIGHT = GRID_ROWS * CELL_SIZE + (GRID_ROWS - 1) * CELL_SPACING;

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  
  const blocks = useGame(state => state.blocks);
  const currentBlock = useGame(state => state.currentBlock);
  const currentBlockPosition = useGame(state => state.currentBlockPosition);
  const phase = useGame(state => state.phase);
  const updateBlockPosition = useGame(state => state.updateBlockPosition);
  
  const lastTimeRef = useRef(Date.now());
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const render = () => {
      const now = Date.now();
      const delta = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;
      
      if (phase === 'playing' || phase === 'demo') {
        updateBlockPosition(delta);
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      drawGrid(ctx);
      drawPlacedBlocks(ctx, blocks);
      
      if (currentBlock && (phase === 'playing' || phase === 'demo')) {
        drawMovingBlock(ctx, currentBlock, currentBlockPosition);
      }
      
      animationRef.current = requestAnimationFrame(render);
    };
    
    render();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [blocks, currentBlock, currentBlockPosition, phase, updateBlockPosition]);
  
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      marginTop: '-40px'
    }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={GRID_WIDTH + 20}
          height={GRID_HEIGHT + 20}
          style={{
            border: '4px solid #333',
            borderRadius: '20px',
            backgroundColor: '#ffffff',
            boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
          }}
        />
        <PrizeIndicators />
      </div>
    </div>
  );
}

function drawGrid(ctx: CanvasRenderingContext2D) {
  const offsetX = 10;
  const offsetY = 10;
  
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = offsetX + col * (CELL_SIZE + CELL_SPACING);
      const y = offsetY + (GRID_ROWS - 1 - row) * (CELL_SIZE + CELL_SPACING);
      
      if (row === 9 || row === 13) {
        ctx.fillStyle = '#4a5560';
        ctx.globalAlpha = 0.7;
      } else {
        ctx.fillStyle = '#6b7c8f';
        ctx.globalAlpha = 0.4;
      }
      
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 6);
      ctx.fill();
      ctx.globalAlpha = 1.0;
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

function drawPlacedBlocks(ctx: CanvasRenderingContext2D, blocks: any[]) {
  const offsetX = 10;
  const offsetY = 10;
  
  blocks.forEach((block) => {
    block.columns.forEach((isActive: boolean, colIndex: number) => {
      if (!isActive) return;
      
      const x = offsetX + colIndex * (CELL_SIZE + CELL_SPACING);
      const y = offsetY + (GRID_ROWS - 1 - block.row) * (CELL_SIZE + CELL_SPACING);
      
      const gradient = ctx.createLinearGradient(x, y, x, y + CELL_SIZE);
      gradient.addColorStop(0, '#dd4444');
      gradient.addColorStop(1, '#aa2222');
      
      ctx.fillStyle = gradient;
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 6);
      ctx.fill();
    });
  });
}

function drawMovingBlock(ctx: CanvasRenderingContext2D, block: any, position: number) {
  const offsetX = 10;
  const offsetY = 10;
  
  block.columns.forEach((isActive: boolean, colIndex: number) => {
    if (!isActive) return;
    
    const blockColumnPosition = position + colIndex;
    const gridColumn = Math.round(blockColumnPosition);
    
    if (gridColumn < 0 || gridColumn >= GRID_COLS) return;
    
    const x = offsetX + gridColumn * (CELL_SIZE + CELL_SPACING);
    const y = offsetY + (GRID_ROWS - 1 - block.row) * (CELL_SIZE + CELL_SPACING);
    
    const gradient = ctx.createLinearGradient(x, y, x, y + CELL_SIZE);
    gradient.addColorStop(0, '#ff5555');
    gradient.addColorStop(1, '#ff0000');
    
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    
    ctx.fillStyle = gradient;
    drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 6);
    ctx.fill();
    
    ctx.shadowBlur = 0;
  });
}

let demoTime = 0;
const DEMO_DURATION = 15;

const DEMO_SEQUENCE = [
  { row: 1, targetColumn: 3, stopTime: 1.5 },
  { row: 2, targetColumn: 3, stopTime: 3.0 },
  { row: 3, targetColumn: 3, stopTime: 4.5 },
  { row: 4, targetColumn: 4, stopTime: 6.0 },
  { row: 5, targetColumn: 3, stopTime: 7.5 },
  { row: 6, targetColumn: 3, stopTime: 9.0 },
  { row: 7, targetColumn: 2, stopTime: 10.5 },
  { row: 8, targetColumn: 3, stopTime: 12.0 },
];

function drawDemoMode(ctx: CanvasRenderingContext2D, delta: number) {
  const offsetX = 10;
  const offsetY = 10;
  
  demoTime += delta;
  if (demoTime > DEMO_DURATION) {
    demoTime = 0;
  }
  
  DEMO_SEQUENCE.forEach((block, index) => {
    const hasStarted = demoTime >= (block.stopTime - 1.5);
    const hasStopped = demoTime >= block.stopTime;
    
    if (!hasStarted) return;
    
    const x = offsetX + block.targetColumn * (CELL_SIZE + CELL_SPACING);
    const y = offsetY + (GRID_ROWS - 1 - block.row) * (CELL_SIZE + CELL_SPACING);
    
    if (hasStopped) {
      const gradient = ctx.createLinearGradient(x, y, x, y + CELL_SIZE);
      gradient.addColorStop(0, '#dd4444');
      gradient.addColorStop(1, '#aa2222');
      
      ctx.fillStyle = gradient;
      drawRoundedRect(ctx, x, y, CELL_SIZE, CELL_SIZE, 6);
      ctx.fill();
    } else {
      const elapsedTime = demoTime - (block.stopTime - 1.5);
      const speed = 3;
      const distance = speed * elapsedTime;
      
      const startX = index % 2 === 0 ? 0 : GRID_COLS - 1;
      const direction = index % 2 === 0 ? 1 : -1;
      
      let currentCol = startX + direction * distance;
      
      while (currentCol < 0 || currentCol >= GRID_COLS) {
        if (currentCol < 0) currentCol = -currentCol;
        if (currentCol >= GRID_COLS) currentCol = 2 * (GRID_COLS - 1) - currentCol;
      }
      
      const timeUntilStop = block.stopTime - demoTime;
      if (timeUntilStop < 0.3) {
        const interpolation = 1 - (timeUntilStop / 0.3);
        currentCol = currentCol + (block.targetColumn - currentCol) * interpolation;
      }
      
      const animX = offsetX + currentCol * (CELL_SIZE + CELL_SPACING);
      
      const gradient = ctx.createLinearGradient(animX, y, animX, y + CELL_SIZE);
      gradient.addColorStop(0, '#ff5555');
      gradient.addColorStop(1, '#ff0000');
      
      ctx.fillStyle = gradient;
      drawRoundedRect(ctx, animX, y, CELL_SIZE, CELL_SIZE, 6);
      ctx.fill();
    }
  });
}
