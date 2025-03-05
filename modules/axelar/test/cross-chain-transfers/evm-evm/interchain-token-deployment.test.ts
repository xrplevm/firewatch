import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, Contract, BigNumberish } from "ethers";
import config from "../../../module.config.example.json";
import { PollingOptions, polling } from "@shared/utils";
import { assertChainEnvironments, assertChainTypes, AssertionErrors, assertRevert } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { InterchainTokenFactory, InterchainTokenService } from "@shared/evm/contracts";
import { getContractDecodedEvents } from "@shared/evm/utils";

describe("Interchain Token Deployment EVM - EVM", () => {
    // Destructure configuration for easy access
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;
    const pollingOpts = interchainTransferOptions as PollingOptions;

    // Providers & Signers
    let sourceJsonProvider: ethers.JsonRpcProvider;
    let destinationJsonProvider: ethers.JsonRpcProvider;
    let sourceEvmProvider: EthersProvider;
    let destinationEvmProvider: EthersProvider;
    let sourceWallet: ethers.Wallet;
    let destinationWallet: ethers.Wallet;
    let sourceEvmSigner: EthersSigner;
    let destinationEvmSigner: EthersSigner;

    // Contract Factories
    let sourceInterchainTokenFactory: InterchainTokenFactory;
    let destinationInterchainTokenFactory: InterchainTokenFactory;

    let sourceInterchainTokenService: InterchainTokenService;
    let destinationInterchainTokenService: InterchainTokenService;

    // Chain names (for test use)
    let srcChainName: string;
    let destChainName: string;

    // Nonce for salt control
    let nonce: number;
    nonce = 321654;

    before(async () => {
        // Validate that both chains are of type EVM
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["evm"], destinationChain as unknown as AxelarBridgeChain);

        // Destructure frequently used properties from chain configs
        const {
            urls: sourceUrls,
            account: sourceAccount,
            interchainTokenFactory: sourceFactoryAddress,
            interchainTokenServiceAddress: sourceTokenServiceAddress,
            name: sourceName,
            saltTokenFactory,
        } = sourceChain;
        const {
            urls: destUrls,
            account: destAccount,
            interchainTokenServiceAddress: destTokenServiceAddress,
            interchainTokenFactory: destFactoryAddress,
            name: destName,
        } = destinationChain;

        // Initialize JSON-RPC providers for source and destination chains
        sourceJsonProvider = new ethers.JsonRpcProvider(sourceUrls.rpc);
        destinationJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

        // Wrap the JSON-RPC providers into your custom EthersProvider
        sourceEvmProvider = new EthersProvider(sourceJsonProvider);
        destinationEvmProvider = new EthersProvider(destinationJsonProvider);

        // Create wallets using the JSON-RPC providers
        sourceWallet = new ethers.Wallet(sourceAccount.privateKey, sourceJsonProvider);
        destinationWallet = new ethers.Wallet(destAccount.privateKey, destinationJsonProvider);

        // Initialize EVM signers based on the wallets
        sourceEvmSigner = new EthersSigner(sourceWallet, sourceEvmProvider);
        destinationEvmSigner = new EthersSigner(destinationWallet, destinationEvmProvider);

        // Instantiate the Interchain Token Factory contracts on both chains
        sourceInterchainTokenFactory = new InterchainTokenFactory(sourceFactoryAddress, sourceWallet);
        destinationInterchainTokenFactory = new InterchainTokenFactory(destFactoryAddress, destinationWallet);

        // Instantiate the Interchain Token Service contract (destination chain)
        sourceInterchainTokenService = new InterchainTokenService(sourceTokenServiceAddress, sourceWallet);
        destinationInterchainTokenService = new InterchainTokenService(destTokenServiceAddress, destinationWallet);

        // Set chain names for use in tests or logging
        srcChainName = sourceName;
        destChainName = destName;
    });

    describe("from evm Source chain to evm Destination chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should deploy a new interchain token in source chain and emit InterchainTokenDeployed", async () => {
            const saltStr = `${sourceChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);
            console.log("Using salt string:", saltStr);
            console.log("Computed salt (bytes32):", salt);

            const tx = await sourceInterchainTokenFactory.deployInterchainToken(
                salt,
                "TestToken777",
                "TT7",
                18,
                ethers.parseUnits("1000", 18),
                sourceWallet.address,
            );
            console.log("Transaction hash:", tx.hash);
            const receipt = await tx.wait();
            console.log("Transaction receipt:", receipt);

            let tokenDeployedEvent: any;
            let tokenAddressout: any;
            await polling(
                async () => {
                    const decodedEvents = await getContractDecodedEvents(
                        sourceInterchainTokenService as unknown as Contract,
                        "InterchainTokenDeployed",
                        receipt?.blockNumber,
                        "latest",
                    );
                    console.log("Decoded events from block", receipt!.blockNumber, ":", decodedEvents);
                    tokenDeployedEvent = decodedEvents.find((decoded) => {
                        const { tokenId, tokenAddress, minter, name, symbol, decimals } = decoded.args;
                        console.log("Event candidate:", { tokenId, tokenAddress, minter, name, symbol, decimals });
                        tokenAddressout = tokenAddress;
                        return tokenId && name === "TestToken777" && symbol === "TT7";
                    });
                    console.log("Matching event (if any):", tokenDeployedEvent);
                    return Boolean(tokenDeployedEvent);
                },
                (result) => !result,
                pollingOpts,
            );
            console.log({ tokenAddressout });
            if (!tokenDeployedEvent) {
                throw new Error("TokenDeployed event was not emitted as expected.");
            }
            const eventTokenId = tokenDeployedEvent.args.tokenId;
            console.log("Deployed Token ID (from event):", eventTokenId);
        });

        it("should deploy remote interchain token in destination chain and emit InterchainTokenDeployed", async () => {
            const saltStr = `${sourceChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);
            console.log("Using salt string:", saltStr);
            console.log("Computed salt (bytes32):", salt);

            const gasValue = ethers.parseUnits("0.1", "ether");

            const tx = await sourceInterchainTokenFactory.deployRemoteInterchainToken(salt, destinationChain.name, gasValue, {
                value: ethers.parseUnits("0.1", "ether"),
            });
            console.log("Remote deployment tx hash:", tx.hash);
            const receipt = await tx.wait();
            console.log("Remote deployment receipt:", receipt);

            let tokenDeployedEvent: any;
            await polling(
                async () => {
                    const decodedEvents = await getContractDecodedEvents(
                        destinationInterchainTokenService as unknown as Contract,
                        "InterchainTokenDeployed",
                        -1,
                    );
                    console.log("Decoded events from block", receipt!.blockNumber, "to latest:", decodedEvents);

                    tokenDeployedEvent = decodedEvents.find((decoded) => {
                        const { tokenId, tokenAddress, minter, name, symbol, decimals } = decoded.args;
                        console.log("Event candidate:", { tokenId, tokenAddress, minter, name, symbol, decimals });
                        return tokenId && name === "TestToken777" && symbol === "TT7";
                    });
                    console.log("Matching event (if any):", tokenDeployedEvent);
                    return Boolean(tokenDeployedEvent);
                },
                (result) => !result,
                pollingOpts,
            );

            if (!tokenDeployedEvent) {
                throw new Error("Remote InterchainTokenDeployed event was not emitted as expected.");
            }
            const eventTokenId = tokenDeployedEvent.args.tokenId;
            console.log("Remote Deployed Token ID (from event):", eventTokenId);
        });

        it("should revert when deploying an interchain token with the same salt value", async () => {
            const saltStr = `${sourceChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);

            await assertRevert(
                sourceInterchainTokenFactory.deployInterchainToken(
                    salt,
                    "TestToken777",
                    "TT7",
                    18,
                    ethers.parseUnits("1000", 18),
                    sourceWallet.address,
                ),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });
    });

    describe("from evm Destination chain to evm Source chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should deploy a new interchain token and emit the correct event", async () => {
            const saltStr = `${destinationChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);

            await destinationInterchainTokenFactory.deployInterchainToken(
                salt,
                "TestToken777",
                "TT7",
                18,
                ethers.parseUnits("1000", 18),
                destinationWallet.address,
            );

            let tokenDeployedEvent: any;
            await polling(
                async () => {
                    const decodedEvents = await getContractDecodedEvents(
                        destinationInterchainTokenService as unknown as Contract,
                        "InterchainTokenDeployed",
                        -1,
                    );
                    tokenDeployedEvent = decodedEvents.find((decoded) => {
                        const { tokenId, tokenAddress, minter, name, symbol, decimals } = decoded.args;
                        console.log("Event candidate:", { tokenId, tokenAddress, minter, name, symbol, decimals });
                        return tokenId && name === "TestToken777" && symbol === "TT7";
                    });
                    return Boolean(tokenDeployedEvent);
                },
                (result) => !result,
                pollingOpts,
            );
            if (!tokenDeployedEvent) {
                throw new Error("TokenDeployed event was not emitted as expected.");
            }
        });

        it("should deploy remote interchain token and emit the correct event", async () => {
            const saltStr = `${destinationChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);

            const gasValue = ethers.parseUnits("0.1", "ether");

            await destinationInterchainTokenFactory.deployRemoteInterchainToken(salt, sourceChain.name, gasValue, {
                value: gasValue,
            });

            let tokenDeployedEvent: any;
            await polling(
                async () => {
                    const decodedEvents = await getContractDecodedEvents(
                        sourceInterchainTokenService as unknown as Contract,
                        "InterchainTokenDeployed",
                        -1,
                    );

                    tokenDeployedEvent = decodedEvents.find((decoded) => {
                        const { tokenId, tokenAddress, minter, name, symbol, decimals } = decoded.args;
                        console.log("Event candidate:", { tokenId, tokenAddress, minter, name, symbol, decimals });
                        return tokenId && name === "TestToken777" && symbol === "TT7";
                    });
                    return Boolean(tokenDeployedEvent);
                },
                (result) => !result,
                pollingOpts,
            );

            if (!tokenDeployedEvent) {
                throw new Error("Remote InterchainTokenDeployed event was not emitted as expected.");
            }
        });
    });

    it("should revert when deploying an interchain token with the same salt value", async () => {
        const saltStr = `${destinationChain.saltTokenFactory}_${nonce}`;
        const salt = ethers.id(saltStr);

        await assertRevert(
            destinationInterchainTokenFactory.deployInterchainToken(
                salt,
                "TestToken777",
                "TT7",
                18,
                ethers.parseUnits("1000", 18),
                destinationWallet.address,
            ),
            AssertionErrors.UNKNOWN_CUSTOM_ERROR,
        );
    });
});
