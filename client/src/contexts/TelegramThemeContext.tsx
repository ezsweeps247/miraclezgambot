import React, { createContext, useContext, useEffect, useState } from 'react';

interface TelegramTheme {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
  header_bg_color?: string;
  accent_text_color?: string;
  section_bg_color?: string;
  section_header_text_color?: string;
  subtitle_text_color?: string;
  destructive_text_color?: string;
}

interface TelegramThemeContextType {
  theme: TelegramTheme;
  isDarkMode: boolean;
  colorScheme: 'dark' | 'light';
}

const defaultTheme: TelegramTheme = {
  bg_color: '#0f1212',
  text_color: '#ffffff',
  hint_color: '#999999',
  link_color: '#D4AF37',
  button_color: '#D4AF37',
  button_text_color: '#000000',
  secondary_bg_color: '#1a1d1e',
  header_bg_color: '#0f1212',
  accent_text_color: '#D4AF37',
  section_bg_color: '#1a1d1e',
  section_header_text_color: '#D4AF37',
  subtitle_text_color: '#999999',
  destructive_text_color: '#ff3b30',
};

const TelegramThemeContext = createContext<TelegramThemeContextType>({
  theme: defaultTheme,
  isDarkMode: true,
  colorScheme: 'dark',
});

export const useTelegramTheme = () => useContext(TelegramThemeContext);

export const TelegramThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<TelegramTheme>(defaultTheme);
  const [colorScheme, setColorScheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    // Get Telegram WebApp instance
    const telegram = (window as any).Telegram?.WebApp;
    
    if (telegram) {
      // Set initial theme
      const themeParams = telegram.themeParams || {};
      const mergedTheme = { ...defaultTheme, ...themeParams };
      setTheme(mergedTheme);
      
      // Determine color scheme
      const scheme = telegram.colorScheme || 'dark';
      setColorScheme(scheme);
      
      // Apply theme to CSS variables
      applyThemeToCSS(mergedTheme, scheme);
      
      // Listen for theme changes
      telegram.onEvent('themeChanged', () => {
        const updatedTheme = { ...defaultTheme, ...telegram.themeParams };
        const updatedScheme = telegram.colorScheme || 'dark';
        setTheme(updatedTheme);
        setColorScheme(updatedScheme);
        applyThemeToCSS(updatedTheme, updatedScheme);
      });
      
      // Set header and bottom bar colors
      telegram.setHeaderColor('bg_color');
      telegram.setBottomBarColor('#ffffff');
      
      // Expand the app
      if (telegram.expand) {
        telegram.expand();
      }
      
      // Mark app as ready
      if (telegram.ready) {
        telegram.ready();
      }
    } else {
      // Apply default theme if not in Telegram
      applyThemeToCSS(defaultTheme, 'dark');
    }
  }, []);

  const applyThemeToCSS = (theme: TelegramTheme, scheme: 'dark' | 'light') => {
    const root = document.documentElement;
    
    // Convert hex to HSL for better theme integration
    const hexToHSL = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return hex;
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      h = Math.round(h * 360);
      s = Math.round(s * 100);
      l = Math.round(l * 100);
      
      return `${h} ${s}% ${l}%`;
    };
    
    // Apply Telegram theme colors as CSS variables
    if (theme.bg_color) {
      root.style.setProperty('--tg-bg-color', theme.bg_color);
      root.style.setProperty('--background', hexToHSL(theme.bg_color));
    }
    
    if (theme.text_color) {
      root.style.setProperty('--tg-text-color', theme.text_color);
      root.style.setProperty('--foreground', hexToHSL(theme.text_color));
    }
    
    if (theme.button_color) {
      root.style.setProperty('--tg-button-color', theme.button_color);
      root.style.setProperty('--primary', hexToHSL(theme.button_color));
    }
    
    if (theme.button_text_color) {
      root.style.setProperty('--tg-button-text-color', theme.button_text_color);
      root.style.setProperty('--primary-foreground', hexToHSL(theme.button_text_color));
    }
    
    if (theme.secondary_bg_color) {
      root.style.setProperty('--tg-secondary-bg-color', theme.secondary_bg_color);
      root.style.setProperty('--card', hexToHSL(theme.secondary_bg_color));
      root.style.setProperty('--muted', hexToHSL(theme.secondary_bg_color));
    }
    
    if (theme.hint_color) {
      root.style.setProperty('--tg-hint-color', theme.hint_color);
      root.style.setProperty('--muted-foreground', hexToHSL(theme.hint_color));
    }
    
    if (theme.link_color) {
      root.style.setProperty('--tg-link-color', theme.link_color);
      root.style.setProperty('--accent', hexToHSL(theme.link_color));
    }
    
    if (theme.destructive_text_color) {
      root.style.setProperty('--tg-destructive-color', theme.destructive_text_color);
      root.style.setProperty('--destructive', hexToHSL(theme.destructive_text_color));
    }
    
    // Add color scheme class to body
    if (scheme === 'dark') {
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    } else {
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    }
  };

  const isDarkMode = colorScheme === 'dark';

  return (
    <TelegramThemeContext.Provider value={{ theme, isDarkMode, colorScheme }}>
      {children}
    </TelegramThemeContext.Provider>
  );
};