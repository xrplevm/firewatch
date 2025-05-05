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

describe("Cross-Chain No-Native Transfer", () => {
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

    describe("from ERC20 evm chain to xrpl chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should transfer the ERC20", async () => {
            const initialSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);
            const initialDestBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

            const amount = "0.01";
            const amountInBase18 = ethers.parseUnits("5", 18);

            const interchainToken = evmChainSigner.getInterchainTokenContract("0xE26D509C661c4F16FaFfBB1eAce1Fa1CdA8cc146");
            const balance = await interchainToken.balanceOf(evmChainWallet.address);
            console.log("Fetched balance from InterchainToken contract:", balance.toString(), evmChainWallet.address);
            // Call the tokenId() function
            const tokenId = await interchainToken.interchainTokenId();
            console.log("Fetched tokenId from InterchainToken contract:", tokenId);

            const FOO: Token = {
                id: "0xc8895f8ceb0cae9da15bb9d2bc5859a184ca0f61c88560488355c8a7364deef8",
                symbol: "FOO",
                decimals: 18,
                name: "FOO",
                address: "0xE26D509C661c4F16FaFfBB1eAce1Fa1CdA8cc146",
                isNative: () => false,
            };

            // Prepare recipient and metadata
            const recipient = evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address);
            const metadata = "0x"; // or any metadata you want

            // Call the new interchainTransfer function directly
            const tx = await interchainToken.interchainTransfer(destinationChain.name, recipient, ethers.parseUnits(amount, 18), metadata, {
                value: amountInBase18,
                // gasValue: amountInBase18,
                gasLimit: 100000000,
            });

            const receipt = await tx.wait();
            console.log("Transaction receipt:", receipt);
            // const tx = await evmChainSigner.transfer(
            //     amount,
            //     FOO as Token,
            //     sourceChain.interchainTokenServiceAddress,
            //     destinationChain.name,
            //     evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
            //     "0.2",
            // );

            // const receipt = await tx.wait();
            // const gasCost = receipt.gasUsed * receipt.gasPrice;

            // const finalSrcBalance = await evmChainProvider.getNativeBalance(evmChainWallet.address);

            // const expectedSrcBalance = BigNumber(initialSrcBalance)
            //     .minus(BigNumber(amountInBase18.toString()))
            //     .minus(BigNumber(gasCost.toString()));

            // await polling(
            //     async () => {
            //         const balance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);
            //         console.log({ balance, initialDestBalance, amount });
            //         console.log(xrplChainWallet.address);
            //         return BigNumber(balance.toString()).eq(BigNumber(initialDestBalance.toString()).plus(xrpToDrops(amount)));
            //     },
            //     (res) => !res,
            //     interchainTransferOptions as PollingOptions,
            // );
        });

        it("should revert when transferring 0 tokens", async () => {
            const RLUSD: Token = {
                id: "0x85f75bb7fd0753565c1d2cb59bd881970b52c6f06f3472769ba7b48621cd9d23",
                symbol: "RLUSD",
                decimals: 18,
                name: "RLUSD",
                address: "0x20937978F265DC0C947AA8e136472CFA994FE1eD",
                isNative: () => false,
            };
            await assertRevert(
                evmChainSigner.transfer(
                    "0",
                    RLUSD as Token,
                    sourceChain.interchainTokenServiceAddress,
                    destinationChain.name,
                    evmChainTranslator.translate(ChainType.XRP, xrplChainWallet.address),
                    "0",
                ),
                AssertionErrors.UNKNOWN_CUSTOM_ERROR,
            );
        });
    });

    describe.skip("from IOU xrpl chain to evm chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should transfer the IOU", async () => {
            const erc20 = evmChainProvider.getERC20Contract(sourceChain.nativeToken.address, evmChainWallet);
            const initialDestBalance = await erc20.balanceOf(evmChainWallet.address);
            const initialSourceBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

            const amount = interchainTransferOptions.amount;

            const FOO: Token = {
                id: "0x85f75bb7fd0753565c1d2cb59bd881970b52c6f06f3472769ba7b48621cd9d23",
                symbol: "FOO",
                decimals: 18,
                name: "FOO",
                address: "rHN7vR4P1qDPGpnLgoXemuZhrm6AchBHvj",
                isNative: () => false,
            };

            const tx = await xrplChainSigner.transfer(
                "3",
                FOO,
                destinationChain.interchainTokenServiceAddress,
                xrplChainTranslator.translate("evm", sourceChain.name),
                xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
            );

            const fee = (await tx.wait()).fee;

            await polling(
                async () => {
                    const balance = await erc20.balanceOf(evmChainWallet.address);
                    console.log({ balance, initialDestBalance, amount });
                    return BigNumber(balance.toString()).eq(
                        BigNumber(initialDestBalance.toString()).plus(ethers.parseUnits(amount, 18).toString()),
                    );
                },
                (res) => !res,
                interchainTransferOptions as PollingOptions,
            );

            const expectedSourceBalance = BigNumber(initialSourceBalance.toString()).minus(xrpToDrops(amount)).minus(fee!);
            const finalSrcBalance = await xrplChainProvider.getNativeBalance(xrplChainWallet.address);

            if (!BigNumber(finalSrcBalance.toString()).eq(expectedSourceBalance)) {
                throw new Error(`Source balance mismatch! Expected: ${expectedSourceBalance}, Actual: ${finalSrcBalance}`);
            }
        });

        it("should revert when transferring 0 tokens", async () => {
            const FOO: Token = {
                id: "0x85f75bb7fd0753565c1d2cb59bd881970b52c6f06f3472769ba7b48621cd9d23",
                symbol: "FOO",
                decimals: 18,
                name: "FOO",
                address: "rHN7vR4P1qDPGpnLgoXemuZhrm6AchBHvj",
                isNative: () => false,
            };
            await assertRevert(
                xrplChainSigner.transfer(
                    "0",
                    FOO,
                    destinationChain.interchainTokenServiceAddress,
                    xrplChainTranslator.translate("evm", sourceChain.name),
                    xrplChainTranslator.translate(ChainType.EVM, evmChainWallet.address),
                ),
                AssertionErrors.TRANSACTION_SUBMISSION_FAILED,
            );
        });
    });
});
