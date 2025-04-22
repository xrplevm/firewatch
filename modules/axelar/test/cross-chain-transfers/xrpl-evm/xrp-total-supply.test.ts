import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { dropsToXrp } from "xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.example.json";
import { Client } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { ERC20 } from "@shared/evm/contracts";
import BigNumber from "bignumber.js";
import { assertChainEnvironments, assertChainTypes, AssertionErrors } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";

describe("Total Supply", () => {
    const { sourceChain, destinationChain } = config.axelar;
    const gatewayAddress = destinationChain.contractAddresses.axelarGatewayAddress;

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

    describe("from xrpl-evm (source) chain to xrpl (destination) chain", () => {
        before(() => {
            assertChainEnvironments(["testnet", "mainnet"], config.axelar.sourceChain as unknown as AxelarBridgeChain);
            assertChainEnvironments(["testnet", "mainnet"], config.axelar.destinationChain as unknown as AxelarBridgeChain);
            assertChainTypes(["evm"], sourceChain as unknown as AxelarBridgeChain);
            assertChainTypes(["xrp"], destinationChain as unknown as AxelarBridgeChain);
        });
        it("should have gateway balance from XRPL >= total native token supply on xrpl-evm", async () => {
            const totalSupplyRaw = await tokenContract.totalSupply();
            const totalSupplyToken = ethers.formatUnits(totalSupplyRaw, 18);

            const gatewayBalanceRaw = await xrplChainProvider.getNativeBalance(gatewayAddress);
            const gatewayBalanceToken = dropsToXrp(gatewayBalanceRaw);

            if (!BigNumber(gatewayBalanceToken).isGreaterThanOrEqualTo(BigNumber(totalSupplyToken))) {
                throw new Error(AssertionErrors.GATEWAY_BALANCE_LESS_THAN_TOTAL_SUPPLY);
            }
        });
    });
});
