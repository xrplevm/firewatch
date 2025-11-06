import { expect } from "chai";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describe, it, before } from "mocha";
import { BankClient } from "../../../src/modules/bank/client";
import { Chain } from "@firewatch/core/chain";
import { BankModuleConfig } from "../../../src/modules/bank/config";
import { describeOrSkip } from "@testing/mocha/utils";
import { TestConfigLoader } from "../../../src/test-utils/config";
import { CosmosModuleConfig } from "../../../src/config/module";

describeOrSkip(
    "BankModule",
    () => {
        try {
            // We can't use async here, so we'll validate the environment name instead
            const env = TestConfigLoader.getCurrentEnvironment();
            return ["localnet", "devnet", "testnet", "mainnet"].includes(env);
        } catch (error) {
            console.warn(`Failed to determine test environment: ${error}`);
            return false;
        }
    },
    () => {
        let bankClient: BankClient;
        let moduleConfig: CosmosModuleConfig;
        let bankModule: BankModuleConfig;
        let testAccountAddress: string;

        before(async () => {
            moduleConfig = await TestConfigLoader.getTestConfig();
            bankModule = moduleConfig.bank;

            bankClient = await BankClient.connect(moduleConfig.network.urls.rpc!);
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
