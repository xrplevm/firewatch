import { expect } from "chai";
import { describe, it, before } from "mocha";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { SlashingClient } from "../../../src/modules/slashing/client";
import moduleConfig from "../../../module.config.json";
import { Chain } from "@firewatch/core/chain";
import { SlashingModuleConfig } from "../../../src/modules/slashing/config";
import { describeOrSkip } from "@testing/mocha/utils";

describeOrSkip(
    "SlashingModule",
    () => {
        return (
            isChainType(["cosmos"], moduleConfig.network as unknown as Chain) &&
            isChainEnvironment(["localnet", "devnet", "testnet", "mainnet"], moduleConfig.network as unknown as Chain)
        );
    },
    () => {
        let slashingClient: SlashingClient;
        let slashingModule: SlashingModuleConfig;

        const network = moduleConfig.network;

        before(async () => {
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
    },
);
