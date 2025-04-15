import { expect } from "chai";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { describe, it, before } from "mocha";
import moduleConfig from "../../../module.config.example.json";
import { StargateClient } from "@cosmjs/stargate";
import { CosmosChain } from "../../../src/models/chain";

describe("Bank Module", () => {
    let cosmosClient: StargateClient;
    const chain = moduleConfig.cosmos.chain;
    let testAccountAddress: string;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as CosmosChain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as CosmosChain);

        cosmosClient = await StargateClient.connect(chain.urls.rpc);
        testAccountAddress = chain.account.name;
    });

    describe("getAllBalances", () => {
        it("should return an array of balances for a valid account", async () => {
            const balances = await cosmosClient.getAllBalances(testAccountAddress);
            expect(balances).to.be.an("array");
        });
    });
});
