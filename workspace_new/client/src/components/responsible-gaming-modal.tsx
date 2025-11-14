import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X,
  Clock,
  Users,
  MessageSquare,
  ArrowLeft
} from 'lucide-react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';

interface ResponsibleGamingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResponsibleGamingModal({ isOpen, onClose }: ResponsibleGamingModalProps) {
  const [, navigate] = useLocation();
  const [currentStep, setCurrentStep] = useState<'intro' | 'step1' | 'step2' | 'help'>('intro');

  const handleContinue = () => {
    if (currentStep === 'intro') {
      setCurrentStep('step1');
    } else if (currentStep === 'step1') {
      setCurrentStep('step2');
    } else if (currentStep === 'step2') {
      setCurrentStep('help');
    }
  };

  const handleClose = () => {
    setCurrentStep('intro');
    onClose();
  };

  const handleChatWithUs = () => {
    // This will open the chat widget
    // For now, we'll just close the modal
    handleClose();
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
            className="fixed inset-0 bg-black/95 z-[110]"
            onClick={handleClose}
          />

          {/* Modal Content */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-0 top-0 bottom-16 md:inset-x-4 md:top-4 md:bottom-20 md:flex md:items-center md:justify-center z-[120] p-4 overflow-y-auto"
          >
            <div className="bg-black w-full max-w-md mx-auto min-h-screen md:min-h-0 md:rounded-xl relative">
              {/* Header */}
              <div className="sticky top-0 bg-black border-b border-gray-800 p-4 flex justify-between items-center">
                <h2 className="text-[10px] font-semibold text-white">
                  {currentStep === 'help' ? 'Support' : 'Responsible Gaming'}
                </h2>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg hover:bg-gray-800 transition-colors"
                  data-testid="button-responsible-gaming-close"
                >
                  <X style={{width: '3px', height: '3px'}} className="text-gray-400" />
                </button>
              </div>

              {/* Content based on current step */}
              <div className="p-4">
                {currentStep === 'intro' && (
                  <div>
                    <h3 className="text-[10px] font-semibold text-white mb-4">
                      Taking a break from play
                    </h3>
                    <p className="text-gray-300 mb-6">
                      Miraclez is committed to providing you with a safe, enjoyable, and responsible gaming environment.
                    </p>
                    <p className="text-gray-300 mb-6">
                      To enhance your gaming experience you can choose to take a break or give yourself some time away from playing. Your break will start immediately once confirmed and it is non-reversible.
                    </p>
                    <p className="text-gray-300 mb-8">
                      Our safe gameplay process is detailed below:
                    </p>

                    {/* Step 1 Card */}
                    <div className="bg-[#1a1a1a] rounded-lg p-6 mb-4">
                      <div className="flex items-center justify-center w-16 h-16 bg-[#2a2a2a] rounded-lg mb-4 mx-auto">
                        <Clock style={{width: '3.5px', height: '3.5px'}} className="text-purple-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">
                        Step 1: Take a 24 Hours Cooldown
                      </h4>
                      <p className="text-gray-400 text-[8px]">
                        Take a 24 hours cooldown from playing. You will still be able to access the platform and you can earn and claim rewards. During the 24 hours, you can
                      </p>
                    </div>
                  </div>
                )}

                {currentStep === 'step1' && (
                  <div>
                    {/* Step 1 Content - Similar to intro but scrolled */}
                    <div className="mb-8">
                      <h3 className="text-[10px] font-semibold text-white mb-4">
                        Taking a break from play
                      </h3>
                      <p className="text-gray-300 mb-4">
                        Miraclez is committed to providing you with a safe, enjoyable, and responsible gaming environment.
                      </p>
                    </div>

                    {/* Step 2 Card */}
                    <div className="bg-[#1a1a1a] rounded-lg p-6">
                      <div className="flex items-center justify-center w-16 h-16 bg-[#2a2a2a] rounded-lg mb-4 mx-auto">
                        <Users style={{width: '3.5px', height: '3.5px'}} className="text-purple-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-4">
                        Step 2: Self-Exclusion
                      </h4>
                      <p className="text-gray-400 text-[8px] mb-4">
                        After your 24 hours cooldown ends, you have 24 hours to extend your self-exclusion period by 1 day, 1 week, 1 month, 6 months or permanently. You could self-exclude from the platform (if you self-exclude from the platform, you will not be able to log in). Self-exclusion is a STRICTLY IRREVERSIBLE process, NO ONE will be able to remove this for you.
                      </p>
                    </div>
                  </div>
                )}

                {currentStep === 'step2' && (
                  <div>
                    {/* Step 2 Full Screen */}
                    <div className="bg-[#1a1a1a] rounded-lg p-6 mb-8">
                      <div className="flex items-center justify-center w-16 h-16 bg-[#2a2a2a] rounded-lg mb-4 mx-auto">
                        <Users style={{width: '3.5px', height: '3.5px'}} className="text-purple-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-4">
                        Step 2: Self-Exclusion
                      </h4>
                      <p className="text-gray-400 text-[8px]">
                        After your 24 hours cooldown ends, you have 24 hours to extend your self-exclusion period by 1 day, 1 week, 1 month, 6 months or permanently. You could self-exclude from the platform (if you self-exclude from the platform, you will not be able to log in). Self-exclusion is a STRICTLY IRREVERSIBLE process, NO ONE will be able to remove this for you.
                      </p>
                    </div>

                    {/* Continue Button */}
                    <button
                      onClick={handleContinue}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                      data-testid="button-responsible-gaming-continue"
                    >
                      Continue
                    </button>

                    {/* Bottom Illustration */}
                    <div className="flex justify-center mt-12">
                      <div className="relative">
                        <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center">
                          <Users style={{width: '3.5px', height: '3.5px'}} className="text-purple-500" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full" />
                        <div style={{width: '3.5px', height: '3.5px'}} className="absolute top-0 right-8 bg-purple-400 rounded-full" />
                        <div className="absolute -bottom-2 left-4 text-purple-400">✦</div>
                        <div className="absolute top-4 -left-4 text-purple-400">✦</div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 'help' && (
                  <div>
                    {/* Need Help Section */}
                    <div className="text-center py-8">
                      <div className="flex justify-center mb-6">
                        <div className="relative">
                          <div className="w-24 h-24 bg-purple-600/20 rounded-full flex items-center justify-center">
                            <Users style={{width: '3.5px', height: '3.5px'}} className="text-purple-500" />
                          </div>
                          <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-500 rounded-full" />
                          <div style={{width: '3.5px', height: '3.5px'}} className="absolute top-0 right-8 bg-purple-400 rounded-full" />
                          <div className="absolute -bottom-2 left-4 text-purple-400">✦</div>
                          <div className="absolute top-4 -left-4 text-purple-400">✦</div>
                        </div>
                      </div>

                      <h3 className="text-[10px] font-semibold text-white mb-4">
                        Need Help?
                      </h3>
                      <p className="text-gray-400 mb-8 px-4">
                        Have questions or concerns regarding your Miraclez account? Our experts are here to help!
                      </p>

                      <button
                        onClick={handleChatWithUs}
                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                        data-testid="button-chat-with-us"
                      >
                        <MessageSquare style={{width: '3px', height: '3px'}} className="" />
                        Chat with us
                      </button>
                    </div>

                    {/* Miraclez Logo and Footer */}
                    <div className="mt-16 border-t border-gray-800 pt-8">
                      <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-purple-400 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-[8px]">M</span>
                        </div>
                        <span className="text-white font-semibold text-[10px]">MIRACLEZ</span>
                      </div>

                      <div className="grid grid-cols-2 gap-8">
                        <div>
                          <h4 className="text-white font-semibold mb-3">Support</h4>
                          <ul className="space-y-2">
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 text-[8px]">Live Support</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 text-[8px]">Help Center</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 text-[8px]">Game Responsibly</a></li>
                          </ul>
                        </div>
                        <div>
                          <h4 className="text-white font-semibold mb-3">Platform</h4>
                          <ul className="space-y-2">
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 text-[8px]">Provably Fair</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 text-[8px]">Affiliate Program</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 text-[8px]">Redeem Code</a></li>
                            <li><a href="#" className="text-gray-400 hover:text-purple-400 text-[8px]">VIP Program</a></li>
                          </ul>
                        </div>
                      </div>

                      {/* Back to Home Button */}
                      <div className="mt-8 pt-6 border-t border-gray-800">
                        <Button
                          onClick={() => {
                            handleClose();
                            navigate('/');
                          }}
                          variant="ghost"
                          size="sm"
                          className="w-full text-gray-400 hover:text-white"
                          data-testid="button-back-home-responsible-gaming"
                        >
                          <ArrowLeft style={{width: '3px', height: '3px'}} className="mr-2" />
                          Back to Home
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}