import { ArrowLeft, User, Shield, Settings, CheckCircle, Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { avatarOptions, backgroundColors } from '@shared/avatar-constants';

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

export default function EditAvatar() {
  const [, navigate] = useLocation();
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
    queryKey: ['/api/user/current/profile']
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
      queryClient.invalidateQueries({ queryKey: ['/api/user/current/profile'] });
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0d14] via-[#1a1d2e] to-[#0a0d14]">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-gray-800">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="xs"
                onClick={() => navigate('/user-profile')}
                className="border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black"
                data-testid="button-back-profile"
              >
                <ArrowLeft style={{width: '3px', height: '3px'}} className="mr-1" />
                Back to Profile
              </Button>
            </div>
            <h1 className="text-[10px] font-bold text-white whitespace-nowrap">Edit Avatar & Settings</h1>
            <div className="w-20" /> {/* Spacer for center alignment */}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <Loader2 style={{width: '3.5px', height: '3.5px'}} className="text-purple-500 animate-spin" />
              <p className="text-gray-400">Loading profile...</p>
            </div>
          </div>
        )}

        {profile && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Profile Header */}
            <Card className="bg-[#1a1a2e] border-gray-800 p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="relative mb-4">
                  <div 
                    className="w-24 h-24 rounded-full flex items-center justify-center text-[10px]"
                    style={{ 
                      backgroundColor: selectedBackground
                    }}
                  >
                    <span role="img" aria-label={`${selectedAvatar} avatar`}>
                      {avatarOptions.find(opt => opt.id === selectedAvatar)?.icon || '👤'}
                    </span>
                  </div>
                </div>
                <h2 className="text-[10px] font-bold text-white mb-2">{profile.username}</h2>
                
                {/* VIP Badge */}
                <div className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-600 rounded-full text-[8px] font-bold text-black mb-4">
                  🏆 {profile.vipLevel || 'UNRANKED'}
                </div>
                
                {/* VIP Progress Bar */}
                <div className="w-full max-w-sm">
                  <div className="flex justify-between text-[8px] text-gray-400 mb-1">
                    <span>{getVipProgress().toFixed(1)}%</span>
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
            </Card>

            {/* Stats Grid */}
            <Card className="bg-[#1a1a2e] border-gray-800 p-6">
              <h3 className="text-[10px] font-bold text-white mb-4">Your Stats</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[#2a2a3e] rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-[8px] mb-1">Total Bets</p>
                  <p className="text-white font-bold text-[10px]">{profile.totalBets || 0}</p>
                </div>
                <div className="bg-[#2a2a3e] rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-[8px] mb-1">Wagered</p>
                  <p className="text-white font-bold text-[10px]">{formatCurrency(profile.totalWagered || 0)}</p>
                </div>
                <div className="bg-[#2a2a3e] rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-[8px] mb-1">Rewarded</p>
                  <p className="text-green-400 font-bold text-[10px]">{formatCurrency(profile.totalRewarded || 0)}</p>
                </div>
                <div className="bg-[#2a2a3e] rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-[8px] mb-1">Joined</p>
                  <p className="text-white font-bold text-[10px]">{profile.joinDate ? formatDate(profile.joinDate) : 'Sep 2025'}</p>
                </div>
              </div>
            </Card>

            {/* Tab Navigation */}
            <Card className="bg-[#1a1a2e] border-gray-800">
              <div className="flex border-b border-gray-700 bg-gray-800/50 rounded-t-lg">
                {[
                  { id: 'account', label: 'Avatar', icon: User },
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
                    <Icon style={{width: '2.5px', height: '2.5px'}} />
                    {label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'account' && (
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-semibold text-white">Choose Your Avatar</h4>
                      <div className="grid grid-cols-6 gap-2 max-h-64 overflow-y-auto p-2 bg-[#2a2a3e] rounded-lg">
                        {avatarOptions.map((avatar) => (
                          <button
                            key={avatar.id}
                            onClick={() => setSelectedAvatar(avatar.id)}
                            className={`w-12 h-12 rounded-lg border-2 transition-all hover:scale-105 ${
                              selectedAvatar === avatar.id
                                ? 'border-[#D4AF37] bg-[#D4AF37]/20 scale-105'
                                : 'border-gray-600 hover:border-gray-500'
                            } flex items-center justify-center text-[10px]`}
                            style={{ backgroundColor: selectedBackground }}
                            data-testid={`avatar-${avatar.id}`}
                            title={avatar.name}
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
                            className={`w-16 h-16 rounded-xl border-2 transition-all hover:scale-105 ${
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

                    {/* Save Avatar Button */}
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
                          <CheckCircle style={{width: '3px', height: '3px'}} className="" />
                          {updateAvatarMutation.isPending ? 'Saving Avatar...' : hasAvatarChanges ? 'Save Avatar Changes' : 'No Changes to Save'}
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
                        <CheckCircle style={{width: '3px', height: '3px'}} className=" text-green-500" />
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
                        <Switch style={{width: '3px', height: '3px'}} className="data-[state=checked]:bg-[#D4AF37] data-[state=unchecked]:bg-gray-600 border-2 data-[state=checked]:border-[#D4AF37] data-[state=unchecked]:border-gray-500 shadow-lg" />
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
                          className="data-[state=checked]:bg-[#D4AF37] data-[state=unchecked]:bg-gray-600 h-6 w-11 border-2 data-[state=checked]:border-[#D4AF37] data-[state=unchecked]:border-gray-500 shadow-lg"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">Email Marketing</span>
                        <Switch
                          checked={emailMarketing}
                          onCheckedChange={setEmailMarketing}
                          className="data-[state=checked]:bg-[#D4AF37] data-[state=unchecked]:bg-gray-600 h-6 w-11 border-2 data-[state=checked]:border-[#D4AF37] data-[state=unchecked]:border-gray-500 shadow-lg"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-white">Streamer Mode</span>
                        <Switch
                          checked={streamerMode}
                          onCheckedChange={setStreamerMode}
                          className="data-[state=checked]:bg-[#D4AF37] data-[state=unchecked]:bg-gray-600 h-6 w-11 border-2 data-[state=checked]:border-[#D4AF37] data-[state=unchecked]:border-gray-500 shadow-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}