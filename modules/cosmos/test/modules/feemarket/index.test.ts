import { Chain } from "@firewatch/core/chain";
import { expect } from "chai";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { describeOrSkip } from "@testing/mocha/utils";
import { FeemarketClient as FeemarketClientV2 } from "../../../src/modules/feemarket/v2/client";
import { QueryBaseFeeResponse, QueryParamsResponse } from "@firewatch/proto-evm/feemarket";
import {
    QueryParamsResponse as QueryParamsResponseV1,
    QueryBaseFeeResponse as QueryBaseFeeResponseV1,
} from "@firewatch/proto-evmos/feemarket";
import { FeemarketClient as FeemarketClientV1 } from "../../../src/modules/feemarket/v1/client";
import moduleConfig from "../../../module.config.json";

describeOrSkip(
    "FeemarketModule",
    () => {
        return isChainType(["cosmos"], moduleConfig.network as unknown as Chain);
    },
    () => {
        describeOrSkip(
            "v1 (evmos)",
            () => isChainEnvironment(["testnet", "mainnet"], moduleConfig.network as unknown as Chain),
            () => {
                let feemarketClientV1: FeemarketClientV1;
                let params: QueryParamsResponseV1;

                const {
                    v1: { params: expectedParams, baseFee: expectedBaseFee },
                } = moduleConfig.feemarket;

                before(async () => {
                    feemarketClientV1 = await FeemarketClientV1.connect(moduleConfig.network.urls.rpc);
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
            () => isChainEnvironment(["localnet", "devnet"], moduleConfig.network as unknown as Chain),
            () => {
                let feemarketClientV2: FeemarketClientV2;
                let params: QueryParamsResponse;

                const {
                    v2: { params: expectedParams, baseFee: expectedBaseFee },
                } = moduleConfig.feemarket;

                before(async () => {
                    feemarketClientV2 = await FeemarketClientV2.connect(moduleConfig.network.urls.rpc);
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
