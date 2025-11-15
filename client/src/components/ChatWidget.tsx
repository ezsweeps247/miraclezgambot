import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Send, MessageSquare, X, Users, Smile } from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import ChatRulesModal from '@/components/ChatRulesModal';
import { TipModal } from '@/components/tip-modal';
import EmojiPicker from '@/components/EmojiPicker';
import { ChatUserAvatar } from '@/components/chat-user-avatar';

interface ChatMessage {
  id: string;
  username: string;
  message: string;
  createdAt: string;
  userId?: string;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatWidget({ isOpen, onClose }: ChatWidgetProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [message, setMessage] = useState('');
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUsername, setSelectedUsername] = useState<string | null>(null);
  const [tipModalOpen, setTipModalOpen] = useState(false);
  const [rulesModalOpen, setRulesModalOpen] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  // Fetch initial messages - only when chat is open
  const { data: messages = [] } = useQuery<ChatMessage[]>({
    queryKey: ['/api/chat/messages'],
    refetchInterval: false,
    enabled: isOpen,
  });

  // Fetch online count - only when chat is open
  useQuery({
    queryKey: ['/api/chat/online-count'],
    refetchInterval: isOpen ? 30000 : false, // Refresh every 30 seconds when open
    enabled: isOpen,
    queryFn: async () => {
      const response = await fetch('/api/chat/online-count');
      const data = await response.json();
      setOnlineCount(data.count || 0);
      return data;
    },
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      const response = await apiRequest('POST', '/api/chat/send', { message: messageText });
      return response.json();
    },
    onSuccess: () => {
      setMessage('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to send message. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // WebSocket connection - only when chat is open
  useEffect(() => {
    if (!isOpen) {
      // Disconnect WebSocket when chat is closed
      if (ws) {
        ws.close();
        setWs(null);
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log('Chat WebSocket connected');
      socket.send(JSON.stringify({ type: 'subscribe_chat' }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'newChatMessage') {
          queryClient.setQueryData<ChatMessage[]>(['/api/chat/messages'], (old = []) => {
            const newMessages = [...old, data.message];
            // Keep only last 50 messages
            return newMessages.slice(-50);
          });
          
          // Auto-scroll to bottom
          setTimeout(() => {
            if (scrollAreaRef.current) {
              const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
              if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
              }
            }
          }, 100);
        } else if (data.type === 'tip') {
          // Handle tip notification
          const tipMessage = {
            id: `tip-${Date.now()}`,
            username: 'System',
            message: `🎉 ${data.data.fromUsername} tipped ${data.data.toUsername} ${data.data.amount} credits!`,
            createdAt: data.data.createdAt,
            userId: 'system'
          };
          queryClient.setQueryData<ChatMessage[]>(['/api/chat/messages'], (old = []) => {
            const newMessages = [...old, tipMessage];
            return newMessages.slice(-50);
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('Chat WebSocket error:', error);
    };

    socket.onclose = () => {
      console.log('Chat WebSocket disconnected');
    };

    setWs(socket);

    return () => {
      socket.close();
    };
  }, [isOpen, queryClient]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setMessage(prev => prev + emoji);
  };

  // Close emoji picker when chat closes
  useEffect(() => {
    if (!isOpen) {
      setEmojiPickerOpen(false);
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);
  
  // Get mock user ID based on username
  const getMockUserId = (username: string) => {
    // Map usernames to mock profile IDs
    const mockUserMap: Record<string, string> = {
      'CryptoWhale': 'player1',
      'LuckyDice77': 'player2',
      'RouletteMaster': 'player3',
      'DiamondHands': 'player1',
      'MoonShot': 'player2',
      'HighRoller': 'player3'
    };
    return mockUserMap[username] || 'current';
  };
  
  const handleUsernameClick = (username: string) => {
    const userId = getMockUserId(username);
    // Navigate to full-page profile instead of opening modal
    if (userId === 'current') {
      navigate('/profile');
    } else {
      navigate(`/profile/${userId}`);
    }
    onClose(); // Close chat when navigating to profile
  };

  const handleOpenTip = (userId: string, username: string) => {
    setSelectedUserId(userId);
    setSelectedUsername(username);
    setTipModalOpen(true);
  };

  return (
    <>
      {/* Full-screen chat overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/95 z-[160]"
              onClick={onClose}
            />
            
            {/* Chat window - Full screen like menu and search */}
            <motion.div
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.3, type: "spring", bounce: 0 }}
              className="fixed inset-x-0 top-0 bottom-16 z-[170] flex flex-col"
            >
              <div className="w-full h-full bg-[#0a0a0a] flex flex-col">
                {/* Header - Improved visibility */}
                <div className="bg-black border-b border-gray-700 px-4 py-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-white">Chat</h2>
                  <Button
                    onClick={onClose}
                    variant="ghost"
                    size="icon"
                    className="text-gray-300 hover:text-white transition-colors h-12 w-12"
                    data-testid="chat-close-button"
                  >
                    <X className="w-7 h-7" />
                  </Button>
                </div>

                {/* Messages area - Improved readability */}
                <ScrollArea 
                  ref={scrollAreaRef} 
                  className="flex-1 bg-[#0a0a0a] px-4 py-3 purple-scrollbar"
                >
                  <div className="space-y-3">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-300 py-12">
                        <p className="text-base">No messages yet. Be the first to say hello!</p>
                      </div>
                    ) : (
                      messages.map((msg) => (
                        <div key={msg.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-900/50 transition-colors">
                          {/* User Avatar */}
                          <div className="mt-1">
                            <ChatUserAvatar 
                              userId={msg.userId}
                              username={msg.username}
                              size="sm"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span 
                              className="font-semibold text-gray-200 cursor-pointer hover:text-white transition-colors text-base inline-block mb-1"
                              onClick={() => handleUsernameClick(msg.username)}
                              data-testid={`chat-username-${msg.id}`}
                            >
                              {msg.username}
                            </span>
                            <div className="text-gray-300 text-sm leading-relaxed break-words">
                              {msg.message}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                {/* Input area - Enhanced accessibility */}
                <div className="bg-black border-t border-gray-700">
                  <form onSubmit={handleSendMessage} className="p-4">
                    <div className="flex gap-2">
                      <Input
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 bg-[#1a1a1a] border-gray-600 text-white placeholder:text-gray-400 focus:border-purple-500 h-12 rounded-lg text-base px-4 py-3"
                        maxLength={200}
                        disabled={sendMessageMutation.isPending}
                      />
                      <Button
                        type="button"
                        onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
                        size="icon"
                        variant="outline"
                        className="bg-[#1a1a1a] border-gray-600 text-white hover:text-purple-400 hover:bg-gray-800 h-12 w-12 rounded-lg"
                        data-testid="emoji-picker-button"
                      >
                        <Smile className="w-6 h-6" />
                      </Button>
                      <Button
                        type="submit"
                        className="bg-purple-600 hover:bg-purple-700 text-white h-12 px-6 rounded-lg text-base font-medium"
                        disabled={!message.trim() || sendMessageMutation.isPending}
                        data-testid="chat-send-button"
                      >
                        Send
                      </Button>
                    </div>
                  </form>
                  
                  {/* Bottom bar with online counter and chat rules */}
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-700">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-green-400 font-medium">{onlineCount} Online</span>
                    </div>
                    <button 
                      onClick={() => setRulesModalOpen(true)}
                      className="text-gray-300 hover:text-white text-sm border border-gray-600 hover:border-gray-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                      data-testid="chat-rules-button"
                    >
                      <MessageSquare className="w-4 h-4" />
                      Rules
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      

      {/* Tip Modal */}
      {tipModalOpen && selectedUserId && selectedUsername && (
        <TipModal
          isOpen={tipModalOpen}
          onClose={() => {
            setTipModalOpen(false);
            setSelectedUserId(null);
            setSelectedUsername(null);
          }}
          recipientId={selectedUserId}
          recipientName={selectedUsername}
        />
      )}
      
      {/* Chat Rules Modal */}
      <ChatRulesModal 
        isOpen={rulesModalOpen}
        onClose={() => setRulesModalOpen(false)}
      />

      {/* Emoji Picker */}
      <EmojiPicker
        isOpen={emojiPickerOpen}
        onClose={() => setEmojiPickerOpen(false)}
        onEmojiSelect={handleEmojiSelect}
      />
    </>
  );
}