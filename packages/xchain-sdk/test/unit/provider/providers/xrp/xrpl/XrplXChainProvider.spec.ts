import { RippledError } from "xrpl";
import { ClientMock } from "../../../../../mocks/xrpl/Client.mock";
import { XrplXChainProvider } from "../../../../../../src/provider/providers/xrp";
import { XrplTxResponseResultMock } from "../../../../../mocks/xrpl/XrplTxResponseResult.mock";
import { XrplTxResponseMock } from "../../../../../mocks/xrpl/XrplTxResponse.mock";
import { XChainOwnedClaimIDMock } from "../../../../../mocks/xrpl/XChainOwnedClaimID.mock";
import { AccountObjectsResponseMock } from "../../../../../mocks/xrpl/AccountObjectsResponse.mock";
import { ClaimId } from "../../../../../../src/bridge/utils";
import { Bridge } from "../../../../../../src/bridge/Bridge";
import { BridgeDirection, ChainType } from "../../../../../../src/common/types";
import { XChainBridgeChainMock } from "../../../../../mocks/xchain/XChainBridgeChain.mock";
import { XChainBridgeMock } from "../../../../../mocks/xchain/XChainBridge.mock";
import { AccountLinesResponseMock } from "../../../../../mocks/xrpl/AccountLinesResponse.mock";
import { SubmittableTransactionMock } from "../../../../../mocks/xrpl/SubmittableTransaction.mock";
import { BridgeMock } from "../../../../../mocks/xrpl/Bridge.mock";
import { PartialXChainBridge } from "../../../../../../src/xchain";
import { AccountInfoResponseMock } from "../../../../../mocks/xrpl/AccountInfoResponse.mock";

