# 3Blox Game API Integration Guide

This guide explains how to integrate the 3Blox game into your platform using our plug-and-play API.

## Overview

The 3Blox Game API allows you to:
- Embed the game on your platform
- Manage player sessions and credits from your system
- Receive real-time webhooks for game events
- Track player statistics and prizes

## Getting Started

### 1. Get Your API Key

Contact your administrator to get an API key for your platform. The API key will be provided to you along with webhook configuration options.

### 2. API Base URL

All API requests should be made to:
```
https://your-game-domain.com/api/game
```

### 3. Authentication

Include your API key in all requests using the `X-API-Key` header:

```bash
curl -H "X-API-Key: your_api_key_here" \
     https://your-game-domain.com/api/game/sessions
```

## API Endpoints

### Create Game Session

Start a new game session for a player.

**Endpoint:** `POST /api/game/sessions`

**Headers:**
```
X-API-Key: your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "externalPlayerId": "player123",
  "playerName": "John Doe",
  "initialCredits": 100.00,
  "stake": "1.00"
}
```

**Parameters:**
- `externalPlayerId` (optional): Your platform's player ID
- `playerName` (optional): Player's display name
- `initialCredits` (required): Starting credit balance (decimal)
- `stake` (required): Game stake amount - can be "FREE", "0.5", "1", "2", "5", "10", or "20"

**Response:**
```json
{
  "session": {
    "id": 1,
    "sessionToken": "a1b2c3d4e5f6...",
    "externalPlayerId": "player123",
    "playerName": "John Doe",
    "initialCredits": "100.00",
    "stake": "1.00",
    "status": "active",
    "createdAt": "2025-01-24T10:30:00Z"
  },
  "embedUrl": "https://your-game-domain.com?session=a1b2c3d4e5f6..."
}
```

### Get Session Details

Retrieve information about an active or completed session.

**Endpoint:** `GET /api/game/sessions/:sessionToken`

**Headers:**
```
X-API-Key: your_api_key_here
```

**Response:**
```json
{
  "session": {
    "id": 1,
    "sessionToken": "a1b2c3d4e5f6...",
    "externalPlayerId": "player123",
    "playerName": "John Doe",
    "initialCredits": "100.00",
    "stake": "1.00",
    "score": 450,
    "prize": "2.00",
    "prizeType": "cash",
    "blocksStacked": 10,
    "highestRow": 10,
    "status": "completed",
    "createdAt": "2025-01-24T10:30:00Z",
    "endedAt": "2025-01-24T10:35:00Z"
  }
}
```

### End Game Session

Mark a session as completed and record the final results.

**Endpoint:** `POST /api/game/sessions/:sessionToken/end`

**Headers:**
```
X-API-Key: your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "score": 450,
  "prize": 2.00,
  "prizeType": "cash",
  "blocksStacked": 10,
  "highestRow": 10
}
```

**Parameters:**
- `score` (required): Final game score
- `prize` (optional): Prize amount won
- `prizeType` (optional): "cash" or "points"
- `blocksStacked` (required): Number of blocks successfully stacked
- `highestRow` (required): Highest row reached

**Response:**
```json
{
  "session": {
    // Complete session object with updated fields
  },
  "message": "Session ended successfully"
}
```

## Webhooks

The API can send real-time webhook notifications to your platform for game events.

### Webhook Events

#### 1. game.started

Sent when a new game session is created.

```json
{
  "sessionId": 1,
  "sessionToken": "a1b2c3d4e5f6...",
  "externalPlayerId": "player123",
  "playerName": "John Doe",
  "initialCredits": "100.00",
  "stake": "1.00",
  "timestamp": "2025-01-24T10:30:00Z"
}
```

#### 2. game.ended

Sent when a game session is completed.

```json
{
  "sessionId": 1,
  "sessionToken": "a1b2c3d4e5f6...",
  "externalPlayerId": "player123",
  "playerName": "John Doe",
  "score": 450,
  "prize": "2.00",
  "prizeType": "cash",
  "blocksStacked": 10,
  "highestRow": 10,
  "timestamp": "2025-01-24T10:35:00Z"
}
```

#### 3. prize.won

Sent when a player wins a prize (only when prize > 0).

```json
{
  "sessionId": 1,
  "sessionToken": "a1b2c3d4e5f6...",
  "externalPlayerId": "player123",
  "playerName": "John Doe",
  "prize": "2.00",
  "prizeType": "cash",
  "timestamp": "2025-01-24T10:35:00Z"
}
```

### Webhook Security

All webhooks include an `X-Webhook-Signature` header containing an HMAC SHA-256 signature of the request body.

**Verifying Webhooks:**

