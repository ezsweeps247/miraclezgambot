import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Bell, Shield, Globe, Moon, Sun, Volume2 } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export default function Settings() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user data to get current sound preference
  const { data: user } = useQuery<any>({
    queryKey: ['/api/me']
  });

  const [settings, setSettings] = useState({
    notifications: true,
    soundEffects: user?.soundEnabled ?? true,
    darkMode: true,
    language: "en",
    currency: "USD",
    twoFactor: false,
    newsletter: true,
    promotions: true
  });

  // Update settings when user data loads
  useEffect(() => {
    if (user) {
      setSettings(prev => ({
        ...prev,
        soundEffects: user.soundEnabled ?? true
      }));
    }
  }, [user]);

  // Sound preference mutation
  const soundMutation = useMutation({
    mutationFn: async (soundEnabled: boolean) => {
      const response = await apiRequest('PUT', '/api/me/sound', { soundEnabled });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      toast({
        title: "Sound Preference Updated",
        description: "Your sound preference has been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save sound preference.",
        variant: "destructive"
      });
    }
  });

  const handleToggle = (key: string) => {
    const newValue = !settings[key as keyof typeof settings];
    
    setSettings(prev => ({
      ...prev,
      [key]: newValue
    }));

    // If toggling sound effects, save to backend
    if (key === 'soundEffects') {
      soundMutation.mutate(newValue as boolean);
    } else {
      toast({
        title: "Settings Updated",
        description: "Your preferences have been saved.",
      });
    }
  };

  const handleSelectChange = (key: string, value: string) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    toast({
      title: "Settings Updated",
      description: "Your preferences have been saved.",
    });
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10 mr-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>

        <div className="grid gap-6">
          {/* Account Settings */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Shield className="w-5 h-5 mr-2 text-golden" />
                Account & Security
              </CardTitle>
              <CardDescription className="text-gray-400">
                Manage your account security and privacy settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div>
                  <Label htmlFor="two-factor" className="text-white font-medium text-sm">Two-Factor Authentication</Label>
                  <p className="text-sm text-gray-400">Add an extra layer of security to your account</p>
                </div>
                <Switch
                  id="two-factor"
                  checked={settings.twoFactor}
                  onCheckedChange={() => handleToggle('twoFactor')}
                  data-testid="switch-two-factor"
                  className="data-[state=checked]:bg-casino-gold data-[state=unchecked]:bg-gray-600 scale-125"
                />
              </div>
            </CardContent>
          </Card>

          {/* Notification Settings */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Bell className="w-5 h-5 mr-2 text-golden" />
                Notifications
              </CardTitle>
              <CardDescription className="text-gray-400">
                Choose what notifications you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div>
                  <Label htmlFor="notifications" className="text-white font-medium text-sm">Push Notifications</Label>
                  <p className="text-sm text-gray-400">Receive notifications about your games and account</p>
                </div>
                <Switch
                  id="notifications"
                  checked={settings.notifications}
                  onCheckedChange={() => handleToggle('notifications')}
                  data-testid="switch-notifications"
                  className="data-[state=checked]:bg-casino-gold data-[state=unchecked]:bg-gray-600 scale-125"
                />
              </div>
              <Separator className="bg-white/10" />
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div>
                  <Label htmlFor="newsletter" className="text-white font-medium text-sm">Newsletter</Label>
                  <p className="text-sm text-gray-400">Receive updates about new games and features</p>
                </div>
                <Switch
                  id="newsletter"
                  checked={settings.newsletter}
                  onCheckedChange={() => handleToggle('newsletter')}
                  data-testid="switch-newsletter"
                  className="data-[state=checked]:bg-casino-gold data-[state=unchecked]:bg-gray-600 scale-125"
                />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div>
                  <Label htmlFor="promotions" className="text-white font-medium text-sm">Promotional Offers</Label>
                  <p className="text-sm text-gray-400">Get notified about bonuses and special offers</p>
                </div>
                <Switch
                  id="promotions"
                  checked={settings.promotions}
                  onCheckedChange={() => handleToggle('promotions')}
                  data-testid="switch-promotions"
                  className="data-[state=checked]:bg-casino-gold data-[state=unchecked]:bg-gray-600 scale-125"
                />
              </div>
            </CardContent>
          </Card>

          {/* Game Settings */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Volume2 className="w-5 h-5 mr-2 text-golden" />
                Game Preferences
              </CardTitle>
              <CardDescription className="text-gray-400">
                Customize your gaming experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
                <div>
                  <Label htmlFor="sound-effects" className="text-white font-medium text-sm">Sound Effects</Label>
                  <p className="text-sm text-gray-400">Enable or disable game sound effects</p>
                </div>
                <Switch
                  id="sound-effects"
                  checked={settings.soundEffects}
                  onCheckedChange={() => handleToggle('soundEffects')}
                  data-testid="switch-sound-effects"
                  className="data-[state=checked]:bg-casino-gold data-[state=unchecked]:bg-gray-600 scale-125"
                />
              </div>
            </CardContent>
          </Card>

          {/* Display Settings */}
          <Card className="bg-black/40 backdrop-blur-xl border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Globe className="w-5 h-5 mr-2 text-golden" />
                Display & Language
              </CardTitle>
              <CardDescription className="text-gray-400">
                Customize how the app looks and what language to use
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="language" className="text-white text-sm">Language</Label>
                <Select 
                  value={settings.language} 
                  onValueChange={(value) => handleSelectChange('language', value)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" data-testid="select-language">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="es">Español</SelectItem>
                    <SelectItem value="fr">Français</SelectItem>
                    <SelectItem value="de">Deutsch</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="currency" className="text-white text-sm">Currency Display</Label>
                <Select 
                  value={settings.currency} 
                  onValueChange={(value) => handleSelectChange('currency', value)}
                >
                  <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm" data-testid="select-currency">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-white/10">
                    <SelectItem value="USD">USD ($)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="GBP">GBP (£)</SelectItem>
                    <SelectItem value="CAD">CAD ($)</SelectItem>
                    <SelectItem value="AUD">AUD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Save Changes Button */}
          <div className="flex justify-center mt-8">
            <Button
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold px-12 py-6 text-base rounded-lg transition-all duration-200 shadow-lg hover:shadow-purple-500/50 border border-purple-500/50"
              data-testid="button-save-settings"
            >
              💾 Save All Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}