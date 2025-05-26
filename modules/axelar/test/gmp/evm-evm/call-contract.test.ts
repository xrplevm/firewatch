import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { PollingOptions } from "@shared/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { AxelarExecutable, AxelarAmplifierGateway } from "@shared/evm/contracts";
import { callContractAndExpectMessageUpdate, callContractAndExpectEventEmission } from "./call-contract.helpers";
import { describeOrSkip } from "@testing/mocha/utils";

// TODO: addNativeGas function doesn't work every time.
describeOrSkip(
    "call contract evm - evm",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["evm"], config.evmChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["devnet", "testnet", "mainnet"], config.evmChain as unknown as AxelarBridgeChain)
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

        let sourceAxelarExecutable: AxelarExecutable;
        let destinationAxelarExecutable: AxelarExecutable;
        let sourceGatewayContract: AxelarAmplifierGateway;
        let destinationGatewayContract: AxelarAmplifierGateway;

        let srcGateway: string;
        let destGateway: string;
        let srcChain: string;
        let destChain: string;
        let srcAxelarExecutableAddress: string;
        let destAxelarExecutableAddress: string;
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

            sourceAxelarExecutable = new AxelarExecutable(xrplEvmExecutableAddress, sourceWallet);
            destinationAxelarExecutable = new AxelarExecutable(evmExecutableAddress, destinationWallet);

            srcGateway = xrplEvmGatewayAddress;
            destGateway = evmGatewayAddress;

            srcChain = xrplEvmName;
            destChain = evmName;

            srcAxelarExecutableAddress = xrplEvmExecutableAddress;
            destAxelarExecutableAddress = evmExecutableAddress;

            srcAxelarGasServiceAddress = xrplEvmGasServiceAddress;
            dstAxelarGasServiceAddress = evmGasServiceAddress;

            amount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.gasValue).toString();
        });

        // TODO: not working in devnet, log index not found (not emitting ContractCall event?)
        describe("from evm source chain to evm destination chain", () => {
            it("should update destination state when a non-empty message is sent", async () => {
                const payloadTxt = `Hello from the source chain! ${Date.now()}`;
                await callContractAndExpectMessageUpdate(
                    sourceEvmSigner,
                    destinationAxelarExecutable,
                    srcAxelarGasServiceAddress,
                    srcGateway,
                    destChain,
                    destAxelarExecutableAddress,
                    payloadTxt,
                    pollingOpts,
                    amount,
                );
            });

            it("should update destination state when an empty message is sent", async () => {
                const payloadTxt = "";
                await callContractAndExpectMessageUpdate(
                    sourceEvmSigner,
                    destinationAxelarExecutable,
                    srcAxelarGasServiceAddress,
                    srcGateway,
                    destChain,
                    destAxelarExecutableAddress,
                    payloadTxt,
                    pollingOpts,
                    amount,
                );
            });

            it("should emit contractcall and executed events when sending a message", async () => {
                const payloadTxt = `Hello from the source chain! ${Date.now()}`;
                await callContractAndExpectEventEmission(
                    sourceEvmSigner,
                    srcGateway,
                    srcAxelarGasServiceAddress,
                    destChain,
                    destinationAxelarExecutable,
                    destAxelarExecutableAddress,
                    sourceGatewayContract,
                    payloadTxt,
                    sourceWallet.address,
                    pollingOpts,
                    amount,
                );
            });
        });

        describe("from evm destination chain to evm source chain", () => {
            it("should update source state when a non-empty message is sent", async () => {
                const payloadTxt = `Hello from the destination chain! ${Date.now()}`;
                await callContractAndExpectMessageUpdate(
                    destinationEvmSigner,
                    sourceAxelarExecutable,
                    dstAxelarGasServiceAddress,
                    destGateway,
                    srcChain,
                    srcAxelarExecutableAddress,
                    payloadTxt,
                    pollingOpts,
                    amount,
                );
            });

            it("should update source state when an empty message is sent", async () => {
                const payloadTxt = "";
                await callContractAndExpectMessageUpdate(
                    destinationEvmSigner,
                    sourceAxelarExecutable,
                    dstAxelarGasServiceAddress,
                    destGateway,
                    srcChain,
                    srcAxelarExecutableAddress,
                    payloadTxt,
                    pollingOpts,
                    amount,
                );
            });

            it("should emit contractcall and executed events when sending a message", async () => {
                const payloadTxt = `Hello from the destination chain! ${Date.now()}`;
                await callContractAndExpectEventEmission(
                    destinationEvmSigner,
                    destGateway,
                    dstAxelarGasServiceAddress,
                    srcChain,
                    sourceAxelarExecutable,
                    srcAxelarExecutableAddress,
                    destinationGatewayContract,
                    payloadTxt,
                    destinationWallet.address,
                    pollingOpts,
                    amount,
                );
            });
        });
    },
);
