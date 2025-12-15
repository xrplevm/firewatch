import { Bridge, ClaimId } from "../../../../../../src/bridge";
import { MAX_SAFE_IOU_AMOUNT } from "../../../../../../src/common/constants/xrp.constants";
import { BridgeDirection, ChainType } from "../../../../../../src/common/types";
import { buildAmount } from "../../../../../../src/common/utils/xrpl";
import { XrplXChainSigner } from "../../../../../../src/signer/signers/xrp";
import { XChainBridgeIssue } from "../../../../../../src/xchain";
import { XrplXChainSignerProviderMock } from "../../../../../mocks/signer/signers/xrp/xrpl/XrplXChainSignerProvider.mock";
import { XChainBridgeMock } from "../../../../../mocks/xchain/XChainBridge.mock";
import { XChainBridgeChainMock } from "../../../../../mocks/xchain/XChainBridgeChain.mock";
import { TransactionMetadataMock } from "../../../../../mocks/xrpl/TransactionMetadata.mock";
import { WalletMock } from "../../../../../mocks/xrpl/Wallet.mock";
import { XrplSubmitTransactionResponseMock } from "../../../../../mocks/xrpl/XrplSubmitTransactionResponse.mock";
import { XrplTxResponseResultMock } from "../../../../../mocks/xrpl/XrplTxResponseResult.mock";
import MethodMock from "../../../../../utils/MethodMock";

describe("XrplXChainSigner", () => {
    describe("constructor", () => {
        test("Creates a XrplXChainSigner instance", () => {
            const wallet = new WalletMock();
            const providerMock = new XrplXChainSignerProviderMock();

            const xrplXChainSigner = new XrplXChainSigner(wallet, providerMock);

            expect(xrplXChainSigner).toBeDefined();
        });
    });

    describe("instance", () => {
        let xrplXChainSigner: XrplXChainSigner;

        const address = "r1234";
        const txHash = "hash";
        const wallet = new WalletMock({
            address,
            sign: new MethodMock("mockImplementation", (tx) => ({ tx_blob: JSON.stringify(tx), hash: txHash })),
        });
        const xChainBridge = new XChainBridgeMock({
            lockingChain: new XChainBridgeChainMock({ type: ChainType.XRP, issue: new XChainBridgeIssue<ChainType.XRP>("XRP") }),
            issuingChain: new XChainBridgeChainMock({ type: ChainType.XRP, issue: new XChainBridgeIssue<ChainType.XRP>("XRP") }),
        });
        const bridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, xChainBridge);
        const bridgeForDestination = bridge.forDestination();
        const bridgeForOrigin = bridge.forOrigin();
        const claimId = ClaimId.fromInt(1);
        const amount = "100";

        const providerMock = new XrplXChainSignerProviderMock({
            autofill: new MethodMock("mockImplementation", (tx) => tx),
        });

        beforeEach(() => {
            providerMock.clearMocks();

            xrplXChainSigner = new XrplXChainSigner(wallet, providerMock);
        });

        describe("getAddress", () => {
            test("Gets address", async () => {
                const address = await xrplXChainSigner.getAddress();

                expect(address).toEqual(wallet.address);
            });
        });

        describe("setTrustLine", () => {
            const issuer = "r9999";
            const currency = "USD";

            beforeEach(() => {
                providerMock.submit.mockResolvedValueOnce(new XrplSubmitTransactionResponseMock({ result: { tx_json: { hash: txHash } } }));
            });

            test("Sets trust line", async () => {
                const res = await xrplXChainSigner.setTrustLine(issuer, currency);

                expect(providerMock.submit).toHaveBeenCalledWith(
                    JSON.stringify({
                        TransactionType: "TrustSet",
                        Account: address,
                        LimitAmount: {
                            currency,
                            issuer,
                            value: MAX_SAFE_IOU_AMOUNT,
                        },
                    }),
                );
                expect(res.hash).toEqual(txHash);
            });
        });

        describe("createClaim", () => {
            const originAddress = "r5678";

            beforeEach(() => {
                providerMock.submit.mockResolvedValueOnce(new XrplSubmitTransactionResponseMock({ result: { tx_json: { hash: txHash } } }));
                providerMock.awaitTransaction.mockResolvedValueOnce(
                    new XrplTxResponseResultMock({
                        meta: new TransactionMetadataMock({
                            AffectedNodes: [
                                {
                                    CreatedNode: {
                                        LedgerEntryType: "XChainOwnedClaimID",
                                        LedgerIndex: "1",
                                        NewFields: { XChainClaimID: claimId.hex },
                                    },
                                },
                            ],
                        }),
                    }),
                );
            });

            test("Creates a claim", async () => {
                const res = await xrplXChainSigner.createClaim(originAddress, bridgeForDestination);
                const validatedTx = await res.wait();

                expect(providerMock.submit).toHaveBeenCalledWith(
                    JSON.stringify({
                        TransactionType: "XChainCreateClaimID",
                        XChainBridge: bridgeForDestination.xChainBridge,
                        OtherChainSource: originAddress,
                        SignatureReward: bridgeForDestination.destinationXChainBridgeChain.signatureReward,
                        Account: address,
                    }),
                );
                expect(res.hash).toEqual(txHash);
                expect(validatedTx.claimId.hex).toEqual(claimId.hex);
            });
        });

        describe("commit", () => {
            const destinationAddress = "r5678";

            beforeEach(() => {
                providerMock.submit.mockResolvedValueOnce(new XrplSubmitTransactionResponseMock({ result: { tx_json: { hash: txHash } } }));
            });

            test("Commits", async () => {
                const res = await xrplXChainSigner.commit(claimId, destinationAddress, bridgeForOrigin, amount);

                expect(providerMock.submit).toHaveBeenCalledWith(
                    JSON.stringify({
                        TransactionType: "XChainCommit",
                        XChainBridge: bridgeForOrigin.xChainBridge,
                        XChainClaimID: claimId.hex,
                        OtherChainDestination: destinationAddress,
                        Amount: buildAmount(amount, bridgeForOrigin.originXChainBridgeChain.issue),
                        Account: address,
                    }),
                );
                expect(res.hash).toEqual(txHash);
            });
        });

        describe("createAccountCommit", () => {
            const destinationAddress = "r5678";

            beforeEach(() => {
                providerMock.submit.mockResolvedValueOnce(new XrplSubmitTransactionResponseMock({ result: { tx_json: { hash: txHash } } }));
            });

            test("Commits", async () => {
                const res = await xrplXChainSigner.createAccountCommit(destinationAddress, bridgeForOrigin, amount);

                expect(providerMock.submit).toHaveBeenCalledWith(
                    JSON.stringify({
                        TransactionType: "XChainAccountCreateCommit",
                        XChainBridge: bridgeForOrigin.xChainBridge,
                        Destination: destinationAddress,
                        SignatureReward: bridgeForOrigin.originXChainBridgeChain.signatureReward,
                        Amount: buildAmount(amount, bridgeForOrigin.originXChainBridgeChain.issue),
                        Account: address,
                    }),
                );
                expect(res.hash).toEqual(txHash);
            });
        });
    });
});
