import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  Coins,
  TrendingUp,
  Activity,
  CircleDollarSign,
  Sparkles
} from "lucide-react";

interface Transaction {
  id: string;
  type: 'deposit' | 'withdraw' | 'bet' | 'win' | 'refund';
  amount: number;
  currency?: string;
  game?: string;
  timestamp: number;
  status?: 'pending' | 'processing' | 'completed';
}

interface LiquidTransactionStreamProps {
  transactions: Transaction[];
  maxDisplay?: number;
}

// Flowing particle that follows transaction path
const FlowingParticle = ({ delay = 0, path }: { delay?: number; path: 'in' | 'out' }) => {
  const isIncoming = path === 'in';
  
  return (
    <motion.div
      className={`absolute w-1 h-1 rounded-full ${isIncoming ? 'bg-green-400' : 'bg-red-400'}`}
      initial={{ 
        x: isIncoming ? -100 : 0, 
        y: isIncoming ? -50 : 0,
        opacity: 0 
      }}
      animate={{
        x: isIncoming ? [0, 50, 100] : [0, -50, -100],
        y: isIncoming ? [0, 25, 50] : [0, -25, -50],
        opacity: [0, 1, 1, 0],
      }}
      transition={{
        duration: 2,
        delay,
        ease: "easeInOut",
      }}
    />
  );
};

// Ripple effect component
const Ripple = ({ color = "bg-golden" }: { color?: string }) => (
  <motion.div
    className={`absolute inset-0 rounded-full ${color} opacity-20`}
    initial={{ scale: 0.8, opacity: 0.5 }}
    animate={{ scale: 2, opacity: 0 }}
    transition={{ duration: 1.5, ease: "easeOut" }}
  />
);

