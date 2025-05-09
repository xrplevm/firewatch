import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner, EthersTransaction } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { AxelarProvider } from "@firewatch/bridge/providers/axelarscan";
import { Token } from "@firewatch/core/token";
import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { InterchainToken } from "@shared/evm/contracts";
import { expectRevert } from "@testing/hardhat/utils";
import { Client as xrplclient, Wallet as xrplwallet } from "xrpl";
import { Env } from "../../../../../packages/env/src/types/env";

describe("Cross-Chain No-Native Transfer", () => {
    const { sourceChain: xrplChain, destinationChain: evmChain, interchainTransferOptions } = config.axelar;
    let FOO_ERC20: Token;
    let FOO_IOU: Token;

    let evmChainProvider: EthersProvider;
    let xrplChainProvider: XrplProvider;
    let axelarProvider: AxelarProvider;

    let evmChainSigner: EthersSigner;
    let xrplChainSigner: XrplSigner;

    let evmJsonProvider: ethers.JsonRpcProvider;
    let xrplClient: Client;

    let evmChainWallet: ethers.Wallet;
    let xrplChainWallet: Wallet;

    let evmChainTranslator: EvmTranslator;
    let xrplChainTranslator: XrpTranslator;

    let interchainToken: InterchainToken;

    before(async () => {
        assertChainTypes(["evm"], evmChain as unknown as AxelarBridgeChain);
        assertChainTypes(["xrp"], xrplChain as unknown as AxelarBridgeChain);

        evmJsonProvider = new ethers.JsonRpcProvider(evmChain.urls.rpc);
        xrplClient = new Client(xrplChain.urls.ws);

        evmChainProvider = new EthersProvider(evmJsonProvider);
        xrplChainProvider = new XrplProvider(xrplClient);
        axelarProvider = new AxelarProvider(xrplChain.env as Env);

        evmChainWallet = new ethers.Wallet(evmChain.account.privateKey, evmJsonProvider);
        xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);

        evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
        xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

        evmChainTranslator = new EvmTranslator();
        xrplChainTranslator = new XrpTranslator();

        FOO_ERC20 = {
            id: "0xc8895f8ceb0cae9da15bb9d2bc5859a184ca0f61c88560488355c8a7364deef8",
            symbol: "FOO",
            decimals: 18,
            name: "FOO",
            address: "0xE26D509C661c4F16FaFfBB1eAce1Fa1CdA8cc146",
            isNative: () => false,
        };

        FOO_IOU = {
            id: "0x85f75bb7fd0753565c1d2cb59bd881970b52c6f06f3472769ba7b48621cd9d23",
            symbol: "FOO",
            decimals: 18,
            name: "FOO",
            address: "rHN7vR4P1qDPGpnLgoXemuZhrm6AchBHvj",
            isNative: () => false,
        };

        interchainToken = new InterchainToken(FOO_ERC20.address!, evmChainWallet);

        if (!xrplClient.isConnected()) {
            await xrplClient.connect();
        }
    });

    describe("from ERC20 evm chain to xrpl chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], evmChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], xrplChain as unknown as AxelarBridgeChain);
        });

        it("should transfer the ERC20", async () => {
            const initialSrcBalance = await xrplChainProvider.getIOUBalance(xrplChainWallet.address, FOO_IOU.address!, FOO_IOU.symbol);
            console.log("Initial source balance:", initialSrcBalance.toString(), xrplChainWallet.address);
            const amount = "0.01";
            const amountInBase18 = ethers.parseUnits("5", 18);

            const balance = await interchainToken.balanceOf(evmChainWallet.address);
            console.log("Fetched balance from InterchainToken contract:", balance.toString(), evmChainWallet.address);
            // Call the tokenId() function
            const tokenId = await interchainToken.interchainTokenId();
            console.log("Fetched tokenId from InterchainToken contract:", tokenId);

            // Prepare recipient and metadata
            const recipient = evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address);
            const metadata = "0x"; // or any metadata you want

            const feeResponse = await axelarProvider.estimateGasFee({
                sourceChain: "xrpl-evm",
                destinationChain: "xrpl",
                gasToken: "XRP", // or whatever symbol you’re using
                gasLimit: 200_000, // how much gas you think your _execute…()_ will burn
                executeData: "0x", // empty for pure token transfers
            });
            console.log("Fee response:", feeResponse);
            // Call the new interchainTransfer function directly
            const tx = await interchainToken.interchainTransfer(xrplChain.name, recipient, ethers.parseUnits(amount, 12), metadata, {
                value: "343200772532348837",
                gasLimit: 10000000,
            });
            console.log("Transaction hash:", tx.hash);

            // const receipt = await tx.wait();
            // console.log("Transaction receipt:", receipt);
            // const tx = await evmChainSigner.transfer(
            //     amount,
            //     FOO as Token,
            //     evmChain.interchainTokenServiceAddress,
            //     xrplChain.name,
            //     evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
            //     "0.2",
            // );

            // const receipt = await tx.wait();
            // const gasCost = receipt.gasUsed * receipt.gasPrice;

            // const finalSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);

            // const expectedSrcBalance = BigNumber(initialSrcBalance)
            //     .minus(BigNumber(amountInBase18.toString()))
            //     .minus(BigNumber(gasCost.toString()));

            await polling(
                async () => {
                    const balance = await xrplChainProvider.getIOUBalance(xrplChainWallet.address, FOO_IOU.address!, FOO_IOU.symbol);
                    console.log({ balance, initialSrcBalance, amount });
                    return BigNumber(balance.toString()).eq(BigNumber(initialSrcBalance.toString()).plus(xrpToDrops(amount)));
                },
                (res) => !res,
                interchainTransferOptions as PollingOptions,
            );
        });

        it.skip("should revert when transferring 0 tokens", async () => {
            await expectRevert(
                evmChainSigner.transfer(
                    "0",
                    FOO_ERC20 as Token,
                    evmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                ),
                "fail",
            );
        });
    });

    describe.skip("from IOU xrpl chain to evm chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], evmChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], xrplChain as unknown as AxelarBridgeChain);
        });

        it.skip("should transfer the IOU with interchain transfer method", async () => {
            const erc20 = evmChainProvider.getERC20Contract(FOO_ERC20.address!, evmChainWallet);
            const initialDestBalance = await erc20.balanceOf(evmChainWallet.address);
            const initialSourceBalance = await xrplChainProvider.getIOUBalance(xrplChainWallet.address, FOO_IOU.address!, FOO_IOU.symbol);
            console.log("Initial source balance:", initialSourceBalance.toString(), xrplChainWallet.address);

            const amount = interchainTransferOptions.amount;

            const feeResponse = await axelarProvider.estimateGasFee({
                sourceChain: "xrpl",
                destinationChain: "xrpl-evm",
                gasToken: "XRP", // or whatever symbol you’re using
                gasLimit: 200_000, // how much gas you think your _execute…()_ will burn
                executeData: "0x", // empty for pure token transfers
            });
            console.log("Fee response:", feeResponse);

            // 2) Pull out the exact wei/drops you need
            const gasValue = feeResponse.executionFeeWithMultiplier; // a decimal string
            console.log("Gas value:", gasValue);

            const tx = await xrplChainSigner.transfer(
                "7",
                FOO_IOU,
                xrplChain.interchainTokenServiceAddress,
                evmChain.name,
                xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
            );
            console.log("Transaction hash:", tx.hash);

            let normalized = tx.hash.toLowerCase();

            // 2) Prefix with `0x` if it isn’t already
            if (!normalized.startsWith("0x")) {
                normalized = "0x" + normalized;
            }

            const fee = (await tx.wait()).fee;

            await polling(
                async () => {
                    const balance = await erc20.balanceOf(evmChainWallet.address);
                    const axelarTx = await axelarProvider.fetchOutcome(normalized);
                    console.log({ balance, initialDestBalance, amount });
                    console.log(axelarTx.status);
                    return BigNumber(balance.toString()).eq(
                        BigNumber(initialDestBalance.toString()).plus(ethers.parseUnits(amount, 18).toString()),
                    );
                },
                (res) => !res,
                interchainTransferOptions as PollingOptions,
            );
            console.log(await axelarProvider.fetchEvents(normalized));

            const expectedSourceBalance = BigNumber(initialSourceBalance.toString()).minus(xrpToDrops(amount)).minus(fee!);
            const finalSrcBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

            if (!BigNumber(finalSrcBalance.toString()).eq(expectedSourceBalance)) {
                throw new Error(`Source balance mismatch! Expected: ${expectedSourceBalance}, Actual: ${finalSrcBalance}`);
            }
        });

        it.skip("should revert when transferring 0 tokens", async () => {
            await expectRevert(
                xrplChainSigner.transfer(
                    "0",
                    FOO_IOU,
                    xrplChain.interchainTokenServiceAddress,
                    xrplChainTranslator.translate("evm", evmChain.name),
                    xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
                ),
                XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
            );
        });
    });
});
