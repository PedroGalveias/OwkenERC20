// SPDX-License-Identifier: GPLv3
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";

contract Owken is ERC20Upgradeable {
    /**
     * @dev Constructor that gives _msgSender() all of existing tokens.
     */
    function initialize() public initializer {
        // Inits ERC20
        __ERC20_init("Owken", "OAK");

        // Mints all tokens and gives all to msg.sender(_sudo)
        // Total supply = 10000000000000000000000000 == 1e25
        _mint(msg.sender, 1e25);
    }
}
