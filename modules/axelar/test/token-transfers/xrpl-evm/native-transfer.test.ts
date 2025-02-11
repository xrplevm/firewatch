import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { Client, Wallet } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import { polling } from "../../../../../packages/shared/utils/src/polling";
import BigNumber from "bignumber.js";

describe("TokenTransfers/NativeTransfer", () => {
    let evmChainProvider: EthersProvider;
    let xrplChainProvider: XrplProvider;

    let _evmChainSigner: EthersSigner;
    let _xrplChainSigner: XrplSigner;

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
        _xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);
    });

    // describe("from evm chain to xrpl chain", () => {
    //     it("should transfer the token", async () => {
    //         const its = evmChainProvider.getInterchainTokenServiceContract(
    //             config.axelar.sourceChain.interchainTokenServiceAddress,
    //             evmChainWallet,
    //         );

    //         await its.interchainTransfer(
    //             config.axelar.sourceChain.tokenId,
    //             config.axelar.destinationChain.name,
    //             "0x09184751b554b7C2ca609b7bB7Af2e75cb7C06e8",
    //             ethers.parseUnits("0.1245678910009"),
    //             "0x00",
    //             ethers.parseEther("5"),
    //             {
    //                 gasLimit: 8000000,
    //                 value: ethers.parseEther("6"),
    //             },
    //         );
    //     });
    // });

    describe("from xrpl chain to evm chain", () => {
        it("should transfer the token", async () => {
            const erc20 = evmChainProvider.getERC20Contract("0xD4949664cD82660AaE99bEdc034a0deA8A0bd517", evmChainWallet);
            const initialBalance = await erc20.balanceOf("0xE5C184C4865D47FA1717CF78BEDA608774C90A2D");

            const amount = "1.33";

            await _xrplChainSigner.transfer(
                amount,
                new Token({} as any),
                "rGAbJZEzU6WaYv5y1LfyN7LBBcQJ3TxsKC",
                config.axelar.sourceChain.name,
                "E5C184C4865D47FA1717CF78BEDA608774C90A2D".toUpperCase(),
            );

            await polling(
                async () => {
                    const balance = await erc20.balanceOf("0xE5C184C4865D47FA1717CF78BEDA608774C90A2D");
                    return BigNumber(balance.toString()).eq(BigNumber(initialBalance.toString()).plus(amount));
                },
                (res) => !res,
                {
                    delay: 2000,
                    maxIterations: 100,
                    timeout: 2000 * 100,
                },
            );
        });
    });
});
