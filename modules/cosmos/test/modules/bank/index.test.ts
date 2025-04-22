import { expect } from "chai";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { describe, it, before } from "mocha";
import moduleConfig from "../../../module.config.example.json";
import { BankClient } from "../../../src/modules/bank/client";
import { Chain } from "@firewatch/core/chain";
import { BankModuleConfig } from "../../../src/modules/bank/config";

describe("BankModule", () => {
    let bankClient: BankClient;
    const network = moduleConfig.network;
    let bankModule: BankModuleConfig;
    let testAccountAddress: string;

    before(async () => {
        assertChainTypes(["cosmos"], network as unknown as Chain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], network as unknown as Chain);
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
});
