// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract OwkenTimelock {
    // *** Usings ***
    using SafeERC20 for IERC20;
    using Address for address;

    // *** Structs ***
    struct TimelockStruct {
        address beneficiary;
        uint256 amount;
        uint256 releaseTime;
    }

    // *** Variables ***
    IERC20 private immutable _token;
    TimelockStruct[] public locks;

    // *** Events ***
    event LockedSuccessfully(
        address beneficiary,
        uint256 amount,
        uint256 releaseTime
    );
    event WithdrawSuccess(address beneficiary, uint256 amount);

    /**
     * @dev Constructs the contract and associates token to this contract
     */
    constructor(address token) {
        require(token.isContract(), "ERROR_TIMELOCK: Not a contract address");
        _token = IERC20(token);
    }

    /**
     * @dev Deposit/Lock tokens that were offered to users (Direct Offer)
     */
    function lockDirect(address _beneficiary, uint256 _amount)
        public
        returns (bool success)
    {
        require(_beneficiary != address(0), "ERROR_TIMELOCK: Invalid address");
        require(_amount > 0, "ERROR_TIMELOCK: Invalid amount");

        return lock(_beneficiary, _amount, 183 days);
    }

    /**
     * @dev Deposit/Lock tokens that were offered to users (Referral Offer)
     */
    function lockReferral(address _beneficiary, uint256 _amount)
        public
        returns (bool success)
    {
        require(_beneficiary != address(0), "ERROR_TIMELOCK: Invalid address");
        require(_amount > 0, "ERROR_TIMELOCK: Invalid amount");

        return lock(_beneficiary, _amount, 91 days);
    }

    /**
     * @dev Deposit/Lock tokens that were offered to users (Purchase)
     */
    function lockPurchase(address _beneficiary, uint256 _amount)
        public
        returns (bool success)
    {
        require(_beneficiary != address(0), "ERROR_TIMELOCK: Invalid address");
        require(_amount > 0, "ERROR_TIMELOCK: Invalid amount");

        return lock(_beneficiary, _amount, 365 days);
    }

    /**
     * @dev Deposit/Lock tokens (Generic)
     */
    function lock(
        address _beneficiary,
        uint256 _amount,
        uint256 _lockTime
    ) public returns (bool success) {
        require(_beneficiary != address(0), "ERROR_TIMELOCK: Invalid address");
        require(_amount > 0, "ERROR_TIMELOCK: Invalid amount");

        _token.safeTransferFrom(msg.sender, address(this), _amount);

        TimelockStruct memory newLock;
        newLock.beneficiary = _beneficiary;
        newLock.amount = _amount;
        newLock.releaseTime = block.timestamp + _lockTime;

        locks.push(newLock);

        emit LockedSuccessfully(_beneficiary, _amount, newLock.releaseTime);

        return true;
    }

    /**
     * @dev Withdraws tokens to the beneficiary
     */
    function withdraw(uint64 lockIndex) public {
        TimelockStruct storage _lock = locks[lockIndex];
        require(
            _lock.releaseTime < block.timestamp,
            "ERROR_TIMELOCK: Tokens are locked"
        );

        uint256 amount = _lock.amount;
        address beneficiary = _lock.beneficiary;

        _token.safeTransfer(beneficiary, amount);

        _deleteElement(lockIndex);

        emit WithdrawSuccess(beneficiary, amount);
    }

    function _deleteElement(uint64 index) internal {
        require(
            index < locks.length,
            "ERROR_TIMELOCK: This lock index does not exist"
        );

        for (uint64 i = index; i < locks.length - 1; i++) {
            if (!(locks[i + 1].beneficiary == address(0))) {
                locks[i] = locks[i + 1];
            } else {
                break;
            }
        }

        delete locks[locks.length - 1];
    }

    /**
     * @dev Gets all locks in the struct array
     */
    function getLocks() public view returns (TimelockStruct[] memory) {
        return locks;
    }

    function getLockedTokens(uint64 lockIndex)
        public
        view
        returns (uint256 amount)
    {
        TimelockStruct storage _lock = locks[lockIndex];
        uint256 tokenAmount = _lock.amount;
        return tokenAmount;
    }

    function getLockedTokensAddress(uint64 lockIndex)
        public
        view
        returns (address account)
    {
        TimelockStruct storage _lock = locks[lockIndex];
        address beneficiary = _lock.beneficiary;
        return beneficiary;
    }

    function getToken() public view returns (IERC20) {
        return _token;
    }

    function getLocksLength() public view returns (uint256) {
        return locks.length;
    }
}
