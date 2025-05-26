import { AbiCoder, ethers } from "ethers";
import config from "../../../module.config.json";
import { polling, PollingOptions } from "@shared/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { Token } from "@firewatch/core/token";
import { AxelarExecutable, InterchainTokenExecutable } from "@shared/evm/contracts";
import { XrplSigner } from "@firewatch/bridge/signers/xrp/xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";
import { ChainType } from "@shared/modules/chain";
import { describeOrSkip, itOrSkip } from "@testing/mocha/utils";

describeOrSkip(
    "call contract xrpl -> evm",
    () => {
        return (
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain) &&
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["devnet", "testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplChain, xrplEvmChain } = config;

        let xrplChainProvider: XrplProvider;

        let xrplChainSigner: XrplSigner;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let evmChainWallet: ethers.Wallet;
        let xrplChainWallet: Wallet;

        let xrplChainTranslator: XrpTranslator;

        let destinationAxelarExecutable: AxelarExecutable;
        let destinationInterchainTokenExecutable: InterchainTokenExecutable;

        let destAxExecAddress: string;
        let destIntTokenExecAddress: string;

        let xrplTransferAmount: string;

        const pollingOpts = config.xrplEvmChain as PollingOptions;

        before(async () => {
            const { urls: destUrls, axelarExecutableExampleAddress, interchainTokenExecutableExampleAddress } = xrplEvmChain;

            destAxExecAddress = axelarExecutableExampleAddress;
            destIntTokenExecAddress = interchainTokenExecutableExampleAddress;

            xrplClient = new Client(xrplChain.urls.ws);
            evmJsonProvider = new ethers.JsonRpcProvider(destUrls.rpc);

            xrplChainProvider = new XrplProvider(xrplClient);

            xrplChainWallet = Wallet.fromSeed(xrplChain.account.privateKey);
            evmChainWallet = new ethers.Wallet(xrplEvmChain.account.privateKey, evmJsonProvider);

            xrplChainSigner = new XrplSigner(xrplChainWallet, xrplChainProvider);

            xrplChainTranslator = new XrpTranslator();

            destinationAxelarExecutable = new AxelarExecutable(destAxExecAddress, evmChainWallet);
            destinationInterchainTokenExecutable = new InterchainTokenExecutable(destIntTokenExecAddress, evmChainWallet);

            xrplTransferAmount = xrpToDrops(xrplChain.interchainTransferOptions.amount);
        });

        describe("xrpl transfers with call_contract memo trigger the axelarexecutable.execute smart contract function", () => {
            // TODO: failing in devnet, stuck in approving step (xrpl -> axelar)/error after approved, i guess either xrpl or axelar devnet doesn't support this memo
            itOrSkip(
                "should update destination state",
                () => {
                    return isChainEnvironment(["testnet", "mainnet"], config.xrplChain as unknown as AxelarBridgeChain);
                },
                async () => {
                    const msgText = `Hello from the source chain! ${Date.now()}`;
                    const abiCoder = new AbiCoder();

                    const payload = abiCoder.encode(["string"], [msgText]);
                    await xrplChainSigner.callContract(
                        xrplChain.interchainTokenServiceAddress,
                        xrplEvmChain.name,
                        xrplChainTranslator.translate(ChainType.EVM, destAxExecAddress),
                        xrplChainTranslator.translate(ChainType.EVM, payload),
                        xrplTransferAmount,
                        new Token({} as any),
                    );

                    await polling(
                        async () => {
                            const lastPayload = await destinationAxelarExecutable.lastPayload();
                            if (!lastPayload || lastPayload === "0x" || lastPayload.length === 0) {
                                return false;
                            }
                            const asciiHex = ethers.toUtf8String(lastPayload);
                            const abiHex = "0x" + asciiHex;

                            const [decoded] = abiCoder.decode(["string"], abiHex);
                            return decoded.includes(msgText);
                        },
                        (done) => !done,
                        pollingOpts,
                    );
                },
            );
        });

        describe("xrpl transfers with interchain_transfer memo trigger the interchaintokenexecutable.execute smart contract function", () => {
            it("should update destination state", async () => {
                const msgText = `Hello from the source chain! ${Date.now()}`;
                const abiCoder = new AbiCoder();
                const payload = abiCoder.encode(["string"], [msgText]);

                await xrplChainSigner.transfer(
                    xrplTransferAmount,
                    new Token({} as any),
                    xrplChain.interchainTokenServiceAddress,
                    xrplEvmChain.name,
                    xrplChainTranslator.translate(ChainType.EVM, xrplEvmChain.interchainTokenExecutableExampleAddress),
                    { payload: xrplChainTranslator.translate(ChainType.EVM, payload) },
                );

                let decodedMsg: string;

                await polling(
                    async () => {
                        const finalPayload = await destinationInterchainTokenExecutable.data();
                        let asciiHex = ethers.toUtf8String(finalPayload);
                        if (asciiHex.startsWith("0x")) {
                            asciiHex = asciiHex.slice(2);
                        }
                        const abiHex = "0x" + asciiHex;

                        [decodedMsg] = abiCoder.decode(["string"], abiHex);

                        return decodedMsg === msgText;
                    },
                    (done) => !done,
                    pollingOpts,
                );
            });
        });
    },
);
