import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { X, User, Shield, Settings, Monitor, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiRequest } from "@/lib/queryClient";

// Avatar options - character emojis
const avatarOptions = [
  { id: 'default', name: 'Default', icon: '👤' },
  { id: 'gamer', name: 'Gamer', icon: '🎮' },
  { id: 'knight', name: 'Knight', icon: '⚔️' },
  { id: 'wizard', name: 'Wizard', icon: '🧙‍♂️' },
  { id: 'robot', name: 'Robot', icon: '🤖' },
  { id: 'ninja', name: 'Ninja', icon: '🥷' },
  { id: 'pirate', name: 'Pirate', icon: '🏴‍☠️' },
  { id: 'alien', name: 'Alien', icon: '👽' },
  { id: 'boy', name: 'Boy', icon: '👦' },
  { id: 'girl', name: 'Girl', icon: '👧' },
  { id: 'man', name: 'Man', icon: '👨' },
  { id: 'woman', name: 'Woman', icon: '👩' },
  { id: 'cat', name: 'Cat', icon: '🐱' },
  { id: 'dog', name: 'Dog', icon: '🐶' },
  { id: 'panda', name: 'Panda', icon: '🐼' },
  { id: 'lion', name: 'Lion', icon: '🦁' }
];

const backgroundColors = [
  '#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', 
  '#EF4444', '#EC4899', '#6366F1', '#84CC16'
];

interface UserProfile {
  id: string;
  telegramId: string;
  username: string;
  email: string;
  balance: { available: number; locked: number; currency: string };
  vipLevel: string;
  totalBets: number;
  totalWagered: number;
  totalRewarded: number;
  favoriteGame: string | null;
  avatarType: string;
  avatarBackgroundColor: string;
  joinDate: string;
  privateMode?: boolean;
  emailMarketing?: boolean;
  streamerMode?: boolean;
  twoFactorEnabled?: boolean;
}

