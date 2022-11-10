import { deployments, ethers, network } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { expect, assert } from "chai";
import { Raffle } from "../typechain-types/contracts/Raffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { networkConfig, networkConfigItem } from "../helper-hardhat-config";

describe("Raffle", () => {
	let raffle: Raffle,
		owner: SignerWithAddress,
		participant1: SignerWithAddress,
		participant2: SignerWithAddress,
		currentNetworkConfig: networkConfigItem,
		raffleEntranceFee: string,
		raffleInterval: number;

	const increaseTimeAndMine = async (time: number) => {
		await network.provider.send("evm_increaseTime", [time]);
		await network.provider.send("evm_mine", []);
	};

	beforeEach(async () => {
		await deployments.fixture(["all"]);

		const accounts = await ethers.getNamedSigners();
		({ owner, participant1, participant2 } = accounts);

		raffle = await ethers.getContract("Raffle", owner);

		currentNetworkConfig = networkConfig[network.name];
		raffleEntranceFee = currentNetworkConfig.entranceFee!.toString();
		raffleInterval = parseInt(currentNetworkConfig.interval!);
	});
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
			// enter so there are participants and balance available
			await raffle.enterRaffe({ value: raffleEntranceFee });

			// pass time interval
			await increaseTimeAndMine(raffleInterval + 1);

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
			await raffle.enterRaffe({ value: raffleEntranceFee });
			await increaseTimeAndMine(raffleInterval + 1);
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
			await raffle.enterRaffe({ value: raffleEntranceFee });

			await increaseTimeAndMine(raffleInterval + 1);

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
});
