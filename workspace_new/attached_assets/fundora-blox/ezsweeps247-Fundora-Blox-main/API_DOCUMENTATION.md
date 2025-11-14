# FUNDORA BLOX Points Redemption API

Complete API documentation for integrating point redemption in your host application.

## Overview

The FUNDORA BLOX game provides a comprehensive points/credits system that allows players to:
- Earn bonus points by playing the game
- Redeem points for in-store products
- Track transaction history
- Manage player balances

## Authentication

All API requests require authentication via API Key. Include your API key in the request header:

```
Authorization: Bearer YOUR_API_KEY
```

### Getting an API Key

Contact your FUNDORA BLOX administrator to obtain an API key for your application.

---

## Points Redemption Endpoints

### 1. Redeem Points for Products

**Endpoint:** `POST /api/game/points/redeem`

Redeem a player's bonus points for in-store products.

**Request Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "externalPlayerId": "user123",
  "pointsAmount": 1000,
  "productId": "PRODUCT_SKU_001",
  "productName": "Premium Coffee",
  "productPrice": 5.99,
  "orderId": "ORDER_12345",
  "metadata": {
    "storeName": "Main Street Cafe",
    "storeId": "STORE_001",
    "redemptionMethod": "qr_code",
    "employeeId": "EMP_456"
  }
}
```

**Required Fields:**
- `externalPlayerId` (string) - Your app's unique player identifier
- `pointsAmount` (number) - Number of points to redeem
- `productId` (string) - SKU or unique product identifier
- `productName` (string) - Human-readable product name

**Optional Fields:**
- `productPrice` (number) - Product price for reference
- `orderId` (string) - Your order/transaction ID
- `metadata` (object) - Additional data (store info, redemption method, etc.)

**Success Response (200 OK):**
```json
{
  "success": true,
  "externalPlayerId": "user123",
  "pointsRedeemed": 1000,
  "balanceBefore": 5000,
  "balanceAfter": 4000,
  "redemption": {
    "transactionId": 123,
    "productId": "PRODUCT_SKU_001",
    "productName": "Premium Coffee",
    "orderId": "ORDER_12345",
    "redeemedAt": "2025-01-15T10:30:00.000Z"
  }
}
```

**Error Responses:**

```json
// Insufficient Points (400 Bad Request)
{
  "error": "Insufficient points",
  "message": "Player has 500 points but attempting to redeem 1000 points",
  "currentBalance": 500,
  "attemptedAmount": 1000
}

// Missing Fields (400 Bad Request)
{
  "error": "Missing required field",
  "message": "externalPlayerId is required"
}

// Unauthorized (401 Unauthorized)
{
  "error": "Unauthorized",
  "message": "Invalid or missing API key"
}
```

---

### 2. Check Points Balance

**Endpoint:** `GET /api/game/points/balance/:playerId`

Get a player's current points balance.

**Request Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**URL Parameters:**
- `playerId` - Your app's unique player identifier

**Example Request:**
```
GET /api/game/points/balance/user123
```

**Success Response (200 OK):**
```json
{
  "externalPlayerId": "user123",
  "pointsBalance": 5000,
  "lastUpdated": "2025-01-15T10:25:00.000Z"
}
```

---

### 3. Award Points to Player

**Endpoint:** `POST /api/game/points/award`

Award bonus points to a player (for achievements, promotions, etc.).

**Request Headers:**
```
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

**Request Body:**
```json
{
  "externalPlayerId": "user123",
  "pointsAmount": 500,
  "reason": "Welcome bonus",
  "metadata": {
    "campaign": "new_user_2025",
    "source": "mobile_app"
  }
}
```

**Required Fields:**
- `externalPlayerId` (string) - Player identifier
- `pointsAmount` (number) - Points to award (must be positive)

**Optional Fields:**
- `reason` (string) - Description of why points were awarded
- `metadata` (object) - Additional tracking data

**Success Response (200 OK):**
```json
{
  "success": true,
  "externalPlayerId": "user123",
  "pointsAwarded": 500,
  "balanceBefore": 5000,
  "balanceAfter": 5500,
  "transaction": {
    "id": 124,
    "awardedAt": "2025-01-15T10:35:00.000Z"
  }
}
```

