import { expect } from "chai";
import { describe, it, before } from "mocha";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { SlashingClient } from "../../../src/modules/slashing/client";
import moduleConfig from "../../../module.config.example.json";
import { Chain } from "@firewatch/core/chain";
import { SlashingModuleConfig } from "../../../src/modules/slashing/config";

describe("SlashingModule", () => {
    let slashingClient: SlashingClient;
    let slashingModule: SlashingModuleConfig;

    const network = moduleConfig.network;

    before(async () => {
        assertChainTypes(["cosmos"], network as unknown as Chain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], network as unknown as Chain);

        slashingModule = moduleConfig.slashing;

        slashingClient = await SlashingClient.connect(network.urls.rpc);
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
