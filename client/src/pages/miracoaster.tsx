import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, Users, Trophy, Calculator, BarChart3, Volume2, VolumeX, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useGameMode } from '@/contexts/GameModeContext';
import FavoriteButton from '@/components/FavoriteButton';

interface MiracoasterState {
  price: number;
  tickIndex: number;
  roundId: string;
  serverHash: string;
  enabled: boolean;
  rtpMode: string;
}

interface OpenPosition {
  id: string;
  direction: 'up' | 'down';
  entryPrice: number;
  bustPrice: number;
  wager: number;
  leverage: number;
  currentValue: number;
  pnl: number;
  roi: number;
}

interface PublicBet {
  id: string;
  userId: string;
  username: string;
  direction: 'up' | 'down';
  wager: number;
  leverage: number;
  entryPrice: number;
  bustPrice: number;
  currentPrice: number;
  status: string;
  pnl: number;
  roi: number;
  timestamp: Date;
}

interface CashoutMarker {
  price: number;
  index: number;
  direction: 'up' | 'down';
  payout: number;
  username: string;
  pnl: number;
  roi: number;
}

export default function Miracoaster() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { gameMode } = useGameMode();
  const [, setLocation] = useLocation();
  const [direction, setDirection] = useState<'up' | 'down'>('up');
  const [wager, setWager] = useState(1);
  const [leverage, setLeverage] = useState(10);
  const [currentPrice, setCurrentPrice] = useState(1000);
  const [priceHistory, setPriceHistory] = useState<number[]>([]);
  const [timeHistory, setTimeHistory] = useState<Date[]>([]);
  const [activeTab, setActiveTab] = useState<'views' | 'studios'>('views');
  const [isCrashed, setIsCrashed] = useState(false);
  const crashThreshold = 850; // Price crashes if it drops below this
  
  // Auto play state
  const [mode, setMode] = useState<'manual' | 'auto'>('manual');
  const [autoRounds, setAutoRounds] = useState("10");
  const [autoRunning, setAutoRunning] = useState(false);
  const [currentAutoRound, setCurrentAutoRound] = useState(0);
  const [stopOnProfit, setStopOnProfit] = useState("");
  const [stopOnLoss, setStopOnLoss] = useState("");
  const [totalAutoProfit, setTotalAutoProfit] = useState(0);
  const autoIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [cashoutMarkers, setCashoutMarkers] = useState<CashoutMarker[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const audioContext = useRef<AudioContext | null>(null);
  const risingOscillator = useRef<OscillatorNode | null>(null);
  const risingGain = useRef<GainNode | null>(null);

  // Initialize audio context
  useEffect(() => {
    audioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    return () => {
      stopRisingSound();
      audioContext.current?.close();
    };
  }, []);

  // Stop rising sound
  const stopRisingSound = () => {
    if (risingOscillator.current) {
      risingOscillator.current.stop();
      risingOscillator.current = null;
    }
    if (risingGain.current) {
      risingGain.current.disconnect();
      risingGain.current = null;
    }
  };

  // Play sound function with various miracoaster sounds
  const playSound = (type: 'roundStart' | 'rising' | 'cashout' | 'crash' | 'bet' | 'countdown' | 'bigWin') => {
    if (!audioEnabled || !audioContext.current) return;

    const ctx = audioContext.current;
    const now = ctx.currentTime;

    switch (type) {
      case 'roundStart':
        // Clear bell sound for new round
        const bellOsc = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bellOsc.connect(bellGain);
        bellGain.connect(ctx.destination);
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(880, now); // A5
        bellGain.gain.setValueAtTime(0.3, now);
        bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        bellOsc.start(now);
        bellOsc.stop(now + 0.5);
        
        // Add harmonic
        const bellHarmonic = ctx.createOscillator();
        const bellHarmonicGain = ctx.createGain();
        bellHarmonic.connect(bellHarmonicGain);
        bellHarmonicGain.connect(ctx.destination);
        bellHarmonic.type = 'sine';
        bellHarmonic.frequency.setValueAtTime(1760, now); // A6
        bellHarmonicGain.gain.setValueAtTime(0.15, now);
        bellHarmonicGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        bellHarmonic.start(now);
        bellHarmonic.stop(now + 0.3);
        break;

      case 'rising':
        // Continuous tone that increases with price/multiplier
        stopRisingSound(); // Stop any existing rising sound
        risingOscillator.current = ctx.createOscillator();
        risingGain.current = ctx.createGain();
        risingOscillator.current.connect(risingGain.current);
        risingGain.current.connect(ctx.destination);
        risingOscillator.current.type = 'sine';
        risingOscillator.current.frequency.setValueAtTime(200, now); // Base frequency
        risingGain.current.gain.setValueAtTime(0.1, now);
        risingOscillator.current.start(now);
        break;

      case 'cashout':
        // Triumphant ka-ching
        stopRisingSound();
        const cashNotes = [523, 659, 784, 1047]; // C5, E5, G5, C6
        cashNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'triangle';
          const startTime = now + i * 0.08;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
        break;

      case 'bigWin':
        // Extended fanfare for big wins
        stopRisingSound();
        const fanfareNotes = [523, 587, 659, 784, 880, 1047, 1319]; // C5, D5, E5, G5, A5, C6, E6
        fanfareNotes.forEach((freq, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = 'sine';
          const startTime = now + i * 0.1;
          osc.frequency.setValueAtTime(freq, startTime);
          gain.gain.setValueAtTime(0.3, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
        break;

      case 'crash':
        // Dramatic explosion/crash
        stopRisingSound();
        
        // Low frequency rumble
        const rumbleOsc = ctx.createOscillator();
        const rumbleGain = ctx.createGain();
        rumbleOsc.connect(rumbleGain);
        rumbleGain.connect(ctx.destination);
        rumbleOsc.type = 'sawtooth';
        rumbleOsc.frequency.setValueAtTime(50, now);
        rumbleOsc.frequency.exponentialRampToValueAtTime(20, now + 0.5);
        rumbleGain.gain.setValueAtTime(0.3, now);
        rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        rumbleOsc.start(now);
        rumbleOsc.stop(now + 0.5);
        
        // Noise explosion
        const noise = ctx.createBufferSource();
        const noiseBuffer = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseData.length; i++) {
          noiseData[i] = (Math.random() - 0.5) * Math.exp(-i / (noiseData.length * 0.2));
        }
        noise.buffer = noiseBuffer;
        const noiseGain = ctx.createGain();
        noise.connect(noiseGain);
        noiseGain.connect(ctx.destination);
        noiseGain.gain.setValueAtTime(0.4, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        noise.start(now);
        break;

      case 'bet':
        // Chip placement sound
        const betOsc = ctx.createOscillator();
        const betGain = ctx.createGain();
        betOsc.connect(betGain);
        betGain.connect(ctx.destination);
        betOsc.type = 'triangle';
        betOsc.frequency.setValueAtTime(1000, now);
        betOsc.frequency.exponentialRampToValueAtTime(700, now + 0.1);
        betGain.gain.setValueAtTime(0.2, now);
        betGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        betOsc.start(now);
        betOsc.stop(now + 0.1);
        break;

      case 'countdown':
        // Beep for countdown
        const beepOsc = ctx.createOscillator();
        const beepGain = ctx.createGain();
        beepOsc.connect(beepGain);
        beepGain.connect(ctx.destination);
        beepOsc.type = 'sine';
        beepOsc.frequency.setValueAtTime(600, now);
        beepGain.gain.setValueAtTime(0.2, now);
        beepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        beepOsc.start(now);
        beepOsc.stop(now + 0.1);
        break;
    }
  };

  // Fetch game state
  const { data: gameState } = useQuery<MiracoasterState>({
    queryKey: ['/api/miracoaster/status'],
    refetchInterval: 1000,
  });

  // Fetch open position
  const { data: position } = useQuery<OpenPosition | null>({
    queryKey: ['/api/miracoaster/position'],
    refetchInterval: 1000,
  });

  // Fetch balance
  const { data: balance } = useQuery<{ available: number; locked: number; currency: string; total: number; sweepsCashTotal: number; sweepsCashRedeemable: number; balanceMode: string }>({
    queryKey: ['/api/balance'],
    refetchInterval: 3000,
    refetchOnWindowFocus: true,
    staleTime: 1000,
  });

  // Fetch current public bets
  const { data: publicBets = [] } = useQuery<PublicBet[]>({
    queryKey: ['/api/miracoaster/public-bets'],
    refetchInterval: 1000,
  });

  // Place bet mutation
  const placeBet = useMutation({
    mutationFn: async (data: { direction: 'up' | 'down'; wager: number; leverage: number }) => {
      const response = await apiRequest('POST', '/api/miracoaster/bet', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/miracoaster/position'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      playSound('bet');
      playSound('roundStart');
      playSound('rising'); // Start the rising sound
      // No notification for position opened
    },
    onError: (error: any) => {
      toast({
        title: 'Bet Failed',
        description: error.message || 'Failed to place bet',
        variant: 'destructive',
      });
    },
  });

  // Cashout mutation
  const cashout = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/miracoaster/cashout', {});
      return response.json();
    },
    onSuccess: (data) => {
      // Add cash out marker
      if (position) {
        const username = user?.username || user?.firstName || 'Hidden';
        const marker: CashoutMarker = {
          price: currentPrice,
          index: priceHistory.length - 1,
          direction: position.direction,
          payout: data.payout,
          username: username,
          pnl: position.pnl,
          roi: position.roi
        };
        setCashoutMarkers(prev => [...prev, marker]);
      }
      
      // Update auto profit if in auto mode
      if (autoRunning) {
        // Backend already returns values in dollars, not cents
        const profit = data.payout - wager;
        setTotalAutoProfit(prev => prev + profit);
      }
      
      queryClient.invalidateQueries({ queryKey: ['/api/miracoaster/position'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      // Play appropriate sound based on payout
      if (data.payout > wager * 100 * 5) {
        playSound('bigWin');
      } else {
        playSound('cashout');
      }
      
      // Only show notification for wins of $100+
      // Backend already returns values in dollars, not cents
      const payoutCredits = data.payout;
      if (payoutCredits >= 100) {
        toast({
          title: '💰 BIG WIN - Position Closed',
          description: `Cashed out for ${payoutCredits.toFixed(2)} credits`,
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Cashout Failed',
        description: error.message || 'Failed to cash out',
        variant: 'destructive',
      });
    },
  });

  // Update price from game state
  useEffect(() => {
    if (gameState?.price) {
      setCurrentPrice(gameState.price);
      setPriceHistory(prev => [...prev.slice(-100), gameState.price]);
      setTimeHistory(prev => [...prev.slice(-100), new Date()]);
      
      // Update rising sound frequency based on price
      if (risingOscillator.current && audioContext.current && position) {
        const priceMultiplier = gameState.price / 1000; // Normalize around 1000 base price
        const frequency = 200 + (priceMultiplier * 100); // Increase frequency with price
        risingOscillator.current.frequency.setValueAtTime(frequency, audioContext.current.currentTime);
      }
      
      // Check for crash
      if (gameState.price < crashThreshold && !isCrashed) {
        setIsCrashed(true);
        playSound('crash');
        // No notification for market crash
      } else if (gameState.price >= crashThreshold && isCrashed) {
        setIsCrashed(false);
        if (position) {
          playSound('rising'); // Resume rising sound if position is still open
        }
      }
    }
  }, [gameState?.price, isCrashed, position]);

  // Draw chart
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || priceHistory.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas with dark background
    ctx.fillStyle = '#0f1117';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Set up dimensions
    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const rightPadding = 80; // Extra padding for price scale
    const bottomPadding = 60; // Extra padding for time labels

    // Find min/max for scaling with some padding
    const actualMinPrice = Math.min(...priceHistory);
    const actualMaxPrice = Math.max(...priceHistory);
    const pricePadding = (actualMaxPrice - actualMinPrice) * 0.1 || 50;
    const minPrice = actualMinPrice - pricePadding;
    const maxPrice = actualMaxPrice + pricePadding;
    const priceRange = maxPrice - minPrice || 1;

    // Draw vertical grid lines and time labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    for (let i = 0; i <= 10; i++) {
      const x = padding + (width - padding - rightPadding) * i / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding);
      ctx.lineTo(x, height - bottomPadding);
      ctx.stroke();
      
      // Draw time labels
      if (timeHistory.length > 0 && i % 2 === 0) {
        const timeIndex = Math.floor((timeHistory.length - 1) * i / 10);
        if (timeIndex >= 0 && timeIndex < timeHistory.length) {
          const time = timeHistory[timeIndex];
          const hours = time.getHours().toString().padStart(2, '0');
          const minutes = time.getMinutes().toString().padStart(2, '0');
          const seconds = time.getSeconds().toString().padStart(2, '0');
          ctx.fillText(`${hours}:${minutes}:${seconds}`, x, height - bottomPadding + 5);
        }
      }
    }

    // Draw horizontal grid lines and price labels
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    ctx.font = '11px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    
    for (let i = 0; i <= 6; i++) {
      const y = padding + (height - padding - bottomPadding) * i / 6;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - rightPadding, y);
      ctx.stroke();
      
      // Draw price labels on the right
      const price = maxPrice - (priceRange * i / 6);
      ctx.fillText(`$${price.toFixed(0)}`, width - rightPadding + 35, y);
    }

    // Draw crash threshold line if applicable
    if (crashThreshold >= minPrice && crashThreshold <= maxPrice) {
      const crashY = height - bottomPadding - ((crashThreshold - minPrice) / priceRange) * (height - padding - bottomPadding);
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 5]);
      ctx.beginPath();
      ctx.moveTo(padding, crashY);
      ctx.lineTo(width - rightPadding, crashY);
      ctx.stroke();
      
      // Draw crash label
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('CRASH', padding + 5, crashY - 5);
      ctx.setLineDash([]);
    }

    // Draw price line with gradient based on crash status
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    if (isCrashed) {
      gradient.addColorStop(0, '#ef4444');
      gradient.addColorStop(1, '#dc2626');
    } else {
      gradient.addColorStop(0, '#f59e0b');
      gradient.addColorStop(1, '#fbbf24');
    }
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.beginPath();

    priceHistory.forEach((price, index) => {
      const x = padding + (width - padding - rightPadding) * index / (priceHistory.length - 1);
      const y = height - bottomPadding - ((price - minPrice) / priceRange) * (height - padding - bottomPadding);

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();
    
    // Fill area under the line
    if (priceHistory.length > 1) {
      const fillGradient = ctx.createLinearGradient(0, padding, 0, height - bottomPadding);
      if (isCrashed) {
        fillGradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
        fillGradient.addColorStop(1, 'rgba(239, 68, 68, 0.02)');
      } else {
        fillGradient.addColorStop(0, 'rgba(245, 158, 11, 0.2)');
        fillGradient.addColorStop(1, 'rgba(245, 158, 11, 0.02)');
      }
      
      ctx.fillStyle = fillGradient;
      ctx.beginPath();
      priceHistory.forEach((price, index) => {
        const x = padding + (width - padding - rightPadding) * index / (priceHistory.length - 1);
        const y = height - bottomPadding - ((price - minPrice) / priceRange) * (height - padding - bottomPadding);
        
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.lineTo(width - rightPadding, height - bottomPadding);
      ctx.lineTo(padding, height - bottomPadding);
      ctx.closePath();
      ctx.fill();
    }

    // Draw cash out markers with usernames - with overlap prevention
    const drawnLabels: {x: number, y: number, width: number, height: number}[] = [];
    
    cashoutMarkers.forEach(marker => {
      // Calculate position based on marker index
      if (marker.index >= 0 && marker.index < priceHistory.length) {
        const x = padding + (width - padding - rightPadding) * marker.index / (priceHistory.length - 1);
        const y = height - bottomPadding - ((marker.price - minPrice) / priceRange) * (height - padding - bottomPadding);

        // Draw small circle at the exact cashout point first
        ctx.fillStyle = marker.direction === 'up' ? '#10b981' : '#ef4444';
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, 2 * Math.PI);
        ctx.fill();

        // Prepare username label
        ctx.font = 'bold 10px Inter, sans-serif';
        // Truncate username if too long
        let displayUsername = marker.username;
        if (displayUsername.length > 8) {
          displayUsername = displayUsername.substring(0, 6) + '...';
        }
        
        const textMetrics = ctx.measureText(displayUsername);
        const textWidth = textMetrics.width;
        const boxPadding = 4;
        const boxHeight = 16;
        
        // Try different positions to avoid overlap
        let boxX = x - textWidth / 2 - boxPadding;
        let boxY = y - boxHeight - 8;
        
        // Check for overlaps and adjust position
        let offsetY = 0;
        for (const label of drawnLabels) {
          if (Math.abs(x - label.x) < (textWidth + label.width) / 2 + 10 &&
              Math.abs(boxY - label.y) < boxHeight + 5) {
            offsetY -= boxHeight + 5;
            boxY = y - boxHeight - 8 + offsetY;
          }
        }
        
        // Only draw label if it's within canvas bounds
        if (boxY > padding && boxX > padding && boxX + textWidth + boxPadding * 2 < width - rightPadding) {
          // Draw background rectangle with rounded corners
          ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
          ctx.strokeStyle = marker.direction === 'up' ? '#10b981' : '#ef4444';
          ctx.lineWidth = 1;
          
          // Simple rounded rectangle
          const radius = 3;
          ctx.beginPath();
          ctx.moveTo(boxX + radius, boxY);
          ctx.lineTo(boxX + textWidth + boxPadding * 2 - radius, boxY);
          ctx.quadraticCurveTo(boxX + textWidth + boxPadding * 2, boxY, boxX + textWidth + boxPadding * 2, boxY + radius);
          ctx.lineTo(boxX + textWidth + boxPadding * 2, boxY + boxHeight - radius);
          ctx.quadraticCurveTo(boxX + textWidth + boxPadding * 2, boxY + boxHeight, boxX + textWidth + boxPadding * 2 - radius, boxY + boxHeight);
          ctx.lineTo(boxX + radius, boxY + boxHeight);
          ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
          ctx.lineTo(boxX, boxY + radius);
          ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          
          // Draw username text
          ctx.fillStyle = '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.font = 'bold 10px Inter, sans-serif';
          ctx.fillText(displayUsername, x, boxY + boxHeight / 2);
          
          // Draw small indicator line from box to price point
          ctx.strokeStyle = marker.direction === 'up' ? '#10b981' : '#ef4444';
          ctx.lineWidth = 0.5;
          ctx.setLineDash([2, 2]);
          ctx.beginPath();
          ctx.moveTo(x, boxY + boxHeight);
          ctx.lineTo(x, y - 3);
          ctx.stroke();
          ctx.setLineDash([]);
          
          // Remember this label position
          drawnLabels.push({x, y: boxY, width: textWidth + boxPadding * 2, height: boxHeight});
        }
      }
    });

    // Draw current price dot and label
    if (priceHistory.length > 0) {
      const lastPrice = priceHistory[priceHistory.length - 1];
      const x = width - rightPadding;
      const y = height - bottomPadding - ((lastPrice - minPrice) / priceRange) * (height - padding - bottomPadding);

      // Draw pulsing dot
      ctx.fillStyle = isCrashed ? '#ef4444' : '#f59e0b';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
      
      // Draw price label next to current price
      ctx.fillStyle = isCrashed ? '#ef4444' : '#10b981';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`$${lastPrice.toFixed(2)}`, x + 10, y);
    }
  }, [priceHistory, timeHistory, cashoutMarkers, isCrashed]);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    
    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'miracoaster_update') {
          setCurrentPrice(data.price);
          setPriceHistory(prev => [...prev.slice(-100), data.price]);
        } else if (data.type === 'playerJoined' || data.type === 'playerCashedOut' || 
                   data.type === 'betPlaced' || data.type === 'betCashedOut' ||
                   data.type === 'roundStarted' || data.type === 'roundCrashed') {
          // Invalidate public bets query to show latest bets
          queryClient.invalidateQueries({ queryKey: ['/api/miracoaster/public-bets'] });
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [queryClient]);

  const calculateBustPrice = () => {
    if (direction === 'up') {
      return currentPrice * (1 - (1 / leverage));
    } else {
      return currentPrice * (1 + (1 / leverage));
    }
  };

  const formatPrice = (price: number) => price.toFixed(2);
  // Backend already returns values in dollars, not cents
  const formatCredits = (amount: number) => amount.toFixed(2);
  const formatRupees = (amount: number) => `$ ${amount.toFixed(2)}`;
  
  // Auto play functions
  const startAutoPlay = () => {
    if (!user) {
      toast({ 
        title: "Login Required", 
        description: "Please log in to play",
        variant: "destructive" 
      });
      return;
    }
    
    if (wager < 0.50 || wager > 100) {
      toast({ 
        title: "Invalid Wager", 
        description: "Wager must be between 0.50 and 100 credits",
        variant: "destructive" 
      });
      return;
    }
    
    setAutoRunning(true);
    setCurrentAutoRound(0);
    setTotalAutoProfit(0);
  };
  
  const stopAutoPlay = () => {
    setAutoRunning(false);
    setCurrentAutoRound(0);
    if (autoIntervalRef.current) {
      clearTimeout(autoIntervalRef.current);
      autoIntervalRef.current = null;
    }
  };
  
  // Auto play effect for betting
  useEffect(() => {
    if (!autoRunning || position) return;
    
    const rounds = parseInt(autoRounds) || 0;
    if (currentAutoRound >= rounds) {
      stopAutoPlay();
      toast({ 
        title: "Auto Play Complete", 
        description: `Finished ${rounds} rounds. Total profit: ${totalAutoProfit.toFixed(2)} credits`,
      });
      return;
    }
    
    // Check stop conditions
    if (stopOnProfit && totalAutoProfit >= parseFloat(stopOnProfit)) {
      stopAutoPlay();
      toast({ 
        title: "Auto Play Stopped", 
        description: `Target profit of ${stopOnProfit} credits reached!`,
      });
      return;
    }
    
    if (stopOnLoss && Math.abs(totalAutoProfit) >= parseFloat(stopOnLoss)) {
      stopAutoPlay();
      toast({ 
        title: "Auto Play Stopped", 
        description: `Loss limit of ${stopOnLoss} credits reached`,
        variant: "destructive" 
      });
      return;
    }
    
    // Check balance
    if ((balance?.available || 0) < wager * 100) {
      stopAutoPlay();
      toast({ 
        title: "Insufficient Balance", 
        description: "Not enough credits",
        variant: "balance" as any,
        duration: 1000
      });
      return;
    }
    
    // Initiate next bet with a delay
    autoIntervalRef.current = setTimeout(() => {
      playSound('countdown');
      setTimeout(() => {
        placeBet.mutate({ direction, wager, leverage });
        setCurrentAutoRound(prev => prev + 1);
      }, 500);
    }, 1500);
    
    return () => {
      if (autoIntervalRef.current) {
        clearTimeout(autoIntervalRef.current);
      }
    };
  }, [autoRunning, currentAutoRound, position, totalAutoProfit, autoRounds, stopOnProfit, stopOnLoss, balance, direction, wager, leverage]);

  return (
    <div className="min-h-screen bg-[#1a1d29] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-3 md:px-6 py-2 md:py-3">
        <div className="flex items-center justify-between">
          <div className="bg-gray-800/50 rounded-lg px-2 md:px-4 py-1 md:py-2">
            <span className="text-[10px] md:text-[10px] font-bold text-yellow-500">{formatRupees(balance?.available || 0)}</span>
            <div className="text-[10px] md:text-[8px] text-gray-500">Available Balance</div>
          </div>
          <div className="hidden md:block text-[8px] text-gray-400">
            ROUND ENDS IN <span className="text-white font-mono">03:07:19</span>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className="p-2 rounded-lg bg-gray-800/50 text-white hover:bg-gray-700 transition-colors"
              title={audioEnabled ? "Mute sounds" : "Enable sounds"}
            >
              {audioEnabled ? <Volume2 style={{width: '3px', height: '3px'}} className="" /> : <VolumeX style={{width: '3px', height: '3px'}} className="" />}
            </button>
            <div className="flex items-center gap-2">
              <FavoriteButton gameName="Miracoaster" />
              <button
                onClick={() => setLocation("/")}
                className="bg-gradient-to-r from-[#B8941A] to-[#D4AF37] hover:from-[#D4AF37] hover:to-[#F4D06F] text-black font-semibold px-4 py-2 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm flex items-center gap-2"
                data-testid="button-back-home"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Home
              </button>
            </div>
            <Button variant="ghost" size="sm" className="hidden md:inline-flex">Tick ↗</Button>
            <div className="flex gap-1 md:gap-2">
              <Button 
                variant={activeTab === 'views' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('views')}
                className="text-[8px] md:text-[8px] px-2 md:px-3"
              >
                Views
              </Button>
              <Button 
                variant={activeTab === 'studios' ? 'secondary' : 'ghost'} 
                size="sm"
                onClick={() => setActiveTab('studios')}
                className="text-[8px] md:text-[8px] px-2 md:px-3"
              >
                Studios
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col h-[calc(100vh-60px)]">
        {/* Chart Area - NOW AT TOP */}
        <div className="flex-1 p-3 md:p-6">
          {/* Price Info Bar */}
          <div className="bg-gray-900/50 rounded-lg p-2 md:p-3 mb-2 md:mb-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4 md:gap-6 w-full sm:w-auto">
                <div className="flex items-baseline gap-1">
                  <span className="text-[9px] sm:text-[10px] md:text-[8px] text-gray-400 uppercase">Price:</span>
                  <span className={cn(
                    "font-bold text-[8px] sm:text-[8px] md:text-[10px] whitespace-nowrap",
                    isCrashed ? "text-red-500" : "text-white"
                  )}>
                    ${currentPrice.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 hidden xs:flex">
                  <span className="text-[9px] sm:text-[10px] md:text-[8px] text-gray-400 uppercase">Open:</span>
                  <span className="font-semibold text-[8px] sm:text-[8px] md:text-[10px] text-white whitespace-nowrap">
                    ${(priceHistory[0] || 1000).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[9px] sm:text-[10px] md:text-[8px] text-gray-400 uppercase">High:</span>
                  <span className="font-semibold text-[8px] sm:text-[8px] md:text-[10px] text-green-500 whitespace-nowrap">
                    ${Math.max(...(priceHistory.length > 0 ? priceHistory : [1000])).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-[9px] sm:text-[10px] md:text-[8px] text-gray-400 uppercase">Low:</span>
                  <span className="font-semibold text-[8px] sm:text-[8px] md:text-[10px] text-red-500 whitespace-nowrap">
                    ${Math.min(...(priceHistory.length > 0 ? priceHistory : [1000])).toFixed(2)}
                  </span>
                </div>
              </div>
              {isCrashed && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-500/20 rounded-md border border-red-500/50">
                  <span className="text-red-500 font-bold animate-pulse text-[10px] sm:text-[8px] md:text-[8px] whitespace-nowrap">CRASHED ${currentPrice.toFixed(0)}</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="h-[300px] md:h-[calc(100%-80px)] bg-[#0f1117] rounded-lg relative">
            <canvas
              ref={canvasRef}
              width={1200}
              height={600}
              className="w-full h-full rounded-lg"
            />
            
            {/* Price indicators on chart */}
            {position && (
              <div className="absolute top-2 right-2 md:top-4 md:right-4 flex flex-col gap-1 max-w-[120px] md:max-w-[150px]">
                <div className="flex items-center justify-between gap-1 bg-black/70 backdrop-blur-sm rounded px-2 py-1 border border-gray-700/50">
                  <span className="text-[9px] md:text-[8px] text-gray-400 uppercase">PNL:</span>
                  <span className={cn(
                    "font-bold text-[10px] md:text-[8px]",
                    position.pnl >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {position.pnl >= 0 ? '+' : ''}{formatRupees(position.pnl)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-1 bg-black/70 backdrop-blur-sm rounded px-2 py-1 border border-gray-700/50">
                  <span className="text-[9px] md:text-[8px] text-gray-400 uppercase">ROI:</span>
                  <span className={cn(
                    "font-bold text-[10px] md:text-[8px]",
                    position.roi >= 0 ? "text-green-500" : "text-red-500"
                  )}>
                    {position.roi >= 0 ? '+' : ''}{(position.roi * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Current price display with crash indicator */}
            <div className="absolute bottom-2 right-2 md:bottom-4 md:right-4 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 border border-gray-700/50">
              <div className="flex flex-col items-end">
                <div className={cn(
                  "text-[10px] md:text-[10px] font-bold",
                  isCrashed ? "text-red-500 animate-pulse" : "text-yellow-500"
                )}>
                  ${formatPrice(currentPrice)}
                </div>
                {currentPrice < crashThreshold && (
                  <div className="text-[9px] md:text-[8px] text-red-500 mt-0.5 whitespace-nowrap">Below crash!</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controls - NOW AT BOTTOM */}
        <div className="w-full bg-[#0f1117] border-t border-gray-800 p-3 md:p-6 flex flex-col">
          {/* Game Info */}
          <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
            <h3 className="text-[8px] font-bold text-yellow-500 mb-1">🎢 Rollercoaster Game</h3>
            <p className="text-[8px] text-gray-400">
              Price resets every 24h at 00:00 UTC to $1,000.
              Crash threshold: ${crashThreshold}
            </p>
          </div>
          
          {/* Manual/Auto Toggle */}
          <div className="flex gap-2 mb-3 md:mb-6">
            <Button 
              className={cn(
                "flex-1 font-semibold",
                mode === 'manual' 
                  ? "bg-gradient-to-r from-[#4d2b99] to-[#3e2b6b] text-[#D4AF37]" 
                  : "bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20"
              )}
              onClick={() => setMode('manual')}
              disabled={autoRunning}
            >
              MANUAL
            </Button>
            <Button 
              className={cn(
                "flex-1 font-semibold",
                mode === 'auto' 
                  ? "bg-gradient-to-r from-[#4d2b99] to-[#3e2b6b] text-[#D4AF37]" 
                  : "bg-gradient-to-r from-[#2d1b69] to-[#1e1b4b] hover:from-[#3d2b79] hover:to-[#2e2b5b] text-[#D4AF37] border border-[#D4AF37]/20"
              )}
              onClick={() => setMode('auto')}
              disabled={autoRunning}
            >
              AUTO
            </Button>
          </div>

          {/* Will the price go up or down? */}
          <div className="text-[8px] text-gray-400 mb-4 mt-2 text-center font-semibold">WILL THE PRICE GO UP OR DOWN?</div>

          {/* Direction buttons */}
          <div className="flex gap-2 mb-3 md:mb-6">
            <Button
              className={cn(
                "flex-1 h-12",
                direction === 'up' 
                  ? "bg-green-600 hover:bg-green-700" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
              onClick={() => setDirection('up')}
            >
              <ArrowUp className="mr-2 "style={{width: '3px', height: '3px'}} />
              Up
            </Button>
            <Button
              className={cn(
                "flex-1 h-12",
                direction === 'down' 
                  ? "bg-red-600 hover:bg-red-700" 
                  : "bg-gray-700 hover:bg-gray-600"
              )}
              onClick={() => setDirection('down')}
            >
              <ArrowDown className="mr-2 "style={{width: '3px', height: '3px'}} />
              Down
            </Button>
          </div>

          {/* Wager input */}
          <div className="mb-3 md:mb-6">
            <label className="text-[8px] md:text-[8px] text-gray-400 mb-2 block font-semibold uppercase">Wager</label>
            <div className="relative bg-gray-800 rounded-lg flex items-center">
              <span className="pl-2 md:pl-3 text-yellow-500 text-[10px] md:text-[10px]">$</span>
              <Input
                type="number"
                value={wager}
                onChange={(e) => setWager(Number(e.target.value))}
                className="flex-1 bg-transparent border-0 text-white text-[10px] md:text-[10px] pl-1 md:pl-2 focus:ring-0"
              />
              <div className="flex gap-1 pr-1 md:pr-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 md:h-8 px-2 md:px-3 bg-gray-700 hover:bg-gray-600 text-[8px] md:text-[8px]"
                  onClick={() => setWager(w => Math.max(1, w / 2))}
                >
                  ½
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-7 md:h-8 px-2 md:px-3 bg-gray-700 hover:bg-gray-600 text-[8px] md:text-[8px]"
                  onClick={() => setWager(w => w * 2)}
                >
                  2x
                </Button>
              </div>
            </div>
          </div>

          {/* Auto mode controls */}
          {mode === 'auto' && (
            <div className="space-y-4 mb-6">
              {/* Number of rounds */}
              <div>
                <label className="text-[8px] text-gray-400">Number of Rounds</label>
                <Input
                  type="number"
                  value={autoRounds}
                  onChange={(e) => setAutoRounds(e.target.value)}
                  disabled={autoRunning}
                  className="w-full mt-1 bg-gray-800 border-gray-700 text-white"
                  placeholder="10"
                  min="1"
                  max="1000"
                />
              </div>
              
              {/* Stop on profit */}
              <div>
                <label className="text-[8px] text-gray-400">Stop on Profit (optional)</label>
                <Input
                  type="number"
                  value={stopOnProfit}
                  onChange={(e) => setStopOnProfit(e.target.value)}
                  disabled={autoRunning}
                  className="w-full mt-1 bg-gray-800 border-gray-700 text-white"
                  placeholder="0.00"
                  min="0"
                />
              </div>
              
              {/* Stop on loss */}
              <div>
                <label className="text-[8px] text-gray-400">Stop on Loss (optional)</label>
                <Input
                  type="number"
                  value={stopOnLoss}
                  onChange={(e) => setStopOnLoss(e.target.value)}
                  disabled={autoRunning}
                  className="w-full mt-1 bg-gray-800 border-gray-700 text-white"
                  placeholder="0.00"
                  min="0"
                />
              </div>
              
              {/* Auto play stats */}
              {autoRunning && (
                <div className="p-3 rounded-lg bg-gray-800 space-y-2">
                  <div className="flex justify-between text-[8px]">
                    <span className="text-gray-400">Round</span>
                    <span className="text-white">{currentAutoRound} / {autoRounds}</span>
                  </div>
                  <div className="flex justify-between text-[8px]">
                    <span className="text-gray-400">Total Profit</span>
                    <span className={cn(
                      "font-semibold",
                      totalAutoProfit >= 0 ? "text-green-500" : "text-red-500"
                    )}>
                      {totalAutoProfit >= 0 ? "+" : ""}{totalAutoProfit.toFixed(2)} Credits
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Payout Multiplier */}
          <div className="mb-3 md:mb-6">
            <label className="text-[10px] md:text-[8px] text-gray-400 mb-1 md:mb-2 block uppercase">Payout Multiplier</label>
            <div className="bg-gray-800 rounded-lg p-2 md:p-4">
              <div className="flex items-center justify-between mb-2 md:mb-3 gap-2">
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="w-7 h-7 md:w-8 md:h-8 p-0 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
                  onClick={() => setLeverage(Math.max(1, leverage - 1))}
                >
                  <span className="text-[10px]">−</span>
                </Button>
                <div className="text-center flex-1 min-w-0">
                  <div className="text-[10px] md:text-[10px] font-bold text-white">{leverage}x</div>
                  <div className="text-[9px] md:text-[8px] text-gray-400 mt-0.5 truncate">
                    Bust: ${formatPrice(calculateBustPrice())}
                  </div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="w-7 h-7 md:w-8 md:h-8 p-0 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center"
                  onClick={() => setLeverage(Math.min(1000, leverage + 1))}
                >
                  <span className="text-[10px]">+</span>
                </Button>
              </div>
              <Slider
                value={[leverage]}
                onValueChange={([value]) => setLeverage(value)}
                min={1}
                max={1000}
                step={1}
                className="mt-2 md:mt-3"
              />
              <div className="flex justify-between text-[9px] md:text-[8px] mt-1.5 md:mt-2">
                <span className="text-green-500 font-semibold">1x·Safe</span>
                <span className="text-red-500 font-semibold">Wild·1000x</span>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          {position ? (
            <div className="space-y-4">
              <div className="bg-gray-800 rounded p-3 text-[8px]">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Entry Price:</span>
                  <span>{formatPrice(position.entryPrice)}</span>
                </div>
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Current Value:</span>
                  <span className={position.pnl >= 0 ? "text-green-500" : "text-red-500"}>
                    {formatRupees(position.currentValue)}
                  </span>
                </div>
              </div>
              <Button
                className={cn(
                  "w-full h-12 font-bold text-[8px] md:text-[10px]",
                  isCrashed ? "bg-red-500 hover:bg-red-600 text-white" : "bg-yellow-500 hover:bg-yellow-600 text-black"
                )}
                onClick={() => cashout.mutate()}
                disabled={cashout.isPending || isCrashed}
              >
                <span className="truncate">
                  {isCrashed ? 'CRASHED' : cashout.isPending ? 'CASHING...' : `CASH OUT ${formatRupees(position.currentValue)}`}
                </span>
              </Button>
            </div>
          ) : (
            <>
              {mode === 'manual' ? (
                <>
                  <div className="text-[8px] text-gray-500 mb-4">
                    Log in to place a bet
                  </div>
                  <Button
                    className={cn(
                      "w-full h-12 font-bold text-[8px] md:text-[10px]",
                      isCrashed ? "bg-red-500 hover:bg-red-600 text-white" : "bg-green-500 hover:bg-green-600 text-black"
                    )}
                    onClick={() => placeBet.mutate({ direction, wager, leverage })}
                    disabled={!gameState?.enabled || placeBet.isPending || !balance || (gameMode === 'real' ? (balance.sweepsCashTotal || 0) : (balance.available || 0)) < wager || isCrashed}
                  >
                    <span className="truncate px-2">
                      {isCrashed ? 'CRASHED' :
                       !gameState?.enabled ? 'DISABLED' : 
                       !balance || (gameMode === 'real' ? (balance.sweepsCashTotal || 0) : (balance.available || 0)) < wager ? (gameMode === 'real' ? 'LOW SC BALANCE' : 'LOW BALANCE') :
                       placeBet.isPending ? 'PLACING...' : 'PLACE BET'}
                    </span>
                  </Button>
                </>
              ) : (
                <Button
                  className={cn(
                    "w-full h-12 font-bold text-[8px] md:text-[10px]",
                    autoRunning 
                      ? "bg-red-500 hover:bg-red-600 text-white" 
                      : "bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-black"
                  )}
                  onClick={autoRunning ? stopAutoPlay : startAutoPlay}
                  disabled={!autoRunning && (!gameState?.enabled || wager <= 0 || !balance || (gameMode === 'real' ? (balance.sweepsCashTotal || 0) : (balance.available || 0)) < wager || isCrashed)}
                >
                  <span className="truncate px-2">
                    {autoRunning ? 'STOP AUTO' : 
                     isCrashed ? 'CRASHED' :
                     !gameState?.enabled ? 'DISABLED' : 
                     !balance || (gameMode === 'real' ? (balance.sweepsCashTotal || 0) : (balance.available || 0)) < wager ? (gameMode === 'real' ? 'LOW SC BALANCE' : 'LOW BALANCE') :
                     'START AUTO'}
                  </span>
                </Button>
              )}
            </>
          )}

          {/* Bottom links */}
          <div className="mt-auto flex justify-between text-[10px] md:text-[8px] pt-2">
            <Button variant="link" size="sm" className="text-gray-400 p-0 h-auto">
              <span className="truncate">How It Works</span>
            </Button>
            <Button variant="link" size="sm" className="text-gray-400 p-0 h-auto">
              <span className="truncate">Calculator</span>
            </Button>
            <Button variant="link" size="sm" className="text-gray-400 p-0 h-auto">
              <span className="truncate">Leaderboard</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Public Bets Section */}
      <div className="border-t border-gray-800 bg-[#0f1117]">
        <div className="px-3 md:px-6 py-2 md:py-3">
          <h3 className="text-[8px] md:text-[8px] font-bold text-yellow-500 mb-1 md:mb-2">PUBLIC BETS</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-[8px] md:text-[8px]">
              <thead>
                <tr className="text-gray-400 text-[9px] sm:text-[10px] md:text-[8px] uppercase">
                  <th className="text-left py-1.5 pr-1 font-medium">Player</th>
                  <th className="text-center px-1 font-medium">Dir</th>
                  <th className="text-left px-1 font-medium">Wager</th>
                  <th className="text-left px-1 hidden sm:table-cell font-medium">Lev</th>
                  <th className="text-left px-1 hidden md:table-cell font-medium">Bust</th>
                  <th className="text-left px-1 font-medium">PNL</th>
                  <th className="text-left pl-1 font-medium">ROI</th>
                </tr>
              </thead>
              <tbody>
                {publicBets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-2 md:py-4 text-center text-gray-500 text-[8px] md:text-[8px]">
                      No active bets
                    </td>
                  </tr>
                ) : (
                  publicBets.map((bet) => (
                    <tr key={bet.id} className="border-t border-gray-800 text-[11px] sm:text-[8px] md:text-[8px]">
                      <td className="py-1.5 pr-1 max-w-[80px] sm:max-w-[120px]">
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 text-[10px] sm:text-[8px] hidden sm:inline">👤</span>
                          <span className="truncate block" title={bet.username}>
                            {bet.username.length > 10 ? bet.username.substring(0, 8) + '..' : bet.username}
                          </span>
                        </div>
                      </td>
                      <td className="px-1 text-center">
                        {bet.direction === 'up' ? (
                          <span className="text-green-500 text-[8px]">▲</span>
                        ) : (
                          <span className="text-red-500 text-[8px]">▼</span>
                        )}
                      </td>
                      <td className="px-1 whitespace-nowrap">{formatRupees(bet.wager)}</td>
                      <td className="px-1 hidden sm:table-cell whitespace-nowrap">x{bet.leverage}</td>
                      <td className="px-1 hidden md:table-cell whitespace-nowrap">${bet.bustPrice.toFixed(0)}</td>
                      <td className={cn("px-1 whitespace-nowrap", bet.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                        <span className="inline-block">
                          {bet.pnl >= 0 ? '+' : ''}{formatRupees(Math.abs(bet.pnl))}
                        </span>
                      </td>
                      <td className={cn("pl-1 whitespace-nowrap", bet.pnl >= 0 ? "text-green-500" : "text-red-500")}>
                        {(bet.roi * 100).toFixed(0)}%
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}