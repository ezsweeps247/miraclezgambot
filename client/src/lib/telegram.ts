declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        initDataUnsafe: {
          user?: {
            id: number;
            first_name: string;
            last_name?: string;
            username?: string;
          };
          auth_date?: number;
          hash?: string;
        };
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        theme: string;
        colorScheme: 'light' | 'dark';
        isExpanded: boolean;
        viewportHeight: number;
        viewportStableHeight: number;
      };
    };
  }
}

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

export function isTelegramWebApp(): boolean {
  return typeof window !== 'undefined' && !!window.Telegram?.WebApp;
}

export function initTelegramWebApp(): Promise<void> {
  return new Promise((resolve) => {
    // Always resolve immediately to prevent any blocking
    resolve();
    
    // Run initialization in background
    setTimeout(() => {
      try {
        if (!isTelegramWebApp()) {
          // Development ONLY fallback - create mock Telegram data
          if (import.meta.env.DEV) {
            console.warn('⚠️ Development mode: Creating mock Telegram WebApp data');
            // Create proper mock initData for development
            const mockUser = {
              id: 123456789,
              first_name: 'Test',
              last_name: 'User',
              username: 'testuser'
            };
            const mockAuthDate = Math.floor(Date.now() / 1000);
            const mockInitData = `user=${encodeURIComponent(JSON.stringify(mockUser))}&auth_date=${mockAuthDate}&hash=mock_hash_for_dev`;
            
            window.Telegram = {
              WebApp: {
                initData: mockInitData,
                initDataUnsafe: {
                  user: mockUser,
                  auth_date: mockAuthDate,
                  hash: 'mock_hash_for_dev'
                },
                ready: () => {},
                expand: () => {},
                close: () => {},
                MainButton: {
                  text: '',
                  show: () => {},
                  hide: () => {},
                  onClick: () => {}
                },
                BackButton: {
                  show: () => {},
                  hide: () => {},
                  onClick: () => {}
                },
                theme: 'dark',
                colorScheme: 'dark',
                isExpanded: false,
                viewportHeight: window.innerHeight,
                viewportStableHeight: window.innerHeight
              }
            };
            return;
          }
          // Production: No Telegram WebApp available, will redirect to web login
          console.log('Production: No Telegram WebApp detected');
          return;
        }

        const webApp = window.Telegram?.WebApp;
        
        if (webApp) {
          webApp.ready();
          webApp.expand();
          
          // Set theme
          document.documentElement.classList.add('dark');
        }
      } catch (error) {
        console.warn('Telegram WebApp initialization error:', error);
      }
    }, 0);
  });
}

export function getTelegramUser(): TelegramUser | null {
  if (!isTelegramWebApp()) {
    return null;
  }
  
  const user = window.Telegram?.WebApp?.initDataUnsafe.user;
  return user || null;
}

export function getTelegramInitData(): string | null {
  // Check if we have Telegram WebApp data (real or mock)
  const webApp = window.Telegram?.WebApp;
  if (webApp && webApp.initData) {
    console.log('Telegram initData found:', webApp.initData.substring(0, 50) + '...');
    return webApp.initData;
  }
  
  // DEVELOPMENT ONLY: If we're in development and don't have initData, create mock data
  if (import.meta.env.DEV && webApp && !webApp.initData) {
    console.log('⚠️ Development mode: Creating mock initData');
    const mockUser = {
      id: 123456789,
      first_name: 'Test',
      last_name: 'User',
      username: 'testuser'
    };
    const mockAuthDate = Math.floor(Date.now() / 1000);
    const mockInitData = `user=${encodeURIComponent(JSON.stringify(mockUser))}&auth_date=${mockAuthDate}&hash=mock_hash_for_dev`;
    
    // Try to update the existing WebApp object with mock data (some properties may be read-only)
    try {
      webApp.initData = mockInitData;
      webApp.initDataUnsafe = {
        user: mockUser,
        auth_date: mockAuthDate,
        hash: 'mock_hash_for_dev'
      };
    } catch (error) {
      // Some properties might be read-only, but we can still return the mock data
      console.log('Note: Some Telegram WebApp properties are read-only, but authentication will still work');
    }
    
    return mockInitData;
  }
  
  // Production or no Telegram WebApp: return null
  if (!import.meta.env.DEV && webApp && !webApp.initData) {
    console.error('Production: Telegram WebApp detected but no initData available');
  }
  
  return null;
}

export function closeTelegramWebApp(): void {
  if (isTelegramWebApp()) {
    window.Telegram?.WebApp?.close();
  }
}

export function showTelegramMainButton(text: string, onClick: () => void): void {
  if (isTelegramWebApp()) {
    const mainButton = window.Telegram?.WebApp?.MainButton;
    if (mainButton) {
      mainButton.text = text;
      mainButton.onClick(onClick);
      mainButton.show();
    }
  }
}

export function hideTelegramMainButton(): void {
  if (isTelegramWebApp()) {
    window.Telegram?.WebApp?.MainButton?.hide();
  }
}

export function showTelegramBackButton(onClick: () => void): void {
  if (isTelegramWebApp()) {
    const backButton = window.Telegram?.WebApp?.BackButton;
    if (backButton) {
      backButton.onClick(onClick);
      backButton.show();
    }
  }
}

export function hideTelegramBackButton(): void {
  if (isTelegramWebApp()) {
    window.Telegram?.WebApp?.BackButton?.hide();
  }
}
