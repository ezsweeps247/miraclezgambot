import { useGame } from '@/lib/stores/useGame';

interface PrizeIndicatorsProps {
  scale?: number;
  cellSize?: number;
}

const GRID_ROWS = 14;
const BASE_CELL_SIZE = 85;
const BASE_CELL_SPACING = 5;

const PRIZE_TIERS = [
  { minRow: 13, color: '#00CED1', multiplier: 100, cashMultiplier: 100, freePoints: 1600, textColor: '#fff' },
  { minRow: 12, color: '#00CED1', multiplier: 10, cashMultiplier: 10, freePoints: 800, textColor: '#fff' },
  { minRow: 11, color: '#00CED1', multiplier: 5, cashMultiplier: 5, freePoints: 400, textColor: '#000' },
  { minRow: 10, color: '#00CED1', multiplier: 3, cashMultiplier: 3, freePoints: 300, textColor: '#000' },
  { minRow: 9, color: '#00CED1', multiplier: 1, cashMultiplier: 1, freePoints: 100, textColor: '#fff' },
  { minRow: 8, color: '#00CED1', multiplier: 0.75, cashMultiplier: 0.75, textColor: '#fff' },
  { minRow: 7, color: '#00CED1', multiplier: 0.25, cashMultiplier: 0.25, textColor: '#fff' },
  { minRow: 6, color: '#00CED1', multiplier: 0.10, cashMultiplier: 0.10, textColor: '#fff' },
];

// Get fixed point values for rows 6-8, scaled by stake
const getFixedPoints = (row: number, stake: number | 'FREE'): number => {
  const stakeMultiplier = (stake === 'FREE' || stake === 0) ? 1 : stake;
  
  if (row === 8) return 75 * stakeMultiplier;
  if (row === 7) return 25 * stakeMultiplier;
  if (row === 6) return 10 * stakeMultiplier;
  return 0;
};

function getPrizeTier(row: number) {
  for (const tier of PRIZE_TIERS) {
    if (row >= tier.minRow) {
      return tier;
    }
  }
  return PRIZE_TIERS[PRIZE_TIERS.length - 1];
}

export function PrizeIndicators({ scale = 1, cellSize: propCellSize }: PrizeIndicatorsProps) {
  const stake = useGame(state => state.stake);
  const highestRow = useGame(state => state.highestRow);
  const blocks = useGame(state => state.blocks);
  
  const isFreeMode = stake === 'FREE';
  const stakeAmount = typeof stake === 'number' ? stake : 0;
  
  // Create a set of rows that have been landed on
  const landedRows = new Set(blocks.map(block => block.row));
  
  const displayedRows = [13, 12, 11, 10, 9, 8, 7, 6];
  
  // Use provided cellSize or calculate based on scale
  const CELL_SIZE = propCellSize || BASE_CELL_SIZE;
  const CELL_SPACING = Math.floor(CELL_SIZE * 0.08);
  
  const containerHeight = displayedRows.length * (CELL_SIZE + CELL_SPACING);
  
  const CANVAS_OFFSET_Y = 10 * scale;
  const BORDER_ADJUSTMENT = -8 * scale;
  
  return (
    <div style={{
      position: 'absolute',
      right: `calc(100% + ${8 * scale}px)`,
      top: `${CANVAS_OFFSET_Y + BORDER_ADJUSTMENT}px`,
      background: 'rgba(255, 255, 255, 0.08)',
      backdropFilter: 'blur(16px) saturate(180%)',
      border: `${Math.max(2, 3 * scale)}px solid rgba(255, 255, 255, 0.15)`,
      borderRadius: `${12 * scale}px`,
      padding: `${10 * scale}px ${13 * scale}px`,
      boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.2), 0 8px 32px rgba(0,0,0,0.5)',
      width: `${170 * scale}px`,
      fontFamily: "'Arial Black', sans-serif",
      fontWeight: 'bold',
      fontSize: `${Math.max(14, 13 * scale)}px`,
      transform: 'none',
      transformOrigin: 'right top'
    }}>
      <div style={{
        position: 'relative',
        height: `${containerHeight}px`
      }}>
        {displayedRows.map((row) => {
          const tier = getPrizeTier(row);
          const yPosition = (GRID_ROWS - 1 - row) * (CELL_SIZE + CELL_SPACING);
          
          let displayText = '';
          
          // For paid mode, show cash prizes
          if (!isFreeMode && 'cashMultiplier' in tier && tier.cashMultiplier !== undefined && stakeAmount > 0) {
            const prizeAmount = stakeAmount * tier.cashMultiplier;
            
            // Format cents for values under $1
            if (row === 6) {
              displayText = `10¢ +`;
            } else if (row === 7) {
              displayText = `25¢ +`;
            } else if (row === 8) {
              displayText = `75¢ +`;
            } else if (prizeAmount >= 1) {
              displayText = `$${prizeAmount.toFixed(2)} +`;
            } else {
              displayText = `${Math.round(prizeAmount * 100)}¢ +`;
            }
          }
          // For FREE mode, show points
          else if (isFreeMode) {
            if (row === 6) {
              displayText = '10P';
            } else if (row === 7) {
              displayText = '25P';
            } else if (row === 8) {
              displayText = '75P';
            } else if (row === 9) {
              displayText = '100P';
            } else if ('freePoints' in tier) {
              displayText = `${tier.freePoints}P`;
            }
          }
          // Default case for stake = $1
          else {
            if (row === 6) displayText = '10¢ +';
            else if (row === 7) displayText = '25¢ +';
            else if (row === 8) displayText = '75¢ +';
            else if (row === 9) displayText = '$1.00 +';
            else if (row === 10) displayText = '$3.00 +';
            else if (row === 11) displayText = '$5.00 +';
            else if (row === 12) displayText = '$10.00 +';
            else if (row === 13) displayText = '$100.00 +';
          }
          
          const isActive = highestRow >= row;
          
          // Always use cyan color (#00CED1) for all indicators
          const hasLanded = landedRows.has(row);
          const displayColor = '#00CED1';
          
          return (
            <div
              key={row}
              style={{
                position: 'absolute',
                top: `${yPosition}px`,
                right: 0,
                height: `${CELL_SIZE}px`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '6px',
                transition: 'all 0.3s ease',
                flexDirection: 'row-reverse',
              }}
            >
              <div style={{
                width: 0,
                height: 0,
                borderTop: `${7 * scale}px solid transparent`,
                borderBottom: `${7 * scale}px solid transparent`,
                borderRight: `${11 * scale}px solid ${displayColor}`,
                opacity: 1,
                flexShrink: 0,
              }} />
              <div style={{
                color: displayColor,
                padding: 0,
                margin: 0,
                textShadow: '1px 1px 2px rgba(0, 0, 0, 0.9)',
                minWidth: `${65 * scale}px`,
                textAlign: 'right',
                opacity: 1,
                fontSize: `${Math.max(14, 20 * scale)}px`,
                letterSpacing: '0.25px',
                fontWeight: 'bold',
                WebkitTextStroke: (row >= 10 && !isFreeMode) ? '0.25px rgba(0, 0, 0, 0.4)' : 'none',
                lineHeight: '1',
                height: 'auto',
              }}>
                {displayText}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
