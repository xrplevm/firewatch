import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { HardhatErrors } from "@testing/hardhat/errors";
import { expectRevert } from "@testing/hardhat/utils";

describe.skip("Cross-Chain Native Transfer", () => {
    const { sourceChain: xrplChain, destinationChain: evmChain, interchainTransferOptions } = config.axelar;

    let evmChainProvider: EthersProvider;
    let xrplChainProvider: XrplProvider;

    let evmChainSigner: EthersSigner;
    let xrplChainSigner: XrplSigner;

    let evmJsonProvider: ethers.JsonRpcProvider;
    let xrplClient: Client;

    let evmChainWallet: ethers.Wallet;
    let xrplChainWallet: Wallet;

    let evmChainTranslator: EvmTranslator;
    let xrplChainTranslator: XrpTranslator;

    before(async () => {
        assertChainTypes(["evm"], evmChain as unknown as AxelarBridgeChain);
        assertChainTypes(["xrp"], xrplChain as unknown as AxelarBridgeChain);

        evmJsonProvider = new ethers.JsonRpcProvider(evmChain.urls.rpc);
        xrplClient = new Client(xrplChain.urls.ws);

        evmChainProvider = new EthersProvider(evmJsonProvider);
        xrplChainProvider = new XrplProvider(xrplClient);

        evmChainWallet = new ethers.Wallet(evmChain.account.privateKey, evmJsonProvider);
        xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);

        evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
        xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

        evmChainTranslator = new EvmTranslator();
        xrplChainTranslator = new XrpTranslator();
    });

    describe("from evm chain to xrpl chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], config.axelar.sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], config.axelar.destinationChain as unknown as AxelarBridgeChain);
        });

        it.skip("should transfer the token", async () => {
            const initialSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);
            const initialDestBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

            const amount = interchainTransferOptions.amount;

            const tx = await evmChainSigner.transfer(
                amount,
                evmChain.nativeToken as Token,
                evmChain.interchainTokenServiceAddress,
                xrplChain.name,
                evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
            );

            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed * receipt.gasPrice;

            const finalSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);

            const amountInBase18 = ethers.parseUnits(amount, 18);

            const expectedSrcBalance = BigNumber(initialSrcBalance)
                .minus(BigNumber(amountInBase18.toString()))
                .minus(BigNumber(gasCost.toString()));

            // if (!BigNumber(finalSrcBalance).eq(expectedSrcBalance)) {
            //     throw new Error(`Source balance mismatch! Expected: ${expectedSrcBalance}, Actual: ${finalSrcBalance}`);
            // }

            await polling(
                async () => {
                    const balance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);
                    console.log({ balance });
                    return BigNumber(balance.toString()).eq(BigNumber(initialDestBalance.toString()).plus(xrpToDrops(amount)));
                },
                (res) => !res,
                interchainTransferOptions as PollingOptions,
            );
        });

        it.skip("should revert when transferring 0 tokens", async () => {
            await expectRevert(
                evmChainSigner.transfer(
                    "0",
                    evmChain.nativeToken as Token,
                    evmChain.interchainTokenServiceAddress,
                    xrplChain.name,
                    evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                ),
                HardhatErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });
    });

    describe("from xrpl chain to evm chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], evmChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], xrplChain as unknown as AxelarBridgeChain);
        });

        it("should transfer the token", async () => {
            const erc20 = evmChainProvider.getERC20Contract(evmChain.nativeToken.address, evmChainWallet);
            const initialDestBalance = await erc20.balanceOf(evmChainWallet.address);
            const initialSourceBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

            const amount = "8";

            const tx = await xrplChainSigner.transfer(
                amount,
                new Token({} as any),
                xrplChain.interchainTokenServiceAddress,
                evmChain.name,
                xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
            );

            console.log("tx.hash: ", tx.hash);
            const fee = (await tx.wait()).fee;

            await polling(
                async () => {
                    const balance = await erc20.balanceOf(evmChainWallet.address);
                    console.log({ balance });
                    return BigNumber(balance.toString()).eq(
                        BigNumber(initialDestBalance.toString()).plus(ethers.parseUnits(amount, 18).toString()),
                    );
                },
                (res) => !res,
                interchainTransferOptions as PollingOptions,
            );

            // TODO: adjust calculations
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
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    evmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
                ),
                XrplSignerErrors.TRANSACTION_SUBMISSION_FAILED,
            );
        });
    });
});
