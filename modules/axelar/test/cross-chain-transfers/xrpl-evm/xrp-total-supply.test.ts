import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { EthersSigner } from "@firewatch/bridge/signers/evm/ethers";
import { XrplSigner, XrplSignerErrors } from "@firewatch/bridge/signers/xrp/xrpl";
import { ethers } from "ethers";
import config from "../../../config/devnet.config.example.json";
import { Client, Wallet, xrpToDrops } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { Token } from "@firewatch/core/token";
import { ERC20 } from "@shared/evm/contracts";

import { polling, PollingOptions } from "@shared/utils";
import BigNumber from "bignumber.js";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { ChainType } from "@shared/modules/chain";
import { EvmTranslator } from "@firewatch/bridge/translators/evm";
import { XrpTranslator } from "@firewatch/bridge/translators/xrp";

describe("Total Supply, Sidechain-EVM native token vs XRPL.gateWay", () => {
    const { sourceChain, destinationChain, interchainTransferOptions } = config.axelar;

    let evmChainProvider: EthersProvider;
    let xrplChainProvider: XrplProvider;

    let evmChainSigner: EthersSigner;
    let xrplChainSigner: XrplSigner;

    let evmJsonProvider: ethers.JsonRpcProvider;
    let xrplClient: Client;

    let evmChainWallet: ethers.Wallet;
    let xrplChainWallet: Wallet;

    let tokenContract: ERC20;

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

        tokenContract = evmChainProvider.getERC20Contract(sourceChain.nativeToken.address, evmChainWallet);
    });

    describe("from evm chain to xrpl chain", () => {
        before(() => {
            assertChainEnvironments(["devnet", "testnet", "mainnet"], config.axelar.sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["devnet", "testnet", "mainnet"], config.axelar.destinationChain as unknown as AxelarBridgeChain);
        });
        it("should have gateway balance >= total native token supply on source chain", async () => {
            console.log("Initializing ERC20 contract for native token...");
            const tokenContract = evmChainProvider.getERC20Contract(sourceChain.nativeToken.address, evmChainWallet);
            console.log("ERC20 contract initialized at address:", sourceChain.nativeToken.address);

            console.log("Fetching total supply from ERC20 contract...");
            const totalSupplyRaw = await tokenContract.totalSupply();
            const totalSupplyWei = new BigNumber(totalSupplyRaw.toString());
            console.log("Total Supply in wei (raw):", totalSupplyWei.toString());

            // Convert total supply from wei (18 decimals) to token units
            const totalSupplyToken = totalSupplyWei.dividedBy(new BigNumber(10).pow(18));
            console.log("Total Supply in token units:", totalSupplyToken.toString());

            const gatewayAddress = destinationChain.contractAddresses.axelarAmplifierGatewayAddress;
            console.log("Gateway address for destination chain:", gatewayAddress);

            console.log("Fetching native balance from XRPL gateway...");
            const gatewayBalanceRaw = await xrplChainProvider.getNativeBalance(gatewayAddress);
            const gatewayBalanceDrops = new BigNumber(gatewayBalanceRaw);
            console.log("Gateway Balance in drops (raw):", gatewayBalanceDrops.toString());

            // Convert gateway balance from drops (6 decimals) to token units
            const gatewayBalanceToken = gatewayBalanceDrops.dividedBy(new BigNumber(10).pow(6));
            console.log("Gateway Balance in token units:", gatewayBalanceToken.toString());

            // Compare both token unit values
            console.log("Comparing gateway balance with total native token supply in token units...");
            if (!gatewayBalanceToken.isGreaterThanOrEqualTo(totalSupplyToken)) {
                console.error("Assertion Failed: Gateway balance (in token units) is less than the total supply.");
                throw new Error("Gateway balance is less than the total supply of native token");
            }
            console.log("Assertion Passed: Gateway balance (in token units) is >= total supply.");
        });
    });
});
