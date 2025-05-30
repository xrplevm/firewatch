import { EthersProvider } from "@firewatch/bridge/providers/evm/ethers";
import { dropsToXrp } from "xrpl";
import { ethers } from "ethers";
import config from "../../../module.config.json";
import { Client } from "xrpl";
import { XrplProvider } from "@firewatch/bridge/providers/xrp/xrpl";
import { ERC20 } from "@shared/evm/contracts";
import BigNumber from "bignumber.js";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { AxelarBridgeChain } from "../../../src/models/chain";
import { HardhatErrors } from "@testing/hardhat/errors";
import { describeOrSkip } from "@testing/mocha/utils";

describeOrSkip(
    "Total Supply",
    () => {
        return (
            isChainType(["evm"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainType(["xrp"], config.xrplChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["testnet", "mainnet"], config.xrplEvmChain as unknown as AxelarBridgeChain) &&
            isChainEnvironment(["testnet", "mainnet"], config.xrplChain as unknown as AxelarBridgeChain)
        );
    },
    () => {
        const { xrplEvmChain, xrplChain } = config;
        const gatewayAddress = xrplChain.axelarGatewayAddress;

        let evmChainProvider: EthersProvider;
        let xrplChainProvider: XrplProvider;

        let evmJsonProvider: ethers.JsonRpcProvider;
        let xrplClient: Client;

        let tokenContract: ERC20;

        before(async () => {
            evmJsonProvider = new ethers.JsonRpcProvider(xrplEvmChain.urls.rpc);
            xrplClient = new Client(xrplChain.urls.ws);

            evmChainProvider = new EthersProvider(evmJsonProvider);
            xrplChainProvider = new XrplProvider(xrplClient);

            tokenContract = evmChainProvider.getERC20Contract(xrplEvmChain.nativeToken.address);
        });

        describe("from xrpl-evm (source) chain to xrpl (destination) chain", () => {
            before(() => {
                isChainType(["evm"], xrplEvmChain as unknown as AxelarBridgeChain);
                isChainType(["xrp"], xrplChain as unknown as AxelarBridgeChain);
            });
            it("should have gateway balance from XRPL >= total native token supply on xrpl-evm", async () => {
                const totalSupplyRaw = await tokenContract.totalSupply();
                const totalSupplyToken = ethers.formatUnits(totalSupplyRaw, 18);

                const gatewayBalanceRaw = await xrplChainProvider.getNativeBalance(gatewayAddress);
                const gatewayBalanceToken = dropsToXrp(gatewayBalanceRaw);

                if (!BigNumber(gatewayBalanceToken).isGreaterThanOrEqualTo(BigNumber(totalSupplyToken))) {
                    throw new Error("Gateway balance on XRPL is less than the total token supply on xrpl-evm");
                }
            });
        });
    },
);
