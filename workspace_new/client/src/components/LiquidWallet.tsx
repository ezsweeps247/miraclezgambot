import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  Zap, 
  Sparkles,
  Droplet,
  CircleDollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Coins
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface LiquidWalletProps {
  balance: {
    available: number;
    locked: number;
    total: number;
    currency: string;
  };
  recentTransactions?: Array<{
    id: string;
    type: 'deposit' | 'withdraw' | 'bet' | 'win';
    amount: number;
    timestamp: number;
  }>;
}

// Particle component for floating effects
const Particle = ({ delay = 0, x = 0 }: { delay?: number; x?: number }) => (
  <motion.div
    style={{width: '2.5px', height: '2.5px'}} className="absolute rounded-full bg-golden/30"
    initial={{ y: 0, x, opacity: 0 }}
    animate={{
      y: [-20, -100, -200],
      x: [x, x + (Math.random() - 0.5) * 50, x + (Math.random() - 0.5) * 100],
      opacity: [0, 1, 0],
    }}
    transition={{
      duration: 3,
      delay,
      repeat: Infinity,
      ease: "easeOut",
    }}
  />
);

// Liquid blob component
const LiquidBlob = ({ color, size = 200, position }: any) => (
  <motion.div
    className={`absolute rounded-full filter blur-xl ${color}`}
    style={{
      width: size,
      height: size,
      ...position,
    }}
    animate={{
      x: [0, 30, -30, 0],
      y: [0, -30, 30, 0],
      scale: [1, 1.1, 0.9, 1],
    }}
    transition={{
      duration: 8,
      repeat: Infinity,
      ease: "easeInOut",
    }}
  />
);

// Animated counter component
const AnimatedCounter = ({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValueRef = useRef(value);
  
  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    const duration = 1000;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      const currentValue = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(currentValue);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        prevValueRef.current = endValue;
      }
    };
    
    animate();
  }, [value]);
  
  return (
    <span>
      {prefix}{displayValue.toFixed(2)}{suffix}
    </span>
  );
};

