import { X, User, Settings as SettingsIcon, Shield, UserX, Edit2, Calendar, Gamepad2, Trophy, CheckCircle, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { useLocation } from 'wouter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserProfile {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  vipLevel: string;
  vipExperience: number;
  joinedOn: string;
  totalBets: number;
  totalWagered: number;
  totalRewarded: number;
  favoriteGame: string | null;
  avatarType: string;
  avatarBackgroundColor: string;
}

interface AvatarOption {
  id: string;
  name: string;
  icon: string;
}

interface BackgroundColor {
  name: string;
  value: string;
}

// Avatar options matching backend validation
const AVATAR_OPTIONS: AvatarOption[] = [
  { id: 'default', name: 'Default', icon: '👤' },
  { id: 'boy', name: 'Boy', icon: '👦' },
  { id: 'girl', name: 'Girl', icon: '👧' },
  { id: 'man', name: 'Man', icon: '👨' },
  { id: 'woman', name: 'Woman', icon: '👩' },
  { id: 'robot', name: 'Robot', icon: '🤖' },
  { id: 'cat', name: 'Cat', icon: '🐱' },
  { id: 'dog', name: 'Dog', icon: '🐶' },
  { id: 'alien', name: 'Alien', icon: '👽' }
];

// Background color options matching the screenshots
const BACKGROUND_COLORS: BackgroundColor[] = [
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Green', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Purple', value: '#9333ea' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Yellow', value: '#eab308' }
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('preferences');
  const [selectedAvatar, setSelectedAvatar] = useState('default');
  const [selectedBackground, setSelectedBackground] = useState('#9333ea');
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);

  // Fetch user profile data
  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ['/api/me'],
    enabled: isOpen
  });

  // Update avatar mutation
  const updateAvatarMutation = useMutation({
    mutationFn: async (data: { avatarType: string; avatarBackgroundColor: string }) => {
      return apiRequest('PUT', '/api/me/avatar', data);
    },
    onSuccess: () => {
      toast({
        title: "Avatar Updated",
        description: "Your avatar has been successfully updated!",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      setShowAvatarSelector(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update avatar",
        variant: "destructive"
      });
    }
  });

  // Initialize selected values from profile data
  useEffect(() => {
    if (profile) {
      setSelectedAvatar(profile.avatarType || 'default');
      setSelectedBackground(profile.avatarBackgroundColor || '#9333ea');
    }
  }, [profile]);

  const handleAvatarSave = () => {
    updateAvatarMutation.mutate({
      avatarType: selectedAvatar,
      avatarBackgroundColor: selectedBackground
    });
  };

  const getAvatarDisplay = (avatarType: string, backgroundColor: string) => {
    const avatar = AVATAR_OPTIONS.find(a => a.id === avatarType) || AVATAR_OPTIONS[0];
    return (
      <div 
        className="w-16 h-16 rounded-full flex items-center justify-center text-[10px]"
        style={{ backgroundColor }}
      >
        {avatar.icon}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'preferences':
        return (
          <div className="space-y-6">
            {/* Quick Access */}
            <div className="bg-gray-800/50 rounded-lg p-4 mb-6">
              <button
                onClick={() => {
                  onClose();
                  setLocation('/player-details');
                }}
                className="w-full flex items-center justify-between p-3 bg-purple-600/20 hover:bg-purple-600/30 rounded-lg transition-colors"
                data-testid="button-player-details"
              >
                <div className="flex items-center gap-3">
                  <User style={{width: '3px', height: '3px'}} className="text-purple-400" />
                  <span className="text-white font-medium">Player Details</span>
                </div>
                <ArrowRight style={{width: '3.5px', height: '3.5px'}} className="text-gray-400" />
              </button>
            </div>

            {/* User Information Section */}
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-[10px] font-bold text-white mb-4">User Information</h3>
              
              {/* Avatar and Basic Info */}
              <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-4 mb-3">
                  <div className="relative">
                    {profile && getAvatarDisplay(profile.avatarType, profile.avatarBackgroundColor)}
                    <button
                      onClick={() => setShowAvatarSelector(true)}
                      className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#D4AF37] rounded-full flex items-center justify-center hover:bg-[#D4AF37]/80 transition-colors"
                      data-testid="button-edit-avatar"
                    >
                      <Edit2 style={{width: '3px', height: '3px'}} className="text-black" />
                    </button>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-bold text-white">{profile?.username || user?.username}</h4>
                    <div className="flex items-center gap-1 text-gray-400">
                      <Trophy style={{width: '3.5px', height: '3.5px'}} className="" />
                      <span className="text-[8px]">{profile?.vipLevel || 'Unranked'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[8px]">Join Date</span>
                    <span className="text-white font-semibold text-[8px]">
                      {profile?.joinedOn ? format(new Date(profile.joinedOn), 'M.d.yyyy') : 'N/A'}
                    </span>
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[8px]">Games Played</span>
                    <span className="text-white font-semibold text-[8px]">{profile?.totalBets || 0}</span>
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[8px]">Played (XP)</span>
                    <div className="flex items-center gap-1">
                      <div style={{width: '3.5px', height: '3.5px'}} className="bg-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[8px] font-bold">1</span>
                      </div>
                      <span className="text-white font-semibold text-[8px]">1</span>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-[8px]">Email</span>
                    <div className="flex items-center gap-1">
                      <CheckCircle style={{width: '3.5px', height: '3.5px'}} className="text-green-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'sessions':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-[10px] font-bold text-white mb-4">Active Sessions</h3>
              <div className="text-gray-400 text-center py-8">
                <Shield style={{width: '3.5px', height: '3.5px'}} className="mx-auto mb-2 opacity-50" />
                <p>No active sessions to display</p>
              </div>
            </div>
          </div>
        );

      case 'ignored-users':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800/50 rounded-lg p-6">
              <h3 className="text-[10px] font-bold text-white mb-4">Ignored Users</h3>
              <div className="text-gray-400 text-center py-8">
                <UserX style={{width: '3.5px', height: '3.5px'}} className="mx-auto mb-2 opacity-50" />
                <p>No ignored users</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
            onClick={onClose}
          />
          
          {/* Settings Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-4 z-50 bg-black rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-full flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-800">
                <h2 className="text-[10px] font-bold text-white">Settings</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors"
                  data-testid="button-close-settings"
                >
                  <X style={{width: '3.5px', height: '3.5px'}} className="text-white" />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="flex border-b border-gray-800 bg-gray-900/50">
                {[
                  { id: 'preferences', label: 'Preferences' },
                  { id: 'sessions', label: 'Sessions' },
                  { id: 'ignored-users', label: 'Ignored Users' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-4 py-3 text-[8px] font-medium transition-colors ${
                      activeTab === tab.id
                        ? 'text-purple-300 bg-gradient-to-b from-purple-600/20 to-purple-700/30 border-b-2 border-purple-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    data-testid={`tab-${tab.id}`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <div className="w-8 h-8 border-2 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                      <p className="text-gray-400">Loading...</p>
                    </div>
                  </div>
                ) : isError ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <p className="text-red-400">Failed to load profile data</p>
                    </div>
                  </div>
                ) : (
                  renderTabContent()
                )}
              </div>
            </div>
          </motion.div>

          {/* Avatar Selector Modal */}
          <AnimatePresence>
            {showAvatarSelector && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 bg-black/90 z-60"
                  onClick={() => setShowAvatarSelector(false)}
                />
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-60 bg-black rounded-xl p-6 max-h-[80vh] overflow-y-auto"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Preview */}
                  <div className="text-center mb-6">
                    {getAvatarDisplay(selectedAvatar, selectedBackground)}
                    <h3 className="text-white text-[10px] font-bold mt-4">Select Avatar</h3>
                  </div>

                  {/* Avatar Options */}
                  <div className="mb-6">
                    <div className="grid grid-cols-8 gap-3">
                      {AVATAR_OPTIONS.map((avatar) => (
                        <button
                          key={avatar.id}
                          onClick={() => setSelectedAvatar(avatar.id)}
                          className={`w-12 h-12 rounded-lg flex items-center justify-center text-[10px] transition-all ${
                            selectedAvatar === avatar.id
                              ? 'bg-[#D4AF37] ring-2 ring-[#D4AF37]'
                              : 'bg-gray-800 hover:bg-gray-700'
                          }`}
                          style={{ backgroundColor: selectedAvatar === avatar.id ? selectedBackground : undefined }}
                          data-testid={`avatar-${avatar.id}`}
                        >
                          {avatar.icon}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Background Colors */}
                  <div className="mb-6">
                    <h4 className="text-white font-semibold mb-3">Select Background</h4>
                    <div className="grid grid-cols-8 gap-3">
                      {BACKGROUND_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setSelectedBackground(color.value)}
                          className={`w-8 h-8 rounded-full transition-transform ${
                            selectedBackground === color.value
                              ? 'ring-2 ring-white scale-110'
                              : 'hover:scale-105'
                          }`}
                          style={{ backgroundColor: color.value }}
                          data-testid={`color-${color.name.toLowerCase()}`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <Button
                      onClick={() => setShowAvatarSelector(false)}
                      variant="outline"
                      className="flex-1"
                      data-testid="button-cancel-avatar"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleAvatarSave}
                      disabled={updateAvatarMutation.isPending}
                      className="flex-1 bg-[#D4AF37] text-black hover:bg-[#D4AF37]/90"
                      data-testid="button-save-avatar"
                    >
                      {updateAvatarMutation.isPending ? 'Saving...' : 'Done'}
                    </Button>
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}