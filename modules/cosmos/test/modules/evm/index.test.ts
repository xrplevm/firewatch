import { describe, it, before } from "mocha";
import { expect } from "chai";
import { EvmClient as EvmClientV2 } from "../../../src/modules/evm/v2/client";
import { EvmClient as EvmClientV1 } from "../../../src/modules/evm/v1/client";
import { describeOrSkip } from "@testing/mocha/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import { Chain } from "@firewatch/core/chain";
import { QueryParamsResponse } from "@firewatch/proto-evmos/evm";
import { QueryParamsResponse as QueryParamsResponseV2 } from "@firewatch/proto-evm/evm";
import { TestConfigLoader } from "../../../src/test-utils/config";
import { CosmosModuleConfig } from "../../../src/config/module";

describeOrSkip(
    "EvmModule",
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
                let evmClientV1: EvmClientV1;
                let expectedParams: any;
                let expectedAccounts: any;

                before(async () => {
                    // Extract the expected config after moduleConfig is loaded
                    const {
                        v1: { params, accounts },
                    } = moduleConfig.evm;
                    expectedParams = params;
                    expectedAccounts = accounts;

                    evmClientV1 = await EvmClientV1.connect(moduleConfig.network.urls.rpc!);
                });

                describe("getParams", () => {
                    let params: QueryParamsResponse;

                    before(async () => {
                        params = await evmClientV1.getParams();
                    });

                    it("should match expected active static precompiles", async () => {
                        expect(params.params.activeStaticPrecompiles).to.deep.equal(expectedParams.activeStaticPrecompiles);
                    });

                    it("should match expected evm channels", async () => {
                        expect(params.params.evmChannels).to.deep.equal(expectedParams.evmChannels);
                    });

                    it("should match expected access control", async () => {
                        expect(params.params.accessControl).to.deep.equal(expectedParams.accessControl);
                    });

                    it("should match expected allow unprotected txs", async () => {
                        expect(params.params.allowUnprotectedTxs).to.deep.equal(expectedParams.allowUnprotectedTxs);
                    });

                    it("should match expected evm denom", async () => {
                        expect(params.params.evmDenom).to.deep.equal(expectedParams.evmDenom);
                    });

                    it("should match expected extra EIPs", async () => {
                        const extraEips = params.params.extraEips.map((eip) => eip.toString());

                        expect(extraEips).to.deep.equal(expectedParams.extraEips);
                    });
                });

                describe("code", () => {
                    it("should match expected code for all accounts", async () => {
                        for (const account of expectedAccounts) {
                            const code = await evmClientV1.getCode(account.address);
                            expect(code).to.deep.equal(account.code);
                        }
                    });
                });

                describe("account", () => {
                    it("should return account info for all accounts", async () => {
                        for (const expectedAccount of expectedAccounts) {
                            const account = await evmClientV1.getAccountObject(expectedAccount.address);
                            expect(account.codeHash).to.deep.equal(expectedAccount.codeHash);
                        }
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
                let evmClientV2: EvmClientV2;
                let expectedParams: any;
                let expectedAccounts: any;

                before(async () => {
                    // Extract the expected config after moduleConfig is loaded
                    const {
                        v2: { params, accounts },
                    } = moduleConfig.evm;
                    expectedParams = params;
                    expectedAccounts = accounts;

                    evmClientV2 = await EvmClientV2.connect(moduleConfig.network.urls.rpc!);
                });

                describe("getParams", () => {
                    let params: QueryParamsResponseV2;

                    before(async () => {
                        params = await evmClientV2.getParams();
                    });

                    it("should match expected active static precompiles", async () => {
                        expect(params.params.activeStaticPrecompiles).to.deep.equal(expectedParams.activeStaticPrecompiles);
                    });

                    it("should match expected evm channels", async () => {
                        expect(params.params.evmChannels).to.deep.equal(expectedParams.evmChannels);
                    });

                    it("should match expected access control", async () => {
                        expect(params.params.accessControl).to.deep.equal(expectedParams.accessControl);
                    });

                    it("should match expected allow unprotected txs", async () => {
                        expect(params.params.allowUnprotectedTxs).to.deep.equal(expectedParams.allowUnprotectedTxs);
                    });

                    it("should match expected evm denom", async () => {
                        expect(params.params.evmDenom).to.deep.equal(expectedParams.evmDenom);
                    });

                    it("should match expected extra EIPs", async () => {
                        const extraEips = params.params.extraEips.map((eip) => eip.toString());

                        expect(extraEips).to.deep.equal(expectedParams.extraEips);
                    });
                });

                describe("code", () => {
                    it("should match expected code for all accounts", async () => {
                        for (const account of expectedAccounts) {
                            const code = await evmClientV2.getCode(account.address);
                            expect(code).to.deep.equal(account.code);
                        }
                    });
                });

                describe("account", () => {
                    it("should return account info for all accounts", async () => {
                        for (const expectedAccount of expectedAccounts) {
                            const account = await evmClientV2.getAccountObject(expectedAccount.address);
                            expect(account.codeHash).to.deep.equal(expectedAccount.codeHash);
                        }
                    });
                });
            },
        );
    },
);
