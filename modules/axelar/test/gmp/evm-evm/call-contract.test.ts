// import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
// import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
// import { ethers } from "ethers";
// import config from "../../../module.config.example.json";

// describe("GMP/CallContract", () => {
//     let sourceChainProvider: EthersProvider;
//     let destinationChainProvider: EthersProvider;

//     let _sourceChainSigner: EthersSigner;
//     let _destinationChainSigner: EthersSigner;

//     let sourceChainJsonProvider: ethers.JsonRpcProvider;
//     let destinationChainJsonProvider: ethers.JsonRpcProvider;

//     let sourceChainWallet: ethers.Wallet;
//     let destinationChainWallet: ethers.Wallet;

//     before(async () => {
//         sourceChainJsonProvider = new ethers.JsonRpcProvider(config.axelar.sourceChain.urls.rpc);
//         destinationChainJsonProvider = new ethers.JsonRpcProvider(config.axelar.destinationChain.urls.rpc);

//         sourceChainProvider = new EthersProvider(sourceChainJsonProvider);
//         destinationChainProvider = new EthersProvider(destinationChainJsonProvider);

//         sourceChainWallet = new ethers.Wallet(config.axelar.sourceChain.account.privateKey, sourceChainJsonProvider);
//         destinationChainWallet = new ethers.Wallet(config.axelar.destinationChain.account.privateKey, destinationChainJsonProvider);

//         _sourceChainSigner = new EthersSigner(sourceChainWallet, sourceChainProvider);
//         _destinationChainSigner = new EthersSigner(destinationChainWallet, destinationChainProvider);
//     });

//     describe("from source chain to destination chain", () => {
//         it("should call the contract", async () => {
//             const gateway = sourceChainProvider.getAxelarAmplifierGatewayContract(config.axelar.sourceChain.axelarAmplifierGatewayAddress);

//             const _ = await gateway.callContract(
//                 config.axelar.destinationChain.name,
//                 config.axelar.destinationChain.interchainTokenServiceAddress,
//                 "0x",
//             );
//         });
//     });

//     describe("from destination chain to source chain", () => {});
// });
