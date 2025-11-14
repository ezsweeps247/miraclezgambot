import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ChatRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatRulesModal({ isOpen, onClose }: ChatRulesModalProps) {
  const rules = [
    "No harassment against other users or Miraclez Staff, including profanity, abuse, racism etc.",
    "No begging for tips, loans, rains",
    "No politics/religion discussion",
    "No sexual content",
    "No sharing of any personal information, including socials",
    "No spamming of emotes or excessive capital letters/repeated words",
    "No messages of advertising/trading/selling/buying or offering services, including bots/codes/scripts",
    "No suspicious behaviour that could be seen as potential scams",
    "No discussion of illegal activities",
    "No shortened URLs, please only submit the original URL",
    "No posting of Miraclez codes",
    "Only use the designated language of the chatroom you are in"
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[180]"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, type: "spring", bounce: 0.3 }}
            className="fixed inset-0 flex items-center justify-center z-[181] p-4"
          >
            <div className="bg-[#0a0a0a] rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden border border-gray-800">
              {/* Header */}
              <div className="bg-black border-b border-gray-800 px-6 py-4 flex items-center justify-between">
                <h2 className="text-[10px] font-semibold text-white">Chat Rules</h2>
                <Button
                  onClick={onClose}
                  variant="ghost"
                  size="icon"
                  className="text-gray-400 hover:text-white transition-colors"
                  data-testid="chat-rules-close-button"
                >
                  <X style={{width: '3px', height: '3px'}} className="" />
                </Button>
              </div>
              
              {/* Content */}
              <div className="px-6 py-6 overflow-y-auto max-h-[calc(90vh-100px)]">
                <div className="space-y-4">
                  {rules.map((rule, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-7 h-7 bg-purple-600/20 rounded-full flex items-center justify-center text-purple-400 text-[8px] font-semibold">
                        {index + 1}
                      </span>
                      <p className="text-gray-300 text-[8px] leading-relaxed">
                        {rule}
                      </p>
                    </div>
                  ))}
                </div>
                
                {/* Footer note */}
                <div className="mt-8 pt-6 border-t border-gray-800">
                  <p className="text-gray-500 text-[8px] text-center">
                    Breaking these rules may result in a mute or permanent ban from chat.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}