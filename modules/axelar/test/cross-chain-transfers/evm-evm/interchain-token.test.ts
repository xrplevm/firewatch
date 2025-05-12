import { ethers, Contract, BigNumberish } from "ethers";
import config from "../../../module.config.json";
import { PollingOptions } from "@shared/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { executeTx, expectRevert } from "@testing/hardhat/utils";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { InterchainToken, InterchainTokenFactory, InterchainTokenService } from "@shared/evm/contracts";
import { pollForEvent } from "@shared/evm/utils";
import BigNumber from "bignumber.js";
import { assertInterchainBalanceUpdate } from "./interchain-token.helpers";
import { HardhatErrors } from "@testing/hardhat/errors";
import { describeOrSkip } from "@testing/mocha/utils";

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

        before(async () => {
            const {
                urls: xrplEvmUrls,
                account: xrplEvmAccount,
                interchainTokenFactory: xrplEvmFactoryAddress,
                interchainTokenServiceAddress: xrplEvmTokenServiceAddress,
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

            transferAmount = ethers.parseEther(xrplEvmChain.interchainTransferOptions.amount);
            deployAmount = ethers.parseEther("1000");
            gasValue = ethers.parseEther(xrplEvmChain.interchainTransferOptions.gasValue);
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

                it("should deploy remote interchain token in evm destination chain and emit InterchainTokenDeployed", async () => {
                    await executeTx(
                        xrplEvmInterchainTokenFactory.deployRemoteInterchainToken(saltXrplEvm, evmChain.name, gasValue, {
                            value: gasValue,
                            gasLimit: xrplEvmChain.interchainTransferOptions.gasLimit,
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

                        await executeTx(
                            xrplEvmToken.interchainTransfer(evmChain.name, evmRecipient, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: xrplEvmChain.interchainTransferOptions.gasLimit,
                            }),
                        );
                        evmInterchainTokenFactory;

                        await assertInterchainBalanceUpdate(
                            evmToken,
                            evmWallet.address,
                            initialDestBalance,
                            new BigNumber(transferAmount.toString()),
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

                        await executeTx(
                            evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: xrplEvmChain.interchainTransferOptions.gasLimit,
                            }),
                        );

                        await assertInterchainBalanceUpdate(
                            xrplEvmToken,
                            xrplEvmWallet.address,
                            initialXrplEvmBalance,
                            new BigNumber(transferAmount.toString()),
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
                it("should deploy a new interchain token in evm Source chain and emit the correct event", async () => {
                    const { receipt } = await executeTx(
                        evmInterchainTokenFactory.deployInterchainToken(saltEvm, "TestToken", "TTK", 18, deployAmount, evmWallet.address),
                    );
                    const tokenDeployedEvent = await pollForEvent(
                        evmInterchainTokenService as unknown as Contract,
                        "InterchainTokenDeployed",
                        (decoded) => {
                            const { tokenId, name, symbol } = decoded.args;
                            return Boolean(tokenId) && name === "TestToken" && symbol === "TTK";
                        },
                        pollingOpts,
                        receipt.blockNumber,
                        "latest",
                    );

                    if (!tokenDeployedEvent) {
                        throw new Error("TokenDeployed event was not emitted as expected.");
                    }

                    deployedTokenAddressEvm = tokenDeployedEvent.args.tokenAddress;
                });

                it("should deploy remote interchain token in xrpl-evm Destination chain and emit the correct event", async () => {
                    await executeTx(
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

                        await executeTx(
                            evmToken.interchainTransfer(xrplEvmChain.name, xrplEvmRecipient, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: evmChain.interchainTransferOptions.gasLimit,
                            }),
                        );

                        await assertInterchainBalanceUpdate(
                            xrplEvmToken,
                            xrplEvmWallet.address,
                            initialXrplEvmBalance,
                            new BigNumber(transferAmount.toString()),
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

                        await executeTx(
                            xrplEvmToken.interchainTransfer(evmChain.name, evmRecipient, transferAmount, "0x", {
                                value: gasValue,
                                gasLimit: evmChain.interchainTransferOptions.gasLimit,
                            }),
                        );

                        await assertInterchainBalanceUpdate(
                            evmToken,
                            evmWallet.address,
                            initialDestBalance,
                            new BigNumber(transferAmount.toString()),
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
