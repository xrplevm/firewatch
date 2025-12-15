import { XChainWallet } from "../../../../src";
import { Bridge } from "../../../../src/bridge/Bridge";
import {
    BasicBridgeTransferResult,
    BridgeManager,
    BridgeTransferResult,
    BridgeTransferStage,
    BridgeTransferType,
} from "../../../../src/bridge/BridgeManager";
import { BridgeManagerError, BridgeManagerErrors } from "../../../../src/bridge/BridgeManager/BridgeManager.errors";
import { ClaimId } from "../../../../src/bridge/utils";
import { CHAIN_DECIMALS } from "../../../../src/common/constants/chain.constants";
import { BridgeDirection, ChainType } from "../../../../src/common/types";
import { intToDecimal } from "../../../../src/common/utils/number";
import { XChainAddress, XChainBridgeIssue } from "../../../../src/xchain";
import { BridgeDoorMock } from "../../../mocks/bridge/BridgeDoor/BridgeDoor.mock";
import { BridgeDoorPairMock } from "../../../mocks/bridge/BridgeDoor/BridgeDoorPair.mock";
import { CommitTransactionMock } from "../../../mocks/transaction/CommitTransaction.mock";
import { CreateAccountCommitTransactionMock } from "../../../mocks/transaction/CreateAccountCommitTransaction.mock";
import { CreateBridgeRequestTransactionMock } from "../../../mocks/transaction/CreateBridgeRequestTransaction.mock";
import { CreateClaimTransactionMock } from "../../../mocks/transaction/CreateClaimTransaction.mock";
import { TrustClaimTransactionMock } from "../../../mocks/transaction/TrustClaimTransaction.mock";
import { TrustCommitTransactionMock } from "../../../mocks/transaction/TrustCommitTransaction.mock";
import { TrustClaimXChainWalletMock } from "../../../mocks/wallet/TrustClaimXChainWallet.mock";
import { TrustCommitXChainWalletMock } from "../../../mocks/wallet/TrustCommitXChainWallet.mock";
import { XChainWalletMock } from "../../../mocks/wallet/XChainWallet.mock";
import { CreateBridgeRequestXChainWalletMock } from "../../../mocks/wallet/wallets/CreateBridgeRequestXChainWallet.mock";
import { PartialXChainBridgeMock } from "../../../mocks/xchain/PartialXChainBridge.mock";
import { PartialXChainBridgeChainMock } from "../../../mocks/xchain/PartialXChainBridgeChain.mock";
import { XChainBridgeMock } from "../../../mocks/xchain/XChainBridge.mock";
import { XChainBridgeChainMock } from "../../../mocks/xchain/XChainBridgeChain.mock";
import MethodMock from "../../../utils/MethodMock";

