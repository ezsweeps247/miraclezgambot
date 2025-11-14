import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bitcoin, 
  Wallet, 
  ArrowDownLeft, 
  ArrowUpRight,
  Activity,
  Zap,
  TrendingUp,
  TrendingDown,
  Coins,
  CircuitBoard
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';

interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal' | 'bet' | 'payout';
  currency: string;
  amount: number;
  usdValue?: number;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
  userId?: string;
  username?: string;
  txHash?: string;
  confirmations?: number;
  address?: string;
}

const currencyIcons: Record<string, any> = {
  BTC: Bitcoin,
  ETH: CircuitBoard,
  USDT: Coins,
  LTC: Coins,
  DOGE: Coins,
  default: Wallet
};

const currencyColors: Record<string, string> = {
  BTC: 'from-orange-500 to-yellow-500',
  ETH: 'from-blue-500 to-purple-500',
  USDT: 'from-green-500 to-emerald-500',
  LTC: 'from-gray-500 to-slate-500',
  DOGE: 'from-yellow-400 to-orange-400',
  default: 'from-purple-500 to-pink-500'
};

// Animated particle for transaction flow
const TransactionParticle = ({ 
  from, 
  to, 
  currency, 
  amount,
  onComplete 
}: { 
  from: { x: number; y: number }; 
  to: { x: number; y: number }; 
  currency: string;
  amount: number;
  onComplete: () => void;
}) => {
  const path = {
    x: [from.x, (from.x + to.x) / 2 + (Math.random() - 0.5) * 100, to.x],
    y: [from.y, (from.y + to.y) / 2 - 50, to.y]
  };

  return (
    <motion.div
      className="absolute pointer-events-none z-50"
      initial={{ x: from.x, y: from.y, opacity: 0, scale: 0 }}
      animate={{
        x: path.x,
        y: path.y,
        opacity: [0, 1, 1, 0],
        scale: [0, 1, 1, 0]
      }}
      transition={{
        duration: 2,
        ease: "easeInOut",
        times: [0, 0.2, 0.8, 1]
      }}
      onAnimationComplete={onComplete}
    >
      <div className={`bg-gradient-to-r ${currencyColors[currency] || currencyColors.default} 
                      rounded-full p-2 shadow-lg shadow-golden/50`}>
        <span className="text-white text-[10px] font-bold">
          {(Number(amount) || 0).toFixed(4)} {currency}
        </span>
      </div>
    </motion.div>
  );
};

// Network node component
const NetworkNode = ({ 
  type, 
  position, 
  label,
  isActive 
}: { 
  type: 'platform' | 'blockchain' | 'user';
  position: { x: number; y: number };
  label: string;
  isActive: boolean;
}) => {
  return (
    <motion.div
      className="absolute"
      style={{ left: position.x - 40, top: position.y - 40 }}
      animate={{
        scale: isActive ? [1, 1.2, 1] : 1
      }}
      transition={{
        duration: 0.5,
        repeat: isActive ? Infinity : 0,
        repeatDelay: 2
      }}
    >
      <div className={`w-20 h-20 rounded-full flex items-center justify-center
                      ${type === 'platform' ? 'bg-gradient-to-br from-golden to-yellow-600' :
                        type === 'blockchain' ? 'bg-gradient-to-br from-blue-500 to-purple-600' :
                        'bg-gradient-to-br from-green-500 to-emerald-600'}
                      shadow-lg transform transition-all duration-300
                      ${isActive ? 'shadow-golden/50' : 'shadow-black/50'}`}>
        {type === 'platform' && <Wallet style={{width: '3.5px', height: '3.5px'}} className="text-white" />}
        {type === 'blockchain' && <CircuitBoard style={{width: '3.5px', height: '3.5px'}} className="text-white" />}
        {type === 'user' && <Coins style={{width: '3.5px', height: '3.5px'}} className="text-white" />}
      </div>
      <div className="text-center mt-2">
        <span className="text-[8px] text-gray-400 font-semibold">{label}</span>
      </div>
    </motion.div>
  );
};

