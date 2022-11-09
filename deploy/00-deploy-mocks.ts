import { ethers, network } from "hardhat";
import { DeployFunction } from "hardhat-deploy/dist/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { developmentChains } from "../helper-hardhat-config";

const deployVRFCoordinatorV2Mock: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
	const { deployments, getNamedAccounts } = hre;
	const { deploy, log } = deployments;
	const { owner } = await getNamedAccounts();

	if (developmentChains.includes(network.name)) {
		log("Local network detected. Deploying mocks");

		const baseFee = ethers.utils.parseEther("0.25");
		const gasPriceLink = 1e9; // abritrary link per gas

		await deploy("VRFCoordinatorV2Mock", {
			from: owner,
			log: true,
			args: [baseFee, gasPriceLink],
		});

		log("Mocks deployed!");
		log("---------------------");
	}
};
export default deployVRFCoordinatorV2Mock;
deployVRFCoordinatorV2Mock.tags = ["all", "mocks"];
