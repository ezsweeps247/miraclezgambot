import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Palette, Check, Sparkles, Coins, Zap, Crown, Diamond, Star } from "lucide-react";
import { cn } from "@/lib/utils";

type BackgroundTheme = {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  gradient: string;
  pattern?: string;
  animation?: string;
  preview: string;
  category: 'classic' | 'neon' | 'luxury' | 'cosmic';
};

const backgroundThemes: BackgroundTheme[] = [
  // Classic Casino Themes
  {
    id: 'classic-red',
    name: 'Classic Casino',
    description: 'Traditional red velvet casino atmosphere',
    icon: <Crown style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #8B0000 0%, #DC143C 25%, #B22222 50%, #8B0000 100%)',
    pattern: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 1px, transparent 1px)',
    preview: 'bg-gradient-to-br from-red-900 via-red-700 to-red-900',
    category: 'classic'
  },
  {
    id: 'emerald-luxury',
    name: 'Emerald Luxury',
    description: 'Sophisticated green casino elegance',
    icon: <Diamond style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #006400 0%, #228B22 25%, #32CD32 50%, #006400 100%)',
    pattern: 'radial-gradient(circle at 75% 25%, rgba(255,255,255,0.08) 1px, transparent 1px)',
    preview: 'bg-gradient-to-br from-green-900 via-green-700 to-green-900',
    category: 'luxury'
  },
  {
    id: 'royal-purple',
    name: 'Royal Purple',
    description: 'Majestic purple with gold accents',
    icon: <Crown style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #4B0082 0%, #8A2BE2 25%, #9370DB 50%, #4B0082 100%)',
    pattern: 'radial-gradient(circle at 50% 50%, rgba(255,215,0,0.1) 1px, transparent 1px)',
    preview: 'bg-gradient-to-br from-purple-900 via-purple-700 to-purple-900',
    category: 'luxury'
  },
  
  // Neon Themes
  {
    id: 'neon-blue',
    name: 'Electric Blue',
    description: 'Vibrant neon blue with electric effects',
    icon: <Zap style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #000080 0%, #0000FF 25%, #4169E1 50%, #000080 100%)',
    animation: 'pulse 3s ease-in-out infinite',
    preview: 'bg-gradient-to-br from-blue-900 via-blue-600 to-blue-900',
    category: 'neon'
  },
  {
    id: 'neon-pink',
    name: 'Neon Nights',
    description: 'Hot pink neon with cyberpunk vibes',
    icon: <Sparkles style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #8B008B 0%, #FF1493 25%, #FF69B4 50%, #8B008B 100%)',
    animation: 'glow 2s ease-in-out infinite alternate',
    preview: 'bg-gradient-to-br from-pink-900 via-pink-600 to-pink-900',
    category: 'neon'
  },
  {
    id: 'cyber-orange',
    name: 'Cyber Orange',
    description: 'Futuristic orange with digital patterns',
    icon: <Zap style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #FF4500 0%, #FF8C00 25%, #FFA500 50%, #FF4500 100%)',
    pattern: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,255,255,0.05) 10px, rgba(255,255,255,0.05) 20px)',
    preview: 'bg-gradient-to-br from-orange-700 via-orange-500 to-orange-700',
    category: 'neon'
  },

  // Cosmic Themes
  {
    id: 'galaxy-purple',
    name: 'Galaxy Dreams',
    description: 'Deep space purple with starfield',
    icon: <Star style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #1a0033 0%, #330066 25%, #4d0080 50%, #1a0033 100%)',
    pattern: 'radial-gradient(circle at 20% 80%, rgba(255,255,255,0.2) 1px, transparent 1px), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.15) 1px, transparent 1px), radial-gradient(circle at 40% 40%, rgba(255,255,255,0.1) 1px, transparent 1px)',
    animation: 'twinkle 4s ease-in-out infinite',
    preview: 'bg-gradient-to-br from-indigo-900 via-purple-800 to-indigo-900',
    category: 'cosmic'
  },
  {
    id: 'nebula-teal',
    name: 'Nebula Teal',
    description: 'Cosmic teal with swirling patterns',
    icon: <Sparkles style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #003366 0%, #006666 25%, #009999 50%, #003366 100%)',
    pattern: 'radial-gradient(ellipse at 30% 70%, rgba(0,255,255,0.1) 20%, transparent 50%)',
    animation: 'nebula 6s ease-in-out infinite',
    preview: 'bg-gradient-to-br from-teal-900 via-teal-600 to-teal-900',
    category: 'cosmic'
  },

  // Gold Themes
  {
    id: 'golden-hour',
    name: 'Golden Hour',
    description: 'Warm golden tones with luxury feel',
    icon: <Coins style={{width: '3.5px', height: '3.5px'}} className="" />,
    gradient: 'linear-gradient(135deg, #B8860B 0%, #FFD700 25%, #DAA520 50%, #B8860B 100%)',
    pattern: 'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.2) 1px, transparent 1px)',
    preview: 'bg-gradient-to-br from-yellow-700 via-yellow-500 to-yellow-700',
    category: 'luxury'
  }
];

