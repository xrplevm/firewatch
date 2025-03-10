import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { ethers, Contract, BigNumberish } from "ethers";
import config from "../../../module.config.example.json";
import { PollingOptions, polling } from "@shared/utils";
import { assertChainEnvironments, assertChainTypes, AssertionErrors, assertRevert } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { InterchainToken, InterchainTokenFactory, InterchainTokenService } from "@shared/evm/contracts";
import { getContractDecodedEvents, pollForEvent } from "@shared/evm/utils";
import BigNumber from "bignumber.js";

describe("Interchain Token Deployment EVM - EVM", () => {
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;
    const pollingOpts = interchainTransferOptions as PollingOptions;

    let sourceJsonProvider: ethers.JsonRpcProvider;
    let destinationJsonProvider: ethers.JsonRpcProvider;
    let sourceEvmProvider: EthersProvider;
    let destinationEvmProvider: EthersProvider;
    let sourceWallet: ethers.Wallet;
    let destinationWallet: ethers.Wallet;
    let sourceEvmSigner: EthersSigner;
    let destinationEvmSigner: EthersSigner;
    let sourceInterchainTokenFactory: InterchainTokenFactory;
    let destinationInterchainTokenFactory: InterchainTokenFactory;
    let sourceInterchainTokenService: InterchainTokenService;
    let destinationInterchainTokenService: InterchainTokenService;
    let destinationInterchainTokenServiceEvent: InterchainTokenService;

    let deployedTokenAddressSource: string;
    let deployedTokenAddressDestination: string;

    let srcChainName: string;
    let destChainName: string;

    let nonce: number;
    nonce = Date.now();

    before(async () => {
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["evm"], destinationChain as unknown as AxelarBridgeChain);

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
            interchainTokenServiceAddressEvent: destTokenServiceAddressEvent,
            interchainTokenFactory: destFactoryAddress,
            name: destName,
        } = destinationChain;

        sourceJsonProvider = new ethers.JsonRpcProvider(sourceUrls.rpc);
        destinationJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

        sourceEvmProvider = new EthersProvider(sourceJsonProvider);
        destinationEvmProvider = new EthersProvider(destinationJsonProvider);

        sourceWallet = new ethers.Wallet(sourceAccount.privateKey, sourceJsonProvider);
        destinationWallet = new ethers.Wallet(destAccount.privateKey, destinationJsonProvider);

        sourceEvmSigner = new EthersSigner(sourceWallet, sourceEvmProvider);
        destinationEvmSigner = new EthersSigner(destinationWallet, destinationEvmProvider);

        sourceInterchainTokenFactory = new InterchainTokenFactory(sourceFactoryAddress, sourceWallet);
        destinationInterchainTokenFactory = new InterchainTokenFactory(destFactoryAddress, destinationWallet);

        sourceInterchainTokenService = new InterchainTokenService(sourceTokenServiceAddress, sourceWallet);
        destinationInterchainTokenService = new InterchainTokenService(destTokenServiceAddress, destinationWallet);
        destinationInterchainTokenServiceEvent = new InterchainTokenService(destTokenServiceAddressEvent, destinationWallet);

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
                "TestToken111",
                "TT1",
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
                        return tokenId && name === "TestToken111" && symbol === "TT1";
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
            deployedTokenAddressSource = tokenDeployedEvent.args.tokenAddress;
            console.log("Recorded source deployed token address:", deployedTokenAddressSource);
        });

        it("should deploy remote interchain token in destination chain and emit InterchainTokenDeployed", async () => {
            const saltStr = `${sourceChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);
            console.log("Using salt string:", saltStr);
            console.log("Computed salt (bytes32):", salt);

            const gasValue = ethers.parseUnits("1", "ether");

            const tx = await sourceInterchainTokenFactory.deployRemoteInterchainToken(salt, destinationChain.name, gasValue, {
                value: ethers.parseUnits("1", "ether"),
            });
            console.log("Remote deployment tx hash:", tx.hash);
            const receipt = await tx.wait();
            console.log("Remote deployment receipt:", receipt);

            let tokenDeployedEvent: any;
            tokenDeployedEvent = await pollForEvent(
                destinationInterchainTokenService as unknown as Contract,
                "InterchainTokenDeployed",
                (decoded) => {
                    const { tokenId, name, symbol } = decoded.args;
                    return Boolean(tokenId) && name === "TestToken111" && symbol === "TT1";
                },
                pollingOpts,
                -1,
            );

            if (!tokenDeployedEvent) {
                throw new Error("TokenDeployed event was not emitted as expected.");
            }
            deployedTokenAddressDestination = tokenDeployedEvent.args.tokenAddress;
        });

        it("should revert when deploying an interchain token with the same salt value", async () => {
            const saltStr = `${sourceChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);

            await assertRevert(
                sourceInterchainTokenFactory.deployInterchainToken(
                    salt,
                    "TestToken111",
                    "TT1",
                    18,
                    ethers.parseUnits("1000", 18),
                    sourceWallet.address,
                ),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });

        it("should revert when deploying a remote interchain token with the same salt value", async () => {
            const saltStr = `${sourceChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);

            const gasValue = ethers.parseUnits("1", "ether");

            await assertRevert(
                sourceInterchainTokenFactory.deployRemoteInterchainToken(salt, destinationChain.name, gasValue, {
                    value: ethers.parseUnits("1", "ether"),
                }),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });

        describe("Token Transfers", () => {
            let sourceToken: InterchainToken;
            let destinationToken: InterchainToken;

            before(() => {
                if (!deployedTokenAddressSource || !deployedTokenAddressDestination) {
                    throw new Error("Deployed token addresses are not registered.");
                }

                sourceToken = new InterchainToken(deployedTokenAddressSource, sourceWallet);
                destinationToken = new InterchainToken(deployedTokenAddressDestination, destinationWallet);
            });

            it("should transfer tokens from Source to Destination via interchainTransfer", async () => {
                const transferAmountStr = "100";
                const transferAmount = ethers.parseUnits(transferAmountStr, 18);

                const initialDestBalanceRaw = await destinationToken.balanceOf(destinationWallet.address);
                const initialDestBalance = new BigNumber(initialDestBalanceRaw.toString());
                console.log("Initial destination balance:", initialDestBalance.toString());

                const recipientBytes = ethers.zeroPadBytes(destinationWallet.address, 20);
                console.log("Transfer parameters:", destinationChain.name, recipientBytes, transferAmount.toString(), "0x");

                const tx = await sourceToken.interchainTransfer(destinationChain.name, recipientBytes, transferAmount, "0x");
                console.log("Transfer tx hash (source -> destination):", tx.hash);
                await tx.wait();

                await polling(
                    async () => {
                        const currentBalanceRaw = await destinationToken.balanceOf(destinationWallet.address);
                        const currentBalance = new BigNumber(currentBalanceRaw.toString());
                        return currentBalance.eq(initialDestBalance.plus(new BigNumber(transferAmount.toString())));
                    },
                    (result) => !result,
                    pollingOpts,
                );
            });

            it("should revert when attempting to transfer 0 tokens from Source to Destination", async () => {
                const transferAmount = ethers.parseUnits("0", 18);
                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);

                await assertRevert(
                    sourceToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x"),
                    AssertionErrors.UNKNOWN_CUSTOM_ERROR,
                );
            });

            it("should transfer tokens from Destination to Source via interchainTransfer", async () => {
                const transferAmountStr = "2";
                const transferAmount = ethers.parseUnits(transferAmountStr, 18);

                const initialSourceBalanceRaw = await sourceToken.balanceOf(sourceWallet.address);
                const initialSourceBalance = new BigNumber(initialSourceBalanceRaw.toString());
                console.log("Initial source balance:", initialSourceBalance.toString());

                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);
                const tx = await destinationToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x");
                console.log("Transfer tx hash (destination -> source):", tx.hash);
                await tx.wait();

                await polling(
                    async () => {
                        const currentBalanceRaw = await sourceToken.balanceOf(sourceWallet.address);
                        const currentBalance = new BigNumber(currentBalanceRaw.toString());
                        return currentBalance.eq(initialSourceBalance.plus(new BigNumber(transferAmount.toString())));
                    },
                    (result) => !result,
                    pollingOpts,
                );
            });

            it("should revert when attempting to transfer 0 tokens from Destination to Source", async () => {
                const transferAmount = ethers.parseUnits("0", 18);
                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);

                await assertRevert(
                    destinationToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x"),
                    AssertionErrors.UNKNOWN_CUSTOM_ERROR,
                );
            });
        });
    });

    describe("from evm Destination chain to evm Source chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should deploy a new interchain token in destination chain and emit the correct event", async () => {
            const saltStr = `${destinationChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);
            console.log("abans");
            const tx = await destinationInterchainTokenFactory.deployInterchainToken(
                salt,
                "TestToken111",
                "TT1",
                18,
                ethers.parseUnits("1000", 18),
                destinationWallet.address,
            );
            console.log("despres");

            const receipt = await tx.wait();
            console.log({ receipt });

            let tokenDeployedEvent: any;
            await polling(
                async () => {
                    const decodedEvents = await getContractDecodedEvents(
                        destinationInterchainTokenServiceEvent as unknown as Contract,
                        "InterchainTokenDeployed",
                        -1,
                    );
                    console.log("Decoded events from destination token service: AAc :", decodedEvents);

                    tokenDeployedEvent = decodedEvents.find((decoded) => {
                        const { tokenId, tokenAddress, minter, name, symbol, decimals } = decoded.args;
                        console.log("Event candidate:", { tokenId, tokenAddress, minter, name, symbol, decimals });
                        return tokenId && name === "TestToken111" && symbol === "TT1";
                    });
                    return Boolean(tokenDeployedEvent);
                },
                (result) => !result,
                pollingOpts,
            );
            if (!tokenDeployedEvent) {
                throw new Error("TokenDeployed event was not emitted as expected.");
            }
            deployedTokenAddressDestination = tokenDeployedEvent.args.tokenAddress;
            console.log("Recorded destination deployed token address:", deployedTokenAddressDestination);
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
                        return tokenId && name === "TestToken111" && symbol === "TT1";
                    });
                    return Boolean(tokenDeployedEvent);
                },
                (result) => !result,
                pollingOpts,
            );

            if (!tokenDeployedEvent) {
                throw new Error("Remote InterchainTokenDeployed event was not emitted as expected.");
            }
            deployedTokenAddressSource = tokenDeployedEvent.args.tokenAddress;
            console.log("Recorded source deployed token address:", deployedTokenAddressSource);
        });

        it("should revert when deploying an interchain token with the same salt value", async () => {
            const saltStr = `${destinationChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);

            await assertRevert(
                destinationInterchainTokenFactory.deployInterchainToken(
                    salt,
                    "TestToken111",
                    "TT1",
                    18,
                    ethers.parseUnits("1000", 18),
                    destinationWallet.address,
                ),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });

        it("should revert when deploying a remote interchain token with the same salt value", async () => {
            const saltStr = `${destinationChain.saltTokenFactory}_${nonce}`;
            const salt = ethers.id(saltStr);

            const gasValue = ethers.parseUnits("0.1", "ether");

            await assertRevert(
                destinationInterchainTokenFactory.deployRemoteInterchainToken(salt, sourceChain.name, gasValue, {
                    value: ethers.parseUnits("0.1", "ether"),
                }),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });

        describe("Token Transfers", () => {
            let sourceToken: InterchainToken;
            let destinationToken: InterchainToken;

            before(() => {
                if (!deployedTokenAddressSource || !deployedTokenAddressDestination) {
                    throw new Error("Deployed token addresses are not registered.");
                }

                sourceToken = new InterchainToken(deployedTokenAddressSource, sourceWallet);
                destinationToken = new InterchainToken(deployedTokenAddressDestination, destinationWallet);
            });

            it("should transfer tokens from Destination to Source via interchainTransfer", async () => {
                const transferAmountStr = "100";
                const transferAmount = ethers.parseUnits(transferAmountStr, 18);

                const initialSourceBalanceRaw = await sourceToken.balanceOf(sourceWallet.address);
                const initialSourceBalance = new BigNumber(initialSourceBalanceRaw.toString());
                console.log("Initial source balance:", initialSourceBalance.toString());
                console.log("token address destination : ", await destinationToken.getAddress());

                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);
                const tx = await destinationToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x");
                console.log("Transfer tx hash (destination -> source):", tx.hash);
                await tx.wait();

                await polling(
                    async () => {
                        const currentBalanceRaw = await sourceToken.balanceOf(sourceWallet.address);
                        const currentBalance = new BigNumber(currentBalanceRaw.toString());
                        return currentBalance.eq(initialSourceBalance.plus(new BigNumber(transferAmount.toString())));
                    },
                    (result) => !result,
                    pollingOpts,
                );
            });

            it("should revert when attempting to transfer 0 tokens from Destination to Source", async () => {
                const transferAmount = ethers.parseUnits("0", 18);
                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);

                await assertRevert(
                    destinationToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x"),
                    AssertionErrors.UNKNOWN_CUSTOM_ERROR,
                );
            });

            it("should transfer tokens from Source to Destination via interchainTransfer", async () => {
                const transferAmountStr = "2";
                const transferAmount = ethers.parseUnits(transferAmountStr, 18);

                console.log("token address source : ", await sourceToken.getAddress());

                const initialDestBalanceRaw = await destinationToken.balanceOf(destinationWallet.address);
                const initialDestBalance = new BigNumber(initialDestBalanceRaw.toString());
                console.log("Initial destination balance:", initialDestBalance.toString());

                const recipientBytes = ethers.zeroPadBytes(destinationWallet.address, 20);
                const tx = await sourceToken.interchainTransfer(destinationChain.name, recipientBytes, transferAmount, "0x");
                console.log("Transfer tx hash (source -> destination):", tx.hash);
                await tx.wait();

                await polling(
                    async () => {
                        const currentBalanceRaw = await destinationToken.balanceOf(destinationWallet.address);
                        const currentBalance = new BigNumber(currentBalanceRaw.toString());
                        return currentBalance.eq(initialDestBalance.plus(new BigNumber(transferAmount.toString())));
                    },
                    (result) => !result,
                    pollingOpts,
                );

                const finalDestBalanceRaw = await destinationToken.balanceOf(destinationWallet.address);
                const finalDestBalance = new BigNumber(finalDestBalanceRaw.toString());
                console.log("Final destination balance:", finalDestBalance.toString());
                const expectedDestBalance = initialDestBalance.plus(new BigNumber(transferAmount.toString()));
                if (!finalDestBalance.eq(expectedDestBalance)) {
                    throw new Error(
                        `Destination balance mismatch! Expected: ${expectedDestBalance.toString()}, Actual: ${finalDestBalance.toString()}`,
                    );
                }
            });

            it("should revert when attempting to transfer 0 tokens from Source to Destination", async () => {
                const transferAmount = ethers.parseUnits("0", 18);
                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);

                await assertRevert(
                    sourceToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x"),
                    AssertionErrors.UNKNOWN_CUSTOM_ERROR,
                );
            });
        });
    });
});
