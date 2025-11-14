// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

contract PlayerPass1155 is ERC1155, Ownable {
    using ECDSA for bytes32;

    string public name;
    string public symbol;
    mapping(address => bool) public trustedSigners; // backend signers for allow/achievement mints
    mapping(bytes32 => bool) public used;           // replay protection (salt)

    event TrustedSigner(address signer, bool active);

    constructor(
        string memory _name,
        string memory _symbol,
        string memory baseURI,
        address owner_
    ) ERC1155(baseURI) Ownable(owner_) {
        name = _name; symbol = _symbol;
    }

    function setURI(string memory newuri) external onlyOwner { _setURI(newuri); }

    function setTrustedSigner(address signer, bool active) external onlyOwner {
        trustedSigners[signer] = active;
        emit TrustedSigner(signer, active);
    }

    // EIP-712-like off-chain mint authorization (simple ECDSA)
    function mintWithSig(
        address to,
        uint256 id,
        uint256 amount,
        bytes32 salt,
        bytes calldata sig
    ) external {
        bytes32 digest = keccak256(abi.encodePacked(address(this), "MINT", to, id, amount, salt)).toEthSignedMessageHash();
        address signer = digest.recover(sig);
        require(trustedSigners[signer], "invalid signer");
        require(!used[salt], "salt used");
        used[salt] = true;
        _mint(to, id, amount, "");
    }

    function burn(address from, uint256 id, uint256 amount) external {
        require(from == msg.sender || isApprovedForAll(from, msg.sender), "not approved");
        _burn(from, id, amount);
    }
}
