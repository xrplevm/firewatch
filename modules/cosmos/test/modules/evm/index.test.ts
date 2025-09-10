import { describe, it } from "mocha";
import { expect } from "chai";
import { EvmClient as EvmClientV2 } from "../../../src/modules/evm/v2/client";
import { EvmClient as EvmClientV1 } from "../../../src/modules/evm/v1/client";
import { describeOrSkip } from "@testing/mocha/utils";
import { isChainEnvironment, isChainType } from "@testing/mocha/assertions";
import moduleConfig from "../../../module.config.json";
import { Chain } from "@firewatch/core/chain";
import { QueryParamsResponse } from "@firewatch/proto-evmos";
import { QueryAccountResponse, QueryParamsResponse as QueryParamsResponseV2 } from "@firewatch/proto-evm";

describeOrSkip("EvmModule", () => {
        return (
            isChainType(["cosmos"], moduleConfig.network as unknown as Chain)
        )
    },
    () => {
        describeOrSkip("v1 (evmos)", 
            () => isChainEnvironment(["devnet", "testnet", "mainnet"], moduleConfig.network as unknown as Chain), 
            () => {
                let evmClientV1: EvmClientV1;
                const { v1: { params: expectedParams, accounts: expectedAccounts } } = moduleConfig.evm;

                before(async () => {
                    evmClientV1 = await EvmClientV1.connect(moduleConfig.network.urls.rpc);
                });

                describe("getParams", () => {
                    let params: QueryParamsResponse;

                    before(async () => {
                        params = await evmClientV1.getParams();
                    })

                    it("should match expected active static precompiles", async () => {
                        expect(params.params.activeStaticPrecompiles).to.deep.equal(expectedParams.activeStaticPrecompiles);
                    })

                    it("should match expected evm channels", async () => {
                        expect(params.params.evmChannels).to.deep.equal(expectedParams.evmChannels);
                    })

                    it("should match expected access control", async () => {
                        expect(params.params.accessControl).to.deep.equal(expectedParams.accessControl);
                    })

                    it("should match expected allow unprotected txs", async () => {
                        expect(params.params.allowUnprotectedTxs).to.deep.equal(expectedParams.allowUnprotectedTxs);
                    })

                    it("should match expected evm denom", async () => {
                        expect(params.params.evmDenom).to.deep.equal(expectedParams.evmDenom);
                    })

                    it("should match expected extra EIPs", async () => {
                        const extraEips = params.params.extraEips.map(eip => eip.toString());

                        expect(extraEips).to.deep.equal(expectedParams.extraEips);
                    })
                })

                describe("code", () => {
                    for (const account of expectedAccounts) {
                        it(`should match expected code for address ${account.address}`, async () => {
                            let code: string | null;
                        
                            code = await evmClientV1.getCode(account.address);

                            expect(code).to.deep.equal(account.code);
                        })
                    }
                })

                describe("account", () => {
                    for (const expectedAccount of expectedAccounts) {
                        it(`should return account info for address ${expectedAccount.address}`, async () => {
                            let account: QueryAccountResponse;
    
                            account = await evmClientV1.getAccountObject(expectedAccount.address);
                            expect(account).to.not.be.null;
                            expect(account.codeHash).to.deep.equal(expectedAccount.codeHash);
                        })
                    }
                })
            }
        )


        describeOrSkip("v2 (cosmos/evm)", 
            () => isChainEnvironment(["localnet"], moduleConfig.network as unknown as Chain), 
            () => {

            let evmClientV2: EvmClientV2;
            const { v2: { params: expectedParams, accounts: expectedAccounts } } = moduleConfig.evm;

            before(async () => {
                evmClientV2 = await EvmClientV2.connect(moduleConfig.network.urls.rpc);
            });

            describe("getParams", () => {
                let params: QueryParamsResponseV2;

                before(async () => {
                    params = await evmClientV2.getParams();
                })
            
                it("should match expected active static precompiles", async () => {
                    expect(params.params.activeStaticPrecompiles).to.deep.equal(expectedParams.activeStaticPrecompiles);
                })

                it("should match expected evm channels", async () => {
                    expect(params.params.evmChannels).to.deep.equal(expectedParams.evmChannels);
                })

                it("should match expected access control", async () => {
                    expect(params.params.accessControl).to.deep.equal(expectedParams.accessControl);
                })

                it("should match expected allow unprotected txs", async () => {
                    expect(params.params.allowUnprotectedTxs).to.deep.equal(expectedParams.allowUnprotectedTxs);
                })

                it("should match expected evm denom", async () => {
                    expect(params.params.evmDenom).to.deep.equal(expectedParams.evmDenom);
                })

                it("should match expected extra EIPs", async () => {
                    const extraEips = params.params.extraEips.map(eip => eip.toString());

                    expect(extraEips).to.deep.equal(expectedParams.extraEips);
                })
            })

            describe("code", () => {

                for (const account of expectedAccounts) {
                    it(`should match expected code for address ${account.address}`, async () => {
                        let code: string | null;

                        code = await evmClientV2.getCode(account.address);
                        expect(code).to.deep.equal(account.code);
                    })
                }
            })

            describe("account", () => {
                for (const expectedAccount of expectedAccounts) {
                    it(`should return account info for address ${expectedAccount.address}`, async () => {
                        let account: QueryAccountResponse;

                        account = await evmClientV2.getAccountObject(expectedAccount.address);
                        expect(account).to.not.be.null;
                        expect(account.codeHash).to.deep.equal(expectedAccount.codeHash);
                    })
                }
            })
        }
    )
});
