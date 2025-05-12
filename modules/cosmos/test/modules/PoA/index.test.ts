import { expect } from "chai";
import { describe, it, before } from "mocha";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import moduleConfig from "../../../module.config.json";
import { Chain } from "@firewatch/core/chain";
import { describeOrSkip } from "@testing/mocha/utils";
import { PoAClient } from "../../../src/modules/PoA/client";
import { PoAModuleConfig } from "../../../src/modules/PoA/config";

describeOrSkip(
    "PoaModule",
    () => {
        return (
            isChainType(["cosmos"], moduleConfig.network as unknown as Chain) &&
            isChainEnvironment(["localnet", "devnet", "testnet", "mainnet"], moduleConfig.network as unknown as Chain)
        );
    },
    () => {
        let poaClient: PoAClient;
        const network = moduleConfig.network;
        let poaModule: PoAModuleConfig;

        before(async () => {
            poaModule = moduleConfig.poa;

            poaClient = await PoAClient.connect(network.urls.rpc);
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