```javascript
const crypto = require('crypto');

function verifyWebhook(body, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return signature === expectedSignature;
}

// In your webhook endpoint:
app.post('/webhooks/3blox', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const isValid = verifyWebhook(req.body, signature, YOUR_WEBHOOK_SECRET);
  
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process webhook event
  const eventType = req.headers['x-event-type'];
  console.log('Received event:', eventType, req.body);
  
  res.json({ received: true });
});
```

## Embedding the Game

### Option 1: iframe Embed

The simplest way to embed the game is using an iframe with the session token:

```html
<iframe 
  src="https://your-game-domain.com?session=SESSION_TOKEN_HERE"
  width="800"
  height="600"
  frameborder="0"
  allow="fullscreen"
></iframe>
```

### Option 2: Direct Link

Send players directly to the game URL with the session parameter:

```
https://your-game-domain.com?session=SESSION_TOKEN_HERE
```

## Complete Integration Example

Here's a complete example of integrating the game into your Node.js platform:

```javascript
const axios = require('axios');
const crypto = require('crypto');

const API_KEY = 'your_api_key_here';
const WEBHOOK_SECRET = 'your_webhook_secret_here';
const GAME_API_URL = 'https://your-game-domain.com/api/game';

// Create a game session
async function createGameSession(playerId, playerName, credits, stake) {
  try {
    const response = await axios.post(
      `${GAME_API_URL}/sessions`,
      {
        externalPlayerId: playerId,
        playerName: playerName,
        initialCredits: credits,
        stake: stake
      },
      {
        headers: {
          'X-API-Key': API_KEY,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error creating session:', error.response?.data || error.message);
    throw error;
  }
}

// Webhook handler
function handleWebhook(req, res) {
  const signature = req.headers['x-webhook-signature'];
  const eventType = req.headers['x-event-type'];
  
  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  
  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Handle different event types
  switch (eventType) {
    case 'game.started':
      console.log('Game started:', req.body);
      // Update your database, log analytics, etc.
      break;
      
    case 'game.ended':
      console.log('Game ended:', req.body);
      // Update player stats, credits, etc.
      break;
      
    case 'prize.won':
      console.log('Prize won:', req.body);
      // Credit player account, send notification, etc.
      if (req.body.prizeType === 'cash') {
        // Handle cash prize
        creditPlayerAccount(req.body.externalPlayerId, req.body.prize);
      } else {
        // Handle points prize
        addPlayerPoints(req.body.externalPlayerId, req.body.prize);
      }
      break;
  }
  
  res.json({ received: true });
}

// Example usage
async function startGameForPlayer(playerId, playerName) {
  const session = await createGameSession(playerId, playerName, 100.00, '1.00');
  
  console.log('Session created:', session.session.sessionToken);
  console.log('Embed URL:', session.embedUrl);
  
  return session;
}
```

## Prize Structure

The game has a 14-row grid with the following prize structure:

### Points Prizes (Rows 6-8)
- Row 6: 250 points
- Row 7: 500 points
- Row 8: 1,000 points

### Cash Prizes (Rows 9-13)
- Row 9: 1x stake
- Row 10: 2x stake
- Row 11: 5x stake
- Row 12: 10x stake
- Row 13: 100x stake

**Note:** Point prizes are multiplied based on the stake amount. Cash prizes are only available when playing with real money stakes (not FREE mode).

## Stake Options

Available stake amounts:
- `"FREE"` - Free play mode (points only)
- `"0.5"` - $0.50
- `"1"` - $1.00
- `"2"` - $2.00
- `"5"` - $5.00
- `"10"` - $10.00
- `"20"` - $20.00

## Error Handling

All API endpoints return standard HTTP status codes:

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Missing or invalid API key
- `403 Forbidden` - API key inactive or insufficient permissions
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

Error responses include details:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Best Practices

1. **Store Session Tokens Securely** - Keep session tokens in your database associated with player IDs
2. **Handle Webhooks Asynchronously** - Process webhook data in background jobs to avoid timeouts
3. **Verify Webhook Signatures** - Always validate webhook signatures before processing
4. **Implement Retry Logic** - Handle temporary API failures with exponential backoff
5. **Monitor API Usage** - Track your API calls and session creation rates
6. **Test in Sandbox** - Test your integration thoroughly before going live

## Advanced API Endpoints

### Session Management

#### List All Sessions

Get a paginated list of all sessions with optional filtering.

**Endpoint:** `GET /api/game/sessions`

**Headers:**
```
X-API-Key: your_api_key_here
```

**Query Parameters:**
- `status` (optional): Filter by status ("active" or "completed")
- `playerId` (optional): Filter by external player ID
- `limit` (optional): Number of results (default: 50, max: 200)
- `offset` (optional): Pagination offset (default: 0)

**Example:**
```bash
curl -H "X-API-Key: your_api_key_here" \
     "https://your-game-domain.com/api/game/sessions?status=completed&limit=10"
```