interface BackgroundThemeSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BackgroundThemeSelector({ isOpen, onClose }: BackgroundThemeSelectorProps) {
  const [selectedTheme, setSelectedTheme] = useState<string>('classic-red');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Load saved theme on component mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('casino-background-theme');
      if (savedTheme) {
        setSelectedTheme(savedTheme);
        // Delay theme application to ensure DOM is ready
        setTimeout(() => applyTheme(savedTheme), 100);
      }
    } catch (error) {
      console.error('[ThemeSelector] Error loading saved theme:', error);
      // Fallback to default theme
      setSelectedTheme('classic-red');
    }
  }, []);

  const applyTheme = (themeId: string) => {
    const theme = backgroundThemes.find(t => t.id === themeId);
    if (!theme) {
      console.error('[ThemeSelector] Theme not found:', themeId);
      return;
    }

    try {
      const rootElement = document.documentElement;
      const bodyElement = document.body;
    
    // Remove existing theme classes from both root and body
    backgroundThemes.forEach(t => {
      rootElement.classList.remove(`theme-${t.id}`);
      bodyElement.classList.remove(`theme-${t.id}`);
    });

    // Add new theme class to body (where CSS targets it)
    bodyElement.classList.add(`theme-${themeId}`);

    // Apply CSS custom properties to root
    rootElement.style.setProperty('--casino-bg-gradient', theme.gradient);
    
    // Apply background directly to body for immediate effect
    bodyElement.style.background = theme.gradient;
    bodyElement.style.backgroundAttachment = 'fixed';
    bodyElement.style.backgroundSize = 'cover';
    bodyElement.style.backgroundRepeat = 'no-repeat';
    
    if (theme.pattern) {
      rootElement.style.setProperty('--casino-bg-pattern', theme.pattern);
    } else {
      rootElement.style.removeProperty('--casino-bg-pattern');
    }
    
    if (theme.animation) {
      rootElement.style.setProperty('--casino-bg-animation', theme.animation);
      bodyElement.style.animation = theme.animation;
    } else {
      rootElement.style.removeProperty('--casino-bg-animation');
      bodyElement.style.animation = 'none';
    }

    // Save to localStorage with error handling
    try {
      localStorage.setItem('casino-background-theme', themeId);
    } catch (error) {
      console.error('[ThemeSelector] Failed to save theme to localStorage:', error);
    }
    } catch (error) {
      console.error('[ThemeSelector] Error applying theme:', error);
    }
  };

  const handleThemeSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    applyTheme(themeId);
  };

  const filteredThemes = selectedCategory === 'all' 
    ? backgroundThemes 
    : backgroundThemes.filter(theme => theme.category === selectedCategory);

  const categories = [
    { id: 'all', name: 'All Themes', icon: <Palette style={{width: '3.5px', height: '3.5px'}} className="" /> },
    { id: 'classic', name: 'Classic', icon: <Crown style={{width: '3.5px', height: '3.5px'}} className="" /> },
    { id: 'neon', name: 'Neon', icon: <Zap style={{width: '3.5px', height: '3.5px'}} className="" /> },
    { id: 'luxury', name: 'Luxury', icon: <Diamond style={{width: '3.5px', height: '3.5px'}} className="" /> },
    { id: 'cosmic', name: 'Cosmic', icon: <Star style={{width: '3.5px', height: '3.5px'}} className="" /> }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Palette style={{width: '3px', height: '3px'}} className="" />
                  Background Themes
                </CardTitle>
                <CardDescription>
                  Choose a casino-inspired background theme to enhance your gaming experience
                </CardDescription>
              </div>
              <Button variant="ghost" onClick={onClose}>
                ✕
              </Button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Category Filter */}
            <div className="flex flex-wrap gap-2">
              {categories.map(category => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                  className="flex items-center gap-2"
                >
                  {category.icon}
                  {category.name}
                </Button>
              ))}
            </div>

            {/* Theme Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
              {filteredThemes.map(theme => (
                <div
                  key={theme.id}
                  className={cn(
                    "relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-lg",
                    selectedTheme === theme.id ? "ring-2 ring-casino-gold border-casino-gold" : "hover:border-muted-foreground"
                  )}
                  onClick={() => handleThemeSelect(theme.id)}
                >
                  {/* Preview */}
                  <div className={cn(
                    "w-full h-20 rounded-md mb-3 relative overflow-hidden",
                    theme.preview
                  )}>
                    <div className="absolute inset-0 opacity-30">
                      {theme.pattern && (
                        <div 
                          className="w-full h-full"
                          style={{ backgroundImage: theme.pattern }}
                        />
                      )}
                    </div>
                    {selectedTheme === theme.id && (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-white/20 backdrop-blur-sm rounded-full p-1">
                          <Check style={{width: '3.5px', height: '3.5px'}} className="text-white" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Theme Info */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold flex items-center gap-2">
                        {theme.icon}
                        {theme.name}
                      </h4>
                      <Badge variant="secondary" className="text-[8px]">
                        {theme.category}
                      </Badge>
                    </div>
                    <p className="text-[8px] text-muted-foreground">
                      {theme.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Apply Button */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={onClose} className="bg-casino-gold hover:bg-casino-gold/80">
                Apply Theme
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// CSS for animations (to be added to global styles)
export const themeAnimationCSS = `
@keyframes pulse {
  0%, 100% { opacity: 0.8; }
  50% { opacity: 1; }
}

@keyframes glow {
  0% { box-shadow: 0 0 5px rgba(255, 20, 147, 0.3); }
  100% { box-shadow: 0 0 20px rgba(255, 20, 147, 0.6), 0 0 30px rgba(255, 20, 147, 0.4); }
}

@keyframes twinkle {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 1; }
}

@keyframes nebula {
  0%, 100% { transform: rotate(0deg) scale(1); }
  50% { transform: rotate(180deg) scale(1.1); }
}

/* Dynamic background application */
body.theme-classic-red { background: var(--casino-bg-gradient); }
body.theme-emerald-luxury { background: var(--casino-bg-gradient); }
body.theme-royal-purple { background: var(--casino-bg-gradient); }
body.theme-neon-blue { 
  background: var(--casino-bg-gradient); 
  animation: var(--casino-bg-animation, none);
}
body.theme-neon-pink { 
  background: var(--casino-bg-gradient);
  animation: var(--casino-bg-animation, none);
}
body.theme-cyber-orange { background: var(--casino-bg-gradient); }
body.theme-galaxy-purple { 
  background: var(--casino-bg-gradient);
  animation: var(--casino-bg-animation, none);
}
body.theme-nebula-teal { 
  background: var(--casino-bg-gradient);
  animation: var(--casino-bg-animation, none);
}
body.theme-golden-hour { background: var(--casino-bg-gradient); }

/* Pattern overlays */
body[class*="theme-"]:before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--casino-bg-pattern, none);
  pointer-events: none;
  z-index: -1;
}
`;