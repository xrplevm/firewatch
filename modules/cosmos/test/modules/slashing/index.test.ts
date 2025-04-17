import { expect } from "chai";
import { describe, it, before } from "mocha";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { SlashingClient } from "../../../src/modules/slashing/client";
import moduleConfig from "../../../module.config.example.json";
import { Chain } from "@firewatch/core/chain";
import { SlashingModule } from "../../../src/modules/slashing/module";

describe("Slashing Module", () => {
    let slashingClient: SlashingClient;
    let slashingModule: SlashingModule;

    const chain = moduleConfig.chain;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as Chain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as Chain);

        slashingModule = moduleConfig.modules.slashing;

        slashingClient = await SlashingClient.connect(chain.urls.rpc);
    });

    describe("Slash fractions", () => {
        it("should return a double sign fraction matching the config", async () => {
            const fraction = await slashingClient.getSlashFractionDoubleSignAsString();
            expect(fraction).to.equal(slashingModule.slashDoubleSignFraction);
        });

        it("should return a downtime fraction matching the config", async () => {
            const fraction = await slashingClient.getSlashFractionDowntimeAsString();
            expect(fraction).to.equal(slashingModule.slashDowntimeFraction);
        });
    });
});
