export function isTelegramWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check if Telegram WebApp SDK is present AND has valid platform info
  // This prevents false positives in preview environments
  const webApp = (window as any).Telegram?.WebApp;
  if (!webApp) return false;
  
  // In a real Telegram environment, the platform should be set
  // Preview environments won't have this
  return webApp.platform !== 'unknown' || !!webApp.initData;
}

export function isWebBrowser(): boolean {
  return !isTelegramWebApp();
}

export function getPlatform(): 'telegram' | 'web' {
  return isTelegramWebApp() ? 'telegram' : 'web';
}
