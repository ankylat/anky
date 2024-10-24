contract BaseBridge is SecurityManager {
    INewen public immutable newen;
    uint256 public constant TIMELOCK_DURATION = 6 hours;
    
    struct BridgeOperation {
        address user;
        uint256 amount;
        uint256 timestamp;
        bool executed;
    }
    
    mapping(bytes32 => BridgeOperation) public operations;
    mapping(bytes32 => bool) public processedNonces;
    
    event OperationInitiated(bytes32 indexed operationId, address user, uint256 amount);
    event TokensLocked(address indexed user, uint256 amount, bytes32 nonce);
    event TokensUnlocked(address indexed user, uint256 amount, bytes32 nonce);
    
    constructor(address _newen) {
        newen = INewen(_newen);
    }
    
    function initiateTransfer(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Invalid amount");
        require(newen.transferFrom(msg.sender, address(this), amount), "Transfer failed");
        
        bytes32 operationId = keccak256(abi.encodePacked(
            msg.sender,
            amount,
            block.timestamp,
            "LOCK"
        ));
        
        operations[operationId] = BridgeOperation({
            user: msg.sender,
            amount: amount,
            timestamp: block.timestamp,
            executed: false
        });
        
        emit OperationInitiated(operationId, msg.sender, amount);
    }
    
    function executeTransfer(bytes32 operationId) 
        external 
        nonReentrant 
        whenNotPaused 
        onlyValidated(operationId) 
    {
        BridgeOperation storage operation = operations[operationId];
        require(!operation.executed, "Already executed");
        require(
            block.timestamp >= operation.timestamp + TIMELOCK_DURATION,
            "Timelock active"
        );
        
        operation.executed = true;
        bytes32 nonce = keccak256(abi.encodePacked(
            operation.user,
            operation.amount,
            block.timestamp
        ));
        processedNonces[nonce] = true;
        
        emit TokensLocked(operation.user, operation.amount, nonce);
    }
    
    function unlockTokens(
        address user,
        uint256 amount,
        bytes32 nonce,
        bytes[] memory signatures
    ) external nonReentrant whenNotPaused {
        require(!processedNonces[nonce], "Nonce used");
        require(signatures.length >= VALIDATION_THRESHOLD, "Insufficient signatures");
        
        bytes32 message = keccak256(abi.encodePacked(user, amount, nonce));
        address[] memory validators = validateSignatures(message, signatures);
        
        for (uint i = 0; i < validators.length; i++) {
            require(hasRole(VALIDATOR, validators[i]), "Invalid validator");
        }
        
        processedNonces[nonce] = true;
        require(newen.transfer(user, amount), "Transfer failed");
        
        emit TokensUnlocked(user, amount, nonce);
    }
    
    function validateSignatures(bytes32 message, bytes[] memory signatures)
        internal pure returns (address[] memory)
    {
        address[] memory validators = new address[](signatures.length);
        
        for (uint i = 0; i < signatures.length; i++) {
            address recoveredAddress = recoverSigner(message, signatures[i]);
            for (uint j = 0; j < i; j++) {
                require(recoveredAddress != validators[j], "Duplicate validator");
            }
            validators[i] = recoveredAddress;
        }
        
        return validators;
    }
    
    function recoverSigner(bytes32 message, bytes memory signature)
        internal pure returns (address)
    {
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        return ecrecover(message, v, r, s);
    }
}