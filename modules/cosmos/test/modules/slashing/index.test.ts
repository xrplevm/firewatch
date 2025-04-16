import { expect } from "chai";
import { describe, it, before } from "mocha";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { SlashingClient } from "../../../src/modules/slashing/client";
import { CosmosChain } from "../../../src/models/chain";
import moduleConfig from "../../../module.config.example.json";

describe("Slashing Module", () => {
    let slashingClient: SlashingClient;

    const chain = moduleConfig.cosmos.chain;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as CosmosChain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as CosmosChain);

        slashingClient = await SlashingClient.connect(chain.urls.rpc);
    });

    it("should return a double sign fraction matching the config", async function () {
        const fraction = await slashingClient.getSlashFractionDoubleSignAsString();
        expect(fraction).to.equal(chain.module.doubleSignerFraction);
    });

    it("should return a downtime fraction matching the config", async function () {
        const fraction = await slashingClient.getSlashFractionDowntimeAsString();
        expect(fraction).to.equal(chain.module.downtimeFraction);
    });
});
