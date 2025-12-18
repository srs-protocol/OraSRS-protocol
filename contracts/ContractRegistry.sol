// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title ContractRegistry
 * @dev A registry to store and update contract addresses.
 *      This allows clients to query a single fixed address to find the current
 *      addresses of all other contracts in the system.
 */
contract ContractRegistry is Ownable {
    // Mapping from contract name to address
    mapping(string => address) public contracts;

    // Event emitted when an address is updated
    event AddressUpdated(string indexed name, address indexed newAddress);

    constructor() Ownable(msg.sender) {}

    /**
     * @dev Update the address of a contract.
     * @param name The name of the contract.
     * @param newAddress The new address of the contract.
     */
    function updateAddress(string memory name, address newAddress) public onlyOwner {
        contracts[name] = newAddress;
        emit AddressUpdated(name, newAddress);
    }

    /**
     * @dev Get the address of a contract.
     * @param name The name of the contract.
     * @return The address of the contract.
     */
    function getContractAddress(string memory name) public view returns (address) {
        return contracts[name];
    }

    /**
     * @dev Batch update addresses.
     * @param names Array of contract names.
     * @param addresses Array of contract addresses.
     */
    function updateAddresses(string[] memory names, address[] memory addresses) public onlyOwner {
        require(names.length == addresses.length, "Arrays length mismatch");
        for (uint256 i = 0; i < names.length; i++) {
            contracts[names[i]] = addresses[i];
            emit AddressUpdated(names[i], addresses[i]);
        }
    }
}
