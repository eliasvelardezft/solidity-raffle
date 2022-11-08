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
	GOERLI_VRF_MAX_GAS_LIMIT,
	// api keys
	ETHERSCAN_API_KEY,
	COINMARKETCAP_API_KEY,
} = process.env;

// network config
interface networkConfigItem {
	blockConfirmations?: number;
	chainId?: number;
}

interface networkConfigInfo {
	[key: string]: networkConfigItem;
}

export const networkConfig: networkConfigInfo = {
	goerli: {
		blockConfirmations: 6,
		chainId: +GOERLI_CHAINID!,
	},
};
