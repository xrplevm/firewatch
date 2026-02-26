import { Bridge } from "../../../../../src/bridge/Bridge";
import { ClaimId } from "../../../../../src/bridge/utils";
import { BridgeDirection, ChainType } from "../../../../../src/common/types";
import { XrpXChainWallet } from "../../../../../src/wallet/wallets/xrp";
import { XrpXChainWalletError, XrpXChainWalletErrors } from "../../../../../src/wallet/wallets/xrp/errors/XrpXChainWallet.errors";
import { XChainAddress, XChainBridgeIssue } from "../../../../../src/xchain";
import { XrpXChainWalletProviderMock } from "../../../../mocks/wallet/wallets/xrp/XrpXChainWalletProvider.mock";
import { XrpXChainWalletSignerMock } from "../../../../mocks/wallet/wallets/xrp/XrpXChainWalletSigner.mock";
import { XChainBridgeMock } from "../../../../mocks/xchain/XChainBridge.mock";
import { XChainBridgeChainMock } from "../../../../mocks/xchain/XChainBridgeChain.mock";
import MethodMock from "../../../../utils/MethodMock";

describe("XrpXChainWallet", () => {
    describe("constructor", () => {
        test("Creates a XrpXChainWallet instance", () => {
            const xrpXChainWalletProviderMock = new XrpXChainWalletProviderMock();
            const xrpXChainWalletSignerMock = new XrpXChainWalletSignerMock();

            const xrpXChainWallet = new XrpXChainWallet(xrpXChainWalletProviderMock, xrpXChainWalletSignerMock);

            expect(xrpXChainWallet).toBeDefined();
        });
    });

    describe("instance", () => {
        let xrpXChainWallet: XrpXChainWallet;

        const address = "r1234";
        const nativeXChainBridge = new XChainBridgeMock({
            lockingChain: new XChainBridgeChainMock({ type: ChainType.XRP, issue: new XChainBridgeIssue<ChainType.XRP>("XRP") }),
            issuingChain: new XChainBridgeChainMock({ type: ChainType.XRP, issue: new XChainBridgeIssue<ChainType.XRP>("XRP") }),
        });
        const nativeBridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, nativeXChainBridge);
        const nativeBridgeForOrigin = nativeBridge.forOrigin();
        const tokenXChainBridge = new XChainBridgeMock({
            lockingChain: new XChainBridgeChainMock({
                type: ChainType.XRP,
                issue: new XChainBridgeIssue("USD", new XChainAddress("rJKnVATqzNsWa4jgnK5NyRKmK5s9QQWQYm", ChainType.XRP)),
            }),
            issuingChain: new XChainBridgeChainMock({
                type: ChainType.XRP,
                issue: new XChainBridgeIssue("USD", new XChainAddress("rJKnVATqzNsWa4jgnK5NyRKmK5s9QQWQYm", ChainType.XRP)),
            }),
        });
        const tokenBridge = new Bridge(BridgeDirection.LOCKING_TO_ISSUING, tokenXChainBridge);
        const tokenBridgeForOrigin = tokenBridge.forOrigin();
        const tokenBridgeForDestination = tokenBridge.forDestination();

        const xrpXChainWalletProviderMock = new XrpXChainWalletProviderMock();
        const xrpXChainWalletSignerMock = new XrpXChainWalletSignerMock({ getAddress: new MethodMock("mockResolvedValue", address) });

        beforeEach(() => {
            xrpXChainWalletProviderMock.clearMocks();
            xrpXChainWalletSignerMock.clearMocks();

            xrpXChainWallet = new XrpXChainWallet(xrpXChainWalletProviderMock, xrpXChainWalletSignerMock);
        });

        describe("getAddress", () => {
            test("Gets address", async () => {
                const res = await xrpXChainWallet.getAddress();

                expect(res).toEqual(address);
            });
        });

        describe("isActive", () => {
            test("Returns true if wallet account is active", async () => {
                xrpXChainWalletProviderMock.isAccountActive.mockResolvedValueOnce(true);

                const isActive = await xrpXChainWallet.isActive();

                expect(isActive).toEqual(true);
            });

            test("Returns false if wallet account is not active", async () => {
                xrpXChainWalletProviderMock.isAccountActive.mockResolvedValueOnce(false);

                const isActive = await xrpXChainWallet.isActive();

                expect(isActive).toEqual(false);
            });
        });

        describe("getBalance", () => {
            test("Returns the wallet balance", async () => {
                const balanceMock = "1000000000";
                xrpXChainWalletProviderMock.getNativeBalance.mockResolvedValueOnce(balanceMock);

                const balance = await xrpXChainWallet.getBalance();

                expect(balance).toEqual(balanceMock);
            });
        });

        describe("isTrustClaimRequired", () => {
            test("Returns false if bridge is native", () => {
                expect(xrpXChainWallet.isTrustClaimRequired(nativeBridgeForOrigin)).toEqual(false);
            });

            test("Returns true if bridge is not native", () => {
                expect(xrpXChainWallet.isTrustClaimRequired(tokenBridgeForOrigin)).toEqual(true);
            });
        });

        describe("trustClaim", () => {
            test("Calls xrpXChainWalletSigner.setTrustLine correctly", async () => {
                await xrpXChainWallet.trustClaim(tokenBridgeForOrigin);

                expect(xrpXChainWalletSignerMock.setTrustLine).toHaveBeenCalledTimes(1);
                expect(xrpXChainWalletSignerMock.setTrustLine).toHaveBeenCalledWith(
                    tokenBridgeForOrigin.destinationXChainBridgeChain.issue.issuer!,
                    tokenBridgeForOrigin.destinationXChainBridgeChain.issue.currency,
                );
            });

            test("Throws CANNOT_TRUST_CLAIM_WITH_NATIVE_CURRENCY", async () => {
                expect(async () => await xrpXChainWallet.trustClaim(nativeBridgeForOrigin)).rejects.toThrow(
                    new XrpXChainWalletError(XrpXChainWalletErrors.CANNOT_TRUST_CLAIM_WITH_NATIVE_CURRENCY),
                );
            });
        });

        describe("isClaimTrusted", () => {
            test("Calls xrpXChainWalletProvider.accountHasTrustLine correctly", async () => {
                await xrpXChainWallet.isClaimTrusted(tokenBridgeForOrigin);

                expect(xrpXChainWalletProviderMock.accountHasTrustLine).toHaveBeenCalledTimes(1);
                expect(xrpXChainWalletProviderMock.accountHasTrustLine).toHaveBeenCalledWith(
                    address,
                    tokenBridgeForOrigin.destinationXChainBridgeChain.issue.issuer!,
                    tokenBridgeForOrigin.destinationXChainBridgeChain.issue.currency,
                );
            });

            test("Throws CANNOT_CHECK_CLAIM_TRUST_WITH_NATIVE_CURRENCY", async () => {
                expect(async () => await xrpXChainWallet.isClaimTrusted(nativeBridgeForOrigin)).rejects.toThrow(
                    new XrpXChainWalletError(XrpXChainWalletErrors.CANNOT_CHECK_CLAIM_TRUST_WITH_NATIVE_CURRENCY),
                );
            });
        });

        describe("createClaim", () => {
            const originAddress = "0x1234";

            test("Calls xrpXChainWalletSigner.createClaim correctly", async () => {
                await xrpXChainWallet.createClaim(originAddress, tokenBridgeForDestination);

                expect(xrpXChainWalletSignerMock.createClaim).toHaveBeenCalledTimes(1);
                expect(xrpXChainWalletSignerMock.createClaim).toHaveBeenCalledWith(originAddress, tokenBridgeForDestination);
            });
        });

        describe("commit", () => {
            const claimId = ClaimId.fromInt(1);
            const destinationAddress = "0x5678";
            const amount = "100";

            test("Calls xrpXChainWalletSigner.commit correctly", async () => {
                await xrpXChainWallet.commit(claimId, destinationAddress, tokenBridgeForOrigin, amount);

                expect(xrpXChainWalletSignerMock.commit).toHaveBeenCalledTimes(1);
                expect(xrpXChainWalletSignerMock.commit).toHaveBeenCalledWith(claimId, destinationAddress, tokenBridgeForOrigin, amount);
            });
        });

        describe("createAccountCommit", () => {
            const destinationAddress = "0x5678";
            const amount = "100";

            test("Calls xrpXChainWalletSigner.createAccountCommit correctly", async () => {
                await xrpXChainWallet.createAccountCommit(destinationAddress, nativeBridgeForOrigin, amount);

                expect(xrpXChainWalletSignerMock.createAccountCommit).toHaveBeenCalledTimes(1);
                expect(xrpXChainWalletSignerMock.createAccountCommit).toHaveBeenCalledWith(
                    destinationAddress,
                    nativeBridgeForOrigin,
                    amount,
                );
            });

            test("Throws CANNOT_CREATE_ACCOUNT_WITH_IOU_CURRENCY error", async () => {
                expect(
                    async () => await xrpXChainWallet.createAccountCommit(destinationAddress, tokenBridgeForOrigin, amount),
                ).rejects.toThrow(new XrpXChainWalletError(XrpXChainWalletErrors.CANNOT_CREATE_ACCOUNT_WITH_IOU_CURRENCY));
            });
        });

        describe("isClaimAttested", () => {
            const claimId = ClaimId.fromInt(1);

            test("Calls xrpXChainWalletProvider.isClaimAttested correctly", async () => {
                await xrpXChainWallet.isClaimAttested(claimId, tokenBridgeForDestination);

                expect(xrpXChainWalletProviderMock.isClaimAttested).toHaveBeenCalledTimes(1);
                expect(xrpXChainWalletProviderMock.isClaimAttested).toHaveBeenCalledWith(address, claimId, tokenBridgeForDestination);
            });
        });

        describe("isCreateAccountCommitAttested", () => {
            test("Calls xrpXChainWalletProvider.isCreateAccountCommitAttested correctly", async () => {
                await xrpXChainWallet.isCreateAccountCommitAttested();

                expect(xrpXChainWalletProviderMock.isCreateAccountCommitAttested).toHaveBeenCalledTimes(1);
                expect(xrpXChainWalletProviderMock.isCreateAccountCommitAttested).toHaveBeenCalledWith(address);
            });
        });
    });
});
