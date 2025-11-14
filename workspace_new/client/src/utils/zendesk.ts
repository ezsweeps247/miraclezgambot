// Zendesk Live Chat Integration
// Loads and initializes the Zendesk widget

interface ZendeskAPI {
  activate?: (options?: { hideOnClose?: boolean }) => void;
  show?: () => void;
  hide?: () => void;
  toggle?: () => void;
  setLocale?: (locale: string) => void;
}

declare global {
  interface Window {
    zE?: (command: string, ...args: any[]) => void;
    zESettings?: any;
  }
}

let zendeskLoaded = false;

export const loadZendeskScript = (): void => {
  // Prevent multiple loads
  if (zendeskLoaded || document.getElementById('ze-snippet')) {
    return;
  }

  zendeskLoaded = true;

  // Create and append the script
  const script = document.createElement('script');
  script.id = 'ze-snippet';
  script.src = 'https://static.zdassets.com/ekr/snippet.js?key=c7ecff7d-edee-42ec-bd95-9d79402609cf';
  script.async = true;

  // Append to document head
  document.head.appendChild(script);
};

export const openZendeskChat = (): void => {
  // Load script first if not already loaded
  loadZendeskScript();

  // Try to open the chat widget
  const attemptOpen = (retries = 5): void => {
    if (window.zE) {
      // Open the Zendesk messenger
      window.zE('messenger', 'open');
    } else if (retries > 0) {
      // Retry after a short delay
      setTimeout(() => attemptOpen(retries - 1), 500);
    }
  };

  attemptOpen();
};
