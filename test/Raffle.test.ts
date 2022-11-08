import { deployments, ethers } from "hardhat";
import { expect, assert } from "chai";
import { Raffle } from "../typechain-types/Raffle";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { RAFFLE_ENTRANCE_FEE } from "../raffle-constants";

describe("Raffle", () => {
	let raffle: Raffle,
		owner: SignerWithAddress,
		participant1: SignerWithAddress,
		participant2: SignerWithAddress;
	beforeEach(async () => {
		await deployments.fixture(["all"]);

		const accounts = await ethers.getNamedSigners();
		({ owner, participant1, participant2 } = accounts);

		raffle = await ethers.getContract("Raffle", owner);
	});
	describe("constructor", async () => {
		it("Sets entranceFee", async () => {
			const entranceFee = await raffle.getEntranceFee();
			assert.equal(entranceFee.toString(), RAFFLE_ENTRANCE_FEE.toString());
		});
	});
	describe("enterRaffle", async () => {
		it("Reverts with Raffle__NotEnoughETH if value is less than entranceFee", async () => {
			const sendValue = ethers.utils.parseEther("0.05");
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
