import { Request, Response } from 'express';

// Fundora Blox API configuration
const FUNDORA_API_URL = process.env.FUNDORA_BLOX_API_URL || 'https://fundora-blox.example.com';
const API_KEY = process.env.FUNDORA_BLOX_API_KEY;
const WEBHOOK_SECRET = process.env.FUNDORA_BLOX_WEBHOOK_SECRET || 'default_webhook_secret';

interface CreateSessionResponse {
  session: string;
  embedUrl: string;
  expiresAt: string;
}

interface CreditsResponse {
  balance: number;
  currency: string;
}

interface GameSession {
  externalPlayerId: string;
  playerName: string;
  initialCredits: number;
  stake: string;
}

export class FundoraBloxAPI {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = API_KEY || '';
    this.baseUrl = FUNDORA_API_URL;
  }

  /**
   * Create a new game session for a player
   */
  async createSession(data: GameSession): Promise<CreateSessionResponse> {
    if (!this.apiKey) {
      throw new Error('Fundora Blox API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/game/sessions`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to create session: ${error}`);
    }

    return response.json();
  }

  /**
   * Load credits for a player
   */
  async loadCredits(externalPlayerId: string, amount: number, reference: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Fundora Blox API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/game/credits/load`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalPlayerId,
        amount,
        reference
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to load credits: ${error}`);
    }
  }

  /**
   * Get player's credit balance
   */
  async getBalance(externalPlayerId: string): Promise<CreditsResponse> {
    if (!this.apiKey) {
      throw new Error('Fundora Blox API key not configured');
    }

    const response = await fetch(
      `${this.baseUrl}/api/game/credits/balance/${externalPlayerId}`,
      {
        headers: {
          'X-API-Key': this.apiKey
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get balance: ${error}`);
    }

    return response.json();
  }

  /**
   * Redeem credits when player withdraws
   */
  async redeemCredits(externalPlayerId: string, amount: number, reference: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Fundora Blox API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/game/credits/redeem`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalPlayerId,
        amount,
        reference
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to redeem credits: ${error}`);
    }
  }

  /**
   * Award bonus points to a player
   */
  async awardPoints(externalPlayerId: string, pointsAmount: number, reason: string): Promise<void> {
    if (!this.apiKey) {
      throw new Error('Fundora Blox API key not configured');
    }

    const response = await fetch(`${this.baseUrl}/api/game/points/award`, {
      method: 'POST',
      headers: {
        'X-API-Key': this.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        externalPlayerId,
        pointsAmount,
        reason
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to award points: ${error}`);
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(body: any, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(body))
      .digest('hex');
    
    return hash === signature;
  }
}

export const fundoraBloxAPI = new FundoraBloxAPI();