import { ethers, Contract, BigNumberish } from "ethers";
import config from "../../../module.config.example.json";
import { PollingOptions } from "@shared/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { executeTx, expectRevert } from "@testing/hardhat/utils";
import { expectBalanceUpdate } from "@shared/evm/utils";
import { expectExecuted } from "@firewatch/bridge/utils";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { InterchainToken, InterchainTokenFactory, InterchainTokenService } from "@shared/evm/contracts";
import { pollForEvent } from "@shared/evm/utils";
import BigNumber from "bignumber.js";
import { HardhatErrors } from "@testing/hardhat/errors";
import { describeOrSkip } from "@testing/mocha/utils";
import { AxelarScanProvider } from "@firewatch/bridge/providers/axelarscan";
import { Env } from "@firewatch/env/types";

describeOrSkip(
    "Interchain Token Deployment EVM - EVM",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["evm"], config.evmChain as unknown as AxelarBridgeChain)
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
                account: xrplEvmAccount,
                interchainTokenFactory: xrplEvmFactoryAddress,
                interchainTokenServiceAddress: xrplEvmTokenServiceAddress,
                interchainTransferOptions,
            } = xrplEvmChain;
            const {
                urls: destUrls,
                account: destAccount,
                interchainTokenServiceAddress: destTokenServiceAddress,
                interchainTokenFactory: destFactoryAddress,
            } = evmChain;

            xrplEvmJsonProvider = new ethers.JsonRpcProvider(xrplEvmUrls.rpc);
            evmJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

            xrplEvmWallet = new ethers.Wallet(xrplEvmAccount.privateKey, xrplEvmJsonProvider);
            evmWallet = new ethers.Wallet(destAccount.privateKey, evmJsonProvider);

            xrplEvmInterchainTokenFactory = new InterchainTokenFactory(xrplEvmFactoryAddress, xrplEvmWallet);
            evmInterchainTokenFactory = new InterchainTokenFactory(destFactoryAddress, evmWallet);

            xrplEvmInterchainTokenService = new InterchainTokenService(xrplEvmTokenServiceAddress, xrplEvmWallet);
            evmInterchainTokenService = new InterchainTokenService(destTokenServiceAddress, evmWallet);

            xrplEvmRecipient = ethers.zeroPadBytes(xrplEvmWallet.address, 20);
            evmRecipient = ethers.zeroPadBytes(evmWallet.address, 20);

            saltXrplEvm = `xrplEvm_${Date.now()}`;
            saltXrplEvm = ethers.id(saltXrplEvm);
            saltEvm = `evm_${Date.now()}`;
            saltEvm = ethers.id(saltEvm);

            gasValue = ethers.parseUnits(interchainTransferOptions.gasValue, "ether");
            gasLimit = interchainTransferOptions.gasLimit;
            deployAmount = ethers.parseUnits("1000", 18);
            transferAmount = ethers.parseUnits(xrplEvmChain.interchainTransferOptions.amount, 18);

            axelarScanProvider = new AxelarScanProvider(xrplEvmChain.env as Env);
        });

        describeOrSkip(
            "from xrpl-evm as Source chain to evm as Destination chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplEvmChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], evmChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should deploy a new interchain token in xrpl-evm chain and emit InterchainTokenDeployed", async () => {
                    await executeTx(
                        xrplEvmInterchainTokenFactory.deployInterchainToken(
                            saltXrplEvm,
                            "TestToken",
                            "TTK",
                            18,
                            deployAmount,
                            xrplEvmWallet.address,
                        ),
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

                it("should deploy remote interchain token in destination chain and emit InterchainTokenDeployed", async () => {
                    const tx = await executeTx(
                        xrplEvmInterchainTokenFactory.deployRemoteInterchainToken(saltXrplEvm, evmChain.name, gasValue, {
                            value: gasValue,
                            gasLimit: gasLimit,
                        }),
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

                    const txHash = tx.receipt.hash;

                    await expectExecuted(txHash, axelarScanProvider, pollingOpts);
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
                    await expectRevert(
                        xrplEvmInterchainTokenFactory.deployRemoteInterchainToken(saltXrplEvm, evmChain.name, gasValue, {
                            value: gasValue,
                            gasLimit: xrplEvmChain.interchainTransferOptions.gasLimit,
                        }),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });

                describe("Token Transfers", () => {
                    let xrplEvmToken: InterchainToken;
                    let evmToken: InterchainToken;

                    before(() => {
                        if (!deployedTokenAddressXrplEvm || !deployedTokenAddressEvm) {
                            throw new Error("Deployed token addresses are not registered.");
                        }

                        xrplEvmToken = new InterchainToken(deployedTokenAddressXrplEvm, xrplEvmWallet);
                        evmToken = new InterchainToken(deployedTokenAddressEvm, evmWallet);
                    });

                    it("should transfer tokens from XrplEvm to Evm via interchainTransfer", async () => {
                        const initialDestBalanceRaw = await evmToken.balanceOf(evmWallet.address);
                        const initialDestBalance = new BigNumber(initialDestBalanceRaw.toString());

                        const recipientBytes = ethers.zeroPadBytes(evmWallet.address, 20);

                        const tx = await executeTx(
                            xrplEvmToken.interchainTransfer(evmChain.name, recipientBytes, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: gasLimit,
                            }),
                        );

                        const txHash = tx.receipt.hash;

                        await expectExecuted(txHash, axelarScanProvider, pollingOpts);

                        await expectBalanceUpdate(
                            async () => (await evmToken.balanceOf(evmWallet.address)).toString(),
                            initialDestBalance.plus(new BigNumber(transferAmount.toString())).toString(),
                            pollingOpts,
                        );
                    });

                    it("should revert when attempting to transfer 0 tokens from XrplEvm to Evm", async () => {
                        await expectRevert(
                            xrplEvmToken.interchainTransfer(xrplEvmChain.name, evmRecipient, "0", "0x"),
                            HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                        );
                    });

                    it("should transfer tokens from Evm to XrplEvm via interchainTransfer", async () => {
                        const initialXrplEvmBalanceRaw = await xrplEvmToken.balanceOf(xrplEvmWallet.address);
                        const initialXrplEvmBalance = new BigNumber(initialXrplEvmBalanceRaw.toString());

                        const tx = await executeTx(
                            evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: gasLimit,
                            }),
                        );

                        const txHash = tx.receipt.hash;
                        await expectExecuted(txHash, axelarScanProvider, pollingOpts);

                        await expectBalanceUpdate(
                            async () => (await xrplEvmToken.balanceOf(xrplEvmWallet.address)).toString(),
                            initialXrplEvmBalance.plus(new BigNumber(transferAmount.toString())).toString(),
                            pollingOpts,
                        );
                    });

                    it("should revert when attempting to transfer 0 tokens from Evm to XrplEvm", async () => {
                        await expectRevert(
                            evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, "0", "0x"),
                            HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                        );
                    });
                });
            },
        );

        describeOrSkip(
            "from evm as Source chain to xrpl-evm as Destination chain",
            () => {
                return (
                    isChainEnvironment(["devnet", "testnet", "mainnet"], xrplEvmChain as unknown as AxelarBridgeChain) &&
                    isChainEnvironment(["devnet", "testnet", "mainnet"], evmChain as unknown as AxelarBridgeChain)
                );
            },
            () => {
                it("should deploy a new interchain token in destination chain and emit the correct event", async () => {
                    const tx = await executeTx(
                        evmInterchainTokenFactory.deployInterchainToken(
                            saltEvm,
                            "TestToken",
                            "TTK",
                            18,
                            ethers.parseUnits("1000", 18),
                            evmWallet.address,
                        ),
                    );
                    const tokenDeployedEvent = await pollForEvent(
                        evmInterchainTokenService as unknown as Contract,
                        "InterchainTokenDeployed",
                        (decoded) => {
                            const { tokenId, name, symbol } = decoded.args;
                            return Boolean(tokenId) && name === "TestToken" && symbol === "TTK";
                        },
                        pollingOpts,
                        tx.receipt.blockNumber,
                        "latest",
                    );

                    if (!tokenDeployedEvent) {
                        throw new Error("TokenDeployed event was not emitted as expected.");
                    }

                    deployedTokenAddressEvm = tokenDeployedEvent.args.tokenAddress;
                });

                it("should deploy remote interchain token and emit the correct event", async () => {
                    const tx = await executeTx(
                        evmInterchainTokenFactory.deployRemoteInterchainToken(saltEvm, xrplEvmChain.name, gasValue, {
                            value: gasValue,
                            gasLimit: evmChain.interchainTransferOptions.gasLimit,
                        }),
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
                        throw new Error("Remote InterchainTokenDeployed event was not emitted as expected.");
                    }

                    const txHash = tx.receipt.hash;
                    await expectExecuted(txHash, axelarScanProvider, pollingOpts);

                    deployedTokenAddressXrplEvm = tokenDeployedEvent.args.tokenAddress;
                });

                it("should revert when deploying an interchain token with the same salt value", async () => {
                    await expectRevert(
                        evmInterchainTokenFactory.deployInterchainToken(saltEvm, "TestToken", "TTK", 18, deployAmount, evmWallet.address),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });

                it("should revert when deploying a remote interchain token with the same salt value", async () => {
                    await expectRevert(
                        evmInterchainTokenFactory.deployRemoteInterchainToken(saltEvm, xrplEvmChain.name, gasValue, {
                            value: gasValue,
                            gasLimit: evmChain.interchainTransferOptions.gasLimit,
                        }),
                        HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                    );
                });

                describe("Token Transfers", () => {
                    let xrplEvmToken: InterchainToken;
                    let evmToken: InterchainToken;

                    before(() => {
                        if (!deployedTokenAddressXrplEvm || !deployedTokenAddressEvm) {
                            throw new Error("Deployed token addresses are not registered.");
                        }

                        xrplEvmToken = new InterchainToken(deployedTokenAddressXrplEvm, xrplEvmWallet);
                        evmToken = new InterchainToken(deployedTokenAddressEvm, evmWallet);
                    });

                    it("should transfer tokens from Evm to XrplEvm via interchainTransfer", async () => {
                        const initialXrplEvmBalanceRaw = await xrplEvmToken.balanceOf(xrplEvmWallet.address);
                        const initialXrplEvmBalance = new BigNumber(initialXrplEvmBalanceRaw.toString());

                        const tx = await executeTx(
                            evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: gasLimit,
                            }),
                        );

                        const txHash = tx.receipt.hash;
                        await expectExecuted(txHash, axelarScanProvider, pollingOpts);

                        await expectBalanceUpdate(
                            async () => (await xrplEvmToken.balanceOf(xrplEvmWallet.address)).toString(),
                            initialXrplEvmBalance.plus(new BigNumber(transferAmount.toString())).toString(),
                            pollingOpts,
                        );
                    });

                    it("should revert when attempting to transfer 0 tokens from Evm to XrplEvm", async () => {
                        await expectRevert(
                            evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, "0", "0x"),
                            HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                        );
                    });

                    it("should transfer tokens from XrplEvm to Evm via interchainTransfer", async () => {
                        const initialDestBalanceRaw = await evmToken.balanceOf(evmWallet.address);
                        const initialDestBalance = new BigNumber(initialDestBalanceRaw.toString());

                        const recipientBytes = ethers.zeroPadBytes(evmWallet.address, 20);

                        const tx = await executeTx(
                            xrplEvmToken.interchainTransfer(evmChain.name, recipientBytes, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: gasLimit,
                            }),
                        );

                        const txHash = tx.receipt.hash;
                        await expectExecuted(txHash, axelarScanProvider, pollingOpts);

                        await expectBalanceUpdate(
                            async () => (await evmToken.balanceOf(evmWallet.address)).toString(),
                            initialDestBalance.plus(new BigNumber(transferAmount.toString())).toString(),
                            pollingOpts,
                        );
                    });

                    it("should revert when attempting to transfer 0 tokens from XrplEvm to Evm", async () => {
                        await expectRevert(
                            xrplEvmToken.interchainTransfer(xrplEvmChain.name, evmRecipient, "0", "0x"),
                            HardhatErrors.UNKNOWN_CUSTOM_ERROR,
                        );
                    });
                });
            },
        );
    },
);
