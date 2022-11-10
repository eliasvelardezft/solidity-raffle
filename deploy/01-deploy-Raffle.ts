import { ethers, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { verify } from "../utils/verify";

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
	const { deployments, getNamedAccounts } = hre;
	const { deploy, log } = deployments;
	const { owner } = await getNamedAccounts();

	const currentNetworkConfig = networkConfig[network.name];

	let vrfCoordinatorV2Address, subscriptionId;
	if (developmentChains.includes(network.name)) {
		const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
		vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
		// create subscription
		const txResponse = await vrfCoordinatorV2Mock.createSubscription();
		const txReceipt = await txResponse.wait(1);
		subscriptionId = txReceipt.events[0].args.subId;
		// fund subscription
		await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, ethers.utils.parseEther("5"));
	} else {
		vrfCoordinatorV2Address = currentNetworkConfig.vrfCoordinatorV2;
		subscriptionId = currentNetworkConfig.vrfSubscriptionId;
	}

	const entranceFee = currentNetworkConfig.entranceFee;
	const keyHash = currentNetworkConfig.vrfKeyHash;
	const maxGasLimit = currentNetworkConfig.vrfMaxGasLimit;
	const interval = currentNetworkConfig.interval;

	const args = [
		vrfCoordinatorV2Address,
		entranceFee,
		keyHash,
		subscriptionId,
		maxGasLimit,
		interval,
	];
	const raffle = await deploy("Raffle", {
		args: args,
		from: owner,
		log: true,
		waitConfirmations: currentNetworkConfig?.blockConfirmations || 1,
	});

	log("deployed!");

	if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		await verify(raffle.address, args);
	} else {
		const vrfCoordinatorV2Mock = await ethers.getContractAt("VRFCoordinatorV2Mock", vrfCoordinatorV2Address!)
		await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address)
	}

	log("--------------");
};
export default deployRaffle;
deployRaffle.tags = ["all", "raffle"];
