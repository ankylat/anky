# Secure Multi-Chain Bridge System for Game Tokens

## Overview
This system enables secure bridging of NEWEN tokens between Base (L2) and Degen Chain (L3), with conversion to three game tokens: Aether, Lumina, and Terra. The system implements robust security measures including multi-signature validation, timelocks, and role-based access control.

## Token Economics
- NEWEN: Base token (deployed at 0xffe3CDC92F24988Be4f6F8c926758dcE490fe77E)
- Game Tokens (on Degen Chain):
  - Aether: 1000 NEWEN
  - Lumina: 250 NEWEN
  - Terra: 100 NEWEN

## Smart Contracts Architecture

### Base Chain
1. `BaseBridge.sol`
   - Manages NEWEN token locking/unlocking
   - Implements timelock mechanism
   - Handles multi-signature validation
   - Maintains operation registry

### Degen Chain
1. `GameToken.sol`
   - ERC20 implementation for game tokens
   - Role-based minting/burning
   - Value pegging to NEWEN

2. `DegenBridge.sol`
   - Manages game token minting/burning
   - Handles cross-chain validation
   - Maintains security thresholds

### Security Features
1. Multi-signature Validation
   - Requires 3 validator signatures
   - Prevents single point of failure
   - Signature deduplication

2. Timelock Mechanism
   - 6-hour delay on Base chain transfers
   - Allows for security intervention

3. Access Control
   - Role-based permissions
   - Validator registry
   - Bridge operator controls

4. Safety Measures
   - Reentrancy guards
   - Pausable functionality
   - Maximum mint limits
   - Nonce tracking
   - Event monitoring

## Deployment Process

### Prerequisites
- Node.js 14+
- Hardhat
- Private keys for validators
- NEWEN token contract address

### 1. Base Chain Deployment
```bash
# 1. Deploy BaseBridge
npx hardhat run scripts/deploy-base.js --network base

# 2. Set up validators
npx hardhat run scripts/setup-validators.js --network base
```

### 2. Degen Chain Deployment
```bash
# 1. Deploy DegenBridge (automatically deploys game tokens)
npx hardhat run scripts/deploy-degen.js --network degen

# 2. Set up validators
npx hardhat run scripts/setup-validators.js --network degen
```

### 3. Bridge Node Setup
```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with validator keys and RPC endpoints

# 3. Start bridge node
npm run bridge
```

## Configuration

### Environment Variables
```
BASE_RPC_URL=
DEGEN_RPC_URL=
VALIDATOR_PRIVATE_KEYS=
BASE_BRIDGE_ADDRESS=
DEGEN_BRIDGE_ADDRESS=
```

### Security Parameters
```solidity
VALIDATION_THRESHOLD=3
TIMELOCK_DURATION=6 hours
MAX_MINT_AMOUNT=1000000
```

## Usage Flow

### Lock NEWEN and Get Game Tokens
1. User approves NEWEN to BaseBridge
2. User calls `initiateTransfer()`
3. After timelock, validators sign
4. Bridge node detects event
5. Game tokens minted on Degen Chain

### Bridge Back to NEWEN
1. User calls `bridgeBack()`
2. Tokens burned on Degen Chain
3. Validators sign unlock
4. Bridge node processes
5. User receives NEWEN on Base

## Security Considerations

### Validator Management
- Use secure key storage
- Regular key rotation
- Multiple backup validators
- Geographic distribution

### Emergency Procedures
1. Pause Contracts
```javascript
await baseBridge.pause()
await degenBridge.pause()
```

2. Add/Remove Validators
```javascript
await bridge.grantRole(VALIDATOR_ROLE, newValidator)
await bridge.revokeRole(VALIDATOR_ROLE, oldValidator)
```

### Monitoring
1. Watch Events
- TokensLocked
- TokensUnlocked
- TokensMinted
- TokensBurned
- ValidationAdded
- OperationValidated

2. Health Checks
- Validator availability
- Bridge node status
- Gas levels
- Contract states

## Testing

### Local Testing
```bash
# Run tests
npx hardhat test

# Coverage report
npx hardhat coverage
```

### Test Networks
1. Deploy to testnets first
2. Verify contracts
3. Run integration tests
4. Monitor for 24-48 hours

## Maintenance

### Regular Tasks
1. Monitor validator performance
2. Check gas reserves
3. Verify timelock operations
4. Review bridge logs
5. Update validator set

### Upgrades
1. Deploy new contracts
2. Pause old contracts
3. Migrate state if needed
4. Verify new deployment
5. Resume operations

## Integration Guide

### For Game Developers
```javascript
// Example: Mint NFT with game tokens
const gameToken = await GameToken.at(tokenAddress);
await gameToken.approve(nftContract, amount);
await nftContract.mint(tokenId);
```

### For DeFi Integration
```javascript
// Example: Add liquidity
const router = await UniswapRouter.at(routerAddress);
await gameToken.approve(router, amount);
await router.addLiquidity(params);
```

## Support and Contact
- For technical issues: [GitHub Issues]
- For security concerns: [Security Email]
- For general inquiries: [Support Email]

## License
MIT License