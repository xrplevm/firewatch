# Bridge Contracts implementations Project

This project defines and implements the necessary contracts to run a bridge between 2 chains. It is developed using hardhat.

## Prerequisites
- [Node 18.15.0](https://nodejs.org.es)
- [yarn 1.22.0](https://yarnpkg.com)

## Installation and use as npm package

To install the pkg using yarn in your npm package:
```bash
yarn add @peersyst/xrp-evm-contracts
```

To use the pkg contracts definitions we can import them and deploy the pkg or just use them to make requests in the blockchain
```typescript
import {
    XChainUtilsUnsafe__factory,
    BridgeDoorMultiToken__factory,
    BridgeDoorMultiToken,
    Utils__factory,
} from "@peersyst/xrp-evm-contracts";
import { Wallet, JsonRpcProvider } from "ethers";

export const deployBridge = (signerWallet: Wallet): Promise<void> {
        console.log(`Deploying Utils...`);
        const UtilsFactory = new Utils__factory(signerWallet);
        const Utils = await UtilsFactory.deploy();
        await Utils.deployed();
        console.log(`Utils library smart contract set up at ${Utils.address}`);

        console.log(`Deploying XChainUtils...`);
        const xChainUtilsFactory = new XChainUtilsUnsafe__factory({ ["contracts/Utils.sol:Utils"]: Utils.address }, signerWallet);
        const xChainUtils = await xChainUtilsFactory.deploy();
        await xChainUtils.deployed();
        console.log(`XChainUtils library smart contract set up at ${xChainUtils.address}`);

        console.log(`Deploying BridgeDoorMultiToken...`);
        const bridgeDoorMultiTokenFactory = new BridgeDoorMultiToken__factory(
            { ["contracts/XChainUtils.sol:XChainUtils"]: xChainUtils.address },
            signerWallet,
        );
        const bridgeDoorMultiToken = await bridgeDoorMultiTokenFactory.deploy(safeAddress);
        await bridgeDoorMultiToken.deployed();
        console.log(`Bridge deployed successfully!`);
}

export const getBridge = (address: string): BridgeDoorMultiToken {
    const provider = new JsonRpcProvider(chain.rpcUrl);
    return BridgeDoorMultiToken__factory.connect(address, provider);
}
```

## Use and installation locally
To install and build use the following commands
```bash
yarn
yarn build
```

## Testing
To test use the following command:
```bash
yarn test
```

## Other useful commands
These include hardhat and linter commands
```bash
yarn hardhat accounts
yarn hardhat compile
yarn hardhat clean
yarn hardhat test
yarn hardhat node
yarn hardhat help
REPORT_GAS=true yarn hardhat test
yarn hardhat coverage
yarn lint
yarn lint:ts
yarn lint:sol
```

## Documentation
The official documentation can be found [here](https://app.gitbook.com/o/iusnYCQCtc7BulFaRKnT/s/6DMIukz7dOr3ham1Hc99/smart-contracts/introduction)