// Transaction item with liquid animation
const TransactionItem = ({ transaction, index }: { transaction: Transaction; index: number }) => {
  const [showRipple, setShowRipple] = useState(false);
  
  useEffect(() => {
    setShowRipple(true);
    const timer = setTimeout(() => setShowRipple(false), 1500);
    return () => clearTimeout(timer);
  }, [transaction.id]);
  
  const getIcon = () => {
    switch (transaction.type) {
      case 'deposit': return <ArrowDownLeft className="w-5 h-5" />;
      case 'withdraw': return <ArrowUpRight className="w-5 h-5" />;
      case 'bet': return <Coins className="w-5 h-5" />;
      case 'win': return <TrendingUp className="w-5 h-5" />;
      default: return <CircleDollarSign className="w-5 h-5" />;
    }
  };
  
  const getColor = () => {
    switch (transaction.type) {
      case 'deposit': return 'from-green-500/20 to-emerald-500/20 border-green-500/30 text-green-400';
      case 'withdraw': return 'from-red-500/20 to-orange-500/20 border-red-500/30 text-red-400';
      case 'bet': return 'from-blue-500/20 to-purple-500/20 border-blue-500/30 text-blue-400';
      case 'win': return 'from-golden/20 to-yellow-500/20 border-golden/30 text-golden';
      default: return 'from-gray-500/20 to-slate-500/20 border-gray-500/30 text-gray-400';
    }
  };
  
  return (
    <motion.div
      initial={{ x: -100, opacity: 0, scale: 0.8 }}
      animate={{ 
        x: 0, 
        opacity: 1, 
        scale: 1,
      }}
      exit={{ x: 100, opacity: 0, scale: 0.8 }}
      transition={{ 
        delay: index * 0.05,
        type: "spring",
        stiffness: 200,
        damping: 20
      }}
      className="relative"
    >
      {/* Ripple effect */}
      {showRipple && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Ripple color={transaction.type === 'win' ? 'bg-golden' : 'bg-white'} />
        </div>
      )}
      
      {/* Liquid background */}
      <motion.div
        className={`absolute inset-0 bg-gradient-to-r ${getColor()} rounded-xl blur-sm`}
        animate={{
          scale: [1, 1.02, 1],
          opacity: [0.5, 0.7, 0.5],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      {/* Transaction card */}
      <div className={`relative bg-gradient-to-r ${getColor()} backdrop-blur-sm rounded-xl p-3 border`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Animated icon container */}
            <motion.div
              className="relative"
              animate={{
                rotate: transaction.type === 'win' ? [0, 360] : 0,
              }}
              transition={{
                duration: transaction.type === 'win' ? 2 : 0,
                repeat: transaction.type === 'win' ? Infinity : 0,
                ease: "linear",
              }}
            >
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${getColor()} flex items-center justify-center`}>
                {getIcon()}
              </div>
              {transaction.type === 'win' && (
                <Sparkles className="w-4 h-4 absolute -top-1 -right-1 text-golden animate-pulse" />
              )}
            </motion.div>
            
            {/* Transaction details */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-white font-semibold">
                  {transaction.type === 'withdraw' ? '-' : '+'} ₹{transaction.amount.toFixed(2)}
                </span>
                {transaction.status === 'processing' && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Activity className="w-4 h-4 text-yellow-400" />
                  </motion.div>
                )}
              </div>
              <div className="text-[8px] text-gray-400">
                {transaction.game || transaction.type} • {new Date(transaction.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
          
          {/* Status indicator */}
          <motion.div
            className={`w-2 h-2 rounded-full ${
              transaction.status === 'completed' ? 'bg-green-500' :
              transaction.status === 'processing' ? 'bg-yellow-500' :
              'bg-gray-500'
            }`}
            animate={{
              scale: transaction.status === 'processing' ? [1, 1.5, 1] : 1,
              opacity: transaction.status === 'processing' ? [1, 0.5, 1] : 1,
            }}
            transition={{
              duration: 1.5,
              repeat: transaction.status === 'processing' ? Infinity : 0,
            }}
          />
        </div>
        
        {/* Flowing particles */}
        {transaction.type === 'deposit' && (
          <>
            <FlowingParticle delay={0} path="in" />
            <FlowingParticle delay={0.3} path="in" />
            <FlowingParticle delay={0.6} path="in" />
          </>
        )}
        {transaction.type === 'withdraw' && (
          <>
            <FlowingParticle delay={0} path="out" />
            <FlowingParticle delay={0.3} path="out" />
            <FlowingParticle delay={0.6} path="out" />
          </>
        )}
      </div>
    </motion.div>
  );
};

export default function LiquidTransactionStream({ 
  transactions, 
  maxDisplay = 5 
}: LiquidTransactionStreamProps) {
  const [displayTransactions, setDisplayTransactions] = useState<Transaction[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    setDisplayTransactions(transactions.slice(0, maxDisplay));
  }, [transactions, maxDisplay]);
  
  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-4 h-4 text-golden" />
          </motion.div>
          <h3 className="text-[10px] font-semibold text-white">Transaction Stream</h3>
        </div>
        <div className="flex items-center gap-1">
          <motion.div
            className="w-4 h-4 bg-green-500 rounded-full"
            animate={{ scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-[8px] text-casino-text">Live</span>
        </div>
      </div>
      
      {/* Liquid container background */}
      <div className="absolute inset-0 top-10">
        <svg className="w-full h-full opacity-10" viewBox="0 0 400 300">
          <motion.path
            d="M0,150 Q100,100 200,150 T400,150 L400,300 L0,300 Z"
            fill="url(#liquidGradient)"
            animate={{
              d: [
                "M0,150 Q100,100 200,150 T400,150 L400,300 L0,300 Z",
                "M0,150 Q100,200 200,150 T400,150 L400,300 L0,300 Z",
                "M0,150 Q100,100 200,150 T400,150 L400,300 L0,300 Z",
              ],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <defs>
            <linearGradient id="liquidGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="100%" stopColor="#FFC107" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      
      {/* Transactions list */}
      <div ref={containerRef} className="relative space-y-3">
        <AnimatePresence mode="popLayout">
          {displayTransactions.map((transaction, index) => (
            <TransactionItem 
              key={transaction.id} 
              transaction={transaction} 
              index={index}
            />
          ))}
        </AnimatePresence>
        
        {displayTransactions.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <Coins className="w-5 h-5 text-casino-text mx-auto mb-4 opacity-50" />
            <p className="text-casino-text">No transactions yet</p>
            <p className="text-[8px] text-casino-text mt-1">Start playing to see your transaction flow</p>
          </motion.div>
        )}
      </div>
    </div>
  );
}