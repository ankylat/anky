pragma solidity >=0.8.25;

import "../base/SecurityManager.sol";
import "./GameToken.sol";

contract DegenBridge is SecurityManager {
    GameToken public immutable aether;
    GameToken public immutable lumina;
    GameToken public immutable terra;
    
    mapping(bytes32 => bool) public processedNonces;
    uint256 public constant MAX_MINT_AMOUNT = 1000000 * 1e18; // Safety limit
    
    event TokensMinted(address indexed user, string tokenType, uint256 amount, bytes32 nonce);
    event TokensBurned(address indexed user, string tokenType, uint256 amount, bytes32 nonce);
    
    constructor() {
        aether = new GameToken("Aether", "AETH", 1000, address(this));
        lumina = new GameToken("Lumina", "LUM", 250, address(this));
        terra = new GameToken("Terra", "TERRA", 100, address(this));
    }
    
    function mintGameTokens(
        address user,
        uint256 newenAmount,
        string memory tokenType,
        bytes32 nonce,
        bytes[] memory signatures
    ) external nonReentrant whenNotPaused {
        require(!processedNonces[nonce], "Nonce used");
        require(signatures.length >= VALIDATION_THRESHOLD, "Insufficient signatures");
        
        bytes32 message = keccak256(abi.encodePacked(user, newenAmount, tokenType, nonce));
        address[] memory validators = validateSignatures(message, signatures);
        
        for (uint i = 0; i < validators.length; i++) {
            require(hasRole(VALIDATOR, validators[i]), "Invalid validator");
        }
        
        processedNonces[nonce] = true;
        GameToken token = getToken(tokenType);
        uint256 gameTokenAmount = (newenAmount * 1e18) / token.newenValue();
        require(gameTokenAmount <= MAX_MINT_AMOUNT, "Amount too large");
        
        token.mint(user, gameTokenAmount);
        emit TokensMinted(user, tokenType, gameTokenAmount, nonce);
    }
    
    function bridgeBack(string memory tokenType, uint256 amount) 
        external 
        nonReentrant 
        whenNotPaused 
    {
        GameToken token = getToken(tokenType);
        uint256 newenAmount = (amount * token.newenValue()) / 1e18;
        
        token.burn(msg.sender, amount);
        bytes32 nonce = keccak256(abi.encodePacked(
            msg.sender,
            amount,
            tokenType,
            block.timestamp
        ));
        
        emit TokensBurned(msg.sender, tokenType, amount, nonce);
    }
    
    function getToken(string memory tokenType) 
        internal view returns (GameToken) 
    {
        if (keccak256(bytes(tokenType)) == keccak256(bytes("aether"))) {
            return aether;
        } else if (keccak256(bytes(tokenType)) == keccak256(bytes("lumina"))) {
            return lumina;
        } else if (keccak256(bytes(tokenType)) == keccak256(bytes("terra"))) {
            return terra;
        }
        revert("Invalid token type");
    }
    
    // Signature validation functions similar to BaseBridge
}