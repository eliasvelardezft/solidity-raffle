// SPDX-License-Identifier: MIT

pragma solidity ^0.8.8;

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/AutomationCompatible.sol";

error Raffle__NotEnoughETH();
error Raffle__FailedTransfer();
error Raffle__NotOpen();
error Raffle__UpkeepNotNeeded(uint256 currentBalance, uint256 participantsNum, uint256 raffleState);

contract Raffle is VRFConsumerBaseV2, AutomationCompatibleInterface {
	enum RaffleState {
		OPEN,
		CALCULATING
	}

	VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
	bytes32 private immutable i_keyHash;
	uint64 private immutable i_subscriptionId;
	uint16 private constant REQUEST_CONFIRMATIONS = 3;
	uint16 private constant NUM_WORDS = 1;
	uint32 private immutable i_callbackGasLimit;
	uint256 private s_latestTimestamp;

	// raffle variables
	uint256 private immutable i_entranceFee;
	address payable[] private s_participants;
	address private s_latestWinner;
	RaffleState private s_raffleState;
	uint16 private immutable i_interval;

	event RaffleEntered(address indexed participant);
	event RequestedRaffleWinner(uint256 indexed requestId);
	event WinnerPicked(address indexed winner);

	constructor(
		address vrfCoordinatorV2,
		uint256 entranceFee,
		bytes32 keyHash,
		uint64 subscriptionId,
		uint32 callbackGasLimit,
		uint16 interval
	) VRFConsumerBaseV2(vrfCoordinatorV2) {
		i_entranceFee = entranceFee;
		i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
		i_keyHash = keyHash;
		i_subscriptionId = subscriptionId;
		i_callbackGasLimit = callbackGasLimit;
		i_interval = interval;
		s_raffleState = RaffleState.OPEN;
		s_latestTimestamp = block.timestamp;
	}

	function enterRaffe() external payable {
		if (s_raffleState == RaffleState.CALCULATING) revert Raffle__NotOpen();
		if (msg.value < i_entranceFee) revert Raffle__NotEnoughETH();
		s_participants.push(payable(msg.sender));
		emit RaffleEntered(msg.sender);
	}

	/**
	 * @dev Chainlink keeper nodes call this function to know if
	 * they need to call performUpkeep to pick the random winner
	 * The following items need to be true in order for upkeepNeeded to be true
	 * 1. The raffle is in open state (not waiting for random number)
	 * 2. Time interval has passed
	 * 3. Raffle has at least 1 participant
	 * 4. There is some ETH in the balance
	 */
	function checkUpkeep(
		bytes memory /* checkData */
	)
		public
		override
		returns (
			bool upkeepNeeded,
			bytes memory /* performData */
		)
	{
		bool isOpen = s_raffleState == RaffleState.OPEN;
		bool passedTimestamp = (block.timestamp - s_latestTimestamp) > i_interval;
		bool hasParticipants = s_participants.length > 0;
		bool hasBalance = address(this).balance > 0;
		upkeepNeeded = (isOpen && passedTimestamp && hasParticipants && hasBalance);
	}

	/**
	 * @dev this function is called when checkUpkeep returns true, and requests the randomNumber
	 */
	function performUpkeep(
		bytes calldata /* performData */
	) external {
		(bool upkeepNeeded, ) = checkUpkeep("");
		if (!upkeepNeeded) {
			// send error with data about why it may have been thrown
			revert Raffle__UpkeepNotNeeded(
				address(this).balance,
				s_participants.length,
				uint256(s_raffleState)
			);
		}
		s_raffleState = RaffleState.CALCULATING;
		uint256 requestId = i_vrfCoordinator.requestRandomWords(
			i_keyHash,
			i_subscriptionId,
			REQUEST_CONFIRMATIONS,
			i_callbackGasLimit,
			NUM_WORDS
		);
		emit RequestedRaffleWinner(requestId);
	}

	/**
	 * @dev this function is called once we have a randomNumber to get our winner
	 */
	function fulfillRandomWords(
		uint256, /** requestId */
		uint256[] memory randomWords
	) internal override {
		uint256 randomIndex = randomWords[0] % s_participants.length;
		address payable latestWinner = s_participants[randomIndex];
		s_latestWinner = latestWinner;

		(bool success, ) = latestWinner.call{ value: address(this).balance }("");
		if (!success) revert Raffle__FailedTransfer();

		s_raffleState = RaffleState.OPEN;
		s_participants = new address payable[](0);
		s_latestTimestamp = block.timestamp;

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

	function getLatestTimeStamp() public view returns (uint256) {
		return s_latestTimestamp;
	}

	function getInterval() public view returns (uint16) {
		return i_interval;
	}

	function getKeyHash() public view returns (bytes32) {
		return i_keyHash;
	}

	function getCallbackGasLimit() public view returns (uint32) {
		return i_callbackGasLimit;
	}

	function getRaffleState() public view returns (RaffleState) {
		return s_raffleState;
	}

	function getNumberOfParticipants() public view returns (uint256) {
		return s_participants.length;
	}

	function getNumWords() public pure returns (uint16) {
		return NUM_WORDS;
	}

	function getRequestConfirmations() public pure returns (uint16) {
		return REQUEST_CONFIRMATIONS;
	}
}