interface AvatarHubProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AvatarHub({ isOpen, onClose }: AvatarHubProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('account');
  
  // Avatar state
  const [selectedAvatar, setSelectedAvatar] = useState('default');
  const [selectedBackground, setSelectedBackground] = useState('#8B5CF6');
  const [hasAvatarChanges, setHasAvatarChanges] = useState(false);
  
  // Profile state
  const [email, setEmail] = useState('');
  const [privateMode, setPrivateMode] = useState(false);
  const [emailMarketing, setEmailMarketing] = useState(false);
  const [streamerMode, setStreamerMode] = useState(false);

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery<UserProfile>({
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
        description: "Your avatar has been updated successfully!",
        variant: "default"
      });
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      setHasAvatarChanges(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update avatar",
        variant: "destructive"
      });
    }
  });

  // Initialize values when profile loads
  useEffect(() => {
    if (profile) {
      setSelectedAvatar(profile.avatarType || 'default');
      setSelectedBackground(profile.avatarBackgroundColor || '#8B5CF6');
      setEmail(profile.email || '');
      setPrivateMode(profile.privateMode || false);
      setEmailMarketing(profile.emailMarketing || false);
      setStreamerMode(profile.streamerMode || false);
    }
  }, [profile]);

  // Check for avatar changes
  useEffect(() => {
    if (profile) {
      const avatarChanged = selectedAvatar !== (profile.avatarType || 'default') || 
                           selectedBackground !== (profile.avatarBackgroundColor || '#8B5CF6');
      setHasAvatarChanges(avatarChanged);
    }
  }, [selectedAvatar, selectedBackground, profile]);

  const handleAvatarSave = () => {
    updateAvatarMutation.mutate({
      avatarType: selectedAvatar,
      avatarBackgroundColor: selectedBackground
    });
  };

  const getVipProgress = () => {
    // Mock VIP progress calculation
    const wagered = profile?.totalWagered || 0;
    const nextTierRequirement = 500000; // Example: $500k for next tier
    return Math.min((wagered / nextTierRequirement) * 100, 100);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-[10px] font-bold text-white">User Information</h2>
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="text-gray-400 hover:text-white"
            data-testid="button-close-avatar-hub"
          >
            <X style={{width: '3px', height: '3px'}} />
          </Button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* User Profile Section */}
          <div className="p-6 text-center border-b border-gray-700">
            {/* Large Avatar */}
            <div 
              className="w-20 h-20 rounded-full mx-auto mb-3 flex items-center justify-center text-[10px] font-bold text-white"
              style={{ backgroundColor: selectedBackground }}
            >
              {avatarOptions.find(opt => opt.id === selectedAvatar)?.icon || '👤'}
            </div>
            
            {/* Username */}
            <h3 className="text-[10px] font-bold text-white mb-2">
              {profile?.username || 'Loading...'}
            </h3>
            
            {/* VIP Badge */}
            <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-600 rounded-full text-[8px] font-bold text-black mb-4">
              🏆 {profile?.vipLevel || 'UNRANKED'}
            </div>
            
            {/* VIP Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[8px] text-gray-400 mb-1">
                <span>${getVipProgress().toFixed(1)}%</span>
                <span>Next: PLATINUM</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${getVipProgress()}%` }}
                />
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="p-6 grid grid-cols-2 gap-4 border-b border-gray-700">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] font-bold text-white">{profile?.totalBets || 0}</div>
              <div className="text-[8px] text-gray-400">Total Bets</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] font-bold text-white">{formatCurrency(profile?.totalWagered || 0)}</div>
              <div className="text-[8px] text-gray-400">Wagered</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] font-bold text-green-400">{formatCurrency(profile?.totalRewarded || 0)}</div>
              <div className="text-[8px] text-gray-400">Rewarded</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-[10px] font-bold text-white">{profile?.joinDate ? formatDate(profile.joinDate) : 'Sep 2025'}</div>
              <div className="text-[8px] text-gray-400">Joined</div>
            </div>
          </div>

          {/* Favorites */}
          <div className="p-6 grid grid-cols-2 gap-4 border-b border-gray-700">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-[8px] text-gray-400 mb-1">Favorite Game</div>
              <div className="text-[10px] text-white font-medium">🎯 {profile?.favoriteGame || 'PLINKO'}</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-[8px] text-gray-400 mb-1">Favorite Asset</div>
              <div className="text-[10px] text-white font-medium">₿ BTC</div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-700 bg-gray-800/50">
            {[
              { id: 'account', label: 'Account', icon: User },
              { id: 'verify', label: 'Verify', icon: Shield },
              { id: 'security', label: 'Security', icon: Settings },
              { id: 'preferences', label: 'Preferences', icon: Settings }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-[8px] font-medium transition-all ${
                  activeTab === id
                    ? 'text-purple-300 border-b-2 border-purple-500 bg-gradient-to-b from-purple-600/20 to-purple-700/30'
                    : 'text-gray-400 hover:text-white'
                }`}
                data-testid={`tab-${id}`}
              >
                <Icon style={{width: '3px', height: '3px'}} />
                {label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'account' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h4 className="text-[10px] font-semibold text-white">Choose Avatar</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {avatarOptions.map((avatar) => (
                      <button
                        key={avatar.id}
                        onClick={() => setSelectedAvatar(avatar.id)}
                        className={`w-12 h-12 rounded-lg border-2 transition-all ${
                          selectedAvatar === avatar.id
                            ? 'border-[#D4AF37] bg-[#D4AF37]/20'
                            : 'border-gray-600 hover:border-gray-500'
                        } flex items-center justify-center text-[10px]`}
                        style={{ backgroundColor: selectedBackground }}
                        data-testid={`avatar-${avatar.id}`}
                      >
                        {avatar.icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-semibold text-white">Background Color</h4>
                  <div className="grid grid-cols-4 gap-3">
                    {backgroundColors.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedBackground(color)}
                        className={`w-12 h-12 rounded-lg border-2 transition-all ${
                          selectedBackground === color
                            ? 'border-[#D4AF37] scale-110'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                        data-testid={`background-${color}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Save Avatar Button - Always visible and prominent */}
                <div className="relative">
                  <Button
                    onClick={handleAvatarSave}
                    disabled={updateAvatarMutation.isPending || !hasAvatarChanges}
                    className={`w-full py-4 text-[10px] font-bold border-2 transition-all duration-300 ${
                      hasAvatarChanges
                        ? 'bg-gradient-to-r from-[#D4AF37] to-[#F4E37D] text-black border-[#D4AF37] hover:from-[#F4E37D] hover:to-[#D4AF37] shadow-lg shadow-[#D4AF37]/30 hover:shadow-xl hover:shadow-[#D4AF37]/50 transform hover:scale-105'
                        : 'bg-gray-700 text-gray-400 border-gray-600 cursor-not-allowed'
                    }`}
                    data-testid="button-save-avatar"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <CheckCircle style={{width: '3px', height: '3px'}} />
                      {updateAvatarMutation.isPending ? 'Saving Avatar...' : hasAvatarChanges ? 'Save Avatar' : 'No Changes to Save'}
                    </div>
                  </Button>
                  {hasAvatarChanges && (
                    <div style={{width: '3px', height: '3px'}} className="absolute -top-1 -right-1 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="text-[8px] font-medium text-white">Email</label>
                    <Input
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="mt-1 bg-gray-800 border-gray-600"
                      data-testid="input-email"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'verify' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-semibold text-white">Account Verification</h4>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle style={{width: '3px', height: '3px'}} className="text-green-500" />
                    <span className="text-white">Email Verified</span>
                  </div>
                </div>
                <div className="bg-gray-800 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full border-2 border-gray-500"></div>
                    <span className="text-gray-400">Phone Verification</span>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-semibold text-white">Security Settings</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Two-Factor Authentication</span>
                    <Switch />
                  </div>
                  <Button variant="outline" className="w-full">
                    Change Password
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'preferences' && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-semibold text-white">Privacy & Preferences</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-white">Private Mode</span>
                    <Switch
                      checked={privateMode}
                      onCheckedChange={setPrivateMode}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Email Marketing</span>
                    <Switch
                      checked={emailMarketing}
                      onCheckedChange={setEmailMarketing}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white">Streamer Mode</span>
                    <Switch
                      checked={streamerMode}
                      onCheckedChange={setStreamerMode}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Back to Home Button */}
          <div className="p-6 pt-0">
            <Button 
              onClick={onClose}
              variant="ghost" 
              className="w-full text-gray-400 hover:text-white"
            >
              ← Back to Home
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}