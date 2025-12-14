// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title GlobalWhitelist
 * @dev A contract to manage whitelisted IPs that should never be flagged as threats.
 */
contract GlobalWhitelist is Ownable {
    // Mapping from IP string to boolean
    mapping(string => bool) public whitelist;

    // Event emitted when an IP is added to whitelist
    event WhitelistAdded(string indexed ip);

    // Event emitted when an IP is removed from whitelist
    event WhitelistRemoved(string indexed ip);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Add an IP to the whitelist.
     * @param ip The IP address to whitelist.
     */
    function addToWhitelist(string memory ip) public onlyOwner {
        whitelist[ip] = true;
        emit WhitelistAdded(ip);
    }

    /**
     * @dev Remove an IP from the whitelist.
     * @param ip The IP address to remove.
     */
    function removeFromWhitelist(string memory ip) public onlyOwner {
        whitelist[ip] = false;
        emit WhitelistRemoved(ip);
    }

    /**
     * @dev Check if an IP is whitelisted.
     * @param ip The IP address to check.
     * @return True if the IP is whitelisted, false otherwise.
     */
    function isWhitelisted(string memory ip) public view returns (bool) {
        return whitelist[ip];
    }

    /**
     * @dev Batch add IPs to whitelist.
     * @param ips Array of IP addresses.
     */
    function batchAddToWhitelist(string[] memory ips) public onlyOwner {
        for (uint256 i = 0; i < ips.length; i++) {
            whitelist[ips[i]] = true;
            emit WhitelistAdded(ips[i]);
        }
    }
}
