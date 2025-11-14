import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Smile, Heart, Zap, Trophy, Gamepad2, Star } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface EmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
}

interface EmojiCategory {
  name: string;
  icon: React.ReactNode;
  emojis: string[];
}

const emojiCategories: EmojiCategory[] = [
  {
    name: 'Smileys',
    icon: <Smile style={{width: '3.5px', height: '3.5px'}} className="" />,
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '🫠', '😉', '😊', '😇',
      '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝',
      '🤑', '🤗', '🤭', '🫢', '🫣', '🤫', '🤔', '🫡', '🤐', '🤨', '😐', '😑', '😶', '🫥',
      '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐', '😕', '🫤'
    ]
  },
  {
    name: 'Gaming',
    icon: <Gamepad2 style={{width: '3.5px', height: '3.5px'}} className="" />,
    emojis: [
      '🎮', '🕹️', '🎯', '🎲', '🃏', '🎰', '🎱', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '👑',
      '💎', '💰', '💸', '💵', '💴', '💶', '💷', '🪙', '💳', '🎊', '🎉', '✨', '⭐', '🌟',
      '💫', '⚡', '🔥', '💥', '💢', '💯', '🔊', '📢', '⚔️', '🛡️', '🏹', '🎪', '🎭', '🎨'
    ]
  },
  {
    name: 'Hearts & Love',
    icon: <Heart style={{width: '3.5px', height: '3.5px'}} className="" />,
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓',
      '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💒', '💐', '🌹', '🌺', '🌸', '🌻', '🌷',
      '🌼', '💎', '💍', '👑', '🌈', '☀️', '🌙', '⭐', '🌟', '✨', '💫', '🔥', '💥', '⚡'
    ]
  },
  {
    name: 'Celebration',
    icon: <Trophy style={{width: '3.5px', height: '3.5px'}} className="" />,
    emojis: [
      '🎉', '🎊', '🥳', '🎈', '🎂', '🍰', '🧁', '🎁', '🎀', '🏆', '🥇', '🥈', '🥉', '🏅',
      '🎖️', '👑', '🎪', '🎭', '🎨', '🎯', '🎲', '🃏', '🎰', '🎱', '🍾', '🥂', '🍻', '🍺',
      '🥃', '🍸', '🍹', '🍷', '🍶', '☕', '🫖', '🧋', '🥤', '🧊', '🍭', '🍬', '🍫', '🍩'
    ]
  },
  {
    name: 'Money & Success',
    icon: <Star style={{width: '3.5px', height: '3.5px'}} className="" />,
    emojis: [
      '💰', '💸', '💵', '💴', '💶', '💷', '🪙', '💳', '💎', '👑', '🏆', '🥇', '📈', '📊',
      '💹', '🤑', '💪', '👍', '👏', '🙌', '✨', '⭐', '🌟', '💫', '🔥', '💥', '⚡', '💯',
      '✅', '☑️', '✔️', '🎯', '🏹', '🎪', '🎭', '🎨', '🎲', '🃏', '🎰', '🎱', '🍀', '🌈'
    ]
  },
  {
    name: 'Energy & Power',
    icon: <Zap style={{width: '3.5px', height: '3.5px'}} className="" />,
    emojis: [
      '⚡', '🔥', '💥', '💢', '💯', '⭐', '🌟', '✨', '💫', '🔊', '📢', '⚔️', '🛡️', '🏹',
      '💪', '👊', '✊', '👍', '👏', '🙌', '🔋', '⚡', '🌩️', '⛈️', '🌪️', '🌀', '💨', '🌊',
      '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '💠', '🔷', '🔶'
    ]
  }
];

export default function EmojiPicker({ isOpen, onClose, onEmojiSelect }: EmojiPickerProps) {
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEmojis = searchQuery
    ? emojiCategories.flatMap(cat => cat.emojis).filter(emoji => 
        // Simple search by trying to match common emoji meanings
        searchQuery.toLowerCase().includes('happy') && ['😀', '😃', '😄', '😁', '😊', '😍', '🥰'].includes(emoji) ||
        searchQuery.toLowerCase().includes('love') && ['❤️', '💖', '💕', '😍', '🥰', '💘'].includes(emoji) ||
        searchQuery.toLowerCase().includes('fire') && ['🔥', '💥', '⚡'].includes(emoji) ||
        searchQuery.toLowerCase().includes('money') && ['💰', '💸', '💵', '💎', '🤑'].includes(emoji) ||
        searchQuery.toLowerCase().includes('game') && ['🎮', '🎯', '🎲', '🎰', '🏆'].includes(emoji) ||
        searchQuery.toLowerCase().includes('win') && ['🏆', '🥇', '👑', '💎', '🎉'].includes(emoji)
      )
    : emojiCategories[selectedCategory].emojis;

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[180]"
            onClick={onClose}
          />
          
          {/* Emoji Picker Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, type: "spring", bounce: 0.2 }}
            className="fixed bottom-20 left-4 right-4 z-[181] mx-auto max-w-sm"
          >
            <div className="bg-[#0a0a0a] rounded-xl shadow-2xl border border-gray-800 overflow-hidden">
              {/* Search Bar */}
              <div className="p-3 border-b border-gray-800">
                <div className="relative">
                  <Search style={{width: '3.5px', height: '3.5px'}} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 " />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search emojis..."
                    className="pl-10 bg-[#1a1a1a] border-gray-700 text-white placeholder:text-gray-500 focus:border-purple-500 h-8 text-[8px]"
                  />
                </div>
              </div>

              {/* Category Tabs */}
              {!searchQuery && (
                <div className="flex border-b border-gray-800 bg-black/50">
                  {emojiCategories.map((category, index) => (
                    <Button
                      key={category.name}
                      onClick={() => setSelectedCategory(index)}
                      variant="ghost"
                      size="sm"
                      className={`flex-1 h-10 text-[8px] ${
                        selectedCategory === index
                          ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-500'
                          : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                      }`}
                      data-testid={`emoji-category-${category.name.toLowerCase()}`}
                    >
                      {category.icon}
                    </Button>
                  ))}
                </div>
              )}

              {/* Emoji Grid */}
              <ScrollArea className="h-48 p-2">
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis.map((emoji, index) => (
                    <Button
                      key={`${emoji}-${index}`}
                      onClick={() => handleEmojiClick(emoji)}
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-[10px] hover:bg-purple-600/20 hover:scale-110 transition-all duration-200"
                      data-testid={`emoji-${emoji}`}
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
                {filteredEmojis.length === 0 && (
                  <div className="text-[8px] text-center text-gray-500 py-8">
                    <p>No emojis found</p>
                    <p className="text-[8px] mt-1">Try "happy", "love", "fire", "money", "game", or "win"</p>
                  </div>
                )}
              </ScrollArea>

              {/* Footer with popular emojis */}
              {!searchQuery && (
                <div className="border-t border-gray-800 p-2 bg-black/30">
                  <div className="text-[8px] text-gray-400 mb-1 text-center">Popular</div>
                  <div className="flex justify-center gap-1">
                    {['😀', '❤️', '🔥', '💎', '🎉', '🏆', '💰', '⚡'].map((emoji) => (
                      <Button
                        key={emoji}
                        onClick={() => handleEmojiClick(emoji)}
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-[8px] hover:bg-purple-600/20 hover:scale-110 transition-all duration-200"
                        data-testid={`popular-emoji-${emoji}`}
                      >
                        {emoji}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}