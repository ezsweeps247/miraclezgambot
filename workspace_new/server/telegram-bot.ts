import TelegramBot from 'node-telegram-bot-api';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'dev-placeholder-token';
const WEBHOOK_URL = process.env.WEBHOOK_URL;

if (!process.env.TELEGRAM_BOT_TOKEN && process.env.NODE_ENV === 'production') {
  throw new Error('TELEGRAM_BOT_TOKEN environment variable is required in production');
}

let bot: TelegramBot | null = null;
let isInitialized = false;
let currentToken: string | null = null;

export function getBot(): TelegramBot {
  // Reinitialize bot if token has changed
  if (currentToken && currentToken !== BOT_TOKEN && bot) {
    console.log('Bot token changed, stopping old bot...');
    try {
      bot.stopPolling();
    } catch (e) {
      // Ignore errors when stopping
    }
    bot = null;
    isInitialized = false;
    currentToken = null;
  }
  
  if (!bot) {
    bot = new TelegramBot(BOT_TOKEN, { 
      polling: false // Start without polling to prevent conflicts
    });
    currentToken = BOT_TOKEN;
  }
  return bot;
}

export function initializeBot() {
  // Allow reinitialization if token has changed
  if (isInitialized && currentToken === BOT_TOKEN) {
    console.log('Telegram bot already initialized, skipping...');
    return;
  }
  
  // Skip bot initialization if no token is provided
  if (!BOT_TOKEN || BOT_TOKEN === 'dev-placeholder-token') {
    console.log('Telegram bot token not configured, skipping bot initialization');
    return;
  }
  
  // Log the WebApp URL being used
  const webAppUrl = process.env.WEBAPP_URL || process.env.RAILWAY_STATIC_URL || 'https://miraclezgambot.up.railway.app';
  console.log('Telegram WebApp URL configured as:', webAppUrl);
  console.log('Telegram Bot Token (first 20 chars):', BOT_TOKEN.substring(0, 20));
  
  let telegramBot: TelegramBot;
  try {
    isInitialized = true;
    telegramBot = getBot();
    
    // Check for webhook URL (Railway should have this set)
    if (WEBHOOK_URL) {
      // Production with webhook (Railway will use this)
      // Set webhook to Railway URL
      const webhookUrl = `${WEBHOOK_URL}/webhook/${BOT_TOKEN}`;
      console.log('Setting Telegram webhook to:', webhookUrl);
      telegramBot.setWebHook(webhookUrl)
        .then(() => {
          console.log('Telegram bot webhook set successfully');
        })
        .catch((error: any) => {
          console.error('Failed to set Telegram webhook:', error.message || error);
          // Don't crash the app, just log the error
        });
    } else {
      // Use polling when no webhook URL (development or Railway without webhook)
      console.log('No webhook URL found, using polling mode');
      telegramBot.startPolling({ restart: false })
        .catch((error: any) => {
          if (error.response && error.response.body && error.response.body.error_code === 409) {
            console.log('Telegram bot conflict detected - another instance may be running. Bot features disabled.');
            isInitialized = false;
          } else {
            console.error('Failed to start Telegram bot polling:', error.message || error);
          }
        });
      console.log('Telegram bot polling started');
    }
  } catch (error: any) {
    console.error('Error initializing Telegram bot:', error.message || error);
    isInitialized = false;
    // Don't crash the app
    return; // Exit if bot initialization failed
  }

  // Command handlers (only register if bot initialized successfully)
  telegramBot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const user = msg.from;
    
    if (!user) return;

    const welcomeMessage = `
🎲 Welcome to Miraclez Gaming! 🎰

Get ready to experience the thrill of provably fair gaming with:
• 🎲 Dice - Classic casino dice
• 🎰 Slots - 5x3 reel slot machine  
• 📈 Crash - Multiplier crash game
• 🎢 CryptoCoaster - Thrilling roller coaster ride
• 🎯 Plinko - Watch your coins drop and win
• 🎨 Keno - Pick your lucky numbers

All games are provably fair and cryptographically verified!
    `;

    const keyboard = {
      inline_keyboard: [
        [
          {
            text: '🎮 Open Casino',
            web_app: { 
              url: process.env.WEBAPP_URL || process.env.RAILWAY_STATIC_URL || 'https://miraclezgambot.up.railway.app' 
            }
          }
        ],
        [
          {
            text: '🎰 Casino Menu',
            callback_data: 'casino'
          },
          {
            text: '💰 Check Balance',
            callback_data: 'balance'
          }
        ],
        [
          {
            text: '🔍 How It Works',
            callback_data: 'how_it_works'
          },
          {
            text: '❓ Help & Support',
            callback_data: 'help'
          }
        ]
      ]
    };

    await telegramBot.sendMessage(chatId, welcomeMessage, {
      reply_markup: keyboard,
      parse_mode: 'HTML'
    });
  });

  telegramBot.onText(/\/casino/, async (msg) => {
    const chatId = msg.chat.id;
    const casinoMenuText = `
🎰 **Miraclez Gaming - Full Casino Experience**

🎮 **8 Exciting Games:**
• 🎲 **Dice** - Classic casino dice with multipliers
• 🎰 **Slots** - 5x3 reel slot machine with bonuses
• 📈 **Crash** - Cash out before the crash!
• 🎢 **CryptoCoaster** - Thrilling roller coaster ride
• 🎯 **Plinko** - Watch your coins drop and win
• 🎨 **Keno** - Pick up to 10 lucky numbers
• 🏰 **Tower Defense** - Strategic betting game
• 💣 **Mines** - Avoid mines, collect rewards
• 🧩 **Enigma** - Puzzle game with 5 levels

💰 **Dual Currency System:**
• 🪙 Gold Coins (GC) - Free play currency
• 💎 Sweep Coins (SC) - Real money sweepstakes

🎁 **Features:**
• 10-Tier VIP System (Bronze → Diamond)
• Progressive 4-Tier Jackpots (MINI/MINOR/MAJOR/MEGA)
• Daily Login Streaks & Bonuses
• Provably Fair Gaming (HMAC-SHA256)
• Instant Withdrawals for VIP members

Click below to start your winning journey!
    `;
    
    await telegramBot.sendMessage(chatId, casinoMenuText, {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🎮 Open Casino WebApp',
              web_app: { 
                url: process.env.WEBAPP_URL || process.env.RAILWAY_STATIC_URL || 'https://miraclezgambot.up.railway.app' 
              }
            }
          ]
        ]
      }
    });
  });

  telegramBot.onText(/\/help/, async (msg) => {
    const chatId = msg.chat.id;
    const helpText = `
❓ **Miraclez Gaming Help & Support**

**Getting Started:**
• Use /start to see the main menu
• Click "🎮 Open Casino" to play games
• All games are provably fair and verified

**About Miraclez Gaming:**
• Premium social casino & sweepstakes platform
• Dual currency: GC (free play) & SC (real money)
• 9 exciting games with progressive jackpots
• 10-tier VIP system with exclusive benefits

**Commands:**
• /start - Main casino menu
• /casino - View all games & features  
• /help - Show this help message

**Currencies:**
• 🪙 **Gold Coins (GC)** - Free play currency, earn daily
• 💎 **Sweep Coins (SC)** - Real money sweepstakes, cash out winnings

**VIP Benefits:**
• Higher deposit bonuses (up to 200%)
• Reduced wagering requirements
• Instant withdrawal access (Jade tier+)
• Exclusive VIP tournaments

**Support:**
• Games not loading? Check internet connection
• Questions about fairness? See "🔍 How It Works"
• Technical issues? Contact support in casino app

**Responsible Gaming:**
• Never share your account
• Play within your limits
• Take regular breaks

For detailed rules & features, open the casino app!
    `;
    
    await telegramBot.sendMessage(chatId, helpText);
  });

  // Callback query handlers
  telegramBot.on('callback_query', async (callbackQuery) => {
    const message = callbackQuery.message;
    const data = callbackQuery.data;
    
    if (!message) return;

    switch (data) {
      case 'balance':
        try {
          // Get actual user balance
          const telegramId = callbackQuery.from.id;
          const { storage } = await import('./storage');
          
          // Find user by telegram ID
          const user = await storage.getUserByTelegramId(telegramId);
          if (!user) {
            await telegramBot.answerCallbackQuery(callbackQuery.id, { 
              text: '❌ User not found. Please start the casino first.',
              show_alert: true 
            });
            break;
          }
          
          // Get both GC and SC balances
          const { gc, sc } = await storage.getUserBalances(user.id);
          
          if (!gc && !sc) {
            await telegramBot.answerCallbackQuery(callbackQuery.id, { 
              text: '❌ Balance not found.',
              show_alert: true 
            });
            break;
          }
          
          // Format GC balance (Gold Coins - free play)
          const gcAvailable = gc ? (gc.available / 100).toFixed(2) : '0.00';
          const gcLocked = gc ? (gc.locked / 100).toFixed(2) : '0.00';
          
          // Format SC balance (Sweep Coins - real money)
          const scAvailable = sc ? (sc.available / 100).toFixed(2) : '0.00';
          const scLocked = sc ? (sc.locked / 100).toFixed(2) : '0.00';
          
          await telegramBot.answerCallbackQuery(callbackQuery.id, { 
            text: `💰 Your Balances:\n\n🪙 Gold Coins (GC):\n  Available: ${gcAvailable}\n  Locked: ${gcLocked}\n\n💎 Sweep Coins (SC):\n  Available: ${scAvailable}\n  Locked: ${scLocked}`,
            show_alert: true 
          });
        } catch (error) {
          console.error('Error getting balance:', error);
          await telegramBot.answerCallbackQuery(callbackQuery.id, { 
            text: '❌ Error retrieving balance.',
            show_alert: true 
          });
        }
        break;

      case 'casino':
        const casinoMenuText = `
🎰 **Miraclez Gaming - Full Casino Experience**

🎮 **8 Exciting Games:**
• 🎲 **Dice** - Classic casino dice with multipliers
• 🎰 **Slots** - 5x3 reel slot machine with bonuses
• 📈 **Crash** - Cash out before the crash!
• 🎢 **CryptoCoaster** - Thrilling roller coaster ride
• 🎯 **Plinko** - Watch your coins drop and win
• 🎨 **Keno** - Pick up to 10 lucky numbers
• 🏰 **Tower Defense** - Strategic betting game
• 💣 **Mines** - Avoid mines, collect rewards
• 🧩 **Enigma** - Puzzle game with 5 levels

💰 **Dual Currency System:**
• 🪙 Gold Coins (GC) - Free play currency
• 💎 Sweep Coins (SC) - Real money sweepstakes

🎁 **Features:**
• 10-Tier VIP System (Bronze → Diamond)
• Progressive 4-Tier Jackpots (MINI/MINOR/MAJOR/MEGA)
• Daily Login Streaks & Bonuses
• Provably Fair Gaming (HMAC-SHA256)
• Instant Withdrawals for VIP members

Click "🎮 Open Casino" to start playing!
        `;
        
        await telegramBot.answerCallbackQuery(callbackQuery.id);
        await telegramBot.sendMessage(message.chat.id, casinoMenuText, {
          reply_markup: {
            inline_keyboard: [
              [
                {
                  text: '🎮 Open Casino WebApp',
                  web_app: { 
                    url: process.env.WEBAPP_URL || process.env.RAILWAY_STATIC_URL || 'https://miraclezgambot.up.railway.app'
                  }
                }
              ]
            ]
          }
        });
        break;
        
      case 'help':
        const helpText = `
❓ **Miraclez Gaming Help & Support**

**Getting Started:**
• Use /start to see the main menu
• Click "🎮 Open Casino" to play games
• All games are provably fair and verified

**About Miraclez Gaming:**
• Premium social casino & sweepstakes platform
• Dual currency: GC (free play) & SC (real money)
• 9 exciting games with progressive jackpots
• 10-tier VIP system with exclusive benefits

**Commands:**
• /start - Main casino menu
• /casino - View all games & features  
• /help - Show this help message

**Currencies:**
• 🪙 **Gold Coins (GC)** - Free play currency, earn daily
• 💎 **Sweep Coins (SC)** - Real money sweepstakes, cash out winnings

**VIP Benefits:**
• Higher deposit bonuses (up to 200%)
• Reduced wagering requirements
• Instant withdrawal access (Jade tier+)
• Exclusive VIP tournaments

**Support:**
• Games not loading? Check internet connection
• Questions about fairness? See "🔍 How It Works"
• Technical issues? Contact support in casino app

**Responsible Gaming:**
• Never share your account
• Play within your limits
• Take regular breaks

For detailed rules & features, open the casino app!
        `;
        
        await telegramBot.answerCallbackQuery(callbackQuery.id);
        await telegramBot.sendMessage(message.chat.id, helpText);
        break;
        
      case 'how_it_works':
        const howItWorksText = `
🔒 **Provably Fair Gaming**

Our casino uses cryptographic proofs to ensure every game is fair:

1️⃣ **Server Seed:** We generate a secret seed (hashed publicly)
2️⃣ **Client Seed:** You provide your own seed  
3️⃣ **Game Result:** Results are generated from both seeds
4️⃣ **Verification:** After the game, server seed is revealed
5️⃣ **Proof:** You can verify the result yourself

**Why This Matters:**
• Impossible for us to cheat or manipulate results
• You can mathematically verify every game outcome
• Complete transparency in all game mechanics

🔍 **Verify Results:** Use the verification tool in the casino app after each game to confirm fairness.

**Algorithm:** HMAC-SHA256 cryptographic hashing ensures true randomness.
        `;
        
        await telegramBot.answerCallbackQuery(callbackQuery.id);
        await telegramBot.sendMessage(message.chat.id, howItWorksText);
        break;
        
      default:
        await telegramBot.answerCallbackQuery(callbackQuery.id);
    }
  });

  // Rate limiting per user
  const userLastMessage = new Map();
  const RATE_LIMIT_MS = 1000; // 1 second

  telegramBot.on('message', (msg) => {
    const userId = msg.from?.id;
    if (!userId) return;

    const now = Date.now();
    const lastMessage = userLastMessage.get(userId);
    
    if (lastMessage && now - lastMessage < RATE_LIMIT_MS) {
      // Rate limited - ignore message
      return;
    }
    
    userLastMessage.set(userId, now);
  });

  // Error handling
  telegramBot.on('error', (error) => {
    console.error('Telegram bot error:', error);
  });

  telegramBot.on('polling_error', (error) => {
    console.error('Telegram polling error:', error);
  });
}
