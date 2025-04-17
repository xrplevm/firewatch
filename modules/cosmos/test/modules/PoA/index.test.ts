import { expect } from "chai";
import { describe, it, before } from "mocha";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { PoAClient } from "../../../src/modules/PoA/client";
import moduleConfig from "../../../module.config.example.json";
import { Chain } from "@firewatch/core/chain";
import { PoAModule } from "../../../src/modules/PoA/module";

describe("PoA Module", () => {
    let poaClient: PoAClient;
    const chain = moduleConfig.chain;
    let poaModule: PoAModule;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as Chain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as Chain);

        poaModule = moduleConfig.modules.poa;

        poaClient = await PoAClient.connect(chain.urls.rpc);
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
});
