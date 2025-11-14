import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CryptoChartProps {
  isActive: boolean;
  multiplier: number;
  phase: 'waiting' | 'starting' | 'rising' | 'crashed';
  symbol?: string;
  initialPrice?: number;
}

type ChartTimeframe = 'LIVE' | '1D' | '1W' | '1M' | '3M' | 'YTD' | '1Y' | 'ALL';

interface ChartPoint {
  x: number;
  y: number;
  price: number;
}

export function CryptoChart({ 
  isActive, 
  multiplier, 
  phase, 
  symbol = 'BTC', 
  initialPrice = 45250.32 
}: CryptoChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [priceChange, setPriceChange] = useState(0);
  const [selectedTimeframe, setSelectedTimeframe] = useState<ChartTimeframe>('LIVE');
  
  // Generate realistic crypto price movement
  const generatePriceMovement = (basePrice: number, volatility: number = 0.02) => {
    // Use a combination of random walk and mean reversion
    const randomComponent = (Math.random() - 0.5) * volatility;
    const trendComponent = Math.sin(Date.now() / 10000) * 0.01;
    const noiseComponent = (Math.random() - 0.5) * 0.005;
    
    return basePrice * (1 + randomComponent + trendComponent + noiseComponent);
  };

  // Generate different chart patterns based on timeframe
  const generateTimeframeData = (timeframe: ChartTimeframe): ChartPoint[] => {
    const points: ChartPoint[] = [];
    let price = initialPrice;
    const dataPointCount = timeframe === 'LIVE' ? 100 : 150;
    
    for (let i = -dataPointCount; i < 0; i++) {
      let newPrice;
      
      switch (timeframe) {
        case 'LIVE':
          // Real-time volatile movement - sharp spikes
          newPrice = generatePriceMovement(price, 0.02);
          break;
        case '1D':
          // Daily view - moderate volatility with upward trend
          newPrice = price * (1 + (Math.random() - 0.4) * 0.015 + 0.001);
          break;
        case '1W':
          // Weekly view - larger swings, general upward trend
          newPrice = price * (1 + (Math.random() - 0.3) * 0.025 + 0.002);
          break;
        case '1M':
          // Monthly view - significant price action, bear market pattern
          newPrice = price * (1 + (Math.random() - 0.6) * 0.03 - 0.001);
          break;
        case '3M':
          // 3-month view - major corrections and recoveries
          newPrice = price * (1 + (Math.random() - 0.5) * 0.04 + Math.sin(i * 0.1) * 0.01);
          break;
        case 'YTD':
          // Year-to-date - steady growth with dips
          newPrice = price * (1 + (Math.random() - 0.45) * 0.02 + 0.0015);
          break;
        case '1Y':
          // 1 year - major bull run pattern
          newPrice = price * (1 + (Math.random() - 0.4) * 0.025 + 0.003);
          break;
        case 'ALL':
          // All-time - dramatic crash and recovery pattern
          if (i < -100) {
            newPrice = price * (1 + (Math.random() - 0.8) * 0.05 - 0.02); // Major crash
          } else {
            newPrice = price * (1 + (Math.random() - 0.3) * 0.03 + 0.005); // Recovery
          }
          break;
        default:
          newPrice = generatePriceMovement(price, 0.02);
      }
      
      price = Math.max(newPrice, initialPrice * 0.1); // Prevent negative prices
      points.push({
        x: i,
        y: price,
        price: price
      });
    }
    
    return points;
  };

  // Get chart color based on timeframe
  const getChartColor = (timeframe: ChartTimeframe): string => {
    switch (timeframe) {
      case 'LIVE': return '#00ff88';  // Bright green
      case '1D': return '#00ff88';    // Green
      case '1W': return '#00ff88';    // Green  
      case '1M': return '#ff6b35';    // Orange
      case '3M': return '#ff6b35';    // Orange
      case 'YTD': return '#00ff88';   // Green
      case '1Y': return '#00ff88';    // Green
      case 'ALL': return '#ff6b35';   // Orange
      default: return '#00ff88';
    }
  };

  // Initialize chart with historical-looking data
  useEffect(() => {
    const initializeChart = () => {
      const points = generateTimeframeData(selectedTimeframe);
      setChartData(points);
      if (points.length > 0) {
        setCurrentPrice(points[points.length - 1].price);
      }
    };

    initializeChart();
  }, [initialPrice, selectedTimeframe]);

  // Update price and chart animation
  useEffect(() => {
    if (!isActive || phase === 'waiting') return;

    const updateChart = () => {
      setChartData(prev => {
        const newData = [...prev];
        
        // Remove old points to maintain performance
        if (newData.length > 200) {
          newData.splice(0, newData.length - 200);
        }
        
        // Shift x coordinates
        newData.forEach(point => point.x -= 1);
        
        // Add new point
        const lastPrice = newData[newData.length - 1]?.price || initialPrice;
        let newPrice;
        
        if (phase === 'rising') {
          // During the game, make price correlate with multiplier but add realistic volatility
          const baseMultiplierEffect = (multiplier - 1) * 0.1;
          newPrice = generatePriceMovement(lastPrice * (1 + baseMultiplierEffect), 0.015);
        } else if (phase === 'crashed') {
          // Sharp drop when crashed
          newPrice = lastPrice * 0.95;
        } else {
          // Normal random movement
          newPrice = generatePriceMovement(lastPrice, 0.01);
        }
        
        newData.push({
          x: 0,
          y: newPrice,
          price: newPrice
        });
        
        // Calculate price change
        if (newData.length >= 2) {
          const change = ((newPrice - newData[0].price) / newData[0].price) * 100;
          setPriceChange(change);
        }
        
        setCurrentPrice(newPrice);
        return newData;
      });
    };

    const interval = setInterval(updateChart, 100); // Update every 100ms for smooth animation
    return () => clearInterval(interval);
  }, [isActive, phase, multiplier, initialPrice]);

  // Draw the chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || chartData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

      // Clear canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, rect.width, rect.height);

      if (chartData.length < 2) return;

      // Calculate bounds
      const minPrice = Math.min(...chartData.map(p => p.price));
      const maxPrice = Math.max(...chartData.map(p => p.price));
      const priceRange = maxPrice - minPrice || 1;
      const padding = 20;

      // Draw grid
      ctx.strokeStyle = '#1a1a1a';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      // Horizontal grid lines
      for (let i = 0; i <= 5; i++) {
        const y = padding + (i * (rect.height - 2 * padding)) / 5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(rect.width, y);
        ctx.stroke();
      }
      
      // Vertical grid lines
      for (let i = 0; i <= 10; i++) {
        const x = (i * rect.width) / 10;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, rect.height);
        ctx.stroke();
      }
      
      ctx.setLineDash([]);

      // Draw price line
      const lineColor = getChartColor(selectedTimeframe);
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 2;
      ctx.beginPath();

      chartData.forEach((point, index) => {
        const x = rect.width + (point.x * rect.width) / 100;
        const y = rect.height - padding - ((point.price - minPrice) / priceRange) * (rect.height - 2 * padding);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();

      // Add glow effect
      ctx.shadowColor = lineColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw current price point
      if (chartData.length > 0) {
        const lastPoint = chartData[chartData.length - 1];
        const x = rect.width + (lastPoint.x * rect.width) / 100;
        const y = rect.height - padding - ((lastPoint.price - minPrice) / priceRange) * (rect.height - 2 * padding);
        
        ctx.fillStyle = lineColor;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Pulsing effect
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    };

    const animate = () => {
      draw();
      if (isActive) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [chartData, isActive, priceChange, selectedTimeframe]);

  return (
    <div className="relative w-full h-64 bg-black rounded-lg overflow-hidden border border-gray-800">
      {/* Chart Header */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <Badge 
          variant="outline" 
          className={`px-2 py-1 text-[8px] font-mono ${
            isActive ? 'bg-green-500/20 text-green-400 border-green-500' : 'bg-gray-500/20 text-gray-400 border-gray-500'
          }`}
        >
          {isActive ? '● LIVE' : '● PAUSED'}
        </Badge>
        
        <div className="text-[8px] text-gray-300 font-mono">
          {symbol}/USD
        </div>
      </div>

      {/* Price Display */}
      <div className="absolute top-4 right-4 z-10 text-right">
        <div className="text-[10px] font-mono text-white">
          ${currentPrice.toFixed(2)}
        </div>
        <div className={`text-[8px] font-mono ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(2)}% 1H
        </div>
      </div>

      {/* Chart Canvas */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ width: '100%', height: '100%' }}
      />

      {/* Time Period Buttons */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-1">
        {(['LIVE', '1D', '1W', '1M', '3M', 'YTD', '1Y', 'ALL'] as ChartTimeframe[]).map((period) => (
          <Button
            key={period}
            variant="ghost"
            size="sm"
            onClick={() => setSelectedTimeframe(period)}
            className={`px-3 py-1.5 text-[8px] font-mono rounded transition-all duration-200 ${
              period === selectedTimeframe 
                ? `bg-gradient-to-r ${
                    getChartColor(period) === '#00ff88' 
                      ? 'from-green-600 to-green-500 text-white shadow-lg shadow-green-500/30' 
                      : 'from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30'
                  }` 
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
            }`}
          >
            {period}
          </Button>
        ))}
      </div>

      {/* Phase Indicator */}
      {phase === 'crashed' && (
        <div className="absolute inset-0 flex items-center justify-center z-20">
          <div className="bg-red-500/90 text-white px-6 py-3 rounded-lg font-bold text-[10px] animate-pulse">
            CRASHED AT {multiplier.toFixed(2)}x
          </div>
        </div>
      )}
    </div>
  );
}