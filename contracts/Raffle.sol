// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";

error Raffle__NotEnoughETH();
error Raffle__FailedTransfer();

contract Raffle is VRFConsumerBaseV2 {
	uint256 private immutable i_entranceFee;
	address payable[] private s_participants;
	VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
	bytes32 private immutable i_gasLane;
	uint64 private immutable i_subscriptionId;
	uint16 private constant REQUEST_CONFIRMATIONS = 3;
	uint16 private constant NUM_WORDS = 1;
	uint32 private immutable i_callbackGasLimit;

	// raffle variables
	address private s_latestWinner;

	event RaffleEntered(address indexed participant);
	event RequestedRaffleWinner(uint256 indexed requestId);
	event WinnerPicked(address indexed winner);

	constructor(
		uint256 entranceFee,
		address vrfCoordinatorV2,
		bytes32 gasLane,
		uint64 subscriptionId,
		uint32 callbackGasLimit
	) VRFConsumerBaseV2(vrfCoordinatorV2) {
		i_entranceFee = entranceFee;
		i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
		i_gasLane = gasLane;
		i_subscriptionId = subscriptionId;
		i_callbackGasLimit = callbackGasLimit;
	}

	function enterRaffe() external payable {
		if (msg.value < i_entranceFee) revert Raffle__NotEnoughETH();
		s_participants.push(payable(msg.sender));
		emit RaffleEntered(msg.sender);
	}

	function requestRandomWinner() external {
		uint256 requestId = i_vrfCoordinator.requestRandomWords(
			i_gasLane,
			i_subscriptionId,
			REQUEST_CONFIRMATIONS,
			i_callbackGasLimit,
			NUM_WORDS
		);
		emit RequestedRaffleWinner(requestId);
	}

	function fulfillRandomWords(
		uint256, /** requestId */
		uint256[] memory randomWords
	) internal override {
		uint256 randomIndex = randomWords[0] % s_participants.length;
		address payable latestWinner = s_participants[randomIndex];
		s_latestWinner = latestWinner;

		(bool success, ) = latestWinner.call{ value: address(this).balance }("");
		if (!success) revert Raffle__FailedTransfer();

		emit WinnerPicked(latestWinner);
	}

	// getters
	function getParticipant(uint256 index) public view returns (address) {
		return s_participants[index];
	}

	function getEntranceFee() public view returns (uint256) {
		return i_entranceFee;
	}

	function getLatestWinner() public view returns (address) {
		return s_latestWinner;
	}
}
