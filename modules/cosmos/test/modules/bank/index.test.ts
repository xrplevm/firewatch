import { expect } from "chai";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { describe, it, before } from "mocha";
import moduleConfig from "../../../module.config.example.json";
import { BankClient } from "../../../src/modules/bank/client";
import { Chain } from "@firewatch/core/chain";
import { BankModule } from "../../../src/modules/bank/module";

describe("Bank Module", () => {
    let bankClient: BankClient;
    const chain = moduleConfig.chain;
    let bankModule: BankModule;
    let testAccountAddress: string;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as Chain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as Chain);
        bankModule = moduleConfig.modules.bank;

        bankClient = await BankClient.connect(chain.urls.rpc);
        testAccountAddress = bankModule.account;
    });

    describe("getAllBalances", () => {
        it("should return an array of balances for a valid account", async () => {
            const balances = await bankClient.getAllBalances(testAccountAddress);
            expect(balances).to.be.an("array");
        });
    });
});
