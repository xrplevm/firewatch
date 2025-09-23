import { Chain } from "@firewatch/core/chain";
import { expect } from "chai";
import { describe, it, before } from "mocha";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describeOrSkip } from "@testing/mocha/utils";
import { FeemarketClient as FeemarketClientV2 } from "../../../src/modules/feemarket/v2/client";
import { QueryBaseFeeResponse, QueryParamsResponse } from "@firewatch/proto-evm/feemarket";
import {
    QueryParamsResponse as QueryParamsResponseV1,
    QueryBaseFeeResponse as QueryBaseFeeResponseV1,
} from "@firewatch/proto-evmos/feemarket";
import { FeemarketClient as FeemarketClientV1 } from "../../../src/modules/feemarket/v1/client";
import { TestConfigLoader } from "../../../src/test-utils/config";
import { CosmosModuleConfig } from "../../../src/config/module";

describeOrSkip(
    "FeemarketModule",
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
        let moduleConfig: CosmosModuleConfig;

        before(async () => {
            moduleConfig = await TestConfigLoader.getTestConfig();
        });
        describeOrSkip(
            "v1 (evmos)",
            () => {
                const env = TestConfigLoader.getCurrentEnvironment();
                return ["devnet", "testnet", "mainnet"].includes(env);
            },
            () => {
                let feemarketClientV1: FeemarketClientV1;
                let params: QueryParamsResponseV1;
                let expectedParams: any;
                let expectedBaseFee: any;

                before(async () => {
                    // Extract the expected config after moduleConfig is loaded
                    const {
                        v1: { params, baseFee },
                    } = moduleConfig.feemarket;
                    expectedParams = params;
                    expectedBaseFee = baseFee;

                    feemarketClientV1 = await FeemarketClientV1.connect(moduleConfig.network.urls.rpc!);
                });

                describe("getParams", () => {
                    before(async () => {
                        params = await feemarketClientV1.getParams();
                    });

                    it("should match expected no base feee", () => {
                        expect(params.params.noBaseFee).to.equal(expectedParams.noBaseFee);
                    });

                    it("should match expected base fee change denominator", () => {
                        expect(params.params.baseFeeChangeDenominator).to.equal(expectedParams.baseFeeChangeDenominator);
                    });

                    it("should match expected elasticity multiplier", () => {
                        expect(params.params.elasticityMultiplier).to.equal(expectedParams.elasticityMultiplier);
                    });

                    it("should match expected enable height", () => {
                        expect(params.params.enableHeight).to.equal(expectedParams.enableHeight);
                    });

                    it("should match expected base fee", () => {
                        expect(params.params.baseFee).to.equal(expectedParams.baseFee);
                    });

                    it("should match expected min gas price", () => {
                        expect(params.params.minGasPrice).to.equal(expectedParams.minGasPrice);
                    });

                    it("should match expected min gas multiplier", () => {
                        expect(params.params.minGasMultiplier).to.equal(expectedParams.minGasMultiplier);
                    });
                });

                describe("getBaseFee", () => {
                    let baseFee: QueryBaseFeeResponseV1;

                    before(async () => {
                        baseFee = await feemarketClientV1.getBaseFee();
                    });

                    it("should match expected base fee", () => {
                        expect(baseFee.baseFee).to.equal(expectedBaseFee);
                    });

                    it("should match params base fee", () => {
                        expect(params.params.baseFee).to.equal(expectedParams.baseFee);
                    });
                });
            },
        );

        describeOrSkip(
            "v2 (cosmos/evm)",
            () => {
                const env = TestConfigLoader.getCurrentEnvironment();
                return ["localnet"].includes(env);
            },
            () => {
                let feemarketClientV2: FeemarketClientV2;
                let params: QueryParamsResponse;
                let expectedParams: any;
                let expectedBaseFee: any;

                before(async () => {
                    // Extract the expected config after moduleConfig is loaded
                    const {
                        v2: { params, baseFee },
                    } = moduleConfig.feemarket;
                    expectedParams = params;
                    expectedBaseFee = baseFee;

                    feemarketClientV2 = await FeemarketClientV2.connect(moduleConfig.network.urls.rpc!);
                });

                describe("getParams", () => {
                    before(async () => {
                        params = await feemarketClientV2.getParams();
                    });

                    it("should match expected no base feee", () => {
                        expect(params.params.noBaseFee).to.equal(expectedParams.noBaseFee);
                    });

                    it("should match expected base fee change denominator", () => {
                        expect(params.params.baseFeeChangeDenominator).to.equal(expectedParams.baseFeeChangeDenominator);
                    });

                    it("should match expected elasticity multiplier", () => {
                        expect(params.params.elasticityMultiplier).to.equal(expectedParams.elasticityMultiplier);
                    });

                    it("should match expected enable height", () => {
                        expect(params.params.enableHeight).to.equal(expectedParams.enableHeight);
                    });

                    it("should match expected base fee", () => {
                        expect(params.params.baseFee).to.equal(expectedParams.baseFee);
                    });

                    it("should match expected min gas price", () => {
                        expect(params.params.minGasPrice).to.equal(expectedParams.minGasPrice);
                    });

                    it("should match expected min gas multiplier", () => {
                        expect(params.params.minGasMultiplier).to.equal(expectedParams.minGasMultiplier);
                    });
                });

                describe("getBaseFee", () => {
                    let baseFee: QueryBaseFeeResponse;

                    before(async () => {
                        baseFee = await feemarketClientV2.getBaseFee();
                    });

                    it("should match expected base fee", () => {
                        expect(baseFee.baseFee).to.equal(expectedBaseFee);
                    });

                    it("should match params base fee", () => {
                        expect(params.params.baseFee).to.equal(expectedParams.baseFee);
                    });
                });
            },
        );
    },
);
