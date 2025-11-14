import { useEffect, useState } from 'react';
import { useTelegramTheme } from '@/contexts/TelegramThemeContext';

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const theme = useTelegramTheme();

  useEffect(() => {
    const telegram = (window as any).Telegram?.WebApp;
    
    if (telegram) {
      setWebApp(telegram);
      
      // Wait for WebApp to be ready
      if (!telegram.isExpanded) {
        telegram.expand();
      }
      
      // Enable closing confirmation
      telegram.enableClosingConfirmation();
      
      // Set ready state
      setIsReady(true);
      
      // Request theme update
      telegram.requestTheme();
      
      // Request viewport info
      telegram.requestViewport();
    }
  }, []);

  return {
    webApp,
    isReady,
    theme,
    user: webApp?.initDataUnsafe?.user,
    isExpanded: webApp?.isExpanded,
    viewportHeight: webApp?.viewportHeight,
    viewportStableHeight: webApp?.viewportStableHeight,
    platform: webApp?.platform,
    colorScheme: webApp?.colorScheme,
    themeParams: webApp?.themeParams,
  };
};