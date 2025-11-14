import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bitcoin, ArrowRight, CheckCircle, Clock, AlertCircle, TrendingUp, TrendingDown, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  currency: string;
  amount: number;
  usdValue: number;
  status: 'pending' | 'confirming' | 'confirmed' | 'failed';
  confirmations?: number;
  requiredConfirmations?: number;
  timestamp: number;
  from?: string;
  to?: string;
}

interface TransactionFlowProps {
  transactions?: Transaction[];
  isLive?: boolean;
}

const getCurrencyIcon = (currency: string) => {
  const icons: Record<string, string> = {
    BTC: '₿',
    ETH: 'Ξ',
    USDT: '₮',
    LTC: 'Ł',
    DOGE: 'Ð',
    TRX: 'T',
    BNB: 'B',
    ADA: '₳',
    XRP: 'X'
  };
  return icons[currency] || '₿';
};

const getCurrencyColor = (currency: string) => {
  const colors: Record<string, string> = {
    BTC: 'from-orange-500 to-orange-600',
    ETH: 'from-purple-500 to-purple-600',
    USDT: 'from-green-500 to-green-600',
    LTC: 'from-gray-400 to-gray-500',
    DOGE: 'from-yellow-500 to-yellow-600',
    TRX: 'from-red-500 to-red-600',
    BNB: 'from-yellow-400 to-yellow-500',
    ADA: 'from-blue-500 to-blue-600',
    XRP: 'from-gray-600 to-gray-700'
  };
  return colors[currency] || 'from-gray-500 to-gray-600';
};

const mockTransactions: Transaction[] = [
  { id: '1', type: 'deposit', currency: 'BTC', amount: 0.001, usdValue: 45.50, status: 'confirmed', confirmations: 6, requiredConfirmations: 6, timestamp: Date.now() - 60000 },
  { id: '2', type: 'withdrawal', currency: 'ETH', amount: 0.05, usdValue: 140.00, status: 'confirming', confirmations: 2, requiredConfirmations: 12, timestamp: Date.now() - 30000 },
  { id: '3', type: 'deposit', currency: 'USDT', amount: 100, usdValue: 100.00, status: 'pending', timestamp: Date.now() - 15000 },
  { id: '4', type: 'deposit', currency: 'DOGE', amount: 500, usdValue: 40.00, status: 'confirmed', confirmations: 1, requiredConfirmations: 1, timestamp: Date.now() - 120000 },
  { id: '5', type: 'withdrawal', currency: 'LTC', amount: 0.5, usdValue: 37.50, status: 'confirmed', timestamp: Date.now() - 180000 }
];

