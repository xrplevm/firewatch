import { ethers, Contract, BigNumberish } from "ethers";
import config from "../../../module.config.json";
import { PollingOptions } from "@shared/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { expectRevert } from "@testing/hardhat/utils";
import { expectAxelarError, expectFullExecution } from "@firewatch/bridge/utils";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { InterchainToken, InterchainTokenFactory, InterchainTokenService } from "@shared/evm/contracts";
import { pollForEvent } from "@shared/evm/utils";
import { HardhatErrors } from "@testing/hardhat/errors";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarScanProvider, AxelarScanProviderErrors } from "@firewatch/bridge/providers/axelarscan";
import { Env } from "@firewatch/env/types";

describeOrSkip(
    "interchain token deployment evm - evm",
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
        const pollingOpts = evmChain.interchainTransferOptions as PollingOptions;

        let xrplEvmJsonProvider: ethers.JsonRpcProvider;
        let evmJsonProvider: ethers.JsonRpcProvider;
        let axelarScanProvider: AxelarScanProvider;

        let xrplEvmWallet: ethers.Wallet;
        let evmWallet: ethers.Wallet;

        let xrplEvmInterchainTokenFactory: InterchainTokenFactory;
        let evmInterchainTokenFactory: InterchainTokenFactory;
        let xrplEvmInterchainTokenService: InterchainTokenService;
        let evmInterchainTokenService: InterchainTokenService;

        let deployedTokenAddressXrplEvm: string;
        let deployedTokenAddressEvm: string;

        let xrplEvmRecipient: string;
        let evmRecipient: string;

        let saltXrplEvm: string;
        let saltEvm: string;

        let transferAmount: BigNumberish;
        let deployAmount: BigNumberish;
        let gasValue: BigNumberish;
        let gasLimit: number;

        before(async () => {
            const {
                urls: xrplEvmUrls,
                accounts: xrplEvmAccounts,
                interchainTokenFactory: xrplEvmFactoryAddress,
                interchainTokenServiceAddress: xrplEvmTokenServiceAddress,
                interchainTransferOptions,
            } = xrplEvmChain;
            const {
                urls: evmUrls,
                accounts: evmAccounts,
                interchainTokenServiceAddress: evmTokenServiceAddress,
                interchainTokenFactory: evmFactoryAddress,
            } = evmChain;

            xrplEvmJsonProvider = new ethers.JsonRpcProvider(xrplEvmUrls.rpc);
            evmJsonProvider = new ethers.JsonRpcProvider(evmUrls.rpc);

            xrplEvmWallet = new ethers.Wallet(xrplEvmAccounts[0].privateKey, xrplEvmJsonProvider);
            evmWallet = new ethers.Wallet(evmAccounts[0].privateKey, evmJsonProvider);

            xrplEvmInterchainTokenFactory = new InterchainTokenFactory(xrplEvmFactoryAddress, xrplEvmWallet);
            evmInterchainTokenFactory = new InterchainTokenFactory(evmFactoryAddress, evmWallet);

            xrplEvmInterchainTokenService = new InterchainTokenService(xrplEvmTokenServiceAddress, xrplEvmWallet);
            evmInterchainTokenService = new InterchainTokenService(evmTokenServiceAddress, evmWallet);

            xrplEvmRecipient = ethers.zeroPadBytes(xrplEvmWallet.address, 20);
            evmRecipient = ethers.zeroPadBytes(evmWallet.address, 20);

            saltXrplEvm = `xrplEvm_${Date.now()}`;
            saltXrplEvm = ethers.id(saltXrplEvm);
            saltEvm = `evm_${Date.now()}`;
            saltEvm = ethers.id(saltEvm);

            gasValue = ethers.parseUnits(interchainTransferOptions.gasValue, xrplEvmChain.nativeToken.decimals);
            gasLimit = interchainTransferOptions.gasLimit;
            deployAmount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.deployAmount);
            transferAmount = ethers.parseUnits(xrplEvmChain.interchainTransferOptions.amount, xrplEvmChain.nativeToken.decimals);

            axelarScanProvider = new AxelarScanProvider(xrplEvmChain.env as Env);
        });

        describe("from xrpl-evm as source chain to evm as destination chain", () => {
            it("should deploy a new interchain token in xrpl-evm chain and emit interchaintokendeployed", async () => {
                await xrplEvmInterchainTokenFactory.deployInterchainToken(
                    saltXrplEvm,
                    "TestToken",
                    "TTK",
                    18,
                    deployAmount,
                    xrplEvmWallet.address,
                );

                const tokenDeployedEvent = await pollForEvent(
                    xrplEvmInterchainTokenService as unknown as Contract,
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

                deployedTokenAddressXrplEvm = tokenDeployedEvent.args.tokenAddress;
            });

            it("should deploy remote interchain token in destination chain and emit interchaintokendeployed", async () => {
                const tx = await xrplEvmInterchainTokenFactory.deployRemoteInterchainToken(saltXrplEvm, evmChain.name, gasValue, {
                    value: gasValue,
                    gasLimit: gasLimit,
                });

                const tokenDeployedEvent = await pollForEvent(
                    evmInterchainTokenService as unknown as Contract,
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

                deployedTokenAddressEvm = tokenDeployedEvent.args.tokenAddress;

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
            });

            it("should revert when deploying an interchain token with the same salt value", async () => {
                await expectRevert(
                    xrplEvmInterchainTokenFactory.deployInterchainToken(
                        saltXrplEvm,
                        "TestToken",
                        "TTK",
                        18,
                        deployAmount,
                        xrplEvmWallet.address,
                    ),
                    HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                );
            });

            it("should revert when deploying a remote interchain token with the same salt value", async () => {
                const tx = await xrplEvmInterchainTokenFactory.deployRemoteInterchainToken(saltXrplEvm, evmChain.name, gasValue, {
                    value: gasValue,
                    gasLimit: xrplEvmChain.interchainTransferOptions.gasLimit,
                });
                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.TOKEN_ALREADY_DEPLOYED, pollingOpts);
            });

            describe("token transfers", () => {
                let xrplEvmToken: InterchainToken;
                let evmToken: InterchainToken;

                before(() => {
                    if (!deployedTokenAddressXrplEvm || !deployedTokenAddressEvm) {
                        throw new Error("Deployed token addresses are not registered.");
                    }

                    xrplEvmToken = new InterchainToken(deployedTokenAddressXrplEvm, xrplEvmWallet);
                    evmToken = new InterchainToken(deployedTokenAddressEvm, evmWallet);
                });

                it("should transfer tokens from xrplevm to evm via interchaintransfer", async () => {
                    const recipientBytes = ethers.zeroPadBytes(evmWallet.address, 20);

                    const tx = await xrplEvmToken.interchainTransfer(evmChain.name, recipientBytes, transferAmount, "0x", {
                        value: gasValue,
                        gasLimit: gasLimit,
                    });

                    await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                });

                it("should revert when attempting to transfer 0 tokens from xrplevm to evm", async () => {
                    await expectRevert(
                        xrplEvmToken.interchainTransfer(xrplEvmChain.name, evmRecipient, "0", "0x"),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });

                it("should transfer tokens from evm to xrplevm via interchainTransfer", async () => {
                    const tx = await evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, transferAmount, "0x", {
                        value: gasValue,
                        gasLimit: gasLimit,
                    });

                    await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                });

                it("should revert when attempting to transfer 0 tokens from evm to xrplevm", async () => {
                    await expectRevert(
                        evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, "0", "0x"),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });
            });
        });

        describe("from evm as source chain to xrplevm as destination chain", () => {
            it("should deploy a new interchain token in destination chain and emit the correct event", async () => {
                await evmInterchainTokenFactory.deployInterchainToken(
                    saltEvm,
                    "TestToken",
                    "TTK",
                    18,
                    ethers.parseUnits("1000", 18),
                    evmWallet.address,
                );
                const tokenDeployedEvent = await pollForEvent(
                    evmInterchainTokenService as unknown as Contract,
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

                deployedTokenAddressEvm = tokenDeployedEvent.args.tokenAddress;
            });

            it("should deploy remote interchain token and emit the correct event", async () => {
                const tx = await evmInterchainTokenFactory.deployRemoteInterchainToken(saltEvm, xrplEvmChain.name, gasValue, {
                    value: gasValue,
                    gasLimit: evmChain.interchainTransferOptions.gasLimit,
                });
                const tokenDeployedEvent = await pollForEvent(
                    xrplEvmInterchainTokenService as unknown as Contract,
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

                await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);

                deployedTokenAddressXrplEvm = tokenDeployedEvent.args.tokenAddress;
            });

            it("should revert when deploying an interchain token with the same salt value", async () => {
                await expectRevert(
                    evmInterchainTokenFactory.deployInterchainToken(saltEvm, "TestToken", "TTK", 18, deployAmount, evmWallet.address),
                    HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                );
            });

            it("should revert when deploying a remote interchain token with the same salt value", async () => {
                const tx = await evmInterchainTokenFactory.deployRemoteInterchainToken(saltEvm, xrplEvmChain.name, gasValue, {
                    value: gasValue,
                    gasLimit: evmChain.interchainTransferOptions.gasLimit,
                });

                await expectAxelarError(tx.hash, axelarScanProvider, AxelarScanProviderErrors.TOKEN_ALREADY_DEPLOYED, pollingOpts);
            });

            describe("token transfers", () => {
                let xrplEvmToken: InterchainToken;
                let evmToken: InterchainToken;

                before(() => {
                    if (!deployedTokenAddressXrplEvm || !deployedTokenAddressEvm) {
                        throw new Error("Deployed token addresses are not registered.");
                    }

                    xrplEvmToken = new InterchainToken(deployedTokenAddressXrplEvm, xrplEvmWallet);
                    evmToken = new InterchainToken(deployedTokenAddressEvm, evmWallet);
                });

                it("should transfer tokens from evm to xrplevm via interchainTransfer", async () => {
                    const tx = await evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, transferAmount, "0x", {
                        value: gasValue,
                        gasLimit: gasLimit,
                    });

                    await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                });

                it("should revert when attempting to transfer 0 tokens from evm to xrplevm", async () => {
                    await expectRevert(
                        evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, "0", "0x"),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });

                it("should transfer tokens from xrplevm to evm via interchainTransfer", async () => {
                    const recipientBytes = ethers.zeroPadBytes(evmWallet.address, 20);

                    const tx = await xrplEvmToken.interchainTransfer(evmChain.name, recipientBytes, transferAmount, "0x", {
                        value: gasValue,
                        gasLimit: gasLimit,
                    });

                    await expectFullExecution(tx.hash, axelarScanProvider, pollingOpts);
                });

                it("should revert when attempting to transfer 0 tokens from xrplevm to evm", async () => {
                    await expectRevert(
                        xrplEvmToken.interchainTransfer(xrplEvmChain.name, evmRecipient, "0", "0x"),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });
            });
        });
    },
);
