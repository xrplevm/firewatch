import { ethers, Contract } from "ethers";
import config from "../../../module.config.example.json";
import { PollingOptions } from "@shared/utils";
import { assertChainEnvironments, assertChainTypes, AssertionErrors, assertRevert } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { InterchainToken, InterchainTokenFactory, InterchainTokenService } from "@shared/evm/contracts";
import { pollForEvent } from "@shared/evm/utils";
import BigNumber from "bignumber.js";
import { assertInterchainBalanceUpdate } from "./interchain-token.helpers";

describe("Interchain Token Deployment EVM - EVM", () => {
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;
    const pollingOpts = interchainTransferOptions as PollingOptions;

    let sourceJsonProvider: ethers.JsonRpcProvider;
    let destinationJsonProvider: ethers.JsonRpcProvider;
    let sourceWallet: ethers.Wallet;
    let destinationWallet: ethers.Wallet;
    let sourceInterchainTokenFactory: InterchainTokenFactory;
    let destinationInterchainTokenFactory: InterchainTokenFactory;
    let sourceInterchainTokenService: InterchainTokenService;
    let destinationInterchainTokenService: InterchainTokenService;
    let destinationInterchainTokenServiceEvent: InterchainTokenService;

    let deployedTokenAddressSource: string;
    let deployedTokenAddressDestination: string;

    let saltSource: string;
    let saltDestination: string;

    let nonce: number;
    let gasValue: bigint;

    before(async () => {
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["evm"], destinationChain as unknown as AxelarBridgeChain);

        const {
            urls: sourceUrls,
            account: sourceAccount,
            interchainTokenFactory: sourceFactoryAddress,
            interchainTokenServiceAddress: sourceTokenServiceAddress,
        } = sourceChain;
        const {
            urls: destUrls,
            account: destAccount,
            interchainTokenServiceAddress: destTokenServiceAddress,
            interchainTokenServiceAddressEvent: destTokenServiceAddressEvent,
            interchainTokenFactory: destFactoryAddress,
        } = destinationChain;

        sourceJsonProvider = new ethers.JsonRpcProvider(sourceUrls.rpc);
        destinationJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

        sourceWallet = new ethers.Wallet(sourceAccount.privateKey, sourceJsonProvider);
        destinationWallet = new ethers.Wallet(destAccount.privateKey, destinationJsonProvider);

        sourceInterchainTokenFactory = new InterchainTokenFactory(sourceFactoryAddress, sourceWallet);
        destinationInterchainTokenFactory = new InterchainTokenFactory(destFactoryAddress, destinationWallet);

        sourceInterchainTokenService = new InterchainTokenService(sourceTokenServiceAddress, sourceWallet);
        destinationInterchainTokenService = new InterchainTokenService(destTokenServiceAddress, destinationWallet);
        destinationInterchainTokenServiceEvent = new InterchainTokenService(destTokenServiceAddressEvent, destinationWallet);

        nonce = Date.now();
        saltSource = `${sourceChain.saltTokenFactory}_${nonce}`;
        saltSource = ethers.id(saltSource);

        saltDestination = `${destinationChain.saltTokenFactory}_${nonce}`;
        saltDestination = ethers.id(saltDestination);

        // srcChainName = sourceName;
        // destChainName = destName;
        gasValue = ethers.parseUnits(interchainTransferOptions.gasValue, "ether");
    });

    describe("from evm Source chain to evm Destination chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should deploy a new interchain token in source chain and emit InterchainTokenDeployed", async () => {
            await sourceInterchainTokenFactory.deployInterchainToken(
                saltSource,
                "TestToken",
                "TTK",
                18,
                ethers.parseUnits("1000", 18),
                sourceWallet.address,
            );

            const tokenDeployedEvent = await pollForEvent(
                sourceInterchainTokenService as unknown as Contract,
                "InterchainTokenDeployed",
                (decoded) => {
                    const { tokenId, name, symbol } = decoded.args;
                    return Boolean(tokenId) && name === "TestToken" && symbol === "TTK";
                },
                pollingOpts,
                -1,
            );

            if (!tokenDeployedEvent) {
                throw new Error("TokenDeployed event was not emitted as expected.");
            }

            deployedTokenAddressSource = tokenDeployedEvent.args.tokenAddress;
        });

        it("should deploy remote interchain token in destination chain and emit InterchainTokenDeployed", async () => {
            await sourceInterchainTokenFactory.deployRemoteInterchainToken(saltSource, destinationChain.name, gasValue, {
                value: gasValue,
            });

            const tokenDeployedEvent = await pollForEvent(
                destinationInterchainTokenService as unknown as Contract,
                "InterchainTokenDeployed",
                (decoded) => {
                    const { tokenId, name, symbol } = decoded.args;
                    return Boolean(tokenId) && name === "TestToken" && symbol === "TTK";
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
            await assertRevert(
                sourceInterchainTokenFactory.deployInterchainToken(
                    saltSource,
                    "TestToken",
                    "TTK",
                    18,
                    ethers.parseUnits("1000", 18),
                    sourceWallet.address,
                ),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });

        it("should revert when deploying a remote interchain token with the same salt value", async () => {
            await assertRevert(
                sourceInterchainTokenFactory.deployRemoteInterchainToken(saltSource, destinationChain.name, gasValue, {
                    value: gasValue,
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

                const recipientBytes = ethers.zeroPadBytes(destinationWallet.address, 20);

                await sourceToken.interchainTransfer(destinationChain.name, recipientBytes, transferAmount, "0x");

                await assertInterchainBalanceUpdate(
                    destinationToken,
                    destinationWallet.address,
                    initialDestBalance,
                    new BigNumber(transferAmount.toString()),
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

                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);
                await destinationToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x");

                await assertInterchainBalanceUpdate(
                    sourceToken,
                    sourceWallet.address,
                    initialSourceBalance,
                    new BigNumber(transferAmount.toString()),
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
            await destinationInterchainTokenFactory.deployInterchainToken(
                saltDestination,
                "TestToken",
                "TTK",
                18,
                ethers.parseUnits("1000", 18),
                destinationWallet.address,
            );

            const tokenDeployedEvent = await pollForEvent(
                destinationInterchainTokenServiceEvent as unknown as Contract, // TODO: notice the usage of a different InterchainTokenService, meaning Avalanche-fuji has its InterchainTokenFactory connected to an old InterchainTokenService
                "InterchainTokenDeployed",
                (decoded) => {
                    const { tokenId, name, symbol } = decoded.args;
                    return Boolean(tokenId) && name === "TestToken" && symbol === "TTK";
                },
                pollingOpts,
                -1,
            );
            if (!tokenDeployedEvent) {
                throw new Error("TokenDeployed event was not emitted as expected.");
            }
            deployedTokenAddressDestination = tokenDeployedEvent.args.tokenAddress;
        });

        it("should deploy remote interchain token and emit the correct event", async () => {
            await destinationInterchainTokenFactory.deployRemoteInterchainToken(saltDestination, sourceChain.name, gasValue, {
                value: gasValue,
            });

            const tokenDeployedEvent = await pollForEvent(
                sourceInterchainTokenService as unknown as Contract,
                "InterchainTokenDeployed",
                (decoded) => {
                    const { tokenId, name, symbol } = decoded.args;
                    return Boolean(tokenId) && name === "TestToken" && symbol === "TTK";
                },
                pollingOpts,
                -1,
            );

            if (!tokenDeployedEvent) {
                throw new Error("Remote InterchainTokenDeployed event was not emitted as expected.");
            }

            deployedTokenAddressSource = tokenDeployedEvent.args.tokenAddress;
        });

        it("should revert when deploying an interchain token with the same salt value", async () => {
            await assertRevert(
                destinationInterchainTokenFactory.deployInterchainToken(
                    saltDestination,
                    "TestToken",
                    "TTK",
                    18,
                    ethers.parseUnits("1000", 18),
                    destinationWallet.address,
                ),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });

        it("should revert when deploying a remote interchain token with the same salt value", async () => {
            await assertRevert(
                destinationInterchainTokenFactory.deployRemoteInterchainToken(saltDestination, sourceChain.name, gasValue, {
                    value: gasValue,
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

                const recipientBytes = ethers.zeroPadBytes(sourceWallet.address, 20);

                await destinationToken.interchainTransfer(sourceChain.name, recipientBytes, transferAmount, "0x");

                await assertInterchainBalanceUpdate(
                    sourceToken,
                    sourceWallet.address,
                    initialSourceBalance,
                    new BigNumber(transferAmount.toString()),
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

                const initialDestBalanceRaw = await destinationToken.balanceOf(destinationWallet.address);
                const initialDestBalance = new BigNumber(initialDestBalanceRaw.toString());

                const recipientBytes = ethers.zeroPadBytes(destinationWallet.address, 20);
                await sourceToken.interchainTransfer(destinationChain.name, recipientBytes, transferAmount, "0x");

                await assertInterchainBalanceUpdate(
                    destinationToken,
                    destinationWallet.address,
                    initialDestBalance,
                    new BigNumber(transferAmount.toString()),
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
        });
    });
});