// Transaction card component
const TransactionCard = ({ transaction }: { transaction: Transaction }) => {
  const Icon = currencyIcons[transaction.currency] || currencyIcons.default;
  
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-3"
    >
      <Card className="bg-gray-800/50 border-gray-700 p-3 hover:bg-gray-800/70 transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-gradient-to-r ${currencyColors[transaction.currency] || currencyColors.default}`}>
              <Icon style={{width: '3.5px', height: '3.5px'}} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold text-white">
                  {(Number(transaction.amount) || 0).toFixed(6)} {transaction.currency}
                </span>
                {transaction.type === 'deposit' && (
                  <ArrowDownLeft style={{width: '3px', height: '3px'}} className="text-green-500" />
                )}
                {transaction.type === 'withdrawal' && (
                  <ArrowUpRight style={{width: '3px', height: '3px'}} className="text-red-500" />
                )}
              </div>
              {transaction.usdValue && (
                <span className="text-[8px] text-gray-400">
                  ≈ ${(Number(transaction.usdValue) || 0).toFixed(2)} USD
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge 
              variant={transaction.status === 'confirmed' ? 'default' : 
                       transaction.status === 'pending' ? 'secondary' : 'destructive'}
              className="text-[8px]"
            >
              {transaction.status}
            </Badge>
            {transaction.confirmations !== undefined && (
              <span className="text-[8px] text-gray-500">
                {transaction.confirmations}/6 conf
              </span>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export function CryptoTransactionFlow() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [particles, setParticles] = useState<any[]>([]);
  const [activeNodes, setActiveNodes] = useState<Set<string>>(new Set());
  const wsRef = useRef<WebSocket | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Network nodes positions
  const nodes = {
    platform: { x: 250, y: 200, label: 'Platform' },
    blockchain: { x: 100, y: 100, label: 'Blockchain' },
    users: { x: 400, y: 100, label: 'Users' }
  };

  // Fetch recent transactions
  const { data: recentTransactions } = useQuery<Transaction[]>({
    queryKey: ['/api/crypto/recent-transactions'],
    refetchInterval: 10000,
  });

  useEffect(() => {
    if (recentTransactions) {
      setTransactions(prev => {
        const newTxs = recentTransactions.filter(
          tx => !prev.some(p => p.id === tx.id)
        );
        return [...newTxs, ...prev].slice(0, 10);
      });
    }
  }, [recentTransactions]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const socket = new WebSocket(wsUrl);
      wsRef.current = socket;

      socket.onopen = () => {
        console.log('Connected to crypto transaction flow');
        socket.send(JSON.stringify({ type: 'subscribe_crypto' }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'crypto_transaction') {
            const tx: Transaction = data.transaction;
            
            // Add to transactions list
            setTransactions(prev => [tx, ...prev].slice(0, 10));
            
            // Create visual particle
            const from = tx.type === 'deposit' ? nodes.blockchain : nodes.users;
            const to = tx.type === 'deposit' ? nodes.platform : nodes.blockchain;
            
            const particle = {
              id: tx.id,
              from,
              to,
              currency: tx.currency,
              amount: tx.amount
            };
            
            setParticles(prev => [...prev, particle]);
            
            // Activate nodes
            setActiveNodes(prev => {
              const newSet = new Set(prev);
              newSet.add(tx.type === 'deposit' ? 'blockchain' : 'users');
              newSet.add('platform');
              setTimeout(() => {
                setActiveNodes(p => {
                  const s = new Set(p);
                  s.delete(tx.type === 'deposit' ? 'blockchain' : 'users');
                  s.delete('platform');
                  return s;
                });
              }, 2000);
              return newSet;
            });
          }
        } catch (error) {
          console.error('Error parsing crypto transaction:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      socket.onclose = () => {
        console.log('Disconnected from crypto transaction flow');
      };

      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'unsubscribe_crypto' }));
          socket.close();
        }
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  }, []);

  const handleParticleComplete = (id: string) => {
    setParticles(prev => prev.filter(p => p.id !== id));
  };

  return (
    <div className="w-full">
      <Card className="bg-gray-900/50 border-gray-800 overflow-hidden">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[10px] font-bold text-white flex items-center gap-2">
              <Activity style={{width: '3px', height: '3px'}} className="text-golden" />
              Crypto Transaction Flow
            </h2>
            <div className="flex items-center gap-2">
              <Zap style={{width: '3.5px', height: '3.5px'}} className="text-yellow-500 animate-pulse" />
              <span className="text-[8px] text-gray-400">Live</span>
            </div>
          </div>

          {/* Network Visualization */}
          <div ref={containerRef} className="relative h-64 mb-6 bg-gray-900/50 rounded-lg overflow-hidden">
            {/* Connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              <motion.line
                x1={nodes.blockchain.x}
                y1={nodes.blockchain.y}
                x2={nodes.platform.x}
                y2={nodes.platform.y}
                stroke="rgba(212, 175, 55, 0.3)"
                strokeWidth="2"
                strokeDasharray="5,5"
                animate={{
                  strokeDashoffset: [0, -10]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
              <motion.line
                x1={nodes.platform.x}
                y1={nodes.platform.y}
                x2={nodes.users.x}
                y2={nodes.users.y}
                stroke="rgba(212, 175, 55, 0.3)"
                strokeWidth="2"
                strokeDasharray="5,5"
                animate={{
                  strokeDashoffset: [0, -10]
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  ease: "linear"
                }}
              />
            </svg>

            {/* Network nodes */}
            <NetworkNode 
              type="blockchain" 
              position={nodes.blockchain} 
              label={nodes.blockchain.label}
              isActive={activeNodes.has('blockchain')}
            />
            <NetworkNode 
              type="platform" 
              position={nodes.platform} 
              label={nodes.platform.label}
              isActive={activeNodes.has('platform')}
            />
            <NetworkNode 
              type="user" 
              position={nodes.users} 
              label={nodes.users.label}
              isActive={activeNodes.has('users')}
            />

            {/* Animated particles */}
            <AnimatePresence>
              {particles.map(particle => (
                <TransactionParticle
                  key={particle.id}
                  from={particle.from}
                  to={particle.to}
                  currency={particle.currency}
                  amount={particle.amount}
                  onComplete={() => handleParticleComplete(particle.id)}
                />
              ))}
            </AnimatePresence>
          </div>

          {/* Recent Transactions List */}
          <div className="space-y-2">
            <h3 className="text-[10px] font-semibold text-gray-400 mb-3">Recent Transactions</h3>
            <div className="max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence>
                {transactions.map(tx => (
                  <TransactionCard key={tx.id} transaction={tx} />
                ))}
              </AnimatePresence>
              {transactions.length === 0 && (
                <div className="text-center py-8">
                  <Wallet style={{width: '3.5px', height: '3.5px'}} className="text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500">No recent crypto transactions</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}