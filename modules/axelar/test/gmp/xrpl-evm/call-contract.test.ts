// import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
// import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
// import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
// import { ethers } from "ethers";
// import config from "../../../module.config.example.json";
// import { Client, Wallet } from "xrpl";
// import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";

// describe("GMP/CallContract", () => {
//     let evmChainProvider: EthersProvider;
//     let xrplChainProvider: XrplProvider;

//     let _evmChainSigner: EthersSigner;
//     let _xrplChainSigner: XrplSigner;

//     let evmJsonProvider: ethers.JsonRpcProvider;
//     let xrplClient: Client;

//     let evmChainWallet: ethers.Wallet;
//     let xrplChainWallet: Wallet;

//     before(async () => {
//         evmJsonProvider = new ethers.JsonRpcProvider(config.axelar.sourceChain.urls.rpc);
//         xrplClient = new Client(config.axelar.destinationChain.urls.rpc);

//         evmChainProvider = new EthersProvider(evmJsonProvider);
//         xrplChainProvider = new XrplProvider(xrplClient);

//         evmChainWallet = new ethers.Wallet(config.axelar.sourceChain.account.privateKey, evmJsonProvider);
//         xrplChainWallet = Wallet.fromSeed(config.axelar.destinationChain.account.privateKey);

//         _evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
//         _xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);
//     });

//     describe("from evm chain to xrpl chain", () => {
//         it("should call the contract", async () => {
//             const gateway = evmChainProvider.getAxelarAmplifierGatewayContract(config.axelar.sourceChain.axelarAmplifierGatewayAddress);

//             const _ = await gateway.callContract(
//                 config.axelar.destinationChain.name,
//                 config.axelar.destinationChain.interchainTokenServiceAddress,
//                 "0x",
//             );
//         });
//     });

//     describe("from xrpl chain to evm chain", () => {
//         it("should call the contract", async () => {});
//     });
// });
