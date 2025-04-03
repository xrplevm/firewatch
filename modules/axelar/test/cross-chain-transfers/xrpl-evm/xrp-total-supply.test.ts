import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { ethers } from "ethers";
import config from "../../../config/testnet.config.example.json";
import { Client } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { ERC20 } from "@shared/evm/contracts";
import BigNumber from "bignumber.js";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";

describe("Total Supply, Sidechain-EVM native token vs XRPL.gateWay", () => {
    const { sourceChain, destinationChain } = config.axelar;
    const gatewayAddress = destinationChain.contractAddresses.axelarAmplifierGatewayAddress;

    let evmChainProvider: EthersProvider;
    let xrplChainProvider: XrplProvider;

    let evmJsonProvider: ethers.JsonRpcProvider;
    let xrplClient: Client;

    let tokenContract: ERC20;

    before(async () => {
        assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
        assertChainTypes(["xrp"], destinationChain as unknown as AxelarBridgeChain);

        evmJsonProvider = new ethers.JsonRpcProvider(sourceChain.urls.rpc);
        xrplClient = new Client(destinationChain.urls.ws);

        evmChainProvider = new EthersProvider(evmJsonProvider);
        xrplChainProvider = new XrplProvider(xrplClient);

        tokenContract = evmChainProvider.getERC20Contract(sourceChain.nativeToken.address);
    });

    describe("from evm chain to xrpl chain", () => {
        before(() => {
            // In devnet, tokens were minted on Sidechain-EVM, it doesn't make sense to make the test.
            assertChainEnvironments(["testnet", "mainnet"], config.axelar.sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["testnet", "mainnet"], config.axelar.destinationChain as unknown as AxelarBridgeChain);
        });
        it("should have gateway balance >= total native token supply on source chain", async () => {
            const totalSupplyRaw = await tokenContract.totalSupply();
            const totalSupplyToken = ethers.formatUnits(totalSupplyRaw, 18);

            const gatewayBalanceRaw = await xrplChainProvider.getNativeBalance(gatewayAddress);
            const gatewayBalanceToken = ethers.formatUnits(gatewayBalanceRaw, 6);

            if (!BigNumber(gatewayBalanceToken).isGreaterThanOrEqualTo(BigNumber(totalSupplyToken))) {
                throw new Error("Gateway balance is less than the total supply of native token");
            }
        });
    });
});
