import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  Settings, 
  Gamepad2, 
  Target, 
  Zap,
  Eye,
  Save,
  Dice1,
  Slot,
  TrendingUp,
  RotateCcw,
  Hash,
  Coins,
  Palette
} from 'lucide-react';

interface GameConfig {
  gameName: string;
  displayName: string;
  rtp: number;
  minBet: number;
  maxBet: number;
  isEnabled: boolean;
  // Advanced settings
  theme: string;
  multipliers: {
    min: number;
    max: number;
    step: number;
  };
  specialFeatures: {
    autoPlay: boolean;
    turboMode: boolean;
    bonusRounds: boolean;
  };
  riskSettings: {
    maxLoss: number;
    sessionLimit: number;
    cooldownPeriod: number;
  };
}

interface GameConfigurationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  initialGame?: any;
}

const AVAILABLE_GAMES = [
  { id: 'DICE', name: 'Dice', icon: Dice1, description: 'Classic dice rolling with customizable odds' },
  { id: 'SLOTS', name: 'Slots', icon: Slot, description: 'Multi-reel slot machine with various themes' },
  { id: 'CRASH', name: 'Crash', icon: TrendingUp, description: 'Multiplier crash game with real-time action' },
  { id: 'LIMBO', name: 'Limbo', icon: Target, description: 'Simple under/over betting game' },
  { id: 'MINES', name: 'Mines', icon: Hash, description: 'Grid-based mine avoidance game' },
  { id: 'PLINKO', name: 'Plinko', icon: Coins, description: 'Ball drop game with multiple multipliers' },
  { id: 'KENO', name: 'Keno', icon: RotateCcw, description: 'Number selection lottery-style game' },
  { id: 'ROULETTE', name: 'Roulette', icon: RotateCcw, description: 'Classic casino roulette wheel' },
  { id: 'BLACKJACK', name: 'Blackjack', icon: Gamepad2, description: 'Card game against the dealer' },
  { id: 'HILO', name: 'Hi-Lo', icon: TrendingUp, description: 'Card prediction higher or lower' },
  { id: 'MIRACOASTER', name: 'Miracoaster', icon: TrendingUp, description: 'Crypto market simulation game' }
];

const THEMES = [
  { id: 'classic', name: 'Classic', color: '#4F46E5' },
  { id: 'neon', name: 'Neon', color: '#EC4899' },
  { id: 'luxury', name: 'Luxury', color: '#D4AF37' },
  { id: 'cosmic', name: 'Cosmic', color: '#8B5CF6' },
  { id: 'nature', name: 'Nature', color: '#10B981' },
  { id: 'fire', name: 'Fire', color: '#F59E0B' }
];