**Response:**
```json
{
  "sessions": [
    {
      "id": 1,
      "sessionToken": "a1b2c3d4...",
      "externalPlayerId": "player123",
      "playerName": "John Doe",
      "score": 450,
      "prize": "2.00",
      "status": "completed",
      "createdAt": "2025-01-24T10:30:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "limit": 10,
    "offset": 0,
    "hasMore": true
  }
}
```

#### Track Gameplay Events

Send real-time gameplay events for monitoring and analytics.

**Endpoint:** `POST /api/game/sessions/:sessionToken/events`

**Headers:**
```
X-API-Key: your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "eventType": "block_placed",
  "data": {
    "row": 5,
    "columns": 2,
    "score": 150,
    "combo": 3
  }
}
```

**Event Types:**
- `block_placed` - When a block is successfully placed
- `combo_started` - When a combo streak begins
- `combo_broken` - When a combo streak ends
- `milestone_reached` - When player reaches a specific row

**Response:**
```json
{
  "success": true,
  "message": "Event tracked successfully",
  "eventType": "block_placed"
}
```

**Webhook:** This triggers a `gameplay.{eventType}` webhook to your configured URL.

### Analytics & Statistics

#### Get Analytics Overview

Get comprehensive analytics for all your game sessions.

**Endpoint:** `GET /api/game/analytics/overview`

**Headers:**
```
X-API-Key: your_api_key_here
```

**Query Parameters:**
- `range` (optional): Time range - "7" (7 days), "30" (30 days), "90" (90 days), or "all" (default: "7d")

**Example:**
```bash
curl -H "X-API-Key: your_api_key_here" \
     "https://your-game-domain.com/api/game/analytics/overview?range=30"
```

**Response:**
```json
{
  "timeRange": "30d",
  "statistics": {
    "totalSessions": 1250,
    "completedSessions": 1180,
    "activeSessions": 70,
    "totalScore": 456000,
    "totalStakes": 2500.00,
    "totalPrizes": 1850.00,
    "averageScore": 365,
    "averageBlocksStacked": 8.5,
    "highestRow": 13,
    "uniquePlayers": 450
  },
  "stakeDistribution": [
    {
      "stake": "1.00",
      "count": 500,
      "totalPrizes": 750.00
    },
    {
      "stake": "2.00",
      "count": 350,
      "totalPrizes": 600.00
    }
  ],
  "topPlayers": [
    {
      "externalPlayerId": "player123",
      "playerName": "John Doe",
      "totalSessions": 45,
      "totalScore": 15600,
      "totalPrizes": 125.00,
      "highestRow": 12
    }
  ]
}
```

#### Get Session Statistics

Get time-series data for session metrics.

**Endpoint:** `GET /api/game/analytics/sessions/stats`

**Headers:**
```
X-API-Key: your_api_key_here
```

**Query Parameters:**
- `groupBy` (optional): Time grouping - "hour", "day" (default), "week", or "month"
- `limit` (optional): Number of periods (default: 30, max: 365)

**Response:**
```json
{
  "groupBy": "day",
  "data": [
    {
      "period": "2025-01-24T00:00:00Z",
      "totalSessions": 85,
      "completedSessions": 80,
      "totalScore": 28500,
      "totalStakes": 170.00,
      "totalPrizes": 125.00
    }
  ]
}
```

#### Get Player Statistics

Get detailed statistics for a specific player.

**Endpoint:** `GET /api/game/analytics/players/:playerId/stats`

**Headers:**
```
X-API-Key: your_api_key_here
```

**Example:**
```bash
curl -H "X-API-Key: your_api_key_here" \
     "https://your-game-domain.com/api/game/analytics/players/player123/stats"
```

**Response:**
```json
{
  "playerId": "player123",
  "statistics": {
    "totalSessions": 45,
    "completedSessions": 42,
    "activeSessions": 3,
    "totalScore": 15600,
    "averageScore": 347,
    "highestScore": 650,
    "totalStakes": 90.00,
    "totalPrizes": 125.00,
    "averageBlocksStacked": 9.2,
    "highestRow": 12,
    "lastPlayedAt": "2025-01-24T15:30:00Z"
  },
  "recentSessions": [
    {
      "sessionToken": "a1b2c3d4...",
      "score": 450,
      "stake": "2.00",
      "prize": "4.00",
      "prizeType": "cash",
      "blocksStacked": 10,
      "highestRow": 10,
      "status": "completed",
      "createdAt": "2025-01-24T14:30:00Z",
      "endedAt": "2025-01-24T14:35:00Z"
    }
  ]
}
```

### Credit Management

The credit management system allows you to manage player balances independently of game sessions.

#### Load Credits

Add credits to a player's account.

**Endpoint:** `POST /api/game/credits/load`

