import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract SecurityManager is ReentrancyGuard, Pausable, AccessControl {
    bytes32 public constant BRIDGE_OPERATOR = keccak256("BRIDGE_OPERATOR");
    bytes32 public constant VALIDATOR = keccak256("VALIDATOR");
    uint256 public constant VALIDATION_THRESHOLD = 3;
    
    mapping(bytes32 => uint256) public validationCount;
    mapping(bytes32 => mapping(address => bool)) public hasValidated;
    mapping(bytes32 => bool) public isValidated;
    
    event ValidationAdded(bytes32 indexed operationId, address validator);
    event OperationValidated(bytes32 indexed operationId);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BRIDGE_OPERATOR, msg.sender);
    }
    
    modifier onlyValidated(bytes32 operationId) {
        require(isValidated[operationId], "Operation not validated");
        _;
    }
    
    function addValidation(bytes32 operationId) external {
        require(hasRole(VALIDATOR, msg.sender), "Not a validator");
        require(!hasValidated[operationId][msg.sender], "Already validated");
        
        hasValidated[operationId][msg.sender] = true;
        validationCount[operationId]++;
        
        emit ValidationAdded(operationId, msg.sender);
        
        if (validationCount[operationId] >= VALIDATION_THRESHOLD) {
            isValidated[operationId] = true;
            emit OperationValidated(operationId);
        }
    }
}