export default function GameConfigurationWizard({ 
  isOpen, 
  onClose, 
  initialGame 
}: GameConfigurationWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [gameConfig, setGameConfig] = useState<GameConfig>({
    gameName: initialGame?.game_name || '',
    displayName: initialGame?.display_name || '',
    rtp: initialGame?.rtp_value || 96,
    minBet: initialGame?.min_bet || 0.10,
    maxBet: initialGame?.max_bet || 1000,
    isEnabled: initialGame?.is_enabled !== undefined ? initialGame.is_enabled : true,
    theme: initialGame?.theme || 'classic',
    multipliers: {
      min: initialGame?.multipliers?.min || 1.01,
      max: initialGame?.multipliers?.max || 100,
      step: initialGame?.multipliers?.step || 0.01
    },
    specialFeatures: {
      autoPlay: initialGame?.special_features?.auto_play || false,
      turboMode: initialGame?.special_features?.turbo_mode || false,
      bonusRounds: initialGame?.special_features?.bonus_rounds || false
    },
    riskSettings: {
      maxLoss: initialGame?.risk_settings?.max_loss || 1000,
      sessionLimit: initialGame?.risk_settings?.session_limit || 5000,
      cooldownPeriod: initialGame?.risk_settings?.cooldown_period || 300
    }
  });

  const queryClient = useQueryClient();
  const totalSteps = 5;

  // Save configuration mutation
  const saveConfigMutation = useMutation({
    mutationFn: async (config: GameConfig) => {
      const token = localStorage.getItem('adminToken');
      const response = await fetch(`/api/admin/game-settings/${config.gameName}/advanced`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rtp: config.rtp,
          minBet: config.minBet,
          maxBet: config.maxBet,
          isEnabled: config.isEnabled,
          theme: config.theme,
          multipliers: config.multipliers,
          specialFeatures: config.specialFeatures,
          riskSettings: config.riskSettings
        })
      });
      if (!response.ok) throw new Error('Failed to save configuration');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/game-settings'] });
      toast({
        title: "Configuration Saved",
        description: `${gameConfig.displayName || gameConfig.gameName} has been configured successfully`
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save game configuration",
        variant: "destructive"
      });
    }
  });

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = () => {
    saveConfigMutation.mutate(gameConfig);
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Gamepad2 className="mx-auto text-purple-500 mb-4" style={{width: '3.5px', height: '3.5px'}} />
              <h3 className="text-[10px] font-semibold text-white mb-2">Select Game</h3>
              <p className="text-[8px] text-gray-400">Choose which game you want to configure</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {AVAILABLE_GAMES.map((game) => (
                <Card 
                  key={game.id}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    gameConfig.gameName === game.id 
                      ? 'bg-purple-600 border-purple-500' 
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                  onClick={() => setGameConfig(prev => ({ 
                    ...prev, 
                    gameName: game.id,
                    displayName: game.name
                  }))}
                >
                  <CardContent className="p-4 text-center">
                    <game.icon className="mx-auto text-white mb-2" style={{width: '3.5px', height: '3.5px'}} />
                    <h4 className="font-medium text-white text-[8px]">{game.name}</h4>
                    <p className="text-[8px] text-gray-400 mt-1">{game.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Settings className="mx-auto text-purple-500 mb-4" style={{width: '3.5px', height: '3.5px'}} />
              <h3 className="text-[10px] font-semibold text-white mb-2">Basic Settings</h3>
              <p className="text-gray-400">Configure fundamental game parameters</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rtp" className="text-gray-300">RTP Percentage</Label>
                  <Input
                    id="rtp"
                    type="number"
                    min="80"
                    max="99.99"
                    step="0.01"
                    value={gameConfig.rtp}
                    onChange={(e) => setGameConfig(prev => ({ 
                      ...prev, 
                      rtp: parseFloat(e.target.value) 
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <p className="text-[8px] text-gray-400 mt-1">
                    House Edge: {(100 - gameConfig.rtp).toFixed(2)}%
                  </p>
                </div>

                <div>
                  <Label htmlFor="minBet" className="text-gray-300">Minimum Bet</Label>
                  <Input
                    id="minBet"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={gameConfig.minBet}
                    onChange={(e) => setGameConfig(prev => ({ 
                      ...prev, 
                      minBet: parseFloat(e.target.value) 
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="maxBet" className="text-gray-300">Maximum Bet</Label>
                  <Input
                    id="maxBet"
                    type="number"
                    min="1"
                    step="1"
                    value={gameConfig.maxBet}
                    onChange={(e) => setGameConfig(prev => ({ 
                      ...prev, 
                      maxBet: parseFloat(e.target.value) 
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="enabled" className="text-gray-300">Game Enabled</Label>
                  <Switch
                    id="enabled"
                    checked={gameConfig.isEnabled}
                    onCheckedChange={(checked) => setGameConfig(prev => ({ 
                      ...prev, 
                      isEnabled: checked 
                    }))}
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Palette className="mx-auto text-purple-500 mb-4" style={{width: '3.5px', height: '3.5px'}} />
              <h3 className="text-[10px] font-semibold text-white mb-2">Theme & Appearance</h3>
              <p className="text-gray-400">Customize the visual experience</p>
            </div>

            <div>
              <Label className="text-gray-300 mb-3 block">Game Theme</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {THEMES.map((theme) => (
                  <Card
                    key={theme.id}
                    className={`cursor-pointer transition-all hover:scale-105 ${
                      gameConfig.theme === theme.id
                        ? 'bg-purple-600 border-purple-500'
                        : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                    }`}
                    onClick={() => setGameConfig(prev => ({ ...prev, theme: theme.id }))}
                  >
                    <CardContent className="p-4 text-center">
                      <div 
                        className="w-8 h-8 rounded-full mx-auto mb-2"
                        style={{ backgroundColor: theme.color }}
                      />
                      <p className="text-[8px] font-medium text-white">{theme.name}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <Separator className="bg-gray-600" />

            <div>
              <Label className="text-gray-300 mb-3 block">Multiplier Settings</Label>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="minMultiplier" className="text-gray-300 text-[8px]">Minimum</Label>
                  <Input
                    id="minMultiplier"
                    type="number"
                    min="1"
                    step="0.01"
                    value={gameConfig.multipliers.min}
                    onChange={(e) => setGameConfig(prev => ({ 
                      ...prev, 
                      multipliers: { 
                        ...prev.multipliers, 
                        min: parseFloat(e.target.value) 
                      } 
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="maxMultiplier" className="text-gray-300 text-[8px]">Maximum</Label>
                  <Input
                    id="maxMultiplier"
                    type="number"
                    min="2"
                    step="1"
                    value={gameConfig.multipliers.max}
                    onChange={(e) => setGameConfig(prev => ({ 
                      ...prev, 
                      multipliers: { 
                        ...prev.multipliers, 
                        max: parseFloat(e.target.value) 
                      } 
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
                <div>
                  <Label htmlFor="stepMultiplier" className="text-gray-300 text-[8px]">Step</Label>
                  <Input
                    id="stepMultiplier"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={gameConfig.multipliers.step}
                    onChange={(e) => setGameConfig(prev => ({ 
                      ...prev, 
                      multipliers: { 
                        ...prev.multipliers, 
                        step: parseFloat(e.target.value) 
                      } 
                    }))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Zap className="mx-auto text-purple-500 mb-4" style={{width: '3.5px', height: '3.5px'}} />
              <h3 className="text-[10px] font-semibold text-white mb-2">Advanced Features</h3>
              <p className="text-gray-400">Configure special features and risk management</p>
            </div>

            <div className="space-y-6">
              <div>
                <Label className="text-gray-300 mb-3 block">Special Features</Label>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Auto Play</p>
                      <p className="text-[8px] text-gray-400">Allow automatic betting</p>
                    </div>
                    <Switch
                      checked={gameConfig.specialFeatures.autoPlay}
                      onCheckedChange={(checked) => setGameConfig(prev => ({
                        ...prev,
                        specialFeatures: { ...prev.specialFeatures, autoPlay: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Turbo Mode</p>
                      <p className="text-[8px] text-gray-400">Faster game animations</p>
                    </div>
                    <Switch
                      checked={gameConfig.specialFeatures.turboMode}
                      onCheckedChange={(checked) => setGameConfig(prev => ({
                        ...prev,
                        specialFeatures: { ...prev.specialFeatures, turboMode: checked }
                      }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">Bonus Rounds</p>
                      <p className="text-[8px] text-gray-400">Enable special bonus games</p>
                    </div>
                    <Switch
                      checked={gameConfig.specialFeatures.bonusRounds}
                      onCheckedChange={(checked) => setGameConfig(prev => ({
                        ...prev,
                        specialFeatures: { ...prev.specialFeatures, bonusRounds: checked }
                      }))}
                    />
                  </div>
                </div>
              </div>

              <Separator className="bg-gray-600" />

              <div>
                <Label className="text-gray-300 mb-3 block">Risk Management</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="maxLoss" className="text-gray-300 text-[8px]">Max Loss Limit ($)</Label>
                    <Input
                      id="maxLoss"
                      type="number"
                      min="100"
                      step="100"
                      value={gameConfig.riskSettings.maxLoss}
                      onChange={(e) => setGameConfig(prev => ({
                        ...prev,
                        riskSettings: { ...prev.riskSettings, maxLoss: parseFloat(e.target.value) }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="sessionLimit" className="text-gray-300 text-[8px]">Session Limit ($)</Label>
                    <Input
                      id="sessionLimit"
                      type="number"
                      min="500"
                      step="500"
                      value={gameConfig.riskSettings.sessionLimit}
                      onChange={(e) => setGameConfig(prev => ({
                        ...prev,
                        riskSettings: { ...prev.riskSettings, sessionLimit: parseFloat(e.target.value) }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cooldown" className="text-gray-300 text-[8px]">Cooldown (seconds)</Label>
                    <Input
                      id="cooldown"
                      type="number"
                      min="60"
                      step="60"
                      value={gameConfig.riskSettings.cooldownPeriod}
                      onChange={(e) => setGameConfig(prev => ({
                        ...prev,
                        riskSettings: { ...prev.riskSettings, cooldownPeriod: parseFloat(e.target.value) }
                      }))}
                      className="bg-gray-700 border-gray-600 text-white"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Eye className="mx-auto text-purple-500 mb-4" style={{width: '3.5px', height: '3.5px'}} />
              <h3 className="text-[10px] font-semibold text-white mb-2">Preview & Confirm</h3>
              <p className="text-gray-400">Review your configuration before saving</p>
            </div>

            <Card className="bg-gray-700 border-gray-600">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Gamepad2 style={{width: '3px', height: '3px'}} />
                  {gameConfig.displayName || gameConfig.gameName}
                  <Badge variant={gameConfig.isEnabled ? "default" : "secondary"}>
                    {gameConfig.isEnabled ? "Enabled" : "Disabled"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-[8px] text-gray-400">RTP</p>
                    <p className="text-white font-semibold">{gameConfig.rtp.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-gray-400">Min Bet</p>
                    <p className="text-white font-semibold">${gameConfig.minBet}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-gray-400">Max Bet</p>
                    <p className="text-white font-semibold">${gameConfig.maxBet}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-gray-400">Theme</p>
                    <p className="text-white font-semibold capitalize">{gameConfig.theme}</p>
                  </div>
                </div>

                <Separator className="bg-gray-600" />

                <div>
                  <p className="text-[8px] text-gray-300 mb-2">Features Enabled:</p>
                  <div className="flex flex-wrap gap-2">
                    {gameConfig.specialFeatures.autoPlay && (
                      <Badge variant="outline" className="text-[8px]">Auto Play</Badge>
                    )}
                    {gameConfig.specialFeatures.turboMode && (
                      <Badge variant="outline" className="text-[8px]">Turbo Mode</Badge>
                    )}
                    {gameConfig.specialFeatures.bonusRounds && (
                      <Badge variant="outline" className="text-[8px]">Bonus Rounds</Badge>
                    )}
                    {!gameConfig.specialFeatures.autoPlay && !gameConfig.specialFeatures.turboMode && !gameConfig.specialFeatures.bonusRounds && (
                      <span className="text-[8px] text-gray-400">No special features enabled</span>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-[8px] text-gray-300 mb-2">Risk Limits:</p>
                  <div className="text-[8px] text-gray-400">
                    Max Loss: ${gameConfig.riskSettings.maxLoss} • 
                    Session Limit: ${gameConfig.riskSettings.sessionLimit} • 
                    Cooldown: {gameConfig.riskSettings.cooldownPeriod}s
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-800 border-gray-700 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Settings className=""style={{width: '3px', height: '3px'}} />
            Advanced Game Configuration Wizard
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-[8px] text-gray-400">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <Progress value={(currentStep / totalSteps) * 100} className="h-2" />
          </div>

          {/* Step Content */}
          <div className="min-h-[400px]">
            {renderStepContent()}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ChevronLeft className=" mr-2"style={{width: '3px', height: '3px'}} />
              Previous
            </Button>

            <div className="flex gap-2">
              {currentStep === totalSteps ? (
                <Button
                  onClick={handleSave}
                  disabled={!gameConfig.gameName || saveConfigMutation.isPending}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  <Save className=" mr-2"style={{width: '3px', height: '3px'}} />
                  {saveConfigMutation.isPending ? 'Saving...' : 'Save Configuration'}
                </Button>
              ) : (
                <Button
                  onClick={handleNext}
                  disabled={currentStep === 1 && !gameConfig.gameName}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  Next
                  <ChevronRight className=" ml-2"style={{width: '3px', height: '3px'}} />
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}