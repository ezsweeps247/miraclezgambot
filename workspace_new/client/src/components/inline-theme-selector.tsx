import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  Crown, 
  Zap, 
  Diamond, 
  Star,
  Palette
} from "lucide-react";

const themes = [
  { 
    id: 'classic-red', 
    category: 'classic', 
    name: 'Classic', 
    icon: Crown,
    gradient: 'linear-gradient(135deg, #8B0000 0%, #DC143C 25%, #B22222 50%, #8B0000 100%)'
  },
  { 
    id: 'neon-blue', 
    category: 'neon', 
    name: 'Neon', 
    icon: Zap,
    gradient: 'linear-gradient(135deg, #000080 0%, #0000FF 25%, #4169E1 50%, #000080 100%)'
  },
  { 
    id: 'emerald-luxury', 
    category: 'luxury', 
    name: 'Luxury', 
    icon: Diamond,
    gradient: 'linear-gradient(135deg, #006400 0%, #228B22 25%, #32CD32 50%, #006400 100%)'
  },
  { 
    id: 'cosmic-galaxy', 
    category: 'cosmic', 
    name: 'Cosmic', 
    icon: Star,
    gradient: 'linear-gradient(135deg, #1a0033 0%, #4a0080 25%, #7a00cc 50%, #1a0033 100%)'
  }
];

export function InlineThemeSelector() {
  const [selectedTheme, setSelectedTheme] = useState<string>('classic-red');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // Mark as mounted to ensure we're on the client side
    setIsMounted(true);
    
    // Only run on client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    // Apply theme after a small delay to ensure DOM is ready
    const initializeTheme = () => {
      try {
        // Load saved theme or use default
        const savedTheme = localStorage.getItem('casino-background-theme');
        console.log('[ThemeSelector] Loading saved theme:', savedTheme);
        const themeToApply = savedTheme || 'classic-red';
        
        setSelectedTheme(themeToApply);
        // Apply the theme
        applyTheme(themeToApply);
      } catch (error) {
        console.error('[ThemeSelector] Error loading theme:', error);
        // Fallback to default theme
        setSelectedTheme('classic-red');
        applyTheme('classic-red');
      }
    };
    
    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(initializeTheme);
  }, []);

  const applyTheme = (themeId: string) => {
    // Check if we're on the client side
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    
    console.log('[ThemeSelector] Applying theme:', themeId);
    
    const theme = themes.find(t => t.id === themeId);
    if (!theme) {
      console.error('[ThemeSelector] Theme not found:', themeId);
      return;
    }

    // Use requestAnimationFrame to ensure DOM is ready
    requestAnimationFrame(() => {
    try {
      const bodyElement = document.body;
      const rootElement = document.documentElement;
      
      // Remove existing theme classes from both body and root
      themes.forEach(t => {
        bodyElement.classList.remove(`theme-${t.id}`);
        rootElement.classList.remove(`theme-${t.id}`);
      });

      // Add new theme class to both body and root for better compatibility
      bodyElement.classList.add(`theme-${themeId}`);
      rootElement.classList.add(`theme-${themeId}`);
      console.log('[ThemeSelector] Added class:', `theme-${themeId}`);

      // Set CSS variable with important flag for higher specificity
      // Apply to both body and root for better compatibility
      bodyElement.style.setProperty('--casino-bg-gradient', theme.gradient, 'important');
      rootElement.style.setProperty('--casino-bg-gradient', theme.gradient, 'important');
      
      // Also set the background directly as a fallback
      bodyElement.style.background = theme.gradient;
      bodyElement.style.backgroundAttachment = 'fixed';
      bodyElement.style.backgroundSize = 'cover';
      bodyElement.style.backgroundRepeat = 'no-repeat';
      
      console.log('[ThemeSelector] Set gradient CSS variable and direct styles');

      // Save to localStorage
      try {
        localStorage.setItem('casino-background-theme', themeId);
        console.log('[ThemeSelector] Saved theme to localStorage');
      } catch (storageError) {
        console.error('[ThemeSelector] Failed to save theme to localStorage:', storageError);
      }
      
      setSelectedTheme(themeId);
      
      // Force a reflow to ensure styles are applied
      void bodyElement.offsetHeight;
    } catch (error) {
      console.error('[ThemeSelector] Error applying theme:', error);
    }
    });
  };

  // SSR safety: don't render buttons until client-side
  if (!isMounted) {
    return (
      <div className="w-full space-y-2">
        <div className="flex items-center gap-2 px-2 py-1">
          <Palette style={{width: '3.5px', height: '3.5px'}} className="text-muted-foreground" />
          <span className="text-[8px] font-medium">Theme</span>
        </div>
        <div className="grid grid-cols-2 gap-1 px-2">
          {themes.map((theme) => (
            <div 
              key={theme.id} 
              className="h-8 w-full bg-muted animate-pulse rounded-md"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center gap-2 px-2 py-1">
        <Palette style={{width: '3.5px', height: '3.5px'}} className="text-muted-foreground" />
        <span className="text-[8px] font-medium">Theme</span>
      </div>
      <div className="grid grid-cols-2 gap-1 px-2">
        {themes.map((theme) => {
          const Icon = theme.icon;
          const isSelected = selectedTheme === theme.id;
          
          return (
            <Button
              key={theme.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => {
                console.log('[ThemeSelector] Button clicked for theme:', theme.id);
                // Use setTimeout to ensure the click event completes before applying theme
                setTimeout(() => {
                  applyTheme(theme.id);
                }, 0);
              }}
              type="button"
              className={`
                flex items-center justify-start gap-2 h-8 w-full transition-all
                ${isSelected 
                  ? 'bg-casino-gold hover:bg-casino-gold/90 text-black border-casino-gold' 
                  : 'hover:bg-casino-gold/10 hover:border-casino-gold'
                }
              `}
            >
              <Icon style={{width: '3px', height: '3px'}} className="flex-shrink-0" />
              <span className="text-[8px] truncate">{theme.name}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}