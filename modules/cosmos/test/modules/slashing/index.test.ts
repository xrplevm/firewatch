import { expect } from "chai";
import { describe, it, before } from "mocha";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { SlashingClient } from "../../../src/modules/slashing/client";
import moduleConfig from "../../../module.config.example.json";
import { Chain } from "@firewatch/core/chain";

describe("Slashing Module", () => {
    let slashingClient: SlashingClient;

    const chain = moduleConfig.chain;
    const slashingModule = moduleConfig.modules.slashing;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as Chain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as Chain);

        slashingClient = await SlashingClient.connect(chain.urls.rpc);
    });

    it("should return a double sign fraction matching the config", async function () {
        const fraction = await slashingClient.getSlashFractionDoubleSignAsString();
        expect(fraction).to.equal(slashingModule.slashDoubleSignFraction);
    });

    it("should return a downtime fraction matching the config", async function () {
        const fraction = await slashingClient.getSlashFractionDowntimeAsString();
        expect(fraction).to.equal(slashingModule.slashDowntimeFraction);
    });
});
