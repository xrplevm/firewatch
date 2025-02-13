import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, AbiCoder } from "ethers";
import config from "../../../module.config.example.json";
import { polling, PollingOptions } from "@shared/utils";
import { CallContract, AxelarAmplifierGateway } from "../../../../../packages/shared/evm/src/contracts";
import { waitForEvent } from "../../../../../packages/shared/evm/src/utils/event-helpers";

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
        // Initialize JSON RPC providers for the source and destination EVM chains
        sourceJsonProvider = new ethers.JsonRpcProvider(config.axelar.sourceChain.urls.rpc);
        destinationJsonProvider = new ethers.JsonRpcProvider(config.axelar.destinationChain.urls.rpc);

        // Initialize EthersProviders
        sourceEvmProvider = new EthersProvider(sourceJsonProvider);
        destinationEvmProvider = new EthersProvider(destinationJsonProvider);

        // Initialize wallets
        sourceWallet = new ethers.Wallet(config.axelar.sourceChain.account.privateKey, sourceJsonProvider);
        destinationWallet = new ethers.Wallet(config.axelar.destinationChain.account.privateKey, destinationJsonProvider);

        // Initialize EthersSigners
        sourceEvmSigner = new EthersSigner(sourceWallet, sourceEvmProvider);
        destinationEvmSigner = new EthersSigner(destinationWallet, destinationEvmProvider);

        // Initialize CallContract instances
        sourceCallContract = new CallContract(config.axelar.sourceChain.callContractAddress, sourceWallet);
        destinationCallContract = new CallContract(config.axelar.destinationChain.callContractAddress, destinationWallet);
        sourceGatewayContract = new AxelarAmplifierGateway(config.axelar.sourceChain.axelarGatewayAddress, sourceWallet);
    });

    // describe("Send and execute message", () => {
    //     it("should emit Executed event and update destination contract state", async () => {
    //         const message = `Hello from the source chain! ${Date.now()}`; // Add counter for unique messages
    //         const sourceGateWayAddress = config.axelar.sourceChain.axelarGatewayAddress;
    //         const destinationChain = config.axelar.destinationChain.name;
    //         const destinationAddress = config.axelar.destinationChain.callContractAddress;

    //         const abiCoder = new AbiCoder();
    //         const payload = abiCoder.encode(["string"], [message]);

    //         await sourceEvmSigner.callContract(sourceGateWayAddress, destinationChain, destinationAddress, payload);

    //         let finalMessage: string;

    //         await polling(
    //             async () => {
    //                 finalMessage = await destinationCallContract.message();
    //                 return finalMessage === message;
    //             },
    //             (res) => !res,
    //             config.axelar.interchainTransferOptions as PollingOptions,
    //         );
    //     });
    // });

    describe("CallContract Event Emission", () => {
        it("should emit ContractCall on source chain and Executed on destination chain", async () => {
            const message = `Hello from the source chain! ${Date.now()}`;
            const sourceGateWayAddress = config.axelar.sourceChain.axelarGatewayAddress;
            const destinationChain = config.axelar.destinationChain.name;
            const destinationAddress = config.axelar.destinationChain.callContractAddress;

            const abiCoder = new AbiCoder();
            const payload = abiCoder.encode(["string"], [message]);
            const payloadHashSent = ethers.keccak256(payload);

            await sourceEvmSigner.callContract(sourceGateWayAddress, destinationChain, destinationAddress, payload);

            // const filter = sourceGatewayContract.filters.ContractCall(null, null, null, null);
            await polling(
                async () => {
                    // Fetch events
                    const filter = sourceGatewayContract.filters.ContractCall(null, null, null, null);
                    const events = await sourceGatewayContract.queryFilter(filter, -1);

                    // Log all fetched events
                    console.log("Fetched Events:", events);

                    // Check if any event matches the criteria
                    const matchingEvent = events.find((event) => {
                        const evt = event as any; // Explicitly type-cast to access args
                        console.log("Inspecting Event:", evt);
                        const decodedEvent = sourceGatewayContract.interface.parseLog(event);
                        console.log("Decoded Event Args:", decodedEvent?.args);

                        if (evt.args) {
                            console.log("Event Args:", evt.args);
                            return evt.args.message === message; // Replace `message` with your specific field/criteria
                        }
                        return false;
                    });

                    if (matchingEvent) {
                        console.log("Matching Event Found:", matchingEvent);
                    } else {
                        console.log("No matching event found.");
                    }

                    return Boolean(matchingEvent);
                },
                (result) => !result, // Continue polling if no matching event is found
                config.axelar.interchainTransferOptions as PollingOptions,
            );
        });
    });
});
