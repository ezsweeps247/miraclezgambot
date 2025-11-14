import { useState, useEffect, useRef } from 'react';

interface GameHistoryItem {
  id: number;
  playerName: string;
  score: number;
  stake: string;
  prize: string | null;
  prizeType: string | null;
  blocksStacked: number;
  highestRow: number;
  createdAt: string;
}

interface GameFeedProps {
  scale?: number;
}

export function GameFeed({ scale = 1 }: GameFeedProps) {
  const [history, setHistory] = useState<GameHistoryItem[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Fetch initial history
    fetch('/api/history?limit=20')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setHistory(data);
        } else {
          console.error('Invalid history data:', data);
          setHistory([]);
        }
      })
      .catch(err => {
        console.error('Failed to fetch game history:', err);
        setHistory([]);
      });

    // Set up WebSocket connection
    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/game-feed`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Connected to game feed');
        setIsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'new_game' && message.data) {
            setHistory(prev => [message.data, ...prev].slice(0, 20));
          }
        } catch (err) {
          console.error('Failed to parse WebSocket message:', err);
        }
      };

      ws.onclose = () => {
        console.log('Disconnected from game feed');
        setIsConnected(false);
        // Reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    };

    connectWebSocket();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const formatPrize = (item: GameHistoryItem) => {
    if (!item.prize || parseFloat(item.prize) === 0) {
      return '0P';
    }
    if (item.prizeType === 'cash') {
      return `$${parseFloat(item.prize).toFixed(2)}`;
    }
    return `${parseFloat(item.prize).toLocaleString()}P`;
  };

  return (
    <div style={{
      background: 'rgba(255, 255, 255, 0.06)',
      backdropFilter: 'blur(12px) saturate(180%)',
      border: `${Math.max(1.5, 2 * scale)}px solid rgba(255, 255, 255, 0.12)`,
      borderRadius: `${8 * scale}px`,
      padding: `${5 * scale}px ${7 * scale}px`,
      width: `${150 * scale}px`,
      height: `${210 * scale}px`,
      boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.15), 0 4px 12px rgba(0,0,0,0.3)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      <div style={{
        fontSize: `${10 * scale}px`,
        fontWeight: '900',
        color: '#fff',
        marginBottom: `${6 * scale}px`,
        textAlign: 'left',
        letterSpacing: '0.35px',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.8)'
      }}>
        LIVE FEED
        <div style={{
          display: 'inline-block',
          width: `${6 * scale}px`,
          height: `${6 * scale}px`,
          borderRadius: '50%',
          backgroundColor: isConnected ? '#00ff00' : '#ff0000',
          marginLeft: `${6 * scale}px`,
          animation: isConnected ? 'pulse 2s ease-in-out infinite' : 'none'
        }} />
      </div>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#000',
        borderRadius: `${4 * scale}px`,
        padding: `${3 * scale}px`,
        scrollbarWidth: 'thin',
        scrollbarColor: '#333 #000'
      }}>
        {history.length === 0 ? (
          <div style={{
            color: '#666',
            fontSize: `${9 * scale}px`,
            textAlign: 'center',
            padding: `${15 * scale}px ${4 * scale}px`,
            fontFamily: "'Roboto', sans-serif"
          }}>
            Waiting for games...
          </div>
        ) : (
          history.map((item, index) => (
            <div
              key={item.id}
              style={{
                marginBottom: `${6 * scale}px`,
                paddingBottom: `${6 * scale}px`,
                borderBottom: index < history.length - 1 ? '1px solid #222' : 'none',
                animation: index === 0 ? 'slideIn 0.3s ease-out' : 'none'
              }}
            >
              <div style={{
                fontSize: `${14 * scale}px`,
                fontWeight: 'bold',
                color: '#ffffff',
                fontFamily: "'Digital-7 Mono', 'Digital-7', monospace",
                marginBottom: `${2.5 * scale}px`,
                textShadow: '0 0 3px #ffffff',
                letterSpacing: '0.35px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                textAlign: 'left'
              }}>
                {item.playerName}
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'flex-start',
                alignItems: 'center',
                gap: `${7 * scale}px`,
                textAlign: 'left'
              }}>
                <div style={{
                  fontSize: `${13 * scale}px`,
                  color: '#ffffff',
                  fontFamily: "'Digital-7 Mono', 'Digital-7', monospace",
                  textShadow: '0 0 3px #ffffff'
                }}>
                  {item.score}
                </div>
                <div style={{
                  fontSize: `${11 * scale}px`,
                  color: item.prizeType === 'cash' ? '#00ff00' : '#ffaa00',
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 'bold'
                }}>
                  {formatPrize(item)}
                </div>
              </div>
              <div style={{
                fontSize: `${9 * scale}px`,
                color: '#888',
                fontFamily: "'Roboto', sans-serif",
                marginTop: `${1.5 * scale}px`,
                textAlign: 'left'
              }}>
                <span style={{ fontWeight: 'bold' }}>${item.stake}</span> • Row <span style={{ fontWeight: 'bold' }}>{item.highestRow}</span>
              </div>
            </div>
          ))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        @keyframes slideIn {
          0% { 
            transform: translateY(-10px);
            opacity: 0;
          }
          100% { 
            transform: translateY(0);
            opacity: 1;
          }
        }
        div::-webkit-scrollbar {
          width: 6px;
        }
        div::-webkit-scrollbar-track {
          background: #000;
        }
        div::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 3px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
