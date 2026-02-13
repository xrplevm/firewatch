import { expect } from "chai";
import { describe, it, before } from "mocha";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { SlashingClient } from "../../../src/modules/slashing/client";
import { Chain } from "@firewatch/core/chain";
import { SlashingModuleConfig } from "../../../src/modules/slashing/config";
import { describeOrSkip } from "@testing/mocha/utils";
import { TestConfigLoader } from "../../../src/test-utils/config";
import { CosmosModuleConfig } from "../../../src/config/module";

describeOrSkip(
    "SlashingModule",
    () => {
        try {
            const env = TestConfigLoader.getCurrentEnvironment();
            return ["localnet", "devnet", "testnet", "mainnet"].includes(env);
        } catch (error) {
            console.warn(`Failed to determine test environment: ${error}`);
            return false;
        }
    },
    () => {
        let slashingClient: SlashingClient;
        let slashingModule: SlashingModuleConfig;
        let moduleConfig: CosmosModuleConfig;

        before(async () => {
            moduleConfig = await TestConfigLoader.getTestConfig();
            slashingModule = moduleConfig.slashing;

            slashingClient = await SlashingClient.connect(moduleConfig.network.urls.rpc!);
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
    },
);