---

### 4. Get Points Transaction History

**Endpoint:** `GET /api/game/points/history/:playerId`

Retrieve a player's points transaction history.

**Request Headers:**
```
Authorization: Bearer YOUR_API_KEY
```

**URL Parameters:**
- `playerId` - Your app's unique player identifier

**Query Parameters:**
- `limit` (optional) - Maximum number of transactions (default: 50, max: 200)
- `type` (optional) - Filter by type: `redeem_points` or `award_points`

**Example Requests:**
```
GET /api/game/points/history/user123
GET /api/game/points/history/user123?limit=100
GET /api/game/points/history/user123?type=redeem_points&limit=20
```

**Success Response (200 OK):**
```json
{
  "externalPlayerId": "user123",
  "currentBalance": 4000,
  "transactions": [
    {
      "id": 123,
      "type": "redeem_points",
      "pointsAmount": 1000,
      "balanceBefore": 5000,
      "balanceAfter": 4000,
      "reference": "ORDER_12345",
      "metadata": {
        "type": "product_redemption",
        "productId": "PRODUCT_SKU_001",
        "productName": "Premium Coffee",
        "productPrice": 5.99,
        "storeName": "Main Street Cafe",
        "redeemedAt": "2025-01-15T10:30:00.000Z"
      },
      "createdAt": "2025-01-15T10:30:00.000Z"
    },
    {
      "id": 122,
      "type": "award_points",
      "pointsAmount": 500,
      "balanceBefore": 4500,
      "balanceAfter": 5000,
      "reference": "Welcome bonus",
      "metadata": {
        "reason": "Welcome bonus",
        "campaign": "new_user_2025",
        "awardedAt": "2025-01-15T09:00:00.000Z"
      },
      "createdAt": "2025-01-15T09:00:00.000Z"
    }
  ]
}
```

---

## Credit/Cash Management Endpoints

In addition to points, the system supports cash credit management:

### Load Credits

**Endpoint:** `POST /api/game/credits/load`

Add cash credits to a player's account (for playing paid games).

**Request Body:**
```json
{
  "externalPlayerId": "user123",
  "amount": 10.00,
  "reference": "PAYMENT_REF_789",
  "metadata": {
    "paymentMethod": "credit_card",
    "transactionId": "TXN_999"
  }
}
```

### Redeem Credits

**Endpoint:** `POST /api/game/credits/redeem`

Withdraw cash credits from a player's account.

**Request Body:**
```json
{
  "externalPlayerId": "user123",
  "amount": 5.00,
  "reference": "WITHDRAWAL_REF_101",
  "metadata": {
    "withdrawalMethod": "bank_transfer"
  }
}
```

### Get Credit Balance

**Endpoint:** `GET /api/game/credits/balance/:playerId`

Get player's cash credit balance.

### Get Credit Transactions

**Endpoint:** `GET /api/game/credits/transactions/:playerId`

Get player's cash transaction history.

---

## Integration Examples

### Node.js/Express Example

```javascript
const axios = require('axios');

const API_BASE_URL = 'https://your-fundora-blox-instance.com';
const API_KEY = 'your_api_key_here';

// Redeem points for a product
async function redeemPointsForProduct(playerId, productId, productName, pointsCost) {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/api/game/points/redeem`,
      {
        externalPlayerId: playerId,
        pointsAmount: pointsCost,
        productId: productId,
        productName: productName,
        orderId: `ORDER_${Date.now()}`,
        metadata: {
          storeName: 'My Store',
          redemptionMethod: 'pos_system'
        }
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Redemption successful:', response.data);
    return response.data;
  } catch (error) {
    if (error.response?.status === 400) {
      console.error('Insufficient points:', error.response.data);
    } else {
      console.error('Error redeeming points:', error);
    }
    throw error;
  }
}

