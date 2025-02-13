import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, AbiCoder } from "ethers";
import config from "../../../module.config.example.json";
import { polling, PollingOptions } from "@shared/utils";
import { CallContract, AxelarAmplifierGateway } from "../../../../../packages/shared/evm/src/contracts";

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
    });

    describe("State Updates", () => {
        it("should send and execute message, updating state on the destination chain", async () => {
            const message = `Hello from the source chain! ${Date.now()}`;
            const sourceGateWayAddress = config.axelar.sourceChain.axelarGatewayAddress;
            const destinationChain = config.axelar.destinationChain.name;
            const destinationAddress = config.axelar.destinationChain.callContractAddress;

            const abiCoder = new AbiCoder();
            const payload = abiCoder.encode(["string"], [message]);

            await sourceEvmSigner.callContract(sourceGateWayAddress, destinationChain, destinationAddress, payload);

            let finalMessage: string;

            await polling(
                async () => {
                    finalMessage = await destinationCallContract.message();
                    return finalMessage === message;
                },
                (res) => !res,
                config.axelar.interchainTransferOptions as PollingOptions,
            );
        });
    });

    describe("Event Emission", () => {
        it("should emit ContractCall and Executed events when sending a message", async () => {
            const message = `Hello from the source chain! ${Date.now()}`;
            const sourceGateWayAddress = config.axelar.sourceChain.axelarGatewayAddress;
            const destinationChain = config.axelar.destinationChain.name;
            const destinationAddress = config.axelar.destinationChain.callContractAddress;

            const abiCoder = new ethers.AbiCoder();
            const payload = abiCoder.encode(["string"], [message]);
            const payloadHashSent = ethers.keccak256(payload);

            await sourceEvmSigner.callContract(sourceGateWayAddress, destinationChain, destinationAddress, payload);

            const filterContractCall = sourceGatewayContract.filters.ContractCall();

            await polling(
                async () => {
                    const events = await sourceGatewayContract.queryFilter(filterContractCall, -1);
                    const matchingEvent = events.find((event) => {
                        const decodedEvent = sourceGatewayContract.interface.parseLog(event);
                        return (
                            decodedEvent?.args.payloadHash === payloadHashSent &&
                            decodedEvent?.args.destinationChain === destinationChain &&
                            decodedEvent?.args.destinationContractAddress === destinationAddress
                        );
                    });

                    return Boolean(matchingEvent);
                },
                (result) => !result, // Continue polling if no matching event is found
                config.axelar.interchainTransferOptions as PollingOptions,
            );

            const filterExecuted = destinationCallContract.filters.Executed();
            await polling(
                async () => {
                    const events = await destinationCallContract.queryFilter(filterExecuted, -1);

                    const matchingEvent = events.find((event) => {
                        const decodedEvent = destinationCallContract.interface.parseLog(event);

                        return decodedEvent?.args._message === message && decodedEvent?.args._from === sourceWallet.address;
                    });

                    return Boolean(matchingEvent);
                },
                (result) => !result, // Continue polling if no matching event is found
                config.axelar.interchainTransferOptions as PollingOptions,
            );
        });
    });
});
