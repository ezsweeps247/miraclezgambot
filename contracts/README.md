# BUUNIX1155 NFT Contract

ERC-1155 multi-token NFT contract with minter authorization and soulbound token support.

## Features

- **Minter Authorization**: Only authorized addresses can mint tokens
- **Soulbound Tokens**: Mark specific token IDs as non-transferable (account-bound)
- **Gas Optimized**: Minimal dependencies for lower deployment and transaction costs
- **OpenZeppelin Standards**: Built on audited, battle-tested contracts

## Deployment

### Prerequisites

1. Set environment variables in `.env`:
```bash
RPC_URL=https://sepolia.base.org
OPERATOR_PRIVATE_KEY=0x...your-private-key
NFT_BASE_URI=https://miraclezgaming.com/api/nft/metadata/
```

### Deploy to Base Sepolia

```bash
npm run deploy:sepolia
```

This will:
1. Deploy the BUUNIX1155 contract
2. Output the contract address
3. Provide next steps for configuration

### Set Minter After Deployment

Add the contract address to `.env`:
```bash
CONTRACT_ADDRESS=0x...deployed-address
```

Then run:
```bash
npm run nft:set-minter
```

This authorizes your operator address to mint NFTs.

## Token IDs

- **1**: First Win Achievement (soulbound)
- **2**: High Roller Badge (soulbound)
- **10-50**: Game-specific NFTs (Fundora Blox Master, Dice Champion, etc.)
- **51-59**: VIP Tier Badges (Bronze, Silver, Gold, Diamond) (soulbound)
- **100+**: Event Tickets and Limited Edition NFTs (transferable)

## Contract Methods

### Owner Functions

- `setURI(string memory base)` - Update base URI
- `setSoulbound(uint256 id, bool enabled)` - Mark token as soulbound
- `setMinter(address a, bool enabled)` - Authorize/revoke minter

### Minter Functions

- `mint(address to, uint256 id, uint256 amount, bytes calldata data)` - Mint tokens

### View Functions

- `soulbound(uint256 id)` - Check if token is soulbound
- `minters(address a)` - Check if address is authorized minter
- `balanceOf(address account, uint256 id)` - Get token balance

## Soulbound Configuration

After deployment, mark soulbound token IDs:

```typescript
// Achievement badges (non-transferable)
contract.setSoulbound(1, true);  // First Win
contract.setSoulbound(2, true);  // High Roller

// VIP tiers (account-bound)
contract.setSoulbound(51, true); // Bronze VIP
contract.setSoulbound(52, true); // Silver VIP
contract.setSoulbound(53, true); // Gold VIP
contract.setSoulbound(54, true); // Diamond VIP
```

## Network Support

Currently configured for Base Sepolia testnet. To add other networks, edit `hardhat.config.ts`:

```typescript
networks: {
  baseSepolia: { url: process.env.RPC_URL!, accounts: [process.env.OPERATOR_PRIVATE_KEY!] },
  // Add more networks here
}
```
