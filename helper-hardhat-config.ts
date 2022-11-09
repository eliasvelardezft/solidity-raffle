import { BigNumber } from "ethers";
import { ethers } from "hardhat";

export const developmentChains = ["hardhat", "localhost"];

export const {
	// localhost
	LOCALHOST_RPC_URL,
	// goerli
	GOERLI_RPC_URL,
	GOERLI_CHAINID,
	GOERLI_PRIVATE_KEY,
	// chainlink goerli
	GOERLI_VRF_SUBSCRIPTION_ADDRESS,
	GOERLI_VRF_COORDINATOR_V2,
	GOERLI_VRF_KEYHASH,
	GOERLI_VRF_SUBSCRIPTION_ID,
	// api keys
	ETHERSCAN_API_KEY,
	COINMARKETCAP_API_KEY,
} = process.env;

// network config
interface networkConfigItem {
	blockConfirmations?: number;
	chainId?: number;
	vrfSubscriptionAddress?: string;
	vrfCoordinatorV2?: string;
	vrfKeyHash?: string;
	vrfSubscriptionId?: string;
	vrfMaxGasLimit?: string;
	// raffle
	entranceFee?: BigNumber;
	interval?: string;
}

interface networkConfigInfo {
	[key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
	goerli: {
		blockConfirmations: 6,
		chainId: +GOERLI_CHAINID!,
		vrfSubscriptionAddress: GOERLI_VRF_SUBSCRIPTION_ADDRESS!,
		vrfCoordinatorV2: GOERLI_VRF_COORDINATOR_V2,
		vrfKeyHash: GOERLI_VRF_KEYHASH,
		vrfSubscriptionId: GOERLI_VRF_SUBSCRIPTION_ID,
		vrfMaxGasLimit: "2500000",
		entranceFee: ethers.utils.parseEther("0.01"),
		interval: "20",
	},
	hardhat: {
		entranceFee: ethers.utils.parseEther("0.01"),
		vrfKeyHash: GOERLI_VRF_KEYHASH,
		vrfMaxGasLimit: "2500000",
		interval: "20",
	},
};