**Headers:**
```
X-API-Key: your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "externalPlayerId": "player123",
  "amount": 50.00,
  "reference": "deposit_12345",
  "metadata": {
    "source": "stripe",
    "transactionId": "ch_abc123"
  }
}
```

**Parameters:**
- `externalPlayerId` (required): Your platform's player ID
- `amount` (required): Amount to add (positive decimal)
- `reference` (optional): External reference ID
- `metadata` (optional): Additional transaction data

**Response:**
```json
{
  "success": true,
  "externalPlayerId": "player123",
  "balanceBefore": "100.00",
  "balanceAfter": "150.00",
  "amountLoaded": "50.00",
  "transaction": {
    "id": 456,
    "type": "load",
    "createdAt": "2025-01-24T10:30:00Z"
  }
}
```

#### Redeem Credits

Withdraw credits from a player's account.

**Endpoint:** `POST /api/game/credits/redeem`

**Headers:**
```
X-API-Key: your_api_key_here
Content-Type: application/json
```

**Request Body:**
```json
{
  "externalPlayerId": "player123",
  "amount": 25.00,
  "reference": "withdrawal_67890",
  "metadata": {
    "destination": "bank_account",
    "requestId": "req_xyz789"
  }
}
```

**Response:**
```json
{
  "success": true,
  "externalPlayerId": "player123",
  "balanceBefore": "150.00",
  "balanceAfter": "125.00",
  "amountRedeemed": "25.00",
  "transaction": {
    "id": 457,
    "type": "redeem",
    "createdAt": "2025-01-24T10:35:00Z"
  }
}
```

#### Get Credit Balance

Check a player's current credit balance.

**Endpoint:** `GET /api/game/credits/balance/:playerId`

**Headers:**
```
X-API-Key: your_api_key_here
```

**Response:**
```json
{
  "externalPlayerId": "player123",
  "balance": "125.00",
  "createdAt": "2025-01-24T08:00:00Z",
  "updatedAt": "2025-01-24T10:35:00Z"
}
```

#### Get Transaction History

Retrieve a player's credit transaction history.

**Endpoint:** `GET /api/game/credits/transactions/:playerId`

**Headers:**
```
X-API-Key: your_api_key_here
```

**Query Parameters:**
- `limit` (optional): Number of transactions (default: 50, max: 200)

**Response:**
```json
{
  "externalPlayerId": "player123",
  "currentBalance": "125.00",
  "transactions": [
    {
      "id": 457,
      "type": "redeem",
      "amount": "25.00",
      "balanceBefore": "150.00",
      "balanceAfter": "125.00",
      "reference": "withdrawal_67890",
      "metadata": {
        "destination": "bank_account"
      },
      "createdAt": "2025-01-24T10:35:00Z"
    },
    {
      "id": 456,
      "type": "load",
      "amount": "50.00",
      "balanceBefore": "100.00",
      "balanceAfter": "150.00",
      "reference": "deposit_12345",
      "createdAt": "2025-01-24T10:30:00Z"
    }
  ]
}
```

## Multiple Session Support

The API fully supports multiple concurrent sessions per API key. Each session is identified by a unique `sessionToken` and can be tracked independently.

**Best Practices:**
- Create separate sessions for each player/game instance
- Use `externalPlayerId` to track sessions by player
- Filter sessions by status to find active games
- Use the analytics endpoints to monitor all sessions

**Example: Managing Multiple Players**
```javascript
// Create sessions for multiple players
const player1Session = await createGameSession('player1', 'Alice', 100, '2');
const player2Session = await createGameSession('player2', 'Bob', 50, '1');

// Later, list all active sessions
const activeSessions = await axios.get(
  `${GAME_API_URL}/sessions?status=active&limit=100`,
  { headers: { 'X-API-Key': API_KEY } }
);

// Get specific player's sessions
const player1Sessions = await axios.get(
  `${GAME_API_URL}/sessions?playerId=player1`,
  { headers: { 'X-API-Key': API_KEY } }
);
```

## Webhook Events Reference

### Existing Events

#### game.started
Triggered when a new session is created.

#### game.ended
Triggered when a session completes.

#### prize.won
Triggered when a player wins a prize.

### New Gameplay Events

#### gameplay.block_placed
Triggered when tracking a block placement event.

**Payload:**
```json
{
  "sessionId": 1,
  "sessionToken": "a1b2c3d4...",
  "externalPlayerId": "player123",
  "playerName": "John Doe",
  "eventType": "block_placed",
  "data": {
    "row": 5,
    "columns": 2,
    "score": 150,
    "combo": 3
  },
  "timestamp": "2025-01-24T10:30:15Z"
}
```

#### gameplay.combo_started
Triggered when a combo streak begins.

#### gameplay.combo_broken
Triggered when a combo streak ends.

#### gameplay.milestone_reached
Triggered when player reaches specific rows.

## Support

For technical support or to request an API key, contact your system administrator.
