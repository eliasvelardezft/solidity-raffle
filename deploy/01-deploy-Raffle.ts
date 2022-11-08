import { network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains, networkConfig } from "../helper-hardhat-config";
import { RAFFLE_ENTRANCE_FEE } from "../raffle-constants";
import { verify } from "../utils/verify";

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
	const { deployments, getNamedAccounts } = hre;
	const { deploy, log } = deployments;
	const { owner } = await getNamedAccounts();

	const raffle = await deploy("Raffle", {
		args: [RAFFLE_ENTRANCE_FEE],
		from: owner,
		log: true,
		waitConfirmations: networkConfig[network.name]?.blockConfirmations || 0,
	});

	log("deployed!");

	if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
		await verify(raffle.address, []);
	}

	log("--------------");
};
export default deployRaffle;
deployRaffle.tags = ["all"];
