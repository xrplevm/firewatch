import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { PollingOptions } from "@shared/utils";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { CallContract, AxelarAmplifierGateway } from "@shared/evm/contracts";
import { expectMessageUpdate, expectEventEmission } from "./call-contract.helpers";

describe.skip("CallContract EVM - EVM", () => {
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;

    let sourceEvmProvider: EthersProvider;
    let destinationEvmProvider: EthersProvider;

    let sourceEvmSigner: EthersSigner;
    let destinationEvmSigner: EthersSigner;

    let sourceJsonProvider: ethers.JsonRpcProvider;
    let destinationJsonProvider: ethers.JsonRpcProvider;

    let sourceWallet: ethers.Wallet;
    let destinationWallet: ethers.Wallet;

    let sourceCallContract: CallContract;
    let destinationCallContract: CallContract;
    let sourceGatewayContract: AxelarAmplifierGateway;
    let destinationGatewayContract: AxelarAmplifierGateway;

    let srcGateway: string;
    let destGateway: string;
    let srcChain: string;
    let destChain: string;
    let srcCallContract: string;
    let destCall: string;

    const pollingOpts = interchainTransferOptions as PollingOptions;

    before(async () => {
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["evm"], destinationChain as unknown as AxelarBridgeChain);

        // Destructure frequently used properties
        const { urls, account, axelarGatewayAddress, callContractAddress, name } = sourceChain;
        const {
            urls: destUrls,
            account: destAccount,
            axelarGatewayAddress: destAxelarGatewayAddress,
            callContractAddress: destCallContractAddress,
            name: destName,
        } = destinationChain;

        sourceJsonProvider = new ethers.JsonRpcProvider(urls.rpc);
        destinationJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

        sourceEvmProvider = new EthersProvider(sourceJsonProvider);
        destinationEvmProvider = new EthersProvider(destinationJsonProvider);

        sourceWallet = new ethers.Wallet(account.privateKey, sourceJsonProvider);
        destinationWallet = new ethers.Wallet(destAccount.privateKey, destinationJsonProvider);

        sourceEvmSigner = new EthersSigner(sourceWallet, sourceEvmProvider);
        destinationEvmSigner = new EthersSigner(destinationWallet, destinationEvmProvider);

        sourceCallContract = new CallContract(callContractAddress, sourceWallet);
        destinationCallContract = new CallContract(destCallContractAddress, destinationWallet);
        sourceGatewayContract = new AxelarAmplifierGateway(axelarGatewayAddress, sourceWallet);
        destinationGatewayContract = new AxelarAmplifierGateway(destAxelarGatewayAddress, destinationWallet);

        srcGateway = axelarGatewayAddress;
        destGateway = destAxelarGatewayAddress;
        srcChain = name;
        destChain = destName;
        srcCallContract = callContractAddress;
        destCall = destCallContractAddress;
    });

    describe("from evm Source chain to evm Destination chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should update destination state when a non-empty message is sent", async () => {
            const msgText = `Hello from the source chain! ${Date.now()}`;
            await expectMessageUpdate(sourceEvmSigner, destinationCallContract, srcGateway, destChain, destCall, msgText, pollingOpts);
        });

        it("should update destination state when an empty message is sent", async () => {
            const msgText = "";
            await expectMessageUpdate(sourceEvmSigner, destinationCallContract, srcGateway, destChain, destCall, msgText, pollingOpts);
        });

        it("should emit ContractCall and Executed events when sending a message", async () => {
            const msgText = `Hello from the source chain! ${Date.now()}`;
            await expectEventEmission(
                sourceEvmSigner,
                srcGateway,
                destChain,
                destinationCallContract,
                destCall,
                sourceGatewayContract,
                msgText,
                sourceWallet.address,
                pollingOpts,
            );
        });
    });

    describe("from evm Destination chain to evm Source chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should update source state when a non-empty message is sent", async () => {
            const msgText = `Hello from the destination chain! ${Date.now()}`;
            await expectMessageUpdate(
                destinationEvmSigner,
                sourceCallContract,
                destGateway,
                srcChain,
                srcCallContract,
                msgText,
                pollingOpts,
            );
        });

        it("should update source state when an empty message is sent", async () => {
            const msgText = "";
            await expectMessageUpdate(
                destinationEvmSigner,
                sourceCallContract,
                destGateway,
                srcChain,
                srcCallContract,
                msgText,
                pollingOpts,
            );
        });

        it("should emit ContractCall and Executed events when sending a message", async () => {
            const msgText = `Hello from the destination chain! ${Date.now()}`;
            await expectEventEmission(
                destinationEvmSigner,
                destGateway,
                srcChain,
                sourceCallContract,
                srcCallContract,
                destinationGatewayContract,
                msgText,
                destinationWallet.address,
                pollingOpts,
            );
        });
    });
});
