import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { AbiCoder, ethers } from "ethers";
import config from "../../../module.config.example.json";
import { polling, PollingOptions } from "@shared/utils";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { Token } from "@firewatch/core/token";
import { CallContract } from "@shared/evm/contracts";
import { expectMessageUpdate, expectEventEmission } from "../evm-evm/call-contract.helpers";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { ChainType } from "@shared/modules/chain";

describe("CallContract XRP - EVM", () => {
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

    let destinationCallContract: CallContract;

    const pollingOpts = interchainTransferOptions as PollingOptions;

    before(async () => {
        assertChainTypes(["xrp"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["evm"], destinationChain as unknown as AxelarBridgeChain);

        const { urls: destUrls, callContractWithTokenAddress: destCallContractAddress } = destinationChain;

        xrplClient = new Client(sourceChain.urls.ws);
        evmJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

        xrplChainProvider = new XrplProvider(xrplClient);
        evmChainProvider = new EthersProvider(evmJsonProvider);

        xrplChainWallet = Wallet.fromSeed(sourceChain.account.privateKey);
        evmChainWallet = new ethers.Wallet(destinationChain.account.privateKey, evmJsonProvider);
        console.log({ evmChainWallet });

        evmChainSigner = new EthersSigner(evmChainWallet, evmChainProvider);
        console.log(await evmChainSigner.getAddress());
        xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

        evmChainTranslator = new EvmTranslator();
        xrplChainTranslator = new XrpTranslator();

        destinationCallContract = new CallContract(destCallContractAddress, evmChainWallet);
        if (!xrplClient.isConnected()) {
            console.log("Connecting to XRPL...");
            await xrplClient.connect();
        }
        console.log("XRPL Client Connected:", xrplClient.isConnected());
    });

    describe("from xrp Source chain to evm Destination chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], destinationChain as unknown as AxelarBridgeChain);
        });

        it("should update destination state when a non-empty message is sent", async () => {
            const msgText = `Hello from the source chain! ${Date.now()}`;
            const abiCoder = new AbiCoder();
            const payload = abiCoder.encode(["string"], [msgText]);
            console.log({ xrplChainWallet });
            const tx = await xrplChainSigner.callContractWithToken(
                "0.00001",
                new Token({} as any),
                sourceChain.interchainTokenServiceAddress,
                destinationChain.name,
                xrplChainTranslator.translate(ChainType.EVM, destinationChain.callContractWithTokenAddress),
                payload,
            );
            const confirmedTx = await tx.wait();

            console.log("Transaction Sent:", tx);
            console.log("Transaction Confirmed:", confirmedTx);
            const txDetails = await xrplClient.request({
                command: "tx",
                transaction: confirmedTx.hash,
                binary: false, // Ensure human-readable format
            });

            console.log("Full XRPL Transaction Details:", txDetails);

            let finalMessage: string;
            await polling(
                async () => {
                    finalMessage = await destinationCallContract.message();
                    console.log({ finalMessage });
                    return finalMessage.includes(msgText);
                },
                (result) => !result,
                pollingOpts,
            );
        });
    });
});
