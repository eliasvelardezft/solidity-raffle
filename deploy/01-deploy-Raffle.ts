import { network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import {
	developmentChains,
	networkConfig,
	GOERLI_VRF_COORDINATOR_V2,
	GOERLI_VRF_KEYHASH,
	GOERLI_VRF_SUBSCRIPTION_ID,
	GOERLI_VRF_MAX_GAS_LIMIT,
} from "../helper-hardhat-config";
import { RAFFLE_ENTRANCE_FEE } from "../raffle-constants";
import { verify } from "../utils/verify";

const deployRaffle: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
	const { deployments, getNamedAccounts } = hre;
	const { deploy, log } = deployments;
	const { owner } = await getNamedAccounts();

	const raffle = await deploy("Raffle", {
		args: [
			RAFFLE_ENTRANCE_FEE,
			GOERLI_VRF_COORDINATOR_V2,
			GOERLI_VRF_KEYHASH,
			GOERLI_VRF_SUBSCRIPTION_ID,
			GOERLI_VRF_MAX_GAS_LIMIT,
		],
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