describe("BridgeManager", () => {
    const mainchainDoorMock = new BridgeDoorMock({ id: "1" });
    const sidechainDoorMock = new BridgeDoorMock({ id: "2", type: ChainType.EVM });

    const bridgeDoorPairMock = new BridgeDoorPairMock({
        mainchainDoor: mainchainDoorMock,
        sidechainDoor: sidechainDoorMock,
    });

    beforeEach(async () => {
        mainchainDoorMock.clearMocks();
        sidechainDoorMock.clearMocks();
    });

    describe("constructor", () => {
        // Only `createAsync` is tested as it uses the constructor + awaits the initialization
        describe("createAsync", () => {
            test("Creates a BridgeManager instance sucessfully", async () => {
                // Mock bridge resolvers
                const lockingChain = new XChainBridgeChainMock({
                    doorAddress: new XChainAddress("r1", ChainType.XRP),
                    issue: new XChainBridgeIssue("XRP"),
                });
                const issuingChain = new XChainBridgeChainMock({
                    doorAddress: new XChainAddress("r3", ChainType.XRP),
                    issue: new XChainBridgeIssue("PER", new XChainAddress("r4", ChainType.XRP)),
                });
                // Locking call
                mainchainDoorMock.getXChainBridges.mockResolvedValueOnce([
                    new PartialXChainBridgeMock({
                        lockingChain,
                        issuingChain: new PartialXChainBridgeChainMock({
                            doorAddress: issuingChain.doorAddress,
                            issue: issuingChain.issue,
                        }),
                    }),
                    new PartialXChainBridgeMock({
                        issuingChain: new PartialXChainBridgeChainMock({
                            doorAddress: new XChainAddress("r3", ChainType.XRP),
                            issue: new XChainBridgeIssue("PER", new XChainAddress("r4", ChainType.XRP)),
                        }),
                        lockingChain: new XChainBridgeChainMock({
                            id: lockingChain.id,
                            doorAddress: lockingChain.doorAddress,
                            issue: new XChainBridgeIssue("PER", new XChainAddress("r4", ChainType.XRP)),
                        }),
                    }),
                ]);
                // Issuing call
                sidechainDoorMock.getXChainBridges.mockResolvedValueOnce([
                    new PartialXChainBridgeMock({
                        issuingChain,
                        lockingChain: new PartialXChainBridgeChainMock({
                            doorAddress: lockingChain.doorAddress,
                            issue: lockingChain.issue,
                        }),
                    }),
                ]);

                const bridgeManager = await BridgeManager.createAsync(bridgeDoorPairMock);

                expect(bridgeManager).toBeDefined();
            });

            test("Throws EMPTY_BRIDGE_DOOR_PAIR error", async () => {
                // Locking call
                mainchainDoorMock.getXChainBridges.mockResolvedValueOnce([]);
                // Issuing call
                sidechainDoorMock.getXChainBridges.mockResolvedValueOnce([]);

                await expect(BridgeManager.createAsync(bridgeDoorPairMock)).rejects.toThrow(
                    new BridgeManagerError(BridgeManagerErrors.EMPTY_BRIDGE_DOOR_PAIR, {
                        mainchain: bridgeDoorPairMock.mainchainDoor.id,
                        sidechain: bridgeDoorPairMock.sidechainDoor.id,
                    }),
                );
            });
        });
    });

    describe("instance", () => {
        let bridgeManager: BridgeManager;

        const amount = "100";
        const direction = BridgeDirection.LOCKING_TO_ISSUING;
        const originAddress = new XChainAddress("rDvSaLnMDnGxtp1DPgH3HS9ad2eH7RhnF6", ChainType.XRP);
        const destinationAddress = new XChainAddress("0x91bb18f43c92e62c7649813aa6b77056a88164b4", ChainType.EVM);

        // Mock the initialize method so that it doesn't actually do anything
        let initializeSpy: jest.SpyInstance<any, unknown[], any>;

        beforeAll(() => {
            initializeSpy = jest.spyOn(BridgeManager.prototype as any, "initialize").mockResolvedValue(undefined);
        });

        beforeEach(async () => {
            bridgeManager = await BridgeManager.createAsync(bridgeDoorPairMock);
        });

        afterAll(() => {
            initializeSpy.mockRestore();
        });

        describe("getXChainBridges", () => {
            const xChainBridgesMock = [new XChainBridgeMock()];

            let xChainBridgesReplacer: jest.ReplaceProperty<any>;

            beforeEach(() => {
                xChainBridgesReplacer = jest.replaceProperty(bridgeManager as any, "xChainBridges", xChainBridgesMock);
            });

            afterAll(() => {
                xChainBridgesReplacer.restore();
            });

            test("Gets XChainBridges", async () => {
                const result = await bridgeManager.getXChainBridges();

                expect(result).toEqual(xChainBridgesMock);
            });

            test("Gets XChainBridges with refresh option", async () => {
                const loadXChainBridges = jest.spyOn(bridgeManager as any, "loadXChainBridges").mockImplementation(() => ({}));

                const result = await bridgeManager.getXChainBridges({ refresh: true });

                expect(loadXChainBridges).toHaveBeenCalled();

                expect(result).toEqual(xChainBridgesMock);
            });
        });

        describe("getBridge", () => {
            const currency = "BLB";
            const issuer = "r9Sz3JyQXEwDDoZmU8XnseiAppsQmg3Z9y";
            const issue = new XChainBridgeIssue(currency, new XChainAddress(issuer, ChainType.XRP));
            const xChainBridge = new XChainBridgeMock({
                lockingChain: new XChainBridgeChainMock({
                    issue,
                }),
            });
            const bridge = new Bridge(direction, xChainBridge);
            const xChainBridgesMock = [xChainBridge];

            let xChainBridgesReplacer: jest.ReplaceProperty<any>;

            beforeEach(() => {
                xChainBridgesReplacer = jest.replaceProperty(bridgeManager as any, "xChainBridges", xChainBridgesMock);
            });

            afterAll(() => {
                xChainBridgesReplacer.restore();
            });

            test("Gets a bridge with a currency and issuer pair", async () => {
                const result = await bridgeManager.getBridge(BridgeDirection.LOCKING_TO_ISSUING, currency, issuer);

                expect(result).toEqual(bridge);
            });

            test("Gets a bridge with a XChainBridgeIssue", async () => {
                const result = await bridgeManager.getBridge(BridgeDirection.LOCKING_TO_ISSUING, issue);

                expect(result).toEqual(bridge);
            });

            test("Throws BRIDGE_NOT_FOUND_FOR_ISSUE", async () => {
                const otherCurrency = "103";
                const otherIssuer = "r9Sz3JyQXEwDDoZmU8XnseiAppsQmg3Z9y";

                expect(
                    async () => await bridgeManager.getBridge(BridgeDirection.LOCKING_TO_ISSUING, otherCurrency, otherIssuer),
                ).rejects.toThrow(
                    new BridgeManagerError(BridgeManagerErrors.BRIDGE_NOT_FOUND_FOR_ISSUE, {
                        currency: otherCurrency,
                        issuer: otherIssuer,
                        mainchain: bridgeDoorPairMock.mainchainDoor.id,
                        sidechain: bridgeDoorPairMock.sidechainDoor.id,
                    }),
                );
            });
        });

        describe("prepareTransfer", () => {
            const startListener = jest.fn();

            beforeEach(() => {
                startListener.mockClear();
            });

            describe("Is create account", () => {
                const originWalletMock = new XChainWalletMock({ getBalance: new MethodMock("mockResolvedValue", "100000000") });
                const destinationWalletMock = new XChainWalletMock({ isActive: new MethodMock("mockResolvedValue", false) });

                beforeEach(() => {
                    originWalletMock.clearMocks();
                    destinationWalletMock.clearMocks();
                });

                test("Transfer is prepared and started", async () => {
                    const expectedBridgeTransferStartData = { transferType: BridgeTransferType.CREATE_ACCOUNT, amount };

                    const originXChainMock = new XChainBridgeChainMock({ minAccountCreate: "1", signatureReward: "1" });
                    const xChainMock = new XChainBridgeMock({ lockingChain: originXChainMock });
                    const bridge = new Bridge(direction, xChainMock);

                    bridgeManager.on("start", startListener);
                    const res = await bridgeManager.prepareTransfer(bridge, amount, originWalletMock, destinationWalletMock);

                    expect(startListener).toHaveBeenCalledWith(expectedBridgeTransferStartData);
                    expect(res).toEqual(expectedBridgeTransferStartData);
                });

                test("Throws MIN_CREATE_ACCOUNT_NOT_SET error", async () => {
                    const originXChainMock = new XChainBridgeChainMock({ minAccountCreate: null });
                    const xChainMock = new XChainBridgeMock({ lockingChain: originXChainMock });
                    const bridge = new Bridge(direction, xChainMock);

                    expect(
                        async () => await bridgeManager.prepareTransfer(bridge, amount, originWalletMock, destinationWalletMock),
                    ).rejects.toThrow(
                        new BridgeManagerError(BridgeManagerErrors.MIN_CREATE_ACCOUNT_NOT_SET, {
                            currency: bridge.originXChainBridgeChain.issue.currency,
                            origin: bridge.originXChainBridgeChain.doorAddress.address,
                            destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                        }),
                    );
                });

                test("Throws MIN_CREATE_ACCOUNT_NOT_SET error", async () => {
                    const originXChainMock = new XChainBridgeChainMock({ minAccountCreate: "1000000000", type: ChainType.XRP });
                    const xChainMock = new XChainBridgeMock({ lockingChain: originXChainMock });
                    const bridge = new Bridge(direction, xChainMock);

                    expect(
                        async () =>
                            await bridgeManager.prepareTransfer(
                                bridge,
                                amount,
                                originWalletMock as XChainWallet<ChainType.XRP>,
                                destinationWalletMock,
                            ),
                    ).rejects.toThrow(
                        new BridgeManagerError(BridgeManagerErrors.INSUFFICIENT_CREATE_ACCOUNT_AMOUNT, {
                            currency: bridge.originXChainBridgeChain.issue.currency,
                            origin: bridge.originXChainBridgeChain.doorAddress.address,
                            destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                            amount,
                            minAccountCreate: intToDecimal(
                                bridge.originXChainBridgeChain.minAccountCreate,
                                CHAIN_DECIMALS[bridge.originType],
                            ),
                        }),
                    );
                });

                test("Throws ORIGIN_CANNOT_PAY_SIGNATURE_REWARD error", async () => {
                    const originXChainMock = new XChainBridgeChainMock({
                        minAccountCreate: "1",
                        signatureReward: "1000000000",
                        type: ChainType.XRP,
                    });
                    const xChainMock = new XChainBridgeMock({ lockingChain: originXChainMock });
                    const bridge = new Bridge(direction, xChainMock);

                    expect(
                        async () =>
                            await bridgeManager.prepareTransfer(
                                bridge,
                                amount,
                                originWalletMock as XChainWallet<ChainType.XRP>,
                                destinationWalletMock,
                            ),
                    ).rejects.toThrow(
                        new BridgeManagerError(BridgeManagerErrors.ORIGIN_CANNOT_PAY_SIGNATURE_REWARD, {
                            currency: bridge.originXChainBridgeChain.issue.currency,
                            origin: bridge.originXChainBridgeChain.doorAddress.address,
                            destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                            signatureReward: intToDecimal(
                                bridge.originXChainBridgeChain.signatureReward,
                                CHAIN_DECIMALS[bridge.originType],
                            ),
                        }),
                    );
                });
            });

            describe("Is claim/commit", () => {
                const destinationXChainMock = new XChainBridgeChainMock({ signatureReward: "1000000" });
                const xChainMock = new XChainBridgeMock({ issuingChain: destinationXChainMock });
                const bridge = new Bridge(direction, xChainMock);

                test("Transfer is prepared and started with non trust claim/commit wallets", async () => {
                    const originWalletMock = new XChainWalletMock();
                    const destinationWalletMock = new XChainWalletMock({
                        isActive: new MethodMock("mockResolvedValue", true),
                        getBalance: new MethodMock("mockResolvedValue", "10000000"),
                    });

                    const expectedBridgeTransferStartData = {
                        transferType: BridgeTransferType.CLAIM_COMMIT,
                        amount,
                        isTrustClaimRequired: false,
                        isTrustCommitRequired: false,
                    };

                    bridgeManager.on("start", startListener);
                    const res = await bridgeManager.prepareTransfer(bridge, amount, originWalletMock, destinationWalletMock);

                    expect(startListener).toHaveBeenCalledWith(expectedBridgeTransferStartData);
                    expect(res).toEqual(expectedBridgeTransferStartData);
                });

                test("Transfer is prepared and started with trust claim/commit wallets", async () => {
                    const originWalletMock = new TrustCommitXChainWalletMock({
                        isTrustCommitRequired: new MethodMock("mockReturnValue", true),
                    });
                    const destinationWalletMock = new TrustClaimXChainWalletMock({
                        isActive: new MethodMock("mockResolvedValue", true),
                        isTrustClaimRequired: new MethodMock("mockReturnValue", true),
                        getBalance: new MethodMock("mockResolvedValue", "10000000"),
                    });

                    const expectedBridgeTransferStartData = {
                        transferType: BridgeTransferType.CLAIM_COMMIT,
                        amount,
                        isTrustClaimRequired: true,
                        isTrustCommitRequired: true,
                    };

                    bridgeManager.on("start", startListener);
                    const res = await bridgeManager.prepareTransfer(bridge, amount, originWalletMock, destinationWalletMock);

                    expect(startListener).toHaveBeenCalledWith(expectedBridgeTransferStartData);
                    expect(res).toEqual(expectedBridgeTransferStartData);
                });

                test("Throws DESTINATION_CANNOT_PAY_SIGNATURE_REWARD error", async () => {
                    const originWalletMock = new XChainWalletMock();
                    const destinationWalletMock = new XChainWalletMock({
                        isActive: new MethodMock("mockResolvedValue", true),
                        getBalance: new MethodMock("mockResolvedValue", "0"),
                    });

                    expect(
                        async () => await bridgeManager.prepareTransfer(bridge, amount, originWalletMock, destinationWalletMock),
                    ).rejects.toThrow(
                        new BridgeManagerError(BridgeManagerErrors.DESTINATION_CANNOT_PAY_SIGNATURE_REWARD, {
                            currency: bridge.originXChainBridgeChain.issue.currency,
                            origin: bridge.originXChainBridgeChain.doorAddress.address,
                            destination: bridge.destinationXChainBridgeChain.doorAddress.address,
                            signatureReward: intToDecimal(
                                bridge.destinationXChainBridgeChain.signatureReward,
                                CHAIN_DECIMALS[bridge.destinationType],
                            ),
                        }),
                    );
                });
            });
        });

        describe("trustClaim", () => {
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);
            const destinationWalletMock = new TrustClaimXChainWalletMock();

            const stageListener = jest.fn();
            const trustClaimRequestedListener = jest.fn();
            const trustClaimSignedListener = jest.fn();
            const trustClaimConfirmedListener = jest.fn();

            beforeEach(() => {
                destinationWalletMock.clearMocks();

                stageListener.mockClear();
                trustClaimRequestedListener.mockClear();
                trustClaimSignedListener.mockClear();
                trustClaimConfirmedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("trustClaimRequested", trustClaimRequestedListener);
                bridgeManager.on("trustClaimSigned", trustClaimSignedListener);
                bridgeManager.on("trustClaimConfirmed", trustClaimConfirmedListener);
            });

            test("Claim is already trusted", async () => {
                destinationWalletMock.isClaimTrusted.mockResolvedValueOnce(true);

                const res = await bridgeManager.trustClaim(bridge, destinationWalletMock);

                expect(trustClaimConfirmedListener).toHaveBeenCalled();
                expect(res).toEqual(undefined);
            });

            test("Trusts claim", async () => {
                const trustClaimTransactionMock = new TrustClaimTransactionMock();
                const unconfirmedTrustClaim = trustClaimTransactionMock.asUnconfirmed();
                const confirmedTrustClaim = trustClaimTransactionMock.asConfirmed();

                destinationWalletMock.isClaimTrusted.mockResolvedValueOnce(false);
                destinationWalletMock.trustClaim.mockResolvedValueOnce(unconfirmedTrustClaim);

                const res = await bridgeManager.trustClaim(bridge, destinationWalletMock);

                expect(destinationWalletMock.trustClaim).toHaveBeenCalledWith(bridge.forDestination());
                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.TRUST_CLAIM);
                expect(trustClaimRequestedListener).toHaveBeenCalled();
                expect(trustClaimSignedListener).toHaveBeenCalledWith(unconfirmedTrustClaim);
                expect(trustClaimConfirmedListener).toHaveBeenCalledWith(confirmedTrustClaim);
                expect(res).toEqual(confirmedTrustClaim);
            });
        });

        describe("trustCommit", () => {
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);
            const originWalletMock = new TrustCommitXChainWalletMock();

            const stageListener = jest.fn();
            const trustCommitRequestedListener = jest.fn();
            const trustCommitSignedListener = jest.fn();
            const trustCommitConfirmedListener = jest.fn();

            beforeEach(() => {
                originWalletMock.clearMocks();

                stageListener.mockClear();
                trustCommitRequestedListener.mockClear();
                trustCommitSignedListener.mockClear();
                trustCommitConfirmedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("trustCommitRequested", trustCommitRequestedListener);
                bridgeManager.on("trustCommitSigned", trustCommitSignedListener);
                bridgeManager.on("trustCommitConfirmed", trustCommitConfirmedListener);
            });

            test("Commit is already trusted", async () => {
                originWalletMock.isCommitTrusted.mockResolvedValueOnce(true);

                const res = await bridgeManager.trustCommit(bridge, originWalletMock);

                expect(trustCommitConfirmedListener).toHaveBeenCalled();
                expect(res).toEqual(undefined);
            });

            test("Trusts Commit", async () => {
                const trustCommitTransactionMock = new TrustCommitTransactionMock();
                const unconfirmedTrustCommit = trustCommitTransactionMock.asUnconfirmed();
                const confirmedTrustCommit = trustCommitTransactionMock.asConfirmed();

                originWalletMock.isCommitTrusted.mockResolvedValueOnce(false);
                originWalletMock.trustCommit.mockResolvedValueOnce(unconfirmedTrustCommit);

                const res = await bridgeManager.trustCommit(bridge, originWalletMock);

                expect(originWalletMock.trustCommit).toHaveBeenCalledWith(bridge.forOrigin());
                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.TRUST_COMMIT);
                expect(trustCommitRequestedListener).toHaveBeenCalled();
                expect(trustCommitSignedListener).toHaveBeenCalledWith(unconfirmedTrustCommit);
                expect(trustCommitConfirmedListener).toHaveBeenCalledWith(confirmedTrustCommit);
                expect(res).toEqual(confirmedTrustCommit);
            });
        });

        describe("createClaim", () => {
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);
            const destinationWalletMock = new XChainWalletMock();

            const stageListener = jest.fn();
            const createClaimRequestedListener = jest.fn();
            const createClaimSignedListener = jest.fn();
            const createClaimConfirmedListener = jest.fn();

            beforeEach(() => {
                destinationWalletMock.clearMocks();

                stageListener.mockClear();
                createClaimRequestedListener.mockClear();
                createClaimSignedListener.mockClear();
                createClaimConfirmedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("createClaimRequested", createClaimRequestedListener);
                bridgeManager.on("createClaimSigned", createClaimSignedListener);
                bridgeManager.on("createClaimConfirmed", createClaimConfirmedListener);
            });

            test("Performs a create claim", async () => {
                const createClaimTransactionMock = new CreateClaimTransactionMock();
                const unconfirmedCreateClaim = createClaimTransactionMock.asUnconfirmed();
                const confirmedCreateClaim = createClaimTransactionMock.asConfirmed();

                destinationWalletMock.createClaim.mockResolvedValueOnce(unconfirmedCreateClaim);

                const res = await bridgeManager.createClaim(bridge, destinationWalletMock, originAddress);

                expect(destinationWalletMock.createClaim).toHaveBeenCalledWith(
                    originAddress.for(bridge.destinationType),
                    bridge.forDestination(),
                );
                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.CREATE_CLAIM);
                expect(createClaimRequestedListener).toHaveBeenCalled();
                expect(createClaimSignedListener).toHaveBeenCalledWith(unconfirmedCreateClaim);
                expect(createClaimConfirmedListener).toHaveBeenCalledWith(confirmedCreateClaim);
                expect(res).toEqual(confirmedCreateClaim);
            });
        });

        describe("commit", () => {
            const claimId = ClaimId.fromInt(1);
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);
            const originWalletMock = new XChainWalletMock();

            const stageListener = jest.fn();
            const commitRequestedListener = jest.fn();
            const commitSignedListener = jest.fn();
            const commitConfirmedListener = jest.fn();

            beforeEach(() => {
                originWalletMock.clearMocks();

                stageListener.mockClear();
                commitRequestedListener.mockClear();
                commitSignedListener.mockClear();
                commitConfirmedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("commitRequested", commitRequestedListener);
                bridgeManager.on("commitSigned", commitSignedListener);
                bridgeManager.on("commitConfirmed", commitConfirmedListener);
            });

            test("Performs a commit", async () => {
                const commitTransactionMock = new CommitTransactionMock();
                const unconfirmedCommit = commitTransactionMock.asUnconfirmed();
                const confirmedCommit = commitTransactionMock.asConfirmed();

                originWalletMock.commit.mockResolvedValueOnce(unconfirmedCommit);

                const res = await bridgeManager.commit(claimId, bridge, originWalletMock, destinationAddress, amount);

                expect(originWalletMock.commit).toHaveBeenCalledWith(
                    claimId,
                    destinationAddress.for(bridge.originType),
                    bridge.forOrigin(),
                    amount,
                );
                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.COMMIT);
                expect(commitRequestedListener).toHaveBeenCalled();
                expect(commitSignedListener).toHaveBeenCalledWith(unconfirmedCommit);
                expect(commitConfirmedListener).toHaveBeenCalledWith(confirmedCommit);
                expect(res).toEqual(confirmedCommit);
            });
        });

        describe("createAccountCommit", () => {
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);
            const originWalletMock = new XChainWalletMock();

            const stageListener = jest.fn();
            const createAccountCommitRequestedListener = jest.fn();
            const createAccountCommitSignedListener = jest.fn();
            const createAccountCommitConfirmedListener = jest.fn();

            beforeEach(() => {
                originWalletMock.clearMocks();

                stageListener.mockClear();
                createAccountCommitRequestedListener.mockClear();
                createAccountCommitSignedListener.mockClear();
                createAccountCommitConfirmedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("createAccountCommitRequested", createAccountCommitRequestedListener);
                bridgeManager.on("createAccountCommitSigned", createAccountCommitSignedListener);
                bridgeManager.on("createAccountCommitConfirmed", createAccountCommitConfirmedListener);
            });

            test("Performs a create account commit", async () => {
                const createAccountCommitTransactionMock = new CreateAccountCommitTransactionMock();
                const unconfirmedCreateAccountCommit = createAccountCommitTransactionMock.asUnconfirmed();
                const confirmedCreateAccountCommit = createAccountCommitTransactionMock.asConfirmed();

                originWalletMock.createAccountCommit.mockResolvedValueOnce(unconfirmedCreateAccountCommit);

                const res = await bridgeManager.createAccountCommit(bridge, originWalletMock, destinationAddress, amount);

                expect(originWalletMock.createAccountCommit).toHaveBeenCalledWith(
                    destinationAddress.for(bridge.originType),
                    bridge.forOrigin(),
                    amount,
                );
                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.CREATE_ACCOUNT_COMMIT);
                expect(createAccountCommitRequestedListener).toHaveBeenCalled();
                expect(createAccountCommitSignedListener).toHaveBeenCalledWith(unconfirmedCreateAccountCommit);
                expect(createAccountCommitConfirmedListener).toHaveBeenCalledWith(confirmedCreateAccountCommit);
                expect(res).toEqual(confirmedCreateAccountCommit);
            });
        });

        describe("awaitClaimAttestations", () => {
            const claimId = ClaimId.fromInt(1);
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);
            const destinationWalletMock = new XChainWalletMock();

            const stageListener = jest.fn();
            const attestationsStartedListener = jest.fn();
            const attestationsCompletedListener = jest.fn();

            beforeEach(() => {
                destinationWalletMock.clearMocks();

                stageListener.mockClear();
                attestationsStartedListener.mockClear();
                attestationsCompletedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("attestationsStarted", attestationsStartedListener);
                bridgeManager.on("attestationsCompleted", attestationsCompletedListener);
            });

            test("Awaits claim attestations", async () => {
                destinationWalletMock.isClaimAttested.mockResolvedValueOnce(true);

                await bridgeManager.awaitClaimAttestations(claimId, bridge, destinationWalletMock);

                expect(destinationWalletMock.isClaimAttested).toHaveBeenCalledWith(claimId, bridge.forDestination());
                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.ATTESTATIONS);
                expect(attestationsStartedListener).toHaveBeenCalled();
                expect(attestationsCompletedListener).toHaveBeenCalled();
            });
        });

        describe("awaitCreateAccountCommitAttestations", () => {
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);

            const destinationWalletMock = new XChainWalletMock();

            const stageListener = jest.fn();
            const attestationsStartedListener = jest.fn();
            const attestationsCompletedListener = jest.fn();

            beforeEach(() => {
                destinationWalletMock.clearMocks();

                stageListener.mockClear();
                attestationsStartedListener.mockClear();
                attestationsCompletedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("attestationsStarted", attestationsStartedListener);
                bridgeManager.on("attestationsCompleted", attestationsCompletedListener);
            });

            test("Awaits claim attestations", async () => {
                destinationWalletMock.isClaimAttested.mockResolvedValueOnce(true);

                await bridgeManager.awaitCreateAccountCommitAttestations(bridge, destinationWalletMock);

                expect(destinationWalletMock.isCreateAccountCommitAttested).toHaveBeenCalledWith(bridge.forDestination());
                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.ATTESTATIONS);
                expect(attestationsStartedListener).toHaveBeenCalled();
                expect(attestationsCompletedListener).toHaveBeenCalled();
            });
        });

        describe("transfer", () => {
            const xChainMock = new XChainBridgeMock();
            const bridge = new Bridge(direction, xChainMock);
            const bridgeForOrigin = bridge.forOrigin();
            const bridgeForDestination = bridge.forDestination();
            const originWalletMock = new XChainWalletMock({ getAddress: new MethodMock("mockResolvedValue", originAddress.address) });

            const destinationWalletMock = new XChainWalletMock({
                getAddress: new MethodMock("mockResolvedValue", destinationAddress.address),
            });

            let prepareTransferMock: jest.SpyInstance;
            let trustClaimMock: jest.SpyInstance;
            let trustCommitMock: jest.SpyInstance;
            let createClaimMock: jest.SpyInstance;
            let commitMock: jest.SpyInstance;
            let createAccountCommitMock: jest.SpyInstance;
            let awaitClaimAttestationsMock: jest.SpyInstance;
            let awaitCreateAccountCommitAttestationsMock: jest.SpyInstance;

            const completedListener = jest.fn();

            const basicExpectedResult: BasicBridgeTransferResult = {
                amount: amount,
                originAddress: originAddress.address,
                destinationAddress: destinationAddress.address,
                originXChainBridgeChain: bridge.originXChainBridgeChain,
                destinationXChainBridgeChain: bridge.destinationXChainBridgeChain,
            };

            beforeEach(() => {
                prepareTransferMock = jest.spyOn(bridgeManager, "prepareTransfer");
                trustClaimMock = jest.spyOn(bridgeManager, "trustClaim");
                trustCommitMock = jest.spyOn(bridgeManager, "trustCommit");
                createClaimMock = jest.spyOn(bridgeManager, "createClaim");
                commitMock = jest.spyOn(bridgeManager, "commit");
                createAccountCommitMock = jest.spyOn(bridgeManager, "createAccountCommit");
                awaitClaimAttestationsMock = jest.spyOn(bridgeManager, "awaitClaimAttestations");
                awaitCreateAccountCommitAttestationsMock = jest.spyOn(bridgeManager, "awaitCreateAccountCommitAttestations");

                completedListener.mockClear();

                bridgeManager.on("completed", completedListener);
            });

            afterAll(() => {
                prepareTransferMock.mockRestore();
                trustClaimMock.mockRestore();
                trustCommitMock.mockRestore();
                createClaimMock.mockRestore();
                commitMock.mockRestore();
                createAccountCommitMock.mockRestore();
                awaitClaimAttestationsMock.mockRestore();
                awaitCreateAccountCommitAttestationsMock.mockRestore();
            });

            test("CLAIM_COMMIT", async () => {
                prepareTransferMock.mockResolvedValueOnce({
                    transferType: BridgeTransferType.CLAIM_COMMIT,
                    isTrustClaimRequired: true,
                    isTrustCommitRequired: true,
                });

                const trustClaimTransactionMock = new TrustClaimTransactionMock();
                const confirmedTrustClaim = trustClaimTransactionMock.asConfirmed();
                trustClaimMock.mockResolvedValueOnce(confirmedTrustClaim);

                const trustCommitTransactionMock = new TrustCommitTransactionMock();
                const confirmedTrustCommit = trustCommitTransactionMock.asConfirmed();
                trustCommitMock.mockResolvedValueOnce(confirmedTrustCommit);

                const claimId = ClaimId.fromInt(2);
                const createClaimTransactionMock = new CreateClaimTransactionMock({ claimId });
                const confirmedCreateClaim = createClaimTransactionMock.asConfirmed();
                createClaimMock.mockResolvedValueOnce(confirmedCreateClaim);

                const commitTransactionMock = new CommitTransactionMock();
                const confirmedCommit = commitTransactionMock.asConfirmed();
                commitMock.mockResolvedValueOnce(confirmedCommit);

                const expectedResult: BridgeTransferResult = {
                    ...basicExpectedResult,
                    isCreateAccount: false,
                    trustClaim: confirmedTrustClaim,
                    trustCommit: confirmedTrustCommit,
                    createClaim: confirmedCreateClaim,
                    commit: confirmedCommit,
                };

                const res = await bridgeManager.transfer(bridge, originWalletMock, destinationWalletMock, amount);

                expect(trustClaimMock).toHaveBeenCalledWith(bridgeForDestination, destinationWalletMock);
                expect(trustCommitMock).toHaveBeenCalledWith(bridgeForOrigin, originWalletMock);
                expect(createClaimMock).toHaveBeenCalledWith(bridgeForDestination, destinationWalletMock, originAddress);
                expect(commitMock).toHaveBeenCalledWith(claimId, bridgeForOrigin, originWalletMock, destinationAddress, amount);
                expect(awaitClaimAttestationsMock).toHaveBeenCalledWith(claimId, bridgeForDestination, destinationWalletMock);
                expect(completedListener).toHaveBeenCalledWith(expectedResult);
                expect(res).toEqual(expectedResult);
            });

            test("CREATE_ACCOUNT", async () => {
                prepareTransferMock.mockResolvedValueOnce({
                    transferType: BridgeTransferType.CREATE_ACCOUNT,
                });

                const createAccountCommitTransactionMock = new CreateAccountCommitTransactionMock();
                const confirmedCreateAccountCommit = createAccountCommitTransactionMock.asConfirmed();
                createAccountCommitMock.mockResolvedValueOnce(confirmedCreateAccountCommit);

                const expectedResult: BridgeTransferResult = {
                    ...basicExpectedResult,
                    isCreateAccount: true,
                    createAccountCommit: confirmedCreateAccountCommit,
                };

                const res = await bridgeManager.transfer(bridge, originWalletMock, destinationWalletMock, amount);

                expect(createAccountCommitMock).toHaveBeenCalledWith(bridgeForOrigin, originWalletMock, destinationAddress, amount);
                expect(awaitCreateAccountCommitAttestationsMock).toHaveBeenCalledWith(bridgeForDestination, destinationWalletMock);
                expect(completedListener).toHaveBeenCalledWith(expectedResult);
                expect(res).toEqual(expectedResult);
            });
        });

        describe("createBridgeRequest", () => {
            const stageListener = jest.fn();
            const createBridgeRequestRequestedListener = jest.fn();
            const createBridgeRequestSignedListener = jest.fn();
            const createBridgeRequestConfirmedListener = jest.fn();
            const createBridgeRequestFailedListener = jest.fn();

            const wallet = new CreateBridgeRequestXChainWalletMock({ type: ChainType.EVM });
            const tokenAddress = "tokenAddress";

            beforeEach(() => {
                stageListener.mockClear();
                createBridgeRequestRequestedListener.mockClear();
                createBridgeRequestSignedListener.mockClear();
                createBridgeRequestConfirmedListener.mockClear();
                createBridgeRequestFailedListener.mockClear();

                bridgeManager.on("stage", stageListener);
                bridgeManager.on("createBridgeRequestRequested", createBridgeRequestRequestedListener);
                bridgeManager.on("createBridgeRequestSigned", createBridgeRequestSignedListener);
                bridgeManager.on("createBridgeRequestConfirmed", createBridgeRequestConfirmedListener);
                bridgeManager.on("createBridgeRequestFailed", createBridgeRequestFailedListener);
            });

            test("Creates a bridge request", async () => {
                jest.spyOn(bridgeManager, "loadXChainBridges" as any).mockResolvedValueOnce({});
                mainchainDoorMock.address = "rELLgYp2TH3wg1isnSaDdzirAGo9781LXs";
                sidechainDoorMock.address = "0xB5f762798A53d543a014CAf8b297CFF8F2F937e8";

                wallet.createBridgeRequest.mockResolvedValueOnce(new CreateBridgeRequestTransactionMock().asUnconfirmed());

                const doorAddress = sidechainDoorMock.address;

                const bridgeRequest = await bridgeManager.createBridgeRequest(doorAddress, tokenAddress, wallet);

                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.CREATE_BRIDGE_REQUEST);

                expect(wallet.createBridgeRequest).toHaveBeenCalledWith(
                    sidechainDoorMock.address,
                    tokenAddress,
                    new XChainAddress(mainchainDoorMock.address, mainchainDoorMock.type).for(sidechainDoorMock.type),
                );
                expect(createBridgeRequestRequestedListener).toHaveBeenCalled();
                expect(createBridgeRequestConfirmedListener).toHaveBeenCalled();
                expect(createBridgeRequestFailedListener).not.toHaveBeenCalled();
                expect(bridgeRequest.waitCreation).toHaveBeenCalled();
            });

            test("Throws BridgeManagerErrors.DOOR_NOT_FOUND error", async () => {
                const doorAddress = "0x";

                await expect(async () => await bridgeManager.createBridgeRequest(doorAddress, tokenAddress, wallet)).rejects.toThrow(
                    new BridgeManagerError(BridgeManagerErrors.DOOR_NOT_FOUND, {
                        doorAddress,
                    }),
                );
            });

            test("Throws BridgeManagerErrors.WALLET_DOOR_TYPE_MISMATCH error", async () => {
                const wallet = new CreateBridgeRequestXChainWalletMock({ type: ChainType.XRP });
                const doorAddress = sidechainDoorMock.address;

                await expect(async () => await bridgeManager.createBridgeRequest(doorAddress, tokenAddress, wallet)).rejects.toThrow(
                    new BridgeManagerError(BridgeManagerErrors.WALLET_DOOR_TYPE_MISMATCH, {
                        walletType: wallet.type,
                        bridgeDoorType: sidechainDoorMock.type,
                    }),
                );
            });

            test("Fails to create a bridge request", async () => {
                wallet.createBridgeRequest.mockRejectedValueOnce(Error("Failed to create bridge request"));
                const doorAddress = sidechainDoorMock.address;

                await expect(async () => await bridgeManager.createBridgeRequest(doorAddress, tokenAddress, wallet)).rejects.toThrow(
                    Error("Failed to create bridge request"),
                );

                expect(stageListener).toHaveBeenCalledWith(BridgeTransferStage.CREATE_BRIDGE_REQUEST);
                expect(createBridgeRequestRequestedListener).toHaveBeenCalled();
                expect(createBridgeRequestConfirmedListener).not.toHaveBeenCalled();
                expect(createBridgeRequestFailedListener).toHaveBeenCalled();
            });
        });
    });
});