export default function TransactionFlow({ transactions = mockTransactions, isLive = false }: TransactionFlowProps) {
  const [displayTransactions, setDisplayTransactions] = useState<Transaction[]>(transactions);
  const [newTransaction, setNewTransaction] = useState<Transaction | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // WebSocket connection for real-time updates
  useEffect(() => {
    if (!isLive) return;
    
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
      ws.onopen = () => {
        console.log('TransactionFlow WebSocket connected');
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'crypto_transaction') {
            const newTx: Transaction = {
              id: data.transaction.id,
              type: data.transaction.type,
              currency: data.transaction.currency,
              amount: data.transaction.amount,
              usdValue: data.transaction.usdValue,
              status: data.transaction.status as any,
              confirmations: data.transaction.confirmations,
              requiredConfirmations: data.transaction.requiredConfirmations,
              timestamp: data.transaction.timestamp
            };
            
            setNewTransaction(newTx);
            setDisplayTransactions(prev => [newTx, ...prev].slice(0, 50));
          } else if (data.type === 'crypto_transaction_update') {
            // Update existing transaction status
            setDisplayTransactions(prev => prev.map(tx => 
              tx.id === data.transaction.id 
                ? { ...tx, ...data.transaction }
                : tx
            ));
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };
      
      ws.onerror = (error) => {
        console.error('TransactionFlow WebSocket error:', error);
      };
      
      ws.onclose = () => {
        console.log('TransactionFlow WebSocket disconnected');
        // Reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };
    };
    
    connectWebSocket();
    
    // Also simulate some fake transactions for demo purposes
    const interval = setInterval(() => {
      const currencies = ['BTC', 'ETH', 'USDT', 'LTC', 'DOGE', 'TRX', 'BNB', 'ADA', 'XRP'];
      const statuses: Transaction['status'][] = ['pending', 'confirming', 'confirmed'];
      const types: Transaction['type'][] = ['deposit', 'withdrawal'];
      
      const newTx: Transaction = {
        id: 'demo-' + Date.now().toString(),
        type: types[Math.floor(Math.random() * types.length)],
        currency: currencies[Math.floor(Math.random() * currencies.length)],
        amount: Math.random() * 2,
        usdValue: Math.random() * 1000,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        confirmations: Math.floor(Math.random() * 6),
        requiredConfirmations: 6,
        timestamp: Date.now()
      };
      
      setNewTransaction(newTx);
      setDisplayTransactions(prev => [newTx, ...prev].slice(0, 50));
    }, 8000);
    
    return () => {
      clearInterval(interval);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [isLive]);
  
  // Update transactions when prop changes
  useEffect(() => {
    if (transactions.length > 0) {
      setDisplayTransactions(transactions);
    }
  }, [transactions]);
  
  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'pending': return <Clock style={{width: '3.5px', height: '3.5px'}} className="animate-pulse" />;
      case 'confirming': return <Zap style={{width: '3.5px', height: '3.5px'}} className="animate-pulse" />;
      case 'confirmed': return <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="" />;
      case 'failed': return <AlertCircle style={{width: '3.5px', height: '3.5px'}} className="" />;
    }
  };
  
  const getStatusColor = (status: Transaction['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
      case 'confirming': return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
      case 'confirmed': return 'bg-green-500/20 text-green-500 border-green-500/50';
      case 'failed': return 'bg-red-500/20 text-red-500 border-red-500/50';
    }
  };
  
  return (
    <div className="w-full space-y-6">
      {/* Flow Visualization Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-[10px] font-bold text-white flex items-center gap-2">
          <TrendingUp style={{width: '3px', height: '3px'}} className="text-golden" />
          Live Transaction Flow
        </h3>
        {isLive && (
          <Badge className="bg-green-500/20 text-green-500 border-green-500/50 animate-pulse">
            <span style={{width: '2.5px', height: '2.5px'}} className="inline-block bg-green-500 rounded-full mr-2 animate-pulse"></span>
            LIVE
          </Badge>
        )}
      </div>
      
      {/* Pipeline Stages */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-yellow-500 font-semibold">Pending</span>
              <Clock style={{width: '3px', height: '3px'}} className="text-yellow-500 animate-pulse" />
            </div>
            <div className="text-[10px] font-bold text-white">
              {displayTransactions.filter(t => t.status === 'pending').length}
            </div>
            <div className="text-[8px] text-gray-400 mt-1">Awaiting blockchain</div>
          </div>
        </motion.div>
        
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-blue-500 font-semibold">Confirming</span>
              <Zap style={{width: '3px', height: '3px'}} className="text-blue-500 animate-pulse" />
            </div>
            <div className="text-[10px] font-bold text-white">
              {displayTransactions.filter(t => t.status === 'confirming').length}
            </div>
            <div className="text-[8px] text-gray-400 mt-1">Processing blocks</div>
          </div>
        </motion.div>
        
        <motion.div
          className="relative"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-green-500 font-semibold">Confirmed</span>
              <CheckCircle style={{width: '3px', height: '3px'}} className="text-green-500" />
            </div>
            <div className="text-[10px] font-bold text-white">
              {displayTransactions.filter(t => t.status === 'confirmed').length}
            </div>
            <div className="text-[8px] text-gray-400 mt-1">Completed</div>
          </div>
        </motion.div>
      </div>
      
      {/* Animated Flow Lines */}
      <div className="hidden md:flex items-center justify-between px-8 -mt-12 mb-8 relative z-10">
        <motion.div 
          className="flex-1 h-0.5 bg-gradient-to-r from-yellow-500/50 to-blue-500/50 relative"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          <motion.div
            style={{width: '3.5px', height: '3.5px'}} className="absolute top-0 left-0 -mt-1.5 bg-yellow-500 rounded-full"
            animate={{ x: ["0%", "100%", "0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
        <ArrowRight style={{width: '3px', height: '3px'}} className="text-gray-500 mx-2" />
        <motion.div 
          className="flex-1 h-0.5 bg-gradient-to-r from-blue-500/50 to-green-500/50 relative"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 1, delay: 0.7 }}
        >
          <motion.div
            style={{width: '3.5px', height: '3.5px'}} className="absolute top-0 left-0 -mt-1.5 bg-blue-500 rounded-full"
            animate={{ x: ["0%", "100%", "0%"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
          />
        </motion.div>
      </div>
      
      {/* Transaction Stream */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-casino-dark/50 to-casino-dark pointer-events-none z-10" />
        <div 
          ref={containerRef}
          className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar pr-2"
        >
          <AnimatePresence>
            {displayTransactions.map((tx, index) => (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, x: -50, scale: 0.9 }}
                animate={{ 
                  opacity: 1, 
                  x: 0, 
                  scale: 1,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ opacity: 0, x: 50, scale: 0.9 }}
                whileHover={{ scale: 1.02 }}
                className="relative"
              >
                <div className={`bg-casino-card border border-casino-accent/20 rounded-lg p-3 backdrop-blur-sm ${
                  newTransaction?.id === tx.id ? 'ring-2 ring-golden animate-pulse' : ''
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Currency Icon */}
                      <motion.div 
                        className={`w-10 h-10 rounded-full bg-gradient-to-br ${getCurrencyColor(tx.currency)} flex items-center justify-center text-white font-bold`}
                        animate={{ rotate: tx.type === 'deposit' ? 360 : -360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        {getCurrencyIcon(tx.currency)}
                      </motion.div>
                      
                      {/* Transaction Info */}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-semibold">
                            {tx.amount.toFixed(8)} {tx.currency}
                          </span>
                          {tx.type === 'deposit' ? (
                            <TrendingDown style={{width: '3.5px', height: '3.5px'}} className="text-green-500" />
                          ) : (
                            <TrendingUp style={{width: '3.5px', height: '3.5px'}} className="text-red-500" />
                          )}
                        </div>
                        <div className="text-[8px] text-gray-400">
                          ${tx.usdValue.toFixed(2)} USD • {new Date(tx.timestamp).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Status */}
                    <div className="flex items-center gap-2">
                      {tx.status === 'confirming' && tx.confirmations && tx.requiredConfirmations && (
                        <div className="text-[8px] text-gray-400">
                          {tx.confirmations}/{tx.requiredConfirmations}
                        </div>
                      )}
                      <Badge className={`${getStatusColor(tx.status)} border flex items-center gap-1`}>
                        {getStatusIcon(tx.status)}
                        <span className="capitalize">{tx.status}</span>
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Progress Bar for Confirming Transactions */}
                  {tx.status === 'confirming' && tx.confirmations && tx.requiredConfirmations && (
                    <motion.div 
                      className="mt-2 h-1 bg-gray-700 rounded-full overflow-hidden"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <motion.div
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${(tx.confirmations / tx.requiredConfirmations) * 100}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Statistics Footer */}
      <motion.div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="bg-casino-card/50 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-golden">
            {displayTransactions.length}
          </div>
          <div className="text-[8px] text-gray-400">Total Transactions</div>
        </div>
        <div className="bg-casino-card/50 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-green-500">
            ${displayTransactions.reduce((sum, t) => sum + t.usdValue, 0).toFixed(2)}
          </div>
          <div className="text-[8px] text-gray-400">Total Volume</div>
        </div>
        <div className="bg-casino-card/50 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-blue-500">
            {displayTransactions.filter(t => t.type === 'deposit').length}
          </div>
          <div className="text-[8px] text-gray-400">Deposits</div>
        </div>
        <div className="bg-casino-card/50 rounded-lg p-3 text-center">
          <div className="text-[10px] font-bold text-purple-500">
            {displayTransactions.filter(t => t.type === 'withdrawal').length}
          </div>
          <div className="text-[8px] text-gray-400">Withdrawals</div>
        </div>
      </motion.div>
    </div>
  );
}