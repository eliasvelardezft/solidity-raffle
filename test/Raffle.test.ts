import { deployments, ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { Raffle } from "../typechain-types/contracts/Raffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { networkConfig, networkConfigItem } from "../helper-hardhat-config";
import { VRFCoordinatorV2Mock } from "../typechain-types";

describe("Raffle", () => {
	let raffle: Raffle,
		raffleContract: Raffle,
		owner: SignerWithAddress,
		participant1: SignerWithAddress,
		participant2: SignerWithAddress,
		participant3: SignerWithAddress,
		participants: SignerWithAddress[],
		currentNetworkConfig: networkConfigItem,
		vrfCoordinatorV2Mock: VRFCoordinatorV2Mock,
		raffleEntranceFee: string,
		raffleInterval: number;

	beforeEach(async () => {
		await deployments.fixture(["all"]);

		const accounts = await ethers.getNamedSigners();
		({ owner, participant1, participant2, participant3 } = accounts);
		participants = [participant1, participant2, participant3];

		raffleContract = await ethers.getContract("Raffle");
		raffle = await raffleContract.connect(owner);

		vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");

		currentNetworkConfig = networkConfig[network.name];
		raffleEntranceFee = currentNetworkConfig.entranceFee!.toString();
		raffleInterval = parseInt(currentNetworkConfig.interval!);
	});

	const increaseTimeAndMine = async (time: number) => {
		await network.provider.send("evm_increaseTime", [time]);
		await network.provider.send("evm_mine", []);
	};

	const enterAndIncreaseTime = async (time: number) => {
		await raffle.connect(participant1).enterRaffe({ value: raffleEntranceFee });
		await increaseTimeAndMine(time);
	};
	describe("constructor", () => {
		it("Sets constructor variables correctly", async () => {
			const entranceFee = await raffle.getEntranceFee();
			assert.equal(entranceFee.toString(), raffleEntranceFee);

			const keyHash = await raffle.getKeyHash();
			assert.equal(keyHash.toString(), currentNetworkConfig.vrfKeyHash);

			const callbackGasLimit = await raffle.getCallbackGasLimit();
			assert.equal(callbackGasLimit.toString(), currentNetworkConfig.vrfMaxGasLimit);

			const interval = await raffle.getInterval();
			assert.equal(interval.toString(), currentNetworkConfig.interval);

			const raffleState = await raffle.getRaffleState();
			assert.equal(raffleState.toString(), "0");

			const latestTimestamp = await raffle.getLatestTimeStamp();
			// subtract 1 because adding raffle as vrfCoordinatorV2Mock takes time
			// TODO: CHECK THIS
			const expectedLatestTimestamp = (await time.latest()) - 1;
			assert.equal(latestTimestamp.toString(), expectedLatestTimestamp.toString());
		});
	});
	describe("enterRaffle", () => {
		it("Reverts with Raffle__NotEnoughETH if value is less than entranceFee", async () => {
			const sendValue = ethers.utils.parseEther("0.005");
			await expect(raffle.enterRaffe({ value: sendValue })).to.be.revertedWithCustomError(
				raffle,
				"Raffle__NotEnoughETH"
			);
		});
		it("Reverts with Raffle__NotOpen if raffle is not in Open state", async () => {
			// enter raffle so there is balance and participants and increase time
			await enterAndIncreaseTime(raffleInterval + 1);

			// performUpkeep requests the randomNumber and puts the raffle in CALCULATING state
			await raffle.connect(owner).performUpkeep([]);

			await expect(
				raffle.enterRaffe({ value: raffleEntranceFee })
			).to.be.revertedWithCustomError(raffle, "Raffle__NotOpen");
		});
		it("Adds address to participants array", async () => {
			await raffle.connect(participant1).enterRaffe({ value: raffleEntranceFee });

			const firstParticipant = await raffle.getParticipant(0);

			assert.equal(firstParticipant, participant1.address);
		});
		it("emits RaffleEntered with msg.sender parameter", async () => {
			await expect(raffle.connect(participant1).enterRaffe({ value: raffleEntranceFee }))
				.to.emit(raffle, "RaffleEntered")
				.withArgs(participant1.address);
		});
	});
	describe("checkUpkeep", () => {
		it("Returns false if raffle is not in OPEN state", async () => {
			// enter raffle so there is balance and participants and increase time
			await enterAndIncreaseTime(raffleInterval + 1);
			await raffle.performUpkeep([]);

			const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
			const raffleState = await raffle.getRaffleState();

			assert.isFalse(upkeepNeeded);
			assert.equal(raffleState.toString(), "1");
		});
		it("Returns false if interval has not passed yet", async () => {
			await raffle.enterRaffe({ value: raffleEntranceFee });

			const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
			assert.isFalse(upkeepNeeded);
		});
		it("Returns false if there are no participants", async () => {
			await increaseTimeAndMine(raffleInterval + 1);

			const participantsNum = await raffle.getNumberOfParticipants();
			const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

			assert.equal(participantsNum.toString(), "0");
			assert.isFalse(upkeepNeeded);
		});
		it("Returns false if there is no balance in the contract", async () => {
			await increaseTimeAndMine(raffleInterval + 1);

			const balance = await ethers.provider.getBalance(raffle.address);
			const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

			assert.equal(balance.toString(), "0");
			assert.isFalse(upkeepNeeded);
		});
		it("Returns true if al needed conditions are met", async () => {
			// enter raffle so there is balance and participants and increase time
			await enterAndIncreaseTime(raffleInterval + 1);

			const participantsNum = await raffle.getNumberOfParticipants();
			const balance = await ethers.provider.getBalance(raffle.address);
			const raffleState = await raffle.getRaffleState();

			const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);

			assert.equal(participantsNum.toString(), "1");
			assert.equal(balance.toString(), raffleEntranceFee.toString());
			assert.equal(raffleState.toString(), "0"); // 0: OPEN, 1: CALCULATING

			assert.isTrue(upkeepNeeded);
		});
	});
	describe("performUpkeep", () => {
		it("Reverts with Raffle__UpkeepNotNeeded if upkeepNeeded is false", async () => {
			// checkupKeep is false because the time hasn't passed
			// and there are no participants or balance
			await expect(raffle.performUpkeep([])).to.be.revertedWithCustomError(
				raffle,
				"Raffle__UpkeepNotNeeded"
			);
		});
		it("Changes raffleState from OPEN to CALCULATING", async () => {
			// enter raffle so there is balance and participants and increase time
			await enterAndIncreaseTime(raffleInterval + 1);

			await raffle.performUpkeep([]);

			const newRaffleState = await raffle.getRaffleState();

			assert.equal(newRaffleState.toString(), "1");
		});
		it("calls vrfCoordinatorV2.requestRandomWords and creates requestId local variable", async () => {
			// enter raffle so there is balance and participants and increase time
			await enterAndIncreaseTime(raffleInterval + 1);

			const txResponse = await raffle.performUpkeep([]);
			const txReceipt = await txResponse.wait(1);

			const requestId = txReceipt!.events![1].args!.requestId;

			assert.isTrue(requestId.toNumber() > 0);
		});
		it("Emits RequestedRaffleWinner with param requestId (from the requestRandomWords call)", async () => {
			// enter raffle so there is balance and participants and increase time
			await enterAndIncreaseTime(raffleInterval + 1);

			const txResponse = await raffle.performUpkeep([]);
			const txReceipt = await txResponse.wait(1);

			const requestId = txReceipt!.events![1].args!.requestId;

			await expect(txResponse).to.emit(raffle, "RequestedRaffleWinner").withArgs(requestId);
		});
	});
	describe("fulfillRandomWords state change and transfer", async () => {
		beforeEach(async () => {
			await enterAndIncreaseTime(raffleInterval + 1);
		});
		it("Can only be called after performUpkeep", async () => {
			await expect(
				vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
			).to.be.revertedWith("nonexistent request");
		});
		it("Correctly changes contract's state and transfers money to winner", async () => {
			/**
			 * @dev this test simulates an async call to the methods that use Chainlink keepers and vrf
			 * as it would be done in a staging test where we don't know when chainlink will return the data
			 */

			// start at index 1 because participant1 (participants[0])
			// has already entered in the beforeEach function call
			for (let i = 1; i < participants.length; i++) {
				await raffle.connect(participants[i]).enterRaffe({ value: raffleEntranceFee });
			}
			const startingTimestamp = await time.latest();

			await new Promise<void>(async (resolve, reject) => {
				raffle.once("WinnerPicked", async () => {
					try {
						const winner = await raffle.getLatestWinner();
						console.log("winner address: ", winner);
						console.log(
							"winner index: ",
							participants.map((e) => e.address).indexOf(winner)
						);
						const updatedRaffleState = await raffle.getRaffleState();
						const updatedParticipantsNumber = await raffle.getNumberOfParticipants();
						const updatedLatestTimestamp = await raffle.getLatestTimeStamp();
						// state changes assertions
						assert.include(
							participants.map((e) => e.address),
							winner.toString()
						);
						assert.equal(updatedRaffleState.toString(), "0");
						assert.equal(updatedParticipantsNumber.toString(), "0");
						assert(startingTimestamp < updatedLatestTimestamp.toNumber());

						// transfer assertion
						const entranceFee = await raffle.getEntranceFee();
						const updatedWinnerBalance = await ethers.provider.getBalance(winner);
						assert.equal(
							updatedWinnerBalance.toString(),
							winnerStartingBalance
								.add(entranceFee.mul(participants.length))
								.toString()
						);
					} catch (error) {
						reject(error);
					}
					resolve();
				});

				const txResponse = await raffle.performUpkeep([]);
				const txReceipt = await txResponse.wait(1);
				const requestId = txReceipt!.events![1].args!.requestId;

				// we already know the winner is index 2 because we printed it
				const winnerStartingBalance = await ethers.provider.getBalance(
					participants[2].address
				);
				await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address);
			});
		});
		it("Emits WinnerPicked with arg address latestWinner", async () => {
			const txResponse = await raffle.performUpkeep([]);
			const txReceipt = await txResponse.wait(1);
			const requestId = txReceipt!.events![1].args!.requestId;

			const tx = await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address);
			const winner = await raffle.getLatestWinner();

			await expect(tx).to.emit(raffle, "WinnerPicked").withArgs(winner);
		});
	});
	describe("Pure getters", () => {
		it("Returns NUM_WORDS correctly", async () => {
			const NUM_WORDS = await raffle.getNumWords();
			assert.equal(NUM_WORDS.toString(), "1");
		});
		it("Returns REQUEST_CONFIRMATIONS correctly", async () => {
			const REQUEST_CONFIRMATIONS = await raffle.getRequestConfirmations();
			assert.equal(REQUEST_CONFIRMATIONS.toString(), "3");
		});
	});
});
