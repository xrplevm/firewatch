import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";
import { assertChainEnvironments, assertChainTypes, assertRevert } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { AssertionErrors } from "@testing/mocha/assertions";

describe.skip("Cross-Chain Native Transfer", () => {
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;

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
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["xrp"], destinationChain as unknown as AxelarBridgeChain);

        evmJsonProvider = new ethers.JsonRpcProvider(sourceChain.urls.rpc);
        xrplClient = new Client(destinationChain.urls.ws);

        evmChainProvider = new EthersProvider(evmJsonProvider);
        xrplChainProvider = new XrplProvider(xrplClient);

        evmChainWallet = new ethers.Wallet(sourceChain.account.privateKey, evmJsonProvider);
        xrplChainWallet = Wallet.fromSeed(destinationChain.account.privateKey);

        evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
        xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

        evmChainTranslator = new EvmTranslator();
        xrplChainTranslator = new XrpTranslator();

        // No contract needed for XRPL destination in this direction

        if (!xrplClient.isConnected()) {
            await xrplClient.connect();
        }
    });

    describe("from evm chain to xrpl chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should transfer the token", async () => {
            const initialSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);
            const initialDestBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

            const amount = interchainTransferOptions.amount;

            const tx = await evmChainSigner.transfer(
                amount,
                sourceChain.nativeToken as Token,
                sourceChain.interchainTokenServiceAddress,
                destinationChain.name,
                evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                interchainTransferOptions.gasToPay,
            );

            const receipt = await tx.wait();
            const gasCost = receipt.gasUsed * receipt.gasPrice;

            const finalSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);

            const expectedSrcBalance = BigNumber(initialSrcBalance)
                .minus(BigNumber(amount.toString()))
                .minus(BigNumber(gasCost.toString()));

            await polling(
                async () => {
                    const balance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);
                    return BigNumber(balance.toString()).eq(BigNumber(initialDestBalance.toString()).plus(xrpToDrops(amount)));
                },
                (res) => !res,
                interchainTransferOptions as PollingOptions,
            );
        });

        it("should revert when transferring 0 tokens", async () => {
            await assertRevert(
                evmChainSigner.transfer(
                    "0",
                    sourceChain.nativeToken as Token,
                    sourceChain.interchainTokenServiceAddress,
                    destinationChain.name,
                    evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                ),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });
    });

    describe.skip("from xrpl chain to evm chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should transfer the token", async () => {
            const erc20 = evmChainProvider.getERC20Contract(sourceChain.nativeToken.address, evmChainWallet);
            const initialDestBalance = await erc20.balanceOf(evmChainWallet.address);

            const amount = interchainTransferOptions.amount;

            const tx = await xrplChainSigner.transfer(
                amount,
                new Token({} as any),
                destinationChain.interchainTokenServiceAddress,
                xrplChainTranslator.translate("evm", sourceChain.name),
                xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
            );

            const fee = (await tx.wait()).fee;

            await polling(
                async () => {
                    const balance = await erc20.balanceOf(evmChainWallet.address);
                    return BigNumber(balance.toString()).eq(
                        BigNumber(initialDestBalance.toString())
                            .plus(ethers.parseUnits(amount, 18).toString())
                            .minus(ethers.parseEther("1.7").toString()),
                    );
                },
                (res) => !res,
                interchainTransferOptions as PollingOptions,
            );
        });

        it("should revert when transferring 0 tokens", async () => {
            await assertRevert(
                xrplChainSigner.transfer(
                    "0",
                    new Token({} as any),
                    destinationChain.interchainTokenServiceAddress,
                    xrplChainTranslator.translate("evm", sourceChain.name),
                    xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
                ),
                AssertionErrors.TRANSACTION_SUBMISSION_FAILED,
            );
        });
    });
});
