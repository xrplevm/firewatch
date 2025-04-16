import { expect } from "chai";
import { describe, it, before } from "mocha";
import { assertChainEnvironments, assertChainTypes } from "@testing/mocha/assertions";
import { PoAClient } from "../../../src/modules/PoA/client";
import { CosmosChain } from "../../../src/models/chain";
import moduleConfig from "../../../module.config.example.json";

describe("PoA Module", () => {
    let poaClient: PoAClient;
    const chain = moduleConfig.cosmos.chain;

    before(async () => {
        assertChainTypes(["cosmos"], chain as unknown as CosmosChain);
        assertChainEnvironments(["localnet", "devnet", "testnet", "mainnet"], chain as unknown as CosmosChain);

        poaClient = await PoAClient.connect(chain.urls.rpc, chain.module);
    });

    describe("Validator staking and self-delegation", () => {
        it("should have the staking bond for all validators", async () => {
            const validators = await poaClient.getValidators();
            expect(validators.length).to.be.greaterThan(0);

            for (const validator of validators) {
                expect(validator.tokens).to.equal(chain.module.stakedAmount);
            }
        });

        it("should have only self delegation share for each validator", async () => {
            const validators = await poaClient.getValidators();
            expect(validators.length).to.be.greaterThan(0);

            for (const validator of validators) {
                const selfDelegationShare = await poaClient.getValidatorSelfDelegationShare(
                    validator.operatorAddress,
                    chain.module.delegatorPrefix,
                );
                const prova = await poaClient.getValidatorDelegations(validator.operatorAddress);
                console.log(prova.delegationResponses);
                expect(selfDelegationShare).to.equal(validator.delegatorShares);
            }
        });
    });
});
