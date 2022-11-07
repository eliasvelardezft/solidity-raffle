// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

error Raffle__NotEnoughETH();

contract Raffle {
	address payable[] private s_participants;
	address private i_latestWinner;
	uint256 private immutable i_entranceFee;

	event RaffleEntered(address indexed participant);

	constructor(uint256 entranceFee) {
		i_entranceFee = entranceFee;
	}

	function enterRaffe() external payable {
		if (msg.value < i_entranceFee) revert Raffle__NotEnoughETH();
		s_participants.push(payable(msg.sender));
		emit RaffleEntered(msg.sender);
	}

	// getters
	function getParticipant(uint256 index) public view returns (address) {
		return s_participants[index];
	}

	function getEntranceFee() public view returns (uint256) {
		return i_entranceFee;
	}

	function getLatestWinner() public view returns (address) {
		return i_latestWinner;
	}
}
