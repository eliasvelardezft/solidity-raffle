# Solidity Raffle
This project is a simple raffle smart contract implemented using Chainlink VRF to get a random winner between the participants and Chainlink Keepers to automate the process of picking a winner after a certain amount of time has passed.

## Deployment
deployed in and verified in etherscan  
* https://goerli.etherscan.io/address/0xDc257bdD4e9D2C574A9525d5Ab9331A9F587c89f#code

## Running locally
If you want to run the project locally you'll need to create an ``.env`` file with some of the following variables
* GOERLI_RPC_URL
* GOERLI_PRIVATE_KEY
* ETHERSCAN_API_KEY
* GOERLI_CHAINID
* LOCALHOST_RPC_URL
* COINMARKETCAP_API_KEY
* GOERLI_VRF_SUBSCRIPTION_ADDRESS
* GOERLI_VRF_COORDINATOR_V2
* GOERLI_VRF_KEYHASH
* GOERLI_VRF_SUBSCRIPTION_ID