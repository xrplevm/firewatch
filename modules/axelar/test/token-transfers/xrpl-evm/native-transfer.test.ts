import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { Client, Wallet } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";

describe("TokenTransfers/NativeTransfer", () => {
    let evmChainProvider: EthersProvider;
    let xrplChainProvider: XrplProvider;

    let _evmChainSigner: EthersSigner;
    let xrplChainSigner: XrplSigner;

    let evmJsonProvider: ethers.JsonRpcProvider;
    let xrplClient: Client;

    let evmChainWallet: ethers.Wallet;
    let xrplChainWallet: Wallet;

    before(async () => {
        evmJsonProvider = new ethers.JsonRpcProvider(config.axelar.sourceChain.urls.rpc);
        xrplClient = new Client(config.axelar.destinationChain.urls.ws);

        evmChainProvider = new EthersProvider(evmJsonProvider);
        xrplChainProvider = new XrplProvider(xrplClient);

        evmChainWallet = new ethers.Wallet(config.axelar.sourceChain.account.privateKey, evmJsonProvider);
        xrplChainWallet = Wallet.fromSeed(config.axelar.destinationChain.account.privateKey);

        _evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
        xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);
    });

    describe("from xrpl chain to evm chain - native token", () => {
        it("should transfer the token", async () => {
            const erc20 = evmChainProvider.getERC20Contract(config.axelar.sourceChain.nativeToken.address, evmChainWallet);
            const initialBalance = await erc20.balanceOf(evmChainWallet.address);

            // TODO: Add amount to config
            const amount = "1.33";

            await xrplChainSigner.transfer(
                amount,
                new Token({} as any),
                config.axelar.destinationChain.interchainTokenServiceAddress,
                config.axelar.sourceChain.name,
                evmChainWallet.address.startsWith("0x")
                    ? evmChainWallet.address.slice(2).toUpperCase()
                    : evmChainWallet.address.toUpperCase(),
            );

            await polling(
                async () => {
                    const balance = await erc20.balanceOf(evmChainWallet.address);
                    return BigNumber(balance.toString()).eq(BigNumber(initialBalance.toString()).plus(amount));
                },
                (res) => !res,
                config.axelar.interchainTransferOptions as PollingOptions,
            );
        });
    });
});
