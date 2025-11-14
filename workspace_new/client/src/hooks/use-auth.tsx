import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { initTelegramWebApp, getTelegramUser, getTelegramInitData } from '@/lib/telegram';
import { isTelegramWebApp } from '@/lib/platform';

interface User {
  id: string;
  telegramId?: number;
  email?: string;
  username?: string;
  firstName: string;
  lastName?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (initData: string) => Promise<void>;
  logout: () => Promise<void>;
  shouldShowDailyLogin: boolean;
  setShouldShowDailyLogin: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [shouldShowDailyLogin, setShouldShowDailyLogin] = useState(false);
  const queryClient = useQueryClient();
  const isTelegram = isTelegramWebApp();
  const [location, setLocation] = useLocation();

  // Initialize authentication based on platform
  useEffect(() => {
    const init = async () => {
      if (isTelegram) {
        // Telegram WebApp authentication flow
        try {
          await initTelegramWebApp();
          
          // Try to get Telegram data with retries
          let attempts = 0;
          const maxAttempts = 10;
          const attemptAuth = () => {
            const initData = getTelegramInitData();
            if (initData) {
              console.log('Authenticating with Telegram data');
              loginMutation.mutate(initData);
            } else if (attempts < maxAttempts) {
              attempts++;
              console.log(`Waiting for Telegram data... attempt ${attempts}/${maxAttempts}`);
              setTimeout(attemptAuth, 500); // Retry after 500ms
            } else {
              // Max attempts reached
              if (import.meta.env.DEV) {
                console.log('⚠️ Development mode: Auto-authenticating with test data');
                loginMutation.mutate('test-miraclez-2025');
              } else {
                // Production: No initData after retries - log but don't close yet
                console.error('CRITICAL: Telegram WebApp has no initData after retries');
                console.error('Telegram WebApp object:', window.Telegram?.WebApp);
                console.error('initDataUnsafe:', window.Telegram?.WebApp?.initDataUnsafe);
                // Don't close immediately - let error handler decide
                setIsInitialized(true);
              }
            }
          };
          
          // Start authentication attempts
          attemptAuth();
        } catch (error) {
          console.warn('Failed to initialize Telegram WebApp:', error);
          if (import.meta.env.DEV) {
            console.log('⚠️ Development mode: Auto-authenticating with test data');
            loginMutation.mutate('test-miraclez-2025');
          } else {
            // Production: Telegram init error - log but don't close
            console.error('CRITICAL: Telegram WebApp initialization failed');
            console.error('Init error details:', error);
            console.error('window.Telegram:', window.Telegram);
            // Don't close - let error be visible for debugging
            setIsInitialized(true);
          }
        }
      } else {
        // Web browser mode - check if user has valid session
        setIsInitialized(true);
      }
    };

    init();
  }, [isTelegram]);

  // Get current user
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/me'],
    enabled: isInitialized,
    retry: false,
    staleTime: 5000
  });

  // Redirect unauthenticated users to appropriate page
  useEffect(() => {
    // Skip public routes and admin routes
    const publicRoutes = ['/login', '/register', '/telegram-error'];
    const isPublicRoute = publicRoutes.some(route => location.startsWith(route));
    const isAdminRoute = location.startsWith('/admin');
    
    // Redirect if no user
    if (isInitialized && !isLoading && !user && !isPublicRoute && !isAdminRoute) {
      if (isTelegram) {
        // Telegram users: check if there's an auth error
        const authError = localStorage.getItem('telegram_auth_error');
        if (authError) {
          console.log('Telegram auth failed, showing error screen');
          setLocation('/telegram-error');
        } else {
          console.log('Telegram user not authenticated but no error recorded');
          // Stay on current page, might still be loading
        }
      } else {
        // Web users: redirect to login page
        console.log('Web user not authenticated, redirecting to login');
        setLocation('/login');
      }
    }
  }, [isInitialized, isLoading, user, isTelegram, location, setLocation]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (initData: string) => {
      const response = await apiRequest('POST', '/api/auth/telegram', { initData });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Authentication failed');
      }
      return response.json();
    },
    onSuccess: async (data) => {
      // Store token in localStorage for Telegram WebApp
      if (data.token) {
        localStorage.setItem('auth_token', data.token);
      }
      setIsInitialized(true);
      queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
      
      // Check login streak and potentially give rewards
      try {
        const streakResponse = await apiRequest('POST', '/api/me/check-streak');
        const streakData = await streakResponse.json();
        
        // Store streak data for display in UI components
        if (streakData.rewardGiven && streakData.rewardAmount > 0) {
          localStorage.setItem('streak_reward', JSON.stringify({
            streak: streakData.streak,
            rewardAmount: streakData.rewardAmount,
            timestamp: Date.now()
          }));
          // Invalidate balance to show new GC
          queryClient.invalidateQueries({ queryKey: ['/api/balance'] });
        } else if (!streakData.alreadyClaimed) {
          // New streak started or continued but no reward yet
          localStorage.setItem('streak_info', JSON.stringify({
            streak: streakData.streak,
            longestStreak: streakData.longestStreak,
            timestamp: Date.now()
          }));
        }
      } catch (error) {
        console.error('Failed to check login streak:', error);
      }
    },
    onError: (error: Error) => {
      console.error('Telegram authentication failed:', error.message);
      
      // Store error for display in error screen
      localStorage.setItem('telegram_auth_error', JSON.stringify({
        message: error.message,
        timestamp: Date.now()
      }));
      
      setIsInitialized(true);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest('POST', '/api/auth/logout');
    },
    onSuccess: () => {
      localStorage.removeItem('auth_token');
      queryClient.clear();
      
      // Redirect web users to login page
      if (!isTelegram) {
        setLocation('/login');
      }
    }
  });

  const login = async (initData: string) => {
    await loginMutation.mutateAsync(initData);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const isAuthenticated = !!user && !error;

  const value: AuthContextType = {
    user: (user as any) || null,
    isLoading: isLoading || !isInitialized,
    isAuthenticated,
    login,
    logout,
    shouldShowDailyLogin,
    setShouldShowDailyLogin
  };

  // Show loading screen while initializing
  if (!isInitialized || (isLoading && !user)) {
    return (
      <AuthContext.Provider value={value}>
        <div className="min-h-screen bg-[#0f1212] flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#D4AF37] mx-auto mb-4"></div>
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
