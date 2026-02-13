import { expect } from "chai";
import { describe, it, before } from "mocha";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { Chain } from "@firewatch/core/chain";
import { describeOrSkip } from "@testing/mocha/utils";
import { PoaClient } from "../../../src/modules/poa/client";
import { PoaModuleConfig } from "../../../src/modules/poa/config";
import { TestConfigLoader } from "../../../src/test-utils/config";
import { CosmosModuleConfig } from "../../../src/config/module";

describeOrSkip(
    "PoaModule",
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
        let poaClient: PoaClient;
        let moduleConfig: CosmosModuleConfig;
        let poaModule: PoaModuleConfig;

        before(async () => {
            moduleConfig = await TestConfigLoader.getTestConfig();
            poaModule = moduleConfig.poa;

            poaClient = await PoaClient.connect(moduleConfig.network.urls.rpc!);
        });

        describe("Validator staking and self-delegation", () => {
            it("should have the same amount of staking bond for all validators", async () => {
                const validators = await poaClient.getValidators();
                expect(validators.length).to.be.greaterThan(0);

                for (const validator of validators) {
                    expect(validator.tokens).to.equal(poaModule.stakedAmount);
                }
            });
            it("should have only self delegation for each validator", async function () {
                const validators = await poaClient.getValidators();

                for (const validator of validators) {
                    const delegationResponse = await poaClient.getValidatorDelegations(validator.operatorAddress);

                    expect(delegationResponse.delegationResponses).to.have.lengthOf(1);

                    const selfDelegation = delegationResponse.delegationResponses[0];

                    expect(selfDelegation.delegation.validatorAddress).to.equal(validator.operatorAddress);
                    expect(selfDelegation.delegation?.shares).to.equal(validator.delegatorShares);
                }
            });
        });
    },
);
