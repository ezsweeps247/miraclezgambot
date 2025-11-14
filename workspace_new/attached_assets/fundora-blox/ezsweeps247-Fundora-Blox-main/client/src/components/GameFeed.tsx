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

export function GameFeed() {
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
      backgroundColor: 'white',
      border: '2px solid #333',
      borderRadius: '12px',
      padding: '8px',
      width: '170px',
      height: '250px',
      boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative'
    }}>
      <div style={{
        fontSize: '10px',
        fontWeight: '900',
        color: '#333',
        marginBottom: '6px',
        textAlign: 'left',
        letterSpacing: '0.5px'
      }}>
        LIVE FEED
        <div style={{
          display: 'inline-block',
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#00ff00' : '#ff0000',
          marginLeft: '6px',
          animation: isConnected ? 'pulse 2s ease-in-out infinite' : 'none'
        }} />
      </div>
      
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        backgroundColor: '#000',
        borderRadius: '6px',
        padding: '4px',
        scrollbarWidth: 'thin',
        scrollbarColor: '#333 #000'
      }}>
        {history.length === 0 ? (
          <div style={{
            color: '#666',
            fontSize: '9px',
            textAlign: 'center',
            padding: '20px 5px',
            fontFamily: "'Roboto', sans-serif"
          }}>
            Waiting for games...
          </div>
        ) : (
          history.map((item, index) => (
            <div
              key={item.id}
              style={{
                marginBottom: '6px',
                paddingBottom: '6px',
                borderBottom: index < history.length - 1 ? '1px solid #222' : 'none',
                animation: index === 0 ? 'slideIn 0.3s ease-out' : 'none'
              }}
            >
              <div style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: '#ffffff',
                fontFamily: "'Digital-7 Mono', 'Digital-7', monospace",
                marginBottom: '2px',
                textShadow: '0 0 2px #ffffff',
                letterSpacing: '0.5px',
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
                gap: '8px',
                textAlign: 'left'
              }}>
                <div style={{
                  fontSize: '15px',
                  color: '#ffffff',
                  fontFamily: "'Digital-7 Mono', 'Digital-7', monospace",
                  textShadow: '0 0 2px #ffffff'
                }}>
                  {item.score}
                </div>
                <div style={{
                  fontSize: '13px',
                  color: item.prizeType === 'cash' ? '#00ff00' : '#ffaa00',
                  fontFamily: "'Roboto', sans-serif",
                  fontWeight: 'bold'
                }}>
                  {formatPrize(item)}
                </div>
              </div>
              <div style={{
                fontSize: '11px',
                color: '#888',
                fontFamily: "'Roboto', sans-serif",
                marginTop: '1px',
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
          width: 4px;
        }
        div::-webkit-scrollbar-track {
          background: #000;
        }
        div::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 2px;
        }
        div::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
      `}</style>
    </div>
  );
}
