import { expect } from "chai";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describe, it, before } from "mocha";
import moduleConfig from "../../../module.config.example.json";
import { BankClient } from "../../../src/modules/bank/client";
import { Chain } from "@firewatch/core/chain";
import { BankModuleConfig } from "../../../src/modules/bank/config";
import { describeOrSkip } from "@testing/mocha/utils";

describeOrSkip(
    "BankModule",
    () => {
        return (
            isChainType(["cosmos"], moduleConfig.network as unknown as Chain) &&
            isChainEnvironment(["localnet", "devnet", "testnet", "mainnet"], moduleConfig.network as unknown as Chain)
        );
    },
    () => {
        let bankClient: BankClient;
        const network = moduleConfig.network;
        let bankModule: BankModuleConfig;
        let testAccountAddress: string;

        before(async () => {
            bankModule = moduleConfig.bank;

            bankClient = await BankClient.connect(network.urls.rpc);
            testAccountAddress = bankModule.account;
        });

        describe("getAllBalances", () => {
            it("should return an array of balances for a valid account", async () => {
                const balances = await bankClient.getAllBalances(testAccountAddress);
                expect(balances).to.be.an("array");
            });
        });
    },
);
