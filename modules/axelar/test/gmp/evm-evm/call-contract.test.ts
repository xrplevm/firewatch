import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { PollingOptions } from "@shared/utils";
import { CallContract, AxelarAmplifierGateway } from "../../../../../packages/shared/evm/src/contracts";
import { testMessageUpdate, testEventEmission } from "./call-contract.helpers";

describe("CallContract", () => {
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

    let srcGateway: string, destGateway: string, srcChain: string, destChain: string, srcCall: string, destCall: string;
    const pollingOpts = config.axelar.interchainTransferOptions as PollingOptions;

    before(async () => {
        sourceJsonProvider = new ethers.JsonRpcProvider(config.axelar.sourceChain.urls.rpc);
        destinationJsonProvider = new ethers.JsonRpcProvider(config.axelar.destinationChain.urls.rpc);

        sourceEvmProvider = new EthersProvider(sourceJsonProvider);
        destinationEvmProvider = new EthersProvider(destinationJsonProvider);

        sourceWallet = new ethers.Wallet(config.axelar.sourceChain.account.privateKey, sourceJsonProvider);
        destinationWallet = new ethers.Wallet(config.axelar.destinationChain.account.privateKey, destinationJsonProvider);

        sourceEvmSigner = new EthersSigner(sourceWallet, sourceEvmProvider);
        destinationEvmSigner = new EthersSigner(destinationWallet, destinationEvmProvider);

        sourceCallContract = new CallContract(config.axelar.sourceChain.callContractAddress, sourceWallet);
        destinationCallContract = new CallContract(config.axelar.destinationChain.callContractAddress, destinationWallet);
        sourceGatewayContract = new AxelarAmplifierGateway(config.axelar.sourceChain.axelarGatewayAddress, sourceWallet);
        destinationGatewayContract = new AxelarAmplifierGateway(config.axelar.destinationChain.axelarGatewayAddress, destinationWallet);

        srcGateway = config.axelar.sourceChain.axelarGatewayAddress;
        destGateway = config.axelar.destinationChain.axelarGatewayAddress;
        srcChain = config.axelar.sourceChain.name;
        destChain = config.axelar.destinationChain.name;
        srcCall = config.axelar.sourceChain.callContractAddress;
        destCall = config.axelar.destinationChain.callContractAddress;
    });

    describe("State Updates", () => {
        it("should update destination state when a non-empty message is sent (SourceChain → DestinationChain)", async () => {
            const msgText = `Hello from the source chain! ${Date.now()}`;
            await testMessageUpdate(sourceEvmSigner, destinationCallContract, srcGateway, destChain, destCall, msgText, pollingOpts);
        });

        it("should update destination state when an empty message is sent (SourceChain → DestinationChain)", async () => {
            const msgText = "";
            await testMessageUpdate(sourceEvmSigner, destinationCallContract, srcGateway, destChain, destCall, msgText, pollingOpts);
        });

        it("should update source state when a non-empty message is sent (DestinationChain → SourceChain)", async () => {
            const msgText = `Hello from the destination chain! ${Date.now()}`;
            await testMessageUpdate(destinationEvmSigner, sourceCallContract, destGateway, srcChain, srcCall, msgText, pollingOpts);
        });

        it("should update source state when an empty message is sent (DestinationChain → SourceChain)", async () => {
            const msgText = "";
            await testMessageUpdate(destinationEvmSigner, sourceCallContract, destGateway, srcChain, srcCall, msgText, pollingOpts);
        });
    });

    describe("Event Emission", () => {
        it("should emit ContractCall and Executed events when sending a message (SourceChain → DestinationChain)", async () => {
            const msgText = `Hello from the source chain! ${Date.now()}`;
            await testEventEmission(
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

        it("should emit ContractCall and Executed events when sending a message (DestinationChain → SourceChain)", async () => {
            const msgText = `Hello from the destination chain! ${Date.now()}`;
            await testEventEmission(
                destinationEvmSigner,
                destGateway,
                srcChain,
                sourceCallContract,
                srcCall,
                destinationGatewayContract,
                msgText,
                destinationWallet.address,
                pollingOpts,
            );
        });
    });
});
