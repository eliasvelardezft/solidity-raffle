import { deployments, ethers, network } from "hardhat";
import { expect, assert } from "chai";
import { Raffle } from "../typechain-types/contracts/Raffle"
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { networkConfig, networkConfigItem } from "../helper-hardhat-config"

describe("Raffle", () => {
	let raffle: Raffle,
		owner: SignerWithAddress,
		participant1: SignerWithAddress,
		participant2: SignerWithAddress,
		currentNetworkConfig: networkConfigItem;
	beforeEach(async () => {
		await deployments.fixture(["all"]);

		const accounts = await ethers.getNamedSigners();
		({ owner, participant1, participant2 } = accounts);

		raffle = await ethers.getContract("Raffle", owner);

		currentNetworkConfig = networkConfig[network.name];
	});
	describe("constructor", async () => {
		it("Sets constructor variables correctly", async () => {
			const entranceFee = await raffle.getEntranceFee();
			assert.equal(entranceFee.toString(), currentNetworkConfig.entranceFee!.toString());

			const keyHash = await raffle.getKeyHash();
			assert.equal(keyHash.toString(), currentNetworkConfig.vrfKeyHash);

			const callbackGasLimit = await raffle.getCallbackGasLimit();
			assert.equal(callbackGasLimit.toString(), currentNetworkConfig.vrfMaxGasLimit);

			const interval = await raffle.getInterval();
			assert.equal(interval.toString(), currentNetworkConfig.interval);

			const raffleState = await raffle.getRaffleState();
			assert.equal(raffleState.toString(), "0");

			const latestTimestamp = await raffle.getLatestTimeStamp();
			const expectedLatestTimestamp = (await ethers.provider.getBlock("latest")).timestamp;
			assert.equal(latestTimestamp.toString(), expectedLatestTimestamp.toString());
		});
	});
	describe("enterRaffle", async () => {
		it("Reverts with Raffle__NotEnoughETH if value is less than entranceFee", async () => {
			const sendValue = ethers.utils.parseEther("0.005");
			await expect(raffle.enterRaffe({ value: sendValue })).to.be.revertedWithCustomError(
				raffle,
				"Raffle__NotEnoughETH"
			);
		});
		it("Adds address to participants array", async () => {
			const sendValue = ethers.utils.parseEther("0.1");
			await raffle.connect(participant1).enterRaffe({ value: sendValue });

			const firstParticipant = await raffle.getParticipant(0);

			assert.equal(firstParticipant, participant1.address);
		});
		it("emits RaffleEntered with msg.sender parameter", async () => {
			const sendValue = ethers.utils.parseEther("0.1");
			await expect(raffle.connect(participant1).enterRaffe({ value: sendValue }))
				.to.emit(raffle, "RaffleEntered")
				.withArgs(participant1.address);
		});
	});
});
