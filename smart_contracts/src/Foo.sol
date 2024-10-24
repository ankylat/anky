// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// Base Layer Contract (L2)
contract BaseVault is ReentrancyGuard, Ownable {
    IERC20 public newenToken;
    mapping(address => uint256) public lockedBalances;
    mapping(bytes32 => bool) public processedNonces;
    
    event TokensLocked(address indexed user, uint256 amount, bytes32 nonce);
    event TokensUnlocked(address indexed user, uint256 amount, bytes32 nonce);
    
    constructor(address _newenToken) {
        newenToken = IERC20(_newenToken);
    }
    
    function lockTokens(uint256 amount) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(newenToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        bytes32 nonce = keccak256(abi.encodePacked(msg.sender, amount, block.timestamp));
        lockedBalances[msg.sender] += amount;
        processedNonces[nonce] = true;
        
        emit TokensLocked(msg.sender, amount, nonce);
    }
    
    function unlockTokens(uint256 amount, bytes32 nonce, bytes memory signature) external nonReentrant {
        require(verifyUnlock(msg.sender, amount, nonce, signature), "Invalid signature");
        require(lockedBalances[msg.sender] >= amount, "Insufficient locked balance");
        require(!processedNonces[nonce], "Nonce already processed");
        
        lockedBalances[msg.sender] -= amount;
        processedNonces[nonce] = true;
        require(newenToken.transfer(msg.sender, amount), "Transfer failed");
        
        emit TokensUnlocked(msg.sender, amount, nonce);
    }
    
    function verifyUnlock(address user, uint256 amount, bytes32 nonce, bytes memory signature) 
        internal view returns (bool)
    {
        bytes32 message = keccak256(abi.encodePacked(user, amount, nonce));
        // Verification logic here
        return true; // Simplified for example
    }
}