describe("XrplXChainProvider", () => {
    describe("constructor", () => {
        const clientMock = new ClientMock();

        test("Creates a XrplXChainProvider instance", () => {
            const xrplXChainProvider = new XrplXChainProvider(clientMock);

            expect(xrplXChainProvider).toBeDefined();
        });
    });

    describe("instance", () => {
        let xrplXChainProvider: XrplXChainProvider;

        const clientMock = new ClientMock();

        const address = "r123";

        beforeEach(() => {
            clientMock.clearMocks();

            xrplXChainProvider = new XrplXChainProvider(clientMock);
        });

        describe("autofill", () => {
            test("Calls client autofill", async () => {
                const tx = new SubmittableTransactionMock({
                    Account: address,
                });

                await xrplXChainProvider.autofill(tx);

                expect(clientMock.autofill).toHaveBeenCalledWith(tx, undefined);
            });
        });

        describe("submit", () => {
            test("Calls client submit", async () => {
                const signedTx = "012345";

                await xrplXChainProvider.submit(signedTx);

                expect(clientMock.submit).toHaveBeenCalledWith(signedTx);
            });
        });

        describe("getTransaction", () => {
            test("Gets transaction", async () => {
                const txHash = "txHash";
                const result = new XrplTxResponseResultMock({ hash: txHash });
                clientMock.request.mockResolvedValueOnce(new XrplTxResponseMock({ result }));

                const res = await xrplXChainProvider.getTransaction(txHash);

                expect(res).toEqual(result);
            });
        });

        describe("isTransactionValidated", () => {
            const hash = "hash";

            test("Returns true", async () => {
                const result = new XrplTxResponseResultMock({ hash, validated: true });
                jest.spyOn(xrplXChainProvider, "getTransaction").mockResolvedValueOnce(result as any);

                const res = await xrplXChainProvider.isTransactionValidated(hash);

                expect(res).toEqual(true);
            });

            test("Returns false", async () => {
                const result = new XrplTxResponseResultMock({ hash, validated: false });
                jest.spyOn(xrplXChainProvider, "getTransaction").mockResolvedValueOnce(result as any);

                const res = await xrplXChainProvider.isTransactionValidated(hash);

                expect(res).toEqual(false);
            });
        });

        describe("isAccountActive", () => {
            test("Returns true", async () => {
                clientMock.request.mockResolvedValueOnce(new AccountInfoResponseMock());

                const res = await xrplXChainProvider.isAccountActive("address");

                expect(res).toEqual(true);
            });

            test("Returns false", async () => {
                clientMock.request.mockRejectedValueOnce(new RippledError("Account not found."));

                const res = await xrplXChainProvider.isAccountActive("address");

                expect(res).toEqual(false);
            });

            test("Throws error", () => {
                clientMock.request.mockRejectedValueOnce(new Error("Some error"));

                expect(xrplXChainProvider.isAccountActive("address")).rejects.toThrow();
            });
        });

        describe("getNativeBalance", () => {
            test("Returns the native balance", async () => {
                const balanceMock = "1000000000";
                clientMock.request.mockResolvedValueOnce(
                    new AccountInfoResponseMock({ result: { account_data: { Balance: balanceMock } } }),
                );

                const res = await xrplXChainProvider.getNativeBalance("address");

                expect(res).toEqual(balanceMock);
            });
        });

        describe("getAccountClaims", () => {
            const claims = [new XChainOwnedClaimIDMock()];

            test("Gets account claims", async () => {
                clientMock.request.mockResolvedValueOnce(new AccountObjectsResponseMock({ result: { account_objects: claims } }));

                const res = await xrplXChainProvider.getAccountClaims("address");

                expect(res).toEqual(claims);
            });
        });

        describe("awaitTransaction", () => {
            const hash = "hash";
            const result = new XrplTxResponseResultMock({ hash, validated: true });

            test("Awaits transaction validation", async () => {
                jest.spyOn(xrplXChainProvider, "isTransactionValidated").mockResolvedValueOnce(true);
                jest.spyOn(xrplXChainProvider, "getTransaction").mockResolvedValueOnce(result as any);

                const res = await xrplXChainProvider.awaitTransaction(hash);

                expect(res).toEqual(result);
            });
        });

        describe("accountHasTrustLine", () => {
            const address = "address";
            const issuer = "issuer";
            const currency = "CRC";
            test("Returns true", async () => {
                clientMock.request.mockResolvedValueOnce(
                    new AccountLinesResponseMock({ result: { lines: [{ currency, account: issuer }] } }),
                );

                const res = await xrplXChainProvider.accountHasTrustLine(address, issuer, currency);

                expect(res).toEqual(true);
            });

            test("Returns false", async () => {
                clientMock.request.mockResolvedValueOnce(
                    new AccountLinesResponseMock({ result: { lines: [{ currency: "AAA", account: issuer }] } }),
                );

                const res = await xrplXChainProvider.accountHasTrustLine(address, issuer, currency);

                expect(res).toEqual(false);
            });
        });

        describe("isClaimAttested", () => {
            const claimId = ClaimId.fromInt(1);
            const xChainBridge = new XChainBridgeMock({
                lockingChain: new XChainBridgeChainMock({ type: ChainType.XRP }),
                issuingChain: new XChainBridgeChainMock({ type: ChainType.XRP }),
            });
            const bridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, xChainBridge);

            test("Returns true", async () => {
                jest.spyOn(xrplXChainProvider, "getAccountClaims").mockResolvedValueOnce([
                    new XChainOwnedClaimIDMock({
                        XChainClaimID: ClaimId.fromInt(ClaimId.fromHex(claimId.hex).int + 1).hex,
                        XChainBridge: { LockingChainDoor: "other_locking_chain_door" },
                    }),
                ]);

                const res = await xrplXChainProvider.isClaimAttested(address, claimId, bridge);

                expect(res).toEqual(true);
            });

            test("Returns false", async () => {
                jest.spyOn(xrplXChainProvider, "getAccountClaims").mockResolvedValueOnce([
                    new XChainOwnedClaimIDMock({
                        XChainClaimID: claimId.hex,
                        XChainBridge: bridge.xChainBridge,
                    }),
                ]);

                const res = await xrplXChainProvider.isClaimAttested(address, claimId, bridge);

                expect(res).toEqual(false);
            });
        });

        describe("isCreateAccountCommitAttested", () => {
            test("Returns true", async () => {
                jest.spyOn(xrplXChainProvider, "isAccountActive").mockResolvedValueOnce(true);

                const res = await xrplXChainProvider.isCreateAccountCommitAttested(address);

                expect(res).toEqual(true);
            });

            test("Returns false", async () => {
                jest.spyOn(xrplXChainProvider, "isAccountActive").mockResolvedValueOnce(false);

                const res = await xrplXChainProvider.isCreateAccountCommitAttested(address);

                expect(res).toEqual(false);
            });
        });

        describe("getXChainBridges", () => {
            const doorAddress = "r1234";
            const id = "id";
            const marker = "marker";
            const xrplBridge = new BridgeMock();

            test("Gets XChainBridges", async () => {
                // First call
                clientMock.request.mockResolvedValueOnce(
                    new AccountObjectsResponseMock({
                        result: {
                            validated: true,
                            marker: marker,
                            account_objects: [xrplBridge],
                        },
                    }),
                );
                // Second call
                clientMock.request.mockResolvedValueOnce(
                    new AccountObjectsResponseMock({
                        result: {
                            validated: true,
                            marker: undefined,
                            account_objects: [],
                        },
                    }),
                );

                const result = await xrplXChainProvider.getXChainBridges(doorAddress, id);

                expect(clientMock.request).toHaveBeenCalledTimes(2);
                expect(clientMock.request).toHaveBeenNthCalledWith(
                    1,
                    expect.objectContaining({
                        command: "account_objects",
                        account: doorAddress,
                        type: "bridge",
                        marker: undefined,
                    }),
                );
                expect(clientMock.request).toHaveBeenNthCalledWith(
                    2,
                    expect.objectContaining({
                        command: "account_objects",
                        account: doorAddress,
                        type: "bridge",
                        marker: marker,
                    }),
                );
                expect(result).toEqual([
                    PartialXChainBridge.fromXrp(
                        doorAddress,
                        xrplBridge.XChainBridge,
                        xrplBridge.SignatureReward as string,
                        xrplBridge.MinAccountCreateAmount,
                        id,
                    ),
                ]);
            });
        });
    });
});
