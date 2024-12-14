import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract GameToken is ERC20, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public immutable newenValue;
    
    constructor(
        string memory name,
        string memory symbol,
        uint256 _newenValue,
        address bridge
    ) ERC20(name, symbol) {
        newenValue = _newenValue;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, bridge);
    }
    
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }
    
    function burn(address from, uint256 amount) external onlyRole(MINTER_ROLE) {
        _burn(from, amount);
    }
}