// Check balance before redemption
async function checkAndRedeem(playerId, productId, productName, pointsCost) {
  try {
    // 1. Check balance first
    const balanceResponse = await axios.get(
      `${API_BASE_URL}/api/game/points/balance/${playerId}`,
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`
        }
      }
    );
    
    if (balanceResponse.data.pointsBalance < pointsCost) {
      console.log('Insufficient points');
      return { success: false, reason: 'insufficient_points' };
    }
    
    // 2. Redeem points
    const redemption = await redeemPointsForProduct(
      playerId,
      productId,
      productName,
      pointsCost
    );
    
    return { success: true, redemption };
  } catch (error) {
    console.error('Error in check and redeem:', error);
    return { success: false, reason: 'error' };
  }
}
```

### Python Example

```python
import requests

API_BASE_URL = 'https://your-fundora-blox-instance.com'
API_KEY = 'your_api_key_here'

def redeem_points(player_id, product_id, product_name, points_cost):
    """Redeem points for a product"""
    url = f'{API_BASE_URL}/api/game/points/redeem'
    headers = {
        'Authorization': f'Bearer {API_KEY}',
        'Content-Type': 'application/json'
    }
    payload = {
        'externalPlayerId': player_id,
        'pointsAmount': points_cost,
        'productId': product_id,
        'productName': product_name,
        'orderId': f'ORDER_{int(time.time())}',
        'metadata': {
            'storeName': 'My Store',
            'redemptionMethod': 'online'
        }
    }
    
    response = requests.post(url, json=payload, headers=headers)
    
    if response.status_code == 200:
        return response.json()
    elif response.status_code == 400:
        error_data = response.json()
        print(f"Error: {error_data['message']}")
        return None
    else:
        response.raise_for_status()

def get_points_balance(player_id):
    """Get player's points balance"""
    url = f'{API_BASE_URL}/api/game/points/balance/{player_id}'
    headers = {'Authorization': f'Bearer {API_KEY}'}
    
    response = requests.get(url, headers=headers)
    response.raise_for_status()
    return response.json()
```

---

## Best Practices

### 1. Always Check Balance First
```javascript
// Good practice
const balance = await getBalance(playerId);
if (balance.pointsBalance >= productCost) {
  await redeemPoints(playerId, productId, productCost);
}

// Also valid - API will handle the check
try {
  await redeemPoints(playerId, productId, productCost);
} catch (error) {
  if (error.response?.status === 400) {
    // Handle insufficient balance
  }
}
```

### 2. Use Meaningful Order IDs
```javascript
// Generate unique order IDs
const orderId = `ORDER_${storeId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
```

### 3. Include Comprehensive Metadata
```javascript
// Good metadata for audit trail
metadata: {
  storeName: "Downtown Location",
  storeId: "STORE_001",
  employeeId: "EMP_123",
  redemptionMethod: "qr_code",
  deviceId: "POS_TERMINAL_5",
  timestamp: new Date().toISOString()
}
```

### 4. Handle Errors Gracefully
```javascript
try {
  const result = await redeemPoints(playerId, productId, pointsCost);
  // Success - update your UI
} catch (error) {
  if (error.response?.status === 400) {
    // Insufficient points - show friendly message
    showMessage("Not enough points for this product");
  } else if (error.response?.status === 401) {
    // Authentication error - check API key
    console.error("API key invalid or expired");
  } else {
    // Other errors - retry or log
    console.error("Unexpected error:", error);
  }
}
```

### 5. Transaction History for Reconciliation
```javascript
// Regular reconciliation check
const history = await getPointsHistory(playerId, { type: 'redeem_points', limit: 100 });
const totalRedeemed = history.transactions.reduce(
  (sum, tx) => sum + tx.pointsAmount, 
  0
);
```

---

## Security Considerations

1. **API Key Management**
   - Never expose API keys in client-side code
   - Rotate API keys regularly
   - Use environment variables for key storage

2. **Player ID Validation**
   - Always validate player IDs before making API calls
   - Use your own authentication before allowing redemptions

3. **Transaction Verification**
   - Store transaction IDs for reconciliation
   - Implement idempotency for retry scenarios
   - Monitor for suspicious redemption patterns

4. **Rate Limiting**
   - Implement rate limiting on your side
   - Handle API rate limit responses gracefully

---

## Support

For technical support or API key requests, contact:
- Email: support@fundorablox.com
- Documentation: https://docs.fundorablox.com

## Changelog

- **v1.0.0** (2025-01-15): Initial release with points redemption API
