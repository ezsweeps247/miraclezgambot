import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { blockchainMonitor } from "./crypto/blockchain-monitor";
import { paymentMonitor } from "./crypto/payment-monitor";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import path from "path";
import fundoraBloxRoutes from "./routes/fundora-blox";

const app = express();

// Trust proxy for Railway deployment (required for correct IP detection and cookies)
app.set('trust proxy', 1);

// Health check endpoint - MUST be absolutely first, before any middleware
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Simple test endpoint for Railway
app.get('/ping', (req, res) => {
  res.send('pong');
});

// CORS configuration for Railway deployment and Replit development
app.use(cors({
  origin: function (origin, callback) {
    // Allow same-origin requests (Railway deployment)
    if (!origin) return callback(null, true);
    
    // Development environment - be more permissive
    if (process.env.NODE_ENV === 'development') {
      console.log('CORS Debug - Origin:', origin);
      
      // Allow all Replit domains
      if (origin && origin.includes('.replit.dev')) {
        console.log('CORS: Allowing Replit domain');
        return callback(null, true);
      }
      
      // Allow localhost variations
      if (origin && (origin.includes('localhost') || origin.includes('127.0.0.1'))) {
        console.log('CORS: Allowing localhost');
        return callback(null, true);
      }
    }
    
    // Telegram WebApp origins - CRITICAL for Railway deployment
    const telegramOrigins = [
      'https://web.telegram.org',
      'https://web.telegram.org/a',
      'https://web.telegram.org/k',
      'https://telegram.org',
      'https://t.me',
      'https://k.telegram.org'
    ];
    
    if (origin && telegramOrigins.some(tgOrigin => origin.includes(tgOrigin))) {
      console.log('CORS: Allowing Telegram WebApp origin');
      return callback(null, true);
    }
    
    // Allow specific origins
    const allowedOrigins = [
      'http://localhost:5000',
      'https://localhost:5000',
      process.env.FRONTEND_ORIGIN,
      process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null,
      process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS}` : null,
      process.env.WEBAPP_URL,
      process.env.RAILWAY_STATIC_URL
    ].filter(Boolean);
    
    // Railway deployment: allow railway.app domains
    if (origin && origin.includes('railway.app')) {
      console.log('CORS: Allowing Railway domain');
      return callback(null, true);
    }
    
    // Check allowed origins
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    console.log('CORS: Rejecting origin:', origin, 'Allowed:', allowedOrigins);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cache-Control', 'X-Telegram-Web-App-Init-Data'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(process.cwd(), 'public', 'uploads')));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    // Ensure admin user exists on startup
    try {
      const adminUsername = process.env.ADMIN_USERNAME || 'admin';
      const adminPassword = process.env.ADMIN_PASSWORD || 'casino123!';
      
      const existingAdmin = await storage.getAdminByUsername(adminUsername);
      if (!existingAdmin) {
        console.log('No admin user found, creating default admin...');
        const passwordHash = await bcrypt.hash(adminPassword, 12);
        await storage.createAdmin({
          username: adminUsername,
          passwordHash,
          role: 'SUPER_ADMIN'
        });
        console.log(`Admin user created: ${adminUsername}`);
        console.log('⚠️  IMPORTANT: Change the default password after first login!');
      } else {
        console.log('Admin user exists, skipping creation');
      }
    } catch (error) {
      console.error('Warning: Could not check/create admin user:', error);
      // Don't crash the app, just warn
    }

    // Initialize daily login rewards on startup
    try {
      await storage.initializeDailyLoginRewards();
      console.log('Daily login rewards initialized');
    } catch (error) {
      console.error('Warning: Could not initialize daily login rewards:', error);
      // Don't crash the app, just warn
    }
    
    // Register Fundora Blox routes
    app.use(fundoraBloxRoutes);
    
    const server = await registerRoutes(app);
    
    // Start blockchain monitoring with error handling
    try {
      blockchainMonitor.startMonitoring();
    } catch (error) {
      console.error('Failed to start blockchain monitoring:', error);
      // Don't crash the app
    }
    
    // Start NOWPayments monitoring with error handling
    try {
      paymentMonitor.startMonitoring();
    } catch (error) {
      console.error('Failed to start payment monitoring:', error);
      // Don't crash the app
    }

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      console.error('Error:', err);
      res.status(status).json({ message });
    });

    // importantly only setup vite in development and after
    // setting up all the other routes so the catch-all route
    // doesn't interfere with the other routes
    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    // ALWAYS serve the app on the port specified in the environment variable PORT
    // Other ports are firewalled. Default to 5000 if not specified.
    // this serves both the API and the client.
    // It is the only port that is not firewalled.
    const port = parseInt(process.env.PORT || '5000', 10);
    server.listen({
      port,
      host: "0.0.0.0",
      reusePort: true,
    }, () => {
      log(`serving on port ${port}`);
    });
  } catch (error) {
    console.error('Fatal error during startup:', error);
    process.exit(1);
  }
})();

