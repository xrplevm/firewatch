import { expect } from "chai";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { describe, it, before } from "mocha";
import moduleConfig from "../../../module.config.example.json";
import { CosmosChain } from "../../../src/models/chain";
import { BankClient } from "../../../src/modules/bank/client";

describe("Bank Module", () => {
    let bankClient: BankClient;
    const chain = moduleConfig.cosmos.chain;
    let testAccountAddress: string;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as CosmosChain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as CosmosChain);

        bankClient = await BankClient.connect(chain.urls.rpc);
        testAccountAddress = chain.account.name;
    });

    describe("getAllBalances", () => {
        it("should return an array of balances for a valid account", async () => {
            const balances = await bankClient.getAllBalances(testAccountAddress);
            expect(balances).to.be.an("array");
        });
    });
});
