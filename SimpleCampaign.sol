// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract SimpleCampaign {
    address public owner;
    uint256 public goal;
    uint256 public deadline;
    uint256 public totalRaised;
    bool public withdrawn;
    mapping(address => uint256) public donations;

    event Donated(address indexed donor, uint256 amount);
    event Refunded(address indexed donor, uint256 amount);
    event Withdrawn(address indexed owner, uint256 amount);

    constructor(uint256 _goal, uint256 _durationSeconds) {
        owner = msg.sender;
        goal = _goal;
        deadline = block.timestamp + _durationSeconds;
    }

    function donate() external payable {
        require(block.timestamp < deadline, "Het han");
        require(msg.value > 0, "So tien phai > 0");
        donations[msg.sender] += msg.value;
        totalRaised += msg.value;
        emit Donated(msg.sender, msg.value);
    }

    function refund() external {
        require(block.timestamp >= deadline, "Chua het han");
        require(totalRaised < goal, "Da dat muc tieu");
        uint256 amount = donations[msg.sender];
        require(amount > 0, "Khong co tien de hoan");
        donations[msg.sender] = 0;
        (bool ok, ) = msg.sender.call{value: amount}("");
        require(ok, "Chuyen tien that bai");
        emit Refunded(msg.sender, amount);
    }

    function withdraw() external {
        require(msg.sender == owner, "Khong phai chu chien dich");
        require(totalRaised >= goal, "Chua dat muc tieu");
        require(!withdrawn, "Da rut");
        withdrawn = true;
        uint256 amount = address(this).balance;
        (bool ok, ) = owner.call{value: amount}("");
        require(ok, "Chuyen tien that bai");
        emit Withdrawn(owner, amount);
    }
}