export default function LiquidWallet({ balance, recentTransactions = [] }: LiquidWalletProps) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; delay: number }>>([]);
  const [pulseScale, setPulseScale] = useState(1);
  const controls = useAnimation();
  
  // Generate particles on transactions
  useEffect(() => {
    if (recentTransactions.length > 0) {
      const newParticles = Array.from({ length: 5 }, (_, i) => ({
        id: Date.now() + i,
        x: Math.random() * 200 - 100,
        delay: i * 0.1,
      }));
      setParticles(prev => [...prev.slice(-20), ...newParticles]);
      
      // Trigger pulse animation
      setPulseScale(1.1);
      setTimeout(() => setPulseScale(1), 300);
    }
  }, [recentTransactions.length]);
  
  // Wave animation for liquid effect
  const waveAnimation = {
    animate: {
      d: [
        "M0,50 Q50,30 100,50 T200,50 L200,100 L0,100 Z",
        "M0,50 Q50,70 100,50 T200,50 L200,100 L0,100 Z",
        "M0,50 Q50,30 100,50 T200,50 L200,100 L0,100 Z",
      ],
    },
    transition: {
      duration: 4,
      repeat: Infinity,
      ease: "easeInOut",
    },
  };
  
  return (
    <div className="relative">
      {/* Background liquid blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <LiquidBlob 
          color="bg-gradient-to-br from-blue-500/20 to-purple-500/20" 
          size={300}
          position={{ top: -100, left: -100 }}
        />
        <LiquidBlob 
          color="bg-gradient-to-br from-golden/20 to-yellow-500/20" 
          size={250}
          position={{ bottom: -100, right: -100 }}
        />
        <LiquidBlob 
          color="bg-gradient-to-br from-green-500/20 to-teal-500/20" 
          size={200}
          position={{ top: 100, right: 50 }}
        />
      </div>
      
      {/* Main wallet card */}
      <motion.div
        animate={{ scale: pulseScale }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <Card className="relative bg-gradient-to-br from-casino-card/90 via-casino-card/80 to-casino-accent/90 backdrop-blur-xl border-golden/20 overflow-hidden">
          {/* Liquid wave effect */}
          <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none">
            <svg className="w-full h-full" viewBox="0 0 200 100" preserveAspectRatio="none">
              <motion.path
                {...waveAnimation}
                fill="url(#liquidGradient)"
                opacity={0.3}
              />
              <defs>
                <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#D4AF37" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#D4AF37" stopOpacity={0.1} />
                </linearGradient>
              </defs>
            </svg>
          </div>
          
          <CardContent className="relative z-10 p-8">
            {/* Floating particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <AnimatePresence>
                {particles.map(particle => (
                  <Particle key={particle.id} delay={particle.delay} x={particle.x} />
                ))}
              </AnimatePresence>
            </div>
            
            {/* Header with animated icon */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <motion.div
                  className="relative"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-golden to-yellow-500 rounded-full blur-xl opacity-50" />
                  <div className="relative w-12 h-12 bg-gradient-to-br from-golden to-yellow-600 rounded-full flex items-center justify-center">
                    <Wallet style={{width: '3px', height: '3px'}} className="text-black" />
                  </div>
                </motion.div>
                <div>
                  <h3 className="text-[10px] font-bold text-white">Liquid Wallet</h3>
                  <p className="text-casino-text text-[8px]">Casino balance - {balance.currency}</p>
                </div>
              </div>
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Sparkles style={{width: '3px', height: '3px'}} className="text-golden" />
              </motion.div>
            </div>
            
            {/* Animated balance display */}
            <div className="space-y-6">
              {/* Total balance with liquid effect */}
              <motion.div
                className="relative"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-golden/20 to-yellow-500/20 rounded-xl blur-xl" />
                <div className="relative bg-gradient-to-br from-casino-dark/80 to-casino-dark/60 rounded-xl p-6 border border-golden/30">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-casino-text text-[8px] uppercase tracking-wide">Total Balance</span>
                    <CircleDollarSign style={{width: '3px', height: '3px'}} className="text-golden animate-pulse" />
                  </div>
                  <div className="text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-golden to-yellow-400">
                    <AnimatedCounter value={balance.total} suffix={` ${balance.currency}`} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <motion.div
                      style={{width: '2.5px', height: '2.5px'}} className="bg-green-500 rounded-full"
                      animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-green-500 text-[8px]">Live</span>
                  </div>
                </div>
              </motion.div>
              
              {/* Available and locked balances */}
              <div className="grid grid-cols-2 gap-4">
                {/* Available balance */}
                <motion.div
                  className="relative"
                  initial={{ x: -50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-teal-500/10 rounded-lg blur" />
                  <div className="relative bg-casino-dark/60 backdrop-blur rounded-lg p-4 border border-green-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-casino-text text-[8px]">Available</span>
                      <ArrowUpRight style={{width: '3.5px', height: '3.5px'}} className="text-green-500" />
                    </div>
                    <div className="text-[10px] font-bold text-green-500">
                      <AnimatedCounter value={balance.available} suffix={` ${balance.currency}`} />
                    </div>
                    <motion.div
                      className="mt-2 h-1 bg-green-900/30 rounded-full overflow-hidden"
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-teal-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(balance.available / balance.total) * 100}%` }}
                        transition={{ duration: 1, delay: 0.5 }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
                
                {/* Locked balance */}
                <motion.div
                  className="relative"
                  initial={{ x: 50, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10 rounded-lg blur" />
                  <div className="relative bg-casino-dark/60 backdrop-blur rounded-lg p-4 border border-orange-500/30">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-casino-text text-[8px]">Locked</span>
                      <ArrowDownRight style={{width: '3.5px', height: '3.5px'}} className="text-orange-500" />
                    </div>
                    <div className="text-[10px] font-bold text-orange-500">
                      <AnimatedCounter value={balance.locked} suffix={` ${balance.currency}`} />
                    </div>
                    <motion.div
                      className="mt-2 h-1 bg-orange-900/30 rounded-full overflow-hidden"
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-orange-500 to-red-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(balance.locked / balance.total) * 100}%` }}
                        transition={{ duration: 1, delay: 0.6 }}
                      />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
              
              {/* Animated bubbles */}
              <div className="relative h-20 overflow-hidden">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute bottom-0"
                    style={{ left: `${20 * i + 10}%` }}
                    animate={{
                      y: [-100, 0],
                      opacity: [0, 1, 1, 0],
                      scale: [0.5, 1, 1, 0.8],
                    }}
                    transition={{
                      duration: 3 + i,
                      delay: i * 0.5,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  >
                    <Droplet style={{width: '3px', height: '3px'}} className="text-golden/30" />
                  </motion.div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}