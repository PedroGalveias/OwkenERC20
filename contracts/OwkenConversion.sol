// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

import "./OwkenTimelock.sol";

contract OwkenConversion is AccessControl {
    // *** Usings ***
    using SafeERC20 for IERC20;
    using Address for address;

    // *** Mappings ***
    mapping(address => uint256) private _balanceDirect;
    mapping(address => uint256) private _balanceReferral;
    mapping(address => uint256) private _balancePurchase;

    // *** Roles ***
    // Create a new role identifier for the crowdsale role
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");

    // *** Variables ***
    IERC20 private _token;
    address private _tokenAddress;
    OwkenTimelock private _timelock;
    address private _timelockAddress;
    uint256 private immutable _openingTime;
    uint256 private immutable _closingTime;

    // *** Events ***
    event depositedSuccess(address beneficiary, uint256 amount);
    event withdrawSuccess(address beneficiary, uint256 amount);

    /**
     * @dev Constructs the contract
     */
    constructor(
        address token,
        address timelock,
        uint256 openingTime,
        uint256 closingTime
    ) {
        require(
            openingTime >= block.timestamp,
            "ERROR_CONVERSION: Opening time is before current time"
        );
        require(
            closingTime > openingTime,
            "ERROR_CONVERSION: Opening time is not before closing time"
        );
        require(
            timelock.isContract(),
            "ERROR_CONVERSION: Not a contract address"
        );
        require(token.isContract(), "ERROR_CONVERSION: Not a contract address");

        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _setupRole(OPERATOR_ROLE, msg.sender);
        _token = IERC20(token);
        _tokenAddress = token;
        _timelock = OwkenTimelock(timelock);
        _timelockAddress = timelock;
        _openingTime = openingTime;
        _closingTime = closingTime;
    }

    function depositDirectReferral(
        address _beneficiary,
        uint256 _amountDirect,
        uint256 _amountReferral
    ) public returns (bool success) {
        require(
            _beneficiary != address(0),
            "ERROR_CONVERSION: Invalid address"
        );
        require(
            _amountDirect > 0 && _amountReferral > 0,
            "ERROR_CONVERSION: Invalid amount"
        );
        require(
            hasRole(OPERATOR_ROLE, msg.sender),
            "ERROR_CONVERSION: Caller is not a operator"
        );
        require(isOpen(), "ERROR_CONVERSION: Not open");

        return
            depositDirect(_beneficiary, _amountDirect) &&
            depositReferral(_beneficiary, _amountReferral);
    }

    function depositDirectPurchase(
        address _beneficiary,
        uint256 _amountDirect,
        uint256 _amountPurchase
    ) public returns (bool success) {
        require(
            _beneficiary != address(0),
            "ERROR_CONVERSION: Invalid address"
        );
        require(
            _amountDirect > 0 && _amountPurchase > 0,
            "ERROR_CONVERSION: Invalid amount"
        );
        require(
            hasRole(OPERATOR_ROLE, msg.sender),
            "ERROR_CONVERSION: Caller is not a operator"
        );
        require(isOpen(), "ERROR_CONVERSION: Not open");

        return
            depositDirect(_beneficiary, _amountDirect) &&
            depositPurchase(_beneficiary, _amountPurchase);
    }

    function depositReferralPurchase(
        address _beneficiary,
        uint256 _amountReferral,
        uint256 _amountPurchase
    ) public returns (bool success) {
        require(
            _beneficiary != address(0),
            "ERROR_CONVERSION: Invalid address"
        );
        require(
            _amountReferral > 0 && _amountPurchase > 0,
            "ERROR_CONVERSION: Invalid amount"
        );
        require(
            hasRole(OPERATOR_ROLE, msg.sender),
            "ERROR_CONVERSION: Caller is not a operator"
        );
        require(isOpen(), "ERROR_CONVERSION: Not open");

        return
            depositReferral(_beneficiary, _amountReferral) &&
            depositPurchase(_beneficiary, _amountPurchase);
    }

    function depositDirectReferralPurchase(
        address _beneficiary,
        uint256 _amountDirect,
        uint256 _amountReferral,
        uint256 _amountPurchase
    ) public returns (bool success) {
        require(
            _beneficiary != address(0),
            "ERROR_CONVERSION: Invalid address"
        );
        require(
            _amountDirect > 0 && _amountReferral > 0 && _amountPurchase > 0,
            "ERROR_CONVERSION: Invalid amount"
        );
        require(
            hasRole(OPERATOR_ROLE, msg.sender),
            "ERROR_CONVERSION: Caller is not a operator"
        );
        require(isOpen(), "ERROR_CONVERSION: Not open");

        return
            depositDirect(_beneficiary, _amountDirect) &&
            depositReferral(_beneficiary, _amountReferral) &&
            depositPurchase(_beneficiary, _amountPurchase);
    }

    /*
     * @dev Deposit direct offers
     */
    function depositDirect(address _beneficiary, uint256 _value)
        public
        returns (bool success)
    {
        require(
            _beneficiary != address(0),
            "ERROR_CONVERSION: Invalid address"
        );
        require(isOpen(), "ERROR_CONVERSION: Not open");
        require(
            hasRole(OPERATOR_ROLE, msg.sender),
            "ERROR_CONVERSION: Caller is not a operator"
        );
        require(_value > 0, "ERROR_CONVERSION: Invalid amount");

        _token.safeTransferFrom(msg.sender, address(this), _value);

        _balanceDirect[_beneficiary] += _value;
        emit depositedSuccess(_beneficiary, _value);
        return true;
    }

    /**
     * @dev Deposit referral offers
     */
    function depositReferral(address _beneficiary, uint256 _value)
        public
        returns (bool success)
    {
        require(
            _beneficiary != address(0),
            "ERROR_CONVERSION: Invalid address"
        );
        require(isOpen(), "ERROR_CONVERSION: Not open");
        require(
            hasRole(OPERATOR_ROLE, msg.sender),
            "ERROR_CONVERSION: Caller is not a operator"
        );
        require(_value > 0, "ERROR_CONVERSION: Invalid amount");

        _token.safeTransferFrom(msg.sender, address(this), _value);

        _balanceReferral[_beneficiary] += _value;

        emit depositedSuccess(_beneficiary, _value);

        return true;
    }

    /**
     * @dev Deposit purchases
     */
    function depositPurchase(address _beneficiary, uint256 _value)
        public
        returns (bool success)
    {
        require(
            _beneficiary != address(0),
            "ERROR_CONVERSION: Invalid address"
        );
        require(isOpen(), "ERROR_CONVERSION: Not open");
        require(
            hasRole(OPERATOR_ROLE, msg.sender),
            "ERROR_CONVERSION: Caller is not a operator"
        );
        require(_value > 0, "ERROR_CONVERSION: Invalid amount");

        _token.safeTransferFrom(msg.sender, address(this), _value);

        _balancePurchase[_beneficiary] += _value;

        emit depositedSuccess(_beneficiary, _value);

        return true;
    }

    function withdraw(address _beneficiary) public returns (bool success) {
        require(hasClosed(), "ERROR_CONVERSION: Offers not closed");
        bool direct = withdrawDirect(_beneficiary);
        bool referral = withdrawReferral(_beneficiary);
        bool purchase = withdrawPurchase(_beneficiary);
        return direct || referral || purchase;
    }

    /**
     * @dev Send direct offers to be locked
     */
    function withdrawDirect(address _beneficiary)
        public
        returns (bool success)
    {
        require(hasClosed(), "ERROR_CONVERSION: Offers not closed");

        uint256 balance = getBalanceDirect(_beneficiary);

        if (balance > 0) {
            _token.safeIncreaseAllowance(_timelockAddress, balance);
            require(_timelock.lockDirect(_beneficiary, balance));

            _balanceDirect[_beneficiary] = 0;

            emit withdrawSuccess(_beneficiary, balance);

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Send referral offers to be locked
     */
    function withdrawReferral(address _beneficiary)
        public
        returns (bool success)
    {
        require(hasClosed(), "ERROR_CONVERSION: Offers not closed");

        uint256 balance = getBalanceReferral(_beneficiary);

        if (balance > 0) {
            _token.safeIncreaseAllowance(_timelockAddress, balance);
            require(_timelock.lockReferral(_beneficiary, balance));

            _balanceReferral[_beneficiary] = 0;

            emit withdrawSuccess(_beneficiary, balance);

            return true;
        } else {
            return false;
        }
    }

    /**
     * @dev Send purchase to be locked
     */
    function withdrawPurchase(address _beneficiary)
        public
        returns (bool success)
    {
        require(hasClosed(), "ERROR_CONVERSION: Offers not closed");

        uint256 balance = getBalancePurchase(_beneficiary);

        if (balance > 0) {
            _token.safeIncreaseAllowance(_timelockAddress, balance);
            require(_timelock.lockPurchase(_beneficiary, balance));

            _balancePurchase[_beneficiary] = 0;

            emit withdrawSuccess(_beneficiary, balance);

            return true;
        } else {
            return false;
        }
    }

    function grantOperatorRole(address _account) public {
        // Grant the operator role to a specified account
        grantRole(OPERATOR_ROLE, _account);
    }

    function revokeOperatorRole(address _account) public {
        // Grant the operator role to a specified account
        revokeRole(OPERATOR_ROLE, _account);
    }

    /**
     * @dev See account's direct offers b_closingTime
     */
    function getBalanceDirect(address _account) public view returns (uint256) {
        return _balanceDirect[_account];
    }

    /**
     * @dev See account's referral offers balance
     * @return account's referral offer balance
     */
    function getBalanceReferral(address _account)
        public
        view
        returns (uint256)
    {
        return _balanceReferral[_account];
    }

    /**
     * @dev See account's purchase balance
     * @return account's purchase balance
     */
    function getBalancePurchase(address _account)
        public
        view
        returns (uint256)
    {
        return _balancePurchase[_account];
    }

    /**
     * @dev Disallow payments, in ether, to this contract directly
     */
    receive() external payable {
        revert();
    }

    function hasOperatorRole(address _account) public view returns (bool) {
        return hasRole(OPERATOR_ROLE, _account);
    }

    function getToken() public view returns (IERC20) {
        return _token;
    }

    /**
     * @return true if the offers is open, false otherwise.
     */
    function isOpen() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return
            block.timestamp >= _openingTime && block.timestamp <= _closingTime;
    }

    /**
     * @dev Checks whether the period in which the offers contract is open has already elapsed.
     * @return Whether offers period has elapsed
     */
    function hasClosed() public view returns (bool) {
        // solhint-disable-next-line not-rely-on-time
        return block.timestamp > _closingTime;
    }

    /**
     * @dev Gets contract openning time
     */
    function getOpeningTime() public view returns (uint256) {
        return _openingTime;
    }

    /**
     * @dev Gets contract closing time
     */
    function getClosingTime() public view returns (uint256) {
        return _closingTime;
    }
}
