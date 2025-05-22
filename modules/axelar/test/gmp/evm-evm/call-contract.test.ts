import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { PollingOptions } from "@shared/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { AxelarExecutableExample, AxelarAmplifierGateway } from "@shared/evm/contracts";
import { expectMessageUpdate, expectEventEmission } from "./call-contract.helpers";
import { describeOrSkip } from "@testing/mocha/utils";

// TODO: addNativeGas function doesn't work every time.
describeOrSkip(
    "Call Contract EVM - EVM",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["evm"], config.evmChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplEvmChain, evmChain } = config;

        let sourceEvmProvider: EthersProvider;
        let destinationEvmProvider: EthersProvider;

        let sourceEvmSigner: EthersSigner;
        let destinationEvmSigner: EthersSigner;

        let sourceJsonProvider: ethers.JsonRpcProvider;
        let destinationJsonProvider: ethers.JsonRpcProvider;

        let sourceWallet: ethers.Wallet;
        let destinationWallet: ethers.Wallet;

        let sourceAxelarExecutableExample: AxelarExecutableExample;
        let destinationAxelarExecutableExample: AxelarExecutableExample;
        let sourceGatewayContract: AxelarAmplifierGateway;
        let destinationGatewayContract: AxelarAmplifierGateway;

        let srcGateway: string;
        let destGateway: string;
        let srcChain: string;
        let destChain: string;
        let srcAxelarExecutableExampleAddress: string;
        let destAxelarExecutableExampleAddress: string;
        let srcAxelarGasServiceAddress: string;
        let dstAxelarGasServiceAddress: string;

        let amount: string;

        const pollingOpts = config.evmChain as PollingOptions;

        before(async () => {
            const {
                urls: xrplEvmUrls,
                account: xrplEvmAccount,
                axelarGatewayAddress: xrplEvmGatewayAddress,
                axelarGasServiceAddress: xrplEvmGasServiceAddress,
                axelarExecutableExampleAddress: xrplEvmExecutableAddress,
                name: xrplEvmName,
            } = xrplEvmChain;

            const {
                urls: evmUrls,
                account: evmAccount,
                axelarGatewayAddress: evmGatewayAddress,
                axelarGasServiceAddress: evmGasServiceAddress,
                axelarExecutableExampleAddress: evmExecutableAddress,
                name: evmName,
            } = evmChain;

            sourceJsonProvider = new ethers.JsonRpcProvider(xrplEvmUrls.rpc);
            destinationJsonProvider = new ethers.JsonRpcProvider(evmUrls.rpc);

            sourceEvmProvider = new EthersProvider(sourceJsonProvider);
            destinationEvmProvider = new EthersProvider(destinationJsonProvider);

            sourceWallet = new ethers.Wallet(xrplEvmAccount.privateKey, sourceJsonProvider);
            destinationWallet = new ethers.Wallet(evmAccount.privateKey, destinationJsonProvider);

            sourceEvmSigner = new EthersSigner(sourceWallet, sourceEvmProvider);
            destinationEvmSigner = new EthersSigner(destinationWallet, destinationEvmProvider);

            sourceGatewayContract = new AxelarAmplifierGateway(xrplEvmGatewayAddress, sourceWallet);
            destinationGatewayContract = new AxelarAmplifierGateway(evmGatewayAddress, destinationWallet);

            sourceAxelarExecutableExample = new AxelarExecutableExample(xrplEvmExecutableAddress, sourceWallet);
            destinationAxelarExecutableExample = new AxelarExecutableExample(evmExecutableAddress, destinationWallet);

            srcGateway = xrplEvmGatewayAddress;
            destGateway = evmGatewayAddress;

            srcChain = xrplEvmName;
            destChain = evmName;

            srcAxelarExecutableExampleAddress = xrplEvmExecutableAddress;
            destAxelarExecutableExampleAddress = evmExecutableAddress;

            srcAxelarGasServiceAddress = xrplEvmGasServiceAddress;
            dstAxelarGasServiceAddress = evmGasServiceAddress;

            amount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.gasValue).toString();
        });

        // TODO: not working in devnet, log index not found (not emitting ContractCall event?)
        describeOrSkip(
            "from evm Source chain to evm Destination chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplEvmChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], evmChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should update destination state when a non-empty message is sent", async () => {
                    const payloadTxt = `Hello from the source chain! ${Date.now()}`;
                    await expectMessageUpdate(
                        sourceEvmSigner,
                        destinationAxelarExecutableExample,
                        srcAxelarGasServiceAddress,
                        srcGateway,
                        destChain,
                        destAxelarExecutableExampleAddress,
                        payloadTxt,
                        pollingOpts,
                        amount,
                    );
                });

                it("should update destination state when an empty message is sent", async () => {
                    const payloadTxt = "";
                    await expectMessageUpdate(
                        sourceEvmSigner,
                        destinationAxelarExecutableExample,
                        srcAxelarGasServiceAddress,
                        srcGateway,
                        destChain,
                        destAxelarExecutableExampleAddress,
                        payloadTxt,
                        pollingOpts,
                        amount,
                    );
                });

                it("should emit ContractCall and Executed events when sending a message", async () => {
                    const payloadTxt = `Hello from the source chain! ${Date.now()}`;
                    await expectEventEmission(
                        sourceEvmSigner,
                        srcGateway,
                        srcAxelarGasServiceAddress,
                        destChain,
                        destinationAxelarExecutableExample,
                        destAxelarExecutableExampleAddress,
                        sourceGatewayContract,
                        payloadTxt,
                        sourceWallet.address,
                        pollingOpts,
                        amount,
                    );
                });
            },
        );
        describeOrSkip(
            "from evm Destination chain to evm Source chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplEvmChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], evmChain as unknown as AxelarBridgeChain)
                );
            },
            // TODO: failing in devnet, error while reaching axelar
            () => {
                it("should update source state when a non-empty message is sent", async () => {
                    const payloadTxt = `Hello from the destination chain! ${Date.now()}`;
                    await expectMessageUpdate(
                        destinationEvmSigner,
                        sourceAxelarExecutableExample,
                        dstAxelarGasServiceAddress,
                        destGateway,
                        srcChain,
                        srcAxelarExecutableExampleAddress,
                        payloadTxt,
                        pollingOpts,
                        amount,
                    );
                });

                it("should update source state when an empty message is sent", async () => {
                    const payloadTxt = "";
                    await expectMessageUpdate(
                        destinationEvmSigner,
                        sourceAxelarExecutableExample,
                        dstAxelarGasServiceAddress,
                        destGateway,
                        srcChain,
                        srcAxelarExecutableExampleAddress,
                        payloadTxt,
                        pollingOpts,
                        amount,
                    );
                });

                it("should emit ContractCall and Executed events when sending a message", async () => {
                    const payloadTxt = `Hello from the destination chain! ${Date.now()}`;
                    await expectEventEmission(
                        destinationEvmSigner,
                        destGateway,
                        dstAxelarGasServiceAddress,
                        srcChain,
                        sourceAxelarExecutableExample,
                        srcAxelarExecutableExampleAddress,
                        destinationGatewayContract,
                        payloadTxt,
                        destinationWallet.address,
                        pollingOpts,
                        amount,
                    );
                });
            },
        );
    },
);
