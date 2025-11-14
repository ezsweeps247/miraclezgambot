// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BUUNIX1155 is ERC1155, Ownable {
    mapping(uint256 => bool) public soulbound;     // tokenId => isSoulbound
    mapping(address => bool) public minters;       // server signers / relayers

    event Minted(address indexed to, uint256 indexed id, uint256 amount);
    event SoulboundSet(uint256 indexed id, bool enabled);
    event MinterSet(address indexed minter, bool enabled);

    constructor(string memory base) ERC1155(base) Ownable(msg.sender) {}

    function setURI(string memory base) external onlyOwner { _setURI(base); }
    function setSoulbound(uint256 id, bool enabled) external onlyOwner { soulbound[id] = enabled; emit SoulboundSet(id, enabled); }
    function setMinter(address a, bool enabled) external onlyOwner { minters[a] = enabled; emit MinterSet(a, enabled); }

    // server-authorized mint
    function mint(address to, uint256 id, uint256 amount, bytes calldata data) external {
        require(minters[msg.sender], "not minter");
        _mint(to, id, amount, data);
        emit Minted(to, id, amount);
    }

    // soulbound: block non-owner transfers for flagged ids
    function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes memory data)
        public override
    {
        require(!soulbound[id] || from == address(0), "soulbound");
        super.safeTransferFrom(from, to, id, amount, data);
    }
    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory amounts, bytes memory data)
        public override
    {
        for (uint i=0;i<ids.length;i++){ require(!soulbound[ids[i]] || from==address(0), "soulbound"); }
        super.safeBatchTransferFrom(from, to, ids, amounts, data);
    }
}
